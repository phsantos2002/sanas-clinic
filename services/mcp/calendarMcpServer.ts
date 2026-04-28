/**
 * MCP server expondo Google Calendar como tools.
 *
 * Roda in-process (mesmo Node.js do Next.js) via InMemoryTransport. O
 * cliente em calendarMcpClient.ts conecta via createLinkedPair() — nada
 * de stdio/SSE/rede entre eles.
 *
 * Cada tool recebe userId no input e internamente busca+decifra o token
 * (lib/crypto via getValidToken). Multi-tenant é mandatório: nunca
 * misture userIds entre chamadas.
 *
 * Wrappa as mesmas chamadas REST do Google Calendar v3 que estavam em
 * services/googleCalendar.ts — o objetivo é centralizar a lógica numa
 * camada MCP pra (a) padronizar request/response com schema Zod,
 * (b) deixar o calendário facilmente exponível pra Claude Desktop /
 * outros MCP clients no futuro sem reescrever, e (c) abrir caminho pro
 * sync incremental com syncToken na Sub-fase D.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/crypto";

// ─── OAuth helpers locais (cópia mínima do googleCalendar.ts) ───────
// A duplicação é proposital: queremos que o MCP server seja
// auto-suficiente, sem importar do googleCalendar.ts (que vai virar
// thin wrapper que CHAMA o MCP client). Importar de lá criaria ciclo.

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

async function refreshAccessToken(
  refreshToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error("Failed to refresh token");
  return res.json();
}

type Auth = {
  token: string;
  calendarId: string;
  timezone: string;
  businessHoursStart: string;
  businessHoursEnd: string;
  workDays: number[];
};

async function getAuth(userId: string): Promise<Auth | null> {
  const config = await prisma.googleCalendar.findUnique({ where: { userId } });
  if (!config) return null;

  let token = decrypt(config.accessToken);
  const refreshTokenPlain = config.refreshToken ? decrypt(config.refreshToken) : "";

  if (new Date() >= new Date(config.tokenExpiry.getTime() - 5 * 60 * 1000)) {
    if (!refreshTokenPlain) return null;
    try {
      const refreshed = await refreshAccessToken(refreshTokenPlain);
      token = refreshed.access_token;
      await prisma.googleCalendar.update({
        where: { userId },
        data: {
          accessToken: encrypt(token),
          tokenExpiry: new Date(Date.now() + refreshed.expires_in * 1000),
        },
      });
    } catch {
      return null;
    }
  }

  return {
    token,
    calendarId: config.calendarId,
    timezone: config.timezone,
    businessHoursStart: config.businessHoursStart,
    businessHoursEnd: config.businessHoursEnd,
    workDays: config.workDays,
  };
}

// ─── Schemas (Zod) ─────────────────────────────────────────────────

const userIdSchema = z.string().min(1);

const ListEventsInput = z.object({
  userId: userIdSchema,
  timeMin: z.string().describe("ISO 8601 lower bound (inclusive)"),
  timeMax: z.string().describe("ISO 8601 upper bound (exclusive)"),
  maxResults: z.number().int().min(1).max(2500).optional().default(250),
  attendantId: z
    .string()
    .optional()
    .describe("If set, only events tagged with this attendantId in extendedProperties.private"),
});

const GetEventInput = z.object({
  userId: userIdSchema,
  eventId: z.string().min(1),
});

const CreateEventInput = z.object({
  userId: userIdSchema,
  summary: z.string().min(1),
  description: z.string().optional(),
  startDateTime: z.string().describe("ISO 8601"),
  durationMinutes: z.number().int().positive(),
  attendeeEmail: z.string().email().optional(),
  attendeeName: z.string().optional(),
  attendantId: z
    .string()
    .optional()
    .describe("Attendant column owner; saved in extendedProperties.private.attendantId"),
  leadId: z.string().optional(),
});

const UpdateEventInput = z.object({
  userId: userIdSchema,
  eventId: z.string().min(1),
  changes: z
    .object({
      summary: z.string().optional(),
      description: z.string().optional(),
      startDateTime: z.string().optional(),
      durationMinutes: z.number().int().positive().optional(),
      attendantId: z.string().nullable().optional(),
    })
    .refine((v) => Object.keys(v).length > 0, { message: "changes object empty" }),
});

const DeleteEventInput = z.object({
  userId: userIdSchema,
  eventId: z.string().min(1),
});

const GetFreeBusyInput = z.object({
  userId: userIdSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD"),
  durationMinutes: z.number().int().positive().optional().default(60),
});

// ─── Helpers de resultado ─────────────────────────────────────────

function jsonResult(data: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data) }],
  };
}

function errorResult(message: string): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}

// ─── Tool handlers ────────────────────────────────────────────────

async function listEvents(input: z.infer<typeof ListEventsInput>): Promise<CallToolResult> {
  const auth = await getAuth(input.userId);
  if (!auth) return errorResult("Google Calendar nao conectado");

  const params = new URLSearchParams({
    timeMin: input.timeMin,
    timeMax: input.timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: String(input.maxResults),
    timeZone: auth.timezone,
  });
  if (input.attendantId) {
    params.set("privateExtendedProperty", `attendantId=${input.attendantId}`);
  }

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(auth.calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${auth.token}` } }
  );
  if (!res.ok) return errorResult(`Calendar API error: ${res.status} ${await res.text()}`);

  const data = await res.json();
  return jsonResult({ events: data.items ?? [] });
}

async function getEvent(input: z.infer<typeof GetEventInput>): Promise<CallToolResult> {
  const auth = await getAuth(input.userId);
  if (!auth) return errorResult("Google Calendar nao conectado");

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(auth.calendarId)}/events/${encodeURIComponent(input.eventId)}`,
    { headers: { Authorization: `Bearer ${auth.token}` } }
  );
  if (!res.ok) return errorResult(`Calendar API error: ${res.status}`);

  return jsonResult({ event: await res.json() });
}

async function createEvent(input: z.infer<typeof CreateEventInput>): Promise<CallToolResult> {
  const auth = await getAuth(input.userId);
  if (!auth) return errorResult("Google Calendar nao conectado");

  const start = new Date(input.startDateTime);
  const end = new Date(start.getTime() + input.durationMinutes * 60 * 1000);

  const event: Record<string, unknown> = {
    summary: input.summary,
    description: input.description ?? "",
    start: { dateTime: start.toISOString(), timeZone: auth.timezone },
    end: { dateTime: end.toISOString(), timeZone: auth.timezone },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 60 },
        { method: "popup", minutes: 15 },
      ],
    },
  };
  if (input.attendeeEmail) {
    event.attendees = [{ email: input.attendeeEmail, displayName: input.attendeeName ?? "" }];
  }
  // extendedProperties.private — não fica visível pro convidado, fica
  // pra dedup/filtro por attendantId no Sanas.
  const ext: Record<string, string> = {};
  if (input.attendantId) ext.attendantId = input.attendantId;
  if (input.leadId) ext.leadId = input.leadId;
  if (Object.keys(ext).length > 0) {
    event.extendedProperties = { private: ext };
  }

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(auth.calendarId)}/events`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${auth.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(event),
    }
  );
  if (!res.ok) return errorResult(`Erro ao criar evento: ${await res.text()}`);

  const created = await res.json();
  return jsonResult({ eventId: created.id, eventLink: created.htmlLink, event: created });
}

async function updateEvent(input: z.infer<typeof UpdateEventInput>): Promise<CallToolResult> {
  const auth = await getAuth(input.userId);
  if (!auth) return errorResult("Google Calendar nao conectado");

  // Use PATCH semantics — só os campos passados são atualizados
  const patch: Record<string, unknown> = {};
  if (input.changes.summary !== undefined) patch.summary = input.changes.summary;
  if (input.changes.description !== undefined) patch.description = input.changes.description;
  if (input.changes.startDateTime !== undefined && input.changes.durationMinutes !== undefined) {
    const start = new Date(input.changes.startDateTime);
    const end = new Date(start.getTime() + input.changes.durationMinutes * 60 * 1000);
    patch.start = { dateTime: start.toISOString(), timeZone: auth.timezone };
    patch.end = { dateTime: end.toISOString(), timeZone: auth.timezone };
  }
  if (input.changes.attendantId !== undefined) {
    patch.extendedProperties = {
      private: { attendantId: input.changes.attendantId ?? "" },
    };
  }

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(auth.calendarId)}/events/${encodeURIComponent(input.eventId)}`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${auth.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }
  );
  if (!res.ok) return errorResult(`Erro ao atualizar evento: ${await res.text()}`);

  return jsonResult({ event: await res.json() });
}

async function deleteEvent(input: z.infer<typeof DeleteEventInput>): Promise<CallToolResult> {
  const auth = await getAuth(input.userId);
  if (!auth) return errorResult("Google Calendar nao conectado");

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(auth.calendarId)}/events/${encodeURIComponent(input.eventId)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${auth.token}` } }
  );
  // 204 No Content = success; 410 = already deleted; both treated as ok
  if (!res.ok && res.status !== 410) {
    return errorResult(`Erro ao deletar evento: ${res.status}`);
  }
  return jsonResult({ deleted: true });
}

async function getFreeBusy(input: z.infer<typeof GetFreeBusyInput>): Promise<CallToolResult> {
  const auth = await getAuth(input.userId);
  if (!auth) return errorResult("Google Calendar nao conectado");

  const d = new Date(input.date + "T12:00:00");
  if (!auth.workDays.includes(d.getDay())) {
    return jsonResult({ slots: [], reason: "not_a_workday" });
  }

  const params = new URLSearchParams({
    timeMin: new Date(`${input.date}T00:00:00`).toISOString(),
    timeMax: new Date(`${input.date}T23:59:59`).toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    timeZone: auth.timezone,
  });
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(auth.calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${auth.token}` } }
  );
  if (!res.ok) return errorResult(`Calendar API error: ${res.status}`);

  const data = await res.json();
  const events = (data.items ?? []) as Array<{
    start?: { dateTime?: string };
    end?: { dateTime?: string };
  }>;
  const busySlots = events
    .filter((e) => e.start?.dateTime && e.end?.dateTime)
    .map((e) => ({
      start: new Date(e.start!.dateTime!).getTime(),
      end: new Date(e.end!.dateTime!).getTime(),
    }));

  const dayStart = new Date(`${input.date}T${auth.businessHoursStart}:00`);
  const dayEnd = new Date(`${input.date}T${auth.businessHoursEnd}:00`);
  const slotDurationMs = input.durationMinutes * 60 * 1000;

  const slots: { start: string; end: string }[] = [];
  let cursor = dayStart.getTime();
  while (cursor + slotDurationMs <= dayEnd.getTime()) {
    const slotEnd = cursor + slotDurationMs;
    const isBusy = busySlots.some((b) => cursor < b.end && slotEnd > b.start);
    if (!isBusy) {
      slots.push({
        start: new Date(cursor).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: auth.timezone,
        }),
        end: new Date(slotEnd).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: auth.timezone,
        }),
      });
    }
    cursor += 30 * 60 * 1000;
  }

  return jsonResult({
    slots,
    businessHoursStart: auth.businessHoursStart,
    businessHoursEnd: auth.businessHoursEnd,
    timezone: auth.timezone,
  });
}

// ─── Server factory ───────────────────────────────────────────────

const TOOLS = [
  {
    name: "calendar.list_events",
    description: "Lista eventos do Google Calendar do usuário num intervalo de tempo",
    schema: ListEventsInput,
    handler: listEvents,
  },
  {
    name: "calendar.get_event",
    description: "Busca um evento específico pelo ID",
    schema: GetEventInput,
    handler: getEvent,
  },
  {
    name: "calendar.create_event",
    description: "Cria um evento no Google Calendar (com tag de attendant opcional)",
    schema: CreateEventInput,
    handler: createEvent,
  },
  {
    name: "calendar.update_event",
    description: "Atualiza campos de um evento (PATCH)",
    schema: UpdateEventInput,
    handler: updateEvent,
  },
  {
    name: "calendar.delete_event",
    description: "Remove um evento do Google Calendar",
    schema: DeleteEventInput,
    handler: deleteEvent,
  },
  {
    name: "calendar.get_freebusy",
    description: "Calcula slots livres no horário comercial pra uma data específica",
    schema: GetFreeBusyInput,
    handler: getFreeBusy,
  },
] as const;

export function createCalendarMcpServer(): Server {
  const server = new Server(
    {
      name: "sanas-calendar",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      // Zod v4 nativo retorna JSON Schema (Draft 2020-12). MCP aceita.
      inputSchema: z.toJSONSchema(t.schema) as Record<string, unknown>,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = TOOLS.find((t) => t.name === request.params.name);
    if (!tool) return errorResult(`Unknown tool: ${request.params.name}`);

    try {
      const parsed = tool.schema.parse(request.params.arguments ?? {});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await (tool.handler as (i: any) => Promise<CallToolResult>)(parsed);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return errorResult(`Tool error (${tool.name}): ${msg}`);
    }
  });

  return server;
}

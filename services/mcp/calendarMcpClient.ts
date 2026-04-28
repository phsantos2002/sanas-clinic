/**
 * Cliente MCP para o servidor REMOTO oficial do Google Calendar
 * (https://calendarmcp.googleapis.com/mcp/v1).
 *
 * Substitui a implementação anterior (in-process server wrappando REST API).
 * Agora chamamos diretamente o servidor MCP hospedado pelo Google via
 * StreamableHTTPClientTransport, autenticando com Bearer token OAuth do
 * usuário.
 *
 * Auth: cada chamada passa userId, internamente buscamos+decifrámos o
 * access_token (lib/crypto via getValidToken em googleCalendar.ts) e
 * usamos como Bearer no header HTTP.
 *
 * Cache: clientes MCP são caros de criar (handshake + session). Mantemos
 * um cache por userId com TTL curto (5min) — após isso recriamos. Em
 * Vercel serverless, cada instance tem seu próprio cache; cold start
 * paga o handshake mas warm requests reusam.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";

import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/crypto";

const GOOGLE_CALENDAR_MCP_URL = "https://calendarmcp.googleapis.com/mcp/v1";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

// ─── OAuth helper local ───────────────────────────────────────────
// Duplica getValidToken pra evitar ciclo com googleCalendar.ts (que vai
// ser thin wrapper deste módulo).

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

async function getAccessToken(userId: string): Promise<string | null> {
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

  return token;
}

// ─── Per-user MCP client cache ────────────────────────────────────

type CachedClient = { client: Client; expiresAt: number };
const clientCache = new Map<string, CachedClient>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

async function getMcpClient(userId: string): Promise<Client | null> {
  const cached = clientCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.client;

  const token = await getAccessToken(userId);
  if (!token) return null;

  const transport = new StreamableHTTPClientTransport(new URL(GOOGLE_CALENDAR_MCP_URL), {
    requestInit: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const client = new Client({ name: "sanas-pulse-calendar", version: "1.0.0" });
  await client.connect(transport);

  clientCache.set(userId, {
    client,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  return client;
}

// ─── Helper genérico de chamada ───────────────────────────────────

async function callTool<T>(
  userId: string,
  name: string,
  args: Record<string, unknown>
): Promise<T> {
  const client = await getMcpClient(userId);
  if (!client) {
    throw new Error("Google Calendar nao conectado");
  }

  const result = await client.request(
    { method: "tools/call", params: { name, arguments: args } },
    CallToolResultSchema
  );

  if (result.isError) {
    const text =
      result.content?.[0]?.type === "text" ? (result.content[0] as { text: string }).text : "";
    throw new Error(`MCP tool ${name} error: ${text}`);
  }

  const first = result.content?.[0];
  if (!first || first.type !== "text") {
    throw new Error(`MCP tool ${name} returned no text content`);
  }
  try {
    return JSON.parse((first as { text: string }).text) as T;
  } catch {
    throw new Error(
      `MCP tool ${name} returned non-JSON: ${(first as { text: string }).text.slice(0, 200)}`
    );
  }
}

// ─── Tipos públicos ────────────────────────────────────────────────

export type GCalEvent = {
  id: string;
  summary?: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink?: string;
  attendees?: Array<{ email: string; displayName?: string }>;
  extendedProperties?: { private?: Record<string, string> };
};

export type FreeSlot = { start: string; end: string };

// ─── Wrappers tipados — mantêm a mesma assinatura pública ─────────
// (Os nomes das tools no Google Calendar MCP server são sem prefixo
// "calendar.", diferente da nossa implementação in-process anterior.)

export async function listEvents(args: {
  userId: string;
  timeMin: string;
  timeMax: string;
  maxResults?: number;
  attendantId?: string;
  calendarId?: string;
}): Promise<{ events: GCalEvent[] }> {
  const { userId, attendantId, ...rest } = args;
  const params: Record<string, unknown> = {
    calendarId: args.calendarId ?? "primary",
    timeMin: rest.timeMin,
    timeMax: rest.timeMax,
    singleEvents: true,
    orderBy: "startTime",
    maxResults: rest.maxResults ?? 250,
  };
  if (attendantId) {
    params.privateExtendedProperty = [`attendantId=${attendantId}`];
  }
  const result = await callTool<{ items?: GCalEvent[] }>(userId, "list_events", params);
  return { events: result.items ?? [] };
}

export async function getEvent(args: {
  userId: string;
  eventId: string;
  calendarId?: string;
}): Promise<{ event: GCalEvent }> {
  const event = await callTool<GCalEvent>(args.userId, "get_event", {
    calendarId: args.calendarId ?? "primary",
    eventId: args.eventId,
  });
  return { event };
}

export async function createEvent(args: {
  userId: string;
  summary: string;
  description?: string;
  startDateTime: string;
  durationMinutes: number;
  attendeeEmail?: string;
  attendeeName?: string;
  attendantId?: string;
  leadId?: string;
  calendarId?: string;
}): Promise<{ eventId: string; eventLink?: string; event: GCalEvent }> {
  const start = new Date(args.startDateTime);
  const end = new Date(start.getTime() + args.durationMinutes * 60 * 1000);

  const eventBody: Record<string, unknown> = {
    summary: args.summary,
    description: args.description ?? "",
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 60 },
        { method: "popup", minutes: 15 },
      ],
    },
  };
  if (args.attendeeEmail) {
    eventBody.attendees = [{ email: args.attendeeEmail, displayName: args.attendeeName ?? "" }];
  }
  const ext: Record<string, string> = {};
  if (args.attendantId) ext.attendantId = args.attendantId;
  if (args.leadId) ext.leadId = args.leadId;
  if (Object.keys(ext).length > 0) {
    eventBody.extendedProperties = { private: ext };
  }

  const result = await callTool<GCalEvent>(args.userId, "create_event", {
    calendarId: args.calendarId ?? "primary",
    ...eventBody,
  });
  return { eventId: result.id, eventLink: result.htmlLink, event: result };
}

export async function updateEvent(args: {
  userId: string;
  eventId: string;
  changes: {
    summary?: string;
    description?: string;
    startDateTime?: string;
    durationMinutes?: number;
    attendantId?: string | null;
  };
  calendarId?: string;
}): Promise<{ event: GCalEvent }> {
  const patch: Record<string, unknown> = {
    calendarId: args.calendarId ?? "primary",
    eventId: args.eventId,
  };
  if (args.changes.summary !== undefined) patch.summary = args.changes.summary;
  if (args.changes.description !== undefined) patch.description = args.changes.description;
  if (args.changes.startDateTime !== undefined && args.changes.durationMinutes !== undefined) {
    const start = new Date(args.changes.startDateTime);
    const end = new Date(start.getTime() + args.changes.durationMinutes * 60 * 1000);
    patch.start = { dateTime: start.toISOString() };
    patch.end = { dateTime: end.toISOString() };
  }
  if (args.changes.attendantId !== undefined) {
    patch.extendedProperties = {
      private: { attendantId: args.changes.attendantId ?? "" },
    };
  }

  const event = await callTool<GCalEvent>(args.userId, "update_event", patch);
  return { event };
}

export async function deleteEvent(args: {
  userId: string;
  eventId: string;
  calendarId?: string;
}): Promise<{ deleted: true }> {
  await callTool<unknown>(args.userId, "delete_event", {
    calendarId: args.calendarId ?? "primary",
    eventId: args.eventId,
  });
  return { deleted: true };
}

export async function getFreeBusy(args: {
  userId: string;
  date: string; // YYYY-MM-DD
  durationMinutes?: number;
}): Promise<{
  slots: FreeSlot[];
  businessHoursStart?: string;
  businessHoursEnd?: string;
  timezone?: string;
  reason?: string;
}> {
  // Google MCP tem `suggest_time` — pede uma sugestão de horários livres
  // num range. Usamos o dia inteiro com a duração desejada.
  const result = await callTool<{ suggestedTimes?: Array<{ start: string; end: string }> }>(
    args.userId,
    "suggest_time",
    {
      timeMin: new Date(`${args.date}T00:00:00`).toISOString(),
      timeMax: new Date(`${args.date}T23:59:59`).toISOString(),
      durationMinutes: args.durationMinutes ?? 60,
    }
  );
  const slots = (result.suggestedTimes ?? []).map((s) => ({
    start: new Date(s.start).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    end: new Date(s.end).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));
  return { slots };
}

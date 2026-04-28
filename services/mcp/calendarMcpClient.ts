/**
 * Cliente MCP in-process pro Calendar server.
 *
 * Lazy singleton: na primeira chamada cria server + client + linked
 * InMemoryTransport, abre conexão, mantém viva pelo lifetime do processo
 * Node (cada serverless instance Vercel tem o seu).
 *
 * Toda chamada externa do Sanas a Google Calendar passa POR AQUI:
 * - services/googleCalendar.ts (wrappers públicos)
 * - app/dashboard/calendar (UI Trinks)
 * - webhookProcessor (tag [AGENDAR:])
 *
 * As funções exportadas retornam objetos tipados (não JSON-RPC raw).
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";

import { createCalendarMcpServer } from "./calendarMcpServer";

// ─── Singleton lifecycle ──────────────────────────────────────────

let clientPromise: Promise<Client> | null = null;

async function getClient(): Promise<Client> {
  if (clientPromise) return clientPromise;

  clientPromise = (async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    const server = createCalendarMcpServer();
    const client = new Client({ name: "sanas-calendar-client", version: "1.0.0" });

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    return client;
  })();

  try {
    return await clientPromise;
  } catch (err) {
    // Reset so a transient init failure doesn't poison the singleton
    clientPromise = null;
    throw err;
  }
}

// ─── Helper genérico ──────────────────────────────────────────────

async function callTool<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const client = await getClient();
  const result = await client.request(
    { method: "tools/call", params: { name, arguments: args } },
    CallToolResultSchema
  );

  if (result.isError) {
    const text =
      result.content?.[0]?.type === "text" ? (result.content[0] as { text: string }).text : "";
    throw new Error(`MCP tool ${name} error: ${text}`);
  }

  // Tools retornam JSON.stringify(payload) num único content text item.
  const first = result.content?.[0];
  if (!first || first.type !== "text") {
    throw new Error(`MCP tool ${name} returned no text content`);
  }
  try {
    return JSON.parse((first as { text: string }).text) as T;
  } catch (err) {
    throw new Error(
      `MCP tool ${name} returned non-JSON: ${(first as { text: string }).text.slice(0, 200)}`
    );
  }
}

// ─── Tipos públicos (espelham o que o server retorna) ─────────────

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

// ─── Wrappers tipados ─────────────────────────────────────────────

export async function listEvents(args: {
  userId: string;
  timeMin: string;
  timeMax: string;
  maxResults?: number;
  attendantId?: string;
}): Promise<{ events: GCalEvent[] }> {
  return callTool("calendar.list_events", { ...args });
}

export async function getEvent(args: {
  userId: string;
  eventId: string;
}): Promise<{ event: GCalEvent }> {
  return callTool("calendar.get_event", { ...args });
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
}): Promise<{ eventId: string; eventLink?: string; event: GCalEvent }> {
  return callTool("calendar.create_event", { ...args });
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
}): Promise<{ event: GCalEvent }> {
  return callTool("calendar.update_event", { ...args });
}

export async function deleteEvent(args: {
  userId: string;
  eventId: string;
}): Promise<{ deleted: true }> {
  return callTool("calendar.delete_event", { ...args });
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
  return callTool("calendar.get_freebusy", { ...args });
}

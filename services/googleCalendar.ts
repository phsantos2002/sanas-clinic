/**
 * Google Calendar Service — OAuth2 + Calendar API
 * Handles: connection, free slots, event creation
 */

import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/crypto";
import * as mcp from "./mcp/calendarMcpClient";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-calendar/callback`
  : "https://sanas-clinic-l235.vercel.app/api/auth/google-calendar/callback";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
];

// ─── OAuth2 ───────────────────────────────────────────────

export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeCodeForTokens(code: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  }>;
}

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

async function getValidToken(
  userId: string
): Promise<{ token: string; calendarId: string; config: GoogleCalendarConfig } | null> {
  const config = await prisma.googleCalendar.findUnique({ where: { userId } });
  if (!config) return null;

  // Tokens are encrypted at rest (Sub-fase A). decrypt() falls back to
  // plaintext for legacy rows that haven't been migrated yet.
  let token = decrypt(config.accessToken);
  const refreshTokenPlain = config.refreshToken ? decrypt(config.refreshToken) : "";

  // Refresh if expired (with 5 min buffer)
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

  return { token, calendarId: config.calendarId, config: config as GoogleCalendarConfig };
}

type GoogleCalendarConfig = {
  businessHoursStart: string;
  businessHoursEnd: string;
  workDays: number[];
  timezone: string;
  calendarId: string;
};

// ─── Calendar API (via MCP client) ───────────────────────
//
// Os wrappers abaixo agora delegam pro cliente MCP in-process. Mantém
// a assinatura pública pra não quebrar callers (webhookProcessor,
// CalendarConfig, futura UI Trinks). Toda lógica de fetch/Google v3
// REST API foi movida pra services/mcp/calendarMcpServer.ts.
//
// OAuth helpers (getGoogleAuthUrl, exchangeCodeForTokens,
// getGoogleUserEmail, refreshAccessToken, getValidToken) ficam aqui —
// não fazem sentido como tools MCP (são parte do bootstrap do token,
// não da operação de calendar).

export async function getGoogleUserEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    return data.email || null;
  } catch {
    return null;
  }
}

type CalendarEvent = {
  id: string;
  summary: string;
  start: { dateTime: string };
  end: { dateTime: string };
  description?: string;
};

export async function getUpcomingEvents(
  userId: string,
  daysAhead: number = 7
): Promise<CalendarEvent[]> {
  const now = new Date();
  const end = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  try {
    const { events } = await mcp.listEvents({
      userId,
      timeMin: now.toISOString(),
      timeMax: end.toISOString(),
      maxResults: 50,
    });
    return events as unknown as CalendarEvent[];
  } catch {
    return [];
  }
}

export async function getFreeSlots(
  userId: string,
  date: string, // YYYY-MM-DD
  durationMinutes: number = 60
): Promise<{ start: string; end: string }[]> {
  try {
    const result = await mcp.getFreeBusy({ userId, date, durationMinutes });
    return result.slots ?? [];
  } catch {
    return [];
  }
}

export async function createCalendarEvent(
  userId: string,
  params: {
    summary: string;
    description?: string;
    startDateTime: string; // ISO 8601
    durationMinutes: number;
    attendeeEmail?: string;
    attendeeName?: string;
    attendantId?: string;
    leadId?: string;
  }
): Promise<{ success: boolean; eventId?: string; eventLink?: string; error?: string }> {
  try {
    const result = await mcp.createEvent({ userId, ...params });
    return {
      success: true,
      eventId: result.eventId,
      eventLink: result.eventLink,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro desconhecido",
    };
  }
}

// ─── Context for AI ───────────────────────────────────────

export async function getCalendarContextForAI(userId: string): Promise<string | null> {
  // Lê config diretamente do DB pra não criar tool MCP só pra metadata
  // estática. getValidToken já valida que o calendar está conectado.
  const auth = await getValidToken(userId);
  if (!auth) return null;

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().split("T")[0];

  const todaySlots = await getFreeSlots(userId, todayStr, 60);
  const tomorrowSlots = await getFreeSlots(userId, tomorrowStr, 60);

  const todayFormatted =
    todaySlots.length > 0
      ? todaySlots
          .slice(0, 5)
          .map((s) => `  ${s.start} - ${s.end}`)
          .join("\n")
      : "  Sem horarios disponiveis";

  const tomorrowFormatted =
    tomorrowSlots.length > 0
      ? tomorrowSlots
          .slice(0, 5)
          .map((s) => `  ${s.start} - ${s.end}`)
          .join("\n")
      : "  Sem horarios disponiveis";

  return `AGENDA (Google Calendar conectado):
Horario de funcionamento: ${auth.config.businessHoursStart} - ${auth.config.businessHoursEnd}
Fuso: ${auth.config.timezone}

Horarios livres HOJE (${todayStr}):
${todayFormatted}

Horarios livres AMANHA (${tomorrowStr}):
${tomorrowFormatted}

Quando o cliente quiser agendar, confirme: servico, data e horario.
Depois inclua na resposta: [AGENDAR: servico | YYYY-MM-DD HH:mm | nome_cliente | duracao_min]
Exemplo: [AGENDAR: Botox | 2026-04-05 14:00 | Maria Silva | 60]`;
}

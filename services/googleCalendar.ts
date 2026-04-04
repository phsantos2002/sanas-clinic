/**
 * Google Calendar Service — OAuth2 + Calendar API
 * Handles: connection, free slots, event creation
 */

import { prisma } from "@/lib/prisma";

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

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
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

async function getValidToken(userId: string): Promise<{ token: string; calendarId: string; config: GoogleCalendarConfig } | null> {
  const config = await prisma.googleCalendar.findUnique({ where: { userId } });
  if (!config) return null;

  let token = config.accessToken;

  // Refresh if expired (with 5 min buffer)
  if (new Date() >= new Date(config.tokenExpiry.getTime() - 5 * 60 * 1000)) {
    try {
      const refreshed = await refreshAccessToken(config.refreshToken);
      token = refreshed.access_token;
      await prisma.googleCalendar.update({
        where: { userId },
        data: {
          accessToken: token,
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

// ─── Calendar API ─────────────────────────────────────────

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
  daysAhead: number = 7,
): Promise<CalendarEvent[]> {
  const auth = await getValidToken(userId);
  if (!auth) return [];

  const now = new Date();
  const end = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    timeMin: now.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "50",
    timeZone: auth.config.timezone,
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(auth.calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${auth.token}` } }
  );

  if (!res.ok) return [];
  const data = await res.json();
  return (data.items || []) as CalendarEvent[];
}

export async function getFreeSlots(
  userId: string,
  date: string, // YYYY-MM-DD
  durationMinutes: number = 60,
): Promise<{ start: string; end: string }[]> {
  const auth = await getValidToken(userId);
  if (!auth) return [];

  const { businessHoursStart, businessHoursEnd, workDays, timezone } = auth.config;

  // Check if date is a work day
  const d = new Date(date + "T12:00:00");
  if (!workDays.includes(d.getDay())) return [];

  // Get events for this day
  const dayStart = `${date}T${businessHoursStart}:00`;
  const dayEnd = `${date}T${businessHoursEnd}:00`;

  const params = new URLSearchParams({
    timeMin: new Date(`${date}T00:00:00`).toISOString(),
    timeMax: new Date(`${date}T23:59:59`).toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    timeZone: timezone,
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(auth.calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${auth.token}` } }
  );

  if (!res.ok) return [];
  const data = await res.json();
  const events = (data.items || []) as CalendarEvent[];

  // Calculate free slots
  const busySlots = events
    .filter(e => e.start?.dateTime && e.end?.dateTime)
    .map(e => ({
      start: new Date(e.start.dateTime).getTime(),
      end: new Date(e.end.dateTime).getTime(),
    }));

  const slots: { start: string; end: string }[] = [];
  const [startH, startM] = businessHoursStart.split(":").map(Number);
  const [endH, endM] = businessHoursEnd.split(":").map(Number);
  const dStart = new Date(`${date}T${businessHoursStart}:00`);
  const dEnd = new Date(`${date}T${businessHoursEnd}:00`);

  let cursor = dStart.getTime();
  const slotDuration = durationMinutes * 60 * 1000;

  while (cursor + slotDuration <= dEnd.getTime()) {
    const slotEnd = cursor + slotDuration;
    const isBusy = busySlots.some(b => cursor < b.end && slotEnd > b.start);

    if (!isBusy) {
      slots.push({
        start: new Date(cursor).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: timezone }),
        end: new Date(slotEnd).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: timezone }),
      });
    }

    cursor += 30 * 60 * 1000; // Step 30 min
  }

  return slots;
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
  },
): Promise<{ success: boolean; eventId?: string; eventLink?: string; error?: string }> {
  const auth = await getValidToken(userId);
  if (!auth) return { success: false, error: "Google Calendar nao conectado" };

  const startDate = new Date(params.startDateTime);
  const endDate = new Date(startDate.getTime() + params.durationMinutes * 60 * 1000);

  const event: Record<string, unknown> = {
    summary: params.summary,
    description: params.description || "",
    start: { dateTime: startDate.toISOString(), timeZone: auth.config.timezone },
    end: { dateTime: endDate.toISOString(), timeZone: auth.config.timezone },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 60 },
        { method: "popup", minutes: 15 },
      ],
    },
  };

  if (params.attendeeEmail) {
    event.attendees = [
      { email: params.attendeeEmail, displayName: params.attendeeName || "" },
    ];
  }

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(auth.calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    return { success: false, error: `Erro ao criar evento: ${err}` };
  }

  const created = await res.json();
  return {
    success: true,
    eventId: created.id,
    eventLink: created.htmlLink,
  };
}

// ─── Context for AI ───────────────────────────────────────

export async function getCalendarContextForAI(
  userId: string,
): Promise<string | null> {
  const auth = await getValidToken(userId);
  if (!auth) return null;

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().split("T")[0];

  // Get free slots for today and tomorrow
  const todaySlots = await getFreeSlots(userId, todayStr, 60);
  const tomorrowSlots = await getFreeSlots(userId, tomorrowStr, 60);

  const todayFormatted = todaySlots.length > 0
    ? todaySlots.slice(0, 5).map(s => `  ${s.start} - ${s.end}`).join("\n")
    : "  Sem horarios disponiveis";

  const tomorrowFormatted = tomorrowSlots.length > 0
    ? tomorrowSlots.slice(0, 5).map(s => `  ${s.start} - ${s.end}`).join("\n")
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

"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./user";
import * as mcp from "@/services/mcp/calendarMcpClient";

export type CalendarEvent = {
  id: string;
  summary: string;
  description?: string;
  start: string; // ISO
  end: string; // ISO
  attendantId?: string | null;
  leadId?: string | null;
  htmlLink?: string;
};

function unwrap(ev: mcp.GCalEvent): CalendarEvent {
  return {
    id: ev.id,
    summary: ev.summary ?? "(sem título)",
    description: ev.description,
    start: ev.start.dateTime ?? ev.start.date ?? "",
    end: ev.end.dateTime ?? ev.end.date ?? "",
    attendantId: ev.extendedProperties?.private?.attendantId ?? null,
    leadId: ev.extendedProperties?.private?.leadId ?? null,
    htmlLink: ev.htmlLink,
  };
}

/**
 * Lista eventos do dia (00:00 → 23:59 do timezone do GoogleCalendar).
 * Usado pelo grid Trinks pra renderizar células.
 */
export async function getEventsByDay(
  date: string // YYYY-MM-DD
): Promise<{ events: CalendarEvent[] }> {
  const user = await getCurrentUser();
  if (!user) return { events: [] };

  const timeMin = new Date(`${date}T00:00:00`).toISOString();
  const timeMax = new Date(`${date}T23:59:59`).toISOString();

  try {
    const result = await mcp.listEvents({
      userId: user.id,
      timeMin,
      timeMax,
      maxResults: 250,
    });
    return { events: result.events.map(unwrap) };
  } catch {
    return { events: [] };
  }
}

export type CreateAppointmentInput = {
  summary: string;
  description?: string;
  startDateTime: string; // ISO 8601
  durationMinutes: number;
  attendantId?: string;
  leadId?: string;
  attendeeEmail?: string;
  attendeeName?: string;
};

export async function createAppointment(
  input: CreateAppointmentInput
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  try {
    const result = await mcp.createEvent({ userId: user.id, ...input });
    revalidatePath("/dashboard/calendar");
    return { success: true, eventId: result.eventId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao criar agendamento";
    return { success: false, error: msg };
  }
}

export type UpdateAppointmentInput = {
  eventId: string;
  changes: {
    summary?: string;
    description?: string;
    startDateTime?: string;
    durationMinutes?: number;
    attendantId?: string | null;
  };
};

export async function updateAppointment(
  input: UpdateAppointmentInput
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  try {
    await mcp.updateEvent({ userId: user.id, ...input });
    revalidatePath("/dashboard/calendar");
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao atualizar";
    return { success: false, error: msg };
  }
}

export async function deleteAppointment(
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  try {
    await mcp.deleteEvent({ userId: user.id, eventId });
    revalidatePath("/dashboard/calendar");
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao deletar";
    return { success: false, error: msg };
  }
}

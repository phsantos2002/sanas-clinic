"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";

/**
 * Agenda nativa — CRUD de agendamentos no banco (model Appointment).
 * Substitui a integração Google Calendar; mesmas assinaturas de antes,
 * então o grid/modal do calendário não mudam.
 */

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

/** Lista eventos do dia (00:00 → 23:59 local). */
export async function getEventsByDay(
  date: string // YYYY-MM-DD
): Promise<{ events: CalendarEvent[] }> {
  const user = await getCurrentUser();
  if (!user) return { events: [] };

  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59`);

  const appointments = await prisma.appointment.findMany({
    where: {
      userId: user.id,
      status: { not: "cancelled" },
      startAt: { gte: dayStart, lte: dayEnd },
    },
    orderBy: { startAt: "asc" },
    take: 250,
  });

  return {
    events: appointments.map((a) => ({
      id: a.id,
      summary: a.title,
      description: a.description ?? undefined,
      start: a.startAt.toISOString(),
      end: a.endAt.toISOString(),
      attendantId: a.attendantId,
      leadId: a.leadId,
    })),
  };
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

  const { createLocalAppointment } = await import("@/services/localCalendar");
  const result = await createLocalAppointment(user.id, {
    summary: input.summary,
    description: input.description,
    startDateTime: input.startDateTime,
    durationMinutes: input.durationMinutes,
    attendantId: input.attendantId ?? null,
    leadId: input.leadId ?? null,
  });
  if (result.success) revalidatePath("/dashboard/calendar");
  return result;
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

  const existing = await prisma.appointment.findFirst({
    where: { id: input.eventId, userId: user.id },
  });
  if (!existing) return { success: false, error: "Agendamento nao encontrado" };

  const c = input.changes;
  const startAt = c.startDateTime ? new Date(c.startDateTime) : existing.startAt;
  const durationMs = c.durationMinutes
    ? c.durationMinutes * 60 * 1000
    : existing.endAt.getTime() - existing.startAt.getTime();

  await prisma.appointment.update({
    where: { id: existing.id },
    data: {
      ...(c.summary !== undefined ? { title: c.summary } : {}),
      ...(c.description !== undefined ? { description: c.description } : {}),
      ...(c.attendantId !== undefined ? { attendantId: c.attendantId } : {}),
      startAt,
      endAt: new Date(startAt.getTime() + durationMs),
    },
  });

  revalidatePath("/dashboard/calendar");
  return { success: true };
}

export async function deleteAppointment(
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  const result = await prisma.appointment.updateMany({
    where: { id: eventId, userId: user.id },
    data: { status: "cancelled" },
  });
  if (result.count === 0) return { success: false, error: "Agendamento nao encontrado" };

  revalidatePath("/dashboard/calendar");
  return { success: true };
}

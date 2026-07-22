import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Agenda nativa — substitui o Google Calendar. Agendamentos vivem no banco
 * (model Appointment) e conversam com leads, atendentes e a IA.
 */

const log = logger.child({ service: "localCalendar" });

export async function createLocalAppointment(
  userId: string,
  input: {
    summary: string;
    description?: string;
    startDateTime: string; // ISO
    durationMinutes: number;
    attendantId?: string | null;
    leadId?: string | null;
  }
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    const startAt = new Date(input.startDateTime);
    if (isNaN(startAt.getTime())) return { success: false, error: "Data inválida" };
    const endAt = new Date(startAt.getTime() + (input.durationMinutes || 60) * 60 * 1000);

    const appointment = await prisma.appointment.create({
      data: {
        userId,
        title: input.summary,
        description: input.description ?? null,
        startAt,
        endAt,
        attendantId: input.attendantId ?? null,
        leadId: input.leadId ?? null,
      },
    });
    log.info("appointment_created", { appointmentId: appointment.id, userId });
    return { success: true, eventId: appointment.id };
  } catch (err) {
    log.error("appointment_create_failed", { err });
    return { success: false, error: err instanceof Error ? err.message : "erro" };
  }
}

/**
 * Contexto de agenda para a IA: horários já ocupados nos próximos 7 dias,
 * para ela oferecer horários livres com segurança.
 */
export async function getCalendarContextForAI(userId: string): Promise<string | null> {
  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      userId,
      status: "scheduled",
      startAt: { gte: now, lte: weekAhead },
    },
    orderBy: { startAt: "asc" },
    take: 60,
    select: { title: true, startAt: true, endAt: true },
  });

  const fmt = (d: Date) =>
    d.toLocaleString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });

  const busy =
    appointments.length === 0
      ? "Nenhum horário ocupado nos próximos 7 dias — agenda livre."
      : appointments.map((a) => `- ${fmt(a.startAt)} até ${fmt(a.endAt)}`).join("\n");

  return `AGENDA (próximos 7 dias) — horários JÁ OCUPADOS (não ofereça estes):
${busy}

Para agendar, use o comando [AGENDAR: serviço | AAAA-MM-DD HH:MM | nome do cliente | duração em minutos] ao final da resposta, num horário livre.`;
}

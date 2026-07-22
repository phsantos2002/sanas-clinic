"use server";

import { prisma } from "@/lib/prisma";
import { requireManagerContext } from "@/lib/authGuard";

/**
 * Relatórios de atendimento por atendente — derivados dos timestamps do
 * Ticket (F2) + Message.attendantId. Visível para dono/admin/manager.
 *
 * TME (tempo médio de espera)      = média(firstHumanReplyAt - pendingAt)
 * TMA (tempo médio de atendimento) = média(resolvedAt - acceptedAt)
 */

export type AttendantReport = {
  attendantId: string;
  name: string;
  role: string;
  ticketsAccepted: number;
  ticketsResolved: number;
  ticketsOpenNow: number;
  messagesSent: number;
  tmeSeconds: number | null; // média de espera até 1ª resposta humana
  tmaSeconds: number | null; // média de duração do atendimento
  conversions: number; // leads do atendente que chegaram em Purchase no período
};

export type TeamReport = {
  periodDays: number;
  totals: {
    ticketsCreated: number;
    resolvedByBot: number; // resolvidos sem nunca entrar na fila humana
    pendingNow: number;
  };
  attendants: AttendantReport[];
};

export async function getTeamReport(periodDays = 30): Promise<TeamReport | null> {
  const ctx = await requireManagerContext();
  if (!ctx) return null;

  const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
  const userId = ctx.tenantId;

  const [attendants, ticketsCreated, resolvedByBot, pendingNow] = await Promise.all([
    prisma.attendant.findMany({
      where: { userId, isActive: true },
      select: { id: true, name: true, role: true },
    }),
    prisma.ticket.count({ where: { userId, createdAt: { gte: since } } }),
    prisma.ticket.count({
      where: { userId, status: "resolved", pendingAt: null, resolvedAt: { gte: since } },
    }),
    prisma.ticket.count({ where: { userId, status: "pending" } }),
  ]);

  // Etapa de conversão (Purchase) do tenant
  const purchaseStage = await prisma.stage.findFirst({
    where: { userId, eventName: "Purchase" },
    select: { id: true },
  });

  const reports: AttendantReport[] = await Promise.all(
    attendants.map(async (a) => {
      const [accepted, resolved, openNow, messagesSent, times, conversions] = await Promise.all([
        prisma.ticket.count({
          where: { userId, attendantId: a.id, acceptedAt: { gte: since } },
        }),
        prisma.ticket.count({
          where: { userId, attendantId: a.id, status: "resolved", resolvedAt: { gte: since } },
        }),
        prisma.ticket.count({ where: { userId, attendantId: a.id, status: "open" } }),
        prisma.message.count({
          where: { attendantId: a.id, createdAt: { gte: since }, lead: { userId } },
        }),
        prisma.$queryRaw<{ tme: number | null; tma: number | null }[]>`
          SELECT
            AVG(EXTRACT(EPOCH FROM ("firstHumanReplyAt" - "pendingAt")))
              FILTER (WHERE "firstHumanReplyAt" IS NOT NULL AND "pendingAt" IS NOT NULL) AS tme,
            AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "acceptedAt")))
              FILTER (WHERE "resolvedAt" IS NOT NULL AND "acceptedAt" IS NOT NULL) AS tma
          FROM "Ticket"
          WHERE "userId" = ${userId}
            AND "attendantId" = ${a.id}
            AND "createdAt" >= ${since}
        `,
        purchaseStage
          ? prisma.leadStageHistory.count({
              where: {
                stageId: purchaseStage.id,
                createdAt: { gte: since },
                lead: { userId, assignedTo: a.id },
              },
            })
          : Promise.resolve(0),
      ]);

      return {
        attendantId: a.id,
        name: a.name,
        role: a.role,
        ticketsAccepted: accepted,
        ticketsResolved: resolved,
        ticketsOpenNow: openNow,
        messagesSent,
        tmeSeconds: times[0]?.tme != null ? Number(times[0].tme) : null,
        tmaSeconds: times[0]?.tma != null ? Number(times[0].tma) : null,
        conversions,
      };
    })
  );

  return {
    periodDays,
    totals: { ticketsCreated, resolvedByBot, pendingNow },
    attendants: reports.sort((x, y) => y.ticketsResolved - x.ticketsResolved),
  };
}

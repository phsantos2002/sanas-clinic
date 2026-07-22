"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireManagerContext } from "@/lib/authGuard";
import type { ActionResult } from "@/types";

/**
 * Vínculos de trabalho do vendedor (gerenciados pelo lado do usuário):
 *  - número/conexão de WhatsApp em que ele trabalha (WhatsAppConnection.attendantId, 1:1)
 *  - setor(es) de onde recebe (QueueAttendant)
 *  - funil onde classifica os leads (AttendantFunnel, allStages)
 *
 * Assim o número recebe → roda chatbot → cai na fila do setor → o vendedor
 * daquele setor assume e classifica no funil certo (que volta como evento pro Pixel).
 */

export type AttendantWork = {
  connectionId: string | null;
  queueIds: string[];
  funnelId: string | null;
};

export async function getAttendantWork(attendantId: string): Promise<AttendantWork> {
  const ctx = await requireManagerContext();
  if (!ctx) return { connectionId: null, queueIds: [], funnelId: null };

  const [connection, queues, funnel] = await Promise.all([
    prisma.whatsAppConnection.findFirst({
      where: { userId: ctx.tenantId, attendantId },
      select: { id: true },
    }),
    prisma.queueAttendant.findMany({ where: { attendantId }, select: { queueId: true } }),
    prisma.attendantFunnel.findFirst({ where: { attendantId }, select: { funnelId: true } }),
  ]);

  return {
    connectionId: connection?.id ?? null,
    queueIds: queues.map((q) => q.queueId),
    funnelId: funnel?.funnelId ?? null,
  };
}

export async function setAttendantWork(
  attendantId: string,
  work: AttendantWork
): Promise<ActionResult> {
  const ctx = await requireManagerContext();
  if (!ctx) return { success: false, error: "Sem permissao" };

  const attendant = await prisma.attendant.findFirst({
    where: { id: attendantId, userId: ctx.tenantId },
  });
  if (!attendant) return { success: false, error: "Vendedor nao encontrado" };

  // Valida ownership do que veio
  const validQueues = work.queueIds.length
    ? (
        await prisma.queue.findMany({
          where: { id: { in: work.queueIds }, userId: ctx.tenantId },
          select: { id: true },
        })
      ).map((q) => q.id)
    : [];

  const funnelOk = work.funnelId
    ? await prisma.funnel.findFirst({
        where: { id: work.funnelId, userId: ctx.tenantId },
        select: { id: true },
      })
    : null;

  await prisma.$transaction(async (tx) => {
    // 1) Conexão (número) — 1:1: tira o vendedor de qualquer outra conexão
    await tx.whatsAppConnection.updateMany({
      where: { userId: ctx.tenantId, attendantId },
      data: { attendantId: null },
    });
    if (work.connectionId) {
      await tx.whatsAppConnection.updateMany({
        where: { id: work.connectionId, userId: ctx.tenantId },
        data: { attendantId },
      });
    }

    // 2) Setores (fila) — substitui as associações
    await tx.queueAttendant.deleteMany({ where: { attendantId } });
    if (validQueues.length) {
      await tx.queueAttendant.createMany({
        data: validQueues.map((queueId) => ({ queueId, attendantId })),
      });
    }

    // 3) Funil — o vendedor trabalha num funil (allStages)
    await tx.attendantFunnel.deleteMany({ where: { attendantId } });
    await tx.attendantStage.deleteMany({ where: { attendantId } });
    if (funnelOk) {
      await tx.attendantFunnel.create({
        data: { attendantId, funnelId: funnelOk.id, allStages: true },
      });
    }
  });

  revalidatePath("/dashboard/settings/team");
  return { success: true };
}

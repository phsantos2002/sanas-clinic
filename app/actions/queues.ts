"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireManagerContext } from "@/lib/authGuard";
import { resolveSession } from "@/app/actions/user";
import type { ActionResult } from "@/types";

/** Setores (filas de atendimento) — CRUD e membros. Gestão: dono/admin/manager. */

export type QueueData = {
  id: string;
  name: string;
  color: string;
  greeting: string | null;
  order: number;
  isActive: boolean;
  attendantIds: string[];
};

export async function getQueues(): Promise<QueueData[]> {
  const ctx = await resolveSession();
  if (!ctx) return [];

  const queues = await prisma.queue.findMany({
    where: { userId: ctx.tenantId },
    include: { attendants: { select: { attendantId: true } } },
    orderBy: { order: "asc" },
  });

  return queues.map((q) => ({
    id: q.id,
    name: q.name,
    color: q.color,
    greeting: q.greeting,
    order: q.order,
    isActive: q.isActive,
    attendantIds: q.attendants.map((a) => a.attendantId),
  }));
}

export async function createQueue(data: {
  name: string;
  color?: string;
  greeting?: string;
}): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireManagerContext();
  if (!ctx) return { success: false, error: "Sem permissao" };
  if (!data.name?.trim()) return { success: false, error: "Nome obrigatorio" };

  try {
    const count = await prisma.queue.count({ where: { userId: ctx.tenantId } });
    const queue = await prisma.queue.create({
      data: {
        userId: ctx.tenantId,
        name: data.name.trim(),
        color: data.color || "#3b82f6",
        greeting: data.greeting?.trim() || null,
        order: count,
      },
    });
    revalidatePath("/dashboard/settings/team");
    return { success: true, data: { id: queue.id } };
  } catch {
    return { success: false, error: "Setor ja existe ou erro ao criar" };
  }
}

export async function deleteQueue(id: string): Promise<ActionResult> {
  const ctx = await requireManagerContext();
  if (!ctx) return { success: false, error: "Sem permissao" };

  await prisma.queue.deleteMany({ where: { id, userId: ctx.tenantId } });
  revalidatePath("/dashboard/settings/team");
  return { success: true };
}

/** Substitui os membros do setor. */
export async function setQueueMembers(
  queueId: string,
  attendantIds: string[]
): Promise<ActionResult> {
  const ctx = await requireManagerContext();
  if (!ctx) return { success: false, error: "Sem permissao" };

  const queue = await prisma.queue.findFirst({ where: { id: queueId, userId: ctx.tenantId } });
  if (!queue) return { success: false, error: "Setor nao encontrado" };

  // Valida que os atendentes são do tenant
  const valid = await prisma.attendant.findMany({
    where: { id: { in: attendantIds }, userId: ctx.tenantId },
    select: { id: true },
  });
  const validIds = valid.map((a) => a.id);

  await prisma.$transaction([
    prisma.queueAttendant.deleteMany({ where: { queueId } }),
    prisma.queueAttendant.createMany({
      data: validIds.map((attendantId) => ({ queueId, attendantId })),
    }),
  ]);

  revalidatePath("/dashboard/settings/team");
  return { success: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import type { Stage, ActionResult } from "@/types";

export async function getStages(): Promise<Stage[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  return prisma.stage.findMany({
    where: { userId: user.id },
    orderBy: { order: "asc" },
  });
}

export async function createStage(data: {
  name: string;
  eventName: string | null;
  funnelId?: string | null;
}): Promise<ActionResult<Stage>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  try {
    const last = await prisma.stage.findFirst({
      where: { userId: user.id },
      orderBy: { order: "desc" },
    });

    // Validate funnel ownership if provided
    if (data.funnelId) {
      const owned = await prisma.funnel.findFirst({
        where: { id: data.funnelId, userId: user.id },
      });
      if (!owned) return { success: false, error: "Funil invalido" };
    }

    const stage = await prisma.stage.create({
      data: {
        name: data.name,
        eventName: data.eventName ?? null,
        order: (last?.order ?? 0) + 1,
        userId: user.id,
        funnelId: data.funnelId ?? null,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    return { success: true, data: stage };
  } catch {
    return { success: false, error: "Erro ao criar coluna" };
  }
}

export async function updateStage(
  stageId: string,
  data: { name?: string; eventName?: string | null; funnelId?: string | null }
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  try {
    if (data.funnelId) {
      const owned = await prisma.funnel.findFirst({
        where: { id: data.funnelId, userId: user.id },
      });
      if (!owned) return { success: false, error: "Funil invalido" };
    }

    await prisma.stage.update({
      where: { id: stageId, userId: user.id },
      data,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao atualizar coluna" };
  }
}

export async function deleteStage(stageId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  try {
    await prisma.lead.updateMany({
      where: { stageId, userId: user.id },
      data: { stageId: null },
    });

    await prisma.stage.delete({
      where: { id: stageId, userId: user.id },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao excluir coluna" };
  }
}

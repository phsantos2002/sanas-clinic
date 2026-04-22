"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import type { ActionResult } from "@/types";

export type FunnelData = {
  id: string;
  name: string;
  order: number;
  isDefault: boolean;
  stageCount: number;
};

/**
 * Returns all funnels for the current user, lazily creating a "Principal" funnel
 * the first time and folding in any stages that don't have a funnelId yet.
 * This avoids requiring a data migration when the new schema rolls out.
 */
export async function getFunnels(): Promise<FunnelData[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  let funnels = await prisma.funnel.findMany({
    where: { userId: user.id },
    orderBy: { order: "asc" },
    include: { _count: { select: { stages: true } } },
  });

  // Lazy bootstrap: if user has stages but no funnel, create "Principal"
  // and adopt all orphan stages.
  const orphanStages = await prisma.stage.count({
    where: { userId: user.id, funnelId: null },
  });

  if (funnels.length === 0 && orphanStages > 0) {
    const created = await prisma.funnel.create({
      data: { userId: user.id, name: "Principal", isDefault: true, order: 0 },
    });
    await prisma.stage.updateMany({
      where: { userId: user.id, funnelId: null },
      data: { funnelId: created.id },
    });
    funnels = await prisma.funnel.findMany({
      where: { userId: user.id },
      orderBy: { order: "asc" },
      include: { _count: { select: { stages: true } } },
    });
  } else if (orphanStages > 0 && funnels.length > 0) {
    // Adopt orphan stages into the default (or first) funnel.
    const target = funnels.find((f) => f.isDefault) ?? funnels[0];
    await prisma.stage.updateMany({
      where: { userId: user.id, funnelId: null },
      data: { funnelId: target.id },
    });
    funnels = await prisma.funnel.findMany({
      where: { userId: user.id },
      orderBy: { order: "asc" },
      include: { _count: { select: { stages: true } } },
    });
  }

  return funnels.map((f) => ({
    id: f.id,
    name: f.name,
    order: f.order,
    isDefault: f.isDefault,
    stageCount: f._count.stages,
  }));
}

export async function createFunnel(name: string): Promise<ActionResult<FunnelData>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };
  const trimmed = name.trim();
  if (!trimmed) return { success: false, error: "Nome obrigatorio" };

  try {
    const max = await prisma.funnel.findFirst({
      where: { userId: user.id },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const created = await prisma.funnel.create({
      data: {
        userId: user.id,
        name: trimmed,
        order: (max?.order ?? -1) + 1,
        isDefault: false,
      },
    });
    revalidatePath("/dashboard/settings/pipeline");
    revalidatePath("/dashboard/settings/team");
    return {
      success: true,
      data: {
        id: created.id,
        name: created.name,
        order: created.order,
        isDefault: created.isDefault,
        stageCount: 0,
      },
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique")) {
      return { success: false, error: "Ja existe um funil com esse nome" };
    }
    return { success: false, error: "Erro ao criar funil" };
  }
}

export async function renameFunnel(id: string, name: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };
  const trimmed = name.trim();
  if (!trimmed) return { success: false, error: "Nome obrigatorio" };

  const found = await prisma.funnel.findFirst({ where: { id, userId: user.id } });
  if (!found) return { success: false, error: "Funil nao encontrado" };

  try {
    await prisma.funnel.update({ where: { id }, data: { name: trimmed } });
    revalidatePath("/dashboard/settings/pipeline");
    return { success: true };
  } catch {
    return { success: false, error: "Ja existe um funil com esse nome" };
  }
}

export async function deleteFunnel(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  const funnel = await prisma.funnel.findFirst({
    where: { id, userId: user.id },
    include: { _count: { select: { stages: true } } },
  });
  if (!funnel) return { success: false, error: "Funil nao encontrado" };
  if (funnel.isDefault) return { success: false, error: "Nao e possivel remover o funil padrao" };
  if (funnel._count.stages > 0) {
    return {
      success: false,
      error: `Remova/mova as ${funnel._count.stages} etapa(s) antes de excluir`,
    };
  }

  await prisma.funnel.delete({ where: { id } });
  revalidatePath("/dashboard/settings/pipeline");
  return { success: true };
}

export async function setDefaultFunnel(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  const funnel = await prisma.funnel.findFirst({ where: { id, userId: user.id } });
  if (!funnel) return { success: false, error: "Funil nao encontrado" };

  await prisma.$transaction([
    prisma.funnel.updateMany({ where: { userId: user.id }, data: { isDefault: false } }),
    prisma.funnel.update({ where: { id }, data: { isDefault: true } }),
  ]);
  revalidatePath("/dashboard/settings/pipeline");
  return { success: true };
}

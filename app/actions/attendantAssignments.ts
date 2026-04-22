"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import type { ActionResult } from "@/types";

export type AttendantFunnelAccess = {
  funnelId: string;
  funnelName: string;
  allStages: boolean;
  stageIds: string[];
};

export async function getAttendantAssignments(
  attendantId: string
): Promise<AttendantFunnelAccess[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const attendant = await prisma.attendant.findFirst({
    where: { id: attendantId, userId: user.id },
    select: { id: true },
  });
  if (!attendant) return [];

  const funnels = await prisma.attendantFunnel.findMany({
    where: { attendantId },
    include: { funnel: { select: { name: true } } },
  });

  const stageAssignments = await prisma.attendantStage.findMany({
    where: { attendantId },
    include: { stage: { select: { funnelId: true } } },
  });

  return funnels.map((af) => ({
    funnelId: af.funnelId,
    funnelName: af.funnel.name,
    allStages: af.allStages,
    stageIds: stageAssignments
      .filter((as) => as.stage.funnelId === af.funnelId)
      .map((as) => as.stageId),
  }));
}

/**
 * Replace attendant's access to a funnel. If allStages=true, clears any stage-specific rows.
 * If allStages=false, requires at least one stageId.
 */
export async function setAttendantFunnelAccess(
  attendantId: string,
  funnelId: string,
  opts: { allStages: boolean; stageIds?: string[] }
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  const [attendant, funnel] = await Promise.all([
    prisma.attendant.findFirst({ where: { id: attendantId, userId: user.id } }),
    prisma.funnel.findFirst({ where: { id: funnelId, userId: user.id } }),
  ]);
  if (!attendant) return { success: false, error: "Usuario nao encontrado" };
  if (!funnel) return { success: false, error: "Funil nao encontrado" };

  const stageIds = opts.stageIds ?? [];
  if (!opts.allStages && stageIds.length === 0) {
    return { success: false, error: "Selecione pelo menos uma etapa" };
  }

  // Validate stages belong to this funnel
  if (!opts.allStages) {
    const valid = await prisma.stage.count({
      where: { id: { in: stageIds }, funnelId, userId: user.id },
    });
    if (valid !== stageIds.length) {
      return { success: false, error: "Alguma etapa selecionada nao pertence a este funil" };
    }
  }

  await prisma.$transaction([
    prisma.attendantFunnel.upsert({
      where: { attendantId_funnelId: { attendantId, funnelId } },
      update: { allStages: opts.allStages },
      create: { attendantId, funnelId, allStages: opts.allStages },
    }),
    // Clear existing stage assignments for this funnel
    prisma.attendantStage.deleteMany({
      where: { attendantId, stage: { funnelId } },
    }),
    // Insert new stage assignments if restricted
    ...(opts.allStages
      ? []
      : [
          prisma.attendantStage.createMany({
            data: stageIds.map((stageId) => ({ attendantId, stageId })),
          }),
        ]),
  ]);

  revalidatePath("/dashboard/settings/team");
  return { success: true };
}

export async function removeAttendantFunnelAccess(
  attendantId: string,
  funnelId: string
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };
  const attendant = await prisma.attendant.findFirst({
    where: { id: attendantId, userId: user.id },
  });
  if (!attendant) return { success: false, error: "Usuario nao encontrado" };

  await prisma.$transaction([
    prisma.attendantFunnel.deleteMany({ where: { attendantId, funnelId } }),
    prisma.attendantStage.deleteMany({ where: { attendantId, stage: { funnelId } } }),
  ]);
  revalidatePath("/dashboard/settings/team");
  return { success: true };
}

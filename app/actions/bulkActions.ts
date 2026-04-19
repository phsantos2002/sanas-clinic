"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import { logBulkActivity } from "@/services/leadActivity";
import type { ActionResult } from "@/types";

const MAX_BULK = 500;

/**
 * Bulk move leads to a target stage.
 */
export async function bulkMoveStage(
  leadIds: string[],
  stageId: string
): Promise<ActionResult<{ moved: number }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };
  if (!leadIds.length) return { success: false, error: "Selecione pelo menos um lead" };
  if (leadIds.length > MAX_BULK) return { success: false, error: `Maximo ${MAX_BULK} por vez` };

  const stage = await prisma.stage.findFirst({
    where: { id: stageId, userId: user.id },
  });
  if (!stage) return { success: false, error: "Estagio nao encontrado" };

  const result = await prisma.lead.updateMany({
    where: { id: { in: leadIds }, userId: user.id },
    data: { stageId },
  });

  // Record stage history for audit
  await prisma.leadStageHistory
    .createMany({
      data: leadIds.map((leadId) => ({ leadId, stageId })),
      skipDuplicates: true,
    })
    .catch(() => {});

  await logBulkActivity(
    leadIds.map((leadId) => ({
      leadId,
      userId: user.id,
      type: "stage_change",
      summary: `Movido para "${stage.name}"`,
      metadata: { stageId, stageName: stage.name, source: "bulk" },
      actorType: "user",
      actorName: user.name ?? user.email ?? undefined,
    }))
  );

  revalidatePath("/dashboard/pipeline");
  return { success: true, data: { moved: result.count } };
}

/**
 * Bulk assign leads to an attendant (or null to unassign, or "auto" for round-robin).
 */
export async function bulkAssign(
  leadIds: string[],
  attendantId: string | null
): Promise<ActionResult<{ assigned: number }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };
  if (!leadIds.length) return { success: false, error: "Selecione pelo menos um lead" };
  if (leadIds.length > MAX_BULK) return { success: false, error: `Maximo ${MAX_BULK} por vez` };

  let finalAttendantId: string | null = attendantId;

  if (attendantId === "auto") {
    const attendants = await prisma.attendant.findMany({
      where: {
        userId: user.id,
        isActive: true,
        role: { in: ["sdr", "sdr_manager", "attendant", "closer"] },
      },
      select: { id: true },
    });
    if (!attendants.length) return { success: false, error: "Nenhum atendente ativo" };

    // Distribute round-robin across the batch
    let assigned = 0;
    for (let i = 0; i < leadIds.length; i++) {
      const target = attendants[i % attendants.length].id;
      const r = await prisma.lead.updateMany({
        where: { id: leadIds[i], userId: user.id },
        data: { assignedTo: target },
      });
      assigned += r.count;
    }
    revalidatePath("/dashboard/pipeline");
    return { success: true, data: { assigned } };
  }

  if (attendantId) {
    const valid = await prisma.attendant.findFirst({
      where: { id: attendantId, userId: user.id },
      select: { id: true },
    });
    if (!valid) return { success: false, error: "Atendente nao encontrado" };
  }

  const result = await prisma.lead.updateMany({
    where: { id: { in: leadIds }, userId: user.id },
    data: { assignedTo: finalAttendantId },
  });

  const attendantName = finalAttendantId
    ? (
        await prisma.attendant.findFirst({
          where: { id: finalAttendantId, userId: user.id },
          select: { name: true },
        })
      )?.name
    : null;

  await logBulkActivity(
    leadIds.map((leadId) => ({
      leadId,
      userId: user.id,
      type: "assignment",
      summary: finalAttendantId
        ? `Atribuído a ${attendantName ?? "atendente"}`
        : "Atribuição removida",
      metadata: { attendantId: finalAttendantId, attendantName },
      actorType: "user",
      actorName: user.name ?? user.email ?? undefined,
    }))
  );

  revalidatePath("/dashboard/pipeline");
  return { success: true, data: { assigned: result.count } };
}

/**
 * Bulk add a tag (deduplicated).
 */
export async function bulkAddTag(
  leadIds: string[],
  tag: string
): Promise<ActionResult<{ tagged: number }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };
  if (!leadIds.length) return { success: false, error: "Selecione pelo menos um lead" };
  if (leadIds.length > MAX_BULK) return { success: false, error: `Maximo ${MAX_BULK} por vez` };

  const normalized = tag.trim().toLowerCase();
  if (!normalized) return { success: false, error: "Tag vazia" };

  const leads = await prisma.lead.findMany({
    where: { id: { in: leadIds }, userId: user.id },
    select: { id: true, tags: true },
  });

  let tagged = 0;
  const taggedIds: string[] = [];
  for (const lead of leads) {
    if (lead.tags.includes(normalized)) continue;
    await prisma.lead.update({
      where: { id: lead.id },
      data: { tags: [...lead.tags, normalized] },
    });
    tagged++;
    taggedIds.push(lead.id);
  }

  await logBulkActivity(
    taggedIds.map((leadId) => ({
      leadId,
      userId: user.id,
      type: "tag_added",
      summary: `Tag "${normalized}" adicionada`,
      metadata: { tag: normalized },
      actorType: "user",
      actorName: user.name ?? user.email ?? undefined,
    }))
  );

  revalidatePath("/dashboard/pipeline");
  return { success: true, data: { tagged } };
}

/**
 * Bulk delete leads (owned by current user).
 */
export async function bulkDeleteLeads(
  leadIds: string[]
): Promise<ActionResult<{ deleted: number }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };
  if (!leadIds.length) return { success: false, error: "Selecione pelo menos um lead" };
  if (leadIds.length > MAX_BULK) return { success: false, error: `Maximo ${MAX_BULK} por vez` };

  const result = await prisma.lead.deleteMany({
    where: { id: { in: leadIds }, userId: user.id },
  });

  revalidatePath("/dashboard/pipeline");
  return { success: true, data: { deleted: result.count } };
}

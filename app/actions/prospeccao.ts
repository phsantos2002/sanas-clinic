"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import { normalizePhone } from "@/lib/validations";
import { ATTENDANT_ROLES, type AttendantRole } from "@/lib/prospeccao";
import { logLeadActivity } from "@/services/leadActivity";
import type { ActionResult } from "@/types";

// ══════════════════════════════════════════════════════════════
// IMPORT CSV — Bulk outbound lead import
// ══════════════════════════════════════════════════════════════

export type CsvLeadRow = {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  jobTitle?: string;
  linkedinUrl?: string;
  industry?: string;
  city?: string;
  notes?: string;
};

export type ImportResult = {
  total: number;
  created: number;
  skipped: number;
  errors: { row: number; reason: string }[];
  batchId: string;
};

/**
 * Bulk import outbound leads from CSV-parsed rows.
 * - Dedup: phone full match within user scope.
 * - Tags: "outbound" + optional user-supplied tags.
 * - Assigns importBatchId (nanoid) so the import can be reverted.
 */
export async function importLeadsBulk(data: {
  rows: CsvLeadRow[];
  assignedTo?: string | null; // optional attendant
  extraTags?: string[];
  defaultStageId?: string;
}): Promise<ActionResult<ImportResult>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  if (!data.rows || data.rows.length === 0) {
    return { success: false, error: "Nenhuma linha para importar" };
  }

  if (data.rows.length > 5000) {
    return { success: false, error: "Limite de 5000 leads por importacao" };
  }

  const batchId = nanoid(10);
  const errors: { row: number; reason: string }[] = [];
  let created = 0;
  let skipped = 0;

  // Fetch default stage if not provided — use first stage
  let stageId = data.defaultStageId;
  if (!stageId) {
    const firstStage = await prisma.stage.findFirst({
      where: { userId: user.id },
      orderBy: { order: "asc" },
      select: { id: true },
    });
    stageId = firstStage?.id;
  }

  const tags = ["outbound", ...(data.extraTags || []).filter(Boolean)];

  for (let i = 0; i < data.rows.length; i++) {
    const row = data.rows[i];

    if (!row.name?.trim() || !row.phone?.trim()) {
      errors.push({ row: i + 1, reason: "Nome e telefone sao obrigatorios" });
      continue;
    }

    const cleanPhone = normalizePhone(row.phone);
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      errors.push({ row: i + 1, reason: "Telefone invalido" });
      continue;
    }

    // Dedup — skip existing
    const existing = await prisma.lead.findFirst({
      where: { userId: user.id, phone: cleanPhone },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }

    try {
      const createdLead = await prisma.lead.create({
        data: {
          userId: user.id,
          name: row.name.trim(),
          phone: cleanPhone,
          email: row.email?.trim() || null,
          city: row.city?.trim() || null,
          notes: row.notes?.trim() || null,
          company: row.company?.trim() || null,
          jobTitle: row.jobTitle?.trim() || null,
          linkedinUrl: row.linkedinUrl?.trim() || null,
          industry: row.industry?.trim() || null,
          leadType: "outbound",
          source: "outbound_csv",
          medium: "outbound",
          tags,
          importBatchId: batchId,
          stageId,
          aiEnabled: false, // outbound: humano controla toque inicial
          assignedTo: data.assignedTo || null,
        },
      });
      created++;

      // log activity (best effort)
      await logLeadActivity({
        leadId: createdLead.id,
        userId: user.id,
        type: "import",
        summary: "Importado via CSV outbound",
        metadata: { batchId, company: row.company, jobTitle: row.jobTitle },
        actorType: "user",
        actorName: user.name ?? user.email ?? undefined,
      });
    } catch (err) {
      errors.push({
        row: i + 1,
        reason: err instanceof Error ? err.message : "Erro desconhecido",
      });
    }
  }

  revalidatePath("/dashboard/pipeline");
  revalidatePath("/dashboard/prospeccao");

  return {
    success: true,
    data: {
      total: data.rows.length,
      created,
      skipped,
      errors,
      batchId,
    },
  };
}

/**
 * List the last N import batches for the current user, with stats.
 */
export async function getImportBatches(limit = 20): Promise<
  {
    batchId: string;
    totalLeads: number;
    firstImportedAt: Date;
    sampleNames: string[];
  }[]
> {
  const user = await getCurrentUser();
  if (!user) return [];

  const grouped = await prisma.lead.groupBy({
    by: ["importBatchId"],
    where: {
      userId: user.id,
      importBatchId: { not: null },
    },
    _count: { _all: true },
    _min: { createdAt: true },
    orderBy: { _min: { createdAt: "desc" } },
    take: limit,
  });

  const batches = await Promise.all(
    grouped.map(async (g) => {
      const samples = await prisma.lead.findMany({
        where: { userId: user.id, importBatchId: g.importBatchId },
        select: { name: true },
        take: 3,
        orderBy: { createdAt: "asc" },
      });
      return {
        batchId: g.importBatchId!,
        totalLeads: g._count._all,
        firstImportedAt: g._min.createdAt!,
        sampleNames: samples.map((s) => s.name),
      };
    })
  );

  return batches;
}

/**
 * Delete all leads in a specific import batch (undo import).
 */
export async function revertImportBatch(
  batchId: string
): Promise<ActionResult<{ deleted: number }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  const result = await prisma.lead.deleteMany({
    where: { userId: user.id, importBatchId: batchId },
  });

  revalidatePath("/dashboard/pipeline");
  revalidatePath("/dashboard/prospeccao");

  return { success: true, data: { deleted: result.count } };
}

// ══════════════════════════════════════════════════════════════
// ATTENDANT ROLES — SDR / Closer hierarchy
// ══════════════════════════════════════════════════════════════

export async function updateAttendantRole(id: string, role: AttendantRole): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  const valid = ATTENDANT_ROLES.some((r) => r.value === role);
  if (!valid) return { success: false, error: "Papel invalido" };

  await prisma.attendant.updateMany({
    where: { id, userId: user.id },
    data: { role },
  });

  revalidatePath("/dashboard/chat/team");
  return { success: true };
}

export async function updateAttendantActivityGoal(
  id: string,
  dailyActivityGoal: number
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  if (dailyActivityGoal < 0 || dailyActivityGoal > 500) {
    return { success: false, error: "Meta deve estar entre 0 e 500" };
  }

  await prisma.attendant.updateMany({
    where: { id, userId: user.id },
    data: { dailyActivityGoal },
  });

  revalidatePath("/dashboard/chat/team");
  return { success: true };
}

// ══════════════════════════════════════════════════════════════
// HAND-OFF — SDR → Closer
// ══════════════════════════════════════════════════════════════

export async function handoffToCloser(
  leadId: string,
  closerId: string,
  note?: string
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  const closer = await prisma.attendant.findFirst({
    where: { id: closerId, userId: user.id, isActive: true },
  });
  if (!closer) return { success: false, error: "Closer nao encontrado" };

  const updated = await prisma.lead.updateMany({
    where: { id: leadId, userId: user.id },
    data: {
      assignedTo: closerId,
      tags: { push: "sql" }, // Sales Qualified Lead
      notes: note ? `[Passado para ${closer.name}] ${note}` : undefined,
    },
  });

  if (updated.count === 0) return { success: false, error: "Lead nao encontrado" };

  revalidatePath("/dashboard/pipeline");
  return { success: true };
}

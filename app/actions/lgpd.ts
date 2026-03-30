"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import type { ActionResult } from "@/types";

/**
 * LGPD Compliance Module
 *
 * - Data export (all lead data for a specific lead)
 * - Data anonymization
 * - Data deletion
 * - Consent tracking
 */

// ── Export all data for a lead (LGPD: right of access) ───────

export type LeadDataExport = {
  lead: Record<string, unknown>;
  messages: { role: string; content: string; createdAt: string }[];
  stageHistory: { stageName: string; createdAt: string }[];
  pixelEvents: { eventName: string; platform: string; createdAt: string }[];
};

export async function exportLeadData(leadId: string): Promise<ActionResult<LeadDataExport>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId: user.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      stageHistory: { include: { stage: true }, orderBy: { createdAt: "asc" } },
      pixelEvents: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!lead) return { success: false, error: "Lead nao encontrado" };

  return {
    success: true,
    data: {
      lead: {
        nome: lead.name,
        telefone: lead.phone,
        email: lead.email,
        cpf: lead.cpf,
        endereco: lead.address,
        cidade: lead.city,
        notas: lead.notes,
        fonte: lead.source,
        score: lead.score,
        tags: lead.tags,
        criadoEm: lead.createdAt.toISOString(),
      },
      messages: lead.messages.map((m) => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
      stageHistory: lead.stageHistory.map((sh) => ({
        stageName: sh.stage.name,
        createdAt: sh.createdAt.toISOString(),
      })),
      pixelEvents: lead.pixelEvents.map((pe) => ({
        eventName: pe.eventName,
        platform: pe.platform,
        createdAt: pe.createdAt.toISOString(),
      })),
    },
  };
}

// ── Anonymize lead data (LGPD: right to anonymization) ───────

export async function anonymizeLeadData(leadId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  const lead = await prisma.lead.findFirst({ where: { id: leadId, userId: user.id } });
  if (!lead) return { success: false, error: "Lead nao encontrado" };

  await prisma.$transaction([
    prisma.lead.update({
      where: { id: leadId },
      data: {
        name: "Anonimizado",
        phone: `anon_${leadId.slice(0, 8)}`,
        email: null,
        cpf: null,
        address: null,
        city: null,
        notes: null,
        photoUrl: null,
        tags: [],
      },
    }),
    prisma.message.updateMany({
      where: { leadId },
      data: { content: "[conteudo anonimizado]" },
    }),
  ]);

  return { success: true };
}

// ── Delete all lead data (LGPD: right to erasure) ────────────

export async function eraseLeadData(leadId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  const lead = await prisma.lead.findFirst({ where: { id: leadId, userId: user.id } });
  if (!lead) return { success: false, error: "Lead nao encontrado" };

  await prisma.$transaction(async (tx) => {
    await tx.leadStageHistory.deleteMany({ where: { leadId } });
    await tx.pixelEvent.deleteMany({ where: { leadId } });
    await tx.message.deleteMany({ where: { leadId } });
    await tx.lead.delete({ where: { id: leadId } });
  });

  return { success: true };
}

// ── Bulk anonymize old leads (for data hygiene) ──────────────

export async function anonymizeOldLeads(olderThanDays: number = 365): Promise<ActionResult<{ count: number }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

  const leads = await prisma.lead.findMany({
    where: {
      userId: user.id,
      lastInteractionAt: { lt: cutoff },
      name: { not: "Anonimizado" },
    },
    select: { id: true },
  });

  for (const lead of leads) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        name: "Anonimizado",
        phone: `anon_${lead.id.slice(0, 8)}`,
        email: null,
        cpf: null,
        address: null,
        city: null,
        notes: null,
        photoUrl: null,
      },
    });
  }

  return { success: true, data: { count: leads.length } };
}

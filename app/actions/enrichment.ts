"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import { enrichLead, applyEnrichmentToLead } from "@/services/enrichmentService";
import { logLeadActivity } from "@/services/leadActivity";
import type { ActionResult } from "@/types";

export type EnrichmentSettings = {
  provider: "none" | "apollo" | "hunter";
  apolloApiKey: string;
  hunterApiKey: string;
};

export async function getEnrichmentSettings(): Promise<EnrichmentSettings> {
  const user = await getCurrentUser();
  if (!user) return { provider: "none", apolloApiKey: "", hunterApiKey: "" };

  const cfg = await prisma.aIConfig.findUnique({
    where: { userId: user.id },
    select: { enrichmentProvider: true, apolloApiKey: true, hunterApiKey: true },
  });

  return {
    provider: (cfg?.enrichmentProvider as EnrichmentSettings["provider"]) ?? "none",
    apolloApiKey: maskKey(cfg?.apolloApiKey ?? ""),
    hunterApiKey: maskKey(cfg?.hunterApiKey ?? ""),
  };
}

function maskKey(k: string): string {
  if (!k) return "";
  if (k.length <= 8) return "••••••••";
  return k.slice(0, 4) + "•".repeat(Math.max(0, k.length - 8)) + k.slice(-4);
}

export async function saveEnrichmentSettings(
  data: EnrichmentSettings
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  const isMasked = (v: string) => v.includes("•");

  try {
    await prisma.aIConfig.upsert({
      where: { userId: user.id },
      update: {
        enrichmentProvider: data.provider,
        ...(isMasked(data.apolloApiKey) ? {} : { apolloApiKey: data.apolloApiKey || null }),
        ...(isMasked(data.hunterApiKey) ? {} : { hunterApiKey: data.hunterApiKey || null }),
      },
      create: {
        userId: user.id,
        enrichmentProvider: data.provider,
        apolloApiKey: isMasked(data.apolloApiKey) ? null : (data.apolloApiKey || null),
        hunterApiKey: isMasked(data.hunterApiKey) ? null : (data.hunterApiKey || null),
      },
    });
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao salvar" };
  }
}

export async function enrichLeadAction(
  leadId: string
): Promise<ActionResult<{ updated: string[]; provider: string }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId: user.id },
    select: { id: true, name: true, email: true, company: true },
  });
  if (!lead) return { success: false, error: "Lead nao encontrado" };

  const result = await enrichLead(user.id, lead);
  if (!result.ok) return { success: false, error: result.error || "Falha no enriquecimento" };

  const { updated } = await applyEnrichmentToLead(leadId, user.id, result);

  await logLeadActivity({
    leadId,
    userId: user.id,
    type: "enrichment",
    summary:
      updated.length > 0
        ? `Enriquecido via ${result.provider}: ${updated.join(", ")}`
        : `Consultado ${result.provider} — sem novos dados`,
    metadata: { provider: result.provider, confidence: result.confidence, updated },
  });

  revalidatePath("/dashboard/pipeline");
  return { success: true, data: { updated, provider: result.provider } };
}

export async function enrichLeadsBulk(
  leadIds: string[]
): Promise<ActionResult<{ enriched: number; skipped: number }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  if (!leadIds.length) return { success: false, error: "Sem leads selecionados" };
  if (leadIds.length > 50)
    return { success: false, error: "Máximo 50 por vez (evita exceder cotas)" };

  let enriched = 0;
  let skipped = 0;

  const leads = await prisma.lead.findMany({
    where: { id: { in: leadIds }, userId: user.id },
    select: { id: true, name: true, email: true, company: true },
  });

  for (const lead of leads) {
    const result = await enrichLead(user.id, lead);
    if (result.ok) {
      const { updated } = await applyEnrichmentToLead(lead.id, user.id, result);
      if (updated.length) enriched++;
      else skipped++;
      await logLeadActivity({
        leadId: lead.id,
        userId: user.id,
        type: "enrichment",
        summary:
          updated.length > 0
            ? `Enriquecido via ${result.provider}: ${updated.join(", ")}`
            : `Consultado ${result.provider} — sem novos dados`,
        metadata: { provider: result.provider, updated },
      });
    } else {
      skipped++;
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  revalidatePath("/dashboard/pipeline");
  return { success: true, data: { enriched, skipped } };
}

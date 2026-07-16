import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// ── Roteamento de leads para vendedores ───────────────────────
// Fonte única do round-robin "fewest-leads": usada pelo handoff humano
// (webhookProcessor), pelo chatbot flow (action handoff) e disponível para
// o workflow engine. Mesma heurística de workflowEngine.ts:assign_attendant.

// Papéis elegíveis para receber leads automaticamente.
const AUTO_ASSIGN_ROLES = ["seller", "sdr", "closer", "attendant", "cs"];

/**
 * Atribui o lead ao atendente ativo com MENOS leads atribuídos.
 * Não sobrescreve atribuição existente (a menos que force=true).
 * Retorna o atendente escolhido ou null (sem atendentes / já atribuído).
 */
export async function autoAssignLead(
  userId: string,
  leadId: string,
  opts: { force?: boolean } = {}
): Promise<{ id: string; name: string } | null> {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId },
    select: { assignedTo: true },
  });
  if (!lead) return null;

  if (lead.assignedTo && !opts.force) {
    const current = await prisma.attendant.findFirst({
      where: { id: lead.assignedTo, userId },
      select: { id: true, name: true },
    });
    if (current) return current; // já tem dono — mantém
  }

  const attendants = await prisma.attendant.findMany({
    where: { userId, isActive: true, role: { in: AUTO_ASSIGN_ROLES } },
    select: { id: true, name: true },
  });
  if (attendants.length === 0) return null;

  const counts = await Promise.all(
    attendants.map(async (a) => ({
      ...a,
      count: await prisma.lead.count({ where: { userId, assignedTo: a.id } }),
    }))
  );
  counts.sort((a, b) => a.count - b.count);
  const selected = counts[0];

  await prisma.lead.updateMany({
    where: { id: leadId, userId },
    data: { assignedTo: selected.id },
  });

  logger.info("lead_auto_assigned", { leadId, attendantId: selected.id });
  return { id: selected.id, name: selected.name };
}

/**
 * Handoff humano completo: pausa a IA para o lead, atribui um vendedor
 * (round-robin) e notifica o dono. Usado quando o lead pede atendente —
 * seja detectado por keyword, pela IA (marcador HANDOFF) ou por fluxo.
 */
export async function executeHumanHandoff(
  userId: string,
  leadId: string,
  source: "keyword" | "ai" | "flow"
): Promise<{ attendantName: string | null }> {
  // Pausa longa (24h) — handoff explícito não deve expirar no meio do dia.
  const pauseUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.lead.updateMany({
    where: { id: leadId, userId },
    data: { humanPausedUntil: pauseUntil },
  });

  const attendant = await autoAssignLead(userId, leadId);

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId },
    select: { name: true },
  });

  await prisma.notification
    .create({
      data: {
        userId,
        type: "lead_replied",
        title: "Lead pediu atendimento humano",
        message: attendant
          ? `${lead?.name ?? "Lead"} pediu para falar com um atendente e foi atribuido a ${attendant.name}.`
          : `${lead?.name ?? "Lead"} pediu para falar com um atendente. Nenhum vendedor ativo para atribuir.`,
        entityId: leadId,
        entityType: "lead",
        actionUrl: `/dashboard/chat?leadId=${leadId}`,
      },
    })
    .catch(() => {});

  logger.info("human_handoff_executed", {
    leadId,
    source,
    attendantId: attendant?.id ?? null,
  });

  return { attendantName: attendant?.name ?? null };
}

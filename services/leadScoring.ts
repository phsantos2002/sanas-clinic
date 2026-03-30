import { prisma } from "@/lib/prisma";

/**
 * Lead Scoring Engine — calculates a 0-100 score based on:
 * - Stage progression (+15 per stage after first)
 * - Message count (+2 per message, max 20)
 * - Recency of last interaction (+20 if today, +10 if this week, +5 if this month)
 * - Has email (+5)
 * - Source quality (meta cpc = +10, google = +8, whatsapp = +5)
 * - AI enabled (+3)
 */

type ScoringLead = {
  id: string;
  stageId: string | null;
  email: string | null;
  source: string | null;
  medium: string | null;
  aiEnabled: boolean;
  lastInteractionAt: Date | null;
  createdAt: Date;
  _count: { messages: number; stageHistory: number };
};

function calculateScore(lead: ScoringLead): { score: number; label: string } {
  let score = 0;

  // Stage progression: +15 per stage after first (max 60)
  const stageCount = lead._count.stageHistory;
  score += Math.min(stageCount * 15, 60);

  // Messages: +2 per message (max 20)
  score += Math.min(lead._count.messages * 2, 20);

  // Recency
  const lastInteraction = lead.lastInteractionAt || lead.createdAt;
  const daysSince = Math.floor((Date.now() - lastInteraction.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSince === 0) score += 20;
  else if (daysSince <= 7) score += 10;
  else if (daysSince <= 30) score += 5;
  // >30 days = 0 bonus (cold lead)

  // Has email
  if (lead.email) score += 5;

  // Source quality
  if (lead.source === "meta" && lead.medium === "cpc") score += 10;
  else if (lead.source === "google") score += 8;
  else if (lead.source === "whatsapp") score += 5;
  else if (lead.source === "manual") score += 3;

  // AI enabled
  if (lead.aiEnabled) score += 3;

  // Cap at 100
  score = Math.min(score, 100);

  // Label
  let label: string;
  if (score >= 80) label = "vip";
  else if (score >= 50) label = "quente";
  else if (score >= 25) label = "morno";
  else label = "frio";

  return { score, label };
}

/**
 * Recalculate scores for all leads of a user
 */
export async function recalculateScores(userId: string): Promise<number> {
  const leads = await prisma.lead.findMany({
    where: { userId },
    select: {
      id: true,
      stageId: true,
      email: true,
      source: true,
      medium: true,
      aiEnabled: true,
      lastInteractionAt: true,
      createdAt: true,
      _count: { select: { messages: true, stageHistory: true } },
    },
  });

  let updated = 0;
  for (const lead of leads) {
    const { score, label } = calculateScore(lead);

    // Only update if score changed
    await prisma.lead.update({
      where: { id: lead.id },
      data: { score, scoreLabel: label },
    });
    updated++;
  }

  return updated;
}

/**
 * Recalculate score for a single lead
 */
export async function recalculateLeadScore(leadId: string): Promise<{ score: number; label: string }> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      stageId: true,
      email: true,
      source: true,
      medium: true,
      aiEnabled: true,
      lastInteractionAt: true,
      createdAt: true,
      _count: { select: { messages: true, stageHistory: true } },
    },
  });

  if (!lead) return { score: 0, label: "frio" };

  const { score, label } = calculateScore(lead);

  await prisma.lead.update({
    where: { id: leadId },
    data: { score, scoreLabel: label },
  });

  return { score, label };
}

/**
 * Find leads that haven't interacted in X days for reactivation
 */
export async function findLeadsForReactivation(
  userId: string,
  inactiveDays: number = 7
): Promise<{ id: string; name: string; phone: string; daysSinceInteraction: number }[]> {
  const cutoff = new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000);

  const leads = await prisma.lead.findMany({
    where: {
      userId,
      aiEnabled: true,
      lastInteractionAt: { lt: cutoff },
      // Don't send reactivation if already sent recently
      OR: [
        { reactivationSentAt: null },
        { reactivationSentAt: { lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } },
      ],
      // Only leads that aren't in the final stage (clients)
      stage: { eventName: { not: "Purchase" } },
    },
    select: {
      id: true,
      name: true,
      phone: true,
      lastInteractionAt: true,
    },
    take: 20,
    orderBy: { score: "desc" }, // Prioritize high-score leads
  });

  return leads.map((l) => ({
    id: l.id,
    name: l.name,
    phone: l.phone,
    daysSinceInteraction: Math.floor(
      (Date.now() - (l.lastInteractionAt?.getTime() || Date.now())) / (1000 * 60 * 60 * 24)
    ),
  }));
}

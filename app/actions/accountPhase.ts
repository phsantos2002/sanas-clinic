"use server";

import { prisma } from "@/lib/prisma";

export type AccountPhaseResult = {
  phase: "LEARNING" | "STABILIZING" | "SCALING" | "MATURE";
  reason: string;
  recommendation: string;
  suggestedBidStrategy: "LOWEST_COST" | "COST_CAP" | "BID_CAP" | "ROAS_MIN";
  suggestedEvent: string;
};

export async function diagnoseAccountPhase(
  userId: string,
  conversionDestination?: string | null
): Promise<AccountPhaseResult> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Count pixel events in last 30 days by type
  const pixelEvents = await prisma.pixelEvent.groupBy({
    by: ["eventName"],
    where: {
      lead: { userId },
      platform: "facebook",
      createdAt: { gte: thirtyDaysAgo },
    },
    _count: { id: true },
  });

  const eventCounts: Record<string, number> = {};
  let totalConversions = 0;
  for (const pe of pixelEvents) {
    eventCounts[pe.eventName] = pe._count.id;
    if (["Purchase", "Lead", "QualifiedLead", "Schedule", "Contact"].includes(pe.eventName)) {
      totalConversions += pe._count.id;
    }
  }

  // Count meta leads in last 30 days
  const metaLeads = await prisma.lead.count({
    where: {
      userId,
      source: "meta",
      createdAt: { gte: thirtyDaysAgo },
    },
  });

  // Check for 3+ months of history (mature check)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const oldEvents = await prisma.pixelEvent.count({
    where: {
      lead: { userId },
      platform: "facebook",
      createdAt: { gte: ninetyDaysAgo, lt: thirtyDaysAgo },
    },
  });
  const hasLongHistory = oldEvents > 50;

  // Calculate conversion rate (leads that became clients)
  const totalLeads = await prisma.lead.count({
    where: { userId, source: "meta", createdAt: { gte: thirtyDaysAgo } },
  });
  const clientLeads = await prisma.lead.count({
    where: {
      userId,
      source: "meta",
      createdAt: { gte: thirtyDaysAgo },
      stage: { eventName: "Purchase" },
    },
  });
  const conversionRate = totalLeads > 0 ? (clientLeads / totalLeads) * 100 : 0;

  const dest = conversionDestination ?? "WHATSAPP";

  // MATURE: 3+ months consistent history + Purchase events
  if (hasLongHistory && (eventCounts["Purchase"] ?? 0) >= 10 && totalConversions > 150) {
    return {
      phase: "MATURE",
      reason: `Conta madura com ${totalConversions} conversões/mês e histórico de 3+ meses. ${eventCounts["Purchase"] ?? 0} vendas registradas.`,
      recommendation:
        "Sua conta já está consolidada. Use estratégias avançadas como ROAS mínimo ou Bid Cap agressivo para maximizar retorno.",
      suggestedBidStrategy: "ROAS_MIN",
      suggestedEvent: dest === "WHATSAPP" ? "Purchase" : "Purchase",
    };
  }

  // SCALING: 150+ events OR 40+ leads with good conversion
  if (totalConversions >= 150 || (metaLeads >= 40 && conversionRate > 15)) {
    return {
      phase: "SCALING",
      reason: `${totalConversions} conversões e ${metaLeads} leads Meta no mês. Taxa de conversão: ${conversionRate.toFixed(1)}%.`,
      recommendation:
        "Conta pronta para escalar. Defina um custo por resultado alvo e use Bid Cap para controlar gastos enquanto aumenta orçamento.",
      suggestedBidStrategy: "BID_CAP",
      suggestedEvent: getSuggestedEvent("SCALING", dest),
    };
  }

  // STABILIZING: 50-150 events OR 10-40 leads
  if (totalConversions >= 50 || (metaLeads >= 10 && metaLeads < 40)) {
    return {
      phase: "STABILIZING",
      reason: `${totalConversions} conversões e ${metaLeads} leads Meta no mês. Conta saindo da fase de aprendizado.`,
      recommendation:
        "A Meta está aprendendo sobre seu público. Use Cost Cap para controlar custos sem restringir demais a entrega.",
      suggestedBidStrategy: "COST_CAP",
      suggestedEvent: getSuggestedEvent("STABILIZING", dest),
    };
  }

  // LEARNING: default
  return {
    phase: "LEARNING",
    reason: `${totalConversions} conversões e ${metaLeads} leads Meta no mês. A conta precisa de mais dados para otimizar.`,
    recommendation:
      "Foque em gerar volume. Use Menor Custo sem limite e otimize para eventos de topo de funil para acelerar o aprendizado.",
    suggestedBidStrategy: "LOWEST_COST",
    suggestedEvent: getSuggestedEvent("LEARNING", dest),
  };
}

function getSuggestedEvent(phase: string, destination: string): string {
  if (phase === "LEARNING") {
    if (destination === "WHATSAPP") return "MESSAGING_CONVERSATION_STARTED_7D";
    if (destination === "WEBSITE") return "LANDING_PAGE_VIEWS";
    if (destination === "INSTAGRAM") return "POST_ENGAGEMENT";
    return "LINK_CLICKS";
  }
  if (phase === "STABILIZING") {
    if (destination === "WHATSAPP") return "Lead";
    if (destination === "WEBSITE") return "Lead";
    return "Contact";
  }
  // SCALING / MATURE
  if (destination === "WHATSAPP") return "QualifiedLead";
  if (destination === "WEBSITE") return "Purchase";
  return "Purchase";
}

export async function saveAccountPhase(
  userId: string,
  phase: string,
  bidStrategy: string
): Promise<void> {
  await prisma.pixel.updateMany({
    where: { userId },
    data: {
      accountPhase: phase,
      bidStrategy,
    },
  });
}

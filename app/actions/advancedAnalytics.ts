"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";

// ══════════════════════════════════════════════════════════════
// FUNNEL IN REAL-TIME (with avg time between stages)
// ══════════════════════════════════════════════════════════════

export type FunnelStep = {
  stageName: string;
  eventName: string;
  count: number;
  percentage: number;
  avgDaysFromPrevious: number | null;
  dropoffRate: number;
};

export async function getAdvancedFunnel(): Promise<FunnelStep[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const stages = await prisma.stage.findMany({
    where: { userId: user.id },
    orderBy: { order: "asc" },
  });

  const allHistory = await prisma.leadStageHistory.findMany({
    where: { stage: { userId: user.id } },
    include: { stage: true },
    orderBy: { createdAt: "asc" },
  });

  // Group history by lead
  const byLead = new Map<string, { stageId: string; createdAt: Date }[]>();
  for (const h of allHistory) {
    const list = byLead.get(h.leadId) || [];
    list.push({ stageId: h.stageId, createdAt: h.createdAt });
    byLead.set(h.leadId, list);
  }

  const totalLeads = await prisma.lead.count({ where: { userId: user.id } });
  const funnel: FunnelStep[] = [];

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];

    // Count leads that reached this stage
    const count = allHistory.filter((h) => h.stageId === stage.id).length;

    // Avg time from previous stage
    let avgDays: number | null = null;
    if (i > 0) {
      const prevStage = stages[i - 1];
      const durations: number[] = [];

      for (const [, history] of byLead) {
        const prevEntry = history.find((h) => h.stageId === prevStage.id);
        const currEntry = history.find((h) => h.stageId === stage.id);
        if (prevEntry && currEntry) {
          const diff =
            (currEntry.createdAt.getTime() - prevEntry.createdAt.getTime()) / (1000 * 60 * 60 * 24);
          if (diff >= 0) durations.push(diff);
        }
      }

      if (durations.length > 0) {
        avgDays = Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10;
      }
    }

    const prevCount = i > 0 ? funnel[i - 1].count : totalLeads;
    const dropoff = prevCount > 0 ? Math.round(((prevCount - count) / prevCount) * 100) : 0;

    funnel.push({
      stageName: stage.name,
      eventName: stage.eventName,
      count,
      percentage: totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0,
      avgDaysFromPrevious: avgDays,
      dropoffRate: dropoff,
    });
  }

  return funnel;
}

// ══════════════════════════════════════════════════════════════
// LTV (Lifetime Value) by source/cohort
// ══════════════════════════════════════════════════════════════

export type LTVData = {
  source: string;
  totalLeads: number;
  clients: number;
  conversionRate: number;
  estimatedLTV: number; // based on conversionValue from Pixel config
};

export async function getLTVBySource(): Promise<LTVData[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const pixel = await prisma.pixel.findUnique({
    where: { userId: user.id },
    select: { conversionValue: true },
  });
  const conversionValue = pixel?.conversionValue || 500; // Default R$500

  const leads = await prisma.lead.findMany({
    where: { userId: user.id },
    select: { source: true, stageId: true },
  });

  const stages = await prisma.stage.findMany({
    where: { userId: user.id, eventName: "Purchase" },
    select: { id: true },
  });
  const clientStageIds = new Set(stages.map((s) => s.id));

  const bySource = new Map<string, { total: number; clients: number }>();

  for (const lead of leads) {
    const src = lead.source || "desconhecido";
    const entry = bySource.get(src) || { total: 0, clients: 0 };
    entry.total++;
    if (lead.stageId && clientStageIds.has(lead.stageId)) entry.clients++;
    bySource.set(src, entry);
  }

  return Array.from(bySource.entries())
    .map(([source, data]) => ({
      source,
      totalLeads: data.total,
      clients: data.clients,
      conversionRate: data.total > 0 ? Math.round((data.clients / data.total) * 100) : 0,
      estimatedLTV: data.clients * conversionValue,
    }))
    .sort((a, b) => b.estimatedLTV - a.estimatedLTV);
}

// ══════════════════════════════════════════════════════════════
// CAC (Cost per Acquisition) by channel
// ══════════════════════════════════════════════════════════════

export type CACData = {
  channel: string;
  spend: number;
  leads: number;
  clients: number;
  costPerLead: number;
  costPerClient: number;
  roas: number;
};

export async function getCACByChannel(): Promise<CACData[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const pixel = await prisma.pixel.findUnique({
    where: { userId: user.id },
    select: { adAccountId: true, metaAdsToken: true, conversionValue: true },
  });

  const conversionValue = pixel?.conversionValue || 500;

  // Get Meta spend data
  let metaSpend = 0;
  if (pixel?.adAccountId && pixel?.metaAdsToken) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v18.0/act_${pixel.adAccountId}/insights?fields=spend&date_preset=last_30d&access_token=${pixel.metaAdsToken}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      metaSpend = parseFloat(data.data?.[0]?.spend || "0");
    } catch {
      /* non-critical */
    }
  }

  const leads = await prisma.lead.findMany({
    where: { userId: user.id },
    select: { source: true, stageId: true },
  });

  const stages = await prisma.stage.findMany({
    where: { userId: user.id, eventName: "Purchase" },
    select: { id: true },
  });
  const clientStageIds = new Set(stages.map((s) => s.id));

  const channels: Record<string, { leads: number; clients: number; spend: number }> = {
    meta: { leads: 0, clients: 0, spend: metaSpend },
    google: { leads: 0, clients: 0, spend: 0 },
    whatsapp: { leads: 0, clients: 0, spend: 0 },
    manual: { leads: 0, clients: 0, spend: 0 },
  };

  for (const lead of leads) {
    const ch = lead.source && channels[lead.source] ? lead.source : "manual";
    channels[ch].leads++;
    if (lead.stageId && clientStageIds.has(lead.stageId)) channels[ch].clients++;
  }

  return Object.entries(channels)
    .filter(([, data]) => data.leads > 0)
    .map(([channel, data]) => {
      const revenue = data.clients * conversionValue;
      return {
        channel,
        spend: data.spend,
        leads: data.leads,
        clients: data.clients,
        costPerLead:
          data.leads > 0 && data.spend > 0 ? Math.round((data.spend / data.leads) * 100) / 100 : 0,
        costPerClient:
          data.clients > 0 && data.spend > 0
            ? Math.round((data.spend / data.clients) * 100) / 100
            : 0,
        roas: data.spend > 0 ? Math.round((revenue / data.spend) * 100) / 100 : 0,
      };
    })
    .sort((a, b) => b.roas - a.roas);
}

// ══════════════════════════════════════════════════════════════
// COHORT ANALYSIS (retention by month of entry)
// ══════════════════════════════════════════════════════════════

export type CohortRow = {
  cohort: string; // "2026-01"
  totalLeads: number;
  retained: Record<string, number>; // { "month_1": 5, "month_2": 3, ... }
  retainedPct: Record<string, number>; // { "month_1": 50, "month_2": 30, ... }
};

export async function getCohortAnalysis(): Promise<CohortRow[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const leads = await prisma.lead.findMany({
    where: { userId: user.id },
    select: { id: true, createdAt: true, lastInteractionAt: true },
    orderBy: { createdAt: "asc" },
  });

  // Group leads by creation month
  const cohorts = new Map<
    string,
    { id: string; createdAt: Date; lastInteraction: Date | null }[]
  >();

  for (const lead of leads) {
    const key = lead.createdAt.toISOString().slice(0, 7); // "2026-01"
    const list = cohorts.get(key) || [];
    list.push({ id: lead.id, createdAt: lead.createdAt, lastInteraction: lead.lastInteractionAt });
    cohorts.set(key, list);
  }

  const now = new Date();
  const rows: CohortRow[] = [];

  for (const [cohort, members] of cohorts) {
    const cohortDate = new Date(cohort + "-01");
    const totalLeads = members.length;
    const retained: Record<string, number> = {};
    const retainedPct: Record<string, number> = {};

    // For each subsequent month, count how many had interaction
    for (let m = 1; m <= 6; m++) {
      const monthStart = new Date(cohortDate);
      monthStart.setMonth(monthStart.getMonth() + m);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);

      if (monthStart > now) break;

      const active = members.filter((l) => {
        if (!l.lastInteraction) return false;
        return l.lastInteraction >= monthStart && l.lastInteraction < monthEnd;
      }).length;

      retained[`month_${m}`] = active;
      retainedPct[`month_${m}`] = totalLeads > 0 ? Math.round((active / totalLeads) * 100) : 0;
    }

    rows.push({ cohort, totalLeads, retained, retainedPct });
  }

  return rows.slice(-6); // Last 6 cohorts
}

// ══════════════════════════════════════════════════════════════
// SCORE DISTRIBUTION
// ══════════════════════════════════════════════════════════════

export type ScoreDistribution = {
  frio: number;
  morno: number;
  quente: number;
  vip: number;
  avgScore: number;
};

export async function getScoreDistribution(): Promise<ScoreDistribution> {
  const user = await getCurrentUser();
  if (!user) return { frio: 0, morno: 0, quente: 0, vip: 0, avgScore: 0 };

  const groups = await prisma.lead.groupBy({
    by: ["scoreLabel"],
    where: { userId: user.id },
    _count: { id: true },
  });

  const avg = await prisma.lead.aggregate({
    where: { userId: user.id },
    _avg: { score: true },
  });

  const dist: ScoreDistribution = {
    frio: 0,
    morno: 0,
    quente: 0,
    vip: 0,
    avgScore: Math.round(avg._avg.score || 0),
  };
  for (const g of groups) {
    if (g.scoreLabel === "frio") dist.frio = g._count.id;
    else if (g.scoreLabel === "morno") dist.morno = g._count.id;
    else if (g.scoreLabel === "quente") dist.quente = g._count.id;
    else if (g.scoreLabel === "vip") dist.vip = g._count.id;
    else dist.frio += g._count.id; // null scoreLabel = frio
  }

  return dist;
}

// ══════════════════════════════════════════════════════════════
// AI USAGE & COST REPORT
// ══════════════════════════════════════════════════════════════

export type AIUsageReport = {
  totalOperations: number;
  totalCostUsd: number;
  byOperation: { operation: string; count: number; costUsd: number }[];
  byProvider: { provider: string; count: number; costUsd: number }[];
  dailyCost: { date: string; costUsd: number }[];
};

export async function getAIUsageReport(days: number = 30): Promise<AIUsageReport> {
  const user = await getCurrentUser();
  if (!user)
    return { totalOperations: 0, totalCostUsd: 0, byOperation: [], byProvider: [], dailyCost: [] };

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const logs = await prisma.aiUsageLog.findMany({
    where: { userId: user.id, createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
  });

  const byOp = new Map<string, { count: number; cost: number }>();
  const byProv = new Map<string, { count: number; cost: number }>();
  const byDay = new Map<string, number>();

  for (const log of logs) {
    const cost = log.costUsd || 0;

    // By operation
    const op = byOp.get(log.operation) || { count: 0, cost: 0 };
    op.count++;
    op.cost += cost;
    byOp.set(log.operation, op);

    // By provider
    const prov = byProv.get(log.provider) || { count: 0, cost: 0 };
    prov.count++;
    prov.cost += cost;
    byProv.set(log.provider, prov);

    // By day
    const day = log.createdAt.toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) || 0) + cost);
  }

  return {
    totalOperations: logs.length,
    totalCostUsd: logs.reduce((sum, l) => sum + (l.costUsd || 0), 0),
    byOperation: Array.from(byOp.entries()).map(([operation, data]) => ({
      operation,
      count: data.count,
      costUsd: Math.round(data.cost * 10000) / 10000,
    })),
    byProvider: Array.from(byProv.entries()).map(([provider, data]) => ({
      provider,
      count: data.count,
      costUsd: Math.round(data.cost * 10000) / 10000,
    })),
    dailyCost: Array.from(byDay.entries()).map(([date, cost]) => ({
      date,
      costUsd: Math.round(cost * 10000) / 10000,
    })),
  };
}

// ══════════════════════════════════════════════════════════════
// EXPORT DATA (CSV format)
// ══════════════════════════════════════════════════════════════

export async function exportLeadsCSV(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) return "";

  const leads = await prisma.lead.findMany({
    where: { userId: user.id },
    include: { stage: true },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "Nome",
    "Telefone",
    "Email",
    "Estagio",
    "Score",
    "Tags",
    "Fonte",
    "Campanha",
    "IA Ativa",
    "Ultima Interacao",
    "Criado em",
  ];

  const rows = leads.map((l) => [
    l.name,
    l.phone,
    l.email || "",
    l.stage?.name || "",
    String(l.score),
    l.tags.join("; "),
    l.source || "",
    l.campaign || "",
    l.aiEnabled ? "Sim" : "Nao",
    l.lastInteractionAt?.toISOString() || "",
    l.createdAt.toISOString(),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  return csvContent;
}

export async function exportAnalyticsJSON(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) return "{}";

  const [funnel, ltv, cac, cohort, scores, aiUsage] = await Promise.all([
    getAdvancedFunnel(),
    getLTVBySource(),
    getCACByChannel(),
    getCohortAnalysis(),
    getScoreDistribution(),
    getAIUsageReport(),
  ]);

  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      funnel,
      ltvBySource: ltv,
      cacByChannel: cac,
      cohortAnalysis: cohort,
      scoreDistribution: scores,
      aiUsage,
    },
    null,
    2
  );
}

// ── Analytics Narrative (4.5) ───────────────────────────────

export async function getAnalyticsNarrative(_force = false) {
  const user = await getCurrentUser();
  if (!user) return null;

  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 86400000);
  const weekAgo = new Date(now.getTime() - 7 * 86400000);

  const [totalLeads, weekLeads, convertedLeads, avgScore, publishedPosts, stages] =
    await Promise.all([
      prisma.lead.count({ where: { userId: user.id, createdAt: { gte: monthAgo } } }),
      prisma.lead.count({ where: { userId: user.id, createdAt: { gte: weekAgo } } }),
      prisma.lead.count({
        where: { userId: user.id, stage: { eventName: "Purchase" }, createdAt: { gte: monthAgo } },
      }),
      prisma.lead.aggregate({ where: { userId: user.id }, _avg: { score: true } }),
      prisma.socialPost.count({
        where: { userId: user.id, status: "published", publishedAt: { gte: monthAgo } },
      }),
      prisma.stage.findMany({
        where: { userId: user.id },
        include: { _count: { select: { leads: true } } },
        orderBy: { order: "asc" },
      }),
    ]);

  const parts: string[] = [];

  const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : "0";
  parts.push(
    `No ultimo mes, voce recebeu ${totalLeads} leads (${weekLeads} esta semana) com taxa de conversao de ${conversionRate}%.`
  );

  const avgScoreVal = Math.round(avgScore._avg.score || 0);
  parts.push(`Score medio dos seus leads: ${avgScoreVal}/100.`);

  // Find bottleneck
  if (stages.length >= 2) {
    let maxDrop = 0;
    let bottleneckFrom = "";
    let bottleneckTo = "";
    for (let i = 0; i < stages.length - 1; i++) {
      const drop = stages[i]._count.leads - stages[i + 1]._count.leads;
      if (drop > maxDrop) {
        maxDrop = drop;
        bottleneckFrom = stages[i].name;
        bottleneckTo = stages[i + 1].name;
      }
    }
    if (maxDrop > 0) {
      parts.push(
        `Maior gargalo do pipeline: de "${bottleneckFrom}" para "${bottleneckTo}" com queda de ${maxDrop} leads.`
      );
    }
  }

  if (publishedPosts > 0) {
    parts.push(`${publishedPosts} posts publicados no periodo.`);
  }

  return {
    text: parts.join(" "),
    generatedAt: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

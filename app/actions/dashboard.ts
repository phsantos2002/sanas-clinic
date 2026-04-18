"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";

export type DashboardAlert = {
  id: string;
  type: "urgent" | "warning" | "positive";
  title: string;
  description: string;
  action?: { label: string; href: string };
};

export type DashboardKPI = {
  leadsToday: number;
  scheduledToday: number;
  clientsThisMonth: number;
  activeChats: number;
  avgScore: number;
  publishedPostsWeek: number;
  draftPosts: number;
  hotLeads: number;
};

export type AgendaItem = {
  time: string;
  title: string;
  type: "post" | "lead" | "broadcast" | "task";
  status: "done" | "upcoming" | "pending";
};

export async function getDashboardIntelligence(): Promise<{
  alerts: DashboardAlert[];
  kpis: DashboardKPI;
  agenda: AgendaItem[];
} | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Parallel data fetch
  const [
    leadsToday, hotLeads, stuckLeads, unansweredLeads,
    clientsMonth, avgScore, publishedWeek, draftPosts,
    scheduledToday, activeChats,
  ] = await Promise.all([
    prisma.lead.count({ where: { userId: user.id, createdAt: { gte: todayStart } } }),
    prisma.lead.count({ where: { userId: user.id, score: { gte: 50 } } }),
    prisma.lead.count({
      where: { userId: user.id, lastInteractionAt: { lt: new Date(now.getTime() - 5 * 86400000) }, stage: { eventName: { not: "Purchase" } } },
    }),
    prisma.lead.count({
      where: { userId: user.id, lastInteractionAt: { lt: new Date(now.getTime() - 6 * 3600000) }, stage: { eventName: { not: "Purchase" } } },
    }),
    prisma.lead.count({ where: { userId: user.id, stage: { eventName: "Purchase" }, createdAt: { gte: monthStart } } }),
    prisma.lead.aggregate({ where: { userId: user.id }, _avg: { score: true } }),
    prisma.socialPost.count({ where: { userId: user.id, status: "published", publishedAt: { gte: weekAgo } } }),
    prisma.socialPost.count({ where: { userId: user.id, status: "draft" } }),
    prisma.socialPost.count({
      where: { userId: user.id, status: "scheduled", scheduledAt: { gte: todayStart, lt: new Date(todayStart.getTime() + 86400000) } },
    }),
    prisma.lead.count({
      where: { userId: user.id, lastInteractionAt: { gte: new Date(now.getTime() - 24 * 3600000) } },
    }),
  ]);

  // Generate alerts
  const alerts: DashboardAlert[] = [];

  if (unansweredLeads > 0) {
    alerts.push({
      id: "unanswered",
      type: unansweredLeads >= 3 ? "urgent" : "warning",
      title: `${unansweredLeads} lead${unansweredLeads > 1 ? "s" : ""} sem resposta ha 6h+`,
      description: "Leads esperando atendimento podem esfriar rapidamente",
      action: { label: "Ver leads", href: "/dashboard/pipeline" },
    });
  }

  if (stuckLeads > 5) {
    alerts.push({
      id: "stuck",
      type: "warning",
      title: `${stuckLeads} leads parados ha 5+ dias`,
      description: "Considere enviar broadcast de reativacao ou mover de estagio",
      action: { label: "Reativar", href: "/dashboard/chat/broadcast" },
    });
  }

  if (leadsToday > 0) {
    const yesterdayLeads = await prisma.lead.count({
      where: { userId: user.id, createdAt: { gte: new Date(todayStart.getTime() - 86400000), lt: todayStart } },
    });
    if (leadsToday > yesterdayLeads * 1.5 && yesterdayLeads > 0) {
      alerts.push({
        id: "leads-up",
        type: "positive",
        title: `${leadsToday} leads hoje — ${Math.round(((leadsToday - yesterdayLeads) / yesterdayLeads) * 100)}% acima de ontem`,
        description: "Dia forte! Garanta atendimento rapido para converter",
      });
    }
  }

  if (draftPosts > 3) {
    alerts.push({
      id: "drafts",
      type: "warning",
      title: `${draftPosts} rascunhos de post pendentes`,
      description: "Revise e agende os posts rascunhados pela IA",
      action: { label: "Ver rascunhos", href: "/dashboard/social/posts" },
    });
  }

  if (hotLeads > 0) {
    alerts.push({
      id: "hot-leads",
      type: "positive",
      title: `${hotLeads} leads quentes no pipeline`,
      description: "Leads com score alto — priorize o atendimento",
      action: { label: "Ver quentes", href: "/dashboard/pipeline" },
    });
  }

  // Build agenda
  const agenda: AgendaItem[] = [];

  const todayPosts = await prisma.socialPost.findMany({
    where: {
      userId: user.id,
      scheduledAt: { gte: todayStart, lt: new Date(todayStart.getTime() + 86400000) },
    },
    select: { title: true, scheduledAt: true, status: true },
    orderBy: { scheduledAt: "asc" },
  });

  for (const post of todayPosts) {
    agenda.push({
      time: post.scheduledAt?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) || "",
      title: `Post: ${post.title || "Sem titulo"}`,
      type: "post",
      status: post.status === "published" ? "done" : "upcoming",
    });
  }

  // Today's new leads
  if (leadsToday > 0) {
    agenda.push({
      time: "Hoje",
      title: `${leadsToday} novo${leadsToday > 1 ? "s" : ""} lead${leadsToday > 1 ? "s" : ""}`,
      type: "lead",
      status: "pending",
    });
  }

  const kpis: DashboardKPI = {
    leadsToday,
    scheduledToday,
    clientsThisMonth: clientsMonth,
    activeChats,
    avgScore: Math.round(avgScore._avg.score || 0),
    publishedPostsWeek: publishedWeek,
    draftPosts,
    hotLeads,
  };

  return { alerts, kpis, agenda };
}

// ── 2.1 Daily Brief (AI Morning Summary) ────────────────────

export async function getDailyBrief(force = false) {
  const user = await getCurrentUser();
  if (!user) return null;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 86400000);

  const [newLeads, unanswered, hotLeads, stuckLeads, avgScore, postsWeek] = await Promise.all([
    prisma.lead.count({ where: { userId: user.id, createdAt: { gte: new Date(now.getTime() - 86400000) } } }),
    prisma.lead.count({
      where: { userId: user.id, lastInteractionAt: { lt: new Date(now.getTime() - 6 * 3600000) }, stage: { eventName: { not: "Purchase" } } },
    }),
    prisma.lead.findMany({
      where: { userId: user.id, score: { gte: 50 } },
      select: { name: true, score: true, lastInteractionAt: true },
      orderBy: { score: "desc" },
      take: 3,
    }),
    prisma.lead.count({
      where: { userId: user.id, lastInteractionAt: { lt: new Date(now.getTime() - 3 * 86400000) }, stage: { eventName: { not: "Purchase" } } },
    }),
    prisma.lead.aggregate({ where: { userId: user.id }, _avg: { score: true } }),
    prisma.socialPost.count({ where: { userId: user.id, status: "published", publishedAt: { gte: weekAgo } } }),
  ]);

  const parts: string[] = [];
  const actions: { label: string; href: string }[] = [];

  if (newLeads > 0) {
    parts.push(`Voce tem ${newLeads} lead${newLeads > 1 ? "s" : ""} novo${newLeads > 1 ? "s" : ""} nas ultimas 24h.`);
  }
  if (hotLeads.length > 0) {
    const names = hotLeads.map((l) => l.name).join(", ");
    parts.push(`Leads quentes: ${names}. Priorize o atendimento deles.`);
    actions.push({ label: "Ver leads quentes", href: "/dashboard/pipeline" });
  }
  if (unanswered > 0) {
    parts.push(`${unanswered} lead${unanswered > 1 ? "s" : ""} esta${unanswered > 1 ? "o" : ""} sem resposta ha mais de 6h.`);
    actions.push({ label: "Responder leads", href: "/dashboard/chat" });
  }
  if (stuckLeads > 3) {
    parts.push(`${stuckLeads} leads estao parados ha 3+ dias — considere uma reativacao.`);
    actions.push({ label: "Reativar", href: "/dashboard/chat/broadcast" });
  }
  if (postsWeek > 0) {
    parts.push(`${postsWeek} post${postsWeek > 1 ? "s" : ""} publicado${postsWeek > 1 ? "s" : ""} esta semana.`);
  }
  if (parts.length === 0) {
    parts.push("Tudo tranquilo por aqui. Que tal criar um novo post ou revisar seu pipeline?");
    actions.push({ label: "Criar post", href: "/dashboard/posts" });
  }

  return {
    text: parts.join(" "),
    actions: actions.slice(0, 3),
    generatedAt: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

// ── 2.2 Today's Tasks ───────────────────────────────────────

export async function getTodaysTasks() {
  const user = await getCurrentUser();
  if (!user) return [];

  const now = new Date();

  const leads = await prisma.lead.findMany({
    where: {
      userId: user.id,
      stage: { eventName: { not: "Purchase" } },
      OR: [
        { score: { gte: 50 }, lastInteractionAt: { lt: new Date(now.getTime() - 86400000) } },
        { lastInteractionAt: { lt: new Date(now.getTime() - 12 * 3600000) } },
      ],
    },
    select: { id: true, name: true, phone: true, score: true, scoreLabel: true, lastInteractionAt: true },
    orderBy: { score: "desc" },
    take: 5,
  });

  return leads.map((lead) => {
    const hoursAgo = lead.lastInteractionAt
      ? Math.floor((now.getTime() - lead.lastInteractionAt.getTime()) / 3600000)
      : 0;
    const daysAgo = Math.floor(hoursAgo / 24);

    let reason: string;
    let urgencyLevel: "high" | "medium" | "low";

    if (lead.score >= 80 && hoursAgo > 24) {
      reason = `Lead VIP sem resposta ha ${daysAgo > 0 ? `${daysAgo}d` : `${hoursAgo}h`}`;
      urgencyLevel = "high";
    } else if (lead.score >= 50 && hoursAgo > 24) {
      reason = `Lead quente sem interacao ha ${daysAgo > 0 ? `${daysAgo}d` : `${hoursAgo}h`}`;
      urgencyLevel = "high";
    } else {
      reason = `Sem resposta ha ${daysAgo > 0 ? `${daysAgo} dia${daysAgo > 1 ? "s" : ""}` : `${hoursAgo}h`}`;
      urgencyLevel = hoursAgo > 48 ? "medium" : "low";
    }

    return {
      leadId: lead.id,
      leadName: lead.name,
      phone: lead.phone,
      score: lead.score,
      scoreLabel: lead.scoreLabel,
      reason,
      urgencyLevel,
    };
  });
}

// ── 2.3 Activity Feed ───────────────────────────────────────

export async function getActivityFeed(limit = 20) {
  const user = await getCurrentUser();
  if (!user) return [];

  type FeedItem = {
    id: string;
    type: "new_lead" | "stage_change" | "message" | "post_published" | "workflow_run" | "alert" | "score_update";
    text: string;
    entityName: string;
    entityUrl?: string;
    createdAt: string;
  };

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 86400000);

  const [recentLeads, recentStages, recentPosts, recentMessages] = await Promise.all([
    prisma.lead.findMany({
      where: { userId: user.id, createdAt: { gte: dayAgo } },
      select: { id: true, name: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.leadStageHistory.findMany({
      where: { lead: { userId: user.id }, createdAt: { gte: dayAgo } },
      select: { id: true, lead: { select: { name: true, id: true } }, stage: { select: { name: true } }, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.socialPost.findMany({
      where: { userId: user.id, status: "published", publishedAt: { gte: dayAgo } },
      select: { id: true, title: true, publishedAt: true },
      orderBy: { publishedAt: "desc" },
      take: 3,
    }),
    prisma.message.findMany({
      where: { lead: { userId: user.id }, role: "user", createdAt: { gte: dayAgo } },
      select: { id: true, lead: { select: { name: true, id: true } }, content: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const items: FeedItem[] = [];

  for (const l of recentLeads) {
    items.push({
      id: `lead-${l.id}`,
      type: "new_lead",
      text: "Novo lead:",
      entityName: l.name,
      entityUrl: "/dashboard/pipeline",
      createdAt: l.createdAt.toISOString(),
    });
  }

  for (const s of recentStages) {
    items.push({
      id: `stage-${s.id}`,
      type: "stage_change",
      text: `moveu para ${s.stage.name}:`,
      entityName: s.lead.name,
      entityUrl: "/dashboard/pipeline",
      createdAt: s.createdAt.toISOString(),
    });
  }

  for (const p of recentPosts) {
    items.push({
      id: `post-${p.id}`,
      type: "post_published",
      text: "Post publicado:",
      entityName: p.title || "Sem titulo",
      entityUrl: "/dashboard/posts",
      createdAt: (p.publishedAt || new Date()).toISOString(),
    });
  }

  for (const m of recentMessages) {
    items.push({
      id: `msg-${m.id}`,
      type: "message",
      text: "Mensagem de:",
      entityName: m.lead.name,
      entityUrl: `/dashboard/chat?leadId=${m.lead.id}`,
      createdAt: m.createdAt.toISOString(),
    });
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return items.slice(0, limit);
}

// ── 2.4 Health Score ────────────────────────────────────────

export async function getHealthScore() {
  const user = await getCurrentUser();
  if (!user) return null;

  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 86400000);

  const [avgScoreResult, totalLeads, convertedLeads, totalMessages, respondedMessages] = await Promise.all([
    prisma.lead.aggregate({ where: { userId: user.id }, _avg: { score: true } }),
    prisma.lead.count({ where: { userId: user.id, createdAt: { gte: monthAgo } } }),
    prisma.lead.count({ where: { userId: user.id, stage: { eventName: "Purchase" }, createdAt: { gte: monthAgo } } }),
    prisma.message.count({ where: { lead: { userId: user.id }, role: "user", createdAt: { gte: monthAgo } } }),
    prisma.message.count({ where: { lead: { userId: user.id }, role: "assistant", createdAt: { gte: monthAgo } } }),
  ]);

  const leadScore = Math.min(Math.round(avgScoreResult._avg.score || 0), 100);
  const responseRate = totalMessages > 0 ? Math.min(Math.round((respondedMessages / totalMessages) * 100), 100) : 50;
  const conversionRate = totalLeads > 0 ? Math.min(Math.round((convertedLeads / totalLeads) * 100), 100) : 0;
  // Simplified ROAS placeholder (would need real Meta data)
  const roasScore = 50;

  const overall = Math.round(leadScore * 0.25 + responseRate * 0.25 + roasScore * 0.25 + conversionRate * 0.25);

  const breakdown = [
    { label: "Score dos leads", value: leadScore, weight: 25 },
    { label: "Taxa de resposta", value: responseRate, weight: 25 },
    { label: "ROAS medio", value: roasScore, weight: 25 },
    { label: "Conversao", value: conversionRate, weight: 25 },
  ];

  const weakest = breakdown.reduce((min, item) => (item.value < min.value ? item : min), breakdown[0]);

  return {
    score: overall,
    breakdown,
    weakest: weakest.value < 50 ? weakest.label : "",
  };
}

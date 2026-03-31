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

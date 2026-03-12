"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";

// ─── Types ───

export type GoogleLeadStats = {
  total: number;
  withConversation: number;
  byStage: Array<{ stageName: string; count: number }>;
  recentLeads: Array<{
    id: string;
    name: string;
    phone: string;
    campaign: string | null;
    stageName: string | null;
    createdAt: Date;
  }>;
};

// ─── Google Leads Data ───

export async function getGoogleLeadsData(): Promise<GoogleLeadStats | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const leads = await prisma.lead.findMany({
    where: { userId: user.id, source: "google" },
    include: {
      stage: { select: { name: true } },
      messages: { select: { id: true }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  const stages = await prisma.stage.findMany({
    where: { userId: user.id },
    orderBy: { order: "asc" },
  });

  const byStage = stages.map((s) => ({
    stageName: s.name,
    count: leads.filter((l) => l.stageId === s.id).length,
  }));

  return {
    total: leads.length,
    withConversation: leads.filter((l) => l.messages.length > 0).length,
    byStage,
    recentLeads: leads.slice(0, 20).map((l) => ({
      id: l.id,
      name: l.name,
      phone: l.phone,
      campaign: l.campaign,
      stageName: l.stage?.name ?? null,
      createdAt: l.createdAt,
    })),
  };
}

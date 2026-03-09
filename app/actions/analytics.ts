"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import { fetchMetaAdsInsightsDetailed, fetchMetaCampaigns, type MetaAdsInsights, type MetaCampaign } from "@/services/metaAds";

export type PipelineAnalytics = {
  totalLeads: number;
  leadsWithConversation: number;
  leadsByStage: Array<{
    stageId: string;
    stageName: string;
    eventName: string;
    count: number;
    percentage: number;
  }>;
  conversionRate: number;
  funnelSteps: Array<{
    label: string;
    count: number;
    rate: number;
  }>;
};

export type FullAnalytics = {
  pipeline: PipelineAnalytics;
  metaAds: MetaAdsInsights | null;
  campaigns: MetaCampaign[];
  hasMetaConfig: boolean;
  metaError: boolean;   // true = API failure (bad token/permission)
  metaNoData: boolean;  // true = token ok but no spend data in period
};

export async function getAnalytics(): Promise<FullAnalytics | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const [stages, leads, pixel] = await Promise.all([
    prisma.stage.findMany({
      where: { userId: user.id },
      orderBy: { order: "asc" },
    }),
    prisma.lead.findMany({
      where: { userId: user.id },
      select: {
        stageId: true,
        messages: { select: { id: true }, take: 1 },
      },
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma.pixel.findUnique({ where: { userId: user.id } }) as any,
  ]);

  const totalLeads = leads.length;
  const leadsWithConversation = leads.filter((l) => l.messages.length > 0).length;

  const countByStage = leads.reduce<Record<string, number>>((acc, lead) => {
    if (lead.stageId) acc[lead.stageId] = (acc[lead.stageId] ?? 0) + 1;
    return acc;
  }, {});

  const leadsByStage = stages.map((stage) => {
    const count = countByStage[stage.id] ?? 0;
    return {
      stageId: stage.id,
      stageName: stage.name,
      eventName: stage.eventName,
      count,
      percentage: totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0,
    };
  });

  const clientStage = stages.find((s) => s.eventName === "Purchase");
  const scheduledStage = stages.find((s) => s.eventName === "Schedule");
  const qualifiedStage = stages.find((s) => s.eventName === "QualifiedLead");
  const clientCount = clientStage ? (countByStage[clientStage.id] ?? 0) : 0;
  const scheduledCount = scheduledStage ? (countByStage[scheduledStage.id] ?? 0) : 0;
  const qualifiedCount = qualifiedStage ? (countByStage[qualifiedStage.id] ?? 0) : 0;
  const conversionRate = totalLeads > 0 ? Math.round((clientCount / totalLeads) * 100) : 0;

  const pct = (num: number, den: number) =>
    den > 0 ? Math.round((num / den) * 100) : 0;

  const funnelSteps = [
    { label: "Leads captados", count: totalLeads, rate: 100 },
    { label: "Conversas WhatsApp", count: leadsWithConversation, rate: pct(leadsWithConversation, totalLeads) },
    { label: "Qualificados", count: qualifiedCount, rate: pct(qualifiedCount, leadsWithConversation || totalLeads) },
    { label: "Agendados", count: scheduledCount, rate: pct(scheduledCount, qualifiedCount || totalLeads) },
    { label: "Clientes", count: clientCount, rate: pct(clientCount, scheduledCount || totalLeads) },
  ];

  const hasMetaConfig = !!(pixel?.adAccountId && pixel?.metaAdsToken);
  let metaAds: MetaAdsInsights | null = null;
  let campaigns: MetaCampaign[] = [];
  let metaError = false;
  let metaNoData = false;

  if (hasMetaConfig) {
    const [insightsResult, fetchedCampaigns] = await Promise.all([
      fetchMetaAdsInsightsDetailed(pixel.adAccountId, pixel.metaAdsToken),
      fetchMetaCampaigns(pixel.adAccountId, pixel.metaAdsToken),
    ]);
    campaigns = fetchedCampaigns;
    if (insightsResult.ok) {
      metaAds = insightsResult.data;
    } else if (insightsResult.noData) {
      metaNoData = true;
    } else {
      metaError = true;
    }
  }

  return {
    pipeline: { totalLeads, leadsWithConversation, leadsByStage, conversionRate, funnelSteps },
    metaAds,
    campaigns,
    hasMetaConfig,
    metaError,
    metaNoData,
  };
}

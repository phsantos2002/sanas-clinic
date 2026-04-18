"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import {
  fetchMetaAdsInsightsDetailed,
  fetchCampaignInsightsDetailed,
  fetchMetaCampaigns,
  type MetaAdsInsights,
  type MetaCampaign,
} from "@/services/metaAds";
import { getMetaAds, getMetaAdSets, getSelectedCampaignData } from "./meta";

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
  metaError: boolean;
  metaNoData: boolean;
  selectedCampaignId: string | null;
  selectedCampaignName: string | null;
};

export async function getAnalytics(): Promise<FullAnalytics | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  // Sprint 4: replaced findMany + JS filter with DB-side aggregates.
  // Before: loaded ALL leads into memory → O(n) JS reduce.
  // After: 4 parallel DB queries with COUNT/GROUP BY → O(1) memory.
  const [stages, totalLeads, leadsWithConversation, stageGroups, pixel] = await Promise.all([
    prisma.stage.findMany({
      where: { userId: user.id },
      orderBy: { order: "asc" },
    }),
    prisma.lead.count({ where: { userId: user.id } }),
    prisma.lead.count({
      where: { userId: user.id, messages: { some: {} } },
    }),
    prisma.lead.groupBy({
      by: ["stageId"],
      where: { userId: user.id, stageId: { not: null } },
      _count: { stageId: true },
    }),
    prisma.pixel.findUnique({ where: { userId: user.id } }),
  ]);

  const countByStage = stageGroups.reduce<Record<string, number>>((acc, g) => {
    if (g.stageId) acc[g.stageId] = g._count.stageId;
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
  const selectedCampaignId: string | null = pixel?.selectedCampaignId ?? null;
  let metaAds: MetaAdsInsights | null = null;
  let campaigns: MetaCampaign[] = [];
  let metaError = false;
  let metaNoData = false;
  let selectedCampaignName: string | null = null;

  if (hasMetaConfig) {
    const adAccountId = pixel!.adAccountId!;
    const metaAdsToken = pixel!.metaAdsToken!;
    // If a campaign is selected, fetch insights for that campaign only
    const insightsPromise = selectedCampaignId
      ? fetchCampaignInsightsDetailed(selectedCampaignId, metaAdsToken)
      : fetchMetaAdsInsightsDetailed(adAccountId, metaAdsToken);

    const [insightsResult, fetchedCampaigns] = await Promise.all([
      insightsPromise,
      fetchMetaCampaigns(adAccountId, metaAdsToken),
    ]);
    campaigns = fetchedCampaigns;

    if (selectedCampaignId) {
      const found = campaigns.find((c) => c.id === selectedCampaignId);
      selectedCampaignName = found?.name ?? null;
    }

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
    selectedCampaignId,
    selectedCampaignName,
  };
}

// ─── Ad Creative Report ───

export type CreativeHealthStatus = "performing" | "saturating" | "declining" | "paused" | "new";

export type AdCreativeRow = {
  id: string;
  name: string;
  status: string;
  adSetName: string;
  thumbnailUrl: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  ctr: number;
  cpm: number;
  cpc: number;
  frequency: number;
  health: CreativeHealthStatus;
};

function classifyCreativeHealth(ad: {
  status: string;
  impressions: number;
  frequency: number;
  ctr: number;
}): CreativeHealthStatus {
  if (ad.status !== "ACTIVE") return "paused";
  if (ad.impressions === 0) return "new";
  if (ad.frequency >= 4) return "declining";
  if (ad.frequency >= 2.5 && ad.ctr < 0.8) return "saturating";
  if (ad.ctr < 0.3 && ad.impressions > 1000) return "declining";
  return "performing";
}

export async function getAdCreativeReport(): Promise<AdCreativeRow[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const selectedData = await getSelectedCampaignData();
  if (!selectedData.campaign || selectedData.adSets.length === 0) return [];

  const rows: AdCreativeRow[] = [];

  for (const adSet of selectedData.adSets) {
    const ads = await getMetaAds(adSet.id);
    for (const ad of ads) {
      rows.push({
        id: ad.id,
        name: ad.name,
        status: ad.status,
        adSetName: adSet.name,
        thumbnailUrl: ad.thumbnailUrl,
        spend: ad.spend,
        impressions: ad.impressions,
        clicks: ad.clicks,
        reach: ad.reach,
        ctr: ad.ctr,
        cpm: ad.cpm,
        cpc: ad.cpc,
        frequency: ad.frequency,
        health: classifyCreativeHealth(ad),
      });
    }
  }

  // Sort: declining first, then saturating, performing, new, paused
  const healthOrder: Record<CreativeHealthStatus, number> = {
    declining: 0,
    saturating: 1,
    performing: 2,
    new: 3,
    paused: 4,
  };
  rows.sort((a, b) => healthOrder[a.health] - healthOrder[b.health]);

  return rows;
}

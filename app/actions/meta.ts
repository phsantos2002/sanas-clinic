"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";

const GRAPH_URL = "https://graph.facebook.com/v18.0";

// ─── Types ───

export type MetaCampaignFull = {
  id: string;
  name: string;
  status: string;
  objective: string;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  bidStrategy: string | null;
  bidAmount: number | null;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  ctr: number;
  cpm: number;
  cpc: number;
};

export type MetaAdSet = {
  id: string;
  name: string;
  status: string;
  campaignId: string;
  dailyBudget: number | null;
  bidAmount: number | null;
  optimization_goal: string | null;
  billing_event: string | null;
};

export type MetaAd = {
  id: string;
  name: string;
  status: string;
  adsetId: string;
  creativeId: string | null;
  thumbnailUrl: string | null;
  previewUrl: string | null;
};

export type MetaConfig = {
  adAccountId: string;
  metaAdsToken: string;
  pixelId: string;
};

export type MetaCampaignInsights = {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpm: number;
  cpc: number;
  actions: Record<string, number>;
  costPerAction: Record<string, number>;
};

// ─── Helpers ───

async function getMetaConfig(): Promise<(MetaConfig & { selectedCampaignId: string | null }) | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pixel = (await prisma.pixel.findUnique({ where: { userId: user.id } })) as any;
  if (!pixel?.adAccountId || !pixel?.metaAdsToken) return null;

  return {
    adAccountId: pixel.adAccountId.startsWith("act_") ? pixel.adAccountId : `act_${pixel.adAccountId}`,
    metaAdsToken: pixel.metaAdsToken,
    pixelId: pixel.pixelId,
    selectedCampaignId: pixel.selectedCampaignId ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function graphGet(path: string, token: string, params: Record<string, string> = {}): Promise<any> {
  const qs = new URLSearchParams({ access_token: token, ...params });
  const res = await fetch(`${GRAPH_URL}/${path}?${qs}`, { cache: "no-store" });
  return res.json();
}

// ─── Campaigns ───

export async function getMetaCampaigns(): Promise<{
  campaigns: MetaCampaignFull[];
  config: MetaConfig | null;
}> {
  const config = await getMetaConfig();
  if (!config) return { campaigns: [], config: null };

  try {
    const json = await graphGet(`${config.adAccountId}/campaigns`, config.metaAdsToken, {
      fields: [
        "id", "name", "status", "objective",
        "daily_budget", "lifetime_budget", "bid_strategy",
        "insights.date_preset(last_30d){spend,impressions,reach,clicks,ctr,cpm,cpc}",
      ].join(","),
      effective_status: '["ACTIVE","PAUSED"]',
      limit: "50",
    });

    if (json.error) {
      console.error("[Meta] campaigns error:", json.error.message);
      return { campaigns: [], config };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const campaigns: MetaCampaignFull[] = (json.data ?? []).map((c: any) => {
      const ins = c.insights?.data?.[0];
      return {
        id: c.id,
        name: c.name,
        status: c.status,
        objective: c.objective ?? "UNKNOWN",
        dailyBudget: c.daily_budget ? parseFloat(c.daily_budget) / 100 : null,
        lifetimeBudget: c.lifetime_budget ? parseFloat(c.lifetime_budget) / 100 : null,
        bidStrategy: c.bid_strategy ?? null,
        bidAmount: c.bid_amount ? parseFloat(c.bid_amount) / 100 : null,
        spend: ins ? parseFloat(ins.spend) || 0 : 0,
        impressions: ins ? parseInt(ins.impressions) || 0 : 0,
        clicks: ins ? parseInt(ins.clicks) || 0 : 0,
        reach: ins ? parseInt(ins.reach) || 0 : 0,
        ctr: ins ? parseFloat(ins.ctr) || 0 : 0,
        cpm: ins ? parseFloat(ins.cpm) || 0 : 0,
        cpc: ins ? parseFloat(ins.cpc) || 0 : 0,
      };
    });

    return { campaigns, config };
  } catch (e) {
    console.error("[Meta] campaigns fetch error:", e);
    return { campaigns: [], config };
  }
}

// ─── Ad Sets ───

export async function getMetaAdSets(campaignId: string): Promise<MetaAdSet[]> {
  const config = await getMetaConfig();
  if (!config) return [];

  try {
    const json = await graphGet(`${campaignId}/adsets`, config.metaAdsToken, {
      fields: "id,name,status,campaign_id,daily_budget,bid_amount,optimization_goal,billing_event",
      limit: "50",
    });

    if (json.error) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (json.data ?? []).map((a: any) => ({
      id: a.id,
      name: a.name,
      status: a.status,
      campaignId: a.campaign_id,
      dailyBudget: a.daily_budget ? parseFloat(a.daily_budget) / 100 : null,
      bidAmount: a.bid_amount ? parseFloat(a.bid_amount) / 100 : null,
      optimization_goal: a.optimization_goal ?? null,
      billing_event: a.billing_event ?? null,
    }));
  } catch {
    return [];
  }
}

// ─── Ads (Creatives) ───

export async function getMetaAds(adSetId: string): Promise<MetaAd[]> {
  const config = await getMetaConfig();
  if (!config) return [];

  try {
    const json = await graphGet(`${adSetId}/ads`, config.metaAdsToken, {
      fields: "id,name,status,adset_id,creative{id,thumbnail_url,effective_object_story_id}",
      limit: "50",
    });

    if (json.error) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (json.data ?? []).map((a: any) => ({
      id: a.id,
      name: a.name,
      status: a.status,
      adsetId: a.adset_id,
      creativeId: a.creative?.id ?? null,
      thumbnailUrl: a.creative?.thumbnail_url ?? null,
      previewUrl: null,
    }));
  } catch {
    return [];
  }
}

// ─── Campaign Actions ───

export async function updateCampaignStatus(
  campaignId: string,
  status: "ACTIVE" | "PAUSED"
): Promise<{ success: boolean; error?: string }> {
  const config = await getMetaConfig();
  if (!config) return { success: false, error: "Meta não configurado" };

  try {
    const res = await fetch(`${GRAPH_URL}/${campaignId}?access_token=${config.metaAdsToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    if (json.error) return { success: false, error: json.error.message };
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function updateCampaignBudget(
  campaignId: string,
  dailyBudget: number
): Promise<{ success: boolean; error?: string }> {
  const config = await getMetaConfig();
  if (!config) return { success: false, error: "Meta não configurado" };

  try {
    const res = await fetch(`${GRAPH_URL}/${campaignId}?access_token=${config.metaAdsToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ daily_budget: Math.round(dailyBudget * 100) }),
    });
    const json = await res.json();
    if (json.error) return { success: false, error: json.error.message };
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function updateAdSetBidCap(
  adSetId: string,
  bidAmount: number
): Promise<{ success: boolean; error?: string }> {
  const config = await getMetaConfig();
  if (!config) return { success: false, error: "Meta não configurado" };

  try {
    const res = await fetch(`${GRAPH_URL}/${adSetId}?access_token=${config.metaAdsToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bid_amount: Math.round(bidAmount * 100),
        bid_strategy: "LOWEST_COST_WITH_BID_CAP",
      }),
    });
    const json = await res.json();
    if (json.error) return { success: false, error: json.error.message };
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function updateAdStatus(
  adId: string,
  status: "ACTIVE" | "PAUSED"
): Promise<{ success: boolean; error?: string }> {
  const config = await getMetaConfig();
  if (!config) return { success: false, error: "Meta não configurado" };

  try {
    const res = await fetch(`${GRAPH_URL}/${adId}?access_token=${config.metaAdsToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    if (json.error) return { success: false, error: json.error.message };
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ─── Pixel Events ───

export async function getPixelEvents(): Promise<{
  events: Array<{ name: string; count: number }>;
  pixelId: string | null;
}> {
  const config = await getMetaConfig();
  if (!config) return { events: [], pixelId: null };

  const user = await getCurrentUser();
  if (!user) return { events: [], pixelId: config.pixelId };

  // Get stages and their event names to show which events are configured
  const stages = await prisma.stage.findMany({
    where: { userId: user.id },
    orderBy: { order: "asc" },
    select: { name: true, eventName: true },
  });

  const events = stages.map((s) => ({
    name: s.eventName,
    count: 0, // Will be populated from pixel events count
  }));

  // Get recent pixel events count
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const pixelEvents = await prisma.pixelEvent.groupBy({
    by: ["eventName"],
    where: {
      lead: { userId: user.id },
      platform: "facebook",
      createdAt: { gte: thirtyDaysAgo },
    },
    _count: { id: true },
  });

  for (const pe of pixelEvents) {
    const event = events.find((e) => e.name === pe.eventName);
    if (event) event.count = pe._count.id;
  }

  return { events, pixelId: config.pixelId };
}

// ─── Selected Campaign ───

export async function getSelectedCampaignData(): Promise<{
  selectedCampaignId: string | null;
  campaign: MetaCampaignFull | null;
  adSets: MetaAdSet[];
  insights: MetaCampaignInsights | null;
  config: MetaConfig | null;
  error?: string;
}> {
  const config = await getMetaConfig();
  if (!config) return { selectedCampaignId: null, campaign: null, adSets: [], insights: null, config: null };

  const selectedId = config.selectedCampaignId;
  if (!selectedId) return { selectedCampaignId: null, campaign: null, adSets: [], insights: null, config };

  try {
    // Fetch campaign details + insights in parallel
    const [campaignJson, insightsJson, adSetsData] = await Promise.all([
      graphGet(selectedId, config.metaAdsToken, {
        fields: [
          "id", "name", "status", "objective",
          "daily_budget", "lifetime_budget", "bid_strategy",
          "insights.date_preset(last_30d){spend,impressions,reach,clicks,ctr,cpm,cpc}",
        ].join(","),
      }),
      graphGet(`${selectedId}/insights`, config.metaAdsToken, {
        fields: "spend,impressions,reach,clicks,ctr,cpm,cpc,actions,cost_per_action_type",
        date_preset: "last_30d",
      }),
      getMetaAdSets(selectedId),
    ]);

    if (campaignJson.error) {
      const errMsg = campaignJson.error.message || JSON.stringify(campaignJson.error);
      console.error("[Meta] selected campaign error:", errMsg);
      return { selectedCampaignId: selectedId, campaign: null, adSets: [], insights: null, config, error: errMsg };
    }

    const c = campaignJson;
    const ins = c.insights?.data?.[0];
    const campaign: MetaCampaignFull = {
      id: c.id,
      name: c.name,
      status: c.status,
      objective: c.objective ?? "UNKNOWN",
      dailyBudget: c.daily_budget ? parseFloat(c.daily_budget) / 100 : null,
      lifetimeBudget: c.lifetime_budget ? parseFloat(c.lifetime_budget) / 100 : null,
      bidStrategy: c.bid_strategy ?? null,
      bidAmount: c.bid_amount ? parseFloat(c.bid_amount) / 100 : null,
      spend: ins ? parseFloat(ins.spend) || 0 : 0,
      impressions: ins ? parseInt(ins.impressions) || 0 : 0,
      clicks: ins ? parseInt(ins.clicks) || 0 : 0,
      reach: ins ? parseInt(ins.reach) || 0 : 0,
      ctr: ins ? parseFloat(ins.ctr) || 0 : 0,
      cpm: ins ? parseFloat(ins.cpm) || 0 : 0,
      cpc: ins ? parseFloat(ins.cpc) || 0 : 0,
    };

    // Parse full insights with actions
    let insights: MetaCampaignInsights | null = null;
    const insData = insightsJson?.data?.[0];
    if (insData) {
      const actions: Record<string, number> = {};
      const costPerAction: Record<string, number> = {};
      for (const a of insData.actions ?? []) actions[a.action_type] = parseFloat(a.value) || 0;
      for (const a of insData.cost_per_action_type ?? []) costPerAction[a.action_type] = parseFloat(a.value) || 0;

      insights = {
        spend: parseFloat(insData.spend) || 0,
        impressions: parseInt(insData.impressions) || 0,
        reach: parseInt(insData.reach) || 0,
        clicks: parseInt(insData.clicks) || 0,
        ctr: parseFloat(insData.ctr) || 0,
        cpm: parseFloat(insData.cpm) || 0,
        cpc: parseFloat(insData.cpc) || 0,
        actions,
        costPerAction,
      };
    }

    return { selectedCampaignId: selectedId, campaign, adSets: adSetsData, insights, config };
  } catch (e) {
    console.error("[Meta] selected campaign fetch error:", e);
    return { selectedCampaignId: selectedId, campaign: null, adSets: [], insights: null, config, error: String(e) };
  }
}

// ─── List campaigns for selector ───

export async function listCampaignsForSelector(): Promise<Array<{ id: string; name: string; status: string }>> {
  const config = await getMetaConfig();
  if (!config) return [];

  try {
    const json = await graphGet(`${config.adAccountId}/campaigns`, config.metaAdsToken, {
      fields: "id,name,status",
      effective_status: '["ACTIVE","PAUSED"]',
      limit: "50",
    });
    if (json.error) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (json.data ?? []).map((c: any) => ({ id: c.id, name: c.name, status: c.status }));
  } catch {
    return [];
  }
}

export async function getSelectedCampaignId(): Promise<string | null> {
  const config = await getMetaConfig();
  return config?.selectedCampaignId ?? null;
}

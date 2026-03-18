"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import { recordCampaignAction } from "./campaignActions";

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
  // Ad-level insights (last 30d)
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  ctr: number;
  cpm: number;
  cpc: number;
  frequency: number;
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
      fields: [
        "id", "name", "status", "adset_id",
        "creative{id,thumbnail_url,effective_object_story_id}",
        "insights.date_preset(last_30d){spend,impressions,clicks,reach,ctr,cpm,cpc,frequency}",
      ].join(","),
      limit: "50",
    });

    if (json.error) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (json.data ?? []).map((a: any) => {
      const ins = a.insights?.data?.[0];
      return {
        id: a.id,
        name: a.name,
        status: a.status,
        adsetId: a.adset_id,
        creativeId: a.creative?.id ?? null,
        thumbnailUrl: a.creative?.thumbnail_url ?? null,
        previewUrl: null,
        spend: ins ? parseFloat(ins.spend) || 0 : 0,
        impressions: ins ? parseInt(ins.impressions) || 0 : 0,
        clicks: ins ? parseInt(ins.clicks) || 0 : 0,
        reach: ins ? parseInt(ins.reach) || 0 : 0,
        ctr: ins ? parseFloat(ins.ctr) || 0 : 0,
        cpm: ins ? parseFloat(ins.cpm) || 0 : 0,
        cpc: ins ? parseFloat(ins.cpc) || 0 : 0,
        frequency: ins ? parseFloat(ins.frequency) || 0 : 0,
      };
    });
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

    await recordCampaignAction({
      type: status === "ACTIVE" ? "ACTIVATE" : "PAUSE",
      entityType: "CAMPAIGN",
      entityId: campaignId,
      entityName: campaignId,
      before: status === "ACTIVE" ? "PAUSED" : "ACTIVE",
      after: status,
    });

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

    await recordCampaignAction({
      type: "BUDGET_CHANGE",
      entityType: "CAMPAIGN",
      entityId: campaignId,
      entityName: campaignId,
      after: `R$ ${dailyBudget.toFixed(2)}/dia`,
    });

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

    await recordCampaignAction({
      type: "BID_CHANGE",
      entityType: "ADSET",
      entityId: adSetId,
      entityName: adSetId,
      after: `R$ ${bidAmount.toFixed(2)} (Bid Cap)`,
    });

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

    await recordCampaignAction({
      type: status === "ACTIVE" ? "ACTIVATE" : "PAUSE",
      entityType: "AD",
      entityId: adId,
      entityName: adId,
      before: status === "ACTIVE" ? "PAUSED" : "ACTIVE",
      after: status,
    });

    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ─── Create Ad ───

export async function createAd(data: {
  adSetId: string;
  name: string;
  primaryText: string;
  headline: string;
  linkUrl: string;
  callToAction: string;
  imageBase64: string; // base64 encoded image (no prefix)
}): Promise<{ success: boolean; error?: string; adId?: string }> {
  const config = await getMetaConfig();
  if (!config) return { success: false, error: "Meta não configurado" };

  try {
    // Step 1: Upload image
    const imgForm = new FormData();
    // Convert base64 to Blob
    const byteChars = atob(data.imageBase64);
    const byteArray = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
    const blob = new Blob([byteArray], { type: "image/jpeg" });
    imgForm.append("filename", blob, "creative.jpg");
    imgForm.append("access_token", config.metaAdsToken);

    const imgRes = await fetch(`${GRAPH_URL}/${config.adAccountId}/adimages`, {
      method: "POST",
      body: imgForm,
    });
    const imgJson = await imgRes.json();
    if (imgJson.error) return { success: false, error: `Upload: ${imgJson.error.message}` };

    // Get image hash from response
    const images = imgJson.images;
    const imageHash = images ? Object.values(images)[0] as { hash: string } : null;
    if (!imageHash?.hash) return { success: false, error: "Falha ao obter hash da imagem" };

    // Step 2: Get page ID from ad account
    const pageJson = await graphGet(`${config.adAccountId}/promote_pages`, config.metaAdsToken, {
      fields: "id,name",
      limit: "1",
    });
    const pageId = pageJson?.data?.[0]?.id;
    if (!pageId) return { success: false, error: "Nenhuma página do Facebook vinculada à conta de anúncios. Vincule uma página primeiro." };

    // Step 3: Create ad creative
    const creativeRes = await fetch(`${GRAPH_URL}/${config.adAccountId}/adcreatives?access_token=${config.metaAdsToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        object_story_spec: {
          page_id: pageId,
          link_data: {
            image_hash: imageHash.hash,
            link: data.linkUrl,
            message: data.primaryText,
            name: data.headline,
            call_to_action: {
              type: data.callToAction,
              value: { link: data.linkUrl },
            },
          },
        },
      }),
    });
    const creativeJson = await creativeRes.json();
    if (creativeJson.error) return { success: false, error: `Creative: ${creativeJson.error.message}` };

    const creativeId = creativeJson.id;
    if (!creativeId) return { success: false, error: "Falha ao criar creative" };

    // Step 4: Create ad
    const adRes = await fetch(`${GRAPH_URL}/${config.adAccountId}/ads?access_token=${config.metaAdsToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        adset_id: data.adSetId,
        creative: { creative_id: creativeId },
        status: "PAUSED",
      }),
    });
    const adJson = await adRes.json();
    if (adJson.error) return { success: false, error: `Ad: ${adJson.error.message}` };

    return { success: true, adId: adJson.id };
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

// ─── Campaign Creation ───

/** Meta v18.0 outcome-based objectives */
const OBJECTIVE_MAP: Record<string, string> = {
  seguidores: "OUTCOME_AWARENESS",
  mensagens: "OUTCOME_ENGAGEMENT",
  visualizacao: "OUTCOME_AWARENESS",
  impulsionar: "OUTCOME_ENGAGEMENT",
  leads: "OUTCOME_LEADS",
  vendas: "OUTCOME_SALES",
  trafego: "OUTCOME_TRAFFIC",
};

const OPTIMIZATION_MAP: Record<string, string> = {
  seguidores: "REACH",
  mensagens: "CONVERSATIONS",
  visualizacao: "IMPRESSIONS",
  impulsionar: "POST_ENGAGEMENT",
  leads: "LEAD_GENERATION",
  vendas: "OFFSITE_CONVERSIONS",
  trafego: "LINK_CLICKS",
};

const BILLING_MAP: Record<string, string> = {
  seguidores: "IMPRESSIONS",
  mensagens: "IMPRESSIONS",
  visualizacao: "IMPRESSIONS",
  impulsionar: "IMPRESSIONS",
  leads: "IMPRESSIONS",
  vendas: "IMPRESSIONS",
  trafego: "IMPRESSIONS",
};

export type CreateCampaignInput = {
  name: string;
  goal: string; // seguidores | mensagens | visualizacao | impulsionar | leads | vendas | trafego
  dailyBudget: number; // in BRL
  adSetName?: string;
  // For boosting
  postId?: string; // Facebook/IG post ID to boost
  // For new creative
  imageBase64?: string;
  primaryText?: string;
  headline?: string;
  linkUrl?: string;
  callToAction?: string;
  // Destination for messages
  destination?: string; // WHATSAPP | MESSENGER | INSTAGRAM_DIRECT
  // Targeting
  ageMin?: number;
  ageMax?: number;
  gender?: number; // undefined=all, 1=male, 2=female (Meta API format)
  regions?: string[]; // BR state codes (e.g. ["SP", "RJ"])
  locationPins?: Array<{ name: string; radius: number }>; // specific locations with radius in km
};

export async function createCampaign(input: CreateCampaignInput): Promise<{
  success: boolean;
  campaignId?: string;
  adSetId?: string;
  error?: string;
}> {
  const config = await getMetaConfig();
  if (!config) return { success: false, error: "Meta não configurado" };

  const objective = OBJECTIVE_MAP[input.goal];
  if (!objective) return { success: false, error: "Objetivo inválido" };

  try {
    // Step 1: Create campaign (Advantage+ enabled via smart_promotion_type)
    const campaignRes = await fetch(`${GRAPH_URL}/${config.adAccountId}/campaigns?access_token=${config.metaAdsToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: input.name,
        objective,
        status: "PAUSED",
        special_ad_categories: [],
        smart_promotion_type: "GUIDED_CREATION",
      }),
    });
    const campaignJson = await campaignRes.json();
    if (campaignJson.error) return { success: false, error: `Campanha: ${campaignJson.error.message}` };

    const campaignId = campaignJson.id;
    if (!campaignId) return { success: false, error: "Falha ao criar campanha" };

    // Step 2: Create ad set
    const optimizationGoal = OPTIMIZATION_MAP[input.goal] ?? "IMPRESSIONS";
    const billingEvent = BILLING_MAP[input.goal] ?? "IMPRESSIONS";

    // Build promoted_object based on goal
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const promotedObject: any = {};
    if (input.goal === "mensagens") {
      // Get page ID
      const pageJson = await graphGet(`${config.adAccountId}/promote_pages`, config.metaAdsToken, { fields: "id", limit: "1" });
      const pageId = pageJson?.data?.[0]?.id;
      if (pageId) promotedObject.page_id = pageId;
    } else if (input.goal === "leads" || input.goal === "vendas") {
      if (config.pixelId) promotedObject.pixel_id = config.pixelId;
    }

    // Build targeting from user input
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const targeting: any = {
      age_min: input.ageMin ?? 18,
      age_max: input.ageMax ?? 65,
    };

    // Geo: use location pins if provided, regions, or whole Brazil
    if (input.locationPins && input.locationPins.length > 0) {
      targeting.geo_locations = {
        countries: ["BR"],
        location_types: ["home", "recent"],
        custom_locations: input.locationPins
          .filter((p) => p.name.trim())
          .map((p) => ({
            address_string: p.name.trim(),
            radius: p.radius,
            distance_unit: "kilometer",
          })),
      };
    } else if (input.regions && input.regions.length > 0) {
      targeting.geo_locations = {
        regions: input.regions.map((r) => ({ key: r, country: "BR" })),
      };
    } else {
      targeting.geo_locations = { countries: ["BR"] };
    }

    // Gender (Meta: 0=all, 1=male, 2=female)
    if (input.gender) {
      targeting.genders = [input.gender];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adSetBody: any = {
      name: input.adSetName || `${input.name} - Conjunto`,
      campaign_id: campaignId,
      daily_budget: Math.round(input.dailyBudget * 100),
      optimization_goal: optimizationGoal,
      billing_event: billingEvent,
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      status: "PAUSED",
      targeting,
      // Advantage+ audience — Meta expands beyond the targeting suggestions
      targeting_optimization_types: ["ADVANTAGE_AUDIENCE"],
    };

    if (Object.keys(promotedObject).length > 0) {
      adSetBody.promoted_object = promotedObject;
    }

    // Messages destination
    if (input.goal === "mensagens" && input.destination) {
      adSetBody.destination_type = input.destination;
    }

    const adSetRes = await fetch(`${GRAPH_URL}/${config.adAccountId}/adsets?access_token=${config.metaAdsToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(adSetBody),
    });
    const adSetJson = await adSetRes.json();
    if (adSetJson.error) {
      // Campaign was created but ad set failed — report both
      return { success: false, campaignId, error: `Conjunto: ${adSetJson.error.message}` };
    }

    const adSetId = adSetJson.id;

    // Step 3: Create ad (if creative data provided)
    if (input.postId) {
      // Boosting existing post
      const pageJson = await graphGet(`${config.adAccountId}/promote_pages`, config.metaAdsToken, { fields: "id", limit: "1" });
      const pageId = pageJson?.data?.[0]?.id;

      if (pageId) {
        const creativeRes = await fetch(`${GRAPH_URL}/${config.adAccountId}/adcreatives?access_token=${config.metaAdsToken}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `${input.name} - Criativo`,
            object_story_id: input.postId,
          }),
        });
        const creativeJson = await creativeRes.json();

        if (creativeJson.id) {
          await fetch(`${GRAPH_URL}/${config.adAccountId}/ads?access_token=${config.metaAdsToken}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: `${input.name} - Anúncio`,
              adset_id: adSetId,
              creative: { creative_id: creativeJson.id },
              status: "PAUSED",
            }),
          });
        }
      }
    } else if (input.imageBase64) {
      // New creative with uploaded image
      await createAd({
        adSetId,
        name: `${input.name} - Anúncio`,
        primaryText: input.primaryText ?? "",
        headline: input.headline ?? "",
        linkUrl: input.linkUrl ?? "",
        callToAction: input.callToAction ?? "LEARN_MORE",
        imageBase64: input.imageBase64,
      });
    }

    await recordCampaignAction({
      type: "CREATE",
      entityType: "CAMPAIGN",
      entityId: campaignId,
      entityName: input.name,
      after: `${input.goal} | R$ ${input.dailyBudget}/dia`,
    });

    return { success: true, campaignId, adSetId };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ─── Facebook/Instagram Posts for Boosting ───

export type SocialPost = {
  id: string;
  message: string;
  imageUrl: string | null;
  permalink: string;
  createdTime: string;
  type: "facebook" | "instagram";
  mediaType?: string; // IMAGE, VIDEO, CAROUSEL_ALBUM
};

export async function getFacebookPosts(): Promise<SocialPost[]> {
  const config = await getMetaConfig();
  if (!config) return [];

  try {
    // Get page ID first
    const pageJson = await graphGet(`${config.adAccountId}/promote_pages`, config.metaAdsToken, {
      fields: "id,name",
      limit: "1",
    });
    const pageId = pageJson?.data?.[0]?.id;
    if (!pageId) return [];

    const json = await graphGet(`${pageId}/feed`, config.metaAdsToken, {
      fields: "id,message,full_picture,created_time,permalink_url",
      limit: "20",
    });
    if (json.error) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (json.data ?? []).map((p: any) => ({
      id: `${pageId}_${p.id.split("_").pop()}`, // Ensure format pageId_postId
      message: p.message ?? "",
      imageUrl: p.full_picture ?? null,
      permalink: p.permalink_url ?? "",
      createdTime: p.created_time ?? "",
      type: "facebook" as const,
    }));
  } catch {
    return [];
  }
}

export async function getInstagramMedia(): Promise<SocialPost[]> {
  const config = await getMetaConfig();
  if (!config) return [];

  try {
    // Get page → IG business account
    const pageJson = await graphGet(`${config.adAccountId}/promote_pages`, config.metaAdsToken, {
      fields: "id,instagram_business_account",
      limit: "1",
    });
    const igId = pageJson?.data?.[0]?.instagram_business_account?.id;
    if (!igId) return [];

    const json = await graphGet(`${igId}/media`, config.metaAdsToken, {
      fields: "id,caption,media_url,media_type,thumbnail_url,permalink",
      limit: "20",
    });
    if (json.error) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (json.data ?? []).map((m: any) => ({
      id: m.id,
      message: m.caption ?? "",
      imageUrl: m.media_type === "VIDEO" ? m.thumbnail_url : m.media_url ?? null,
      permalink: m.permalink ?? "",
      createdTime: "",
      type: "instagram" as const,
      mediaType: m.media_type,
    }));
  } catch {
    return [];
  }
}

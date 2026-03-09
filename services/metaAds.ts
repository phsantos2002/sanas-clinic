const GRAPH_URL = "https://graph.facebook.com/v18.0";

export type MetaAdsInsights = {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpm: number;
  cpc: number;
  results: Record<string, number>;
  costPerResult: Record<string, number>;
};

export type MetaCampaign = {
  id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  cpc: number;
  reach: number;
};

type ActionValue = { action_type: string; value: string };

function parseInsightFields(data: Record<string, string>) {
  return {
    spend: parseFloat(data.spend) || 0,
    impressions: parseInt(data.impressions) || 0,
    reach: parseInt(data.reach) || 0,
    clicks: parseInt(data.clicks) || 0,
    ctr: parseFloat(data.ctr) || 0,
    cpm: parseFloat(data.cpm) || 0,
    cpc: parseFloat(data.cpc) || 0,
  };
}

export type InsightsResult =
  | { ok: true; data: MetaAdsInsights }
  | { ok: false; noData: true }
  | { ok: false; noData: false; error: string };

export async function fetchMetaAdsInsights(
  adAccountId: string,
  accessToken: string,
  datePreset = "last_30d"
): Promise<MetaAdsInsights | null> {
  const result = await fetchMetaAdsInsightsDetailed(adAccountId, accessToken, datePreset);
  return result.ok ? result.data : null;
}

export async function fetchMetaAdsInsightsDetailed(
  adAccountId: string,
  accessToken: string,
  datePreset = "last_30d"
): Promise<InsightsResult> {
  const accountId = adAccountId.startsWith("act_")
    ? adAccountId
    : `act_${adAccountId}`;

  const fields = [
    "spend",
    "impressions",
    "reach",
    "clicks",
    "ctr",
    "cpm",
    "cpc",
    "actions",
    "cost_per_action_type",
  ].join(",");

  const url = `${GRAPH_URL}/${accountId}/insights?fields=${fields}&date_preset=${datePreset}&level=account&access_token=${accessToken}`;

  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    const json = await res.json();

    if (!res.ok || json.error) {
      const msg = json.error?.message ?? "unknown error";
      console.error("[MetaAds] insights error:", msg);
      return { ok: false, noData: false, error: msg };
    }

    const data = json.data?.[0];
    if (!data) return { ok: false, noData: true };

    const actions: ActionValue[] = data.actions ?? [];
    const costPerAction: ActionValue[] = data.cost_per_action_type ?? [];

    const results: Record<string, number> = {};
    for (const a of actions) results[a.action_type] = parseFloat(a.value) || 0;

    const costPerResult: Record<string, number> = {};
    for (const a of costPerAction) costPerResult[a.action_type] = parseFloat(a.value) || 0;

    return {
      ok: true,
      data: {
        ...parseInsightFields(data),
        results,
        costPerResult,
      },
    };
  } catch (e) {
    console.error("[MetaAds] fetch error:", e);
    return { ok: false, noData: false, error: String(e) };
  }
}

export async function fetchMetaCampaigns(
  adAccountId: string,
  accessToken: string,
  datePreset = "last_30d"
): Promise<MetaCampaign[]> {
  const accountId = adAccountId.startsWith("act_")
    ? adAccountId
    : `act_${adAccountId}`;

  const insightFields = "spend,impressions,reach,clicks,ctr,cpm,cpc";
  const url = `${GRAPH_URL}/${accountId}/campaigns?fields=id,name,status,insights.date_preset(${datePreset}){${insightFields}}&effective_status=["ACTIVE","PAUSED"]&limit=20&access_token=${accessToken}`;

  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    const json = await res.json();

    if (!res.ok || json.error) {
      console.error("[MetaAds] campaigns error:", json.error?.message ?? json);
      return [];
    }

    return (json.data ?? []).map(
      (c: { id: string; name: string; status: string; insights?: { data?: Record<string, string>[] } }) => {
        const ins = c.insights?.data?.[0];
        return {
          id: c.id,
          name: c.name,
          status: c.status,
          ...(ins
            ? parseInsightFields(ins)
            : { spend: 0, impressions: 0, reach: 0, clicks: 0, ctr: 0, cpm: 0, cpc: 0 }),
        };
      }
    );
  } catch (e) {
    console.error("[MetaAds] campaigns fetch error:", e);
    return [];
  }
}

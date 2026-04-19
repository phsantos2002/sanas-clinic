import { prisma } from "@/lib/prisma";

/**
 * Multi-Touch Attribution Engine
 *
 * Models:
 * - first_touch: 100% credit to first interaction
 * - last_touch: 100% credit to last interaction
 * - linear: equal credit across all touchpoints
 * - time_decay: more credit to recent touchpoints
 */

export type AttributionModel = "first_touch" | "last_touch" | "linear" | "time_decay";

export type TouchPoint = {
  source: string;
  medium: string | null;
  campaign: string | null;
  timestamp: Date;
};

export type AttributionResult = {
  source: string;
  credit: number; // 0-1
  leads: number;
  conversions: number;
};

export async function calculateAttribution(
  userId: string,
  model: AttributionModel = "linear"
): Promise<AttributionResult[]> {
  const leads = await prisma.lead.findMany({
    where: { userId },
    select: {
      source: true,
      medium: true,
      campaign: true,
      createdAt: true,
      stageId: true,
      stageHistory: {
        select: { stage: { select: { eventName: true } }, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const purchaseStages = await prisma.stage.findMany({
    where: { userId, eventName: "Purchase" },
    select: { id: true },
  });
  const purchaseIds = new Set(purchaseStages.map((s) => s.id));

  const creditMap = new Map<string, { credit: number; leads: number; conversions: number }>();

  for (const lead of leads) {
    const source = lead.source || "direto";
    const isConverted = lead.stageId ? purchaseIds.has(lead.stageId) : false;

    // Build touchpoints from stage history
    const touchpoints: TouchPoint[] = [
      { source, medium: lead.medium, campaign: lead.campaign, timestamp: lead.createdAt },
    ];

    // Each stage transition counts as a touchpoint attributed to original source
    for (const sh of lead.stageHistory) {
      touchpoints.push({
        source,
        medium: lead.medium,
        campaign: lead.campaign,
        timestamp: sh.createdAt,
      });
    }

    // Calculate credit based on model
    const credits = applyModel(touchpoints, model);

    for (const [src, credit] of Object.entries(credits)) {
      const entry = creditMap.get(src) || { credit: 0, leads: 0, conversions: 0 };
      entry.credit += credit;
      entry.leads++;
      if (isConverted) entry.conversions++;
      creditMap.set(src, entry);
    }
  }

  return Array.from(creditMap.entries())
    .map(([source, data]) => ({
      source,
      credit: Math.round(data.credit * 100) / 100,
      leads: data.leads,
      conversions: data.conversions,
    }))
    .sort((a, b) => b.credit - a.credit);
}

function applyModel(touchpoints: TouchPoint[], model: AttributionModel): Record<string, number> {
  const credits: Record<string, number> = {};

  if (touchpoints.length === 0) return credits;

  switch (model) {
    case "first_touch": {
      const first = touchpoints[0].source;
      credits[first] = 1;
      break;
    }

    case "last_touch": {
      const last = touchpoints[touchpoints.length - 1].source;
      credits[last] = 1;
      break;
    }

    case "linear": {
      const weight = 1 / touchpoints.length;
      for (const tp of touchpoints) {
        credits[tp.source] = (credits[tp.source] || 0) + weight;
      }
      break;
    }

    case "time_decay": {
      const now = Date.now();
      const halfLife = 7 * 24 * 60 * 60 * 1000; // 7 days
      let totalWeight = 0;
      const weights: number[] = [];

      for (const tp of touchpoints) {
        const age = now - tp.timestamp.getTime();
        const weight = Math.pow(0.5, age / halfLife);
        weights.push(weight);
        totalWeight += weight;
      }

      for (let i = 0; i < touchpoints.length; i++) {
        const normalized = totalWeight > 0 ? weights[i] / totalWeight : 0;
        credits[touchpoints[i].source] = (credits[touchpoints[i].source] || 0) + normalized;
      }
      break;
    }
  }

  return credits;
}

// ── UTM Builder ──────────────────────────────────────────────

export function buildUTMUrl(params: {
  baseUrl: string;
  source: string;
  medium: string;
  campaign: string;
  content?: string;
  term?: string;
}): string {
  const url = new URL(params.baseUrl);
  url.searchParams.set("utm_source", params.source);
  url.searchParams.set("utm_medium", params.medium);
  url.searchParams.set("utm_campaign", params.campaign);
  if (params.content) url.searchParams.set("utm_content", params.content);
  if (params.term) url.searchParams.set("utm_term", params.term);
  return url.toString();
}

// ── Enhanced Conversions (hashed user data for CAPI) ─────────

import { createHash } from "crypto";

export function hashForCAPI(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export async function sendEnhancedConversion(params: {
  pixelId: string;
  accessToken: string;
  eventName: string;
  leadPhone: string;
  leadEmail?: string;
  leadName?: string;
  value?: number;
  currency?: string;
}) {
  const userData: Record<string, string[]> = {};
  userData.ph = [hashForCAPI(params.leadPhone)];
  if (params.leadEmail) userData.em = [hashForCAPI(params.leadEmail)];
  if (params.leadName) {
    const parts = params.leadName.split(" ");
    userData.fn = [hashForCAPI(parts[0])];
    if (parts.length > 1) userData.ln = [hashForCAPI(parts[parts.length - 1])];
  }
  userData.country = ["br"];

  const eventData: Record<string, unknown> = {
    event_name: params.eventName,
    event_time: Math.floor(Date.now() / 1000),
    action_source: "website",
    user_data: userData,
  };

  if (params.value) {
    eventData.custom_data = {
      value: params.value,
      currency: params.currency || "BRL",
    };
  }

  const res = await fetch(
    `https://graph.facebook.com/v18.0/${params.pixelId}/events?access_token=${params.accessToken}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [eventData] }),
    }
  );

  return res.ok;
}

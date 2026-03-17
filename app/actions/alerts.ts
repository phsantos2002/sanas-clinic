"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import { getSelectedCampaignData, getMetaAds, type MetaAd, type MetaCampaignFull } from "./meta";

// ─── Types ───

export type AlertType =
  | "HIGH_FREQUENCY"
  | "CREATIVE_FATIGUE"
  | "HIGH_CPM"
  | "LOW_CTR"
  | "BUDGET_EXHAUSTED"
  | "LEARNING_LIMITED";

export type AlertSeverity = "WARNING" | "CRITICAL";

type AlertRule = {
  type: AlertType;
  check: (ctx: AlertContext) => AlertCandidate | null;
};

type AlertContext = {
  campaign: MetaCampaignFull;
  ads: MetaAd[];
  monthlyBudget: number | null;
  accountPhase: string | null;
};

type AlertCandidate = {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  suggestion: string;
  campaignId?: string;
  adSetId?: string;
  adId?: string;
};

// ─── Alert Rules ───

const ALERT_RULES: AlertRule[] = [
  {
    type: "HIGH_FREQUENCY",
    check: ({ ads, campaign }) => {
      const highFreqAd = ads.find((a) => a.status === "ACTIVE" && a.frequency >= 3.5);
      if (!highFreqAd) return null;
      return {
        type: "HIGH_FREQUENCY",
        severity: highFreqAd.frequency >= 5 ? "CRITICAL" : "WARNING",
        message: `Frequência alta no anúncio "${highFreqAd.name}" (${highFreqAd.frequency.toFixed(1)}x)`,
        suggestion: "O público está vendo o anúncio muitas vezes. Considere pausar e criar um novo criativo ou expandir o público.",
        campaignId: campaign.id,
        adId: highFreqAd.id,
      };
    },
  },
  {
    type: "CREATIVE_FATIGUE",
    check: ({ ads, campaign }) => {
      const fatiguedAd = ads.find(
        (a) => a.status === "ACTIVE" && a.frequency >= 2.5 && a.ctr < 0.8 && a.impressions > 1000
      );
      if (!fatiguedAd) return null;
      return {
        type: "CREATIVE_FATIGUE",
        severity: "WARNING",
        message: `Criativo "${fatiguedAd.name}" está saturando (freq: ${fatiguedAd.frequency.toFixed(1)}x, CTR: ${fatiguedAd.ctr.toFixed(2)}%)`,
        suggestion: "O criativo perdeu eficácia. Prepare um substituto com novo visual ou copy diferente.",
        campaignId: campaign.id,
        adId: fatiguedAd.id,
      };
    },
  },
  {
    type: "HIGH_CPM",
    check: ({ campaign }) => {
      if (campaign.cpm <= 0 || campaign.impressions < 1000) return null;
      if (campaign.cpm < 60) return null;
      return {
        type: "HIGH_CPM",
        severity: campaign.cpm >= 100 ? "CRITICAL" : "WARNING",
        message: `CPM alto: R$ ${campaign.cpm.toFixed(2)} (campanha "${campaign.name}")`,
        suggestion: "CPM elevado indica público saturado ou leilão muito competitivo. Teste públicos mais amplos ou ajuste o bid cap.",
        campaignId: campaign.id,
      };
    },
  },
  {
    type: "LOW_CTR",
    check: ({ campaign }) => {
      if (campaign.impressions < 1000) return null;
      if (campaign.ctr >= 0.5) return null;
      return {
        type: "LOW_CTR",
        severity: campaign.ctr < 0.2 ? "CRITICAL" : "WARNING",
        message: `CTR baixo: ${campaign.ctr.toFixed(2)}% (campanha "${campaign.name}")`,
        suggestion: "Poucos cliques em relação às impressões. Revise os criativos, headlines e a segmentação do público.",
        campaignId: campaign.id,
      };
    },
  },
  {
    type: "BUDGET_EXHAUSTED",
    check: ({ campaign, monthlyBudget }) => {
      if (!monthlyBudget || monthlyBudget <= 0) return null;
      const spendRatio = campaign.spend / monthlyBudget;
      // If more than 85% spent in 30 days
      if (spendRatio < 0.85) return null;
      return {
        type: "BUDGET_EXHAUSTED",
        severity: spendRatio >= 0.95 ? "CRITICAL" : "WARNING",
        message: `Verba quase esgotada: ${(spendRatio * 100).toFixed(0)}% do orçamento mensal consumido`,
        suggestion: "O gasto está próximo do limite mensal. Considere reduzir o orçamento diário ou pausar campanhas menos eficientes.",
        campaignId: campaign.id,
      };
    },
  },
  {
    type: "LEARNING_LIMITED",
    check: ({ campaign, accountPhase }) => {
      if (accountPhase !== "LEARNING") return null;
      if (campaign.impressions < 500) return null;
      // In learning phase with low conversion signals
      if (campaign.ctr >= 1.0) return null; // CTR is decent, probably fine
      return {
        type: "LEARNING_LIMITED",
        severity: "WARNING",
        message: `Conta em fase de aprendizado com poucos sinais de conversão`,
        suggestion: "Evite fazer mudanças frequentes na campanha durante a fase de aprendizado. Aguarde 50+ conversões antes de otimizar.",
        campaignId: campaign.id,
      };
    },
  },
];

// ─── Generate Alerts ───

export async function generateAlerts(userId: string): Promise<{
  success: boolean;
  alerts: Array<{
    id: string;
    type: string;
    severity: string;
    message: string;
    suggestion: string;
    resolved: boolean;
    createdAt: Date;
  }>;
}> {
  try {
    const user = await getCurrentUser();
    if (!user || user.id !== userId) return { success: false, alerts: [] };

    // Get pixel config for monthly budget and account phase
    const pixel = await prisma.pixel.findUnique({
      where: { userId },
      select: { monthlyBudget: true, accountPhase: true },
    });

    // Get campaign data
    const selectedData = await getSelectedCampaignData();
    if (!selectedData.campaign) {
      // No campaign selected, return existing alerts
      const existing = await prisma.alert.findMany({
        where: { userId, resolved: false },
        orderBy: { createdAt: "desc" },
      });
      return { success: true, alerts: existing };
    }

    // Collect all ads from all ad sets
    const allAds: MetaAd[] = [];
    for (const adSet of selectedData.adSets) {
      const ads = await getMetaAds(adSet.id);
      allAds.push(...ads);
    }

    const ctx: AlertContext = {
      campaign: selectedData.campaign,
      ads: allAds,
      monthlyBudget: pixel?.monthlyBudget ?? null,
      accountPhase: pixel?.accountPhase ?? null,
    };

    // Run all rules
    const candidates: AlertCandidate[] = [];
    for (const rule of ALERT_RULES) {
      const result = rule.check(ctx);
      if (result) candidates.push(result);
    }

    // Mark old unresolved alerts of same types as resolved (avoid duplicates)
    const candidateTypes = candidates.map((c) => c.type);
    if (candidateTypes.length > 0) {
      await prisma.alert.updateMany({
        where: {
          userId,
          type: { in: candidateTypes },
          resolved: false,
        },
        data: { resolved: true },
      });
    }

    // Create new alerts
    if (candidates.length > 0) {
      await prisma.alert.createMany({
        data: candidates.map((c) => ({
          type: c.type,
          severity: c.severity,
          message: c.message,
          suggestion: c.suggestion,
          campaignId: c.campaignId ?? null,
          adSetId: c.adSetId ?? null,
          adId: c.adId ?? null,
          userId,
        })),
      });
    }

    // Return all current unresolved alerts
    const alerts = await prisma.alert.findMany({
      where: { userId, resolved: false },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, alerts };
  } catch (e) {
    console.error("[Alerts] generateAlerts error:", e);
    return { success: false, alerts: [] };
  }
}

// ─── Resolve Alert ───

export async function resolveAlert(alertId: string): Promise<{ success: boolean }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false };

    await prisma.alert.update({
      where: { id: alertId, userId: user.id },
      data: { resolved: true },
    });

    return { success: true };
  } catch (e) {
    console.error("[Alerts] resolveAlert error:", e);
    return { success: false };
  }
}

// ─── Get Alerts ───

export async function getAlerts(userId: string): Promise<Array<{
  id: string;
  type: string;
  severity: string;
  message: string;
  suggestion: string;
  resolved: boolean;
  createdAt: Date;
}>> {
  try {
    return await prisma.alert.findMany({
      where: { userId, resolved: false },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  } catch {
    return [];
  }
}

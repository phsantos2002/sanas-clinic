"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import type { ActionResult, Pixel, CampaignConfig } from "@/types";

function maskToken(token: string): string {
  if (token.length <= 8) return "•".repeat(token.length);
  return token.slice(0, 4) + "•".repeat(Math.max(0, token.length - 8)) + token.slice(-4);
}

export async function getPixel(): Promise<Pixel | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const pixel = await prisma.pixel.findUnique({ where: { userId: user.id } });
  if (!pixel) return null;

  return {
    ...pixel,
    accessToken: maskToken(pixel.accessToken),
    metaAdsToken: pixel.metaAdsToken ? maskToken(pixel.metaAdsToken) : null,
  } as Pixel;
}

export async function savePixel(
  pixelId: string,
  accessToken: string,
  adAccountId?: string,
  metaAdsToken?: string
): Promise<ActionResult<Pixel>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  const isMasked = (v: string) => v.includes("•");

  try {
    const existing = await prisma.pixel.findUnique({ where: { userId: user.id } });

    const finalAccessToken = isMasked(accessToken) ? existing?.accessToken ?? "" : accessToken.trim();
    const finalMetaAdsToken = metaAdsToken && !isMasked(metaAdsToken) ? metaAdsToken.trim() : (existing?.metaAdsToken ?? null);

    const pixel = await prisma.pixel.upsert({
      where: { userId: user.id },
      update: {
        pixelId: pixelId.trim(),
        accessToken: finalAccessToken,
        adAccountId: adAccountId?.trim() || null,
        metaAdsToken: finalMetaAdsToken,
      },
      create: {
        pixelId: pixelId.trim(),
        accessToken: finalAccessToken,
        adAccountId: adAccountId?.trim() || null,
        metaAdsToken: finalMetaAdsToken,
        userId: user.id,
      },
    });
    revalidatePath("/dashboard/settings");
    return { success: true, data: { ...pixel, accessToken: maskToken(pixel.accessToken), metaAdsToken: pixel.metaAdsToken ? maskToken(pixel.metaAdsToken) : null } as Pixel };
  } catch {
    return { success: false, error: "Erro ao salvar pixel" };
  }
}

export async function saveSelectedCampaign(
  campaignId: string | null
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  try {
    await prisma.pixel.update({
      where: { userId: user.id },
      data: { selectedCampaignId: campaignId || null },
    });
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/meta");
    revalidatePath("/dashboard/analytics");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao salvar campanha" };
  }
}

export async function saveCampaignObjective(data: {
  campaignObjective: string;
  conversionDestination: string;
  monthlyBudget: number | null;
  bidStrategy?: string | null;
  businessSegment?: string | null;
  coverageArea?: string | null;
  conversionValue?: number | null;
  maxCostPerResult?: number | null;
  bidValue?: number | null;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  try {
    await prisma.pixel.update({
      where: { userId: user.id },
      data: {
        campaignObjective: data.campaignObjective || null,
        conversionDestination: data.conversionDestination || null,
        monthlyBudget: data.monthlyBudget,
        ...(data.bidStrategy !== undefined ? { bidStrategy: data.bidStrategy || null } : {}),
        ...(data.businessSegment !== undefined ? { businessSegment: data.businessSegment || null } : {}),
        ...(data.coverageArea !== undefined ? { coverageArea: data.coverageArea || null } : {}),
        ...(data.conversionValue !== undefined ? { conversionValue: data.conversionValue } : {}),
        ...(data.maxCostPerResult !== undefined ? { maxCostPerResult: data.maxCostPerResult } : {}),
        ...(data.bidValue !== undefined ? { bidValue: data.bidValue } : {}),
      },
    });
    revalidatePath("/dashboard/meta");
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao salvar objetivo da campanha" };
  }
}

export async function testPixelConnection(): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Não autenticado" };

    const pixel = await prisma.pixel.findUnique({ where: { userId: user.id } });
    if (!pixel) return { success: false, error: "Pixel não configurado" };

    // Send a test event
    const payload = {
      data: [
        {
          event_name: "TestEvent",
          event_time: Math.floor(Date.now() / 1000),
          user_data: { ph: ["0000000000000000000000000000000000000000000000000000000000000000"] },
          action_source: "system_generated",
        },
      ],
      test_event_code: "TEST" + Date.now().toString().slice(-5),
    };

    const res = await fetch(
      `https://graph.facebook.com/v18.0/${pixel.pixelId}/events?access_token=${pixel.accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      return { success: false, error: err.error?.message ?? "Falha no teste do Pixel" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Erro ao testar Pixel" };
  }
}

// ─── Campaign Config ───

export async function getCampaignConfig(campaignId: string): Promise<CampaignConfig | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const config = await prisma.campaignConfig.findUnique({
    where: { campaignId_userId: { campaignId, userId: user.id } },
  });

  return config as CampaignConfig | null;
}

export async function getAllCampaignConfigs(): Promise<CampaignConfig[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const configs = await prisma.campaignConfig.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  return configs as CampaignConfig[];
}

export async function saveCampaignConfig(data: {
  campaignId: string;
  campaignName: string;
  campaignObjective: string;
  conversionDestination: string;
  businessSegment?: string | null;
  conversionValue?: number | null;
  maxCostPerResult?: number | null;
  monthlyBudget?: number | null;
  bidStrategy: string;
  bidValue?: number | null;
}): Promise<ActionResult<CampaignConfig>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  try {
    const config = await prisma.campaignConfig.upsert({
      where: { campaignId_userId: { campaignId: data.campaignId, userId: user.id } },
      update: {
        campaignName: data.campaignName,
        campaignObjective: data.campaignObjective,
        conversionDestination: data.conversionDestination,
        businessSegment: data.businessSegment ?? null,
        conversionValue: data.conversionValue ?? null,
        maxCostPerResult: data.maxCostPerResult ?? null,
        monthlyBudget: data.monthlyBudget ?? null,
        bidStrategy: data.bidStrategy,
        bidValue: data.bidValue ?? null,
      },
      create: {
        campaignId: data.campaignId,
        campaignName: data.campaignName,
        campaignObjective: data.campaignObjective,
        conversionDestination: data.conversionDestination,
        businessSegment: data.businessSegment ?? null,
        conversionValue: data.conversionValue ?? null,
        maxCostPerResult: data.maxCostPerResult ?? null,
        monthlyBudget: data.monthlyBudget ?? null,
        bidStrategy: data.bidStrategy,
        bidValue: data.bidValue ?? null,
        userId: user.id,
      },
    });

    revalidatePath("/dashboard/meta");
    revalidatePath("/dashboard/settings");
    return { success: true, data: config as CampaignConfig };
  } catch {
    return { success: false, error: "Erro ao salvar configuração da campanha" };
  }
}

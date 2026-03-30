"use server";

import { getCurrentUser } from "./user";
import { generateMarketAnalysis, searchCompetitorAds } from "@/services/marketIntelligence";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/types";

export async function runMarketAnalysis(params: {
  competitors?: string[];
  niche?: string;
  focus?: "ads" | "content" | "positioning" | "full";
}): Promise<ActionResult<{
  analysis: string;
  suggestions: string[];
  copyVariations: { angle: string; copies: string[] }[];
  gaps: string[];
  positioning: string;
}>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  try {
    const result = await generateMarketAnalysis(user.id, params);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro na analise de mercado",
    };
  }
}

export async function getCompetitorAds(searchTerms: string) {
  const user = await getCurrentUser();
  if (!user) return [];

  const pixel = await prisma.pixel.findUnique({
    where: { userId: user.id },
    select: { metaAdsToken: true },
  });
  if (!pixel?.metaAdsToken) return [];

  return searchCompetitorAds({
    searchTerms,
    accessToken: pixel.metaAdsToken,
    limit: 20,
  });
}

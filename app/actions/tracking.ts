"use server";

import { getCurrentUser } from "./user";
import { calculateAttribution, buildUTMUrl, type AttributionModel } from "@/services/attribution";
import type { ActionResult } from "@/types";

export async function getAttributionReport(model: AttributionModel = "linear") {
  const user = await getCurrentUser();
  if (!user) return [];

  return calculateAttribution(user.id, model);
}

export async function generateUTMLink(params: {
  baseUrl: string;
  source: string;
  medium: string;
  campaign: string;
  content?: string;
  term?: string;
}): Promise<ActionResult<{ url: string }>> {
  if (!params.baseUrl || !params.source || !params.medium || !params.campaign) {
    return { success: false, error: "URL, source, medium e campaign obrigatorios" };
  }

  try {
    const url = buildUTMUrl(params);
    return { success: true, data: { url } };
  } catch {
    return { success: false, error: "URL invalida" };
  }
}

"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";

// ─── Types ───

export type ActionType =
  | "PAUSE"
  | "ACTIVATE"
  | "BUDGET_CHANGE"
  | "BID_CHANGE"
  | "STRATEGY_CHANGE"
  | "AD_CREATED";

export type EntityType = "CAMPAIGN" | "ADSET" | "AD";

// ─── Record Action ───

export async function recordCampaignAction(data: {
  type: ActionType;
  entityType: EntityType;
  entityId: string;
  entityName: string;
  before?: string | null;
  after?: string | null;
}): Promise<{ success: boolean }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false };

    await prisma.campaignAction.create({
      data: {
        type: data.type,
        entityType: data.entityType,
        entityId: data.entityId,
        entityName: data.entityName,
        before: data.before ?? null,
        after: data.after ?? null,
        userId: user.id,
      },
    });

    return { success: true };
  } catch (e) {
    console.error("[CampaignActions] record error:", e);
    return { success: false };
  }
}

// ─── Get Recent Actions ───

export async function getCampaignActions(limit = 20): Promise<Array<{
  id: string;
  type: string;
  entityType: string;
  entityId: string;
  entityName: string;
  before: string | null;
  after: string | null;
  createdAt: Date;
}>> {
  try {
    const user = await getCurrentUser();
    if (!user) return [];

    return await prisma.campaignAction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  } catch {
    return [];
  }
}

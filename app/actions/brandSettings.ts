"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "./user";
import type { ActionResult } from "@/types";

// ── Types ────────────────────────────────────────────────────

export type BrandIdentity = {
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  font?: string;
  business_type?: string;
  default_tone?: string;
  target_audience?: string;
};

export type ContentGenSettings = {
  brandIdentity: BrandIdentity;
  aiImageProvider: string;
  aiImageApiKey: string;
  aiVideoProvider: string;
  aiVideoApiKey: string;
};

// ── Get ──────────────────────────────────────────────────────

export async function getContentGenSettings(): Promise<ContentGenSettings | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const config = await prisma.aIConfig.findUnique({
    where: { userId: user.id },
  });
  if (!config) return null;

  const maskKey = (key: string | null | undefined): string => {
    if (!key) return "";
    if (key.length <= 8) return "••••••••";
    return key.slice(0, 4) + "•".repeat(Math.max(0, key.length - 8)) + key.slice(-4);
  };

  return {
    brandIdentity: (config.brandIdentity as BrandIdentity) || {},
    aiImageProvider: config.aiImageProvider || "openai",
    aiImageApiKey: maskKey(config.aiImageApiKey),
    aiVideoProvider: config.aiVideoProvider || "none",
    aiVideoApiKey: maskKey(config.aiVideoApiKey),
  };
}

// ── Save Brand Identity ──────────────────────────────────────

export async function saveBrandIdentity(data: BrandIdentity): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  try {
    await prisma.aIConfig.upsert({
      where: { userId: user.id },
      update: { brandIdentity: data as unknown as Prisma.InputJsonValue },
      create: {
        userId: user.id,
        brandIdentity: data as unknown as Prisma.InputJsonValue,
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao salvar identidade visual" };
  }
}

// ── Save AI Content Keys ─────────────────────────────────────

export async function saveContentGenKeys(data: {
  aiImageProvider: string;
  aiImageApiKey: string;
  aiVideoProvider: string;
  aiVideoApiKey: string;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  const isMasked = (v: string) => v.includes("•");

  try {
    await prisma.aIConfig.upsert({
      where: { userId: user.id },
      update: {
        aiImageProvider: data.aiImageProvider,
        ...(isMasked(data.aiImageApiKey) ? {} : { aiImageApiKey: data.aiImageApiKey || null }),
        aiVideoProvider: data.aiVideoProvider,
        ...(isMasked(data.aiVideoApiKey) ? {} : { aiVideoApiKey: data.aiVideoApiKey || null }),
      },
      create: {
        userId: user.id,
        aiImageProvider: data.aiImageProvider,
        aiImageApiKey: isMasked(data.aiImageApiKey) ? null : data.aiImageApiKey || null,
        aiVideoProvider: data.aiVideoProvider,
        aiVideoApiKey: isMasked(data.aiVideoApiKey) ? null : data.aiVideoApiKey || null,
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao salvar chaves de API" };
  }
}

// ── Get AI Usage Stats ───────────────────────────────────────

export async function getAIUsageStats() {
  const user = await getCurrentUser();
  if (!user) return null;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const logs = await prisma.aiUsageLog.findMany({
    where: {
      userId: user.id,
      createdAt: { gte: startOfMonth },
    },
  });

  const stats = {
    captions: 0,
    images: 0,
    videos: 0,
    totalCostUsd: 0,
  };

  for (const log of logs) {
    if (log.operation === "caption") stats.captions++;
    if (log.operation === "image") stats.images++;
    if (log.operation === "video") stats.videos++;
    stats.totalCostUsd += log.costUsd || 0;
  }

  return stats;
}

// ── Business Profile ─────────────────────────────────────────

export async function getBusinessProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  const config = await prisma.aIConfig.findUnique({ where: { userId: user.id } });
  return (config?.businessProfile as Record<string, string>) || null;
}

export async function saveBusinessProfile(data: Record<string, string>): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };
  try {
    await prisma.aIConfig.upsert({
      where: { userId: user.id },
      update: { businessProfile: JSON.parse(JSON.stringify(data)) },
      create: { userId: user.id, businessProfile: JSON.parse(JSON.stringify(data)) },
    });
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao salvar perfil" };
  }
}

// ── Automations ──────────────────────────────────────────────

export async function getAutomations() {
  const user = await getCurrentUser();
  if (!user) return null;
  const config = await prisma.aIConfig.findUnique({ where: { userId: user.id } });
  return (config?.automations as Record<string, boolean>) || null;
}

export async function saveAutomations(data: Record<string, boolean>): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };
  try {
    await prisma.aIConfig.upsert({
      where: { userId: user.id },
      update: { automations: JSON.parse(JSON.stringify(data)) },
      create: { userId: user.id, automations: JSON.parse(JSON.stringify(data)) },
    });
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao salvar automacoes" };
  }
}

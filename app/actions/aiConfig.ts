"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import type { ActionResult } from "@/types";

export type AIConfigData = {
  clinicName: string;
  systemPrompt: string;
  sendAudio: boolean;
  provider: string;
  model: string;
  capabilities: string;
  apiKey: string;
  voiceClonePrompt: string;
  openaiKey: string;
  anthropicKey: string;
};

function maskKey(k: string) {
  return k ? k.slice(0, 4) + "•".repeat(Math.max(0, k.length - 8)) + k.slice(-4) : "";
}

export async function getAIConfig(): Promise<AIConfigData | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const config = await prisma.aIConfig.findUnique({
    where: { userId: user.id },
  });

  return {
    clinicName: config?.clinicName ?? "Sanas Pulse",
    systemPrompt: config?.systemPrompt ?? "",
    sendAudio: config?.sendAudio ?? false,
    provider: config?.provider ?? "openai",
    model: config?.model ?? "gpt-4o-mini",
    capabilities: config?.capabilities ?? "text",
    apiKey: maskKey(config?.apiKey ?? ""),
    voiceClonePrompt: config?.voiceClonePrompt ?? "",
    openaiKey: maskKey(config?.openaiKey ?? ""),
    anthropicKey: maskKey(config?.anthropicKey ?? ""),
  };
}

export async function saveAIConfig(data: AIConfigData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  // If keys contain mask chars (•), keep existing value
  const isMasked = (v: string) => v.includes("•");
  const apiKey = isMasked(data.apiKey) ? undefined : data.apiKey || null;
  const openaiKey = isMasked(data.openaiKey) ? undefined : data.openaiKey || null;
  const anthropicKey = isMasked(data.anthropicKey) ? undefined : data.anthropicKey || null;

  try {
    await prisma.aIConfig.upsert({
      where: { userId: user.id },
      update: {
        clinicName: data.clinicName,
        systemPrompt: data.systemPrompt || null,
        sendAudio: data.sendAudio,
        provider: data.provider,
        model: data.model,
        capabilities: data.capabilities,
        ...(apiKey !== undefined && { apiKey }),
        voiceClonePrompt: data.voiceClonePrompt || null,
        ...(openaiKey !== undefined && { openaiKey }),
        ...(anthropicKey !== undefined && { anthropicKey }),
      },
      create: {
        userId: user.id,
        clinicName: data.clinicName,
        systemPrompt: data.systemPrompt || null,
        sendAudio: data.sendAudio,
        provider: data.provider,
        model: data.model,
        capabilities: data.capabilities,
        apiKey: apiKey ?? null,
        voiceClonePrompt: data.voiceClonePrompt || null,
        openaiKey: openaiKey ?? null,
        anthropicKey: anthropicKey ?? null,
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao salvar configurações de IA" };
  }
}

// Used internally by the webhook
export async function getAIConfigByUserId(userId: string) {
  return prisma.aIConfig.findUnique({ where: { userId } });
}

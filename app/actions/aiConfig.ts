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
};

export async function getAIConfig(): Promise<AIConfigData | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const config = await prisma.aIConfig.findUnique({
    where: { userId: user.id },
  });

  return {
    clinicName: config?.clinicName ?? "Sanas Clinic",
    systemPrompt: config?.systemPrompt ?? "",
    sendAudio: config?.sendAudio ?? false,
    provider: config?.provider ?? "openai",
    model: config?.model ?? "gpt-4o-mini",
    capabilities: config?.capabilities ?? "text",
    apiKey: config?.apiKey ?? "",
    voiceClonePrompt: config?.voiceClonePrompt ?? "",
    openaiKey: config?.openaiKey ?? "",
  };
}

export async function saveAIConfig(data: AIConfigData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

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
        apiKey: data.apiKey || null,
        voiceClonePrompt: data.voiceClonePrompt || null,
        openaiKey: data.openaiKey || null,
      },
      create: {
        userId: user.id,
        clinicName: data.clinicName,
        systemPrompt: data.systemPrompt || null,
        sendAudio: data.sendAudio,
        provider: data.provider,
        model: data.model,
        capabilities: data.capabilities,
        apiKey: data.apiKey || null,
        voiceClonePrompt: data.voiceClonePrompt || null,
        openaiKey: data.openaiKey || null,
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

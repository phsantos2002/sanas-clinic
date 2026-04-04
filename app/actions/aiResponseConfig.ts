"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";

export type AIResponseConfig = {
  // Response behavior
  keepUnread: boolean;
  singleMessage: boolean;
  includeContactName: boolean;
  cancelOnNewMsg: boolean;
  pauseAfterManual: boolean;
  // Timers
  delayPerChar: number;
  delayMax: number;
  waitBeforeReply: number;
  // Human intervention
  humanIntervention: boolean;
  humanPauseHours: number;
  // Filters
  whitelist: string[];
  blacklist: string[];
  ignoreGroups: boolean;
  // Follow-up
  followUpEnabled: boolean;
  followUpMessages: number;
  followUpCheckMins: number;
  followUpIntervalH: number;
  followUpUseAI: boolean;
  followUpRespectBH: boolean;
  // Unknown types
  unknownTypeMsg: string;
  // Audio
  audioVoice: string;
  audioMinChars: number;
  audioAutoReply: boolean;
  audioReplaceText: boolean;
};

export async function getAIResponseConfig(): Promise<AIResponseConfig | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const config = await prisma.aIConfig.findUnique({ where: { userId: user.id } });
  if (!config) return null;

  return {
    keepUnread: config.keepUnread,
    singleMessage: config.singleMessage,
    includeContactName: config.includeContactName,
    cancelOnNewMsg: config.cancelOnNewMsg,
    pauseAfterManual: config.pauseAfterManual,
    delayPerChar: config.delayPerChar,
    delayMax: config.delayMax,
    waitBeforeReply: config.waitBeforeReply,
    humanIntervention: config.humanIntervention,
    humanPauseHours: config.humanPauseHours,
    whitelist: config.whitelist,
    blacklist: config.blacklist,
    ignoreGroups: config.ignoreGroups,
    followUpEnabled: config.followUpEnabled,
    followUpMessages: config.followUpMessages,
    followUpCheckMins: config.followUpCheckMins,
    followUpIntervalH: config.followUpIntervalH,
    followUpUseAI: config.followUpUseAI,
    followUpRespectBH: config.followUpRespectBH,
    unknownTypeMsg: config.unknownTypeMsg || "Você pode me dar mais detalhes?",
    audioVoice: config.audioVoice || "alloy",
    audioMinChars: config.audioMinChars,
    audioAutoReply: config.audioAutoReply,
    audioReplaceText: config.audioReplaceText,
  };
}

export async function saveAIResponseConfig(data: AIResponseConfig) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  try {
    await prisma.aIConfig.upsert({
      where: { userId: user.id },
      update: {
        keepUnread: data.keepUnread,
        singleMessage: data.singleMessage,
        includeContactName: data.includeContactName,
        cancelOnNewMsg: data.cancelOnNewMsg,
        pauseAfterManual: data.pauseAfterManual,
        delayPerChar: data.delayPerChar,
        delayMax: data.delayMax,
        waitBeforeReply: data.waitBeforeReply,
        humanIntervention: data.humanIntervention,
        humanPauseHours: data.humanPauseHours,
        whitelist: data.whitelist,
        blacklist: data.blacklist,
        ignoreGroups: data.ignoreGroups,
        followUpEnabled: data.followUpEnabled,
        followUpMessages: data.followUpMessages,
        followUpCheckMins: data.followUpCheckMins,
        followUpIntervalH: data.followUpIntervalH,
        followUpUseAI: data.followUpUseAI,
        followUpRespectBH: data.followUpRespectBH,
        unknownTypeMsg: data.unknownTypeMsg || null,
        audioVoice: data.audioVoice || "alloy",
        audioMinChars: data.audioMinChars,
        audioAutoReply: data.audioAutoReply,
        audioReplaceText: data.audioReplaceText,
      },
      create: {
        userId: user.id,
        keepUnread: data.keepUnread,
        singleMessage: data.singleMessage,
        includeContactName: data.includeContactName,
        cancelOnNewMsg: data.cancelOnNewMsg,
        pauseAfterManual: data.pauseAfterManual,
        delayPerChar: data.delayPerChar,
        delayMax: data.delayMax,
        waitBeforeReply: data.waitBeforeReply,
        humanIntervention: data.humanIntervention,
        humanPauseHours: data.humanPauseHours,
        whitelist: data.whitelist,
        blacklist: data.blacklist,
        ignoreGroups: data.ignoreGroups,
        followUpEnabled: data.followUpEnabled,
        followUpMessages: data.followUpMessages,
        followUpCheckMins: data.followUpCheckMins,
        followUpIntervalH: data.followUpIntervalH,
        followUpUseAI: data.followUpUseAI,
        followUpRespectBH: data.followUpRespectBH,
        unknownTypeMsg: data.unknownTypeMsg || null,
        audioVoice: data.audioVoice || "alloy",
        audioMinChars: data.audioMinChars,
        audioAutoReply: data.audioAutoReply,
        audioReplaceText: data.audioReplaceText,
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao salvar configurações" };
  }
}

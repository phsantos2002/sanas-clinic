"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import { chatWithAgent, getAgentDefinitions, type AgentType } from "@/services/aiAgents";
import type { ActionResult } from "@/types";

// ── Types ────────────────────────────────────────────────────

export type AgentChatData = {
  id: string;
  agentType: string;
  title: string | null;
  messages: { role: string; content: string; timestamp?: string }[];
  feedback: string | null;
  createdAt: Date;
};

// ── Get agent list ───────────────────────────────────────────

export async function getAgents() {
  return getAgentDefinitions();
}

// ── Chat ─────────────────────────────────────────────────────

export async function sendAgentMessage(
  agentType: string,
  message: string,
  chatId?: string
): Promise<ActionResult<{ chatId: string; reply: string }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  if (!message?.trim()) return { success: false, error: "Mensagem obrigatoria" };

  try {
    const result = await chatWithAgent(user.id, agentType as AgentType, message.trim(), chatId);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao conversar com agente",
    };
  }
}

// ── History ──────────────────────────────────────────────────

export async function getAgentChats(agentType?: string): Promise<AgentChatData[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const where: Record<string, unknown> = { userId: user.id };
  if (agentType) where.agentType = agentType;

  const chats = await prisma.aIAgentChat.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 30,
  });

  return chats.map((c) => ({
    id: c.id,
    agentType: c.agentType,
    title: c.title,
    messages: c.messages as AgentChatData["messages"],
    feedback: c.feedback,
    createdAt: c.createdAt,
  }));
}

export async function getAgentChat(chatId: string): Promise<AgentChatData | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const chat = await prisma.aIAgentChat.findFirst({
    where: { id: chatId, userId: user.id },
  });
  if (!chat) return null;

  return {
    id: chat.id,
    agentType: chat.agentType,
    title: chat.title,
    messages: chat.messages as AgentChatData["messages"],
    feedback: chat.feedback,
    createdAt: chat.createdAt,
  };
}

// ── Feedback ─────────────────────────────────────────────────

export async function setAgentFeedback(
  chatId: string,
  feedback: "approved" | "rejected" | "edited"
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  await prisma.aIAgentChat.updateMany({
    where: { id: chatId, userId: user.id },
    data: { feedback },
  });

  return { success: true };
}

// ── Delete ───────────────────────────────────────────────────

export async function deleteAgentChat(chatId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  await prisma.aIAgentChat.deleteMany({
    where: { id: chatId, userId: user.id },
  });

  return { success: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import type { ActionResult } from "@/types";

export async function getLeadsWithMessages() {
  const user = await getCurrentUser();
  if (!user) return [];

  return prisma.lead.findMany({
    where: { userId: user.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      stage: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function toggleAI(leadId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId: user.id },
  });
  if (!lead) return { success: false, error: "Lead não encontrado" };

  const nextEnabled = !lead.aiEnabled;
  await prisma.lead.update({
    where: { id: leadId },
    // Re-enabling the AI also cancels any active humanPaused timer so the
    // operator can immediately resume automation after replying manually.
    data: nextEnabled ? { aiEnabled: true, humanPausedUntil: null } : { aiEnabled: false },
  });

  revalidatePath("/dashboard/chat");
  return { success: true };
}

export async function sendManualMessage(leadId: string, content: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId: user.id },
  });
  if (!lead) return { success: false, error: "Lead não encontrado" };

  await prisma.message.create({
    data: { leadId, role: "assistant", content },
  });

  // Send via WhatsApp (official or Uazapi)
  const whatsappConfig = await prisma.whatsAppConfig.findUnique({
    where: { userId: user.id },
  });

  if (whatsappConfig) {
    const { sendMessage } = await import("@/services/whatsappService");
    await sendMessage(whatsappConfig, lead.phone, content);
  }

  // Pause AI for this lead if human intervention is enabled
  const { onManualMessageSent } = await import("@/services/webhookProcessor");
  await onManualMessageSent(user.id, leadId);

  revalidatePath("/dashboard/chat");
  return { success: true };
}

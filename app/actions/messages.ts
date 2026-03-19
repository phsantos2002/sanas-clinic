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

  await prisma.lead.update({
    where: { id: leadId },
    data: { aiEnabled: !lead.aiEnabled },
  });

  revalidatePath("/dashboard/chat");
  return { success: true };
}

export async function sendManualMessage(
  leadId: string,
  content: string
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId: user.id },
  });
  if (!lead) return { success: false, error: "Lead não encontrado" };

  await prisma.message.create({
    data: { leadId, role: "assistant", content },
  });

  // Send via WhatsApp (official or evolution)
  const whatsappConfig = await prisma.whatsAppConfig.findUnique({
    where: { userId: user.id },
  });

  if (whatsappConfig) {
    const { sendMessage } = await import("@/services/whatsappService");
    await sendMessage(whatsappConfig, lead.phone, content);
  }

  revalidatePath("/dashboard/chat");
  return { success: true };
}

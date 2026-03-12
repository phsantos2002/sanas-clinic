"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import { sendFacebookEvent } from "@/services/facebookEvents";
import type { ActionResult, Lead, LeadDetail } from "@/types";

export async function getLeads(): Promise<Lead[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  return prisma.lead.findMany({
    where: { userId: user.id },
    include: {
      stage: true,
      tags: { include: { tag: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createLead(
  data: Pick<Lead, "name" | "phone"> & { stageId?: string }
): Promise<ActionResult<Lead>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  // Phone validation
  const cleanPhone = data.phone.replace(/\D/g, "");
  if (cleanPhone.length < 10 || cleanPhone.length > 15) {
    return { success: false, error: "Telefone inválido. Use DDD + número (ex: 11999999999)" };
  }

  // Deduplication by phone
  const phoneSuffix = cleanPhone.slice(-9);
  const existing = await prisma.lead.findFirst({
    where: {
      userId: user.id,
      phone: { endsWith: phoneSuffix },
    },
  });
  if (existing) {
    return { success: false, error: "Já existe um lead com esse telefone" };
  }

  try {
    const lead = await prisma.lead.create({
      data: {
        name: data.name,
        phone: cleanPhone,
        userId: user.id,
        stageId: data.stageId ?? null,
        source: "manual",
      },
      include: {
        stage: true,
        tags: { include: { tag: true } },
      },
    });

    if (lead.stage) {
      await prisma.leadStageHistory.create({
        data: { leadId: lead.id, stageId: lead.stage.id },
      });

      await sendFacebookEvent({
        userId: user.id,
        phone: lead.phone,
        eventName: lead.stage.eventName,
      });
    }

    revalidatePath("/dashboard");
    return { success: true, data: lead };
  } catch {
    return { success: false, error: "Erro ao criar lead" };
  }
}

export async function moveLead(
  leadId: string,
  newStageId: string
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  try {
    const stage = await prisma.stage.findFirst({
      where: { id: newStageId, userId: user.id },
    });

    if (!stage) return { success: false, error: "Estágio não encontrado" };

    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: { stageId: newStageId },
    });

    await prisma.leadStageHistory.create({
      data: { leadId: lead.id, stageId: newStageId },
    });

    await sendFacebookEvent({
      userId: user.id,
      phone: lead.phone,
      eventName: stage.eventName,
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao mover lead" };
  }
}

export async function getLeadDetail(leadId: string): Promise<LeadDetail | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId: user.id },
    include: {
      stage: true,
      tags: { include: { tag: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 50 },
      stageHistory: {
        include: { stage: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return lead as LeadDetail | null;
}

export async function deleteLead(leadId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  try {
    await prisma.lead.delete({ where: { id: leadId, userId: user.id } });
    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao deletar lead" };
  }
}

export async function addTagToLead(
  leadId: string,
  tagId: string
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  try {
    await prisma.leadTag.create({ data: { leadId, tagId } });
    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao adicionar tag" };
  }
}

export async function removeTagFromLead(
  leadId: string,
  tagId: string
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  try {
    await prisma.leadTag.deleteMany({ where: { leadId, tagId } });
    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao remover tag" };
  }
}

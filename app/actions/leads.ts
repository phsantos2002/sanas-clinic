"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import { sendFacebookEvent } from "@/services/facebookEvents";
import type { ActionResult, Lead, LeadDetail, LeadSourceStats } from "@/types";

export async function getLeads(): Promise<Lead[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  return prisma.lead.findMany({
    where: { userId: user.id },
    include: {
      stage: true,
    },
    orderBy: { createdAt: "desc" },
  }) as Promise<Lead[]>;
}

export async function createLead(
  data: Pick<Lead, "name" | "phone"> & { stageId?: string; email?: string }
): Promise<ActionResult<Lead>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  const cleanPhone = data.phone.replace(/\D/g, "");
  if (cleanPhone.length < 10 || cleanPhone.length > 15) {
    return { success: false, error: "Telefone inválido. Use DDD + número (ex: 11999999999)" };
  }

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
        email: data.email || null,
        userId: user.id,
        stageId: data.stageId ?? null,
        source: "manual",
      },
      include: { stage: true },
    });

    if (lead.stage) {
      await prisma.leadStageHistory.create({
        data: { leadId: lead.id, stageId: lead.stage.id },
      });

      await sendFacebookEvent({
        userId: user.id,
        phone: lead.phone,
        eventName: lead.stage.eventName,
        leadId: lead.id,
        stageName: lead.stage.name,
      });
    }

    revalidatePath("/dashboard");
    return { success: true, data: lead as Lead };
  } catch {
    return { success: false, error: "Erro ao criar lead" };
  }
}

export type UpdateLeadData = {
  name?: string;
  phone?: string;
  email?: string | null;
  cpf?: string | null;
  address?: string | null;
  city?: string | null;
  notes?: string | null;
  photoUrl?: string | null;
  stageId?: string | null;
  aiEnabled?: boolean;
};

export async function updateLead(
  leadId: string,
  data: UpdateLeadData
): Promise<ActionResult<Lead>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  try {
    const existing = await prisma.lead.findFirst({
      where: { id: leadId, userId: user.id },
    });
    if (!existing) return { success: false, error: "Lead não encontrado" };

    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone.replace(/\D/g, "") }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.cpf !== undefined && { cpf: data.cpf || null }),
        ...(data.address !== undefined && { address: data.address || null }),
        ...(data.city !== undefined && { city: data.city || null }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
        ...(data.photoUrl !== undefined && { photoUrl: data.photoUrl || null }),
        ...(data.stageId !== undefined && { stageId: data.stageId }),
        ...(data.aiEnabled !== undefined && { aiEnabled: data.aiEnabled }),
      },
      include: { stage: true },
    });

    if (data.stageId && data.stageId !== existing.stageId) {
      await prisma.leadStageHistory.create({
        data: { leadId: lead.id, stageId: data.stageId },
      });

      const stage = await prisma.stage.findUnique({ where: { id: data.stageId } });
      if (stage) {
        await sendFacebookEvent({
          userId: user.id,
          phone: lead.phone,
          eventName: stage.eventName,
          leadId: lead.id,
          stageName: stage.name,
        });
      }
    }

    revalidatePath("/dashboard");
    return { success: true, data: lead as Lead };
  } catch {
    return { success: false, error: "Erro ao atualizar lead" };
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
      leadId: lead.id,
      stageName: stage.name,
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
      messages: { orderBy: { createdAt: "desc" }, take: 50 },
      stageHistory: {
        include: { stage: true },
        orderBy: { createdAt: "asc" },
      },
      pixelEvents: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  return lead as LeadDetail | null;
}

export async function getLeadSourceStats(): Promise<LeadSourceStats> {
  const user = await getCurrentUser();
  if (!user) return { total: 0, meta: 0, google: 0, whatsapp: 0, manual: 0, unknown: 0 };

  const leads = await prisma.lead.findMany({
    where: { userId: user.id },
    select: { source: true },
  });

  const stats: LeadSourceStats = { total: leads.length, meta: 0, google: 0, whatsapp: 0, manual: 0, unknown: 0 };
  for (const lead of leads) {
    if (lead.source === "meta") stats.meta++;
    else if (lead.source === "google") stats.google++;
    else if (lead.source === "whatsapp") stats.whatsapp++;
    else if (lead.source === "manual") stats.manual++;
    else stats.unknown++;
  }
  return stats;
}

export type DailyOriginStats = {
  date: string;
  meta: number;
  google: number;
  other: number;
  unknown: number;
};

export type DashboardStats = {
  total: number;
  tracked: number;
  untracked: number;
  trackedPercent: number;
  untrackedPercent: number;
  bySource: LeadSourceStats;
  daily: DailyOriginStats[];
};

export async function getDashboardStats(
  startDate?: string,
  endDate?: string
): Promise<DashboardStats> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      total: 0, tracked: 0, untracked: 0,
      trackedPercent: 0, untrackedPercent: 0,
      bySource: { total: 0, meta: 0, google: 0, whatsapp: 0, manual: 0, unknown: 0 },
      daily: [],
    };
  }

  const where: Record<string, unknown> = { userId: user.id };
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) (where.createdAt as Record<string, unknown>).gte = new Date(startDate + "T00:00:00Z");
    if (endDate) (where.createdAt as Record<string, unknown>).lte = new Date(endDate + "T23:59:59Z");
  }

  const leads = await prisma.lead.findMany({
    where,
    select: { source: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const total = leads.length;
  const tracked = leads.filter((l) => l.source && ["meta", "google", "whatsapp", "manual"].includes(l.source)).length;
  const untracked = total - tracked;

  const bySource: LeadSourceStats = { total, meta: 0, google: 0, whatsapp: 0, manual: 0, unknown: 0 };
  for (const lead of leads) {
    if (lead.source === "meta") bySource.meta++;
    else if (lead.source === "google") bySource.google++;
    else if (lead.source === "whatsapp") bySource.whatsapp++;
    else if (lead.source === "manual") bySource.manual++;
    else bySource.unknown++;
  }

  const dailyMap = new Map<string, DailyOriginStats>();
  for (const lead of leads) {
    const day = new Date(lead.createdAt).toISOString().slice(0, 10);
    if (!dailyMap.has(day)) {
      dailyMap.set(day, { date: day, meta: 0, google: 0, other: 0, unknown: 0 });
    }
    const d = dailyMap.get(day)!;
    if (lead.source === "meta") d.meta++;
    else if (lead.source === "google") d.google++;
    else if (lead.source && ["whatsapp", "manual"].includes(lead.source)) d.other++;
    else d.unknown++;
  }

  return {
    total,
    tracked,
    untracked,
    trackedPercent: total > 0 ? Math.round((tracked / total) * 10000) / 100 : 0,
    untrackedPercent: total > 0 ? Math.round((untracked / total) * 10000) / 100 : 0,
    bySource,
    daily: Array.from(dailyMap.values()),
  };
}

export async function deleteLead(leadId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  try {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, userId: user.id },
    });
    if (!lead) return { success: false, error: "Lead não encontrado" };

    // Delete related records first to avoid FK constraint errors
    await prisma.leadStageHistory.deleteMany({ where: { leadId } });
    await prisma.pixelEvent.deleteMany({ where: { leadId } });
    await prisma.message.deleteMany({ where: { leadId } });
    await prisma.lead.delete({ where: { id: leadId } });

    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao deletar lead" };
  }
}

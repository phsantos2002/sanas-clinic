"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import { sendFacebookEvent } from "@/services/facebookEvents";
import { createLeadSchema, updateLeadSchema, normalizePhone } from "@/lib/validations";
import type { ActionResult, Lead, LeadDetail, LeadSourceStats } from "@/types";

// ── Paginated getLeads ───────────────────────────────────────

export async function getLeads(page = 1, limit = 200): Promise<{ leads: Lead[]; total: number }> {
  const user = await getCurrentUser();
  if (!user) return { leads: [], total: 0 };

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where: { userId: user.id },
      include: { stage: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.lead.count({ where: { userId: user.id } }),
  ]);

  return { leads: leads as Lead[], total };
}

// ── Get Lead by Phone ────────────────────────────────────────

export async function getLeadByPhone(phone: string): Promise<LeadDetail | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const normalized = phone.replace(/\D/g, "");
  const lead = await prisma.lead.findFirst({
    where: {
      userId: user.id,
      phone: { endsWith: normalized.slice(-8) },
    },
    include: {
      stage: true,
      messages: { orderBy: { createdAt: "desc" }, take: 50 },
      stageHistory: {
        include: { stage: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      pixelEvents: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  return lead as LeadDetail | null;
}

// ── Create Lead (with Zod + Transaction) ─────────────────────

export async function createLead(
  data: Pick<Lead, "name" | "phone"> & { stageId?: string; email?: string }
): Promise<ActionResult<Lead>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  const parsed = createLeadSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Dados invalidos" };
  }

  const cleanPhone = normalizePhone(parsed.data.phone);
  if (cleanPhone.length < 10 || cleanPhone.length > 15) {
    return { success: false, error: "Telefone invalido. Use DDD + numero (ex: 11999999999)" };
  }

  // Full phone match (not endsWith) for proper isolation
  const existing = await prisma.lead.findFirst({
    where: { userId: user.id, phone: cleanPhone },
  });
  if (existing) {
    return { success: false, error: "Ja existe um lead com esse telefone" };
  }

  try {
    const lead = await prisma.$transaction(async (tx) => {
      const created = await tx.lead.create({
        data: {
          name: parsed.data.name,
          phone: cleanPhone,
          email: parsed.data.email || null,
          userId: user.id,
          stageId: parsed.data.stageId ?? null,
          source: "manual",
        },
        include: { stage: true },
      });

      if (created.stage) {
        await tx.leadStageHistory.create({
          data: { leadId: created.id, stageId: created.stage.id },
        });
      }

      return created;
    });

    // Facebook event outside transaction (non-critical, fire-and-forget)
    if (lead.stage) {
      sendFacebookEvent({
        userId: user.id,
        phone: lead.phone,
        eventName: lead.stage.eventName,
        leadId: lead.id,
        stageName: lead.stage.name,
      }).catch(() => {});
    }

    revalidatePath("/dashboard");
    return { success: true, data: lead as Lead };
  } catch {
    return { success: false, error: "Erro ao criar lead" };
  }
}

// ── Update Lead (with Zod + Transaction for stage change) ────

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
  if (!user) return { success: false, error: "Nao autenticado" };

  const parsed = updateLeadSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Dados invalidos" };
  }

  try {
    const existing = await prisma.lead.findFirst({
      where: { id: leadId, userId: user.id },
    });
    if (!existing) return { success: false, error: "Lead nao encontrado" };

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = normalizePhone(data.phone);
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.cpf !== undefined) updateData.cpf = data.cpf || null;
    if (data.address !== undefined) updateData.address = data.address || null;
    if (data.city !== undefined) updateData.city = data.city || null;
    if (data.notes !== undefined) updateData.notes = data.notes || null;
    if (data.photoUrl !== undefined) updateData.photoUrl = data.photoUrl || null;
    if (data.stageId !== undefined) updateData.stageId = data.stageId;
    if (data.aiEnabled !== undefined) updateData.aiEnabled = data.aiEnabled;

    const stageChanged = data.stageId && data.stageId !== existing.stageId;

    const lead = await prisma.$transaction(async (tx) => {
      const updated = await tx.lead.update({
        where: { id: leadId },
        data: updateData,
        include: { stage: true },
      });

      if (stageChanged && data.stageId) {
        // Verify stage belongs to this user
        const stage = await tx.stage.findFirst({
          where: { id: data.stageId, userId: user.id },
        });
        if (stage) {
          await tx.leadStageHistory.create({
            data: { leadId: updated.id, stageId: data.stageId },
          });
        }
      }

      return updated;
    });

    // Fire event outside transaction
    if (stageChanged && lead.stage) {
      sendFacebookEvent({
        userId: user.id,
        phone: lead.phone,
        eventName: lead.stage.eventName,
        leadId: lead.id,
        stageName: lead.stage.name,
      }).catch(() => {});
    }

    revalidatePath("/dashboard");
    return { success: true, data: lead as Lead };
  } catch {
    return { success: false, error: "Erro ao atualizar lead" };
  }
}

// ── Move Lead (with Transaction) ─────────────────────────────

export async function moveLead(leadId: string, newStageId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  try {
    const [stage, existing] = await Promise.all([
      prisma.stage.findFirst({ where: { id: newStageId, userId: user.id } }),
      prisma.lead.findFirst({ where: { id: leadId, userId: user.id } }),
    ]);
    if (!stage) return { success: false, error: "Estagio nao encontrado" };
    if (!existing) return { success: false, error: "Lead nao encontrado" };

    await prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: { id: leadId },
        data: { stageId: newStageId },
      });
      await tx.leadStageHistory.create({
        data: { leadId, stageId: newStageId },
      });
    });

    // Fire event outside transaction
    sendFacebookEvent({
      userId: user.id,
      phone: existing.phone,
      eventName: stage.eventName,
      leadId,
      stageName: stage.name,
    }).catch(() => {});

    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao mover lead" };
  }
}

// ── Lead Detail (paginated messages) ─────────────────────────

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

// ── Source Stats (optimized with groupBy) ────────────────────

export async function getLeadSourceStats(): Promise<LeadSourceStats> {
  const user = await getCurrentUser();
  if (!user) return { total: 0, meta: 0, google: 0, whatsapp: 0, manual: 0, unknown: 0 };

  const groups = await prisma.lead.groupBy({
    by: ["source"],
    where: { userId: user.id },
    _count: { id: true },
  });

  const stats: LeadSourceStats = {
    total: 0,
    meta: 0,
    google: 0,
    whatsapp: 0,
    manual: 0,
    unknown: 0,
  };
  for (const g of groups) {
    const count = g._count.id;
    stats.total += count;
    if (g.source === "meta") stats.meta = count;
    else if (g.source === "google") stats.google = count;
    else if (g.source === "whatsapp") stats.whatsapp = count;
    else if (g.source === "manual") stats.manual = count;
    else stats.unknown += count;
  }
  return stats;
}

// ── Dashboard Stats ──────────────────────────────────────────

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
      total: 0,
      tracked: 0,
      untracked: 0,
      trackedPercent: 0,
      untrackedPercent: 0,
      bySource: { total: 0, meta: 0, google: 0, whatsapp: 0, manual: 0, unknown: 0 },
      daily: [],
    };
  }

  const where: Record<string, unknown> = { userId: user.id };
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate)
      (where.createdAt as Record<string, unknown>).gte = new Date(startDate + "T00:00:00Z");
    if (endDate)
      (where.createdAt as Record<string, unknown>).lte = new Date(endDate + "T23:59:59Z");
  }

  const leads = await prisma.lead.findMany({
    where,
    select: { source: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const total = leads.length;
  const tracked = leads.filter(
    (l) => l.source && ["meta", "google", "whatsapp", "manual"].includes(l.source)
  ).length;
  const untracked = total - tracked;

  const bySource: LeadSourceStats = {
    total,
    meta: 0,
    google: 0,
    whatsapp: 0,
    manual: 0,
    unknown: 0,
  };
  const dailyMap = new Map<string, DailyOriginStats>();

  for (const lead of leads) {
    if (lead.source === "meta") bySource.meta++;
    else if (lead.source === "google") bySource.google++;
    else if (lead.source === "whatsapp") bySource.whatsapp++;
    else if (lead.source === "manual") bySource.manual++;
    else bySource.unknown++;

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

// ── Delete Lead (with Transaction) ───────────────────────────

export async function deleteLead(leadId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  try {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, userId: user.id },
    });
    if (!lead) return { success: false, error: "Lead nao encontrado" };

    await prisma.$transaction(async (tx) => {
      await tx.leadStageHistory.deleteMany({ where: { leadId } });
      await tx.pixelEvent.deleteMany({ where: { leadId } });
      await tx.message.deleteMany({ where: { leadId } });
      await tx.lead.delete({ where: { id: leadId } });
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao deletar lead" };
  }
}

// ── Tags ─────────────────────────────────────────────────────

export async function addLeadTag(leadId: string, tag: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId: user.id },
    select: { tags: true },
  });
  if (!lead) return { success: false, error: "Lead nao encontrado" };

  const normalized = tag.toLowerCase().trim();
  if (lead.tags.includes(normalized)) return { success: true };

  await prisma.lead.update({
    where: { id: leadId },
    data: { tags: [...lead.tags, normalized] },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function removeLeadTag(leadId: string, tag: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId: user.id },
    select: { tags: true },
  });
  if (!lead) return { success: false, error: "Lead nao encontrado" };

  await prisma.lead.update({
    where: { id: leadId },
    data: { tags: lead.tags.filter((t) => t !== tag.toLowerCase().trim()) },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

// ── Lead Timeline (unified) ──────────────────────────────────

export type TimelineEvent = {
  id: string;
  type: "message" | "stage_change" | "pixel_event" | "created";
  title: string;
  description?: string;
  timestamp: Date;
  metadata?: Record<string, string>;
};

export async function getLeadTimeline(leadId: string): Promise<TimelineEvent[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId: user.id },
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 30 },
      stageHistory: { include: { stage: true }, orderBy: { createdAt: "desc" } },
      pixelEvents: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!lead) return [];

  const events: TimelineEvent[] = [];

  // Created event
  events.push({
    id: `created-${lead.id}`,
    type: "created",
    title: "Lead criado",
    description: lead.source ? `Fonte: ${lead.source}` : undefined,
    timestamp: lead.createdAt,
  });

  // Messages
  for (const msg of lead.messages) {
    events.push({
      id: `msg-${msg.id}`,
      type: "message",
      title: msg.role === "user" ? "Mensagem recebida" : "Mensagem enviada",
      description: msg.content.slice(0, 100) + (msg.content.length > 100 ? "..." : ""),
      timestamp: msg.createdAt,
      metadata: { role: msg.role },
    });
  }

  // Stage changes
  for (const sh of lead.stageHistory) {
    events.push({
      id: `stage-${sh.id}`,
      type: "stage_change",
      title: `Movido para "${sh.stage.name}"`,
      description: `Evento: ${sh.stage.eventName}`,
      timestamp: sh.createdAt,
      metadata: { stageName: sh.stage.name, eventName: sh.stage.eventName },
    });
  }

  // Pixel events
  for (const pe of lead.pixelEvents) {
    events.push({
      id: `pixel-${pe.id}`,
      type: "pixel_event",
      title: `Pixel: ${pe.eventName}`,
      description: `Plataforma: ${pe.platform} — ${pe.success ? "Sucesso" : "Falhou"}`,
      timestamp: pe.createdAt,
      metadata: { eventName: pe.eventName, platform: pe.platform },
    });
  }

  // Sort by timestamp descending
  events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return events;
}

// ── Recalculate single lead score ────────────────────────────

export async function refreshLeadScore(
  leadId: string
): Promise<ActionResult<{ score: number; label: string }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  const lead = await prisma.lead.findFirst({ where: { id: leadId, userId: user.id } });
  if (!lead) return { success: false, error: "Lead nao encontrado" };

  const { recalculateLeadScore } = await import("@/services/leadScoring");
  const result = await recalculateLeadScore(leadId);

  revalidatePath("/dashboard");
  return { success: true, data: result };
}

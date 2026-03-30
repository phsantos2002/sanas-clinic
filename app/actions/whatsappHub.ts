"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import type { ActionResult } from "@/types";

// ══════════════════════════════════════════════════════════════
// ATTENDANTS
// ══════════════════════════════════════════════════════════════

export type AttendantData = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
  avatar: string | null;
  createdAt: Date;
};

export async function getAttendants(): Promise<AttendantData[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  return prisma.attendant.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });
}

export async function createAttendant(data: {
  name: string;
  email?: string;
  phone?: string;
  role?: string;
}): Promise<ActionResult<AttendantData>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  if (!data.name?.trim()) return { success: false, error: "Nome obrigatorio" };

  try {
    const attendant = await prisma.attendant.create({
      data: {
        userId: user.id,
        name: data.name.trim(),
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        role: data.role || "attendant",
      },
    });

    revalidatePath("/dashboard");
    return { success: true, data: attendant };
  } catch {
    return { success: false, error: "Erro ao criar atendente" };
  }
}

export async function deleteAttendant(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  await prisma.attendant.deleteMany({ where: { id, userId: user.id } });
  // Unassign leads
  await prisma.lead.updateMany({ where: { userId: user.id, assignedTo: id }, data: { assignedTo: null } });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function assignLeadToAttendant(leadId: string, attendantId: string | null): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  await prisma.lead.updateMany({
    where: { id: leadId, userId: user.id },
    data: { assignedTo: attendantId },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function autoAssignLead(leadId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  // Round-robin: find attendant with fewest assigned leads
  const attendants = await prisma.attendant.findMany({
    where: { userId: user.id, isActive: true },
    select: { id: true },
  });

  if (attendants.length === 0) return { success: true }; // No attendants, skip

  const counts = await Promise.all(
    attendants.map(async (a) => ({
      id: a.id,
      count: await prisma.lead.count({ where: { userId: user.id, assignedTo: a.id } }),
    }))
  );

  counts.sort((a, b) => a.count - b.count);
  const selected = counts[0];

  await prisma.lead.updateMany({
    where: { id: leadId, userId: user.id },
    data: { assignedTo: selected.id },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

// ══════════════════════════════════════════════════════════════
// MESSAGE TEMPLATES
// ══════════════════════════════════════════════════════════════

export type TemplateData = {
  id: string;
  name: string;
  category: string;
  content: string;
  shortcut: string | null;
  isActive: boolean;
  usageCount: number;
};

export async function getMessageTemplates(): Promise<TemplateData[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  return prisma.messageTemplate.findMany({
    where: { userId: user.id, isActive: true },
    orderBy: { usageCount: "desc" },
  });
}

export async function createMessageTemplate(data: {
  name: string;
  category?: string;
  content: string;
  shortcut?: string;
}): Promise<ActionResult<TemplateData>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  if (!data.name?.trim() || !data.content?.trim()) {
    return { success: false, error: "Nome e conteudo obrigatorios" };
  }

  try {
    const template = await prisma.messageTemplate.create({
      data: {
        userId: user.id,
        name: data.name.trim(),
        category: data.category || "geral",
        content: data.content.trim(),
        shortcut: data.shortcut?.trim()?.toLowerCase() || null,
      },
    });

    revalidatePath("/dashboard");
    return { success: true, data: template };
  } catch {
    return { success: false, error: "Erro ao criar template. Atalho ja existe?" };
  }
}

export async function updateMessageTemplate(id: string, data: {
  name?: string;
  category?: string;
  content?: string;
  shortcut?: string;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  try {
    await prisma.messageTemplate.updateMany({
      where: { id, userId: user.id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.category && { category: data.category }),
        ...(data.content && { content: data.content.trim() }),
        ...(data.shortcut !== undefined && { shortcut: data.shortcut?.trim()?.toLowerCase() || null }),
      },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao atualizar template" };
  }
}

export async function deleteMessageTemplate(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  await prisma.messageTemplate.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Resolve a template with lead placeholders
 */
export async function resolveTemplate(template: string, leadName: string, clinicName: string): Promise<string> {
  return template
    .replace(/\{\{nome\}\}/gi, leadName.split(" ")[0])
    .replace(/\{\{nome_completo\}\}/gi, leadName)
    .replace(/\{\{clinica\}\}/gi, clinicName);
}

/**
 * Track template usage
 */
export async function trackTemplateUsage(templateId: string): Promise<void> {
  await prisma.messageTemplate.update({
    where: { id: templateId },
    data: { usageCount: { increment: 1 } },
  }).catch(() => {}); // Non-critical
}

// ══════════════════════════════════════════════════════════════
// BROADCASTING
// ══════════════════════════════════════════════════════════════

export type BroadcastData = {
  id: string;
  name: string;
  message: string;
  filters: Record<string, unknown> | null;
  totalLeads: number;
  sentCount: number;
  failedCount: number;
  status: string;
  scheduledAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
};

export async function getBroadcasts(): Promise<BroadcastData[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const campaigns = await prisma.broadcastCampaign.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return campaigns.map((c) => ({
    ...c,
    filters: c.filters as Record<string, unknown> | null,
  }));
}

export async function createBroadcast(data: {
  name: string;
  message: string;
  filters?: {
    tags?: string[];
    scoreMin?: number;
    stageIds?: string[];
    source?: string;
  };
}): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  if (!data.name?.trim() || !data.message?.trim()) {
    return { success: false, error: "Nome e mensagem obrigatorios" };
  }

  // Count matching leads
  const where: Record<string, unknown> = { userId: user.id };
  if (data.filters?.tags?.length) where.tags = { hasSome: data.filters.tags };
  if (data.filters?.scoreMin) where.score = { gte: data.filters.scoreMin };
  if (data.filters?.stageIds?.length) where.stageId = { in: data.filters.stageIds };
  if (data.filters?.source) where.source = data.filters.source;

  const totalLeads = await prisma.lead.count({ where });

  try {
    const campaign = await prisma.broadcastCampaign.create({
      data: {
        userId: user.id,
        name: data.name.trim(),
        message: data.message.trim(),
        filters: data.filters ? JSON.parse(JSON.stringify(data.filters)) : null,
        totalLeads,
        status: "draft",
      },
    });

    revalidatePath("/dashboard");
    return { success: true, data: { id: campaign.id } };
  } catch {
    return { success: false, error: "Erro ao criar campanha" };
  }
}

export async function executeBroadcast(campaignId: string): Promise<ActionResult<{ sent: number; failed: number }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  const campaign = await prisma.broadcastCampaign.findFirst({
    where: { id: campaignId, userId: user.id, status: "draft" },
  });
  if (!campaign) return { success: false, error: "Campanha nao encontrada ou ja enviada" };

  // Get WhatsApp config
  const waConfig = await prisma.whatsAppConfig.findUnique({ where: { userId: user.id } });
  if (!waConfig) return { success: false, error: "WhatsApp nao configurado" };

  const aiConfig = await prisma.aIConfig.findUnique({ where: { userId: user.id } });
  const clinicName = aiConfig?.clinicName || "nossa clinica";

  // Mark as sending
  await prisma.broadcastCampaign.update({
    where: { id: campaignId },
    data: { status: "sending" },
  });

  // Build lead filter
  const filters = (campaign.filters as Record<string, unknown>) || {};
  const where: Record<string, unknown> = { userId: user.id };
  if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) where.tags = { hasSome: filters.tags };
  if (filters.scoreMin) where.score = { gte: filters.scoreMin };
  if (filters.stageIds && Array.isArray(filters.stageIds) && filters.stageIds.length > 0) where.stageId = { in: filters.stageIds };
  if (filters.source) where.source = filters.source;

  const leads = await prisma.lead.findMany({
    where,
    select: { id: true, name: true, phone: true },
    take: 500, // Safety limit
  });

  const { sendMessage } = await import("@/services/whatsappService");

  let sent = 0;
  let failed = 0;

  for (const lead of leads) {
    const text = campaign.message
      .replace(/\{\{nome\}\}/gi, lead.name.split(" ")[0])
      .replace(/\{\{nome_completo\}\}/gi, lead.name)
      .replace(/\{\{clinica\}\}/gi, clinicName);

    try {
      const result = await sendMessage(waConfig, lead.phone, text);
      if (result.success) {
        await prisma.message.create({
          data: { leadId: lead.id, role: "assistant", content: text },
        });
        sent++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }

    // Rate limit: 1 message per second to avoid WhatsApp blocks
    await new Promise((r) => setTimeout(r, 1000));
  }

  await prisma.broadcastCampaign.update({
    where: { id: campaignId },
    data: {
      status: "completed",
      sentCount: sent,
      failedCount: failed,
      completedAt: new Date(),
    },
  });

  revalidatePath("/dashboard");
  return { success: true, data: { sent, failed } };
}

export async function deleteBroadcast(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  await prisma.broadcastCampaign.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/dashboard");
  return { success: true };
}

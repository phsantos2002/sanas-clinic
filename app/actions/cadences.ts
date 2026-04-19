"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import { logLeadActivity } from "@/services/leadActivity";
import type { ActionResult } from "@/types";

// ══════════════════════════════════════════════════════════════
// CADENCES — multi-toque sequences for outbound prospection
// Uses the existing Workflow engine (isSequence=true).
// ══════════════════════════════════════════════════════════════

export type CadenceStepType = "send_whatsapp" | "send_email" | "delay";

export type CadenceStepData = {
  id?: string;
  order: number;
  type: CadenceStepType;
  // for send_whatsapp / send_email
  message?: string;
  subject?: string;
  // for delay
  delayDays?: number;
  delayHours?: number;
};

export type CadenceData = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  stopOnReply: boolean;
  steps: CadenceStepData[];
  enrolledCount: number;
  createdAt: Date;
};

// ─── List ────────────────────────────────────────────────────

export async function getCadences(): Promise<CadenceData[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const workflows = await prisma.workflow.findMany({
    where: { userId: user.id, isSequence: true },
    include: {
      steps: { orderBy: { order: "asc" } },
      _count: { select: { executions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return workflows.map((w) => ({
    id: w.id,
    name: w.name,
    description: w.description,
    isActive: w.isActive,
    stopOnReply: w.stopOnReply,
    enrolledCount: w._count.executions,
    createdAt: w.createdAt,
    steps: w.steps.map((s) => {
      const cfg = s.config as Record<string, unknown>;
      if (s.type === "delay") {
        return {
          id: s.id,
          order: s.order,
          type: "delay" as const,
          delayDays: Number(cfg.days) || 0,
          delayHours: Number(cfg.hours) || 0,
        };
      }
      if (s.type === "action") {
        const at = String(cfg.actionType || "");
        if (at === "send_email") {
          return {
            id: s.id,
            order: s.order,
            type: "send_email" as const,
            subject: String(cfg.subject || ""),
            message: String(cfg.message || ""),
          };
        }
        return {
          id: s.id,
          order: s.order,
          type: "send_whatsapp" as const,
          message: String(cfg.message || ""),
        };
      }
      return { id: s.id, order: s.order, type: "delay" as const, delayDays: 0 };
    }),
  }));
}

export async function getCadence(id: string): Promise<CadenceData | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const list = await getCadences();
  return list.find((c) => c.id === id) ?? null;
}

// ─── Create ──────────────────────────────────────────────────

export async function createCadence(data: {
  name: string;
  description?: string;
  stopOnReply?: boolean;
  steps: CadenceStepData[];
}): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  if (!data.name?.trim()) return { success: false, error: "Nome obrigatorio" };
  if (!data.steps || data.steps.length === 0)
    return { success: false, error: "Adicione pelo menos um passo" };

  try {
    const created = await prisma.workflow.create({
      data: {
        userId: user.id,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        isActive: true,
        isSequence: true,
        stopOnReply: data.stopOnReply ?? true,
        trigger: { type: "manual_enroll" } as Prisma.InputJsonValue,
        steps: {
          create: data.steps.map((s, i) => ({
            order: i,
            type: s.type === "delay" ? "delay" : "action",
            config: buildStepConfig(s) as Prisma.InputJsonValue,
          })),
        },
      },
    });

    revalidatePath("/dashboard/prospeccao/cadencias");
    return { success: true, data: { id: created.id } };
  } catch {
    return { success: false, error: "Erro ao criar cadencia" };
  }
}

function buildStepConfig(s: CadenceStepData): Record<string, unknown> {
  if (s.type === "delay") {
    const days = s.delayDays ?? 0;
    const hours = s.delayHours ?? 0;
    const minutes = days * 24 * 60 + hours * 60;
    return { days, hours, minutes };
  }
  if (s.type === "send_email") {
    return {
      actionType: "send_email",
      subject: s.subject ?? "",
      message: s.message ?? "",
    };
  }
  return { actionType: "send_whatsapp", message: s.message ?? "" };
}

// ─── Update ──────────────────────────────────────────────────

export async function updateCadence(
  id: string,
  data: {
    name?: string;
    description?: string;
    isActive?: boolean;
    stopOnReply?: boolean;
    steps?: CadenceStepData[];
  }
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  const existing = await prisma.workflow.findFirst({
    where: { id, userId: user.id, isSequence: true },
  });
  if (!existing) return { success: false, error: "Cadencia nao encontrada" };

  try {
    await prisma.workflow.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.description !== undefined && { description: data.description.trim() || null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.stopOnReply !== undefined && { stopOnReply: data.stopOnReply }),
      },
    });

    // Replace steps if provided
    if (data.steps) {
      await prisma.workflowStep.deleteMany({ where: { workflowId: id } });
      await prisma.workflowStep.createMany({
        data: data.steps.map((s, i) => ({
          workflowId: id,
          order: i,
          type: s.type === "delay" ? "delay" : "action",
          config: buildStepConfig(s) as Prisma.InputJsonValue,
        })),
      });
    }

    revalidatePath("/dashboard/prospeccao/cadencias");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao atualizar cadencia" };
  }
}

export async function deleteCadence(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  const existing = await prisma.workflow.findFirst({
    where: { id, userId: user.id, isSequence: true },
  });
  if (!existing) return { success: false, error: "Cadencia nao encontrada" };

  await prisma.workflow.delete({ where: { id } });
  revalidatePath("/dashboard/prospeccao/cadencias");
  return { success: true };
}

// ─── Enroll leads in a cadence ───────────────────────────────

export async function enrollLeadsInCadence(
  cadenceId: string,
  leadIds: string[]
): Promise<ActionResult<{ enrolled: number; skipped: number }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  if (!leadIds.length) return { success: false, error: "Nenhum lead selecionado" };
  if (leadIds.length > 500) return { success: false, error: "Maximo 500 leads por vez" };

  const cadence = await prisma.workflow.findFirst({
    where: { id: cadenceId, userId: user.id, isSequence: true, isActive: true },
  });
  if (!cadence) return { success: false, error: "Cadencia nao encontrada ou inativa" };

  // Owned leads filter
  const ownedLeads = await prisma.lead.findMany({
    where: { id: { in: leadIds }, userId: user.id },
    select: { id: true },
  });
  const ownedIds = new Set(ownedLeads.map((l) => l.id));

  let enrolled = 0;
  let skipped = 0;

  for (const leadId of leadIds) {
    if (!ownedIds.has(leadId)) {
      skipped++;
      continue;
    }

    // Check if already running
    const existing = await prisma.workflowExecution.findFirst({
      where: {
        workflowId: cadenceId,
        leadId,
        status: { in: ["running"] },
      },
    });
    if (existing) {
      skipped++;
      continue;
    }

    await prisma.workflowExecution.create({
      data: {
        workflowId: cadenceId,
        leadId,
        status: "running",
        currentStep: 0,
      },
    });
    enrolled++;

    await logLeadActivity({
      leadId,
      userId: user.id,
      type: "cadence_enrolled",
      summary: `Inscrito na cadência "${cadence.name}"`,
      metadata: { cadenceId, cadenceName: cadence.name },
      actorType: "user",
      actorName: user.name ?? user.email ?? undefined,
    });
  }

  revalidatePath("/dashboard/prospeccao/cadencias");
  revalidatePath("/dashboard/pipeline");

  return { success: true, data: { enrolled, skipped } };
}

// ─── Stop a cadence execution (used when lead replies) ───────

export async function stopCadencesForLead(leadId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId: user.id },
    select: { id: true },
  });
  if (!lead) return;

  await prisma.workflowExecution.updateMany({
    where: {
      leadId,
      status: "running",
      workflow: { isSequence: true, stopOnReply: true, userId: user.id },
    },
    data: { status: "stopped", completedAt: new Date() },
  });
}

export async function unenrollLead(leadId: string, cadenceId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  await prisma.workflowExecution.updateMany({
    where: {
      leadId,
      workflowId: cadenceId,
      status: "running",
      workflow: { userId: user.id },
    },
    data: { status: "cancelled", completedAt: new Date() },
  });

  revalidatePath("/dashboard/prospeccao/cadencias");
  return { success: true };
}

// ─── Active enrollments ──────────────────────────────────────

export async function getActiveEnrollments(cadenceId?: string) {
  const user = await getCurrentUser();
  if (!user) return [];

  return prisma.workflowExecution.findMany({
    where: {
      status: "running",
      workflow: { userId: user.id, isSequence: true, ...(cadenceId && { id: cadenceId }) },
    },
    include: {
      lead: { select: { id: true, name: true, phone: true, email: true, company: true } },
      workflow: { select: { id: true, name: true } },
    },
    orderBy: { startedAt: "desc" },
    take: 200,
  });
}

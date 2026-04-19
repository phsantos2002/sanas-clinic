"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import { saveWorkflowVersion } from "@/services/workflowEngine";
import type { ActionResult } from "@/types";

// ── Types ────────────────────────────────────────────────────

export type TriggerConfig = {
  type: "new_lead" | "stage_change" | "inactivity" | "tag_added" | "score_change";
  config?: Record<string, unknown>;
};

export type StepData = {
  order: number;
  type: "condition" | "action" | "delay";
  config: Record<string, unknown>;
};

export type WorkflowData = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  trigger: TriggerConfig;
  steps: { id: string; order: number; type: string; config: Record<string, unknown> }[];
  executionCount: number;
  createdAt: Date;
};

// ── CRUD ─────────────────────────────────────────────────────

export async function getWorkflows(): Promise<WorkflowData[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const workflows = await prisma.workflow.findMany({
    where: { userId: user.id },
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
    trigger: w.trigger as TriggerConfig,
    steps: w.steps.map((s) => ({
      id: s.id,
      order: s.order,
      type: s.type,
      config: s.config as Record<string, unknown>,
    })),
    executionCount: w._count.executions,
    createdAt: w.createdAt,
  }));
}

export async function createWorkflow(data: {
  name: string;
  description?: string;
  trigger: TriggerConfig;
  steps: StepData[];
}): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  if (!data.name?.trim()) return { success: false, error: "Nome obrigatorio" };
  if (!data.trigger?.type) return { success: false, error: "Trigger obrigatorio" };
  if (!data.steps?.length) return { success: false, error: "Pelo menos 1 step obrigatorio" };

  try {
    const workflow = await prisma.workflow.create({
      data: {
        userId: user.id,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        trigger: JSON.parse(JSON.stringify(data.trigger)),
        steps: {
          create: data.steps.map((s, i) => ({
            order: i,
            type: s.type,
            config: JSON.parse(JSON.stringify(s.config)),
          })),
        },
      },
    });

    revalidatePath("/dashboard");
    return { success: true, data: { id: workflow.id } };
  } catch {
    return { success: false, error: "Erro ao criar workflow" };
  }
}

export async function updateWorkflow(
  id: string,
  data: {
    name?: string;
    description?: string;
    isActive?: boolean;
    trigger?: TriggerConfig;
    steps?: StepData[];
  }
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  try {
    const existing = await prisma.workflow.findFirst({ where: { id, userId: user.id } });
    if (!existing) return { success: false, error: "Workflow nao encontrado" };

    await prisma.workflow.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.description !== undefined && { description: data.description?.trim() || null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.trigger && { trigger: JSON.parse(JSON.stringify(data.trigger)) }),
      },
    });

    // Replace steps if provided
    if (data.steps) {
      await prisma.workflowStep.deleteMany({ where: { workflowId: id } });
      await prisma.workflowStep.createMany({
        data: data.steps.map((s, i) => ({
          workflowId: id,
          order: i,
          type: s.type,
          config: JSON.parse(JSON.stringify(s.config)),
        })),
      });
    }

    // Sprint 7: snapshot this version after saving (non-blocking)
    saveWorkflowVersion(id, undefined, user.id).catch(() => {});

    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao atualizar workflow" };
  }
}

export async function toggleWorkflow(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  const workflow = await prisma.workflow.findFirst({ where: { id, userId: user.id } });
  if (!workflow) return { success: false, error: "Workflow nao encontrado" };

  await prisma.workflow.update({
    where: { id },
    data: { isActive: !workflow.isActive },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteWorkflow(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  await prisma.workflow.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/dashboard");
  return { success: true };
}

// ── Execution history ────────────────────────────────────────

export type ExecutionData = {
  id: string;
  workflowName: string;
  leadId: string;
  status: string;
  currentStep: number;
  logs: { step: number; type: string; action?: string; result: string; timestamp: string }[];
  startedAt: Date;
  completedAt: Date | null;
};

export async function getWorkflowExecutions(workflowId?: string): Promise<ExecutionData[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const where: Record<string, unknown> = { workflow: { userId: user.id } };
  if (workflowId) where.workflowId = workflowId;

  const executions = await prisma.workflowExecution.findMany({
    where,
    include: { workflow: { select: { name: true } } },
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  return executions.map((e) => ({
    id: e.id,
    workflowName: e.workflow.name,
    leadId: e.leadId,
    status: e.status,
    currentStep: e.currentStep,
    logs: (e.logs as ExecutionData["logs"]) || [],
    startedAt: e.startedAt,
    completedAt: e.completedAt,
  }));
}

// ── Canvas Visual (Sprint 5) ────────────────────────────────

export async function saveWorkflowCanvas(
  workflowId: string,
  canvas: { nodes: unknown[]; edges: unknown[] }
) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  await prisma.workflow.updateMany({
    where: { id: workflowId, userId: user.id },
    data: { canvas: canvas as never },
  });

  // Sprint 7: snapshot canvas version (non-blocking)
  saveWorkflowVersion(workflowId, "canvas save", user.id).catch(() => {});

  revalidatePath("/dashboard/workflows");
  return { success: true };
}

export async function createWorkflowFromTemplate(
  name: string,
  canvas: { nodes: unknown[]; edges: unknown[] },
  trigger: unknown
) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  const workflow = await prisma.workflow.create({
    data: {
      userId: user.id,
      name,
      trigger: (trigger || { type: "new_lead", config: {} }) as never,
      canvas: canvas as never,
    },
  });

  revalidatePath("/dashboard/workflows");
  return { success: true, data: workflow };
}

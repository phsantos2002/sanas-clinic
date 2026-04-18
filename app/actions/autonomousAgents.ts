"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import { runAgent, bootstrapAgents } from "@/services/autonomousAgents/engine";
import { approvePendingAction } from "@/services/autonomousAgents/actions";
import type { ActionResult } from "@/types";
import type { AgentType, AutonomyLevel } from "@/services/autonomousAgents/types";

// ─── List agents for the current user ────────────────────────────────────────

export async function listAgents() {
  const user = await getCurrentUser();
  if (!user) return [];

  return prisma.autonomousAgent.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });
}

// ─── Bootstrap default agents (first-time setup) ─────────────────────────────

export async function bootstrapUserAgents(): Promise<ActionResult<void>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  try {
    await bootstrapAgents(user.id);
    revalidatePath("/dashboard/agents");
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao criar agentes padrão",
    };
  }
}

// ─── Update agent settings ───────────────────────────────────────────────────

export async function updateAgent(
  agentId: string,
  updates: {
    isActive?: boolean;
    autonomyLevel?: AutonomyLevel;
    schedule?: string | null;
    config?: Record<string, unknown>;
    name?: string;
  }
): Promise<ActionResult<void>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  const agent = await prisma.autonomousAgent.findFirst({
    where: { id: agentId, userId: user.id },
  });
  if (!agent) return { success: false, error: "Agente não encontrado" };

  const data: Record<string, unknown> = {};
  if (updates.isActive !== undefined) data.isActive = updates.isActive;
  if (updates.autonomyLevel) data.autonomyLevel = updates.autonomyLevel;
  if (updates.schedule !== undefined) data.schedule = updates.schedule;
  if (updates.config) data.config = updates.config as object;
  if (updates.name) data.name = updates.name;

  await prisma.autonomousAgent.update({ where: { id: agentId }, data });
  revalidatePath("/dashboard/agents");
  return { success: true, data: undefined };
}

// ─── Trigger a manual run ────────────────────────────────────────────────────

export async function runAgentNow(
  type: AgentType
): Promise<ActionResult<{ executionId: string; status: string; summary: string }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  try {
    const result = await runAgent({
      userId: user.id,
      type,
      trigger: "manual",
      triggeredBy: user.id,
    });
    revalidatePath("/dashboard/agents");
    return { success: true, data: result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao executar agente",
    };
  }
}

// ─── Get recent reports ──────────────────────────────────────────────────────

export async function getRecentReports(limit = 20) {
  const user = await getCurrentUser();
  if (!user) return [];

  return prisma.autonomousAgentReport.findMany({
    where: { agent: { userId: user.id } },
    include: { agent: { select: { type: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// ─── Get recent actions ──────────────────────────────────────────────────────

export async function getRecentActions(limit = 30) {
  const user = await getCurrentUser();
  if (!user) return [];

  return prisma.autonomousAgentAction.findMany({
    where: { agent: { userId: user.id } },
    include: { agent: { select: { type: true, name: true } } },
    orderBy: { executedAt: "desc" },
    take: limit,
  });
}

// ─── Mark report as read ─────────────────────────────────────────────────────

export async function markReportRead(reportId: string): Promise<ActionResult<void>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  const report = await prisma.autonomousAgentReport.findFirst({
    where: { id: reportId, agent: { userId: user.id } },
  });
  if (!report) return { success: false, error: "Relatório não encontrado" };

  await prisma.autonomousAgentReport.update({
    where: { id: reportId },
    data: { isRead: true },
  });
  revalidatePath("/dashboard/agents");
  return { success: true, data: undefined };
}

// ─── Approve a pending action (assisted mode) ────────────────────────────────

export async function approveAction(actionId: string): Promise<ActionResult<void>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  try {
    const result = await approvePendingAction(actionId, user.id);
    if (!result.success) return { success: false, error: result.error || "Falha ao executar ação" };
    revalidatePath("/dashboard/agents");
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao aprovar ação",
    };
  }
}

// ─── Reject a pending action ─────────────────────────────────────────────────

export async function rejectAction(actionId: string): Promise<ActionResult<void>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  const action = await prisma.autonomousAgentAction.findFirst({
    where: { id: actionId, agent: { userId: user.id } },
  });
  if (!action) return { success: false, error: "Ação não encontrada" };

  await prisma.autonomousAgentAction.update({
    where: { id: actionId },
    data: { status: "reverted", errorMessage: "Rejeitada pelo usuário" },
  });
  revalidatePath("/dashboard/agents");
  return { success: true, data: undefined };
}

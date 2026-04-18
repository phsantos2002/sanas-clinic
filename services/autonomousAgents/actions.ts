// Autonomous Agent Action Executor
//
// Takes an AgentActionProposal, enforces safety guards, executes it via the
// existing platform services, and persists an AutonomousAgentAction record
// with the agent's reasoning for auditability.
//
// Autonomy levels:
//   - "full"     : execute immediately
//   - "assisted" : create action with status="pending_approval" (UI approves later)
//   - "suggest"  : create action with status="pending_approval" + skip execution

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { sendMessage } from "@/services/whatsappService";
import type {
  AgentActionProposal,
  AutonomyLevel,
  ActionStatus,
} from "./types";

type ExecuteOpts = {
  agentId: string;
  userId: string;
  executionId: string;
  autonomyLevel: AutonomyLevel;
};

type ExecuteResult = {
  success: boolean;
  actionId: string;
  status: ActionStatus;
  error?: string;
};

// ─── Main entry point ────────────────────────────────────────────────────────

export async function executeAction(
  proposal: AgentActionProposal,
  opts: ExecuteOpts
): Promise<ExecuteResult> {
  const log = logger.child({
    agentId: opts.agentId,
    userId: opts.userId,
    actionType: proposal.type,
    targetId: proposal.targetId,
  });

  // In "suggest" or "assisted" mode, record the proposal but don't execute
  if (opts.autonomyLevel === "suggest" || opts.autonomyLevel === "assisted") {
    const action = await prisma.autonomousAgentAction.create({
      data: {
        agentId: opts.agentId,
        executionId: opts.executionId,
        type: proposal.type,
        targetType: proposal.targetType,
        targetId: proposal.targetId,
        targetName: proposal.targetName ?? null,
        reasoning: proposal.reasoning,
        payload: proposal.payload as object,
        status: "pending_approval",
      },
    });
    log.info("autonomous_agent_action_pending_approval", { actionId: action.id });
    return { success: true, actionId: action.id, status: "pending_approval" };
  }

  // "full" mode: execute then record
  try {
    const executedPayload = await runActionSideEffect(proposal, opts.userId);

    const action = await prisma.autonomousAgentAction.create({
      data: {
        agentId: opts.agentId,
        executionId: opts.executionId,
        type: proposal.type,
        targetType: proposal.targetType,
        targetId: proposal.targetId,
        targetName: proposal.targetName ?? null,
        reasoning: proposal.reasoning,
        payload: { ...proposal.payload, ...executedPayload } as object,
        status: "executed",
      },
    });

    log.info("autonomous_agent_action_executed", { actionId: action.id });
    return { success: true, actionId: action.id, status: "executed" };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const action = await prisma.autonomousAgentAction.create({
      data: {
        agentId: opts.agentId,
        executionId: opts.executionId,
        type: proposal.type,
        targetType: proposal.targetType,
        targetId: proposal.targetId,
        targetName: proposal.targetName ?? null,
        reasoning: proposal.reasoning,
        payload: proposal.payload as object,
        status: "failed",
        errorMessage,
      },
    });

    log.warn("autonomous_agent_action_failed", { actionId: action.id, err: errorMessage });
    return { success: false, actionId: action.id, status: "failed", error: errorMessage };
  }
}

// ─── Side-effect dispatcher (whitelist of what agents can actually do) ───────

async function runActionSideEffect(
  proposal: AgentActionProposal,
  userId: string
): Promise<Record<string, unknown>> {
  switch (proposal.type) {
    case "send_message":
      return await sendMessageAction(userId, proposal.targetId, proposal.payload.message);

    case "move_stage":
      return await moveStageAction(userId, proposal.targetId, proposal.payload.toStageId);

    case "add_tag":
      return await addTagAction(userId, proposal.targetId, proposal.payload.tag);

    case "remove_tag":
      return await removeTagAction(userId, proposal.targetId, proposal.payload.tag);

    case "update_score":
      return await updateScoreAction(userId, proposal.targetId, proposal.payload.delta);

    case "assign_attendant":
      return await assignAttendantAction(userId, proposal.targetId, proposal.payload.attendantId);

    case "create_notification":
      return await createNotificationAction(userId, proposal);

    default: {
      // Exhaustiveness check — if a new action type is added to the union without
      // being handled here, TypeScript will error.
      const _exhaustive: never = proposal;
      void _exhaustive;
      throw new Error(`Tipo de ação não suportado pelo executor`);
    }
  }
}

// ─── Individual action implementations ───────────────────────────────────────

async function sendMessageAction(userId: string, leadId: string, message: string) {
  // Verify lead ownership
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId },
  });
  if (!lead) throw new Error("Lead não encontrado ou não pertence ao usuário");

  const whatsappConfig = await prisma.whatsAppConfig.findUnique({ where: { userId } });
  if (!whatsappConfig) throw new Error("WhatsApp não configurado");

  const result = await sendMessage(whatsappConfig, lead.phone, message);
  if (!result.success) throw new Error(result.error || "Falha ao enviar mensagem");

  // Persist the message record (so it shows up in chat)
  await prisma.message.create({
    data: {
      leadId: lead.id,
      role: "assistant",
      content: message,
    },
  });

  // Update lead interaction timestamp
  await prisma.lead.update({
    where: { id: lead.id },
    data: { lastInteractionAt: new Date() },
  });

  return { delivered: true };
}

async function moveStageAction(userId: string, leadId: string, toStageId: string) {
  const lead = await prisma.lead.findFirst({ where: { id: leadId, userId } });
  if (!lead) throw new Error("Lead não encontrado");

  const stage = await prisma.stage.findFirst({ where: { id: toStageId, userId } });
  if (!stage) throw new Error("Estágio de destino não encontrado");

  if (lead.stageId === toStageId) {
    return { skipped: true, reason: "lead já está neste estágio" };
  }

  await prisma.$transaction([
    prisma.lead.update({ where: { id: leadId }, data: { stageId: toStageId } }),
    prisma.leadStageHistory.create({ data: { leadId, stageId: toStageId } }),
  ]);

  return { from: lead.stageId, to: toStageId, stageName: stage.name };
}

async function addTagAction(userId: string, leadId: string, tag: string) {
  const lead = await prisma.lead.findFirst({ where: { id: leadId, userId } });
  if (!lead) throw new Error("Lead não encontrado");

  const normalized = tag.trim().toLowerCase();
  if (lead.tags.includes(normalized)) return { skipped: true };

  await prisma.lead.update({
    where: { id: leadId },
    data: { tags: { push: normalized } },
  });
  return { added: normalized };
}

async function removeTagAction(userId: string, leadId: string, tag: string) {
  const lead = await prisma.lead.findFirst({ where: { id: leadId, userId } });
  if (!lead) throw new Error("Lead não encontrado");

  const normalized = tag.trim().toLowerCase();
  const next = lead.tags.filter((t) => t !== normalized);
  if (next.length === lead.tags.length) return { skipped: true };

  await prisma.lead.update({ where: { id: leadId }, data: { tags: next } });
  return { removed: normalized };
}

async function updateScoreAction(userId: string, leadId: string, delta: number) {
  const lead = await prisma.lead.findFirst({ where: { id: leadId, userId } });
  if (!lead) throw new Error("Lead não encontrado");

  const newScore = Math.max(0, Math.min(100, lead.score + delta));
  await prisma.lead.update({ where: { id: leadId }, data: { score: newScore } });
  return { from: lead.score, to: newScore, delta };
}

async function assignAttendantAction(
  userId: string,
  leadId: string,
  attendantIdOrAuto: string
) {
  const lead = await prisma.lead.findFirst({ where: { id: leadId, userId } });
  if (!lead) throw new Error("Lead não encontrado");

  let attendantId = attendantIdOrAuto;

  if (attendantIdOrAuto === "auto") {
    // Simple round-robin: pick attendant with fewest leads assigned
    const attendants = await prisma.attendant.findMany({
      where: { userId, isActive: true },
    });
    if (attendants.length === 0) throw new Error("Nenhum atendente ativo");

    // Count current assignments per attendant
    const counts = await Promise.all(
      attendants.map(async (a) => ({
        id: a.id,
        count: await prisma.lead.count({ where: { userId, assignedTo: a.id } }),
      }))
    );
    counts.sort((a, b) => a.count - b.count);
    attendantId = counts[0].id;
  } else {
    const att = await prisma.attendant.findFirst({
      where: { id: attendantIdOrAuto, userId, isActive: true },
    });
    if (!att) throw new Error("Atendente não encontrado ou inativo");
  }

  await prisma.lead.update({ where: { id: leadId }, data: { assignedTo: attendantId } });
  return { assignedTo: attendantId };
}

async function createNotificationAction(userId: string, proposal: Extract<AgentActionProposal, { type: "create_notification" }>) {
  await prisma.notification.create({
    data: {
      userId,
      type: "agent_alert",
      title: proposal.payload.title,
      message: proposal.payload.message,
      entityType: proposal.targetType,
      entityId: proposal.targetId,
    },
  });
  return { notified: true };
}

// ─── Re-execute an approved pending action (used by dashboard) ───────────────

export async function approvePendingAction(actionId: string, userId: string): Promise<ExecuteResult> {
  const action = await prisma.autonomousAgentAction.findFirst({
    where: { id: actionId, agent: { userId } },
  });
  if (!action) throw new Error("Ação não encontrada");
  if (action.status !== "pending_approval") {
    throw new Error("Ação não está pendente de aprovação");
  }

  const proposal = {
    type: action.type,
    targetType: action.targetType,
    targetId: action.targetId,
    targetName: action.targetName ?? undefined,
    reasoning: action.reasoning,
    payload: action.payload,
  } as AgentActionProposal;

  try {
    const executedPayload = await runActionSideEffect(proposal, userId);
    await prisma.autonomousAgentAction.update({
      where: { id: actionId },
      data: {
        status: "executed",
        executedAt: new Date(),
        payload: { ...(action.payload as object), ...executedPayload } as object,
      },
    });
    return { success: true, actionId, status: "executed" };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    await prisma.autonomousAgentAction.update({
      where: { id: actionId },
      data: { status: "failed", errorMessage },
    });
    return { success: false, actionId, status: "failed", error: errorMessage };
  }
}

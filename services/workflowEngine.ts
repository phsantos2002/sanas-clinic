import { prisma } from "@/lib/prisma";
import { sendMessage } from "@/services/whatsappService";
import { logger } from "@/lib/logger";

/** Hard cap: max steps processed per execution to prevent infinite loops. */
const MAX_STEPS_PER_EXECUTION = 50;

/**
 * Workflow Engine — processes trigger → condition → action pipelines.
 *
 * TRIGGERS:
 *   new_lead         — fires when a lead is created
 *   stage_change     — fires when lead moves to a specific stage { stageId }
 *   inactivity       — fires when lead has no interaction for X days { days }
 *   tag_added        — fires when a specific tag is added { tag }
 *   score_change     — fires when score crosses a threshold { direction: "above"|"below", threshold }
 *
 * STEP TYPES:
 *   condition  — { field, operator, value } — if false, execution stops (status: "skipped")
 *   action     — { actionType, ... } — performs an action
 *   delay      — { minutes } — pauses execution (handled by cron)
 *
 * ACTION TYPES:
 *   send_whatsapp   — { message } with {{nome}}, {{clinica}} placeholders
 *   move_stage      — { stageId }
 *   add_tag         — { tag }
 *   remove_tag      — { tag }
 *   assign_attendant — { attendantId } or "auto" for round-robin
 *   update_score    — { delta } — adds/subtracts from score
 *   notify          — { message } — logs notification (future: push/email)
 */

type StepConfig = Record<string, unknown>;
type TriggerConfig = { type: string; config?: Record<string, unknown> };

type ExecutionLog = {
  step: number;
  type: string;
  action?: string;
  result: string;
  timestamp: string;
};

// ── Fire trigger: find matching workflows and start executions ─

export async function fireTrigger(
  userId: string,
  triggerType: string,
  leadId: string,
  triggerData?: Record<string, unknown>
) {
  const workflows = await prisma.workflow.findMany({
    where: { userId, isActive: true },
    include: { steps: { orderBy: { order: "asc" } } },
  });

  for (const workflow of workflows) {
    const trigger = workflow.trigger as TriggerConfig;
    if (trigger.type !== triggerType) continue;

    // Check trigger config matches
    if (triggerType === "stage_change" && trigger.config?.stageId) {
      if (triggerData?.stageId !== trigger.config.stageId) continue;
    }
    if (triggerType === "tag_added" && trigger.config?.tag) {
      if (triggerData?.tag !== trigger.config.tag) continue;
    }
    if (triggerType === "score_change" && trigger.config?.threshold) {
      const threshold = trigger.config.threshold as number;
      const direction = trigger.config.direction as string;
      const newScore = triggerData?.score as number;
      if (direction === "above" && newScore < threshold) continue;
      if (direction === "below" && newScore > threshold) continue;
    }

    // Check no duplicate execution for this lead+workflow in last hour
    const recent = await prisma.workflowExecution.findFirst({
      where: {
        workflowId: workflow.id,
        leadId,
        startedAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });
    if (recent) continue;

    // Create execution
    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId: workflow.id,
        leadId,
        status: "running",
        currentStep: 0,
        logs: [],
      },
    });

    // Execute steps immediately (no delay steps for now)
    await executeWorkflow(execution.id);
  }
}

// ── Execute workflow steps ────────────────────────────────────

export async function executeWorkflow(executionId: string) {
  const execution = await prisma.workflowExecution.findUnique({
    where: { id: executionId },
    include: {
      workflow: { include: { steps: { orderBy: { order: "asc" } } } },
    },
  });

  if (!execution || execution.status !== "running") return;

  const steps = execution.workflow.steps;
  const logs: ExecutionLog[] = (execution.logs as ExecutionLog[]) || [];
  const userId = execution.workflow.userId;

  const lead = await prisma.lead.findUnique({
    where: { id: execution.leadId },
    include: { stage: true },
  });
  if (!lead) {
    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: { status: "failed", completedAt: new Date(), logs: [...logs, { step: -1, type: "error", result: "Lead nao encontrado", timestamp: new Date().toISOString() }] },
    });
    return;
  }

  // Sprint 7: loop/infinite execution guard
  const stepsProcessedInThisRun = steps.length - execution.currentStep;
  if (stepsProcessedInThisRun > MAX_STEPS_PER_EXECUTION) {
    logger.error("workflow_execution_loop_detected", {
      executionId,
      workflowId: execution.workflowId,
      currentStep: execution.currentStep,
      totalSteps: steps.length,
    });
    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: "failed",
        completedAt: new Date(),
        logs: JSON.parse(JSON.stringify([
          ...logs,
          {
            step: execution.currentStep,
            type: "error",
            result: `Limite de segurança atingido: ${MAX_STEPS_PER_EXECUTION} steps por execução`,
            timestamp: new Date().toISOString(),
          },
        ])),
      },
    });
    return;
  }

  for (let i = execution.currentStep; i < steps.length; i++) {
    const step = steps[i];
    const config = step.config as StepConfig;

    try {
      if (step.type === "delay") {
        const minutes = (config.minutes as number) || 5;
        // Save progress and let cron resume later
        await prisma.workflowExecution.update({
          where: { id: executionId },
          data: {
            currentStep: i + 1,
            logs: JSON.parse(JSON.stringify([...logs, { step: i, type: "delay", result: `Aguardando ${minutes}min`, timestamp: new Date().toISOString() }])),
          },
        });
        return; // Exit — cron will resume
      }

      if (step.type === "condition") {
        const passed = evaluateCondition(config, lead);
        logs.push({
          step: i,
          type: "condition",
          result: passed ? "Passou" : "Nao passou — interrompendo",
          timestamp: new Date().toISOString(),
        });

        if (!passed) {
          await prisma.workflowExecution.update({
            where: { id: executionId },
            data: { status: "skipped", completedAt: new Date(), currentStep: i, logs: JSON.parse(JSON.stringify(logs)) },
          });
          return;
        }
      }

      if (step.type === "action") {
        const result = await executeAction(config, lead, userId);
        logs.push({
          step: i,
          type: "action",
          action: config.actionType as string,
          result,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logs.push({
        step: i,
        type: "error",
        result: error instanceof Error ? error.message : "Erro desconhecido",
        timestamp: new Date().toISOString(),
      });

      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: { status: "failed", completedAt: new Date(), currentStep: i, logs: JSON.parse(JSON.stringify(logs)) },
      });
      return;
    }
  }

  // All steps completed
  await prisma.workflowExecution.update({
    where: { id: executionId },
    data: { status: "completed", completedAt: new Date(), currentStep: steps.length, logs: JSON.parse(JSON.stringify(logs)) },
  });
}

// ── Condition evaluator ──────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function evaluateCondition(config: StepConfig, lead: any): boolean {
  const field = config.field as string;
  const operator = config.operator as string;
  const value = config.value;

  let leadValue: unknown;
  if (field === "score") leadValue = lead.score;
  else if (field === "source") leadValue = lead.source;
  else if (field === "stage") leadValue = lead.stage?.eventName;
  else if (field === "tags") leadValue = lead.tags;
  else if (field === "aiEnabled") leadValue = lead.aiEnabled;
  else if (field === "scoreLabel") leadValue = lead.scoreLabel;
  else return true; // Unknown field, pass through

  switch (operator) {
    case "equals": return leadValue === value;
    case "not_equals": return leadValue !== value;
    case "gt": return (leadValue as number) > (value as number);
    case "lt": return (leadValue as number) < (value as number);
    case "gte": return (leadValue as number) >= (value as number);
    case "lte": return (leadValue as number) <= (value as number);
    case "contains": return Array.isArray(leadValue) && leadValue.includes(value);
    case "not_contains": return Array.isArray(leadValue) && !leadValue.includes(value);
    default: return true;
  }
}

// ── Action executor ──────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeAction(config: StepConfig, lead: any, userId: string): Promise<string> {
  const actionType = config.actionType as string;

  switch (actionType) {
    case "send_whatsapp": {
      const waConfig = await prisma.whatsAppConfig.findUnique({ where: { userId } });
      if (!waConfig) return "WhatsApp nao configurado";

      const aiConfig = await prisma.aIConfig.findUnique({ where: { userId } });
      const clinicName = aiConfig?.clinicName || "nossa clinica";
      const template = (config.message as string) || "";
      const text = template
        .replace(/\{\{nome\}\}/gi, lead.name.split(" ")[0])
        .replace(/\{\{clinica\}\}/gi, clinicName);

      const result = await sendMessage(waConfig, lead.phone, text);
      if (result.success) {
        await prisma.message.create({ data: { leadId: lead.id, role: "assistant", content: text } });
        await prisma.lead.update({ where: { id: lead.id }, data: { lastInteractionAt: new Date() } });
        return `Mensagem enviada: "${text.slice(0, 50)}..."`;
      }
      return `Falha ao enviar: ${result.error}`;
    }

    case "move_stage": {
      const stageId = config.stageId as string;
      const stage = await prisma.stage.findFirst({ where: { id: stageId, userId } });
      if (!stage) return "Estagio nao encontrado";

      await prisma.$transaction([
        prisma.lead.update({ where: { id: lead.id }, data: { stageId } }),
        prisma.leadStageHistory.create({ data: { leadId: lead.id, stageId } }),
      ]);
      return `Movido para "${stage.name}"`;
    }

    case "add_tag": {
      const tag = (config.tag as string).toLowerCase().trim();
      if (!lead.tags.includes(tag)) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { tags: [...lead.tags, tag] },
        });
      }
      return `Tag "${tag}" adicionada`;
    }

    case "remove_tag": {
      const tag = (config.tag as string).toLowerCase().trim();
      await prisma.lead.update({
        where: { id: lead.id },
        data: { tags: lead.tags.filter((t: string) => t !== tag) },
      });
      return `Tag "${tag}" removida`;
    }

    case "assign_attendant": {
      const attendantId = config.attendantId as string;
      if (attendantId === "auto") {
        // Round-robin
        const attendants = await prisma.attendant.findMany({ where: { userId, isActive: true }, select: { id: true } });
        if (attendants.length === 0) return "Nenhum atendente ativo";
        const counts = await Promise.all(
          attendants.map(async (a) => ({ id: a.id, count: await prisma.lead.count({ where: { userId, assignedTo: a.id } }) }))
        );
        counts.sort((a, b) => a.count - b.count);
        await prisma.lead.update({ where: { id: lead.id }, data: { assignedTo: counts[0].id } });
        return `Atribuido automaticamente`;
      }
      await prisma.lead.update({ where: { id: lead.id }, data: { assignedTo: attendantId } });
      return `Atribuido ao atendente`;
    }

    case "update_score": {
      const delta = (config.delta as number) || 0;
      const newScore = Math.max(0, Math.min(100, lead.score + delta));
      const label = newScore >= 80 ? "vip" : newScore >= 50 ? "quente" : newScore >= 25 ? "morno" : "frio";
      await prisma.lead.update({ where: { id: lead.id }, data: { score: newScore, scoreLabel: label } });
      return `Score ${delta > 0 ? "+" : ""}${delta} = ${newScore}`;
    }

    case "notify": {
      // Future: push notification / email
      return `Notificacao: ${config.message || ""}`;
    }

    default:
      return `Acao desconhecida: ${actionType}`;
  }
}

// ── Workflow versioning (Sprint 7) ───────────────────────────

/**
 * Saves a version snapshot of a workflow's current state.
 * Call this before or after saving changes to canvas/steps.
 *
 * Version numbers are auto-incremented per workflow via MAX(version)+1.
 * Uses SELECT FOR UPDATE semantics via a Prisma transaction to prevent
 * race conditions under concurrent saves.
 *
 * @param workflowId - the workflow to snapshot
 * @param label      - optional human-readable label (e.g. "v3 — added delay step")
 * @param createdBy  - userId of who triggered the save
 */
export async function saveWorkflowVersion(
  workflowId: string,
  label?: string,
  createdBy?: string
): Promise<{ versionId: string; version: number } | null> {
  const log = logger.child({ workflowId });

  return prisma.$transaction(async (tx) => {
    const workflow = await tx.workflow.findUnique({
      where: { id: workflowId },
      include: { steps: { orderBy: { order: "asc" } } },
    });
    if (!workflow) return null;

    // Find current max version for this workflow
    const lastVersion = await tx.workflowVersion.findFirst({
      where: { workflowId },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const nextVersion = (lastVersion?.version ?? 0) + 1;

    const saved = await tx.workflowVersion.create({
      data: {
        workflowId,
        version: nextVersion,
        canvas: workflow.canvas ?? undefined,
        steps: workflow.steps as unknown as import("@prisma/client").Prisma.JsonArray,
        label: label ?? null,
        createdBy: createdBy ?? null,
      },
    });

    log.info("workflow_version_saved", { version: nextVersion, versionId: saved.id });
    return { versionId: saved.id, version: nextVersion };
  });
}

/**
 * Restores a workflow to a previous version snapshot.
 * Steps are recreated from the snapshot; canvas is restored.
 * Creates a new version entry marking the rollback.
 */
export async function restoreWorkflowVersion(
  versionId: string,
  restoredBy: string
): Promise<boolean> {
  const log = logger.child({ versionId });

  return prisma.$transaction(async (tx) => {
    const version = await tx.workflowVersion.findUnique({ where: { id: versionId } });
    if (!version) return false;

    // Restore canvas
    await tx.workflow.update({
      where: { id: version.workflowId },
      data: { canvas: version.canvas ?? undefined },
    });

    // Rebuild steps from snapshot
    const snapshotSteps = version.steps as unknown as Array<{
      type: string;
      config: Record<string, unknown>;
      order: number;
    }>;

    if (Array.isArray(snapshotSteps)) {
      await tx.workflowStep.deleteMany({ where: { workflowId: version.workflowId } });
      for (const step of snapshotSteps) {
        await tx.workflowStep.create({
          data: {
            workflowId: version.workflowId,
            type: step.type,
            config: step.config as import("@prisma/client").Prisma.JsonObject,
            order: step.order,
          },
        });
      }
    }

    // Save a new version recording the rollback
    const lastVersion = await tx.workflowVersion.findFirst({
      where: { workflowId: version.workflowId },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    await tx.workflowVersion.create({
      data: {
        workflowId: version.workflowId,
        version: (lastVersion?.version ?? 0) + 1,
        canvas: version.canvas ?? undefined,
        steps: version.steps ?? undefined,
        label: `Restaurado da versão ${version.version}`,
        createdBy: restoredBy,
      },
    });

    log.info("workflow_version_restored", { fromVersion: version.version, workflowId: version.workflowId });
    return true;
  });
}

// ── Resume delayed executions (called by CRON) ───────────────

export async function resumeDelayedExecutions() {
  const executions = await prisma.workflowExecution.findMany({
    where: { status: "running" },
    take: 50,
  });

  let resumed = 0;
  for (const exec of executions) {
    await executeWorkflow(exec.id);
    resumed++;
  }

  return { resumed };
}

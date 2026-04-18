// Autonomous Agent Engine — Orchestrator
//
// Responsibilities:
//   - Look up agent config for a user
//   - Create execution record
//   - Build reasoning function (LLM)
//   - Invoke the agent's run() method
//   - Persist actions (via actions.executeAction) and reports
//   - Update agent stats
//   - Handle errors gracefully (one agent failing doesn't break others)

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

import { executeAction } from "./actions";
import { createReasoner } from "./reasoning";
import type {
  AgentRunner,
  AgentRunContext,
  AgentRunResult,
  AgentType,
  AutonomyLevel,
  TriggerKind,
} from "./types";

// Registry of all available agents — populated as we implement each
import { commercialAgent } from "./commercial";
import { strategistAgent } from "./strategist";
import { analystAgent } from "./analyst";
import { retentionAgent } from "./retention";
import { creativeAgent } from "./creative";

const AGENTS: Record<AgentType, AgentRunner | null> = {
  commercial: commercialAgent,
  strategist: strategistAgent,
  analyst:    analystAgent,
  retention:  retentionAgent,
  creative:   creativeAgent,
};

// ─── Run a single agent ──────────────────────────────────────────────────────

export async function runAgent(opts: {
  userId: string;
  type: AgentType;
  trigger: TriggerKind;
  triggeredBy?: string;
}): Promise<{ executionId: string; status: "completed" | "failed"; summary: string }> {
  const { userId, type, trigger, triggeredBy } = opts;
  const runner = AGENTS[type];

  if (!runner) {
    throw new Error(`Agente '${type}' ainda não implementado`);
  }

  // Find or create the agent record
  const agent = await prisma.autonomousAgent.upsert({
    where: { userId_type: { userId, type } },
    update: {},
    create: {
      userId,
      type,
      name: runner.defaultName,
      schedule: runner.defaultSchedule,
      config: runner.defaultConfig as object,
      isActive: true,
      autonomyLevel: "full",
    },
  });

  if (!agent.isActive) {
    return {
      executionId: "",
      status: "failed",
      summary: "Agente está inativo",
    };
  }

  // Create execution record
  const execution = await prisma.autonomousAgentExecution.create({
    data: {
      agentId: agent.id,
      trigger,
      triggeredBy: triggeredBy ?? null,
      status: "running",
    },
  });

  const log = logger.child({
    agent: type,
    userId,
    agentId: agent.id,
    executionId: execution.id,
  });
  log.info("autonomous_agent_run_started");

  try {
    const reason = await createReasoner(userId);

    const ctx: AgentRunContext = {
      userId,
      agentId: agent.id,
      executionId: execution.id,
      config: (agent.config as Record<string, unknown>) || {},
      autonomyLevel: agent.autonomyLevel as AutonomyLevel,
      reason,
    };

    // Run the agent's core logic
    const result: AgentRunResult = await runner.run(ctx);

    // Execute each proposed action
    let executedCount = 0;
    let failedCount = 0;
    for (const proposal of result.actions) {
      const res = await executeAction(proposal, {
        agentId: agent.id,
        userId,
        executionId: execution.id,
        autonomyLevel: agent.autonomyLevel as AutonomyLevel,
      });
      if (res.success) executedCount++;
      else failedCount++;
    }

    // Persist each report
    for (const report of result.reports) {
      await prisma.autonomousAgentReport.create({
        data: {
          agentId: agent.id,
          executionId: execution.id,
          type: report.type,
          title: report.title,
          summary: report.summary,
          details: report.details as object,
          severity: report.severity ?? "info",
        },
      });
    }

    // Finalize execution record
    await prisma.autonomousAgentExecution.update({
      where: { id: execution.id },
      data: {
        status: "completed",
        summary: result.summary,
        metrics: { ...result.metrics, executedCount, failedCount } as object,
        completedAt: new Date(),
      },
    });

    // Update agent stats
    await prisma.autonomousAgent.update({
      where: { id: agent.id },
      data: {
        lastRunAt: new Date(),
        totalRuns: { increment: 1 },
        totalActions: { increment: executedCount },
        totalReports: { increment: result.reports.length },
      },
    });

    log.info("autonomous_agent_run_completed", {
      actions: executedCount,
      failed: failedCount,
      reports: result.reports.length,
    });

    return {
      executionId: execution.id,
      status: "completed",
      summary: result.summary,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    log.error("autonomous_agent_run_failed", { err: errorMessage });

    await prisma.autonomousAgentExecution.update({
      where: { id: execution.id },
      data: {
        status: "failed",
        error: errorMessage,
        completedAt: new Date(),
      },
    });

    return {
      executionId: execution.id,
      status: "failed",
      summary: errorMessage,
    };
  }
}

// ─── Run ALL enabled agents for a single user (used by the cron) ─────────────

export async function runAllAgentsForUser(
  userId: string,
  trigger: TriggerKind = "scheduled"
): Promise<{ successful: number; failed: number; total: number }> {
  const agents = await prisma.autonomousAgent.findMany({
    where: { userId, isActive: true },
  });

  // If user has no agents yet, bootstrap the registered ones
  if (agents.length === 0) {
    // Do nothing — agents are created lazily on first manual run, or via
    // bootstrapAgents() below when the user enables the feature.
    return { successful: 0, failed: 0, total: 0 };
  }

  let successful = 0;
  let failed = 0;

  for (const agent of agents) {
    if (!AGENTS[agent.type as AgentType]) continue; // skip unimplemented types

    const result = await runAgent({
      userId,
      type: agent.type as AgentType,
      trigger,
    });
    if (result.status === "completed") successful++;
    else failed++;
  }

  return { successful, failed, total: successful + failed };
}

// ─── Bootstrap default agents for a new user ─────────────────────────────────

export async function bootstrapAgents(userId: string): Promise<void> {
  for (const [type, runner] of Object.entries(AGENTS)) {
    if (!runner) continue;
    await prisma.autonomousAgent.upsert({
      where: { userId_type: { userId, type } },
      update: {},
      create: {
        userId,
        type,
        name: runner.defaultName,
        schedule: runner.defaultSchedule,
        config: runner.defaultConfig as object,
        isActive: true,
        autonomyLevel: "full",
      },
    });
  }
}

// Autonomous Agent System — shared types

export type AgentType = "commercial" | "strategist" | "analyst" | "retention" | "creative";

export type AutonomyLevel = "full" | "assisted" | "suggest";

export type TriggerKind = "scheduled" | "manual" | "event";

export type ActionStatus = "executed" | "failed" | "reverted" | "pending_approval";

export type ReportType = "daily" | "weekly" | "alert" | "insight";

export type ReportSeverity = "info" | "warning" | "critical";

export type TargetType = "lead" | "campaign" | "post" | "stage" | "workflow";

// Discriminated union of all actions an agent can propose.
// Adding a new action type requires updating both here and the executor in actions.ts.
export type AgentActionProposal =
  | {
      type: "send_message";
      targetType: "lead";
      targetId: string;
      targetName?: string;
      reasoning: string;
      payload: { message: string };
    }
  | {
      type: "move_stage";
      targetType: "lead";
      targetId: string;
      targetName?: string;
      reasoning: string;
      payload: { toStageId: string; toStageName?: string };
    }
  | {
      type: "add_tag";
      targetType: "lead";
      targetId: string;
      targetName?: string;
      reasoning: string;
      payload: { tag: string };
    }
  | {
      type: "remove_tag";
      targetType: "lead";
      targetId: string;
      targetName?: string;
      reasoning: string;
      payload: { tag: string };
    }
  | {
      type: "update_score";
      targetType: "lead";
      targetId: string;
      targetName?: string;
      reasoning: string;
      payload: { delta: number };
    }
  | {
      type: "assign_attendant";
      targetType: "lead";
      targetId: string;
      targetName?: string;
      reasoning: string;
      payload: { attendantId: string | "auto" };
    }
  | {
      type: "create_notification";
      targetType: "lead" | "campaign" | "post" | "stage";
      targetId: string;
      targetName?: string;
      reasoning: string;
      payload: { title: string; message: string; severity?: ReportSeverity };
    };

// Structured report the agent emits at the end of an execution
export type AgentReportDraft = {
  type: ReportType;
  title: string;
  summary: string;        // markdown ok
  details: unknown;       // JSON — agent-specific (charts, tables, lists)
  severity?: ReportSeverity;
};

// Result of an agent run — used by the engine for persistence
export type AgentRunResult = {
  summary: string;
  metrics: Record<string, number | string | boolean>;
  actions: AgentActionProposal[];
  reports: AgentReportDraft[];
};

// Contract every agent module must fulfill
export interface AgentRunner {
  type: AgentType;
  defaultName: string;
  defaultSchedule: string;           // cron expression
  defaultConfig: Record<string, unknown>;
  run(ctx: AgentRunContext): Promise<AgentRunResult>;
}

// Context passed to every agent when it runs
export type AgentRunContext = {
  userId: string;
  agentId: string;
  executionId: string;
  config: Record<string, unknown>;
  autonomyLevel: AutonomyLevel;
  // Helper: the LLM client (uses the user's own API key)
  reason: (prompt: string, options?: { temperature?: number; maxTokens?: number }) => Promise<string>;
};

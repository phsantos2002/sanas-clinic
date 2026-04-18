"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  bootstrapUserAgents,
  runAgentNow,
  updateAgent,
  approveAction,
  rejectAction,
  markReportRead,
} from "@/app/actions/autonomousAgents";
import type { AgentType, AutonomyLevel } from "@/services/autonomousAgents/types";

// ─── Types ───────────────────────────────────────────────────────────────────

type Agent = {
  id: string;
  type: string;
  name: string;
  isActive: boolean;
  autonomyLevel: string;
  schedule: string | null;
  lastRunAt: Date | null;
  totalRuns: number;
  totalActions: number;
  totalReports: number;
  config: unknown;
};

type Report = {
  id: string;
  agentId: string;
  type: string;
  title: string;
  summary: string;
  details: unknown;
  severity: string;
  isRead: boolean;
  createdAt: Date;
  agent: { type: string; name: string };
};

type Action = {
  id: string;
  agentId: string;
  type: string;
  targetType: string;
  targetId: string;
  targetName: string | null;
  reasoning: string;
  payload: unknown;
  status: string;
  errorMessage: string | null;
  executedAt: Date;
  agent: { type: string; name: string };
};

type Props = {
  agents: Agent[];
  reports: Report[];
  actions: Action[];
};

// ─── Agent meta (labels + icons) ─────────────────────────────────────────────

const AGENT_META: Record<string, { emoji: string; description: string; color: string }> = {
  commercial: {
    emoji: "💰",
    description: "Monitora o pipeline, dispara follow-ups e reativa leads parados",
    color: "bg-emerald-50 border-emerald-200 text-emerald-800",
  },
  strategist: {
    emoji: "🎯",
    description: "Analisa campanhas, sugere alocação de budget e decisões estratégicas",
    color: "bg-violet-50 border-violet-200 text-violet-800",
  },
  analyst: {
    emoji: "📊",
    description: "Detecta anomalias nos dados e gera relatórios periódicos",
    color: "bg-blue-50 border-blue-200 text-blue-800",
  },
  retention: {
    emoji: "🔄",
    description: "Identifica risco de churn e age para reter clientes",
    color: "bg-amber-50 border-amber-200 text-amber-800",
  },
  creative: {
    emoji: "🎨",
    description: "Analisa performance de conteúdo e sugere pauta",
    color: "bg-pink-50 border-pink-200 text-pink-800",
  },
};

// ─── Main component ──────────────────────────────────────────────────────────

export function AgentsDashboard({ agents, reports, actions }: Props) {
  const [tab, setTab] = useState<"overview" | "reports" | "actions" | "settings">("overview");
  const [isPending, startTransition] = useTransition();

  const hasAgents = agents.length > 0;
  const pendingActions = actions.filter((a) => a.status === "pending_approval");

  // ── Bootstrap agents (first run) ──
  async function handleBootstrap() {
    startTransition(async () => {
      const result = await bootstrapUserAgents();
      if (result.success) {
        toast.success("Agentes criados — revise as configurações e ative os que quiser.");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Agentes Autônomos</h1>
          <p className="text-sm text-slate-500 mt-1">
            Funcionários de IA que analisam seus dados, tomam decisões e executam ações 24/7.
          </p>
        </div>
        {!hasAgents && (
          <Button onClick={handleBootstrap} disabled={isPending}>
            {isPending ? "Criando..." : "Ativar meus agentes"}
          </Button>
        )}
      </div>

      {/* Empty state */}
      {!hasAgents && (
        <div className="p-8 bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-2xl text-center">
          <div className="text-5xl mb-3">🤖</div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Comece com seu time de agentes</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
            Cada agente é especializado em uma área do negócio. Eles rodam sozinhos em horários
            definidos, analisam dados, tomam decisões e executam ações.
          </p>
          <Button onClick={handleBootstrap} disabled={isPending}>
            {isPending ? "Criando..." : "Criar agentes padrão"}
          </Button>
        </div>
      )}

      {hasAgents && (
        <>
          {/* Tabs */}
          <div className="flex gap-1 border-b border-slate-200">
            <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>Visão geral</TabButton>
            <TabButton active={tab === "reports"} onClick={() => setTab("reports")}>
              Relatórios {reports.filter((r) => !r.isRead).length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                  {reports.filter((r) => !r.isRead).length}
                </span>
              )}
            </TabButton>
            <TabButton active={tab === "actions"} onClick={() => setTab("actions")}>
              Ações {pendingActions.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                  {pendingActions.length}
                </span>
              )}
            </TabButton>
            <TabButton active={tab === "settings"} onClick={() => setTab("settings")}>Configurações</TabButton>
          </div>

          {/* Tab content */}
          {tab === "overview" && <OverviewTab agents={agents} />}
          {tab === "reports" && <ReportsTab reports={reports} />}
          {tab === "actions" && <ActionsTab actions={actions} />}
          {tab === "settings" && <SettingsTab agents={agents} />}
        </>
      )}
    </div>
  );
}

// ─── Tab button ──────────────────────────────────────────────────────────────

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
        active
          ? "border-slate-900 text-slate-900"
          : "border-transparent text-slate-500 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Overview Tab ────────────────────────────────────────────────────────────

function OverviewTab({ agents }: { agents: Agent[] }) {
  const [isPending, startTransition] = useTransition();

  async function handleRun(type: string) {
    startTransition(async () => {
      const result = await runAgentNow(type as AgentType);
      if (result.success) {
        toast.success(result.data?.summary || "Agente executado");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {agents.map((agent) => {
        const meta = AGENT_META[agent.type] ?? AGENT_META.commercial;
        return (
          <div key={agent.id} className="p-5 bg-white border border-slate-200 rounded-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{meta.emoji}</div>
                <div>
                  <h3 className="font-semibold text-slate-900">{agent.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{meta.description}</p>
                </div>
              </div>
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  agent.isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {agent.isActive ? "Ativo" : "Inativo"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4">
              <Stat label="Execuções" value={agent.totalRuns} />
              <Stat label="Ações" value={agent.totalActions} />
              <Stat label="Relatórios" value={agent.totalReports} />
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                {agent.lastRunAt
                  ? `Última execução: ${new Date(agent.lastRunAt).toLocaleString("pt-BR")}`
                  : "Nunca executado"}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={isPending || !agent.isActive}
                onClick={() => handleRun(agent.type)}
              >
                {isPending ? "..." : "Executar agora"}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center p-2 bg-slate-50 rounded-lg">
      <div className="text-lg font-semibold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

// ─── Reports Tab ─────────────────────────────────────────────────────────────

function ReportsTab({ reports }: { reports: Report[] }) {
  const [isPending, startTransition] = useTransition();

  if (reports.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        Nenhum relatório ainda. Execute um agente para gerar o primeiro.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => {
        const meta = AGENT_META[report.agent.type] ?? AGENT_META.commercial;
        const severityColor =
          report.severity === "critical"
            ? "border-red-200 bg-red-50"
            : report.severity === "warning"
            ? "border-amber-200 bg-amber-50"
            : "border-slate-200 bg-white";

        return (
          <div
            key={report.id}
            className={`p-4 border rounded-xl ${severityColor} ${report.isRead ? "opacity-60" : ""}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="text-2xl shrink-0">{meta.emoji}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-500">{report.agent.name}</span>
                    <span className="text-xs text-slate-300">•</span>
                    <span className="text-xs text-slate-500">
                      {new Date(report.createdAt).toLocaleString("pt-BR")}
                    </span>
                    <span className="px-1.5 py-0.5 text-[10px] bg-white/60 text-slate-600 rounded uppercase tracking-wide">
                      {report.type}
                    </span>
                  </div>
                  <h4 className="font-semibold text-slate-900 mt-1">{report.title}</h4>
                  <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{report.summary}</p>
                </div>
              </div>
              {!report.isRead && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      await markReportRead(report.id);
                    });
                  }}
                >
                  Marcar como lido
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Actions Tab ─────────────────────────────────────────────────────────────

function ActionsTab({ actions }: { actions: Action[] }) {
  const [isPending, startTransition] = useTransition();

  if (actions.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        Nenhuma ação registrada ainda.
      </div>
    );
  }

  const statusStyles: Record<string, string> = {
    executed: "bg-emerald-50 text-emerald-700",
    failed: "bg-red-50 text-red-700",
    pending_approval: "bg-amber-50 text-amber-700",
    reverted: "bg-slate-100 text-slate-500",
  };

  const actionLabels: Record<string, string> = {
    send_message: "Mensagem enviada",
    move_stage: "Estágio alterado",
    add_tag: "Tag adicionada",
    remove_tag: "Tag removida",
    update_score: "Score ajustado",
    assign_attendant: "Atendente atribuído",
    create_notification: "Notificação criada",
  };

  return (
    <div className="space-y-2">
      {actions.map((action) => {
        const meta = AGENT_META[action.agent.type] ?? AGENT_META.commercial;
        const payload = action.payload as Record<string, unknown>;

        return (
          <div key={action.id} className="p-4 bg-white border border-slate-200 rounded-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="text-xl shrink-0">{meta.emoji}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-900">
                      {actionLabels[action.type] ?? action.type}
                    </span>
                    {action.targetName && (
                      <>
                        <span className="text-slate-300">→</span>
                        <span className="text-sm text-slate-700">{action.targetName}</span>
                      </>
                    )}
                    <span className={`ml-auto px-2 py-0.5 text-xs rounded-full ${statusStyles[action.status] ?? "bg-slate-100"}`}>
                      {action.status === "pending_approval"
                        ? "Aguarda aprovação"
                        : action.status === "executed"
                        ? "Executada"
                        : action.status === "failed"
                        ? "Falhou"
                        : "Revertida"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(action.executedAt).toLocaleString("pt-BR")} • {action.agent.name}
                  </p>
                  <div className="mt-2 p-2 bg-slate-50 rounded text-xs text-slate-700">
                    <strong className="text-slate-500">Raciocínio:</strong> {action.reasoning}
                  </div>
                  {action.type === "send_message" && typeof payload.message === "string" && (
                    <div className="mt-2 p-2 bg-emerald-50 rounded text-sm text-emerald-900 whitespace-pre-wrap">
                      &ldquo;{payload.message}&rdquo;
                    </div>
                  )}
                  {action.errorMessage && (
                    <p className="mt-2 text-xs text-red-600">Erro: {action.errorMessage}</p>
                  )}
                </div>
              </div>
            </div>

            {action.status === "pending_approval" && (
              <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await rejectAction(action.id);
                      result.success ? toast.success("Ação rejeitada") : toast.error(result.error);
                    });
                  }}
                >
                  Rejeitar
                </Button>
                <Button
                  size="sm"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await approveAction(action.id);
                      result.success ? toast.success("Ação executada") : toast.error(result.error);
                    });
                  }}
                >
                  Aprovar e executar
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Settings Tab ────────────────────────────────────────────────────────────

function SettingsTab({ agents }: { agents: Agent[] }) {
  const [isPending, startTransition] = useTransition();

  async function toggle(agent: Agent) {
    startTransition(async () => {
      const result = await updateAgent(agent.id, { isActive: !agent.isActive });
      if (result.success) {
        toast.success(agent.isActive ? "Agente pausado" : "Agente ativado");
      } else {
        toast.error(result.error);
      }
    });
  }

  async function changeAutonomy(agent: Agent, level: AutonomyLevel) {
    startTransition(async () => {
      const result = await updateAgent(agent.id, { autonomyLevel: level });
      if (result.success) toast.success("Autonomia atualizada");
      else toast.error(result.error);
    });
  }

  return (
    <div className="space-y-4">
      {agents.map((agent) => {
        const meta = AGENT_META[agent.type] ?? AGENT_META.commercial;
        return (
          <div key={agent.id} className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">{meta.emoji}</div>
                <div>
                  <h3 className="font-semibold text-slate-900">{agent.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{meta.description}</p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agent.isActive}
                  onChange={() => toggle(agent)}
                  disabled={isPending}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-700">Ativo</span>
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-700">Nível de autonomia</label>
              <div className="flex gap-2">
                {(["full", "assisted", "suggest"] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => changeAutonomy(agent, level)}
                    disabled={isPending}
                    className={`flex-1 px-3 py-2 text-xs rounded-lg border transition ${
                      agent.autonomyLevel === level
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {level === "full" && "Total — executa tudo"}
                    {level === "assisted" && "Assistido — pede aprovação"}
                    {level === "suggest" && "Sugestão — só recomenda"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400">
                {agent.autonomyLevel === "full" && "Agente executa ações sem aprovação. Todas as ações ficam registradas para auditoria."}
                {agent.autonomyLevel === "assisted" && "Agente propõe ações e você aprova cada uma na aba Ações."}
                {agent.autonomyLevel === "suggest" && "Agente apenas sugere — nenhuma ação é executada automaticamente."}
              </p>
            </div>

            <div className="text-xs text-slate-500 pt-2 border-t border-slate-100">
              Agendamento: <span className="font-mono">{agent.schedule ?? "manual"}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

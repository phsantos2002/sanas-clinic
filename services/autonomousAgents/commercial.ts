// Commercial Agent — Autonomous Sales Agent
//
// Scope: monitora o pipeline e age sobre leads que estão parados ou em risco.
//
// What it does on every run:
//   1. Gather context: pipeline snapshot (leads by stage, stagnation metrics, scoring distribution)
//   2. Identify "stuck" leads — sitting in a stage longer than the configured threshold
//   3. For each stuck lead: ask the LLM for a personalized follow-up message
//   4. Propose actions: send_message + add_tag "follow_up_auto"
//   5. Generate a daily report: "X leads reativados, Y quentes sem follow-up, Z ações tomadas"
//
// Why this agent first: highest immediate ROI. Pipeline parado = dinheiro na mesa.

import { prisma } from "@/lib/prisma";
import type {
  AgentRunner,
  AgentRunContext,
  AgentRunResult,
  AgentActionProposal,
} from "./types";
import { parseJsonFromLLM } from "./reasoning";

type CommercialConfig = {
  // Dias sem interação antes de considerar um lead "parado" (por estágio, fallback global)
  stagnationThresholdDays: number;
  // Score mínimo para o agente gerar follow-up (leads frios são ignorados por padrão)
  minScore: number;
  // Máximo de follow-ups que o agente vai enviar por rodada (proteção contra spam em massa)
  maxActionsPerRun: number;
  // Intervalo mínimo entre dois follow-ups automáticos para o mesmo lead
  cooldownHours: number;
};

const DEFAULT_CONFIG: CommercialConfig = {
  stagnationThresholdDays: 3,
  minScore: 30,
  maxActionsPerRun: 10,
  cooldownHours: 48,
};

export const commercialAgent: AgentRunner = {
  type: "commercial",
  defaultName: "Agente de Vendas",
  defaultSchedule: "0 9 * * *", // Todo dia 9h
  defaultConfig: DEFAULT_CONFIG as unknown as Record<string, unknown>,

  async run(ctx: AgentRunContext): Promise<AgentRunResult> {
    const config = { ...DEFAULT_CONFIG, ...(ctx.config as Partial<CommercialConfig>) };

    // ── 1. Gather context ────────────────────────────────────────────────────
    const [stages, leads, existingAgentActions] = await Promise.all([
      prisma.stage.findMany({
        where: { userId: ctx.userId },
        orderBy: { order: "asc" },
      }),
      prisma.lead.findMany({
        where: { userId: ctx.userId, stageId: { not: null } },
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 5, // Últimas 5 msgs para contexto
          },
          stage: true,
        },
        take: 500, // limite de segurança
      }),
      prisma.autonomousAgentAction.findMany({
        where: {
          agent: { userId: ctx.userId, type: "commercial" },
          type: "send_message",
          executedAt: {
            gte: new Date(Date.now() - config.cooldownHours * 60 * 60 * 1000),
          },
        },
        select: { targetId: true },
      }),
    ]);

    const cooldownLeadIds = new Set(existingAgentActions.map((a) => a.targetId));

    // ── 2. Identify stuck leads ──────────────────────────────────────────────
    const now = Date.now();
    const stuckLeads = leads.filter((lead) => {
      if (lead.score < config.minScore) return false;
      if (cooldownLeadIds.has(lead.id)) return false;
      if (!lead.aiEnabled) return false; // respeita pausa da IA
      if (lead.humanPausedUntil && lead.humanPausedUntil > new Date()) return false;

      const lastInteraction = lead.lastInteractionAt ?? lead.updatedAt;
      const daysSince = (now - lastInteraction.getTime()) / (1000 * 60 * 60 * 24);

      // Usa threshold do estágio se configurado; senão o global
      const threshold = lead.stage?.stagnationDaysThreshold ?? config.stagnationThresholdDays;
      return daysSince >= threshold;
    });

    // Ordena por maior score primeiro (priorizar leads quentes)
    stuckLeads.sort((a, b) => b.score - a.score);

    // Pega só até maxActionsPerRun
    const candidates = stuckLeads.slice(0, config.maxActionsPerRun);

    // ── 3. Generate personalized follow-ups via LLM ──────────────────────────
    const actions: AgentActionProposal[] = [];

    for (const lead of candidates) {
      const daysSince = Math.floor(
        (now - (lead.lastInteractionAt ?? lead.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      const conversationHistory = lead.messages
        .reverse()
        .map((m) => `${m.role === "user" ? "Cliente" : "Atendente"}: ${m.content}`)
        .join("\n");

      const prompt = `Você é um consultor comercial experiente. Gere UMA mensagem curta de follow-up (WhatsApp) para reengajar este lead que ficou parado.

DADOS DO LEAD:
- Nome: ${lead.name}
- Estágio atual: ${lead.stage?.name ?? "sem estágio"}
- Score: ${lead.score} (${lead.scoreLabel ?? "n/d"})
- Dias sem interação: ${daysSince}
- Origem: ${lead.source ?? "n/d"}
- Tags: ${lead.tags.join(", ") || "nenhuma"}

ÚLTIMAS MENSAGENS:
${conversationHistory || "(nenhuma mensagem anterior)"}

REGRAS:
- Seja natural, pessoal, empático — NÃO soe como bot
- Comece chamando o lead pelo primeiro nome
- Referencie o contexto da última conversa se houver
- Proponha UM próximo passo claro (ex: agendar, tirar dúvida, mostrar algo específico)
- Máximo 2 linhas, sem emojis excessivos
- Se não houver conversa anterior, faça uma abordagem gentil perguntando se ainda tem interesse

RESPONDA APENAS COM O JSON:
{"message": "texto da mensagem aqui", "reasoning": "por que essa abordagem"}`;

      try {
        const response = await ctx.reason(prompt, { temperature: 0.6, maxTokens: 400 });
        const parsed = parseJsonFromLLM<{ message: string; reasoning: string }>(response);

        if (!parsed?.message) continue;

        actions.push({
          type: "send_message",
          targetType: "lead",
          targetId: lead.id,
          targetName: lead.name,
          reasoning: parsed.reasoning || `Lead parado há ${daysSince} dias no estágio "${lead.stage?.name}"`,
          payload: { message: parsed.message },
        });

        // Também adiciona uma tag para auditoria/segmentação
        actions.push({
          type: "add_tag",
          targetType: "lead",
          targetId: lead.id,
          targetName: lead.name,
          reasoning: "Marcação de follow-up automático para filtro no CRM",
          payload: { tag: "follow_up_auto" },
        });
      } catch {
        // LLM falhou para este lead — pula, continua os outros
        continue;
      }
    }

    // ── 4. Build the daily report ────────────────────────────────────────────
    const totalByStage = stages.map((s) => ({
      stageName: s.name,
      total: leads.filter((l) => l.stageId === s.id).length,
      stuck: stuckLeads.filter((l) => l.stageId === s.id).length,
    }));

    const hotStuck = stuckLeads.filter((l) => l.score >= 70).length;
    const warmStuck = stuckLeads.filter((l) => l.score >= 40 && l.score < 70).length;

    const severity = hotStuck >= 5 ? "critical" : hotStuck >= 2 ? "warning" : "info";

    const summary = candidates.length > 0
      ? `Identifiquei ${stuckLeads.length} leads parados (${hotStuck} quentes, ${warmStuck} mornos). Disparei ${candidates.length} follow-ups personalizados.`
      : `Pipeline saudável — ${leads.length} leads ativos, ${stuckLeads.length} parados (nenhum ação necessária no momento).`;

    return {
      summary,
      metrics: {
        totalLeads: leads.length,
        stuckLeads: stuckLeads.length,
        hotStuck,
        warmStuck,
        followUpsProposed: candidates.length,
      },
      actions,
      reports: [
        {
          type: "daily",
          title: "Relatório de Pipeline — Agente de Vendas",
          summary,
          severity,
          details: {
            byStage: totalByStage,
            stuckLeadsList: stuckLeads.slice(0, 20).map((l) => ({
              id: l.id,
              name: l.name,
              stage: l.stage?.name ?? null,
              score: l.score,
              daysSince: Math.floor(
                (now - (l.lastInteractionAt ?? l.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
              ),
            })),
            actionsExecuted: candidates.map((l) => ({ id: l.id, name: l.name })),
          },
        },
      ],
    };
  },
};

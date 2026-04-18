// Retention Agent — Reativação & Pós-venda
//
// Scope: cuida de quem JÁ é cliente ou está próximo de abandonar.
// Complementa o commercial (que cuida de lead novo) atuando no ciclo pós-fechamento.
//
// O que faz:
//   1. Identifica clientes no estágio final (fechado/ganho) sem interação há X dias
//   2. Identifica leads VIP (score >= 90) sem interação há Y dias (risco de churn)
//   3. Gera mensagens personalizadas de reativação/pesquisa de satisfação
//   4. Marca com tag "reativacao_auto" para rastreio
//
// Respeita cooldown (reactivationSentAt) — nunca faz spam.
// Roda 2x por semana (terça e sexta 10h).

import { prisma } from "@/lib/prisma";
import type {
  AgentRunner,
  AgentRunContext,
  AgentRunResult,
  AgentActionProposal,
} from "./types";
import { parseJsonFromLLM } from "./reasoning";

type RetentionConfig = {
  clientInactiveDays: number;      // cliente fechado sem falar há X dias
  vipAtRiskDays: number;           // VIP sem interação há Y dias
  cooldownDays: number;            // intervalo mínimo entre reativações
  maxActionsPerRun: number;
};

const DEFAULT_CONFIG: RetentionConfig = {
  clientInactiveDays: 30,
  vipAtRiskDays: 14,
  cooldownDays: 30,
  maxActionsPerRun: 15,
};

export const retentionAgent: AgentRunner = {
  type: "retention",
  defaultName: "Agente de Retenção",
  defaultSchedule: "0 10 * * 2,5", // Terça e sexta 10h
  defaultConfig: DEFAULT_CONFIG as unknown as Record<string, unknown>,

  async run(ctx: AgentRunContext): Promise<AgentRunResult> {
    const config = { ...DEFAULT_CONFIG, ...(ctx.config as Partial<RetentionConfig>) };

    const now = Date.now();
    const cooldownThreshold = new Date(now - config.cooldownDays * 86400_000);

    // ── 1. Gather context ────────────────────────────────────────────────────
    const stages = await prisma.stage.findMany({
      where: { userId: ctx.userId },
      orderBy: { order: "asc" },
    });

    const closedStage = stages.at(-1);
    if (!stages.length) {
      return {
        summary: "Nenhum estágio configurado — agente de retenção não pode operar.",
        metrics: { totalLeads: 0 },
        actions: [],
        reports: [],
      };
    }

    const leads = await prisma.lead.findMany({
      where: {
        userId: ctx.userId,
        aiEnabled: true,
        OR: [
          { stageId: closedStage?.id }, // clientes fechados
          { score: { gte: 90 } },        // VIPs
        ],
      },
      include: {
        stage: true,
        messages: { orderBy: { createdAt: "desc" }, take: 3 },
      },
      take: 300,
    });

    // ── 2. Classificar candidatos ────────────────────────────────────────────
    type Candidate = {
      lead: (typeof leads)[number];
      reason: "client_inactive" | "vip_at_risk";
      daysSince: number;
    };

    const candidates: Candidate[] = [];

    for (const lead of leads) {
      // Respeita cooldown
      if (lead.reactivationSentAt && lead.reactivationSentAt > cooldownThreshold) continue;
      // Respeita pausa humana
      if (lead.humanPausedUntil && lead.humanPausedUntil > new Date()) continue;

      const lastInteraction = lead.lastInteractionAt ?? lead.updatedAt;
      const daysSince = Math.floor((now - lastInteraction.getTime()) / 86400_000);

      if (lead.stageId === closedStage?.id && daysSince >= config.clientInactiveDays) {
        candidates.push({ lead, reason: "client_inactive", daysSince });
      } else if (lead.score >= 90 && daysSince >= config.vipAtRiskDays) {
        candidates.push({ lead, reason: "vip_at_risk", daysSince });
      }
    }

    // Prioriza VIPs em risco primeiro, depois por maior tempo de inatividade
    candidates.sort((a, b) => {
      if (a.reason !== b.reason) return a.reason === "vip_at_risk" ? -1 : 1;
      return b.daysSince - a.daysSince;
    });

    const selected = candidates.slice(0, config.maxActionsPerRun);

    // ── 3. Gerar mensagens personalizadas ────────────────────────────────────
    const actions: AgentActionProposal[] = [];

    for (const { lead, reason, daysSince } of selected) {
      const history = lead.messages
        .reverse()
        .map((m) => `${m.role === "user" ? "Cliente" : "Atendente"}: ${m.content}`)
        .join("\n");

      const contextIntent =
        reason === "client_inactive"
          ? "fazer uma abordagem de pós-venda/reativação amigável. Pergunte como está a experiência, se precisa de algo, oferece algo útil sem parecer vendedor."
          : "reaproximar-se de um lead VIP que estava interessado mas sumiu. Perguntar se está tudo bem, oferecer ajuda, deixar porta aberta sem pressão.";

      const prompt = `Você é responsável por retenção de clientes. Gere UMA mensagem curta e personalizada.

DADOS:
- Nome: ${lead.name}
- Estágio: ${lead.stage?.name ?? "sem estágio"}
- Score: ${lead.score}
- Dias sem interação: ${daysSince}
- Tags: ${lead.tags.join(", ") || "nenhuma"}

ÚLTIMAS MENSAGENS:
${history || "(sem histórico)"}

OBJETIVO: ${contextIntent}

REGRAS:
- Chame pelo primeiro nome
- Máximo 2 linhas, sem emojis em excesso
- Sem pressão comercial — tom humano, cuidadoso
- UM próximo passo claro e leve (ex: "me conta como foi", "posso te ajudar com algo")

RESPONDA APENAS COM JSON:
{"message": "texto", "reasoning": "por que essa abordagem"}`;

      try {
        const response = await ctx.reason(prompt, { temperature: 0.7, maxTokens: 400 });
        const parsed = parseJsonFromLLM<{ message: string; reasoning: string }>(response);
        if (!parsed?.message) continue;

        actions.push({
          type: "send_message",
          targetType: "lead",
          targetId: lead.id,
          targetName: lead.name,
          reasoning:
            parsed.reasoning ||
            `${reason === "vip_at_risk" ? "VIP em risco" : "Cliente inativo"} há ${daysSince} dias`,
          payload: { message: parsed.message },
        });

        actions.push({
          type: "add_tag",
          targetType: "lead",
          targetId: lead.id,
          targetName: lead.name,
          reasoning: "Marcação para rastrear ciclo de retenção automática",
          payload: { tag: "reativacao_auto" },
        });
      } catch {
        continue;
      }
    }

    // Atualiza reactivationSentAt dos leads selecionados (prevenção de duplicata
    // mesmo se houver erro no executor de ação — melhor cautela do que spam)
    if (selected.length > 0) {
      await prisma.lead.updateMany({
        where: { id: { in: selected.map((c) => c.lead.id) } },
        data: { reactivationSentAt: new Date() },
      });
    }

    // ── 4. Report ────────────────────────────────────────────────────────────
    const vipAtRisk = candidates.filter((c) => c.reason === "vip_at_risk").length;
    const clientsInactive = candidates.filter((c) => c.reason === "client_inactive").length;

    const severity = vipAtRisk >= 3 ? "warning" : "info";

    const summary =
      selected.length > 0
        ? `Reativei ${selected.length} de ${candidates.length} candidatos (${vipAtRisk} VIPs em risco, ${clientsInactive} clientes inativos).`
        : `Nenhum cliente ou VIP em situação crítica — base saudável.`;

    return {
      summary,
      metrics: {
        candidates: candidates.length,
        reactivated: selected.length,
        vipAtRisk,
        clientsInactive,
      },
      actions,
      reports: [
        {
          type: "weekly",
          title: "Retenção & Pós-venda",
          summary,
          severity,
          details: {
            candidates: candidates.slice(0, 20).map((c) => ({
              id: c.lead.id,
              name: c.lead.name,
              reason: c.reason,
              daysSince: c.daysSince,
              score: c.lead.score,
            })),
            reactivated: selected.map((c) => ({
              id: c.lead.id,
              name: c.lead.name,
              reason: c.reason,
            })),
          },
        },
      ],
    };
  },
};

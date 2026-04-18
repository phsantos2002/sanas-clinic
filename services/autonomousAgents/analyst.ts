// Analyst Agent — Analista de Dados
//
// Scope: análise profunda de métricas operacionais. Somente relatórios/insights.
// Não altera nada no sistema — é o olho clínico da operação.
//
// O que produz:
//   - Distribuição de score (frio/morno/quente) e evolução semanal
//   - Tempo médio por estágio + gargalos no funil
//   - Taxa de resposta por atendente (quando houver múltiplos)
//   - Taxa de conversão por estágio (drop-off funnel)
//   - Insights acionáveis gerados por LLM
//
// Roda semanalmente (segunda 7h) — antes do strategist consumir os dados.

import { prisma } from "@/lib/prisma";
import type {
  AgentRunner,
  AgentRunContext,
  AgentRunResult,
  AgentActionProposal,
} from "./types";
import { parseJsonFromLLM } from "./reasoning";

type AnalystConfig = {
  analysisWindowDays: number;
};

const DEFAULT_CONFIG: AnalystConfig = {
  analysisWindowDays: 14,
};

export const analystAgent: AgentRunner = {
  type: "analyst",
  defaultName: "Agente Analista",
  defaultSchedule: "0 7 * * 1", // Toda segunda 7h
  defaultConfig: DEFAULT_CONFIG as unknown as Record<string, unknown>,

  async run(ctx: AgentRunContext): Promise<AgentRunResult> {
    const config = { ...DEFAULT_CONFIG, ...(ctx.config as Partial<AnalystConfig>) };

    const windowStart = new Date(Date.now() - config.analysisWindowDays * 86400_000);

    // ── 1. Gather context ────────────────────────────────────────────────────
    const [stages, leads, stageHistory, messages] = await Promise.all([
      prisma.stage.findMany({
        where: { userId: ctx.userId },
        orderBy: { order: "asc" },
      }),
      prisma.lead.findMany({
        where: { userId: ctx.userId },
        select: {
          id: true,
          score: true,
          scoreLabel: true,
          stageId: true,
          source: true,
          createdAt: true,
          updatedAt: true,
          tags: true,
          lastInteractionAt: true,
        },
      }),
      prisma.leadStageHistory.findMany({
        where: {
          lead: { userId: ctx.userId },
          createdAt: { gte: windowStart },
        },
        select: { stageId: true, createdAt: true, leadId: true },
        orderBy: [{ leadId: "asc" }, { createdAt: "asc" }],
      }),
      prisma.message.count({
        where: {
          lead: { userId: ctx.userId },
          createdAt: { gte: windowStart },
        },
      }),
    ]);

    if (leads.length === 0) {
      return {
        summary: "Sem leads cadastrados — nada a analisar.",
        metrics: { totalLeads: 0 },
        actions: [],
        reports: [],
      };
    }

    // ── 2. Score distribution ────────────────────────────────────────────────
    const scoreBuckets = {
      frio: leads.filter((l) => l.score < 40).length,
      morno: leads.filter((l) => l.score >= 40 && l.score < 70).length,
      quente: leads.filter((l) => l.score >= 70 && l.score < 90).length,
      vip: leads.filter((l) => l.score >= 90).length,
    };

    // ── 3. Funil: quantos estão em cada estágio + taxa de drop-off ───────────
    const funnel = stages.map((s, i) => {
      const atStage = leads.filter((l) => l.stageId === s.id).length;
      const passedThroughStage = stageHistory.filter((h) => h.stageId === s.id).length;
      const prev = i > 0 ? leads.filter((l) => l.stageId === stages[i - 1].id).length : 0;
      return {
        stageName: s.name,
        order: s.order,
        currentLeads: atStage,
        passedThrough: passedThroughStage,
        dropFromPrev:
          i === 0
            ? null
            : prev > 0
              ? Math.round(((prev - atStage) / prev) * 100)
              : 0,
      };
    });

    // ── 4. Tempo médio por estágio (gargalos) ────────────────────────────────
    // Schema não tem exitedAt — inferimos via próxima entrada do mesmo lead.
    // stageHistory já vem ordenado por leadId + createdAt ASC.
    const durationsByStage = new Map<string, number[]>();
    for (let i = 0; i < stageHistory.length; i++) {
      const current = stageHistory[i];
      const next = stageHistory[i + 1];
      // Só pareia quando é do mesmo lead (ou seja, o lead saiu do stage atual)
      if (!next || next.leadId !== current.leadId) continue;
      const ms = next.createdAt.getTime() - current.createdAt.getTime();
      if (ms <= 0) continue;
      if (!durationsByStage.has(current.stageId)) durationsByStage.set(current.stageId, []);
      durationsByStage.get(current.stageId)!.push(ms);
    }

    const avgTimeByStage = stages
      .map((s) => {
        const durations = durationsByStage.get(s.id) ?? [];
        if (durations.length === 0) return { stageName: s.name, avgDays: 0, samples: 0 };
        const totalMs = durations.reduce((sum, d) => sum + d, 0);
        return {
          stageName: s.name,
          avgDays: Math.round((totalMs / durations.length) / 86400_000 * 10) / 10,
          samples: durations.length,
        };
      })
      .filter((s) => s.samples > 0)
      .sort((a, b) => b.avgDays - a.avgDays);

    // ── 5. Origens: volume e qualidade ───────────────────────────────────────
    const sourceStats = new Map<string, { count: number; avgScore: number }>();
    for (const lead of leads) {
      const key = lead.source ?? "desconhecido";
      const existing = sourceStats.get(key);
      if (existing) {
        existing.count += 1;
        existing.avgScore = (existing.avgScore * (existing.count - 1) + lead.score) / existing.count;
      } else {
        sourceStats.set(key, { count: 1, avgScore: lead.score });
      }
    }
    const bySource = Array.from(sourceStats.entries())
      .map(([source, stats]) => ({
        source,
        count: stats.count,
        avgScore: Math.round(stats.avgScore),
      }))
      .sort((a, b) => b.count - a.count);

    // ── 6. LLM insight generation ────────────────────────────────────────────
    const prompt = `Você é um analista sênior de dados de CRM. Baseado nos dados abaixo, gere 3 a 5 insights acionáveis e NÃO ÓBVIOS.

DISTRIBUIÇÃO DE SCORE:
- Frios: ${scoreBuckets.frio} | Mornos: ${scoreBuckets.morno} | Quentes: ${scoreBuckets.quente} | VIP: ${scoreBuckets.vip}

FUNIL:
${funnel
  .map(
    (s) =>
      `- ${s.stageName}: ${s.currentLeads} leads atualmente, ${s.passedThrough} passaram nos últimos ${config.analysisWindowDays} dias${s.dropFromPrev !== null ? ` (${s.dropFromPrev}% drop do estágio anterior)` : ""}`
  )
  .join("\n")}

TEMPO MÉDIO POR ESTÁGIO (gargalos):
${avgTimeByStage
  .slice(0, 5)
  .map((s) => `- ${s.stageName}: ${s.avgDays} dias (${s.samples} amostras)`)
  .join("\n")}

POR ORIGEM:
${bySource.slice(0, 5).map((s) => `- ${s.source}: ${s.count} leads, score médio ${s.avgScore}`).join("\n")}

Foque em padrões que o operador não veria sozinho. Evite dizer "aumente investimento" sem dado.

RESPONDA APENAS COM JSON:
{"insights": [{"title": "...", "finding": "...", "suggestion": "..."}]}`;

    let insights: Array<{ title: string; finding: string; suggestion: string }> = [];
    try {
      const response = await ctx.reason(prompt, { temperature: 0.4, maxTokens: 900 });
      const parsed = parseJsonFromLLM<{ insights: typeof insights }>(response);
      if (parsed?.insights) insights = parsed.insights;
    } catch {
      // LLM failure is non-fatal
    }

    // ── 7. Actions: analyst só cria alertas para gargalos extremos ───────────
    const actions: AgentActionProposal[] = [];
    const topBottleneck = avgTimeByStage[0];
    if (topBottleneck && topBottleneck.avgDays > 14) {
      actions.push({
        type: "create_notification",
        targetType: "stage",
        targetId: topBottleneck.stageName,
        targetName: topBottleneck.stageName,
        reasoning: `Gargalo detectado: tempo médio no estágio "${topBottleneck.stageName}" é ${topBottleneck.avgDays} dias (>14 dias)`,
        payload: {
          title: `Gargalo no estágio ${topBottleneck.stageName}`,
          message: `Leads estão levando ${topBottleneck.avgDays} dias em média neste estágio. Revise critérios de avanço e processo comercial.`,
          severity: "warning",
        },
      });
    }

    // ── 8. Report ────────────────────────────────────────────────────────────
    const summary =
      `${leads.length} leads totais. ${messages} mensagens nos últimos ${config.analysisWindowDays} dias. ` +
      `${scoreBuckets.quente + scoreBuckets.vip} quentes/VIP. ` +
      `${insights.length} insight(s) gerado(s).`;

    return {
      summary,
      metrics: {
        totalLeads: leads.length,
        totalMessages: messages,
        hotLeads: scoreBuckets.quente + scoreBuckets.vip,
        insightsGenerated: insights.length,
      },
      actions,
      reports: [
        {
          type: "weekly",
          title: "Análise de Operação — Agente Analista",
          summary,
          severity: insights.length > 0 || actions.length > 0 ? "info" : "info",
          details: {
            scoreDistribution: scoreBuckets,
            funnel,
            avgTimeByStage,
            bySource,
            insights,
            window: {
              days: config.analysisWindowDays,
              from: windowStart.toISOString(),
            },
          },
        },
      ],
    };
  },
};

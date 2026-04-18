// Strategist Agent — Tráfego Pago & Aquisição
//
// Scope: acompanha performance de origem de leads (Meta, Google, Orgânico, etc.)
// e gera recomendações estratégicas para o gestor de tráfego.
//
// Output: insights + alertas. NÃO altera campanhas automaticamente.
//   - Identifica fontes com CPL alto (proxy: leads fechados vs perdidos por origem)
//   - Identifica fontes com lead quality baixo (score médio)
//   - Propõe realocação de budget entre fontes
//   - Detecta quedas abruptas de volume (WoW)
//   - Envia notificação crítica quando uma origem colapsa
//
// Roda semanalmente (segunda 8h) — análise estratégica precisa de janela maior.

import { prisma } from "@/lib/prisma";
import type {
  AgentRunner,
  AgentRunContext,
  AgentRunResult,
  AgentActionProposal,
} from "./types";
import { parseJsonFromLLM } from "./reasoning";

type StrategistConfig = {
  // Janela de análise (dias)
  analysisWindowDays: number;
  // Janela anterior usada para WoW (dias)
  previousWindowDays: number;
  // Queda percentual mínima para gerar alerta crítico
  dropPercentAlert: number;
};

const DEFAULT_CONFIG: StrategistConfig = {
  analysisWindowDays: 7,
  previousWindowDays: 7,
  dropPercentAlert: 40,
};

type SourceMetrics = {
  source: string;
  leads: number;
  avgScore: number;
  closedLeads: number;   // leads no último stage (proxy de conversão)
  lostLeads: number;     // leads com score baixo ou tag "perdido"
  convRate: number;      // closed / leads
};

export const strategistAgent: AgentRunner = {
  type: "strategist",
  defaultName: "Agente Estrategista",
  defaultSchedule: "0 8 * * 1", // Toda segunda 8h
  defaultConfig: DEFAULT_CONFIG as unknown as Record<string, unknown>,

  async run(ctx: AgentRunContext): Promise<AgentRunResult> {
    const config = { ...DEFAULT_CONFIG, ...(ctx.config as Partial<StrategistConfig>) };

    const now = new Date();
    const windowStart = new Date(now.getTime() - config.analysisWindowDays * 86400_000);
    const prevWindowStart = new Date(
      windowStart.getTime() - config.previousWindowDays * 86400_000
    );

    // ── 1. Gather context ────────────────────────────────────────────────────
    const [stages, leads, prevLeads] = await Promise.all([
      prisma.stage.findMany({
        where: { userId: ctx.userId },
        orderBy: { order: "asc" },
      }),
      prisma.lead.findMany({
        where: { userId: ctx.userId, createdAt: { gte: windowStart } },
        select: {
          id: true,
          source: true,
          score: true,
          stageId: true,
          tags: true,
          campaign: true,
          createdAt: true,
        },
      }),
      prisma.lead.findMany({
        where: {
          userId: ctx.userId,
          createdAt: { gte: prevWindowStart, lt: windowStart },
        },
        select: { source: true, score: true },
      }),
    ]);

    if (leads.length === 0 && prevLeads.length === 0) {
      return {
        summary: "Sem dados suficientes nesta janela para análise estratégica.",
        metrics: { totalLeads: 0 },
        actions: [],
        reports: [],
      };
    }

    // O último stage normalmente representa "fechado/ganho"
    const closedStageId = stages.at(-1)?.id;

    // ── 2. Aggregate por source ──────────────────────────────────────────────
    type CurrentLead = (typeof leads)[number];
    type PrevLead = (typeof prevLeads)[number];

    const currentBySource = new Map<string, CurrentLead[]>();
    for (const lead of leads) {
      const key = lead.source ?? "desconhecido";
      if (!currentBySource.has(key)) currentBySource.set(key, []);
      currentBySource.get(key)!.push(lead);
    }

    const prevBySource = new Map<string, PrevLead[]>();
    for (const lead of prevLeads) {
      const key = lead.source ?? "desconhecido";
      if (!prevBySource.has(key)) prevBySource.set(key, []);
      prevBySource.get(key)!.push(lead);
    }

    const metricsBySource: SourceMetrics[] = Array.from(currentBySource.entries()).map(
      ([source, bucket]) => {
        const closedLeads = bucket.filter((l) => l.stageId === closedStageId).length;
        const lostLeads = bucket.filter(
          (l) => l.tags.includes("perdido") || l.score < 20
        ).length;
        const avgScore =
          bucket.reduce((sum, l) => sum + l.score, 0) / Math.max(1, bucket.length);
        return {
          source,
          leads: bucket.length,
          avgScore: Math.round(avgScore),
          closedLeads,
          lostLeads,
          convRate: bucket.length > 0 ? closedLeads / bucket.length : 0,
        };
      }
    );

    metricsBySource.sort((a, b) => b.leads - a.leads);

    // ── 3. Detectar drops críticos (WoW) ─────────────────────────────────────
    const actions: AgentActionProposal[] = [];
    const alerts: Array<{ source: string; drop: number; prev: number; current: number }> = [];

    for (const [source, current] of Array.from(currentBySource.entries())) {
      const prev = prevBySource.get(source)?.length ?? 0;
      if (prev < 5) continue; // ruído: ignora fontes com volume baixo
      const drop = ((prev - current.length) / prev) * 100;
      if (drop >= config.dropPercentAlert) {
        alerts.push({ source, drop: Math.round(drop), prev, current: current.length });

        actions.push({
          type: "create_notification",
          targetType: "campaign",
          targetId: source,
          targetName: source,
          reasoning: `Queda de ${Math.round(drop)}% no volume de leads da fonte "${source}" versus semana anterior (${prev} → ${current.length})`,
          payload: {
            title: `Queda crítica em ${source}`,
            message: `Você perdeu ${Math.round(drop)}% do volume de leads da fonte ${source} esta semana. Verifique criativos, orçamento e tracking.`,
            severity: "critical",
          },
        });
      }
    }

    // ── 4. Recomendações estratégicas via LLM ────────────────────────────────
    const prompt = `Você é um head de tráfego pago analisando a performance semanal de aquisição de leads.

DADOS DA SEMANA:
${metricsBySource
  .slice(0, 10)
  .map(
    (m) =>
      `- ${m.source}: ${m.leads} leads, score médio ${m.avgScore}, ${m.closedLeads} fechados (${(m.convRate * 100).toFixed(1)}% conv), ${m.lostLeads} perdidos`
  )
  .join("\n")}

JANELA: últimos ${config.analysisWindowDays} dias.

Gere 2 a 4 recomendações ESTRATÉGICAS, objetivas e acionáveis para o gestor de tráfego (ex: realocar budget, matar canal, dobrar em canal X, investigar quality score). Seja direto.

RESPONDA APENAS COM JSON:
{"recommendations": [{"title": "...", "reason": "...", "priority": "high|medium|low"}]}`;

    let recommendations: Array<{ title: string; reason: string; priority: string }> = [];
    try {
      const response = await ctx.reason(prompt, { temperature: 0.5, maxTokens: 800 });
      const parsed = parseJsonFromLLM<{ recommendations: typeof recommendations }>(response);
      if (parsed?.recommendations) recommendations = parsed.recommendations;
    } catch {
      // Falha no LLM não bloqueia o relatório
    }

    // ── 5. Report ────────────────────────────────────────────────────────────
    const totalCurrent = leads.length;
    const totalPrev = prevLeads.length;
    const wowPct = totalPrev > 0 ? ((totalCurrent - totalPrev) / totalPrev) * 100 : 0;

    const severity = alerts.length > 0 ? "critical" : Math.abs(wowPct) > 20 ? "warning" : "info";

    const summary =
      `Semana: ${totalCurrent} leads (${wowPct >= 0 ? "+" : ""}${wowPct.toFixed(0)}% vs semana anterior). ` +
      (alerts.length > 0
        ? `${alerts.length} fonte(s) em queda crítica. `
        : "Sem alertas críticos. ") +
      `${recommendations.length} recomendação(ões) estratégica(s).`;

    return {
      summary,
      metrics: {
        totalLeads: totalCurrent,
        prevTotalLeads: totalPrev,
        wowPct: Math.round(wowPct),
        sources: metricsBySource.length,
        alerts: alerts.length,
      },
      actions,
      reports: [
        {
          type: "weekly",
          title: "Relatório Estratégico — Aquisição & Tráfego",
          summary,
          severity,
          details: {
            bySource: metricsBySource,
            alerts,
            recommendations,
            window: {
              from: windowStart.toISOString(),
              to: now.toISOString(),
              days: config.analysisWindowDays,
            },
          },
        },
      ],
    };
  },
};

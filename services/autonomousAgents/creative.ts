// Creative Agent — Conteúdo & Social
//
// Scope: analisa o histórico de postagens em redes sociais e sugere a próxima
// pauta/linha editorial. NÃO publica automaticamente — sempre cria insight.
//
// O que faz:
//   1. Analisa posts recentes: engajamento, formato, temas mais performáticos
//   2. Gera sugestões de pauta para os próximos dias via LLM
//   3. Identifica lacunas no calendário editorial
//   4. Envia notificação para o gestor com as sugestões
//
// Roda semanalmente (quinta 9h) — janela de planejamento para a próxima semana.

import { prisma } from "@/lib/prisma";
import type {
  AgentRunner,
  AgentRunContext,
  AgentRunResult,
  AgentActionProposal,
} from "./types";
import { parseJsonFromLLM } from "./reasoning";

type CreativeConfig = {
  analysisWindowDays: number;
  targetPostsPerWeek: number;
  maxSuggestions: number;
};

const DEFAULT_CONFIG: CreativeConfig = {
  analysisWindowDays: 30,
  targetPostsPerWeek: 5,
  maxSuggestions: 5,
};

type PostSummary = {
  platforms: string[];
  mediaType: string | null;
  hashtags: string[];
  publishedAt: Date | null;
  engagementData: unknown;
};

export const creativeAgent: AgentRunner = {
  type: "creative",
  defaultName: "Agente Criativo",
  defaultSchedule: "0 9 * * 4", // Quinta 9h — planejamento para próxima semana
  defaultConfig: DEFAULT_CONFIG as unknown as Record<string, unknown>,

  async run(ctx: AgentRunContext): Promise<AgentRunResult> {
    const config = { ...DEFAULT_CONFIG, ...(ctx.config as Partial<CreativeConfig>) };

    const windowStart = new Date(Date.now() - config.analysisWindowDays * 86400_000);

    // ── 1. Gather posts ──────────────────────────────────────────────────────
    const [posts, scheduledPosts, leads] = await Promise.all([
      prisma.socialPost.findMany({
        where: {
          userId: ctx.userId,
          publishedAt: { gte: windowStart, not: null },
          status: "published",
        },
        orderBy: { publishedAt: "desc" },
        take: 50,
      }),
      prisma.socialPost.findMany({
        where: {
          userId: ctx.userId,
          status: { in: ["scheduled", "draft"] },
          scheduledAt: { gte: new Date() },
        },
        orderBy: { scheduledAt: "asc" },
        select: { id: true, title: true, scheduledAt: true, platforms: true, mediaType: true },
      }),
      // Contexto do público: quais origens/tags dominam
      prisma.lead.findMany({
        where: { userId: ctx.userId, createdAt: { gte: windowStart } },
        select: { source: true, tags: true },
      }),
    ]);

    // ── 2. Analisa performance ───────────────────────────────────────────────
    const summaries: PostSummary[] = posts.map((p) => ({
      platforms: p.platforms,
      mediaType: p.mediaType,
      hashtags: p.hashtags,
      publishedAt: p.publishedAt,
      engagementData: p.engagementData,
    }));

    const formatCount = summaries.reduce<Record<string, number>>((acc, s) => {
      const key = s.mediaType ?? "desconhecido";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const topHashtags = summaries
      .flatMap((s) => s.hashtags)
      .reduce<Record<string, number>>((acc, h) => {
        acc[h] = (acc[h] || 0) + 1;
        return acc;
      }, {});
    const topHashtagList = Object.entries(topHashtags)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([h, c]) => ({ tag: h, count: c }));

    // Calendário próximos 7 dias
    const next7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      d.setHours(0, 0, 0, 0);
      return d;
    });

    const postsPerDay = next7Days.map((day) => {
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      return {
        date: day.toISOString().split("T")[0],
        scheduled: scheduledPosts.filter(
          (p) => p.scheduledAt && p.scheduledAt >= day && p.scheduledAt < next
        ).length,
      };
    });

    const scheduledNextWeek = postsPerDay.reduce((sum, d) => sum + d.scheduled, 0);
    const gapDays = postsPerDay.filter((d) => d.scheduled === 0).length;

    // ── 3. Contexto do público ───────────────────────────────────────────────
    const topSources = leads.reduce<Record<string, number>>((acc, l) => {
      const key = l.source ?? "desconhecido";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const topAudienceTags = leads
      .flatMap((l) => l.tags)
      .reduce<Record<string, number>>((acc, t) => {
        acc[t] = (acc[t] || 0) + 1;
        return acc;
      }, {});

    // ── 4. LLM — gera sugestões de pauta ─────────────────────────────────────
    const prompt = `Você é um diretor de conteúdo. Baseado no histórico abaixo, sugira ${config.maxSuggestions} ideias de conteúdo para os próximos 7 dias.

HISTÓRICO (${posts.length} posts nos últimos ${config.analysisWindowDays} dias):
- Formatos usados: ${Object.entries(formatCount).map(([k, v]) => `${k} (${v})`).join(", ") || "nenhum"}
- Top hashtags: ${topHashtagList.map((h) => `${h.tag}`).join(", ") || "nenhuma"}

CALENDÁRIO PRÓXIMOS 7 DIAS:
- Posts agendados: ${scheduledNextWeek}
- Dias sem nada agendado: ${gapDays}
- Meta: ${config.targetPostsPerWeek} posts/semana

PÚBLICO (leads recentes):
- Origens: ${Object.entries(topSources).slice(0, 5).map(([k, v]) => `${k}(${v})`).join(", ") || "n/d"}
- Tags dominantes: ${Object.entries(topAudienceTags).slice(0, 8).map(([k, v]) => `${k}(${v})`).join(", ") || "n/d"}

REGRAS:
- Cada ideia precisa ter: título, formato (reel/carrossel/imagem/story), gancho de copy, cta
- Varie formatos (não tudo reel)
- Conecte com dor ou desejo do público
- Seja específico — nada de "dicas gerais"

RESPONDA APENAS COM JSON:
{"suggestions": [{"title": "...", "format": "...", "hook": "...", "cta": "...", "reason": "..."}]}`;

    let suggestions: Array<{
      title: string;
      format: string;
      hook: string;
      cta: string;
      reason: string;
    }> = [];
    try {
      const response = await ctx.reason(prompt, { temperature: 0.8, maxTokens: 1200 });
      const parsed = parseJsonFromLLM<{ suggestions: typeof suggestions }>(response);
      if (parsed?.suggestions) suggestions = parsed.suggestions;
    } catch {
      // LLM falha não bloqueia relatório
    }

    // ── 5. Actions ───────────────────────────────────────────────────────────
    const actions: AgentActionProposal[] = [];

    // Cria alerta se tiver lacuna no calendário
    if (gapDays >= 3 && scheduledNextWeek < config.targetPostsPerWeek) {
      actions.push({
        type: "create_notification",
        targetType: "post",
        targetId: "calendar",
        targetName: "Calendário editorial",
        reasoning: `${gapDays} dias sem postagem agendada nos próximos 7 dias (meta: ${config.targetPostsPerWeek}/semana)`,
        payload: {
          title: "Calendário editorial com gaps",
          message: `Você tem ${gapDays} dia(s) sem postagem e só ${scheduledNextWeek} agendadas. Abra o estúdio para planejar.`,
          severity: "warning",
        },
      });
    }

    // ── 6. Report ────────────────────────────────────────────────────────────
    const summary =
      posts.length > 0
        ? `${posts.length} posts publicados nos últimos ${config.analysisWindowDays} dias. ${scheduledNextWeek} agendados para próxima semana. ${suggestions.length} pauta(s) sugerida(s).`
        : `Nenhuma postagem no período — operação de conteúdo parada. ${suggestions.length} sugestão(ões) para destravar.`;

    return {
      summary,
      metrics: {
        postsPublished: posts.length,
        scheduledNextWeek,
        gapDays,
        suggestionsGenerated: suggestions.length,
      },
      actions,
      reports: [
        {
          type: "weekly",
          title: "Pauta da Semana — Agente Criativo",
          summary,
          severity: gapDays >= 3 ? "warning" : "info",
          details: {
            formatBreakdown: formatCount,
            topHashtags: topHashtagList,
            upcomingCalendar: postsPerDay,
            suggestions,
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

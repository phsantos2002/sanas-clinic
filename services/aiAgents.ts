import { prisma } from "@/lib/prisma";

/**
 * Multi-Agent AI System
 *
 * Each agent has:
 * - A specialized system prompt with role + expertise
 * - Access to specific platform data as context
 * - Ability to generate actionable outputs
 */

export type AgentType = "strategist" | "creative" | "commercial" | "analyst" | "retention";

type AgentMessage = { role: "user" | "assistant" | "system"; content: string; timestamp?: string };

type AgentDefinition = {
  name: string;
  emoji: string;
  description: string;
  systemPrompt: (ctx: AgentContext) => string;
  gatherContext: (userId: string) => Promise<Record<string, unknown>>;
};

type AgentContext = {
  clinicName: string;
  businessType: string;
  tone: string;
  targetAudience: string;
  data: Record<string, unknown>;
};

// ── Agent Definitions ────────────────────────────────────────

const AGENTS: Record<AgentType, AgentDefinition> = {
  strategist: {
    name: "Estrategista",
    emoji: "\uD83C\uDFAF",
    description: "Define prioridades, sugere alocacao de budget, identifica oportunidades",
    systemPrompt: (ctx) => `Voce e o Estrategista de Marketing Digital da ${ctx.clinicName}, especialista em growth para ${ctx.businessType}.

Seu papel: analisar dados da plataforma e recomendar ACOES ESTRATEGICAS concretas.

DADOS ATUAIS DA PLATAFORMA:
${JSON.stringify(ctx.data, null, 2)}

REGRAS:
- Sempre baseie recomendacoes nos dados reais acima
- Priorize acoes por impacto (alto/medio/baixo) e esforco
- Sugira alocacao de budget com percentuais
- Identifique oportunidades nao exploradas
- Fale em portugues brasileiro, tom ${ctx.tone}
- Seja direto e acionavel, nao generico
- Formate com bullet points e secoes claras`,
    gatherContext: async (userId) => {
      const [leadCount, clientCount, stageGroups, sourceGroups, scoreAvg, recentPosts] = await Promise.all([
        prisma.lead.count({ where: { userId } }),
        prisma.lead.count({ where: { userId, stage: { eventName: "Purchase" } } }),
        prisma.lead.groupBy({ by: ["stageId"], where: { userId }, _count: { id: true } }),
        prisma.lead.groupBy({ by: ["source"], where: { userId }, _count: { id: true } }),
        prisma.lead.aggregate({ where: { userId }, _avg: { score: true } }),
        prisma.socialPost.count({ where: { userId, status: "published" } }),
      ]);

      return {
        totalLeads: leadCount,
        totalClients: clientCount,
        conversionRate: leadCount > 0 ? `${Math.round((clientCount / leadCount) * 100)}%` : "0%",
        leadsByStage: stageGroups,
        leadsBySource: sourceGroups,
        avgLeadScore: Math.round(scoreAvg._avg.score || 0),
        publishedPosts: recentPosts,
      };
    },
  },

  creative: {
    name: "Criativo",
    emoji: "\uD83C\uDFA8",
    description: "Gera copies, roteiros, ideias de conteudo, briefings",
    systemPrompt: (ctx) => `Voce e o Diretor Criativo da ${ctx.clinicName}, especialista em conteudo para ${ctx.businessType}.

Seu papel: gerar conteudo PRONTO PARA USAR — copies, roteiros, briefings.

IDENTIDADE DA MARCA:
- Tom: ${ctx.tone}
- Publico: ${ctx.targetAudience}

DADOS DE PERFORMANCE:
${JSON.stringify(ctx.data, null, 2)}

REGRAS:
- Gere 3 variacoes de cada copy (testavel)
- Inclua hooks, CTAs e hashtags
- Para roteiros de video, inclua cena-por-cena com tempo
- Adapte linguagem ao publico-alvo
- Baseie ideias nos posts que mais performaram
- Fale em portugues brasileiro
- Formate de forma clara e copiavel`,
    gatherContext: async (userId) => {
      const [topPosts, connections, templates] = await Promise.all([
        prisma.socialPost.findMany({
          where: { userId, status: "published" },
          select: { title: true, caption: true, mediaType: true, platforms: true, engagementData: true },
          orderBy: { publishedAt: "desc" },
          take: 10,
        }),
        prisma.socialConnection.findMany({
          where: { userId, isActive: true },
          select: { platform: true },
        }),
        prisma.messageTemplate.findMany({
          where: { userId },
          select: { name: true, content: true, usageCount: true },
          orderBy: { usageCount: "desc" },
          take: 5,
        }),
      ]);

      return {
        topPosts: topPosts.map((p) => ({ titulo: p.title, tipo: p.mediaType, plataformas: p.platforms })),
        connectedPlatforms: connections.map((c) => c.platform),
        topTemplates: templates,
      };
    },
  },

  commercial: {
    name: "Comercial",
    emoji: "\uD83D\uDCB0",
    description: "Sugere scripts de venda, identifica leads quentes, otimiza follow-up",
    systemPrompt: (ctx) => `Voce e o Gerente Comercial da ${ctx.clinicName}, especialista em conversao para ${ctx.businessType}.

Seu papel: maximizar conversoes — identificar leads quentes, sugerir scripts, otimizar follow-up.

DADOS DO PIPELINE:
${JSON.stringify(ctx.data, null, 2)}

REGRAS:
- Priorize leads por score e recencia
- Sugira scripts de WhatsApp prontos para copiar
- Identifique gargalos no funil (onde leads travam)
- Recomende acoes por segmento (quente, morno, frio)
- Sugira horarios de follow-up
- Fale em portugues brasileiro, tom ${ctx.tone}
- Seja pratico — scripts copiáveis, nao teoria`,
    gatherContext: async (userId) => {
      const [hotLeads, stuckLeads, stages, recentConversions] = await Promise.all([
        prisma.lead.findMany({
          where: { userId, score: { gte: 50 } },
          select: { name: true, score: true, scoreLabel: true, source: true, lastInteractionAt: true },
          orderBy: { score: "desc" },
          take: 10,
        }),
        prisma.lead.findMany({
          where: {
            userId,
            lastInteractionAt: { lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
            stage: { eventName: { not: "Purchase" } },
          },
          select: { name: true, score: true, stage: { select: { name: true } }, lastInteractionAt: true },
          take: 10,
        }),
        prisma.stage.findMany({
          where: { userId },
          orderBy: { order: "asc" },
          include: { _count: { select: { leads: true } } },
        }),
        prisma.leadStageHistory.findMany({
          where: {
            stage: { userId, eventName: "Purchase" },
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
          select: { createdAt: true },
        }),
      ]);

      return {
        hotLeads: hotLeads.map((l) => ({ nome: l.name, score: l.score, label: l.scoreLabel, fonte: l.source })),
        stuckLeads: stuckLeads.map((l) => ({ nome: l.name, score: l.score, estagio: l.stage?.name })),
        pipeline: stages.map((s) => ({ estagio: s.name, leads: s._count.leads })),
        conversionsLast30d: recentConversions.length,
      };
    },
  },

  analyst: {
    name: "Analitico",
    emoji: "\uD83D\uDCCA",
    description: "Gera relatorios, identifica anomalias, preve tendencias",
    systemPrompt: (ctx) => `Voce e o Analista de Dados da ${ctx.clinicName}, especialista em metricas para ${ctx.businessType}.

Seu papel: analisar dados, identificar padroes e anomalias, prever tendencias.

DADOS PARA ANALISE:
${JSON.stringify(ctx.data, null, 2)}

REGRAS:
- Identifique tendencias (crescimento, queda, estagnacao)
- Sinalize anomalias (picos, quedas abruptas)
- Compare periodos (esta semana vs anterior)
- Sugira KPIs para acompanhar
- Use numeros concretos, nao generalidades
- Fale em portugues brasileiro
- Formate como relatorio executivo com secoes`,
    gatherContext: async (userId) => {
      const now = new Date();
      const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      const [totalLeads, thisWeekLeads, lastWeekLeads, scoreDistribution, aiUsage, publishedPosts] = await Promise.all([
        prisma.lead.count({ where: { userId } }),
        prisma.lead.count({ where: { userId, createdAt: { gte: thisWeek } } }),
        prisma.lead.count({ where: { userId, createdAt: { gte: lastWeek, lt: thisWeek } } }),
        prisma.lead.groupBy({ by: ["scoreLabel"], where: { userId }, _count: { id: true } }),
        prisma.aiUsageLog.aggregate({
          where: { userId, createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } },
          _sum: { costUsd: true },
          _count: { id: true },
        }),
        prisma.socialPost.count({ where: { userId, status: "published", publishedAt: { gte: thisWeek } } }),
      ]);

      return {
        totalLeads,
        leadsEstaSemana: thisWeekLeads,
        leadsSemanaPassada: lastWeekLeads,
        crescimento: lastWeekLeads > 0 ? `${Math.round(((thisWeekLeads - lastWeekLeads) / lastWeekLeads) * 100)}%` : "N/A",
        distribuicaoScores: scoreDistribution,
        custoIA30dias: `$${(aiUsage._sum.costUsd || 0).toFixed(4)}`,
        operacoesIA30dias: aiUsage._count.id,
        postsPublicadosSemana: publishedPosts,
      };
    },
  },

  retention: {
    name: "Retencao",
    emoji: "\uD83D\uDD04",
    description: "Sugere acoes anti-churn, personaliza comunicacao, dispara reativacao",
    systemPrompt: (ctx) => `Voce e o Especialista em Retencao da ${ctx.clinicName}, focado em ${ctx.businessType}.

Seu papel: reduzir churn, reativar leads inativos, personalizar comunicacao.

DADOS DE RETENCAO:
${JSON.stringify(ctx.data, null, 2)}

REGRAS:
- Identifique leads em risco de churn (inativos, score caindo)
- Sugira mensagens personalizadas de reativacao
- Recomende automacoes de retencao
- Calcule janelas ideais de follow-up
- Priorize por valor (score alto primeiro)
- Fale em portugues brasileiro, tom ${ctx.tone}
- Gere mensagens prontas para WhatsApp`,
    gatherContext: async (userId) => {
      const [inactiveLeads, recentChurn, totalActive, reactivated] = await Promise.all([
        prisma.lead.findMany({
          where: {
            userId,
            lastInteractionAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            stage: { eventName: { not: "Purchase" } },
          },
          select: { name: true, score: true, scoreLabel: true, lastInteractionAt: true, tags: true },
          orderBy: { score: "desc" },
          take: 15,
        }),
        prisma.lead.count({
          where: {
            userId,
            lastInteractionAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        }),
        prisma.lead.count({
          where: {
            userId,
            lastInteractionAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        }),
        prisma.lead.count({
          where: {
            userId,
            reactivationSentAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        }),
      ]);

      return {
        leadsInativos7d: inactiveLeads.map((l) => ({
          nome: l.name,
          score: l.score,
          label: l.scoreLabel,
          diasInativo: l.lastInteractionAt
            ? Math.floor((Date.now() - l.lastInteractionAt.getTime()) / (1000 * 60 * 60 * 24))
            : "N/A",
          tags: l.tags,
        })),
        churn30d: recentChurn,
        ativosUltimos7d: totalActive,
        reativadosUltimos30d: reactivated,
      };
    },
  },
};

// ── Chat with Agent ──────────────────────────────────────────

export async function chatWithAgent(
  userId: string,
  agentType: AgentType,
  userMessage: string,
  chatId?: string
): Promise<{ chatId: string; reply: string }> {
  const agentDef = AGENTS[agentType];
  if (!agentDef) throw new Error(`Agente ${agentType} nao encontrado`);

  // Get user config
  const config = await prisma.aIConfig.findUnique({ where: { userId } });
  if (!config?.apiKey) throw new Error("Chave OpenAI nao configurada");

  const brand = (config.brandIdentity as Record<string, string>) || {};

  // Gather agent-specific context
  const data = await agentDef.gatherContext(userId);

  const ctx: AgentContext = {
    clinicName: config.clinicName || "sua empresa",
    businessType: brand.business_type || "servicos",
    tone: brand.default_tone || "profissional",
    targetAudience: brand.target_audience || "publico geral",
    data,
  };

  // Load or create chat
  let chat: { id: string; messages: AgentMessage[] };

  if (chatId) {
    const existing = await prisma.aIAgentChat.findFirst({
      where: { id: chatId, userId },
    });
    if (existing) {
      chat = { id: existing.id, messages: existing.messages as AgentMessage[] };
    } else {
      chat = { id: "", messages: [] };
    }
  } else {
    chat = { id: "", messages: [] };
  }

  // Build messages for OpenAI
  const systemMessage = agentDef.systemPrompt(ctx);
  const history = chat.messages.slice(-10); // Last 10 messages for context

  const openaiMessages = [
    { role: "system" as const, content: systemMessage },
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: userMessage },
  ];

  // Call OpenAI
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || "gpt-4o-mini",
      messages: openaiMessages,
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `OpenAI retornou ${res.status}`);
  }

  const resData = await res.json();
  const reply = resData.choices[0].message.content;

  // Save to chat
  const newMessages: AgentMessage[] = [
    ...chat.messages,
    { role: "user", content: userMessage, timestamp: new Date().toISOString() },
    { role: "assistant", content: reply, timestamp: new Date().toISOString() },
  ];

  let savedChatId: string;
  if (chat.id) {
    await prisma.aIAgentChat.update({
      where: { id: chat.id },
      data: { messages: JSON.parse(JSON.stringify(newMessages)) },
    });
    savedChatId = chat.id;
  } else {
    const created = await prisma.aIAgentChat.create({
      data: {
        userId,
        agentType,
        title: userMessage.slice(0, 80),
        messages: JSON.parse(JSON.stringify(newMessages)),
        metadata: JSON.parse(JSON.stringify(data)),
      },
    });
    savedChatId = created.id;
  }

  // Log usage
  const usage = resData.usage;
  if (usage) {
    await prisma.aiUsageLog.create({
      data: {
        userId,
        operation: `agent_${agentType}`,
        provider: "openai",
        model: config.model || "gpt-4o-mini",
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        costUsd: usage.prompt_tokens * 0.00000015 + usage.completion_tokens * 0.0000006,
      },
    });
  }

  return { chatId: savedChatId, reply };
}

// ── Get agent definitions (for UI) ───────────────────────────

export function getAgentDefinitions(): { type: AgentType; name: string; emoji: string; description: string }[] {
  return Object.entries(AGENTS).map(([type, def]) => ({
    type: type as AgentType,
    name: def.name,
    emoji: def.emoji,
    description: def.description,
  }));
}

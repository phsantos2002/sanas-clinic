import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimit";

// ── Tools available to the assistant ─────────────────────────

const tools: Anthropic.Tool[] = [
  {
    name: "get_pipeline_summary",
    description:
      "Retorna resumo do pipeline: total de leads por stage, leads quentes, leads sem resposta",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_leads",
    description: "Busca leads com filtros opcionais",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          description:
            "Filtro: 'hot' (score>50), 'cold' (score<25), 'stuck' (sem interacao 3+ dias), 'all'",
        },
        limit: { type: "number", description: "Quantidade maxima (default 10)" },
      },
      required: [],
    },
  },
  {
    name: "get_ad_performance",
    description: "Retorna metricas das campanhas Meta Ads: gasto, CPL, CTR, ROAS, campanhas ativas",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_recent_posts",
    description: "Retorna posts recentes com metricas de engajamento",
    input_schema: {
      type: "object" as const,
      properties: { limit: { type: "number", description: "Quantidade (default 5)" } },
      required: [],
    },
  },
  {
    name: "get_funnel_metrics",
    description: "Retorna metricas do funil completo: conversao entre stages, tempo medio, dropoff",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "generate_post_idea",
    description: "Gera ideia de post com roteiro, caption e hashtags",
    input_schema: {
      type: "object" as const,
      properties: {
        topic: { type: "string", description: "Tema do post" },
        format: { type: "string", description: "Formato: reels, post, carousel, story" },
        tone: { type: "string", description: "Tom: educativo, vendas, bastidores, humor" },
      },
      required: ["topic"],
    },
  },
  {
    name: "get_weekly_summary",
    description: "Resumo completo da semana: leads, vendas, gasto, ROAS, posts, engagement",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "search_competitor_ads",
    description: "Busca anuncios de concorrentes no Meta Ad Library",
    input_schema: {
      type: "object" as const,
      properties: {
        search_terms: { type: "string", description: "Termos de busca (ex: botox, harmonizacao)" },
      },
      required: ["search_terms"],
    },
  },
  {
    name: "prepare_broadcast",
    description: "Prepara mensagem de broadcast para leads filtrados (NAO envia — mostra preview)",
    input_schema: {
      type: "object" as const,
      properties: {
        message: { type: "string", description: "Mensagem (use {{nome}} como placeholder)" },
        filter: { type: "string", description: "Filtro: 'hot', 'cold', 'inactive', 'all'" },
      },
      required: ["message"],
    },
  },
  {
    name: "get_top_posts",
    description: "Retorna os posts com melhor performance (mais likes, views ou comentarios)",
    input_schema: {
      type: "object" as const,
      properties: { limit: { type: "number", description: "Quantidade (default 5)" } },
      required: [],
    },
  },
  {
    name: "get_scheduled_posts",
    description: "Retorna posts agendados para os proximos dias",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
];

// ── Tool execution ───────────────────────────────────────────

async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  switch (toolName) {
    case "get_pipeline_summary": {
      const stages = await prisma.stage.findMany({
        where: { userId },
        orderBy: { order: "asc" },
        include: { _count: { select: { leads: true } } },
      });
      const totalLeads = await prisma.lead.count({ where: { userId } });
      const hotLeads = await prisma.lead.count({ where: { userId, score: { gte: 50 } } });
      const stuck = await prisma.lead.count({
        where: {
          userId,
          lastInteractionAt: { lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
          stage: { eventName: { not: "Purchase" } },
        },
      });
      const unanswered = await prisma.lead.count({
        where: {
          userId,
          lastInteractionAt: { lt: new Date(Date.now() - 6 * 60 * 60 * 1000) },
          stage: { eventName: { not: "Purchase" } },
        },
      });

      return JSON.stringify({
        totalLeads,
        hotLeads,
        stuckLeads: stuck,
        unansweredLeads: unanswered,
        byStage: stages.map((s) => ({ name: s.name, event: s.eventName, count: s._count.leads })),
      });
    }

    case "get_leads": {
      const status = (input.status as string) || "all";
      const limit = (input.limit as number) || 10;
      const where: Record<string, unknown> = { userId };

      if (status === "stuck") {
        where.lastInteractionAt = { lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) };
        where.stage = { eventName: { not: "Purchase" } };
      }

      const leads = await prisma.lead.findMany({
        where,
        select: {
          name: true,
          phone: true,
          source: true,
          tags: true,
          lastInteractionAt: true,
          stage: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      return JSON.stringify(
        leads.map((l) => ({
          nome: l.name,
          telefone: l.phone,
          fonte: l.source,
          estagio: l.stage?.name,
          tags: l.tags,
          diasSemInteracao: l.lastInteractionAt
            ? Math.floor((Date.now() - l.lastInteractionAt.getTime()) / 86400000)
            : null,
        }))
      );
    }

    case "get_ad_performance": {
      const pixel = await prisma.pixel.findUnique({ where: { userId } });
      if (!pixel?.adAccountId || !pixel?.metaAdsToken)
        return JSON.stringify({ error: "Meta Ads nao configurado" });

      try {
        const res = await fetch(
          `https://graph.facebook.com/v18.0/act_${pixel.adAccountId}/insights?fields=spend,impressions,clicks,ctr,cpm,cpc,actions,cost_per_action_type&date_preset=last_7d&access_token=${pixel.metaAdsToken}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        const insights = data.data?.[0] || {};
        const leads =
          (insights.actions || []).find((a: { action_type: string }) => a.action_type === "lead")
            ?.value || 0;
        const spend = parseFloat(insights.spend || "0");

        return JSON.stringify({
          gastoTotal: `R$ ${spend.toFixed(2)}`,
          impressoes: insights.impressions || 0,
          cliques: insights.clicks || 0,
          ctr: `${insights.ctr || 0}%`,
          cpm: `R$ ${insights.cpm || 0}`,
          cpc: `R$ ${insights.cpc || 0}`,
          leads: leads,
          cpl: leads > 0 ? `R$ ${(spend / leads).toFixed(2)}` : "N/A",
          periodo: "ultimos 7 dias",
        });
      } catch {
        return JSON.stringify({ error: "Erro ao buscar dados do Meta Ads" });
      }
    }

    case "get_recent_posts": {
      const limit = (input.limit as number) || 5;
      const posts = await prisma.socialPost.findMany({
        where: { userId, status: "published" },
        select: {
          title: true,
          caption: true,
          mediaType: true,
          platforms: true,
          engagementData: true,
          publishedAt: true,
        },
        orderBy: { publishedAt: "desc" },
        take: limit,
      });

      return JSON.stringify(
        posts.map((p) => ({
          titulo: p.title,
          tipo: p.mediaType,
          plataformas: p.platforms,
          publicadoEm: p.publishedAt?.toISOString(),
          engagement: p.engagementData || {},
        }))
      );
    }

    case "get_funnel_metrics": {
      const stages = await prisma.stage.findMany({ where: { userId }, orderBy: { order: "asc" } });
      const totalLeads = await prisma.lead.count({ where: { userId } });
      const result = [];
      for (const stage of stages) {
        const count = await prisma.lead.count({ where: { userId, stageId: stage.id } });
        result.push({
          estagio: stage.name,
          evento: stage.eventName,
          leads: count,
          percentual: totalLeads > 0 ? `${Math.round((count / totalLeads) * 100)}%` : "0%",
        });
      }
      return JSON.stringify({ totalLeads, funil: result });
    }

    case "generate_post_idea": {
      const config = await prisma.aIConfig.findUnique({ where: { userId } });
      const brand = (config?.brandIdentity as Record<string, string>) || {};
      return JSON.stringify({
        topico: input.topic,
        formato: input.format || "reels",
        tom: input.tone || "educativo",
        nicho: brand.business_type || "clinica estetica",
        nota: "Use esses dados para sugerir roteiro, caption e hashtags. Retorne o conteudo completo pronto para publicar.",
      });
    }

    case "get_weekly_summary": {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const [newLeads, newClients, publishedPosts] = await Promise.all([
        prisma.lead.count({ where: { userId, createdAt: { gte: weekAgo } } }),
        prisma.lead.count({
          where: { userId, stage: { eventName: "Purchase" }, createdAt: { gte: weekAgo } },
        }),
        prisma.socialPost.count({
          where: { userId, status: "published", publishedAt: { gte: weekAgo } },
        }),
      ]);

      return JSON.stringify({
        leadsNovos: newLeads,
        vendas: newClients,
        postsPublicados: publishedPosts,
        periodo: "ultimos 7 dias",
      });
    }

    case "search_competitor_ads": {
      const pixel = await prisma.pixel.findUnique({
        where: { userId },
        select: { metaAdsToken: true },
      });
      if (!pixel?.metaAdsToken) return JSON.stringify({ error: "Token Meta Ads nao configurado" });

      try {
        const res = await fetch(
          `https://graph.facebook.com/v18.0/ads_archive?search_terms=${encodeURIComponent(input.search_terms as string)}&ad_reached_countries=BR&ad_type=ALL&fields=page_name,ad_creative_bodies&limit=10&access_token=${pixel.metaAdsToken}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        return JSON.stringify(
          (data.data || []).slice(0, 10).map((ad: Record<string, unknown>) => ({
            pagina: ad.page_name,
            texto: ((ad.ad_creative_bodies as string[]) || [])[0]?.slice(0, 200),
          }))
        );
      } catch {
        return JSON.stringify({ error: "Erro ao buscar Ad Library" });
      }
    }

    case "prepare_broadcast": {
      const filter = (input.filter as string) || "all";
      const where: Record<string, unknown> = { userId };
      if (filter === "inactive")
        where.lastInteractionAt = { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };

      const count = await prisma.lead.count({ where });
      return JSON.stringify({
        mensagem: input.message,
        filtro: filter,
        leadsAlvo: count,
        nota: "Preview do broadcast. O usuario precisa confirmar antes de enviar.",
      });
    }

    case "get_top_posts": {
      const limit = (input.limit as number) || 5;
      const posts = await prisma.socialPost.findMany({
        where: { userId, status: "published" },
        select: {
          title: true,
          caption: true,
          mediaType: true,
          platforms: true,
          engagementData: true,
          publishedAt: true,
        },
        orderBy: { publishedAt: "desc" },
        take: 20,
      });
      // Sort by engagement from JSON
      const sorted = posts
        .map((p) => {
          const eng = (p.engagementData || {}) as Record<string, number>;
          return { ...p, totalEng: (eng.likes || 0) + (eng.comments || 0) + (eng.shares || 0) };
        })
        .sort((a, b) => b.totalEng - a.totalEng)
        .slice(0, limit);
      return JSON.stringify(
        sorted.map((p) => ({
          titulo: p.title,
          tipo: p.mediaType,
          engagement: p.totalEng,
          publicadoEm: p.publishedAt?.toISOString(),
        }))
      );
    }

    case "get_scheduled_posts": {
      const posts = await prisma.socialPost.findMany({
        where: { userId, status: "scheduled", scheduledAt: { gte: new Date() } },
        select: { title: true, mediaType: true, platforms: true, scheduledAt: true },
        orderBy: { scheduledAt: "asc" },
        take: 10,
      });
      return JSON.stringify(
        posts.map((p) => ({
          titulo: p.title,
          tipo: p.mediaType,
          plataformas: p.platforms,
          agendadoPara: p.scheduledAt?.toISOString(),
        }))
      );
    }

    default:
      return JSON.stringify({ error: `Tool ${toolName} nao encontrada` });
  }
}

// ── Main API Route ───────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const rl = rateLimit(`assistant:${user.id}`, RATE_LIMITS.ai);
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisicoes" }, { status: 429 });

  const { message, history } = await req.json();
  if (!message?.trim())
    return NextResponse.json({ error: "Mensagem obrigatoria" }, { status: 400 });

  // Get user context
  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
    include: { aiConfig: true },
  });
  if (!dbUser) return NextResponse.json({ error: "Usuario nao encontrado" }, { status: 404 });

  const config = dbUser.aiConfig;

  // Resolve Anthropic API key from user's AIConfig (fallback to server env for legacy setups)
  const apiKey = config?.anthropicKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "Assistente IA indisponível — configure sua chave Anthropic em Config → IA Chat.",
      },
      { status: 503 }
    );
  }
  const anthropic = new Anthropic({ apiKey });

  const brand = (config?.brandIdentity as Record<string, string>) || {};

  const systemPrompt = `Voce e o assistente de marketing da "${config?.clinicName || "empresa"}".
Nicho: ${brand.business_type || "servicos"}. Tom: profissional mas acessivel.

REGRAS:
1. Responda SEMPRE em portugues brasileiro
2. Use os tools para buscar dados REAIS — nunca invente numeros
3. Quando sugerir acao, MOSTRE preview e pergunte se quer executar
4. Seja direto e pratico — o executivo nao tem tempo
5. Formate com bullet points e secoes quando apropriado
6. Sempre que possivel, termine com uma sugestao de proxima acao`;

  try {
    const messages: Anthropic.MessageParam[] = [
      ...(history || []).slice(-10).map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    let response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: systemPrompt,
      tools,
      messages,
    });

    // Process tool calls iteratively
    while (response.stop_reason === "tool_use") {
      const toolBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of toolBlocks) {
        const result = await executeTool(
          block.name,
          block.input as Record<string, unknown>,
          dbUser.id
        );
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
      }

      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResults });

      response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: systemPrompt,
        tools,
        messages,
      });
    }

    const textContent = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    const reply = textContent?.text || "Desculpe, nao consegui processar sua solicitacao.";

    // Log usage
    await prisma.aiUsageLog
      .create({
        data: {
          userId: dbUser.id,
          operation: "assistant",
          provider: "anthropic",
          model: "claude-sonnet-4-20250514",
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          costUsd: response.usage.input_tokens * 0.000003 + response.usage.output_tokens * 0.000015,
        },
      })
      .catch(() => {});

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("[assistant] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro no assistente" },
      { status: 500 }
    );
  }
}

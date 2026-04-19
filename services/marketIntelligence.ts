import { prisma } from "@/lib/prisma";

/**
 * Market Intelligence Module
 *
 * Sources:
 * - Meta Ad Library API (competitor ads)
 * - Google Trends (trending topics)
 * - Internal data (what works for the client)
 *
 * Outputs:
 * - Campaign briefings
 * - Copy variations
 * - Gap analysis
 * - Positioning suggestions
 */

// ── Meta Ad Library — competitor ad analysis ─────────────────

export type CompetitorAd = {
  id: string;
  pageName: string;
  adText: string;
  startDate: string;
  platform: string;
  mediaType: string;
  impressionsRange: string;
};

export async function searchCompetitorAds(params: {
  searchTerms: string;
  country?: string;
  limit?: number;
  accessToken: string;
}): Promise<CompetitorAd[]> {
  const { searchTerms, country = "BR", limit = 20, accessToken } = params;

  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/ads_archive?search_terms=${encodeURIComponent(searchTerms)}&ad_reached_countries=${country}&ad_type=ALL&fields=id,page_name,ad_creative_bodies,ad_delivery_start_time,publisher_platforms,estimated_audience_size&limit=${limit}&access_token=${accessToken}`,
      { cache: "no-store" }
    );

    if (!res.ok) return [];
    const data = await res.json();

    return (data.data || []).map((ad: Record<string, unknown>) => ({
      id: ad.id as string,
      pageName: ad.page_name as string,
      adText: ((ad.ad_creative_bodies as string[]) || [])[0] || "",
      startDate: ad.ad_delivery_start_time as string,
      platform: ((ad.publisher_platforms as string[]) || []).join(", "),
      mediaType: "unknown",
      impressionsRange: ad.estimated_audience_size
        ? JSON.stringify(ad.estimated_audience_size)
        : "N/A",
    }));
  } catch {
    return [];
  }
}

// ── Google Trends — trending topics ──────────────────────────

export type TrendingTopic = {
  keyword: string;
  interest: number; // 0-100
  trend: "rising" | "stable" | "declining";
};

export async function getTrendingTopics(keywords: string[]): Promise<TrendingTopic[]> {
  // Note: Google Trends doesn't have official API
  // This uses a simplified approach — in production, use SerpAPI or similar
  return keywords.map((kw) => ({
    keyword: kw,
    interest: Math.floor(Math.random() * 60) + 40, // Placeholder
    trend: ["rising", "stable", "declining"][
      Math.floor(Math.random() * 3)
    ] as TrendingTopic["trend"],
  }));
}

// ── AI-Powered Market Analysis ───────────────────────────────

export async function generateMarketAnalysis(
  userId: string,
  params: {
    competitors?: string[];
    niche?: string;
    focus?: "ads" | "content" | "positioning" | "full";
  }
): Promise<{
  analysis: string;
  suggestions: string[];
  copyVariations: { angle: string; copies: string[] }[];
  gaps: string[];
  positioning: string;
}> {
  const config = await prisma.aIConfig.findUnique({ where: { userId } });
  if (!config?.apiKey) throw new Error("Chave OpenAI nao configurada");

  const brand = (config.brandIdentity as Record<string, string>) || {};

  // Gather internal performance data
  const [topPosts, leadSources, totalLeads, totalClients] = await Promise.all([
    prisma.socialPost.findMany({
      where: { userId, status: "published" },
      select: { title: true, caption: true, mediaType: true, engagementData: true },
      orderBy: { publishedAt: "desc" },
      take: 10,
    }),
    prisma.lead.groupBy({ by: ["source"], where: { userId }, _count: { id: true } }),
    prisma.lead.count({ where: { userId } }),
    prisma.lead.count({ where: { userId, stage: { eventName: "Purchase" } } }),
  ]);

  // Get competitor ads if Meta token available
  let competitorAds: CompetitorAd[] = [];
  const pixel = await prisma.pixel.findUnique({
    where: { userId },
    select: { metaAdsToken: true },
  });
  if (pixel?.metaAdsToken && params.niche) {
    competitorAds = await searchCompetitorAds({
      searchTerms: params.niche,
      accessToken: pixel.metaAdsToken,
      limit: 15,
    });
  }

  const systemPrompt = `Voce e um consultor de inteligencia de mercado para ${config.clinicName || "um negocio"}.
Nicho: ${brand.business_type || params.niche || "servicos"}
Publico: ${brand.target_audience || "publico geral"}
Tom: ${brand.default_tone || "profissional"}

DADOS INTERNOS:
- Total leads: ${totalLeads}, Clientes: ${totalClients}
- Fontes: ${JSON.stringify(leadSources)}
- Top posts: ${JSON.stringify(topPosts.slice(0, 5).map((p) => ({ titulo: p.title, tipo: p.mediaType })))}

${
  competitorAds.length > 0
    ? `ANUNCIOS DE CONCORRENTES (Meta Ad Library):
${JSON.stringify(competitorAds.slice(0, 10).map((a) => ({ pagina: a.pageName, texto: a.adText.slice(0, 200) })))}`
    : ""
}

${params.competitors?.length ? `Concorrentes mencionados: ${params.competitors.join(", ")}` : ""}

RETORNE em JSON valido:
{
  "analysis": "analise geral do mercado e posicao do cliente (2-3 paragrafos)",
  "suggestions": ["sugestao 1 acionavel", "sugestao 2", "sugestao 3", "sugestao 4", "sugestao 5"],
  "copyVariations": [
    {
      "angle": "nome do angulo (ex: urgencia, autoridade, prova social)",
      "copies": ["variacao 1", "variacao 2", "variacao 3"]
    }
  ],
  "gaps": ["gap 1 que ninguem explora", "gap 2", "gap 3"],
  "positioning": "posicionamento sugerido em 2-3 frases"
}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Faca uma analise de mercado ${
            params.focus === "ads"
              ? "focada em anuncios"
              : params.focus === "content"
                ? "focada em conteudo organico"
                : params.focus === "positioning"
                  ? "focada em posicionamento"
                  : "completa"
          } para meu negocio.`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI retornou ${res.status}`);

  const data = await res.json();
  const result = JSON.parse(data.choices[0].message.content);

  // Log usage
  const usage = data.usage;
  if (usage) {
    await prisma.aiUsageLog.create({
      data: {
        userId,
        operation: "market_analysis",
        provider: "openai",
        model: config.model || "gpt-4o-mini",
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        costUsd: usage.prompt_tokens * 0.00000015 + usage.completion_tokens * 0.0000006,
      },
    });
  }

  return result;
}

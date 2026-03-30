import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const rl = rateLimit(`ai:${authUser.id}`, RATE_LIMITS.ai);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisicoes. Tente novamente." }, { status: 429 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: authUser.email! },
    include: { aiConfig: true },
  });
  if (!dbUser?.aiConfig?.apiKey) {
    return NextResponse.json(
      { error: "Chave OpenAI nao configurada. Va em Configuracoes > IA." },
      { status: 400 }
    );
  }

  const { topic, slideCount, tone, platforms } = await req.json();
  if (!topic?.trim()) {
    return NextResponse.json({ error: "Topico obrigatorio" }, { status: 400 });
  }

  const config = dbUser.aiConfig;
  const brand = (config.brandIdentity as Record<string, string>) || {};
  const numSlides = Math.min(Math.max(slideCount || 5, 3), 10);

  const systemPrompt = `Voce e um designer de carrosseis para redes sociais, especialista em conteudo visual para micro empreendedores brasileiros.

Empresa: ${config.clinicName}
Tipo: ${brand.business_type || "negocio local"}
Tom de voz: ${tone || brand.default_tone || "profissional"}
Publico-alvo: ${brand.target_audience || "publico geral"}
Cores da marca: primaria ${brand.primary_color || "#7C3AED"}, secundaria ${brand.secondary_color || "#EC4899"}
Fonte: ${brand.font || "Inter"}

Gere um carrossel de ${numSlides} slides sobre "${topic}".

RETORNE OBRIGATORIAMENTE em JSON valido:
{
  "slides": [
    {
      "slide_number": 1,
      "slide_type": "cover",
      "title": "titulo impactante (max 8 palavras)",
      "body": "subtitulo ou frase de abertura (max 15 palavras)",
      "visual_prompt": "descricao em INGLES para gerar imagem de fundo do slide (fotografia profissional, cores da marca, sem texto)",
      "bg_color": "cor hex sugerida para fundo"
    },
    {
      "slide_number": 2,
      "slide_type": "content",
      "title": "titulo do ponto (max 6 palavras)",
      "body": "explicacao curta (max 30 palavras)",
      "visual_prompt": "descricao em INGLES para icone/ilustracao do slide",
      "bg_color": "cor hex"
    }
  ],
  "caption": "legenda completa para o post do carrossel",
  "hashtags": ["tag1", "tag2"],
  "hook": "primeira frase de impacto para a legenda",
  "cta": "chamada para acao (ex: salve este post, compartilhe)"
}

Regras:
- Slide 1 DEVE ser cover (titulo principal)
- Ultimo slide DEVE ser CTA (chamada para acao)
- Slides intermediarios sao content (1 ponto por slide)
- Cada slide deve ser auto-contido (entendivel sem os outros)
- Visual prompts devem ser descritos em INGLES para geracao de imagem
- bg_color deve alternar entre cores da marca e tons neutros`;

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Crie um carrossel sobre: ${topic}` },
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
      }),
    });

    if (!openaiRes.ok) {
      const errData = await openaiRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: errData?.error?.message || `OpenAI retornou ${openaiRes.status}` },
        { status: 502 }
      );
    }

    const data = await openaiRes.json();
    const content = JSON.parse(data.choices[0].message.content);

    // Log usage
    const usage = data.usage;
    await prisma.aiUsageLog.create({
      data: {
        userId: dbUser.id,
        operation: "carousel",
        provider: "openai",
        model: config.model || "gpt-4o-mini",
        inputTokens: usage?.prompt_tokens ?? null,
        outputTokens: usage?.completion_tokens ?? null,
        costUsd: usage
          ? usage.prompt_tokens * 0.00000015 + usage.completion_tokens * 0.0000006
          : null,
      },
    });

    return NextResponse.json(content);
  } catch (error) {
    console.error("Carousel generation error:", error);
    return NextResponse.json(
      { error: "Erro ao gerar carrossel. Verifique sua chave de API." },
      { status: 500 }
    );
  }
}

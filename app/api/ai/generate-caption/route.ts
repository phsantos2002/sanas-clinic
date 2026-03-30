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
    return NextResponse.json({ error: "Muitas requisicoes. Tente novamente em breve." }, { status: 429 });
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

  const { prompt, contentType, platforms, tone } = await req.json();
  if (!prompt?.trim()) {
    return NextResponse.json({ error: "Prompt obrigatorio" }, { status: 400 });
  }

  const config = dbUser.aiConfig;
  const brand = (config.brandIdentity as Record<string, string>) || {};

  const businessContext = `
Empresa: ${config.clinicName}
Tipo: ${brand.business_type || "negocio local"}
Tom de voz: ${tone || brand.default_tone || "profissional"}
Publico-alvo: ${brand.target_audience || "publico geral"}
  `.trim();

  const platformRules: string[] = [];
  if (platforms?.includes("instagram")) {
    platformRules.push(
      "- Instagram: max 2200 chars, 20-30 hashtags relevantes no FINAL, primeira frase e gancho de parada de scroll, emojis com moderacao, CTA (link na bio, salve, compartilhe)"
    );
  }
  if (platforms?.includes("facebook")) {
    platformRules.push(
      "- Facebook: max 500 chars, 3-5 hashtags, tom conversacional, perguntas geram engajamento, CTA direto"
    );
  }
  if (platforms?.includes("tiktok")) {
    platformRules.push(
      "- TikTok: max 150 chars, 3-5 hashtags trending, linguagem jovem e direta, emojis obrigatorios"
    );
  }
  if (platforms?.includes("linkedin")) {
    platformRules.push(
      "- LinkedIn: max 1300 chars, profissional, 3-5 hashtags do setor, storytelling pessoal"
    );
  }
  if (platforms?.includes("google_business")) {
    platformRules.push(
      "- Google Meu Negocio: max 1500 chars, SEO-friendly, palavras-chave locais, foco em novidades/ofertas"
    );
  }

  const contentTypeRules: Record<string, string> = {
    image:
      "Post unico com imagem. Legenda deve complementar o visual.",
    reels:
      "Video curto / Reels. Caption curta e impactante. Incluir gancho textual para os primeiros 3 segundos.",
    carousel:
      "Carrossel educativo. Gerar titulo para cada slide (5-7 slides). Legenda deve incentivar deslize.",
    story:
      "Story efemero. Texto ultra curto. CTA imediato (vote, responda, arraste).",
  };

  const systemPrompt = `Voce e um social media manager expert para micro e pequenos negocios brasileiros.

${businessContext}

Tipo de conteudo: ${contentTypeRules[contentType] || contentTypeRules.image}

Regras por plataforma:
${platformRules.join("\n")}

RETORNE OBRIGATORIAMENTE em JSON valido:
{
  "caption": "legenda principal completa",
  "hashtags": ["tag1", "tag2"],
  "hook": "primeira frase de impacto",
  "cta": "chamada para acao sugerida",
  "visual_prompt": "descricao detalhada em INGLES para gerar imagem com IA (descreva cores, composicao, estilo fotografico, elementos visuais, iluminacao). NAO incluir texto na imagem.",
  "best_time": "horario sugerido para publicar (ex: 10:00)",
  "platform_versions": {
    ${(platforms || ["instagram"]).map((p: string) => `"${p}": "versao adaptada da legenda para ${p}"`).join(",\n    ")}
  }
}`;

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
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
      }),
    });

    if (!openaiRes.ok) {
      const errData = await openaiRes.json().catch(() => ({}));
      const msg =
        errData?.error?.message || `OpenAI retornou status ${openaiRes.status}`;
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const data = await openaiRes.json();
    const content = JSON.parse(data.choices[0].message.content);

    // Log usage
    const usage = data.usage;
    await prisma.aiUsageLog.create({
      data: {
        userId: dbUser.id,
        operation: "caption",
        provider: "openai",
        model: config.model || "gpt-4o-mini",
        inputTokens: usage?.prompt_tokens ?? null,
        outputTokens: usage?.completion_tokens ?? null,
        costUsd: usage
          ? (usage.prompt_tokens * 0.00000015 + usage.completion_tokens * 0.0000006)
          : null,
      },
    });

    return NextResponse.json(content);
  } catch (error) {
    console.error("Caption generation error:", error);
    return NextResponse.json(
      { error: "Erro ao gerar caption. Verifique sua chave de API." },
      { status: 500 }
    );
  }
}

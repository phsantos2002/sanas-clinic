import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";

/**
 * Storyboard AI Service — orchestrates all AI calls for the video pipeline.
 *
 * Provider chain: tries preferred provider first, falls back to alternatives.
 * All generated files stored in Vercel Blob.
 * All costs logged to AiUsageLog.
 */

type AIConfig = {
  apiKey: string | null;
  model: string;
  provider: string;
  aiImageProvider: string | null;
  aiImageApiKey: string | null;
  aiVideoProvider: string | null;
  aiVideoApiKey: string | null;
  clinicName: string;
  brandIdentity: Record<string, string> | null;
};

// ── Niche-specific extras for image prompts ──────────────────

const NICHE_EXTRAS: Record<string, string> = {
  clinica_estetica: "luxury medical spa, elegant interior, warm tones, soft lighting, professional",
  clinica_odontologica: "modern dental clinic, bright clean, professional, friendly atmosphere",
  salao_beleza: "chic beauty salon, trendy interior, soft lighting, modern decor",
  imobiliaria: "beautiful property, architectural photography, golden hour",
  restaurante: "food photography, appetizing, warm ambiance, rustic elegant",
  academia: "modern gym, energetic, dynamic lighting, fitness motivation",
  default: "professional business, modern interior, clean composition, high quality",
};

// ══════════════════════════════════════════════════════════════
// SCRIPT GENERATION
// ══════════════════════════════════════════════════════════════

type ScriptOutput = {
  title: string;
  hook: string;
  characters: { name: string; description: string; role: string }[];
  scenes: {
    sceneTitle: string;
    narration: string;
    visualDescription: string;
    duration: number;
    cameraDirection: string;
    transition: string;
    textOverlay: string | null;
    characters: string[];
  }[];
  caption: string;
  hashtags: string;
  cta: string;
};

export async function generateScript(params: {
  topic: string;
  videoType: string;
  duration: number;
  tone: string;
  targetAudience: string;
  niche: string;
  chatHistory: { role: string; content: string }[];
  userId: string;
  config: AIConfig;
}): Promise<ScriptOutput> {
  const { config, niche, chatHistory, userId } = params;

  const maxScenes = Math.max(3, Math.floor(params.duration / 4));
  const minScenes = Math.max(2, Math.floor(params.duration / 6));

  const systemPrompt = `Baseado na conversa acima, gere um roteiro estruturado para ${params.videoType} de ${params.duration}s.
Tom: ${params.tone || "profissional"}. Publico: ${params.targetAudience || "geral"}. Nicho: ${niche}.

RETORNE APENAS JSON VALIDO:
{
  "title": "Titulo do video",
  "hook": "Frase exata dos primeiros 3 segundos",
  "characters": [{"name":"Nome","description":"Descricao visual detalhada para geracao de imagem IA","role":"protagonista|paciente|narrador"}],
  "scenes": [{"sceneTitle":"Nome","narration":"Texto falado","visualDescription":"Descricao visual DETALHADA em INGLES para gerar imagem","duration":3,"cameraDirection":"close-up|wide|POV|detail","transition":"cut|fade|zoom-in|swipe","textOverlay":"Texto na tela ou null","characters":["Nome"]}],
  "caption": "Caption para Instagram com emojis e CTA",
  "hashtags": "#tag1 #tag2",
  "cta": "Call to action final"
}

REGRAS:
- ${minScenes} a ${maxScenes} cenas
- Hook nos primeiros 3 segundos (80% decidem ali)
- visualDescription em INGLES, detalhada para IA gerar imagem
- Portugues brasileiro para narration, caption, cta`;

  const messages = [
    ...chatHistory.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: "Gere o roteiro estruturado agora." },
    { role: "system" as const, content: systemPrompt },
  ];

  const res = await callOpenAI(config.apiKey!, config.model, messages, true);

  await logCost(userId, null, "openai", "script", config.model, res.usage);

  return JSON.parse(res.content);
}

// ── Chat with AI for script development ──────────────────────

export async function chatForScript(params: {
  message: string;
  history: { role: string; content: string }[];
  videoType: string;
  duration: number;
  tone: string;
  niche: string;
  config: AIConfig;
  userId: string;
}): Promise<string> {
  const { config, niche } = params;

  const nicheRules: Record<string, string> = {
    clinica_estetica: `REGRAS DO NICHO:
- NUNCA prometer resultados especificos (CFM proibe)
- NUNCA mostrar procedimentos com sangue/agulhas
- Foco: educacao, desmistificacao, autoridade, bastidores
- Tom: seguro, acolhedor, expertise`,
    default: "Adapte o conteudo ao nicho do usuario.",
  };

  const systemPrompt = `Voce e um roteirista e estrategista de conteudo digital especializado em ${niche}.
Ajude o usuario a desenvolver um roteiro para ${params.videoType} de ${params.duration}s. Tom: ${params.tone || "profissional"}.

${nicheRules[niche] || nicheRules.default}

Responda em portugues brasileiro. Seja direto e pratico.`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...params.history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: params.message },
  ];

  const res = await callOpenAI(config.apiKey!, config.model, messages, false);
  await logCost(params.userId, null, "openai", "script_chat", config.model, res.usage);

  return res.content;
}

// ══════════════════════════════════════════════════════════════
// CHARACTER IMAGE GENERATION
// ══════════════════════════════════════════════════════════════

export async function generateCharacterImage(params: {
  description: string;
  niche: string;
  userId: string;
  storyId: string;
  config: AIConfig;
}): Promise<string> {
  const nicheExtra = NICHE_EXTRAS[params.niche] || NICHE_EXTRAS.default;
  const prompt = `Portrait of ${params.description}. Professional photography, ${nicheExtra}, photorealistic, high quality, studio lighting, neutral background.`;

  return generateImage({
    prompt,
    aspectRatio: "1:1",
    userId: params.userId,
    storyId: params.storyId,
    operation: "character",
    config: params.config,
  });
}

// ══════════════════════════════════════════════════════════════
// STORYBOARD FRAME GENERATION
// ══════════════════════════════════════════════════════════════

export async function generateFrameImage(params: {
  visualDescription: string;
  cameraDirection: string;
  niche: string;
  userId: string;
  storyId: string;
  config: AIConfig;
}): Promise<string> {
  const nicheExtra = NICHE_EXTRAS[params.niche] || NICHE_EXTRAS.default;
  const camera = params.cameraDirection || "medium shot";
  const prompt = `${params.visualDescription}. ${camera} shot, cinematic composition, ${nicheExtra}, photorealistic, high quality, soft natural lighting. No text, no watermarks.`;

  return generateImage({
    prompt,
    aspectRatio: "9:16", // Vertical for reels
    userId: params.userId,
    storyId: params.storyId,
    operation: "frame",
    config: params.config,
  });
}

// ══════════════════════════════════════════════════════════════
// VIDEO CLIP GENERATION (async — returns task ID for polling)
// ══════════════════════════════════════════════════════════════

export async function startVideoClipGeneration(params: {
  startFrameUrl: string;
  endFrameUrl: string;
  duration: 5 | 10;
  model?: string;
  mode?: string;
  userId: string;
  storyId: string;
  config: AIConfig;
}): Promise<{ taskId: string; provider: string }> {
  const provider = params.config.aiVideoProvider || "fal";
  const apiKey = params.config.aiVideoApiKey;

  if (!apiKey) throw new Error("Chave de API de video nao configurada");

  if (provider === "fal") {
    const res = await fetch("https://queue.fal.run/fal-ai/kling-video/v1/standard/image-to-video", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: "Smooth cinematic transition between scenes, professional video, subtle motion",
        image_url: params.startFrameUrl,
        duration: String(params.duration || 5),
        aspect_ratio: "9:16",
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.detail || `Fal.ai retornou ${res.status}`);
    }

    const data = await res.json();
    return { taskId: data.request_id || data.id || "", provider: "fal" };
  }

  if (provider === "replicate") {
    const res = await fetch(
      "https://api.replicate.com/v1/models/minimax/video-01/predictions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          input: {
            prompt: "Smooth cinematic transition, professional quality, subtle motion",
            first_frame_image: params.startFrameUrl,
          },
        }),
      }
    );

    if (!res.ok) throw new Error(`Replicate retornou ${res.status}`);
    const data = await res.json();
    return { taskId: data.id, provider: "replicate" };
  }

  throw new Error(`Provider de video ${provider} nao suportado`);
}

export async function checkVideoClipStatus(params: {
  taskId: string;
  provider: string;
  userId: string;
  storyId: string;
  config: AIConfig;
}): Promise<{ status: string; url?: string }> {
  const { taskId, provider, config, userId, storyId } = params;
  const apiKey = config.aiVideoApiKey;
  if (!apiKey) return { status: "error" };

  if (provider === "fal") {
    const res = await fetch(`https://queue.fal.run/fal-ai/kling-video/v1/standard/image-to-video/status/${taskId}`, {
      headers: { Authorization: `Key ${apiKey}` },
    });
    const data = await res.json();

    if (data.status === "COMPLETED" && data.video?.url) {
      const videoRes = await fetch(data.video.url);
      const blob = await videoRes.blob();
      const stored = await put(`stories/${userId}/${storyId}/clip-${Date.now()}.mp4`, blob, { access: "public" });
      await logCost(userId, storyId, "fal", "video_clip", "kling-v1", null, 0.1);
      return { status: "done", url: stored.url };
    }
    if (data.status === "FAILED") return { status: "error" };
    return { status: "generating" };
  }

  if (provider === "replicate") {
    const res = await fetch(`https://api.replicate.com/v1/predictions/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await res.json();

    if (data.status === "succeeded") {
      const videoUrl = Array.isArray(data.output) ? data.output[0] : data.output;
      const videoRes = await fetch(videoUrl);
      const blob = await videoRes.blob();
      const stored = await put(`stories/${userId}/${storyId}/clip-${Date.now()}.mp4`, blob, { access: "public" });
      await logCost(userId, storyId, "replicate", "video_clip", "minimax-video-01", null, 0.3);
      return { status: "done", url: stored.url };
    }
    if (data.status === "failed") return { status: "error" };
    return { status: "generating" };
  }

  return { status: "error" };
}

// ══════════════════════════════════════════════════════════════
// CAPTION GENERATION
// ══════════════════════════════════════════════════════════════

export async function generateCaptions(params: {
  script: ScriptOutput;
  platforms: string[];
  niche: string;
  userId: string;
  config: AIConfig;
}): Promise<{ platform: string; caption: string; hashtags: string }[]> {
  const prompt = `Gere captions para as plataformas: ${params.platforms.join(", ")}.
Video: "${params.script.title}" — ${params.script.hook}
Nicho: ${params.niche}

RETORNE JSON:
{ "captions": [{ "platform": "instagram", "caption": "...", "hashtags": "#tag1 #tag2" }] }

Regras por plataforma:
- Instagram: max 2200 chars, emojis, CTA, 20-30 hashtags
- TikTok: max 150 chars, trending hashtags, linguagem jovem
- Facebook: max 500 chars, conversacional
- YouTube: SEO-friendly, descritivo`;

  const res = await callOpenAI(params.config.apiKey!, params.config.model, [
    { role: "user", content: prompt },
  ], true);

  await logCost(params.userId, null, "openai", "caption", params.config.model, res.usage);

  const parsed = JSON.parse(res.content);
  return parsed.captions || [];
}

// ══════════════════════════════════════════════════════════════
// SHARED: Image Generation (provider chain)
// ══════════════════════════════════════════════════════════════

async function generateImage(params: {
  prompt: string;
  aspectRatio: string;
  userId: string;
  storyId: string;
  operation: string;
  config: AIConfig;
}): Promise<string> {
  const { config, userId, storyId, operation } = params;
  const provider = config.aiImageProvider || "openai";

  // Try preferred provider, fall back to others
  const providers = [provider, "fal", "replicate", "openai"].filter(
    (p, i, arr) => arr.indexOf(p) === i // unique
  );

  for (const prov of providers) {
    try {
      let imageUrl: string;

      if (prov === "openai" && config.apiKey) {
        imageUrl = await generateImageOpenAI(params.prompt, params.aspectRatio, config.apiKey);
        await logCost(userId, storyId, "openai", operation, "dall-e-3", null, params.aspectRatio === "1:1" ? 0.04 : 0.08);
      } else if (prov === "fal" && config.aiImageApiKey) {
        imageUrl = await generateImageFal(params.prompt, params.aspectRatio, config.aiImageApiKey);
        await logCost(userId, storyId, "fal", operation, "flux-schnell", null, 0.003);
      } else if (prov === "replicate" && config.aiImageApiKey) {
        imageUrl = await generateImageReplicate(params.prompt, params.aspectRatio, config.aiImageApiKey);
        await logCost(userId, storyId, "replicate", operation, "flux-schnell", null, 0.003);
      } else {
        continue;
      }

      // Store in Vercel Blob
      const imgRes = await fetch(imageUrl);
      const blob = await imgRes.blob();
      const ext = prov === "openai" ? "png" : "webp";
      const stored = await put(`stories/${userId}/${storyId}/${operation}-${Date.now()}.${ext}`, blob, { access: "public" });
      return stored.url;
    } catch (error) {
      console.error(`[storyboardAI] ${prov} failed for ${operation}:`, error);
      continue;
    }
  }

  throw new Error("Nenhum provider de imagem disponivel. Configure uma chave de API em Configuracoes.");
}

async function generateImageOpenAI(prompt: string, aspectRatio: string, apiKey: string): Promise<string> {
  const sizeMap: Record<string, string> = { "1:1": "1024x1024", "9:16": "1024x1792", "16:9": "1792x1024" };
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "dall-e-3", prompt, n: 1, size: sizeMap[aspectRatio] || "1024x1024", quality: "standard" }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = await res.json();
  return data.data[0].url;
}

async function generateImageFal(prompt: string, aspectRatio: string, apiKey: string): Promise<string> {
  const sizeMap: Record<string, string> = { "1:1": "square", "9:16": "portrait_16_9", "16:9": "landscape_16_9" };
  const res = await fetch("https://queue.fal.run/fal-ai/flux/schnell", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Key ${apiKey}` },
    body: JSON.stringify({ prompt, image_size: sizeMap[aspectRatio] || "square", num_images: 1 }),
  });
  if (!res.ok) throw new Error(`Fal.ai ${res.status}`);
  const data = await res.json();
  return data.images[0].url;
}

async function generateImageReplicate(prompt: string, aspectRatio: string, apiKey: string): Promise<string> {
  const createRes = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ input: { prompt, num_outputs: 1, aspect_ratio: aspectRatio, output_format: "webp" } }),
  });
  if (!createRes.ok) throw new Error(`Replicate ${createRes.status}`);

  let prediction = await createRes.json();
  for (let i = 0; i < 30 && prediction.status !== "succeeded" && prediction.status !== "failed"; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const poll = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    prediction = await poll.json();
  }

  if (prediction.status !== "succeeded") throw new Error("Replicate timeout");
  return Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
}

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

async function callOpenAI(
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
  json: boolean
): Promise<{ content: string; usage: { prompt_tokens: number; completion_tokens: number } | null }> {
  const body: Record<string, unknown> = {
    model: model || "gpt-4o-mini",
    messages,
    temperature: 0.8,
  };
  if (json) body.response_format = { type: "json_object" };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `OpenAI ${res.status}`);
  }

  const data = await res.json();
  return {
    content: data.choices[0].message.content,
    usage: data.usage || null,
  };
}

async function logCost(
  userId: string,
  storyId: string | null,
  provider: string,
  operation: string,
  model: string,
  usage: { prompt_tokens: number; completion_tokens: number } | null,
  fixedCost?: number
) {
  const cost = fixedCost ?? (usage
    ? usage.prompt_tokens * 0.00000015 + usage.completion_tokens * 0.0000006
    : 0);

  await prisma.aiUsageLog.create({
    data: {
      userId,
      operation: `story_${operation}`,
      provider,
      model,
      inputTokens: usage?.prompt_tokens ?? null,
      outputTokens: usage?.completion_tokens ?? null,
      costUsd: cost,
    },
  }).catch(() => {}); // Non-critical
}

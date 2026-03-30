import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
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
  if (!dbUser?.aiConfig) {
    return NextResponse.json(
      { error: "Configuracao de IA nao encontrada" },
      { status: 400 }
    );
  }

  const { prompt, aspectRatio, style } = await req.json();
  if (!prompt?.trim()) {
    return NextResponse.json({ error: "Prompt obrigatorio" }, { status: 400 });
  }

  const config = dbUser.aiConfig;
  const provider = config.aiImageProvider || "openai";

  // Determine which API key to use
  let apiKey: string | null = null;
  if (provider === "openai") {
    apiKey = config.apiKey;
  } else {
    apiKey = config.aiImageApiKey;
  }

  if (!apiKey) {
    return NextResponse.json(
      {
        error: `Chave de API para ${provider} nao configurada. Va em Configuracoes.`,
      },
      { status: 400 }
    );
  }

  // Map aspect ratio to size
  const sizeMap: Record<string, string> = {
    "1:1": "1024x1024",
    "9:16": "1024x1792",
    "16:9": "1792x1024",
    "4:5": "1024x1024", // closest available
  };
  const size = sizeMap[aspectRatio] || "1024x1024";

  try {
    let imageUrl: string;

    if (provider === "openai") {
      // OpenAI DALL-E 3
      const res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: `${style ? `Style: ${style}. ` : ""}${prompt}. High quality, professional social media content. No text or watermarks.`,
          n: 1,
          size,
          quality: "standard",
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return NextResponse.json(
          { error: errData?.error?.message || `OpenAI retornou ${res.status}` },
          { status: 502 }
        );
      }

      const data = await res.json();
      const tempUrl = data.data[0].url;

      // Download and re-upload to Vercel Blob for permanent storage
      const imgRes = await fetch(tempUrl);
      const imgBlob = await imgRes.blob();
      const stored = await put(
        `social/${dbUser.id}/ai-${Date.now()}.png`,
        imgBlob,
        { access: "public" }
      );
      imageUrl = stored.url;

      // Log usage
      const cost = size === "1024x1024" ? 0.04 : 0.08;
      await prisma.aiUsageLog.create({
        data: {
          userId: dbUser.id,
          operation: "image",
          provider: "openai",
          model: "dall-e-3",
          costUsd: cost,
        },
      });
    } else if (provider === "replicate") {
      // Replicate — Flux Schnell (fast and cheap)
      const createRes = await fetch(
        "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            input: {
              prompt: `${style ? `Style: ${style}. ` : ""}${prompt}. High quality, professional social media content. No text or watermarks.`,
              num_outputs: 1,
              aspect_ratio: aspectRatio || "1:1",
              output_format: "webp",
              output_quality: 90,
            },
          }),
        }
      );

      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        return NextResponse.json(
          { error: errData?.detail || `Replicate retornou ${createRes.status}` },
          { status: 502 }
        );
      }

      let prediction = await createRes.json();

      // Poll for completion
      while (
        prediction.status !== "succeeded" &&
        prediction.status !== "failed"
      ) {
        await new Promise((r) => setTimeout(r, 1500));
        const pollRes = await fetch(
          `https://api.replicate.com/v1/predictions/${prediction.id}`,
          {
            headers: { Authorization: `Bearer ${apiKey}` },
          }
        );
        prediction = await pollRes.json();
      }

      if (prediction.status === "failed") {
        return NextResponse.json(
          { error: prediction.error || "Replicate falhou ao gerar imagem" },
          { status: 502 }
        );
      }

      const tempUrl = Array.isArray(prediction.output)
        ? prediction.output[0]
        : prediction.output;

      // Store in Vercel Blob
      const imgRes = await fetch(tempUrl);
      const imgBlob = await imgRes.blob();
      const stored = await put(
        `social/${dbUser.id}/ai-${Date.now()}.webp`,
        imgBlob,
        { access: "public" }
      );
      imageUrl = stored.url;

      await prisma.aiUsageLog.create({
        data: {
          userId: dbUser.id,
          operation: "image",
          provider: "replicate",
          model: "flux-schnell",
          costUsd: 0.003,
        },
      });
    } else if (provider === "fal") {
      // Fal.ai — Flux Schnell
      const res = await fetch("https://queue.fal.run/fal-ai/flux/schnell", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${apiKey}`,
        },
        body: JSON.stringify({
          prompt: `${style ? `Style: ${style}. ` : ""}${prompt}. High quality, professional social media content. No text or watermarks.`,
          image_size: aspectRatio === "9:16" ? "portrait_16_9" : aspectRatio === "16:9" ? "landscape_16_9" : "square",
          num_images: 1,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return NextResponse.json(
          { error: errData?.detail || `Fal.ai retornou ${res.status}` },
          { status: 502 }
        );
      }

      const data = await res.json();
      const tempUrl = data.images?.[0]?.url;
      if (!tempUrl) {
        return NextResponse.json(
          { error: "Fal.ai nao retornou imagem" },
          { status: 502 }
        );
      }

      // Store in Vercel Blob
      const imgRes = await fetch(tempUrl);
      const imgBlob = await imgRes.blob();
      const stored = await put(
        `social/${dbUser.id}/ai-${Date.now()}.png`,
        imgBlob,
        { access: "public" }
      );
      imageUrl = stored.url;

      await prisma.aiUsageLog.create({
        data: {
          userId: dbUser.id,
          operation: "image",
          provider: "fal",
          model: "flux-schnell",
          costUsd: 0.003,
        },
      });
    } else {
      return NextResponse.json(
        { error: `Provider ${provider} nao suportado` },
        { status: 400 }
      );
    }

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      { error: "Erro ao gerar imagem. Verifique sua chave de API." },
      { status: 500 }
    );
  }
}

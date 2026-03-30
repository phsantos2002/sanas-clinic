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
    return NextResponse.json({ error: "Muitas requisicoes. Tente novamente." }, { status: 429 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: authUser.email! },
    include: { aiConfig: true },
  });
  if (!dbUser?.aiConfig) {
    return NextResponse.json({ error: "Configuracao de IA nao encontrada" }, { status: 400 });
  }

  const config = dbUser.aiConfig;
  const videoProvider = config.aiVideoProvider || "none";

  if (videoProvider === "none") {
    return NextResponse.json(
      { error: "Provedor de video nao configurado. Va em Configuracoes > Chaves de API." },
      { status: 400 }
    );
  }

  // Determine API key
  let apiKey: string | null = null;
  if (videoProvider === config.aiImageProvider) {
    apiKey = config.aiImageApiKey;
  } else {
    apiKey = config.aiVideoApiKey;
  }
  // Fallback to image key if same provider
  if (!apiKey && videoProvider === "replicate") apiKey = config.aiImageApiKey;
  if (!apiKey && videoProvider === "fal") apiKey = config.aiImageApiKey;

  if (!apiKey) {
    return NextResponse.json(
      { error: `Chave de API para ${videoProvider} nao configurada.` },
      { status: 400 }
    );
  }

  const { prompt, duration, aspectRatio, sourceImage } = await req.json();
  if (!prompt?.trim()) {
    return NextResponse.json({ error: "Prompt obrigatorio" }, { status: 400 });
  }

  try {
    let videoUrl: string;

    if (videoProvider === "replicate") {
      // Replicate — minimax/video-01 or similar
      const model = sourceImage
        ? "stability-ai/stable-video-diffusion"
        : "minimax/video-01";

      const input: Record<string, unknown> = sourceImage
        ? { input_image: sourceImage, fps: 7, motion_bucket_id: 127 }
        : { prompt: `${prompt}. Cinematic, professional, high quality.`, prompt_optimizer: true };

      const createRes = await fetch(
        `https://api.replicate.com/v1/models/${model}/predictions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ input }),
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

      // Poll for completion (max 5 min)
      let attempts = 0;
      while (
        prediction.status !== "succeeded" &&
        prediction.status !== "failed" &&
        attempts < 60
      ) {
        await new Promise((r) => setTimeout(r, 5000));
        const pollRes = await fetch(
          `https://api.replicate.com/v1/predictions/${prediction.id}`,
          { headers: { Authorization: `Bearer ${apiKey}` } }
        );
        prediction = await pollRes.json();
        attempts++;
      }

      if (prediction.status === "failed") {
        return NextResponse.json(
          { error: prediction.error || "Replicate falhou ao gerar video" },
          { status: 502 }
        );
      }

      const tempUrl = Array.isArray(prediction.output)
        ? prediction.output[0]
        : prediction.output;

      // Store in Vercel Blob
      const vidRes = await fetch(tempUrl);
      const vidBlob = await vidRes.blob();
      const stored = await put(
        `social/${dbUser.id}/ai-video-${Date.now()}.mp4`,
        vidBlob,
        { access: "public" }
      );
      videoUrl = stored.url;

      await prisma.aiUsageLog.create({
        data: {
          userId: dbUser.id,
          operation: "video",
          provider: "replicate",
          model,
          costUsd: 0.3,
        },
      });
    } else if (videoProvider === "fal") {
      // Fal.ai — kling-video
      const res = await fetch("https://queue.fal.run/fal-ai/kling-video/v1/standard/text-to-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${apiKey}`,
        },
        body: JSON.stringify({
          prompt: `${prompt}. Cinematic, professional, high quality social media content.`,
          duration: String(duration || 5),
          aspect_ratio: aspectRatio || "9:16",
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
      const tempUrl = data.video?.url;
      if (!tempUrl) {
        return NextResponse.json({ error: "Fal.ai nao retornou video" }, { status: 502 });
      }

      const vidRes = await fetch(tempUrl);
      const vidBlob = await vidRes.blob();
      const stored = await put(
        `social/${dbUser.id}/ai-video-${Date.now()}.mp4`,
        vidBlob,
        { access: "public" }
      );
      videoUrl = stored.url;

      await prisma.aiUsageLog.create({
        data: {
          userId: dbUser.id,
          operation: "video",
          provider: "fal",
          model: "kling-video-v1",
          costUsd: 0.1,
        },
      });
    } else {
      return NextResponse.json({ error: `Provider ${videoProvider} nao suportado` }, { status: 400 });
    }

    return NextResponse.json({ videoUrl });
  } catch (error) {
    console.error("Video generation error:", error);
    return NextResponse.json(
      { error: "Erro ao gerar video. Verifique sua chave de API." },
      { status: 500 }
    );
  }
}

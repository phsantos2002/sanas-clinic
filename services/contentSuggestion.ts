import { prisma } from "@/lib/prisma";

// ── Sector benchmarks for best posting times ─────────────────

const SECTOR_BENCHMARKS: Record<string, Record<string, { days: number[]; hours: number[] }>> = {
  clinica_estetica: {
    instagram: { days: [2, 3, 4], hours: [10, 12, 19] },
    facebook: { days: [3, 4, 5], hours: [13, 15, 20] },
    tiktok: { days: [1, 3, 5], hours: [7, 12, 22] },
  },
  clinica_odontologica: {
    instagram: { days: [1, 3, 4], hours: [9, 12, 18] },
    facebook: { days: [2, 4, 5], hours: [12, 15, 19] },
    tiktok: { days: [2, 4, 6], hours: [8, 13, 21] },
  },
  salao_beleza: {
    instagram: { days: [2, 4, 5], hours: [10, 14, 19] },
    facebook: { days: [3, 5, 6], hours: [11, 16, 20] },
    tiktok: { days: [1, 3, 5], hours: [9, 18, 21] },
  },
  restaurante: {
    instagram: { days: [3, 4, 5], hours: [11, 17, 20] },
    facebook: { days: [4, 5, 6], hours: [11, 18, 21] },
    tiktok: { days: [2, 4, 6], hours: [12, 18, 22] },
  },
  default: {
    instagram: { days: [2, 3, 4], hours: [10, 13, 19] },
    facebook: { days: [3, 4, 5], hours: [12, 15, 20] },
    tiktok: { days: [1, 3, 5], hours: [8, 12, 21] },
  },
};

// ── Smart scheduling: suggest best times ─────────────────────

export async function suggestBestTimes(userId: string): Promise<
  { day: number; hour: number; platform: string; type: string }[]
> {
  const config = await prisma.aIConfig.findUnique({ where: { userId } });
  const brand = (config?.brandIdentity as Record<string, string>) || {};
  const sector = brand.business_type || "default";

  const benchmarks = SECTOR_BENCHMARKS[sector] || SECTOR_BENCHMARKS.default;

  // Check user's historical engagement to refine
  const publishedPosts = await prisma.socialPost.findMany({
    where: { userId, status: "published" },
    select: { scheduledAt: true, platforms: true, mediaType: true, engagementData: true },
    take: 50,
    orderBy: { publishedAt: "desc" },
  });

  // Build slots from benchmarks
  const slots: { day: number; hour: number; platform: string; type: string }[] = [];

  const contentTypes = ["image", "carousel", "reels", "image", "carousel"];
  const platformList = Object.keys(benchmarks);

  let slotIdx = 0;
  for (const platform of platformList) {
    const bench = benchmarks[platform];
    for (const day of bench.days) {
      const hour = bench.hours[slotIdx % bench.hours.length];
      slots.push({
        day,
        hour,
        platform,
        type: contentTypes[slotIdx % contentTypes.length],
      });
      slotIdx++;
    }
  }

  // Sort by day, then hour
  slots.sort((a, b) => a.day - b.day || a.hour - b.hour);

  // Return top 7 (one per day of the week)
  const seen = new Set<number>();
  return slots.filter((s) => {
    if (seen.has(s.day)) return false;
    seen.add(s.day);
    return true;
  }).slice(0, 7);
}

// ── Weekly content suggestion ────────────────────────────────

export async function generateWeeklyContentSuggestions(userId: string) {
  const config = await prisma.aIConfig.findUnique({ where: { userId } });
  if (!config?.apiKey) return { generated: 0 };

  const brand = (config.brandIdentity as Record<string, string>) || {};

  // Get top performing posts for context
  const topPosts = await prisma.socialPost.findMany({
    where: { userId, status: "published" },
    select: { title: true, caption: true, mediaType: true, platforms: true, engagementData: true },
    orderBy: { publishedAt: "desc" },
    take: 10,
  });

  // Get upcoming dates (simple week calculation)
  const now = new Date();
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + ((8 - now.getDay()) % 7 || 7));

  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

  const systemPrompt = `Voce e um social media planner para ${config.clinicName || "uma empresa"}.
Negocio: ${brand.business_type || "servicos"}
Tom: ${brand.default_tone || "profissional"}
Publico: ${brand.target_audience || "publico geral"}

Posts recentes que funcionaram: ${JSON.stringify(topPosts.slice(0, 5).map((p) => ({
    titulo: p.title, tipo: p.mediaType, plataformas: p.platforms,
  })))}

Semana de ${nextMonday.toLocaleDateString("pt-BR")}

Gere um plano de conteudo para a semana com 5 posts.

RETORNE OBRIGATORIAMENTE em JSON valido:
{
  "posts": [
    {
      "day_offset": 0,
      "time": "10:00",
      "type": "image",
      "platforms": ["instagram"],
      "title": "titulo interno do post",
      "caption": "legenda completa sugerida",
      "hashtags": ["tag1", "tag2"]
    }
  ]
}

Regras:
- day_offset: 0 = segunda, 1 = terca, etc.
- type: "image" | "carousel" | "reels" | "story"
- Variar tipos de conteudo ao longo da semana
- Incluir pelo menos 1 carrossel educativo e 1 reels
- Captions devem ser completas e prontas para publicar
- Hashtags relevantes para o nicho`;

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
          { role: "user", content: "Gere o plano de conteudo da semana." },
        ],
        response_format: { type: "json_object" },
        temperature: 0.9,
      }),
    });

    if (!openaiRes.ok) return { generated: 0 };

    const data = await openaiRes.json();
    const plan = JSON.parse(data.choices[0].message.content);

    let generated = 0;
    for (const item of plan.posts || []) {
      const scheduledDate = new Date(nextMonday);
      scheduledDate.setDate(nextMonday.getDate() + (item.day_offset || 0));
      const [hours, minutes] = (item.time || "10:00").split(":").map(Number);
      scheduledDate.setHours(hours, minutes, 0, 0);

      await prisma.socialPost.create({
        data: {
          userId,
          title: item.title || `Sugestao ${dayNames[(scheduledDate.getDay())] || ""}`,
          caption: item.caption || "",
          hashtags: item.hashtags || [],
          mediaType: item.type || "image",
          platforms: item.platforms || ["instagram"],
          scheduledAt: scheduledDate,
          status: "draft",
          aiGenerated: true,
        },
      });
      generated++;
    }

    // Log usage
    const usage = data.usage;
    if (usage) {
      await prisma.aiUsageLog.create({
        data: {
          userId,
          operation: "caption",
          provider: "openai",
          model: config.model || "gpt-4o-mini",
          inputTokens: usage.prompt_tokens,
          outputTokens: usage.completion_tokens,
          costUsd: usage.prompt_tokens * 0.00000015 + usage.completion_tokens * 0.0000006,
        },
      });
    }

    return { generated };
  } catch (error) {
    console.error("Weekly suggestion error:", error);
    return { generated: 0 };
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateWeeklyContentSuggestions } from "@/services/contentSuggestion";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find all users with AI config (have API key set up)
    const configs = await prisma.aIConfig.findMany({
      where: { apiKey: { not: null } },
      select: { userId: true },
    });

    const results: { userId: string; generated: number }[] = [];

    for (const config of configs) {
      const result = await generateWeeklyContentSuggestions(config.userId);
      results.push({ userId: config.userId, generated: result.generated });
    }

    return NextResponse.json({
      ok: true,
      users: results.length,
      results,
    });
  } catch (error) {
    console.error("[cron/suggest-content] Error:", error);
    return NextResponse.json({ error: "Erro ao gerar sugestoes" }, { status: 500 });
  }
}

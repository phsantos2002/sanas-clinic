import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { validateCronAuth } from "@/lib/validateCronAuth";
import { prisma } from "@/lib/prisma";
import { generateWeeklyContentSuggestions } from "@/services/contentSuggestion";

export async function GET(req: NextRequest) {
  const deny = validateCronAuth(req);
  if (deny) return deny;

  try {
    const configs = await prisma.aIConfig.findMany({
      where: { apiKey: { not: null } },
      select: { userId: true },
    });

    const results: { userId: string; generated: number }[] = [];

    for (const config of configs) {
      const result = await generateWeeklyContentSuggestions(config.userId);
      results.push({ userId: config.userId, generated: result.generated });
    }

    logger.info("cron_suggest_content_done", { users: results.length });
    return NextResponse.json({ ok: true, users: results.length, results });
  } catch (error) {
    logger.error("cron_suggest_content_failed", {}, error);
    return NextResponse.json({ error: "Erro ao gerar sugestoes" }, { status: 500 });
  }
}

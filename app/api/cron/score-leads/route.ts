import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { validateCronAuth } from "@/lib/validateCronAuth";
import { prisma } from "@/lib/prisma";
import { recalculateScores } from "@/services/leadScoring";

export async function GET(req: NextRequest) {
  const deny = validateCronAuth(req);
  if (deny) return deny;

  try {
    const users = await prisma.user.findMany({ select: { id: true } });
    let totalUpdated = 0;

    for (const user of users) {
      const updated = await recalculateScores(user.id);
      totalUpdated += updated;
    }

    logger.info("cron_score_leads_done", { users: users.length, leadsUpdated: totalUpdated });
    return NextResponse.json({ ok: true, users: users.length, leadsUpdated: totalUpdated });
  } catch (error) {
    logger.error("cron_score_leads_failed", {}, error);
    return NextResponse.json({ error: "Erro ao calcular scores" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recalculateScores } from "@/services/leadScoring";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({ select: { id: true } });
    let totalUpdated = 0;

    for (const user of users) {
      const updated = await recalculateScores(user.id);
      totalUpdated += updated;
    }

    return NextResponse.json({ ok: true, users: users.length, leadsUpdated: totalUpdated });
  } catch (error) {
    console.error("[cron/score-leads] Error:", error);
    return NextResponse.json({ error: "Erro ao calcular scores" }, { status: 500 });
  }
}

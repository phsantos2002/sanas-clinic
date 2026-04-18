import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { validateCronAuth } from "@/lib/validateCronAuth";
import { prisma } from "@/lib/prisma";
import { runAllAgentsForUser } from "@/services/autonomousAgents/engine";

// Rodado diariamente (configurado em vercel.json).
// Para cada usuário com ao menos 1 agente ativo, executa todos os seus agentes autônomos.

export async function GET(req: NextRequest) {
  const deny = validateCronAuth(req);
  if (deny) return deny;

  const startedAt = Date.now();

  try {
    // Only users that have at least one active agent — evita rodar pra usuários sem setup
    const users = await prisma.user.findMany({
      where: {
        autonomousAgents: { some: { isActive: true } },
      },
      select: { id: true },
    });

    let totalSuccessful = 0;
    let totalFailed = 0;

    for (const user of users) {
      const result = await runAllAgentsForUser(user.id, "scheduled");
      totalSuccessful += result.successful;
      totalFailed += result.failed;
    }

    const durationMs = Date.now() - startedAt;
    logger.info("cron_run_agents_done", {
      users: users.length,
      successful: totalSuccessful,
      failed: totalFailed,
      durationMs,
    });

    return NextResponse.json({
      ok: true,
      users: users.length,
      successful: totalSuccessful,
      failed: totalFailed,
      durationMs,
    });
  } catch (error) {
    logger.error("cron_run_agents_failed", {}, error);
    return NextResponse.json({ error: "Erro ao executar agentes" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { webhookQueue, aiQueue } from "@/lib/queue";

/**
 * GET /api/health
 *
 * Health check endpoint. Returns 200 if the system is healthy, 503 if degraded.
 * Used by:
 * - Vercel deployment health checks
 * - External monitoring (UptimeRobot, Better Uptime, etc.)
 * - Internal readiness checks before deploying
 *
 * Response shape:
 *   { status: "ok" | "degraded", db: "ok" | "error", uptime: number, queues: {...} }
 */
export async function GET() {
  const start = Date.now();
  const checks: Record<string, "ok" | "error" | "warn"> = {};
  let overallStatus: "ok" | "degraded" = "ok";

  // ── Database check ────────────────────────────────────────
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = "ok";
  } catch (err) {
    checks.db = "error";
    overallStatus = "degraded";
    logger.error("health_check_db_failed", { err });
  }

  // ── Queue stats ───────────────────────────────────────────
  const webhookStats = webhookQueue.stats();
  const aiStats = aiQueue.stats();

  // Warn if queues are backing up
  if (webhookStats.pending > 100) {
    checks.webhookQueue = "warn";
    overallStatus = "degraded";
  } else {
    checks.webhookQueue = "ok";
  }

  if (aiStats.pending > 50) {
    checks.aiQueue = "warn";
  } else {
    checks.aiQueue = "ok";
  }

  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    responseTimeMs: Date.now() - start,
    checks,
    queues: {
      webhook: webhookStats,
      ai: aiStats,
    },
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
  };

  const httpStatus = overallStatus === "ok" ? 200 : 503;
  return NextResponse.json(response, { status: httpStatus });
}

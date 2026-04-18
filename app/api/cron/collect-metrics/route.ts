import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { validateCronAuth } from "@/lib/validateCronAuth";
import { collectPostMetrics } from "@/services/socialPublisher";

export async function GET(req: NextRequest) {
  const deny = validateCronAuth(req);
  if (deny) return deny;

  try {
    const result = await collectPostMetrics();
    logger.info("cron_collect_metrics_done", { checked: result.checked, updated: result.updated });
    return NextResponse.json({ ok: true, checked: result.checked, updated: result.updated });
  } catch (error) {
    logger.error("cron_collect_metrics_failed", {}, error);
    return NextResponse.json({ error: "Erro ao coletar metricas" }, { status: 500 });
  }
}

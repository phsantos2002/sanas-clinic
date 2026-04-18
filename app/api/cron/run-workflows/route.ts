import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { validateCronAuth } from "@/lib/validateCronAuth";
import { resumeDelayedExecutions } from "@/services/workflowEngine";

export async function GET(req: NextRequest) {
  const deny = validateCronAuth(req);
  if (deny) return deny;

  try {
    const result = await resumeDelayedExecutions();
    logger.info("cron_run_workflows_done", { resumed: result.resumed });
    return NextResponse.json({ ok: true, resumed: result.resumed });
  } catch (error) {
    logger.error("cron_run_workflows_failed", {}, error);
    return NextResponse.json({ error: "Erro ao executar workflows" }, { status: 500 });
  }
}

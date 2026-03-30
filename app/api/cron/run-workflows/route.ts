import { NextRequest, NextResponse } from "next/server";
import { resumeDelayedExecutions } from "@/services/workflowEngine";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await resumeDelayedExecutions();
    return NextResponse.json({ ok: true, resumed: result.resumed });
  } catch (error) {
    console.error("[cron/run-workflows] Error:", error);
    return NextResponse.json({ error: "Erro ao executar workflows" }, { status: 500 });
  }
}

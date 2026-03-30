import { NextRequest, NextResponse } from "next/server";
import { collectPostMetrics } from "@/services/socialPublisher";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await collectPostMetrics();
    return NextResponse.json({
      ok: true,
      checked: result.checked,
      updated: result.updated,
    });
  } catch (error) {
    console.error("[cron/collect-metrics] Error:", error);
    return NextResponse.json(
      { error: "Erro ao coletar metricas" },
      { status: 500 }
    );
  }
}

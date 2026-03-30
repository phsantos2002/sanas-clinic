import { NextRequest, NextResponse } from "next/server";
import { publishScheduledPosts } from "@/services/socialPublisher";

export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel sets this header for cron jobs)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await publishScheduledPosts();
    return NextResponse.json({
      ok: true,
      processed: result.processed,
      results: result.results,
    });
  } catch (error) {
    console.error("[cron/publish-posts] Error:", error);
    return NextResponse.json(
      { error: "Erro ao publicar posts" },
      { status: 500 }
    );
  }
}

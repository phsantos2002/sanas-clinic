import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { validateCronAuth } from "@/lib/validateCronAuth";
import { publishScheduledPosts } from "@/services/socialPublisher";

export async function GET(req: NextRequest) {
  const deny = validateCronAuth(req);
  if (deny) return deny;

  try {
    const result = await publishScheduledPosts();
    logger.info("cron_publish_posts_done", { processed: result.processed });
    return NextResponse.json({ ok: true, processed: result.processed, results: result.results });
  } catch (error) {
    logger.error("cron_publish_posts_failed", {}, error);
    return NextResponse.json({ error: "Erro ao publicar posts" }, { status: 500 });
  }
}

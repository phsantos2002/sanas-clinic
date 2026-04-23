import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Enqueue a failed webhook to the dead-letter queue for later inspection/replay.
 * Non-throwing — never let DLQ failures cascade.
 */
export async function enqueueWebhookDLQ(args: {
  source: "uazapi" | "meta_cloud" | "meta_lead_ads";
  rawPayload: unknown;
  error: unknown;
  userId?: string | null;
  phone?: string | null;
  attempts?: number;
}): Promise<void> {
  const { source, rawPayload, error, userId, phone, attempts } = args;
  const errorMessage =
    error instanceof Error ? error.message : typeof error === "string" ? error : "unknown error";
  const errorStack = error instanceof Error ? error.stack : undefined;

  try {
    await prisma.webhookDLQ.create({
      data: {
        source,
        rawPayload: rawPayload as object,
        errorMessage: errorMessage.slice(0, 2000),
        errorStack: errorStack?.slice(0, 4000) ?? null,
        attempts: attempts ?? 1,
        userId: userId ?? null,
        phone: phone ?? null,
      },
    });
    logger.info("webhook_dlq_enqueued", { source, error: errorMessage.slice(0, 200) });
  } catch (dbErr) {
    // Last-resort: log only — DLQ itself failed
    logger.error("webhook_dlq_enqueue_failed", { dbErr, originalError: errorMessage });
  }
}

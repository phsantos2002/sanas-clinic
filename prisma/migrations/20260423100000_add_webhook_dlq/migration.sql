-- Dead-letter queue for failed webhook processing

CREATE TABLE "WebhookDLQ" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "errorStack" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "userId" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "WebhookDLQ_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WebhookDLQ_source_createdAt_idx" ON "WebhookDLQ"("source", "createdAt");
CREATE INDEX "WebhookDLQ_userId_resolvedAt_idx" ON "WebhookDLQ"("userId", "resolvedAt");

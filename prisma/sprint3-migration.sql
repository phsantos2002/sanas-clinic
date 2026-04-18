-- Sprint 3 — Email tracking

CREATE TABLE IF NOT EXISTS "EmailTracking" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "providerId" TEXT,
  "errorMessage" TEXT,
  "sentAt" TIMESTAMP(3),
  "openedAt" TIMESTAMP(3),
  "openCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailTracking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "EmailTracking_userId_status_idx" ON "EmailTracking"("userId", "status");
CREATE INDEX IF NOT EXISTS "EmailTracking_leadId_idx" ON "EmailTracking"("leadId");
CREATE INDEX IF NOT EXISTS "EmailTracking_userId_createdAt_idx" ON "EmailTracking"("userId", "createdAt");

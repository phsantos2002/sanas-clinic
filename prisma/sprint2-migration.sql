-- Sprint 2 — Cadências outbound multi-toque

ALTER TABLE "Workflow" ADD COLUMN IF NOT EXISTS "isSequence" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Workflow" ADD COLUMN IF NOT EXISTS "stopOnReply" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS "Workflow_userId_isSequence_idx" ON "Workflow"("userId", "isSequence");

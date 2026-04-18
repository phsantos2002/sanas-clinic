-- Sprint 2: Idempotência de mensagens WhatsApp
-- Adiciona externalId (ID do provider) para prevenir duplicatas por reenvio de webhook.

ALTER TABLE "Message" ADD COLUMN "externalId" TEXT;

-- Índice único: mesmo lead não pode ter duas mensagens com o mesmo externalId
-- (NULL é excluído de unique constraints — mensagens sem externalId coexistem normalmente)
CREATE UNIQUE INDEX "Message_leadId_externalId_key"
  ON "Message"("leadId", "externalId")
  WHERE "externalId" IS NOT NULL;

-- Sprint 7: Versionamento de Workflows
-- Armazena snapshots do canvas/steps para histórico e rollback.

CREATE TABLE "WorkflowVersion" (
  "id"         TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "version"    INTEGER NOT NULL,
  "canvas"     JSONB,
  "steps"      JSONB,
  "label"      TEXT,
  "createdBy"  TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WorkflowVersion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkflowVersion_workflowId_idx" ON "WorkflowVersion"("workflowId");
CREATE UNIQUE INDEX "WorkflowVersion_workflowId_version_key" ON "WorkflowVersion"("workflowId", "version");

ALTER TABLE "WorkflowVersion"
  ADD CONSTRAINT "WorkflowVersion_workflowId_fkey"
  FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

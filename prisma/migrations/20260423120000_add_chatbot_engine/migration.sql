-- Chatbot engine: flows + per-lead state

CREATE TABLE "ChatbotFlow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "nodes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatbotFlow_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ChatbotFlow_userId_trigger_idx" ON "ChatbotFlow"("userId", "trigger");

CREATE TABLE "ChatbotState" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "currentNode" TEXT NOT NULL,
    "context" JSONB,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatbotState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChatbotState_leadId_flowId_key" ON "ChatbotState"("leadId", "flowId");
CREATE INDEX "ChatbotState_leadId_idx" ON "ChatbotState"("leadId");
CREATE INDEX "ChatbotState_lastActivity_idx" ON "ChatbotState"("lastActivity");

ALTER TABLE "ChatbotState" ADD CONSTRAINT "ChatbotState_flowId_fkey"
  FOREIGN KEY ("flowId") REFERENCES "ChatbotFlow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

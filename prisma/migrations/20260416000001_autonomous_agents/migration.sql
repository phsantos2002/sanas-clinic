-- Autonomous Agents system
-- Creates AutonomousAgent, AutonomousAgentExecution, AutonomousAgentAction, AutonomousAgentReport

-- CreateTable: AutonomousAgent
CREATE TABLE "AutonomousAgent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "autonomyLevel" TEXT NOT NULL DEFAULT 'full',
    "schedule" TEXT,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "config" JSONB NOT NULL DEFAULT '{}',
    "totalRuns" INTEGER NOT NULL DEFAULT 0,
    "totalActions" INTEGER NOT NULL DEFAULT 0,
    "totalReports" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutonomousAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AutonomousAgentExecution
CREATE TABLE "AutonomousAgentExecution" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "trigger" TEXT NOT NULL,
    "triggeredBy" TEXT,
    "summary" TEXT,
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AutonomousAgentExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AutonomousAgentAction
CREATE TABLE "AutonomousAgentAction" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "executionId" TEXT,
    "type" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetName" TEXT,
    "reasoning" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'executed',
    "errorMessage" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutonomousAgentAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AutonomousAgentReport
CREATE TABLE "AutonomousAgentReport" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "executionId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutonomousAgentReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AutonomousAgent_userId_type_key" ON "AutonomousAgent"("userId", "type");
CREATE INDEX "AutonomousAgent_userId_isActive_idx" ON "AutonomousAgent"("userId", "isActive");

CREATE INDEX "AutonomousAgentExecution_agentId_startedAt_idx" ON "AutonomousAgentExecution"("agentId", "startedAt");
CREATE INDEX "AutonomousAgentExecution_status_idx" ON "AutonomousAgentExecution"("status");

CREATE INDEX "AutonomousAgentAction_agentId_executedAt_idx" ON "AutonomousAgentAction"("agentId", "executedAt");
CREATE INDEX "AutonomousAgentAction_targetType_targetId_idx" ON "AutonomousAgentAction"("targetType", "targetId");
CREATE INDEX "AutonomousAgentAction_status_idx" ON "AutonomousAgentAction"("status");

CREATE INDEX "AutonomousAgentReport_agentId_createdAt_idx" ON "AutonomousAgentReport"("agentId", "createdAt");
CREATE INDEX "AutonomousAgentReport_agentId_isRead_idx" ON "AutonomousAgentReport"("agentId", "isRead");
CREATE INDEX "AutonomousAgentReport_severity_idx" ON "AutonomousAgentReport"("severity");

-- Foreign Keys
ALTER TABLE "AutonomousAgent"
  ADD CONSTRAINT "AutonomousAgent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AutonomousAgentExecution"
  ADD CONSTRAINT "AutonomousAgentExecution_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "AutonomousAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AutonomousAgentAction"
  ADD CONSTRAINT "AutonomousAgentAction_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "AutonomousAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AutonomousAgentAction"
  ADD CONSTRAINT "AutonomousAgentAction_executionId_fkey"
  FOREIGN KEY ("executionId") REFERENCES "AutonomousAgentExecution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AutonomousAgentReport"
  ADD CONSTRAINT "AutonomousAgentReport_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "AutonomousAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AutonomousAgentReport"
  ADD CONSTRAINT "AutonomousAgentReport_executionId_fkey"
  FOREIGN KEY ("executionId") REFERENCES "AutonomousAgentExecution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

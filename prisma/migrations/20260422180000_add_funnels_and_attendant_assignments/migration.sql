-- Funnels + Attendant assignments (per funnel and/or per stage)
-- Adds Funnel, AttendantFunnel, AttendantStage tables
-- Makes Stage.eventName nullable and adds Stage.funnelId

-- CreateTable: Funnel
CREATE TABLE "Funnel" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Funnel_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Funnel_userId_name_key" ON "Funnel"("userId", "name");
CREATE INDEX "Funnel_userId_idx" ON "Funnel"("userId");
ALTER TABLE "Funnel" ADD CONSTRAINT "Funnel_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Stage — eventName nullable + add funnelId
ALTER TABLE "Stage" ALTER COLUMN "eventName" DROP NOT NULL;
ALTER TABLE "Stage" ADD COLUMN "funnelId" TEXT;
ALTER TABLE "Stage" ADD CONSTRAINT "Stage_funnelId_fkey"
  FOREIGN KEY ("funnelId") REFERENCES "Funnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Stage_funnelId_idx" ON "Stage"("funnelId");

-- CreateTable: AttendantFunnel
CREATE TABLE "AttendantFunnel" (
    "id" TEXT NOT NULL,
    "attendantId" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "allStages" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendantFunnel_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AttendantFunnel_attendantId_funnelId_key" ON "AttendantFunnel"("attendantId", "funnelId");
CREATE INDEX "AttendantFunnel_funnelId_idx" ON "AttendantFunnel"("funnelId");
ALTER TABLE "AttendantFunnel" ADD CONSTRAINT "AttendantFunnel_attendantId_fkey"
  FOREIGN KEY ("attendantId") REFERENCES "Attendant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendantFunnel" ADD CONSTRAINT "AttendantFunnel_funnelId_fkey"
  FOREIGN KEY ("funnelId") REFERENCES "Funnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: AttendantStage
CREATE TABLE "AttendantStage" (
    "id" TEXT NOT NULL,
    "attendantId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendantStage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AttendantStage_attendantId_stageId_key" ON "AttendantStage"("attendantId", "stageId");
CREATE INDEX "AttendantStage_stageId_idx" ON "AttendantStage"("stageId");
ALTER TABLE "AttendantStage" ADD CONSTRAINT "AttendantStage_attendantId_fkey"
  FOREIGN KEY ("attendantId") REFERENCES "Attendant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendantStage" ADD CONSTRAINT "AttendantStage_stageId_fkey"
  FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

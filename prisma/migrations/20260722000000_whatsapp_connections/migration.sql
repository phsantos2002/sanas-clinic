-- Multi-conexão WhatsApp: várias conexões por tenant, uma por vendedor.
-- WhatsAppConfig (1/tenant) vira legado; backfill cria a conexão default.

CREATE TABLE "WhatsAppConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'evolution',
    "phoneNumberId" TEXT,
    "accessToken" TEXT,
    "verifyToken" TEXT,
    "metaAppSecret" TEXT,
    "serverUrl" TEXT,
    "instanceToken" TEXT,
    "instanceName" TEXT,
    "phoneNumber" TEXT,
    "attendantId" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "lastStatusAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsAppConnection_instanceName_key" ON "WhatsAppConnection"("instanceName");
CREATE INDEX "WhatsAppConnection_userId_idx" ON "WhatsAppConnection"("userId");
CREATE INDEX "WhatsAppConnection_userId_attendantId_idx" ON "WhatsAppConnection"("userId", "attendantId");

ALTER TABLE "WhatsAppConnection" ADD CONSTRAINT "WhatsAppConnection_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WhatsAppConnection" ADD CONSTRAINT "WhatsAppConnection_attendantId_fkey"
    FOREIGN KEY ("attendantId") REFERENCES "Attendant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Lead: última conexão pela qual o lead falou
ALTER TABLE "Lead" ADD COLUMN "connectionId" TEXT;
CREATE INDEX "Lead_userId_connectionId_idx" ON "Lead"("userId", "connectionId");

-- Backfill: 1 WhatsAppConfig existente → 1 conexão default equivalente
INSERT INTO "WhatsAppConnection" (
    "id", "userId", "label", "provider",
    "phoneNumberId", "accessToken", "verifyToken", "metaAppSecret",
    "serverUrl", "instanceToken", "instanceName",
    "isDefault", "isActive", "aiEnabled", "status", "updatedAt"
)
SELECT
    'wac_' || substr(md5(random()::text || "userId"), 1, 20),
    "userId",
    'Principal',
    "provider",
    NULLIF("phoneNumberId", ''), NULLIF("accessToken", ''), NULLIF("verifyToken", ''), "metaAppSecret",
    "uazapiServerUrl", "uazapiInstanceToken", "uazapiInstanceName",
    true, true, true, 'disconnected', CURRENT_TIMESTAMP
FROM "WhatsAppConfig";

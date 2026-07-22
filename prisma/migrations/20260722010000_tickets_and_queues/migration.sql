-- Atendimentos (F2): setores (Queue) e tickets estilo Whaticket.
-- Ticket = episódio de atendimento; IA é o estado "bot".

CREATE TABLE "Queue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "greeting" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Queue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Queue_userId_name_key" ON "Queue"("userId", "name");
CREATE INDEX "Queue_userId_idx" ON "Queue"("userId");

CREATE TABLE "QueueAttendant" (
    "id" TEXT NOT NULL,
    "queueId" TEXT NOT NULL,
    "attendantId" TEXT NOT NULL,

    CONSTRAINT "QueueAttendant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QueueAttendant_queueId_attendantId_key" ON "QueueAttendant"("queueId", "attendantId");

ALTER TABLE "QueueAttendant" ADD CONSTRAINT "QueueAttendant_queueId_fkey"
    FOREIGN KEY ("queueId") REFERENCES "Queue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QueueAttendant" ADD CONSTRAINT "QueueAttendant_attendantId_fkey"
    FOREIGN KEY ("attendantId") REFERENCES "Attendant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "connectionId" TEXT,
    "queueId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'bot',
    "attendantId" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pendingAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "firstHumanReplyAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "lastInboundAt" TIMESTAMP(3),
    "lastOutboundAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Ticket_userId_status_idx" ON "Ticket"("userId", "status");
CREATE INDEX "Ticket_userId_attendantId_status_idx" ON "Ticket"("userId", "attendantId", "status");
CREATE INDEX "Ticket_leadId_createdAt_idx" ON "Ticket"("leadId", "createdAt");

-- Invariante: no máximo 1 ticket ativo por lead (bot/pending/open).
CREATE UNIQUE INDEX "one_active_ticket_per_lead" ON "Ticket"("leadId")
    WHERE "status" IN ('bot', 'pending', 'open');

ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_queueId_fkey"
    FOREIGN KEY ("queueId") REFERENCES "Queue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Message: episódio, autor humano, conexão e role "note"
ALTER TABLE "Message" ADD COLUMN "ticketId" TEXT;
ALTER TABLE "Message" ADD COLUMN "attendantId" TEXT;
ALTER TABLE "Message" ADD COLUMN "connectionId" TEXT;

CREATE INDEX "Message_ticketId_idx" ON "Message"("ticketId");

ALTER TABLE "Message" ADD CONSTRAINT "Message_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- B6: agenda nativa — calendário independente do Google Calendar

CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "attendantId" TEXT,
    "leadId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Appointment_userId_startAt_idx" ON "Appointment"("userId", "startAt");
CREATE INDEX "Appointment_userId_attendantId_startAt_idx" ON "Appointment"("userId", "attendantId", "startAt");

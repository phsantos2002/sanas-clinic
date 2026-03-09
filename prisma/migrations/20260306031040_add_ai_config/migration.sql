-- CreateTable
CREATE TABLE "AIConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clinicName" TEXT NOT NULL DEFAULT 'Sanas Clinic',
    "systemPrompt" TEXT,
    "sendAudio" BOOLEAN NOT NULL DEFAULT false,
    "openaiKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AIConfig_userId_key" ON "AIConfig"("userId");

-- AddForeignKey
ALTER TABLE "AIConfig" ADD CONSTRAINT "AIConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

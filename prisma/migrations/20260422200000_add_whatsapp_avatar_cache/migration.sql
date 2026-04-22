-- Persistent cache for WhatsApp contact avatars (profile pics)
-- Avoids hammering Uazapi /chat/details on every poll and survives serverless cold starts.

CREATE TABLE "WhatsAppAvatarCache" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "imagePreview" TEXT NOT NULL DEFAULT '',
    "image" TEXT NOT NULL DEFAULT '',
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppAvatarCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsAppAvatarCache_userId_phone_key" ON "WhatsAppAvatarCache"("userId", "phone");
CREATE INDEX "WhatsAppAvatarCache_userId_idx" ON "WhatsAppAvatarCache"("userId");

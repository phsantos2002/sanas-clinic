-- B5: anexos de mídia nas mensagens (envio via Evolution)
ALTER TABLE "Message" ADD COLUMN "mediaUrl" TEXT;
ALTER TABLE "Message" ADD COLUMN "mediaType" TEXT;

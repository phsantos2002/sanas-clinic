-- AlterTable: add metaAppSecret to WhatsAppConfig
-- Column is nullable so existing rows are not affected

ALTER TABLE "WhatsAppConfig" ADD COLUMN "metaAppSecret" TEXT;

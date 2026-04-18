-- Sprint F — Enriquecimento de leads

ALTER TABLE "AIConfig" ADD COLUMN IF NOT EXISTS "enrichmentProvider" TEXT DEFAULT 'none';
ALTER TABLE "AIConfig" ADD COLUMN IF NOT EXISTS "apolloApiKey" TEXT;
ALTER TABLE "AIConfig" ADD COLUMN IF NOT EXISTS "hunterApiKey" TEXT;

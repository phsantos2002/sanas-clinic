-- Dedup leads with same (userId, phone) — keep oldest, repoint children, then add UNIQUE.
-- Idempotent: safe to re-run because UNIQUE creation uses IF NOT EXISTS.

-- Step 1: build a temp mapping of duplicate -> original (oldest by createdAt, tiebreak by id)
CREATE TEMP TABLE _lead_dedup AS
WITH ranked AS (
  SELECT id, "userId", phone,
    FIRST_VALUE(id) OVER (
      PARTITION BY "userId", phone
      ORDER BY "createdAt" ASC, id ASC
    ) AS keep_id
  FROM "Lead"
)
SELECT id AS dup_id, keep_id AS orig_id
FROM ranked
WHERE id <> keep_id;

-- Step 2: repoint children referencing duplicate leads to the original.
-- For tables with @@unique on (leadId, externalId) etc, conflicts are unlikely
-- because dups are by phone — same lead phone but different DB ids.

UPDATE "Message" t SET "leadId" = m.orig_id
FROM _lead_dedup m
WHERE t."leadId" = m.dup_id
  -- avoid duplicate key violation on (leadId, externalId): skip if a row already exists
  AND NOT EXISTS (
    SELECT 1 FROM "Message" t2
    WHERE t2."leadId" = m.orig_id
      AND t2."externalId" IS NOT NULL
      AND t2."externalId" = t."externalId"
  );

UPDATE "LeadStageHistory" t SET "leadId" = m.orig_id
FROM _lead_dedup m WHERE t."leadId" = m.dup_id;

UPDATE "LeadActivity" t SET "leadId" = m.orig_id
FROM _lead_dedup m WHERE t."leadId" = m.dup_id;

UPDATE "PixelEvent" t SET "leadId" = m.orig_id
FROM _lead_dedup m WHERE t."leadId" = m.dup_id;

UPDATE "WorkflowExecution" t SET "leadId" = m.orig_id
FROM _lead_dedup m WHERE t."leadId" = m.dup_id;

UPDATE "EmailTracking" t SET "leadId" = m.orig_id
FROM _lead_dedup m WHERE t."leadId" = m.dup_id;

UPDATE "WACampaignMessage" t SET "leadId" = m.orig_id
FROM _lead_dedup m WHERE t."leadId" = m.dup_id;

-- Step 3: delete duplicates (any orphan child rows already cascaded above)
DELETE FROM "Lead" WHERE id IN (SELECT dup_id FROM _lead_dedup);

DROP TABLE _lead_dedup;

-- Step 4: also dedup Message rows that share (leadId, externalId) (just in case
-- the Prisma @@unique was declared but the index never landed).
DELETE FROM "Message" m
USING "Message" m2
WHERE m.id > m2.id
  AND m."leadId" = m2."leadId"
  AND m."externalId" IS NOT NULL
  AND m."externalId" = m2."externalId";

-- Step 5: add UNIQUE constraints (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'Lead_userId_phone_key'
  ) THEN
    CREATE UNIQUE INDEX "Lead_userId_phone_key" ON "Lead"("userId", phone);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'Message_leadId_externalId_key'
  ) THEN
    CREATE UNIQUE INDEX "Message_leadId_externalId_key" ON "Message"("leadId", "externalId");
  END IF;
END $$;

-- Drop the redundant non-unique index on (userId, phone) if it exists
DROP INDEX IF EXISTS "Lead_userId_phone_idx";

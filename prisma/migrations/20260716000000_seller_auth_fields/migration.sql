-- Vendedor com login próprio: vincula Attendant a uma identidade Supabase Auth.
-- O tenant continua sendo o User do dono; o Attendant só ganha o vínculo de login.

ALTER TABLE "Attendant" ADD COLUMN "authUserId" TEXT;
ALTER TABLE "Attendant" ADD COLUMN "authEmail" TEXT;
ALTER TABLE "Attendant" ADD COLUMN "invitedAt" TIMESTAMP(3);
ALTER TABLE "Attendant" ADD COLUMN "inviteStatus" TEXT NOT NULL DEFAULT 'none';

CREATE UNIQUE INDEX "Attendant_authUserId_key" ON "Attendant"("authUserId");
CREATE INDEX "Attendant_authEmail_idx" ON "Attendant"("authEmail");

/**
 * One-shot migration script — criptografa tokens já salvos em plain text
 * em GoogleCalendar (e futuras tabelas com tokens OAuth) usando lib/crypto.
 *
 * Roda: npx tsx scripts/encrypt-existing-tokens.ts
 *
 * Idempotente: usa isEncrypted() pra pular linhas já migradas. Pode ser
 * rodado várias vezes sem efeito colateral.
 *
 * Pré-requisito: ENCRYPTION_KEY no env (vem do .env local).
 */

import { config } from "dotenv";
config();

import { PrismaClient } from "@prisma/client";
import { encrypt, isEncrypted } from "../lib/crypto";

const prisma = new PrismaClient();

async function migrateGoogleCalendarTokens() {
  const rows = await prisma.googleCalendar.findMany({
    select: { userId: true, accessToken: true, refreshToken: true },
  });

  let migrated = 0;
  let skipped = 0;

  for (const row of rows) {
    const accessNeedsEnc = row.accessToken && !isEncrypted(row.accessToken);
    const refreshNeedsEnc = row.refreshToken && !isEncrypted(row.refreshToken);

    if (!accessNeedsEnc && !refreshNeedsEnc) {
      skipped += 1;
      continue;
    }

    await prisma.googleCalendar.update({
      where: { userId: row.userId },
      data: {
        accessToken: accessNeedsEnc ? encrypt(row.accessToken) : row.accessToken,
        refreshToken: refreshNeedsEnc ? encrypt(row.refreshToken!) : row.refreshToken,
      },
    });

    migrated += 1;
    console.log(`  ✓ migrated user ${row.userId.slice(0, 8)}...`);
  }

  console.log(`GoogleCalendar: ${migrated} migrated, ${skipped} already encrypted`);
}

async function main() {
  console.log("Starting token encryption migration...\n");
  await migrateGoogleCalendarTokens();
  console.log("\nDone.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Créditos da IA Sanas — 1 crédito = 1 resposta da IA no WhatsApp.
 *
 * A IA roda na chave Anthropic DO SISTEMA (env ANTHROPIC_API_KEY); o tenant
 * consome créditos em vez de trazer chave própria. Débito é atômico e
 * condicional (updateMany where balance >= 1) — nunca fica negativo mesmo
 * com rajadas concorrentes.
 */

const log = logger.child({ service: "aiCredits" });

export const WELCOME_CREDITS = 20; // bônus inicial ao criar a carteira

export async function getOrCreateWallet(userId: string) {
  const existing = await prisma.aiWallet.findUnique({ where: { userId } });
  if (existing) return existing;

  try {
    const wallet = await prisma.aiWallet.create({
      data: { userId, balance: WELCOME_CREDITS },
    });
    await prisma.aiWalletTransaction.create({
      data: {
        walletId: wallet.id,
        userId,
        type: "bonus",
        amount: WELCOME_CREDITS,
        balanceAfter: WELCOME_CREDITS,
        reason: "Bônus de boas-vindas",
      },
    });
    log.info("wallet_created", { userId, balance: WELCOME_CREDITS });
    return wallet;
  } catch {
    // corrida na criação → pega a existente
    return prisma.aiWallet.findUniqueOrThrow({ where: { userId } });
  }
}

export async function getBalance(userId: string): Promise<number> {
  const wallet = await getOrCreateWallet(userId);
  return wallet.balance;
}

/**
 * Debita 1 crédito (1 resposta da IA). Retorna false se saldo insuficiente —
 * o chamador decide o fallback (não responder / avisar o dono).
 */
export async function debitOneCredit(userId: string, reason = "Resposta da IA"): Promise<boolean> {
  const wallet = await getOrCreateWallet(userId);

  const result = await prisma.aiWallet.updateMany({
    where: { id: wallet.id, balance: { gte: 1 } },
    data: { balance: { decrement: 1 } },
  });
  if (result.count === 0) return false;

  const updated = await prisma.aiWallet.findUnique({ where: { id: wallet.id } });
  await prisma.aiWalletTransaction
    .create({
      data: {
        walletId: wallet.id,
        userId,
        type: "debit",
        amount: 1,
        balanceAfter: updated?.balance ?? 0,
        reason,
      },
    })
    .catch(() => {});
  return true;
}

/** Recarga (operador do sistema). */
export async function grantCredits(userId: string, amount: number, reason = "Recarga") {
  if (amount <= 0) return null;
  const wallet = await getOrCreateWallet(userId);
  const updated = await prisma.aiWallet.update({
    where: { id: wallet.id },
    data: { balance: { increment: amount } },
  });
  await prisma.aiWalletTransaction.create({
    data: {
      walletId: wallet.id,
      userId,
      type: "grant",
      amount,
      balanceAfter: updated.balance,
      reason,
    },
  });
  log.info("credits_granted", { userId, amount, balance: updated.balance });
  return updated;
}

/** A IA do sistema está disponível? (chave configurada no servidor) */
export function systemAiAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

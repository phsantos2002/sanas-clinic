-- B6: IA Sanas (Anthropic) com créditos — 1 crédito = 1 resposta

CREATE TABLE "AiWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiWallet_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiWallet_userId_key" ON "AiWallet"("userId");

CREATE TABLE "AiWalletTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiWalletTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiWalletTransaction_userId_createdAt_idx" ON "AiWalletTransaction"("userId", "createdAt");

ALTER TABLE "AiWalletTransaction" ADD CONSTRAINT "AiWalletTransaction_walletId_fkey"
    FOREIGN KEY ("walletId") REFERENCES "AiWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

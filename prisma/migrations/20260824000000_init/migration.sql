-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "avatarUrl" TEXT,
    "role" TEXT NOT NULL DEFAULT 'Trader Indépendant',
    "plan" TEXT NOT NULL DEFAULT 'Pro Desk & MT5 Live',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trading_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brokerOrPropFirm" TEXT,
    "accountNumber" TEXT,
    "accountType" TEXT NOT NULL DEFAULT 'LIVE',
    "currency" TEXT NOT NULL DEFAULT '$',
    "initialBalance" DOUBLE PRECISION NOT NULL DEFAULT 10000,
    "currentBalance" DOUBLE PRECISION,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trading_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trades" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT,
    "ticketNumber" TEXT,
    "pair" TEXT NOT NULL,
    "assetClass" TEXT NOT NULL DEFAULT 'FOREX',
    "direction" TEXT NOT NULL DEFAULT 'LONG',
    "status" TEXT NOT NULL DEFAULT 'WIN',
    "entryDate" TEXT NOT NULL,
    "entryTime" TEXT,
    "exitDate" TEXT,
    "exitTime" TEXT,
    "session" TEXT,
    "timeframe" TEXT,
    "entryPrice" DOUBLE PRECISION NOT NULL,
    "exitPrice" DOUBLE PRECISION NOT NULL,
    "stopLoss" DOUBLE PRECISION NOT NULL,
    "takeProfit" DOUBLE PRECISION NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "fees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "riskAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pnl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pnlPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rMultiple" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "strategy" TEXT,
    "playbookId" TEXT,
    "mistakes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "emotions" TEXT,
    "executionRating" INTEGER NOT NULL DEFAULT 5,
    "rulesRespected" BOOLEAN NOT NULL DEFAULT true,
    "indicators" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "supportLevels" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[],
    "resistanceLevels" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[],
    "chartPatterns" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "technicalNotes" TEXT,
    "chartUrl" TEXT,
    "notes" TEXT,
    "keyTakeaway" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playbooks" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "assetClass" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredTimeframe" TEXT,
    "preferredSession" TEXT,
    "rules" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "playbooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mt5_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "server" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "investorPassword" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONNECTED',
    "webhookSecret" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mt5_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mt5_sync_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mt5AccountId" TEXT,
    "ticket" TEXT,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "details" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mt5_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "trading_accounts_userId_idx" ON "trading_accounts"("userId");

-- CreateIndex
CREATE INDEX "trades_userId_idx" ON "trades"("userId");

-- CreateIndex
CREATE INDEX "trades_accountId_idx" ON "trades"("accountId");

-- CreateIndex
CREATE INDEX "trades_pair_idx" ON "trades"("pair");

-- CreateIndex
CREATE INDEX "trades_entryDate_idx" ON "trades"("entryDate");

-- CreateIndex
CREATE INDEX "playbooks_userId_idx" ON "playbooks"("userId");

-- CreateIndex
CREATE INDEX "mt5_accounts_userId_idx" ON "mt5_accounts"("userId");

-- CreateIndex
CREATE INDEX "mt5_sync_logs_userId_idx" ON "mt5_sync_logs"("userId");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trading_accounts" ADD CONSTRAINT "trading_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "trading_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "playbooks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playbooks" ADD CONSTRAINT "playbooks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mt5_accounts" ADD CONSTRAINT "mt5_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mt5_sync_logs" ADD CONSTRAINT "mt5_sync_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mt5_sync_logs" ADD CONSTRAINT "mt5_sync_logs_mt5AccountId_fkey" FOREIGN KEY ("mt5AccountId") REFERENCES "mt5_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;


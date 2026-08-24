import fs from 'fs';
import path from 'path';
import { checkDatabaseConnection } from '../src/server/db/client';
import { userRepository } from '../src/server/auth/repositories/user.repository';
import { tradingAccountRepository } from '../src/server/trading/repositories/account.repository';
import { playbookRepository } from '../src/server/trading/repositories/playbook.repository';
import { tradeRepository } from '../src/server/trading/repositories/trade.repository';
import { mt5Repository } from '../src/server/trading/repositories/mt5.repository';

interface MigrationReport {
  timestamp: string;
  sourceFile: string;
  usersProcessed: number;
  accountsProcessed: number;
  playbooksProcessed: number;
  tradesProcessed: number;
  mt5AccountsProcessed: number;
  dbCounts: {
    users: number;
    accounts: number;
    playbooks: number;
    trades: number;
    mt5Accounts: number;
  };
  errors: string[];
}

export async function runJsonToPostgresMigration(): Promise<MigrationReport> {
  const jsonPath = path.join(process.cwd(), 'trades_db.json');
  const report: MigrationReport = {
    timestamp: new Date().toISOString(),
    sourceFile: jsonPath,
    usersProcessed: 0,
    accountsProcessed: 0,
    playbooksProcessed: 0,
    tradesProcessed: 0,
    mt5AccountsProcessed: 0,
    dbCounts: {
      users: 0,
      accounts: 0,
      playbooks: 0,
      trades: 0,
      mt5Accounts: 0,
    },
    errors: [],
  };

  console.log('====================================================');
  console.log('🔄 TRE13ZE MIGRATION JSON -> POSTGRESQL');
  console.log('====================================================');

  // Initialize DB Connection verification
  const dbHealth = await checkDatabaseConnection();
  if (!dbHealth.connected) {
    console.warn('[Migration Warning] PostgreSQL check returned:', dbHealth.error);
  } else {
    console.log('[Migration] PostgreSQL database connection verified via Prisma.');
  }

  // Read JSON file if available
  let rawData: any = {};
  if (fs.existsSync(jsonPath)) {
    try {
      const fileContent = fs.readFileSync(jsonPath, 'utf8');
      rawData = JSON.parse(fileContent);
      console.log(`[Migration] Source file loaded: ${jsonPath} (${fileContent.length} bytes)`);
    } catch (e: any) {
      console.error('[Migration] Failed to parse JSON source file:', e.message);
      report.errors.push(`JSON Read Error: ${e.message}`);
    }
  } else {
    console.log('[Migration] No trades_db.json file found. Skipping JSON migration.');
    return report;
  }

  // Tracking map for userId normalization and references
  const userIdMap = new Map<string, string>();

  // 1. Process Users (Only if present in JSON - no fictitious users generated)
  const jsonUsers = Array.isArray(rawData.users) ? rawData.users : [];
  for (const u of jsonUsers) {
    if (!u || !u.email) continue;
    try {
      const existing = await userRepository.findByEmail(u.email);
      if (existing) {
        if (u.id) userIdMap.set(u.id, existing.id);
        userIdMap.set(u.email, existing.id);
      } else {
        const created = await userRepository.create({
          email: u.email,
          name: u.name || 'Trader',
          passwordHash: u.passwordHash,
          avatarUrl: u.avatarUrl,
          role: u.role || 'Trader Indépendant',
          plan: u.plan || 'Pro Desk & MT5 Live',
          emailVerified: Boolean(u.emailVerified),
          lastLoginAt: u.lastLoginAt,
        });
        if (u.id) userIdMap.set(u.id, created.id);
        userIdMap.set(u.email, created.id);
        report.usersProcessed++;
        console.log(`[Migration] User migrated: ${u.email} -> ID ${created.id}`);
      }
    } catch (err: any) {
      console.error(`[Migration] User ${u.email} error:`, err.message);
      report.errors.push(`User ${u.email} error: ${err.message}`);
    }
  }

  // 2. Process Playbooks (Global / System or User-specific)
  const jsonPlaybooks = Array.isArray(rawData.playbooks) ? rawData.playbooks : [];
  for (const pb of jsonPlaybooks) {
    if (!pb || !pb.id) continue;
    try {
      let mappedUserId: string | undefined = undefined;
      if (pb.userId) {
        const resolvedId = userIdMap.get(pb.userId) || pb.userId;
        const exists = await userRepository.findById(resolvedId);
        if (exists) mappedUserId = exists.id;
      }

      await playbookRepository.upsert({
        id: String(pb.id),
        userId: mappedUserId,
        name: pb.name || 'Stratégie',
        description: pb.description,
        assetClass: Array.isArray(pb.assetClass) ? pb.assetClass : [],
        preferredTimeframe: pb.preferredTimeframe,
        preferredSession: pb.preferredSession,
        rules: Array.isArray(pb.rules) ? pb.rules : [],
        createdAt: pb.createdAt || new Date().toISOString(),
      });
      report.playbooksProcessed++;
    } catch (err: any) {
      console.error(`[Migration] Playbook ${pb.id} error:`, err.message);
      report.errors.push(`Playbook ${pb.id} error: ${err.message}`);
    }
  }

  // 3. Process Trading Accounts (Only if accounts present in JSON)
  const jsonAccounts = Array.isArray(rawData.accounts) ? rawData.accounts : [];
  for (const acc of jsonAccounts) {
    if (!acc || !acc.id) continue;

    // Resolve owner userId strictly
    let targetUserId: string | null = null;
    if (acc.userId) {
      const resolved = userIdMap.get(acc.userId) || acc.userId;
      const user = await userRepository.findById(resolved);
      if (user) targetUserId = user.id;
    } else if (acc.userEmail) {
      const user = await userRepository.findByEmail(acc.userEmail);
      if (user) targetUserId = user.id;
    }

    if (!targetUserId) {
      console.log(`[Migration Notice] TradingAccount ${acc.id} skipped (no existing user mapped for foreign key).`);
      continue;
    }

    try {
      await tradingAccountRepository.upsert({
        id: String(acc.id),
        userId: targetUserId,
        name: acc.name || 'Compte Trading',
        brokerOrPropFirm: acc.brokerOrPropFirm || acc.broker,
        accountNumber: acc.accountNumber ? String(acc.accountNumber) : undefined,
        accountType: acc.accountType || 'LIVE',
        currency: acc.currency || '$',
        initialBalance: Number(acc.initialBalance) || 10000,
        currentBalance: acc.currentBalance != null ? Number(acc.currentBalance) : undefined,
        description: acc.description,
        isDefault: Boolean(acc.isDefault),
        createdAt: acc.createdAt || new Date().toISOString(),
      });
      report.accountsProcessed++;
    } catch (err: any) {
      console.error(`[Migration] Account ${acc.id} error:`, err.message);
      report.errors.push(`Account ${acc.id} error: ${err.message}`);
    }
  }

  // 4. Process Trades (Only if trades present in JSON)
  const jsonTrades = Array.isArray(rawData.trades) ? rawData.trades : [];
  for (const tr of jsonTrades) {
    if (!tr || !tr.id) continue;

    // Resolve owner userId strictly
    let targetUserId: string | null = null;
    if (tr.userId) {
      const resolved = userIdMap.get(tr.userId) || tr.userId;
      const user = await userRepository.findById(resolved);
      if (user) targetUserId = user.id;
    }

    // Fallback: If trade references an account already present in DB, use that account's owner
    if (!targetUserId && tr.accountId) {
      const acc = await tradingAccountRepository.findById(tr.accountId);
      if (acc && acc.userId) {
        targetUserId = acc.userId;
      }
    }

    if (!targetUserId) {
      console.log(`[Migration Notice] Trade ${tr.id} skipped (no existing user mapped for foreign key).`);
      continue;
    }

    try {
      await tradeRepository.upsert({
        id: String(tr.id),
        userId: targetUserId,
        accountId: tr.accountId,
        ticketNumber: tr.ticketNumber ? String(tr.ticketNumber) : undefined,
        pair: tr.pair || 'EUR/USD',
        assetClass: tr.assetClass || 'FOREX',
        direction: tr.direction || 'LONG',
        status: tr.status || 'WIN',
        entryDate: tr.entryDate || new Date().toISOString().split('T')[0],
        entryTime: tr.entryTime,
        exitDate: tr.exitDate,
        exitTime: tr.exitTime,
        session: tr.session,
        timeframe: tr.timeframe,
        entryPrice: Number(tr.entryPrice) || 0,
        exitPrice: Number(tr.exitPrice) || 0,
        stopLoss: Number(tr.stopLoss) || 0,
        takeProfit: Number(tr.takeProfit) || 0,
        quantity: Number(tr.quantity) || 1,
        fees: Number(tr.fees) || 0,
        riskAmount: Number(tr.riskAmount) || 0,
        pnl: Number(tr.pnl) || 0,
        pnlPercentage: Number(tr.pnlPercentage) || 0,
        rMultiple: Number(tr.rMultiple) || 0,
        strategy: tr.strategy,
        playbookId: tr.playbookId,
        mistakes: Array.isArray(tr.mistakes) ? tr.mistakes : [],
        emotions: tr.emotions,
        executionRating: tr.executionRating != null ? Number(tr.executionRating) : 5,
        rulesRespected: tr.rulesRespected != null ? Boolean(tr.rulesRespected) : true,
        indicators: Array.isArray(tr.indicators) ? tr.indicators : [],
        supportLevels: Array.isArray(tr.supportLevels) ? tr.supportLevels.map(Number) : [],
        resistanceLevels: Array.isArray(tr.resistanceLevels) ? tr.resistanceLevels.map(Number) : [],
        chartPatterns: Array.isArray(tr.chartPatterns) ? tr.chartPatterns : [],
        technicalNotes: tr.technicalNotes,
        chartUrl: tr.chartUrl,
        notes: tr.notes,
        keyTakeaway: tr.keyTakeaway,
        createdAt: tr.createdAt || new Date().toISOString(),
      });
      report.tradesProcessed++;
    } catch (err: any) {
      console.error(`[Migration] Trade ${tr.id} error:`, err.message);
      report.errors.push(`Trade ${tr.id} error: ${err.message}`);
    }
  }

  // 5. Process MT5 Accounts (Only if present in JSON)
  const jsonMt5Accounts = Array.isArray(rawData.mt5Accounts) ? rawData.mt5Accounts : [];
  for (const mt of jsonMt5Accounts) {
    if (!mt || !mt.id) continue;

    let targetUserId: string | null = null;
    if (mt.userId) {
      const resolved = userIdMap.get(mt.userId) || mt.userId;
      const user = await userRepository.findById(resolved);
      if (user) targetUserId = user.id;
    }

    if (!targetUserId) {
      console.log(`[Migration Notice] MT5 Account ${mt.id} skipped (no user mapped).`);
      continue;
    }

    try {
      await mt5Repository.upsertAccount({
        id: String(mt.id),
        userId: targetUserId,
        accountName: mt.accountName || `${mt.server} #${mt.accountNumber}`,
        server: mt.server || 'FTMO-Server',
        accountNumber: String(mt.accountNumber || '1029482'),
        investorPassword: mt.investorPassword,
        status: mt.status || 'CONNECTED',
        webhookSecret: mt.webhookSecret,
        lastSyncAt: mt.lastSyncAt,
        createdAt: mt.createdAt || new Date().toISOString(),
      });
      report.mt5AccountsProcessed++;
    } catch (err: any) {
      console.error(`[Migration] MT5 Account ${mt.id} error:`, err.message);
      report.errors.push(`MT5 Account ${mt.id} error: ${err.message}`);
    }
  }

  // Query final counts
  try {
    report.dbCounts.users = await userRepository.count();
    report.dbCounts.accounts = await tradingAccountRepository.count();
    report.dbCounts.playbooks = await playbookRepository.count();
    report.dbCounts.trades = await tradeRepository.count();
    report.dbCounts.mt5Accounts = await mt5Repository.count();
  } catch (err: any) {
    console.error('[Migration] Count verification error:', err.message);
  }

  console.log('====================================================');
  console.log('✅ POSTGRESQL MIGRATION COMPLETE');
  console.log(`- Users in DB:        ${report.dbCounts.users}`);
  console.log(`- Accounts in DB:     ${report.dbCounts.accounts}`);
  console.log(`- Playbooks in DB:    ${report.dbCounts.playbooks}`);
  console.log(`- Trades in DB:       ${report.dbCounts.trades}`);
  console.log(`- MT5 Accounts in DB: ${report.dbCounts.mt5Accounts}`);
  console.log(`- Errors:             ${report.errors.length}`);
  console.log('====================================================');

  return report;
}

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
    console.log('[Migration] No existing trades_db.json found. Creating initial seed data.');
  }

  // 1. Ensure primary user exists
  let primaryUserId = 'usr_default_trader_01';
  try {
    const existingUsers = await userRepository.listAll();
    let primaryUser = existingUsers.find((u) => u.email === 'alex.dupont@tre13ze.io') || existingUsers[0];

    if (!primaryUser) {
      primaryUser = await userRepository.create({
        email: 'alex.dupont@tre13ze.io',
        name: 'Alex Dupont',
        passwordHash: '$2b$10$wEkgQx24xJ1t5fR6hD12re8s3d9f0a2b4c6e8g0i2k4m6o8q0s2u4', // sample hashed
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        role: 'Trader Indépendant Pro',
        plan: 'Pro Desk & MT5 Live',
        emailVerified: true,
        lastLoginAt: new Date().toISOString(),
      });
      console.log(`[Migration] Primary user created in PostgreSQL (ID: ${primaryUser.id})`);
    } else {
      console.log(`[Migration] Found existing user in PostgreSQL (ID: ${primaryUser.id})`);
    }

    primaryUserId = primaryUser.id;
    report.usersProcessed = 1;
  } catch (err: any) {
    console.error('[Migration] User processing error:', err.message);
    report.errors.push(`User error: ${err.message}`);
  }

  // 2. Process Trading Accounts
  const jsonAccounts = Array.isArray(rawData.accounts) ? rawData.accounts : [
    {
      id: 'acc-demo-10k',
      name: 'Compte Démo FTMO 10K',
      brokerOrPropFirm: 'FTMO',
      accountNumber: '1029482',
      accountType: 'PROP_FIRM_EVALUATION',
      currency: '$',
      initialBalance: 10000,
      currentBalance: 11450,
      description: 'Challenge 10k en cours de validation',
      isDefault: true,
      createdAt: '2025-01-01T08:00:00.000Z',
    },
    {
      id: 'acc-live-personal',
      name: 'Compte Personnel Live IC Markets',
      brokerOrPropFirm: 'IC Markets',
      accountNumber: '839201',
      accountType: 'LIVE_PERSONAL',
      currency: '$',
      initialBalance: 5000,
      currentBalance: 5820,
      description: 'Capital propre swing & day-trading',
      isDefault: false,
      createdAt: '2025-01-10T10:00:00.000Z',
    }
  ];

  for (const acc of jsonAccounts) {
    if (!acc || !acc.id) continue;
    try {
      await tradingAccountRepository.upsert({
        id: String(acc.id),
        userId: primaryUserId,
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

  // 3. Process Playbooks / Strategies
  const jsonPlaybooks = Array.isArray(rawData.playbooks) ? rawData.playbooks : [
    {
      id: 'ict-silver-bullet',
      name: 'ICT Silver Bullet',
      description: 'Entrée FVG pendant les fenêtres de liquidité 10h-11h NY et 14h-15h NY',
      assetClass: ['FOREX', 'INDICES'],
      preferredTimeframe: '1M / 5M',
      preferredSession: 'NEW_YORK',
      rules: [
        'Identifier la liquidité Buy-side / Sell-side sur 15M/1H',
        'Attendre un Market Structure Shift (MSS) avec déplacement net',
        'Entrée limite sur le Fair Value Gap (FVG)',
        'Stop Loss au-delà du swing high/low',
        'Take Profit sur la prochaine pool de liquidité opposée (min 2R)',
      ],
      createdAt: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 'smc-orderblock-fvg',
      name: 'SMC Order Block + FVG',
      description: 'Atténuation sur Order Block non mitigé avec confluence FVG',
      assetClass: ['FOREX', 'COMMODITIES'],
      preferredTimeframe: '15M / 1H',
      preferredSession: 'LONDON',
      rules: [
        'Identifier la tendance Higher Timeframe (4H / Daily)',
        'Localiser un Order Block institutionnel ayant provoqué une cassure de structure',
        'Attendre le pullback dans la zone OTE (61.8% - 78.6% Fib)',
        'Confirmation sur Lower Timeframe (CHoCH)',
        'R:R minimum exigé 1:3',
      ],
      createdAt: '2025-01-02T00:00:00.000Z',
    }
  ];

  for (const pb of jsonPlaybooks) {
    if (!pb || !pb.id) continue;
    try {
      await playbookRepository.upsert({
        id: String(pb.id),
        userId: primaryUserId,
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

  // 4. Process Trades
  const jsonTrades = Array.isArray(rawData.trades) ? rawData.trades : [];
  for (const tr of jsonTrades) {
    if (!tr || !tr.id) continue;
    try {
      await tradeRepository.upsert({
        id: String(tr.id),
        userId: primaryUserId,
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

  // 5. Process MT5 Accounts
  const jsonMt5Accounts = Array.isArray(rawData.mt5Accounts) ? rawData.mt5Accounts : [];
  for (const mt of jsonMt5Accounts) {
    if (!mt || !mt.id) continue;
    try {
      await mt5Repository.upsertAccount({
        id: String(mt.id),
        userId: primaryUserId,
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
    const mt5Accs = await mt5Repository.getAccounts(primaryUserId);
    report.dbCounts.mt5Accounts = mt5Accs.length;
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


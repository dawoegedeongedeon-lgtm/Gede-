import { tradingAccountRepository, TradingAccountRecord } from '../repositories/account.repository';
import { tradeRepository, TradeRecord } from '../repositories/trade.repository';
import { playbookRepository, PlaybookRecord } from '../repositories/playbook.repository';
import { mt5Repository, Mt5AccountRecord } from '../repositories/mt5.repository';
import { userRepository } from '../../auth/repositories/user.repository';

export class TradingService {
  constructor(
    private accountRepo = tradingAccountRepository,
    private tradeRepo = tradeRepository,
    private playbookRepo = playbookRepository,
    private mt5Repo = mt5Repository,
    private userRepo = userRepository
  ) {}

  /**
   * Resolve default user ID if not provided
   */
  private async resolveUserId(userId?: string): Promise<string> {
    if (userId) return userId;
    // Fallback to first user in database or standard primary trader
    const allUsers = await this.userRepo.listAll();
    if (allUsers.length > 0) return allUsers[0].id;
    return 'usr_default_trader_01';
  }

  /**
   * Get full database snapshot for the requested user
   */
  public async getDatabaseState(userId?: string): Promise<{
    trades: TradeRecord[];
    accounts: TradingAccountRecord[];
    playbooks: PlaybookRecord[];
    mt5Accounts: Mt5AccountRecord[];
    initialBalance: number;
    currency: string;
    updatedAt: string;
  }> {
    const effectiveUserId = await this.resolveUserId(userId);

    const [trades, accounts, playbooks, mt5Accounts] = await Promise.all([
      this.tradeRepo.findByUserId(effectiveUserId),
      this.accountRepo.findByUserId(effectiveUserId),
      this.playbookRepo.findByUserId(effectiveUserId),
      this.mt5Repo.getAccounts(effectiveUserId),
    ]);

    const defaultAcc = accounts.find((a) => a.isDefault) || accounts[0];
    const initialBalance = defaultAcc ? defaultAcc.initialBalance : 10000;
    const currency = defaultAcc ? defaultAcc.currency : '$';

    return {
      trades,
      accounts,
      playbooks,
      mt5Accounts,
      initialBalance,
      currency,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Sync complete state into PostgreSQL
   */
  public async syncDatabaseState(
    payload: { trades?: any[]; playbooks?: any[]; accounts?: any[]; initialBalance?: number; currency?: string },
    userId?: string
  ): Promise<{ tradesCount: number; accountsCount: number; updatedAt: string }> {
    const effectiveUserId = await this.resolveUserId(userId);

    // Upsert accounts
    if (Array.isArray(payload.accounts)) {
      for (const acc of payload.accounts) {
        if (!acc.id) continue;
        await this.accountRepo.upsert({
          id: acc.id,
          userId: effectiveUserId,
          name: acc.name || 'Compte Trading',
          brokerOrPropFirm: acc.brokerOrPropFirm,
          accountNumber: acc.accountNumber,
          accountType: acc.accountType || 'LIVE',
          currency: acc.currency || '$',
          initialBalance: Number(acc.initialBalance) || 10000,
          currentBalance: acc.currentBalance != null ? Number(acc.currentBalance) : undefined,
          description: acc.description,
          isDefault: Boolean(acc.isDefault),
          createdAt: acc.createdAt || new Date().toISOString(),
        });
      }
    }

    // Upsert playbooks
    if (Array.isArray(payload.playbooks)) {
      for (const pb of payload.playbooks) {
        if (!pb.id) continue;
        await this.playbookRepo.upsert({
          id: pb.id,
          userId: effectiveUserId,
          name: pb.name || 'Stratégie',
          description: pb.description,
          assetClass: Array.isArray(pb.assetClass) ? pb.assetClass : [],
          preferredTimeframe: pb.preferredTimeframe,
          preferredSession: pb.preferredSession,
          rules: Array.isArray(pb.rules) ? pb.rules : [],
          createdAt: pb.createdAt || new Date().toISOString(),
        });
      }
    }

    // Upsert trades
    if (Array.isArray(payload.trades)) {
      for (const tr of payload.trades) {
        if (!tr.id) continue;
        await this.tradeRepo.upsert({
          id: tr.id,
          userId: effectiveUserId,
          accountId: tr.accountId,
          ticketNumber: tr.ticketNumber,
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
          mistakes: tr.mistakes || [],
          emotions: tr.emotions,
          executionRating: tr.executionRating != null ? Number(tr.executionRating) : 5,
          rulesRespected: tr.rulesRespected != null ? Boolean(tr.rulesRespected) : true,
          indicators: tr.indicators || [],
          supportLevels: tr.supportLevels || [],
          resistanceLevels: tr.resistanceLevels || [],
          chartPatterns: tr.chartPatterns || [],
          technicalNotes: tr.technicalNotes,
          chartUrl: tr.chartUrl,
          notes: tr.notes,
          keyTakeaway: tr.keyTakeaway,
          createdAt: tr.createdAt || new Date().toISOString(),
        });
      }
    }

    const currentTradesCount = await this.tradeRepo.count(effectiveUserId);
    const currentAccountsCount = await this.accountRepo.count(effectiveUserId);

    return {
      tradesCount: currentTradesCount,
      accountsCount: currentAccountsCount,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Save or update a single trading account
   */
  public async saveAccount(accountData: any, userId?: string): Promise<TradingAccountRecord> {
    const effectiveUserId = await this.resolveUserId(userId);
    const accountId = accountData.id || `acc_${Date.now().toString(36)}`;

    return this.accountRepo.upsert({
      id: accountId,
      userId: effectiveUserId,
      name: accountData.name || 'Nouveau Compte',
      brokerOrPropFirm: accountData.brokerOrPropFirm || accountData.broker,
      accountNumber: accountData.accountNumber,
      accountType: accountData.accountType || 'LIVE',
      currency: accountData.currency || '$',
      initialBalance: Number(accountData.initialBalance) || 10000,
      currentBalance: accountData.currentBalance != null ? Number(accountData.currentBalance) : undefined,
      description: accountData.description,
      isDefault: Boolean(accountData.isDefault),
      createdAt: accountData.createdAt || new Date().toISOString(),
    });
  }

  /**
   * Delete a trading account
   */
  public async deleteAccount(accountId: string, userId?: string): Promise<boolean> {
    return this.accountRepo.delete(accountId);
  }

  /**
   * Save or update a single trade
   */
  public async saveTrade(tradeData: any, userId?: string): Promise<TradeRecord> {
    const effectiveUserId = await this.resolveUserId(userId);
    const tradeId = tradeData.id || `tr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

    return this.tradeRepo.upsert({
      id: tradeId,
      userId: effectiveUserId,
      accountId: tradeData.accountId,
      ticketNumber: tradeData.ticketNumber,
      pair: tradeData.pair || 'EUR/USD',
      assetClass: tradeData.assetClass || 'FOREX',
      direction: tradeData.direction || 'LONG',
      status: tradeData.status || 'WIN',
      entryDate: tradeData.entryDate || new Date().toISOString().split('T')[0],
      entryTime: tradeData.entryTime,
      exitDate: tradeData.exitDate,
      exitTime: tradeData.exitTime,
      session: tradeData.session,
      timeframe: tradeData.timeframe,
      entryPrice: Number(tradeData.entryPrice) || 0,
      exitPrice: Number(tradeData.exitPrice) || 0,
      stopLoss: Number(tradeData.stopLoss) || 0,
      takeProfit: Number(tradeData.takeProfit) || 0,
      quantity: Number(tradeData.quantity) || 1,
      fees: Number(tradeData.fees) || 0,
      riskAmount: Number(tradeData.riskAmount) || 0,
      pnl: Number(tradeData.pnl) || 0,
      pnlPercentage: Number(tradeData.pnlPercentage) || 0,
      rMultiple: Number(tradeData.rMultiple) || 0,
      strategy: tradeData.strategy,
      playbookId: tradeData.playbookId,
      mistakes: Array.isArray(tradeData.mistakes) ? tradeData.mistakes : [],
      emotions: tradeData.emotions,
      executionRating: tradeData.executionRating != null ? Number(tradeData.executionRating) : 5,
      rulesRespected: tradeData.rulesRespected != null ? Boolean(tradeData.rulesRespected) : true,
      indicators: Array.isArray(tradeData.indicators) ? tradeData.indicators : [],
      supportLevels: Array.isArray(tradeData.supportLevels) ? tradeData.supportLevels.map(Number) : [],
      resistanceLevels: Array.isArray(tradeData.resistanceLevels) ? tradeData.resistanceLevels.map(Number) : [],
      chartPatterns: Array.isArray(tradeData.chartPatterns) ? tradeData.chartPatterns : [],
      technicalNotes: tradeData.technicalNotes,
      chartUrl: tradeData.chartUrl,
      notes: tradeData.notes,
      keyTakeaway: tradeData.keyTakeaway,
      createdAt: tradeData.createdAt || new Date().toISOString(),
    });
  }

  /**
   * Delete a trade
   */
  public async deleteTrade(tradeId: string, userId?: string): Promise<boolean> {
    return this.tradeRepo.delete(tradeId);
  }

  /**
   * Get MT5 Accounts
   */
  public async getMt5Accounts(userId?: string): Promise<Mt5AccountRecord[]> {
    const effectiveUserId = await this.resolveUserId(userId);
    return this.mt5Repo.getAccounts(effectiveUserId);
  }

  /**
   * Save or connect MT5 Account
   */
  public async saveMt5Account(data: any, userId?: string): Promise<Mt5AccountRecord> {
    const effectiveUserId = await this.resolveUserId(userId);
    const id = data.id || `mt5-acc-${Date.now()}`;
    const webhookSecret = data.webhookSecret || `mt5_sec_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;

    return this.mt5Repo.upsertAccount({
      id,
      userId: effectiveUserId,
      accountName: data.accountName || `${data.server} #${data.accountNumber}`,
      server: data.server,
      accountNumber: String(data.accountNumber),
      investorPassword: data.investorPassword ? '••••••••' : undefined,
      status: data.status || 'CONNECTED',
      webhookSecret,
      lastSyncAt: new Date().toISOString(),
    });
  }

  /**
   * Delete MT5 Account
   */
  public async deleteMt5Account(id: string): Promise<boolean> {
    return this.mt5Repo.deleteAccount(id);
  }
}

export const tradingService = new TradingService();

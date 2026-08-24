import { prisma } from '../../db/client';

export interface Mt5AccountRecord {
  id: string;
  userId: string;
  accountName: string;
  server: string;
  accountNumber: string;
  investorPassword?: string;
  status: string;
  webhookSecret?: string;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Mt5SyncLogRecord {
  id: string;
  userId: string;
  mt5AccountId?: string;
  ticket?: string;
  action: string;
  status: string;
  details?: string;
  timestamp: string;
}

export interface IMt5Repository {
  getAccounts(userId: string): Promise<Mt5AccountRecord[]>;
  getAccountById(id: string): Promise<Mt5AccountRecord | null>;
  upsertAccount(account: Omit<Mt5AccountRecord, 'createdAt' | 'updatedAt'> & { createdAt?: string }): Promise<Mt5AccountRecord>;
  deleteAccount(id: string): Promise<boolean>;
  logSync(log: Omit<Mt5SyncLogRecord, 'timestamp'>): Promise<Mt5SyncLogRecord>;
  getSyncLogs(userId: string, limit?: number): Promise<Mt5SyncLogRecord[]>;
  count(): Promise<number>;
}

function mapPrismaMt5Account(r: any): Mt5AccountRecord {
  return {
    id: r.id,
    userId: r.userId,
    accountName: r.accountName,
    server: r.server,
    accountNumber: r.accountNumber,
    investorPassword: r.investorPassword ?? undefined,
    status: r.status || 'CONNECTED',
    webhookSecret: r.webhookSecret ?? undefined,
    lastSyncAt: r.lastSyncAt instanceof Date ? r.lastSyncAt.toISOString() : (r.lastSyncAt ? String(r.lastSyncAt) : undefined),
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt || new Date().toISOString()),
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : undefined,
  };
}

function mapPrismaSyncLog(r: any): Mt5SyncLogRecord {
  return {
    id: r.id,
    userId: r.userId,
    mt5AccountId: r.mt5AccountId ?? undefined,
    ticket: r.ticket ?? undefined,
    action: r.action,
    status: r.status,
    details: r.details ?? undefined,
    timestamp: r.timestamp instanceof Date ? r.timestamp.toISOString() : String(r.timestamp || new Date().toISOString()),
  };
}

export class PrismaMt5Repository implements IMt5Repository {
  public async getAccounts(userId: string): Promise<Mt5AccountRecord[]> {
    if (!userId) return [];
    try {
      const accounts = await prisma.mt5Account.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      return accounts.map(mapPrismaMt5Account);
    } catch (err: any) {
      console.error('[PrismaMt5Repository.getAccounts Error]:', err.message);
      return [];
    }
  }

  public async getAccountById(id: string): Promise<Mt5AccountRecord | null> {
    if (!id || typeof id !== 'string') return null;
    try {
      const acc = await prisma.mt5Account.findUnique({
        where: { id },
      });
      return acc ? mapPrismaMt5Account(acc) : null;
    } catch (err: any) {
      console.error('[PrismaMt5Repository.getAccountById Error]:', err.message);
      return null;
    }
  }

  public async upsertAccount(
    account: Omit<Mt5AccountRecord, 'createdAt' | 'updatedAt'> & { createdAt?: string }
  ): Promise<Mt5AccountRecord> {
    const existing = await this.getAccountById(account.id);
    if (existing) {
      const updated = await prisma.mt5Account.update({
        where: { id: account.id },
        data: {
          accountName: account.accountName,
          server: account.server,
          accountNumber: account.accountNumber,
          investorPassword: account.investorPassword || null,
          status: account.status || 'CONNECTED',
          webhookSecret: account.webhookSecret || null,
          lastSyncAt: account.lastSyncAt ? new Date(account.lastSyncAt) : new Date(),
        },
      });
      return mapPrismaMt5Account(updated);
    } else {
      const created = await prisma.mt5Account.create({
        data: {
          id: account.id,
          userId: account.userId,
          accountName: account.accountName,
          server: account.server,
          accountNumber: account.accountNumber,
          investorPassword: account.investorPassword || null,
          status: account.status || 'CONNECTED',
          webhookSecret: account.webhookSecret || null,
          lastSyncAt: account.lastSyncAt ? new Date(account.lastSyncAt) : null,
          createdAt: account.createdAt ? new Date(account.createdAt) : new Date(),
        },
      });
      return mapPrismaMt5Account(created);
    }
  }

  public async deleteAccount(id: string): Promise<boolean> {
    try {
      await prisma.mt5Account.delete({
        where: { id },
      });
      return true;
    } catch (err: any) {
      console.error('[PrismaMt5Repository.deleteAccount Error]:', err.message);
      return false;
    }
  }

  public async logSync(log: Omit<Mt5SyncLogRecord, 'timestamp'>): Promise<Mt5SyncLogRecord> {
    const id = log.id || `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const created = await prisma.mt5SyncLog.create({
      data: {
        id,
        userId: log.userId,
        mt5AccountId: log.mt5AccountId || null,
        ticket: log.ticket || null,
        action: log.action,
        status: log.status,
        details: log.details || null,
      },
    });

    return mapPrismaSyncLog(created);
  }

  public async getSyncLogs(userId: string, limit: number = 50): Promise<Mt5SyncLogRecord[]> {
    if (!userId) return [];
    try {
      const logs = await prisma.mt5SyncLog.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: limit,
      });
      return logs.map(mapPrismaSyncLog);
    } catch (err: any) {
      console.error('[PrismaMt5Repository.getSyncLogs Error]:', err.message);
      return [];
    }
  }

  public async count(): Promise<number> {
    try {
      return await prisma.mt5Account.count();
    } catch (err: any) {
      console.error('[PrismaMt5Repository.count Error]:', err.message);
      return 0;
    }
  }
}

export const mt5Repository: IMt5Repository = new PrismaMt5Repository();


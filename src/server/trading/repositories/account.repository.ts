import { prisma } from '../../db/client';

export interface TradingAccountRecord {
  id: string;
  userId: string;
  name: string;
  brokerOrPropFirm?: string;
  accountNumber?: string;
  accountType: string;
  currency: string;
  initialBalance: number;
  currentBalance?: number;
  description?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ITradingAccountRepository {
  findById(id: string): Promise<TradingAccountRecord | null>;
  findByUserId(userId: string): Promise<TradingAccountRecord[]>;
  create(data: Omit<TradingAccountRecord, 'createdAt' | 'updatedAt'>): Promise<TradingAccountRecord>;
  update(id: string, partial: Partial<TradingAccountRecord>): Promise<TradingAccountRecord | null>;
  delete(id: string): Promise<boolean>;
  upsert(account: TradingAccountRecord): Promise<TradingAccountRecord>;
  count(userId?: string): Promise<number>;
}

function mapPrismaAccount(r: any): TradingAccountRecord {
  return {
    id: r.id,
    userId: r.userId,
    name: r.name,
    brokerOrPropFirm: r.brokerOrPropFirm ?? undefined,
    accountNumber: r.accountNumber ?? undefined,
    accountType: r.accountType || 'LIVE',
    currency: r.currency || '$',
    initialBalance: Number(r.initialBalance || 10000),
    currentBalance: r.currentBalance != null ? Number(r.currentBalance) : undefined,
    description: r.description ?? undefined,
    isDefault: Boolean(r.isDefault),
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt || new Date().toISOString()),
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : undefined,
  };
}

export class PrismaTradingAccountRepository implements ITradingAccountRepository {
  public async findById(id: string): Promise<TradingAccountRecord | null> {
    if (!id || typeof id !== 'string') return null;
    try {
      const acc = await prisma.tradingAccount.findUnique({
        where: { id },
      });
      return acc ? mapPrismaAccount(acc) : null;
    } catch (err: any) {
      console.error('[PrismaTradingAccountRepository.findById Error]:', err.message);
      return null;
    }
  }

  public async findByUserId(userId: string): Promise<TradingAccountRecord[]> {
    if (!userId) return [];
    try {
      const accs = await prisma.tradingAccount.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });
      return accs.map(mapPrismaAccount);
    } catch (err: any) {
      console.error('[PrismaTradingAccountRepository.findByUserId Error]:', err.message);
      return [];
    }
  }

  public async create(data: Omit<TradingAccountRecord, 'createdAt' | 'updatedAt'>): Promise<TradingAccountRecord> {
    const id = data.id || `acc_${Date.now().toString(36)}`;
    const acc = await prisma.tradingAccount.create({
      data: {
        id,
        userId: data.userId,
        name: data.name,
        brokerOrPropFirm: data.brokerOrPropFirm || null,
        accountNumber: data.accountNumber || null,
        accountType: data.accountType || 'LIVE',
        currency: data.currency || '$',
        initialBalance: Number(data.initialBalance) || 10000,
        currentBalance: data.currentBalance != null ? Number(data.currentBalance) : null,
        description: data.description || null,
        isDefault: Boolean(data.isDefault),
      },
    });

    return mapPrismaAccount(acc);
  }

  public async update(id: string, partial: Partial<TradingAccountRecord>): Promise<TradingAccountRecord | null> {
    try {
      const data: any = {};
      if (partial.name !== undefined) data.name = partial.name;
      if (partial.brokerOrPropFirm !== undefined) data.brokerOrPropFirm = partial.brokerOrPropFirm || null;
      if (partial.accountNumber !== undefined) data.accountNumber = partial.accountNumber || null;
      if (partial.accountType !== undefined) data.accountType = partial.accountType;
      if (partial.currency !== undefined) data.currency = partial.currency;
      if (partial.initialBalance !== undefined) data.initialBalance = Number(partial.initialBalance);
      if (partial.currentBalance !== undefined) data.currentBalance = partial.currentBalance != null ? Number(partial.currentBalance) : null;
      if (partial.description !== undefined) data.description = partial.description || null;
      if (partial.isDefault !== undefined) data.isDefault = Boolean(partial.isDefault);

      const acc = await prisma.tradingAccount.update({
        where: { id },
        data,
      });

      return mapPrismaAccount(acc);
    } catch (err: any) {
      console.error('[PrismaTradingAccountRepository.update Error]:', err.message);
      return null;
    }
  }

  public async delete(id: string): Promise<boolean> {
    try {
      await prisma.tradingAccount.delete({
        where: { id },
      });
      return true;
    } catch (err: any) {
      console.error('[PrismaTradingAccountRepository.delete Error]:', err.message);
      return false;
    }
  }

  public async upsert(account: TradingAccountRecord): Promise<TradingAccountRecord> {
    const existing = await this.findById(account.id);
    if (existing) {
      const updated = await this.update(account.id, account);
      return updated || existing;
    }
    return this.create(account);
  }

  public async count(userId?: string): Promise<number> {
    try {
      return await prisma.tradingAccount.count({
        where: userId ? { userId } : undefined,
      });
    } catch (err: any) {
      return 0;
    }
  }
}

export const tradingAccountRepository: ITradingAccountRepository = new PrismaTradingAccountRepository();


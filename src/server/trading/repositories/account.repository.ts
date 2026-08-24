import { getDb } from '../../db/postgres';

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

function mapRowToAccount(r: any): TradingAccountRecord {
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    brokerOrPropFirm: r.broker_or_prop_firm ?? undefined,
    accountNumber: r.account_number ?? undefined,
    accountType: r.account_type || 'LIVE',
    currency: r.currency || '$',
    initialBalance: Number(r.initial_balance || 10000),
    currentBalance: r.current_balance != null ? Number(r.current_balance) : undefined,
    description: r.description ?? undefined,
    isDefault: Boolean(r.is_default),
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at || new Date().toISOString()),
    updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : undefined,
  };
}

export class PostgresTradingAccountRepository implements ITradingAccountRepository {
  public async findById(id: string): Promise<TradingAccountRecord | null> {
    try {
      const db = await getDb();
      const res = await db.query('SELECT * FROM trading_accounts WHERE id = $1 LIMIT 1', [id]);
      return res.rows.length > 0 ? mapRowToAccount(res.rows[0]) : null;
    } catch (err: any) {
      console.error('[PostgresTradingAccountRepository.findById Error]:', err.message);
      return null;
    }
  }

  public async findByUserId(userId: string): Promise<TradingAccountRecord[]> {
    try {
      const db = await getDb();
      const res = await db.query('SELECT * FROM trading_accounts WHERE user_id = $1 ORDER BY created_at ASC', [userId]);
      return res.rows.map(mapRowToAccount);
    } catch (err: any) {
      console.error('[PostgresTradingAccountRepository.findByUserId Error]:', err.message);
      return [];
    }
  }

  public async create(data: Omit<TradingAccountRecord, 'createdAt' | 'updatedAt'>): Promise<TradingAccountRecord> {
    const db = await getDb();
    const id = data.id || `acc_${Date.now().toString(36)}`;
    const now = new Date();

    const sql = `
      INSERT INTO trading_accounts (id, user_id, name, broker_or_prop_firm, account_number, account_type, currency, initial_balance, current_balance, description, is_default, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const res = await db.query(sql, [
      id,
      data.userId,
      data.name,
      data.brokerOrPropFirm || null,
      data.accountNumber || null,
      data.accountType || 'LIVE',
      data.currency || '$',
      Number(data.initialBalance) || 10000,
      data.currentBalance != null ? Number(data.currentBalance) : null,
      data.description || null,
      Boolean(data.isDefault),
      now,
      now,
    ]);

    return mapRowToAccount(res.rows[0]);
  }

  public async update(id: string, partial: Partial<TradingAccountRecord>): Promise<TradingAccountRecord | null> {
    const current = await this.findById(id);
    if (!current) return null;

    const db = await getDb();
    const name = partial.name !== undefined ? partial.name : current.name;
    const broker = partial.brokerOrPropFirm !== undefined ? partial.brokerOrPropFirm : current.brokerOrPropFirm;
    const accNum = partial.accountNumber !== undefined ? partial.accountNumber : current.accountNumber;
    const accType = partial.accountType !== undefined ? partial.accountType : current.accountType;
    const curr = partial.currency !== undefined ? partial.currency : current.currency;
    const initBal = partial.initialBalance !== undefined ? Number(partial.initialBalance) : current.initialBalance;
    const curBal = partial.currentBalance !== undefined ? Number(partial.currentBalance) : current.currentBalance;
    const desc = partial.description !== undefined ? partial.description : current.description;
    const isDef = partial.isDefault !== undefined ? Boolean(partial.isDefault) : current.isDefault;
    const now = new Date();

    const sql = `
      UPDATE trading_accounts
      SET name = $1, broker_or_prop_firm = $2, account_number = $3, account_type = $4, currency = $5, initial_balance = $6, current_balance = $7, description = $8, is_default = $9, updated_at = $10
      WHERE id = $11
      RETURNING *
    `;

    const res = await db.query(sql, [
      name,
      broker || null,
      accNum || null,
      accType,
      curr,
      initBal,
      curBal != null ? curBal : null,
      desc || null,
      isDef,
      now,
      id,
    ]);

    return res.rows.length > 0 ? mapRowToAccount(res.rows[0]) : null;
  }

  public async delete(id: string): Promise<boolean> {
    try {
      const db = await getDb();
      const res = await db.query('DELETE FROM trading_accounts WHERE id = $1', [id]);
      return res.rowCount > 0;
    } catch (err: any) {
      console.error('[PostgresTradingAccountRepository.delete Error]:', err.message);
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
      const db = await getDb();
      const res = userId
        ? await db.query('SELECT COUNT(*)::int as total FROM trading_accounts WHERE user_id = $1', [userId])
        : await db.query('SELECT COUNT(*)::int as total FROM trading_accounts');
      return res.rows.length > 0 ? Number(res.rows[0].total) : 0;
    } catch (err: any) {
      return 0;
    }
  }
}

export const tradingAccountRepository: ITradingAccountRepository = new PostgresTradingAccountRepository();

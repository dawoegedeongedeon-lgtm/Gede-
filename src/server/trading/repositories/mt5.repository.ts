import { getDb } from '../../db/postgres';

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
}

function mapRowToMt5Account(r: any): Mt5AccountRecord {
  return {
    id: r.id,
    userId: r.user_id,
    accountName: r.account_name,
    server: r.server,
    accountNumber: r.account_number,
    investorPassword: r.investor_password ?? undefined,
    status: r.status || 'CONNECTED',
    webhookSecret: r.webhook_secret ?? undefined,
    lastSyncAt: r.last_sync_at instanceof Date ? r.last_sync_at.toISOString() : (r.last_sync_at ? String(r.last_sync_at) : undefined),
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at || new Date().toISOString()),
    updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : undefined,
  };
}

function mapRowToSyncLog(r: any): Mt5SyncLogRecord {
  return {
    id: r.id,
    userId: r.user_id,
    mt5AccountId: r.mt5_account_id ?? undefined,
    ticket: r.ticket ?? undefined,
    action: r.action,
    status: r.status,
    details: r.details ?? undefined,
    timestamp: r.timestamp instanceof Date ? r.timestamp.toISOString() : String(r.timestamp || new Date().toISOString()),
  };
}

export class PostgresMt5Repository implements IMt5Repository {
  public async getAccounts(userId: string): Promise<Mt5AccountRecord[]> {
    try {
      const db = await getDb();
      const res = await db.query('SELECT * FROM mt5_accounts WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
      return res.rows.map(mapRowToMt5Account);
    } catch (err: any) {
      console.error('[PostgresMt5Repository.getAccounts Error]:', err.message);
      return [];
    }
  }

  public async getAccountById(id: string): Promise<Mt5AccountRecord | null> {
    try {
      const db = await getDb();
      const res = await db.query('SELECT * FROM mt5_accounts WHERE id = $1 LIMIT 1', [id]);
      return res.rows.length > 0 ? mapRowToMt5Account(res.rows[0]) : null;
    } catch (err: any) {
      console.error('[PostgresMt5Repository.getAccountById Error]:', err.message);
      return null;
    }
  }

  public async upsertAccount(
    account: Omit<Mt5AccountRecord, 'createdAt' | 'updatedAt'> & { createdAt?: string }
  ): Promise<Mt5AccountRecord> {
    const db = await getDb();
    const existing = await this.getAccountById(account.id);
    const now = new Date();

    if (existing) {
      const sql = `
        UPDATE mt5_accounts
        SET account_name = $1, server = $2, account_number = $3, investor_password = $4, status = $5, webhook_secret = $6, last_sync_at = $7, updated_at = $8
        WHERE id = $9
        RETURNING *
      `;
      const res = await db.query(sql, [
        account.accountName,
        account.server,
        account.accountNumber,
        account.investorPassword || null,
        account.status || 'CONNECTED',
        account.webhookSecret || null,
        account.lastSyncAt ? new Date(account.lastSyncAt) : now,
        now,
        account.id,
      ]);
      return mapRowToMt5Account(res.rows[0]);
    } else {
      const sql = `
        INSERT INTO mt5_accounts (id, user_id, account_name, server, account_number, investor_password, status, webhook_secret, last_sync_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      const res = await db.query(sql, [
        account.id,
        account.userId,
        account.accountName,
        account.server,
        account.accountNumber,
        account.investorPassword || null,
        account.status || 'CONNECTED',
        account.webhookSecret || null,
        account.lastSyncAt ? new Date(account.lastSyncAt) : now,
        account.createdAt ? new Date(account.createdAt) : now,
        now,
      ]);
      return mapRowToMt5Account(res.rows[0]);
    }
  }

  public async deleteAccount(id: string): Promise<boolean> {
    try {
      const db = await getDb();
      const res = await db.query('DELETE FROM mt5_accounts WHERE id = $1', [id]);
      return res.rowCount > 0;
    } catch (err: any) {
      console.error('[PostgresMt5Repository.deleteAccount Error]:', err.message);
      return false;
    }
  }

  public async logSync(log: Omit<Mt5SyncLogRecord, 'timestamp'>): Promise<Mt5SyncLogRecord> {
    const db = await getDb();
    const now = new Date();
    const id = log.id || `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const sql = `
      INSERT INTO mt5_sync_logs (id, user_id, mt5_account_id, ticket, action, status, details, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const res = await db.query(sql, [
      id,
      log.userId,
      log.mt5AccountId || null,
      log.ticket || null,
      log.action,
      log.status,
      log.details || null,
      now,
    ]);

    return mapRowToSyncLog(res.rows[0]);
  }

  public async getSyncLogs(userId: string, limit: number = 50): Promise<Mt5SyncLogRecord[]> {
    try {
      const db = await getDb();
      const res = await db.query(
        'SELECT * FROM mt5_sync_logs WHERE user_id = $1 ORDER BY timestamp DESC LIMIT $2',
        [userId, limit]
      );
      return res.rows.map(mapRowToSyncLog);
    } catch (err: any) {
      console.error('[PostgresMt5Repository.getSyncLogs Error]:', err.message);
      return [];
    }
  }
}

export const mt5Repository: IMt5Repository = new PostgresMt5Repository();

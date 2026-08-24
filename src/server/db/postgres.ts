import path from 'path';
import fs from 'fs';
import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface IDatabaseClient {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

class PostgresDatabaseManager {
  private static instance: PostgresDatabaseManager;
  private client: IDatabaseClient | null = null;
  private initialized: boolean = false;
  private isEmbedded: boolean = false;

  private constructor() {}

  public static getInstance(): PostgresDatabaseManager {
    if (!PostgresDatabaseManager.instance) {
      PostgresDatabaseManager.instance = new PostgresDatabaseManager();
    }
    return PostgresDatabaseManager.instance;
  }

  public async getClient(): Promise<IDatabaseClient> {
    if (this.client && this.initialized) {
      return this.client;
    }

    const dbUrl = process.env.DATABASE_URL;

    // Try remote PostgreSQL connection first if DATABASE_URL is configured
    if (dbUrl && !dbUrl.includes('localhost:5432')) {
      try {
        const pool = new Pool({
          connectionString: dbUrl,
          connectionTimeoutMillis: 3000,
          max: 10,
        });
        // Test connection
        await pool.query('SELECT 1');
        console.log('[PostgreSQL] Connected successfully to remote database.');
        
        this.client = {
          query: async <T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> => {
            const res = await pool.query(sql, params);
            return { rows: res.rows, rowCount: res.rowCount || 0 };
          },
          exec: async (sql: string): Promise<void> => {
            await pool.query(sql);
          },
          close: async (): Promise<void> => {
            await pool.end();
          },
        };
        this.isEmbedded = false;
        await this.ensureSchema();
        this.initialized = true;
        return this.client;
      } catch (err: any) {
        console.warn('[PostgreSQL] Remote connection failed, falling back to embedded persistent PostgreSQL engine:', err.message);
      }
    }

    // Persistent embedded PostgreSQL instance backed by local filesystem storage
    const dataDir = path.join(process.cwd(), 'data', 'postgres');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const pglite = new PGlite(dataDir);
    await pglite.waitReady;
    console.log('[PostgreSQL] Embedded persistent PostgreSQL engine initialized at:', dataDir);

    this.client = {
      query: async <T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> => {
        const res = await pglite.query(sql, params);
        return { rows: res.rows as T[], rowCount: res.rows.length };
      },
      exec: async (sql: string): Promise<void> => {
        await pglite.exec(sql);
      },
      close: async (): Promise<void> => {
        await pglite.close();
      },
    };

    this.isEmbedded = true;
    await this.ensureSchema();
    this.initialized = true;
    return this.client;
  }

  /**
   * Idempotently create PostgreSQL relational tables and indexes
   */
  private async ensureSchema(): Promise<void> {
    if (!this.client) return;

    const ddl = `
      -- Users Table
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        password_hash TEXT,
        avatar_url TEXT,
        role VARCHAR(100) DEFAULT 'Trader Indépendant',
        plan VARCHAR(100) DEFAULT 'Pro Desk & MT5 Live',
        email_verified BOOLEAN DEFAULT FALSE,
        last_login_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

      -- Sessions Table
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(128),
        ip VARCHAR(64),
        user_agent TEXT,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

      -- Trading Accounts Table
      CREATE TABLE IF NOT EXISTS trading_accounts (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        broker_or_prop_firm VARCHAR(255),
        account_number VARCHAR(100),
        account_type VARCHAR(50) DEFAULT 'LIVE',
        currency VARCHAR(10) DEFAULT '$',
        initial_balance NUMERIC(15, 2) DEFAULT 10000,
        current_balance NUMERIC(15, 2),
        description TEXT,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_trading_accounts_user_id ON trading_accounts(user_id);

      -- Playbooks / Strategies Table
      CREATE TABLE IF NOT EXISTS playbooks (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        asset_class JSONB DEFAULT '[]'::jsonb,
        preferred_timeframe VARCHAR(50),
        preferred_session VARCHAR(50),
        rules JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_playbooks_user_id ON playbooks(user_id);

      -- Trades Table
      CREATE TABLE IF NOT EXISTS trades (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        account_id VARCHAR(64) REFERENCES trading_accounts(id) ON DELETE SET NULL,
        ticket_number VARCHAR(100),
        pair VARCHAR(50) NOT NULL,
        asset_class VARCHAR(50) DEFAULT 'FOREX',
        direction VARCHAR(20) DEFAULT 'LONG',
        status VARCHAR(20) DEFAULT 'WIN',
        entry_date VARCHAR(20) NOT NULL,
        entry_time VARCHAR(20),
        exit_date VARCHAR(20),
        exit_time VARCHAR(20),
        session VARCHAR(50),
        timeframe VARCHAR(20),
        entry_price NUMERIC(18, 6) NOT NULL DEFAULT 0,
        exit_price NUMERIC(18, 6) NOT NULL DEFAULT 0,
        stop_loss NUMERIC(18, 6) NOT NULL DEFAULT 0,
        take_profit NUMERIC(18, 6) NOT NULL DEFAULT 0,
        quantity NUMERIC(12, 4) DEFAULT 1,
        fees NUMERIC(12, 2) DEFAULT 0,
        risk_amount NUMERIC(15, 2) DEFAULT 0,
        pnl NUMERIC(15, 2) DEFAULT 0,
        pnl_percentage NUMERIC(8, 2) DEFAULT 0,
        r_multiple NUMERIC(8, 2) DEFAULT 0,
        strategy VARCHAR(255),
        playbook_id VARCHAR(64) REFERENCES playbooks(id) ON DELETE SET NULL,
        mistakes JSONB DEFAULT '[]'::jsonb,
        emotions VARCHAR(100),
        execution_rating INTEGER DEFAULT 5,
        rules_respected BOOLEAN DEFAULT TRUE,
        indicators JSONB DEFAULT '[]'::jsonb,
        support_levels JSONB DEFAULT '[]'::jsonb,
        resistance_levels JSONB DEFAULT '[]'::jsonb,
        chart_patterns JSONB DEFAULT '[]'::jsonb,
        technical_notes TEXT,
        chart_url TEXT,
        notes TEXT,
        key_takeaway TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
      CREATE INDEX IF NOT EXISTS idx_trades_account_id ON trades(account_id);
      CREATE INDEX IF NOT EXISTS idx_trades_pair ON trades(pair);
      CREATE INDEX IF NOT EXISTS idx_trades_entry_date ON trades(entry_date);

      -- MT5 Connected Accounts
      CREATE TABLE IF NOT EXISTS mt5_accounts (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        account_name VARCHAR(255) NOT NULL,
        server VARCHAR(255) NOT NULL,
        account_number VARCHAR(100) NOT NULL,
        investor_password TEXT,
        status VARCHAR(50) DEFAULT 'CONNECTED',
        webhook_secret VARCHAR(128),
        last_sync_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_mt5_accounts_user_id ON mt5_accounts(user_id);

      -- MT5 Sync Logs
      CREATE TABLE IF NOT EXISTS mt5_sync_logs (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        mt5_account_id VARCHAR(64) REFERENCES mt5_accounts(id) ON DELETE SET NULL,
        ticket VARCHAR(100),
        action VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL,
        details TEXT,
        timestamp TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_mt5_logs_user_id ON mt5_sync_logs(user_id);
    `;

    await this.client.exec(ddl);
    console.log('[PostgreSQL] Database schema & indexes verified.');
  }

  public getIsEmbedded(): boolean {
    return this.isEmbedded;
  }
}

export const dbManager = PostgresDatabaseManager.getInstance();

export async function getDb(): Promise<IDatabaseClient> {
  return dbManager.getClient();
}

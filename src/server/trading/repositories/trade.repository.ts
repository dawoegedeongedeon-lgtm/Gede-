import { getDb } from '../../db/postgres';

export interface TradeRecord {
  id: string;
  userId: string;
  accountId?: string;
  account?: string;
  ticketNumber?: string;
  pair: string;
  assetClass: string;
  direction: string;
  status: string;
  entryDate: string;
  entryTime?: string;
  exitDate?: string;
  exitTime?: string;
  session?: string;
  timeframe?: string;
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  takeProfit: number;
  quantity: number;
  fees: number;
  riskAmount: number;
  pnl: number;
  pnlPercentage: number;
  rMultiple: number;
  strategy?: string;
  playbookId?: string;
  mistakes?: string[];
  emotions?: string;
  executionRating?: number;
  rulesRespected?: boolean;
  indicators?: string[];
  supportLevels?: number[];
  resistanceLevels?: number[];
  chartPatterns?: string[];
  technicalNotes?: string;
  chartUrl?: string;
  notes?: string;
  keyTakeaway?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ITradeRepository {
  findById(id: string): Promise<TradeRecord | null>;
  findByUserId(userId: string, options?: { limit?: number; offset?: number; accountId?: string; symbol?: string }): Promise<TradeRecord[]>;
  listAll(options?: { limit?: number; offset?: number }): Promise<TradeRecord[]>;
  create(data: Omit<TradeRecord, 'createdAt' | 'updatedAt'>): Promise<TradeRecord>;
  update(id: string, partial: Partial<TradeRecord>): Promise<TradeRecord | null>;
  delete(id: string): Promise<boolean>;
  upsert(trade: TradeRecord): Promise<TradeRecord>;
  count(userId?: string): Promise<number>;
  deleteByUserId(userId: string): Promise<number>;
}

function parseJsonArray<T = any>(val: any): T[] {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const p = JSON.parse(val);
      return Array.isArray(p) ? p : [];
    } catch {}
  }
  return [];
}

function mapRowToTrade(r: any): TradeRecord {
  return {
    id: r.id,
    userId: r.user_id,
    accountId: r.account_id ?? undefined,
    account: r.account_name ?? undefined,
    ticketNumber: r.ticket_number ?? undefined,
    pair: r.pair,
    assetClass: r.asset_class || 'FOREX',
    direction: r.direction || 'LONG',
    status: r.status || 'WIN',
    entryDate: r.entry_date,
    entryTime: r.entry_time ?? undefined,
    exitDate: r.exit_date ?? undefined,
    exitTime: r.exit_time ?? undefined,
    session: r.session ?? undefined,
    timeframe: r.timeframe ?? undefined,
    entryPrice: Number(r.entry_price || 0),
    exitPrice: Number(r.exit_price || 0),
    stopLoss: Number(r.stop_loss || 0),
    takeProfit: Number(r.take_profit || 0),
    quantity: Number(r.quantity || 1),
    fees: Number(r.fees || 0),
    riskAmount: Number(r.risk_amount || 0),
    pnl: Number(r.pnl || 0),
    pnlPercentage: Number(r.pnl_percentage || 0),
    rMultiple: Number(r.r_multiple || 0),
    strategy: r.strategy ?? undefined,
    playbookId: r.playbook_id ?? undefined,
    mistakes: parseJsonArray<string>(r.mistakes),
    emotions: r.emotions ?? undefined,
    executionRating: r.execution_rating != null ? Number(r.execution_rating) : 5,
    rulesRespected: r.rules_respected != null ? Boolean(r.rules_respected) : true,
    indicators: parseJsonArray<string>(r.indicators),
    supportLevels: parseJsonArray<number>(r.support_levels).map(Number),
    resistanceLevels: parseJsonArray<number>(r.resistance_levels).map(Number),
    chartPatterns: parseJsonArray<string>(r.chart_patterns),
    technicalNotes: r.technical_notes ?? undefined,
    chartUrl: r.chart_url ?? undefined,
    notes: r.notes ?? undefined,
    keyTakeaway: r.key_takeaway ?? undefined,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at || new Date().toISOString()),
    updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : undefined,
  };
}

export class PostgresTradeRepository implements ITradeRepository {
  public async findById(id: string): Promise<TradeRecord | null> {
    try {
      const db = await getDb();
      const sql = `
        SELECT t.*, a.name as account_name
        FROM trades t
        LEFT JOIN trading_accounts a ON t.account_id = a.id
        WHERE t.id = $1
        LIMIT 1
      `;
      const res = await db.query(sql, [id]);
      return res.rows.length > 0 ? mapRowToTrade(res.rows[0]) : null;
    } catch (err: any) {
      console.error('[PostgresTradeRepository.findById Error]:', err.message);
      return null;
    }
  }

  public async findByUserId(
    userId: string,
    options?: { limit?: number; offset?: number; accountId?: string; symbol?: string }
  ): Promise<TradeRecord[]> {
    try {
      const db = await getDb();
      let sql = `
        SELECT t.*, a.name as account_name
        FROM trades t
        LEFT JOIN trading_accounts a ON t.account_id = a.id
        WHERE t.user_id = $1
      `;
      const params: any[] = [userId];

      if (options?.accountId) {
        params.push(options.accountId);
        sql += ` AND t.account_id = $${params.length}`;
      }

      if (options?.symbol) {
        params.push(`%${options.symbol}%`);
        sql += ` AND t.pair ILIKE $${params.length}`;
      }

      sql += ` ORDER BY t.entry_date DESC, t.created_at DESC`;

      if (options?.limit) {
        params.push(options.limit);
        sql += ` LIMIT $${params.length}`;
      }

      if (options?.offset) {
        params.push(options.offset);
        sql += ` OFFSET $${params.length}`;
      }

      const res = await db.query(sql, params);
      return res.rows.map(mapRowToTrade);
    } catch (err: any) {
      console.error('[PostgresTradeRepository.findByUserId Error]:', err.message);
      return [];
    }
  }

  public async listAll(options?: { limit?: number; offset?: number }): Promise<TradeRecord[]> {
    try {
      const db = await getDb();
      let sql = `
        SELECT t.*, a.name as account_name
        FROM trades t
        LEFT JOIN trading_accounts a ON t.account_id = a.id
        ORDER BY t.entry_date DESC, t.created_at DESC
      `;
      const params: any[] = [];
      if (options?.limit) {
        params.push(options.limit);
        sql += ` LIMIT $${params.length}`;
      }
      if (options?.offset) {
        params.push(options.offset);
        sql += ` OFFSET $${params.length}`;
      }
      const res = await db.query(sql, params);
      return res.rows.map(mapRowToTrade);
    } catch (err: any) {
      console.error('[PostgresTradeRepository.listAll Error]:', err.message);
      return [];
    }
  }

  public async create(data: Omit<TradeRecord, 'createdAt' | 'updatedAt'>): Promise<TradeRecord> {
    const db = await getDb();
    const id = data.id || `tr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();

    const sql = `
      INSERT INTO trades (
        id, user_id, account_id, ticket_number, pair, asset_class, direction, status,
        entry_date, entry_time, exit_date, exit_time, session, timeframe,
        entry_price, exit_price, stop_loss, take_profit, quantity, fees, risk_amount,
        pnl, pnl_percentage, r_multiple, strategy, playbook_id, mistakes, emotions,
        execution_rating, rules_respected, indicators, support_levels, resistance_levels,
        chart_patterns, technical_notes, chart_url, notes, key_takeaway, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21,
        $22, $23, $24, $25, $26, $27, $28,
        $29, $30, $31, $32, $33,
        $34, $35, $36, $37, $38, $39, $40
      ) RETURNING *
    `;

    const res = await db.query(sql, [
      id,
      data.userId,
      data.accountId || null,
      data.ticketNumber || null,
      data.pair,
      data.assetClass || 'FOREX',
      data.direction || 'LONG',
      data.status || 'WIN',
      data.entryDate,
      data.entryTime || null,
      data.exitDate || null,
      data.exitTime || null,
      data.session || null,
      data.timeframe || null,
      Number(data.entryPrice) || 0,
      Number(data.exitPrice) || 0,
      Number(data.stopLoss) || 0,
      Number(data.takeProfit) || 0,
      Number(data.quantity) || 1,
      Number(data.fees) || 0,
      Number(data.riskAmount) || 0,
      Number(data.pnl) || 0,
      Number(data.pnlPercentage) || 0,
      Number(data.rMultiple) || 0,
      data.strategy || null,
      data.playbookId || null,
      JSON.stringify(data.mistakes || []),
      data.emotions || null,
      data.executionRating != null ? Number(data.executionRating) : 5,
      data.rulesRespected != null ? Boolean(data.rulesRespected) : true,
      JSON.stringify(data.indicators || []),
      JSON.stringify(data.supportLevels || []),
      JSON.stringify(data.resistanceLevels || []),
      JSON.stringify(data.chartPatterns || []),
      data.technicalNotes || null,
      data.chartUrl || null,
      data.notes || null,
      data.keyTakeaway || null,
      now,
      now,
    ]);

    return mapRowToTrade(res.rows[0]);
  }

  public async update(id: string, partial: Partial<TradeRecord>): Promise<TradeRecord | null> {
    const current = await this.findById(id);
    if (!current) return null;

    const db = await getDb();
    const now = new Date();

    const sql = `
      UPDATE trades
      SET account_id = $1, ticket_number = $2, pair = $3, asset_class = $4, direction = $5,
          status = $6, entry_date = $7, entry_time = $8, exit_date = $9, exit_time = $10,
          session = $11, timeframe = $12, entry_price = $13, exit_price = $14, stop_loss = $15,
          take_profit = $16, quantity = $17, fees = $18, risk_amount = $19, pnl = $20,
          pnl_percentage = $21, r_multiple = $22, strategy = $23, playbook_id = $24,
          mistakes = $25, emotions = $26, execution_rating = $27, rules_respected = $28,
          indicators = $29, support_levels = $30, resistance_levels = $31, chart_patterns = $32,
          technical_notes = $33, chart_url = $34, notes = $35, key_takeaway = $36, updated_at = $37
      WHERE id = $38
      RETURNING *
    `;

    const res = await db.query(sql, [
      partial.accountId !== undefined ? (partial.accountId || null) : (current.accountId || null),
      partial.ticketNumber !== undefined ? (partial.ticketNumber || null) : (current.ticketNumber || null),
      partial.pair !== undefined ? partial.pair : current.pair,
      partial.assetClass !== undefined ? partial.assetClass : current.assetClass,
      partial.direction !== undefined ? partial.direction : current.direction,
      partial.status !== undefined ? partial.status : current.status,
      partial.entryDate !== undefined ? partial.entryDate : current.entryDate,
      partial.entryTime !== undefined ? (partial.entryTime || null) : (current.entryTime || null),
      partial.exitDate !== undefined ? (partial.exitDate || null) : (current.exitDate || null),
      partial.exitTime !== undefined ? (partial.exitTime || null) : (current.exitTime || null),
      partial.session !== undefined ? (partial.session || null) : (current.session || null),
      partial.timeframe !== undefined ? (partial.timeframe || null) : (current.timeframe || null),
      partial.entryPrice !== undefined ? Number(partial.entryPrice) : current.entryPrice,
      partial.exitPrice !== undefined ? Number(partial.exitPrice) : current.exitPrice,
      partial.stopLoss !== undefined ? Number(partial.stopLoss) : current.stopLoss,
      partial.takeProfit !== undefined ? Number(partial.takeProfit) : current.takeProfit,
      partial.quantity !== undefined ? Number(partial.quantity) : current.quantity,
      partial.fees !== undefined ? Number(partial.fees) : current.fees,
      partial.riskAmount !== undefined ? Number(partial.riskAmount) : current.riskAmount,
      partial.pnl !== undefined ? Number(partial.pnl) : current.pnl,
      partial.pnlPercentage !== undefined ? Number(partial.pnlPercentage) : current.pnlPercentage,
      partial.rMultiple !== undefined ? Number(partial.rMultiple) : current.rMultiple,
      partial.strategy !== undefined ? (partial.strategy || null) : (current.strategy || null),
      partial.playbookId !== undefined ? (partial.playbookId || null) : (current.playbookId || null),
      JSON.stringify(partial.mistakes !== undefined ? partial.mistakes : current.mistakes || []),
      partial.emotions !== undefined ? (partial.emotions || null) : (current.emotions || null),
      partial.executionRating !== undefined ? Number(partial.executionRating) : current.executionRating,
      partial.rulesRespected !== undefined ? Boolean(partial.rulesRespected) : current.rulesRespected,
      JSON.stringify(partial.indicators !== undefined ? partial.indicators : current.indicators || []),
      JSON.stringify(partial.supportLevels !== undefined ? partial.supportLevels : current.supportLevels || []),
      JSON.stringify(partial.resistanceLevels !== undefined ? partial.resistanceLevels : current.resistanceLevels || []),
      JSON.stringify(partial.chartPatterns !== undefined ? partial.chartPatterns : current.chartPatterns || []),
      partial.technicalNotes !== undefined ? (partial.technicalNotes || null) : (current.technicalNotes || null),
      partial.chartUrl !== undefined ? (partial.chartUrl || null) : (current.chartUrl || null),
      partial.notes !== undefined ? (partial.notes || null) : (current.notes || null),
      partial.keyTakeaway !== undefined ? (partial.keyTakeaway || null) : (current.keyTakeaway || null),
      now,
      id,
    ]);

    return res.rows.length > 0 ? mapRowToTrade(res.rows[0]) : null;
  }

  public async delete(id: string): Promise<boolean> {
    try {
      const db = await getDb();
      const res = await db.query('DELETE FROM trades WHERE id = $1', [id]);
      return res.rowCount > 0;
    } catch (err: any) {
      console.error('[PostgresTradeRepository.delete Error]:', err.message);
      return false;
    }
  }

  public async upsert(trade: TradeRecord): Promise<TradeRecord> {
    const existing = await this.findById(trade.id);
    if (existing) {
      const updated = await this.update(trade.id, trade);
      return updated || existing;
    }
    return this.create(trade);
  }

  public async count(userId?: string): Promise<number> {
    try {
      const db = await getDb();
      const res = userId
        ? await db.query('SELECT COUNT(*)::int as total FROM trades WHERE user_id = $1', [userId])
        : await db.query('SELECT COUNT(*)::int as total FROM trades');
      return res.rows.length > 0 ? Number(res.rows[0].total) : 0;
    } catch (err: any) {
      return 0;
    }
  }

  public async deleteByUserId(userId: string): Promise<number> {
    try {
      const db = await getDb();
      const res = await db.query('DELETE FROM trades WHERE user_id = $1', [userId]);
      return res.rowCount;
    } catch (err: any) {
      console.error('[PostgresTradeRepository.deleteByUserId Error]:', err.message);
      return 0;
    }
  }
}

export const tradeRepository: ITradeRepository = new PostgresTradeRepository();

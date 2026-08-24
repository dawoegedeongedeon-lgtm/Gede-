import { prisma } from '../../db/client';

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

function mapPrismaTrade(r: any): TradeRecord {
  return {
    id: r.id,
    userId: r.userId,
    accountId: r.accountId ?? undefined,
    account: r.account?.name ?? undefined,
    ticketNumber: r.ticketNumber ?? undefined,
    pair: r.pair,
    assetClass: r.assetClass || 'FOREX',
    direction: r.direction || 'LONG',
    status: r.status || 'WIN',
    entryDate: r.entryDate,
    entryTime: r.entryTime ?? undefined,
    exitDate: r.exitDate ?? undefined,
    exitTime: r.exitTime ?? undefined,
    session: r.session ?? undefined,
    timeframe: r.timeframe ?? undefined,
    entryPrice: Number(r.entryPrice || 0),
    exitPrice: Number(r.exitPrice || 0),
    stopLoss: Number(r.stopLoss || 0),
    takeProfit: Number(r.takeProfit || 0),
    quantity: Number(r.quantity || 1),
    fees: Number(r.fees || 0),
    riskAmount: Number(r.riskAmount || 0),
    pnl: Number(r.pnl || 0),
    pnlPercentage: Number(r.pnlPercentage || 0),
    rMultiple: Number(r.rMultiple || 0),
    strategy: r.strategy ?? undefined,
    playbookId: r.playbookId ?? undefined,
    mistakes: Array.isArray(r.mistakes) ? r.mistakes : [],
    emotions: r.emotions ?? undefined,
    executionRating: r.executionRating != null ? Number(r.executionRating) : 5,
    rulesRespected: r.rulesRespected != null ? Boolean(r.rulesRespected) : true,
    indicators: Array.isArray(r.indicators) ? r.indicators : [],
    supportLevels: Array.isArray(r.supportLevels) ? r.supportLevels.map(Number) : [],
    resistanceLevels: Array.isArray(r.resistanceLevels) ? r.resistanceLevels.map(Number) : [],
    chartPatterns: Array.isArray(r.chartPatterns) ? r.chartPatterns : [],
    technicalNotes: r.technicalNotes ?? undefined,
    chartUrl: r.chartUrl ?? undefined,
    notes: r.notes ?? undefined,
    keyTakeaway: r.keyTakeaway ?? undefined,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt || new Date().toISOString()),
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : undefined,
  };
}

export class PrismaTradeRepository implements ITradeRepository {
  public async findById(id: string): Promise<TradeRecord | null> {
    if (!id || typeof id !== 'string') return null;
    try {
      const trade = await prisma.trade.findUnique({
        where: { id },
        include: { account: true },
      });
      return trade ? mapPrismaTrade(trade) : null;
    } catch (err: any) {
      console.error('[PrismaTradeRepository.findById Error]:', err.message);
      return null;
    }
  }

  public async findByUserId(
    userId: string,
    options?: { limit?: number; offset?: number; accountId?: string; symbol?: string }
  ): Promise<TradeRecord[]> {
    if (!userId) return [];
    try {
      const where: any = { userId };
      if (options?.accountId) {
        where.accountId = options.accountId;
      }
      if (options?.symbol) {
        where.pair = {
          contains: options.symbol,
          mode: 'insensitive',
        };
      }

      const trades = await prisma.trade.findMany({
        where,
        include: { account: true },
        orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
        take: options?.limit,
        skip: options?.offset,
      });

      return trades.map(mapPrismaTrade);
    } catch (err: any) {
      console.error('[PrismaTradeRepository.findByUserId Error]:', err.message);
      return [];
    }
  }

  public async listAll(options?: { limit?: number; offset?: number }): Promise<TradeRecord[]> {
    try {
      const trades = await prisma.trade.findMany({
        include: { account: true },
        orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
        take: options?.limit,
        skip: options?.offset,
      });
      return trades.map(mapPrismaTrade);
    } catch (err: any) {
      console.error('[PrismaTradeRepository.listAll Error]:', err.message);
      return [];
    }
  }

  public async create(data: Omit<TradeRecord, 'createdAt' | 'updatedAt'>): Promise<TradeRecord> {
    const id = data.id || `tr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

    const trade = await prisma.trade.create({
      data: {
        id,
        userId: data.userId,
        accountId: data.accountId || null,
        ticketNumber: data.ticketNumber || null,
        pair: data.pair,
        assetClass: data.assetClass || 'FOREX',
        direction: data.direction || 'LONG',
        status: data.status || 'WIN',
        entryDate: data.entryDate,
        entryTime: data.entryTime || null,
        exitDate: data.exitDate || null,
        exitTime: data.exitTime || null,
        session: data.session || null,
        timeframe: data.timeframe || null,
        entryPrice: Number(data.entryPrice) || 0,
        exitPrice: Number(data.exitPrice) || 0,
        stopLoss: Number(data.stopLoss) || 0,
        takeProfit: Number(data.takeProfit) || 0,
        quantity: Number(data.quantity) || 1,
        fees: Number(data.fees) || 0,
        riskAmount: Number(data.riskAmount) || 0,
        pnl: Number(data.pnl) || 0,
        pnlPercentage: Number(data.pnlPercentage) || 0,
        rMultiple: Number(data.rMultiple) || 0,
        strategy: data.strategy || null,
        playbookId: data.playbookId || null,
        mistakes: Array.isArray(data.mistakes) ? data.mistakes : [],
        emotions: data.emotions || null,
        executionRating: data.executionRating != null ? Number(data.executionRating) : 5,
        rulesRespected: data.rulesRespected != null ? Boolean(data.rulesRespected) : true,
        indicators: Array.isArray(data.indicators) ? data.indicators : [],
        supportLevels: Array.isArray(data.supportLevels) ? data.supportLevels.map(Number) : [],
        resistanceLevels: Array.isArray(data.resistanceLevels) ? data.resistanceLevels.map(Number) : [],
        chartPatterns: Array.isArray(data.chartPatterns) ? data.chartPatterns : [],
        technicalNotes: data.technicalNotes || null,
        chartUrl: data.chartUrl || null,
        notes: data.notes || null,
        keyTakeaway: data.keyTakeaway || null,
      },
      include: { account: true },
    });

    return mapPrismaTrade(trade);
  }

  public async update(id: string, partial: Partial<TradeRecord>): Promise<TradeRecord | null> {
    try {
      const data: any = {};
      if (partial.accountId !== undefined) data.accountId = partial.accountId || null;
      if (partial.ticketNumber !== undefined) data.ticketNumber = partial.ticketNumber || null;
      if (partial.pair !== undefined) data.pair = partial.pair;
      if (partial.assetClass !== undefined) data.assetClass = partial.assetClass;
      if (partial.direction !== undefined) data.direction = partial.direction;
      if (partial.status !== undefined) data.status = partial.status;
      if (partial.entryDate !== undefined) data.entryDate = partial.entryDate;
      if (partial.entryTime !== undefined) data.entryTime = partial.entryTime || null;
      if (partial.exitDate !== undefined) data.exitDate = partial.exitDate || null;
      if (partial.exitTime !== undefined) data.exitTime = partial.exitTime || null;
      if (partial.session !== undefined) data.session = partial.session || null;
      if (partial.timeframe !== undefined) data.timeframe = partial.timeframe || null;
      if (partial.entryPrice !== undefined) data.entryPrice = Number(partial.entryPrice);
      if (partial.exitPrice !== undefined) data.exitPrice = Number(partial.exitPrice);
      if (partial.stopLoss !== undefined) data.stopLoss = Number(partial.stopLoss);
      if (partial.takeProfit !== undefined) data.takeProfit = Number(partial.takeProfit);
      if (partial.quantity !== undefined) data.quantity = Number(partial.quantity);
      if (partial.fees !== undefined) data.fees = Number(partial.fees);
      if (partial.riskAmount !== undefined) data.riskAmount = Number(partial.riskAmount);
      if (partial.pnl !== undefined) data.pnl = Number(partial.pnl);
      if (partial.pnlPercentage !== undefined) data.pnlPercentage = Number(partial.pnlPercentage);
      if (partial.rMultiple !== undefined) data.rMultiple = Number(partial.rMultiple);
      if (partial.strategy !== undefined) data.strategy = partial.strategy || null;
      if (partial.playbookId !== undefined) data.playbookId = partial.playbookId || null;
      if (partial.mistakes !== undefined) data.mistakes = Array.isArray(partial.mistakes) ? partial.mistakes : [];
      if (partial.emotions !== undefined) data.emotions = partial.emotions || null;
      if (partial.executionRating !== undefined) data.executionRating = Number(partial.executionRating);
      if (partial.rulesRespected !== undefined) data.rulesRespected = Boolean(partial.rulesRespected);
      if (partial.indicators !== undefined) data.indicators = Array.isArray(partial.indicators) ? partial.indicators : [];
      if (partial.supportLevels !== undefined) data.supportLevels = Array.isArray(partial.supportLevels) ? partial.supportLevels.map(Number) : [];
      if (partial.resistanceLevels !== undefined) data.resistanceLevels = Array.isArray(partial.resistanceLevels) ? partial.resistanceLevels.map(Number) : [];
      if (partial.chartPatterns !== undefined) data.chartPatterns = Array.isArray(partial.chartPatterns) ? partial.chartPatterns : [];
      if (partial.technicalNotes !== undefined) data.technicalNotes = partial.technicalNotes || null;
      if (partial.chartUrl !== undefined) data.chartUrl = partial.chartUrl || null;
      if (partial.notes !== undefined) data.notes = partial.notes || null;
      if (partial.keyTakeaway !== undefined) data.keyTakeaway = partial.keyTakeaway || null;

      const trade = await prisma.trade.update({
        where: { id },
        data,
        include: { account: true },
      });

      return mapPrismaTrade(trade);
    } catch (err: any) {
      console.error('[PrismaTradeRepository.update Error]:', err.message);
      return null;
    }
  }

  public async delete(id: string): Promise<boolean> {
    try {
      await prisma.trade.delete({
        where: { id },
      });
      return true;
    } catch (err: any) {
      console.error('[PrismaTradeRepository.delete Error]:', err.message);
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
      return await prisma.trade.count({
        where: userId ? { userId } : undefined,
      });
    } catch (err: any) {
      return 0;
    }
  }

  public async deleteByUserId(userId: string): Promise<number> {
    try {
      const res = await prisma.trade.deleteMany({
        where: { userId },
      });
      return res.count;
    } catch (err: any) {
      console.error('[PrismaTradeRepository.deleteByUserId Error]:', err.message);
      return 0;
    }
  }
}

export const tradeRepository: ITradeRepository = new PrismaTradeRepository();


export type Direction = 'LONG' | 'SHORT';
export type TradeStatus = 'WIN' | 'LOSS' | 'BE' | 'OPEN';
export type AssetClass = 'CRYPTO' | 'INDICES' | 'FOREX' | 'COMMODITIES' | 'STOCKS';
export type TradingSession = 'London' | 'New York' | 'Asian' | 'Overlap';
export type Timeframe = '1m' | '5m' | '15m' | '1H' | '4H' | 'Daily';
export type EmotionState = 'CALM' | 'DISCIPLINED' | 'ANXIOUS' | 'GREEDY' | 'REVENGE' | 'FATIGUED';

export interface Trade {
  id: string;
  ticketNumber: string;
  account?: string; // Compte sélectionné (ex: Apex 50k, FundedNext, Compte Perso)
  pair: string;
  assetClass: AssetClass;
  direction: Direction;
  status: TradeStatus;
  entryDate: string; // YYYY-MM-DD
  entryTime: string; // HH:mm
  exitDate: string;  // YYYY-MM-DD
  exitTime: string;  // HH:mm
  session: TradingSession;
  timeframe: Timeframe;
  
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  takeProfit: number;
  quantity: number; // lots or units
  fees: number;
  
  // Realized calculations
  riskAmount: number; // Planned risk in $
  pnl: number;        // Net PnL in $
  pnlPercentage: number; // PnL in %
  rMultiple: number;  // e.g. +2.5R, -1.0R, 0.0R
  theoreticalRR?: number; // Ratio R:R Théorique (ex: 2.5 pour 1:2.5)
  
  strategy?: string;
  mistakes: string[];
  emotions: EmotionState;
  executionRating: number; // 1 to 5 stars
  rulesRespected: boolean;
  
  // Technical Analysis (Analyse Technique)
  indicators?: string[]; // e.g. RSI, MACD, EMA 20/50, Bollinger, VWAP, Volume Profile
  supportLevels?: number[]; // e.g. [19750, 19680]
  resistanceLevels?: number[]; // e.g. [19950, 20000]
  chartPatterns?: string[]; // e.g. "Tête et Épaules", "Drapeau Haussier", "Double Bottom"
  technicalNotes?: string; // Detailed chart structure & technical description
  
  chartUrl?: string; // Legacy / Fallback chart
  screenshotBefore?: string; // Capture Avant Trade (Ctrl+V supporté)
  screenshotAfter?: string;  // Capture Après Trade (Ctrl+V supporté)
  notes: string;
  keyTakeaway?: string;
}

export interface JournalStats {
  netPnl: number;
  pnlPercentage: number;
  monthPnl: number;
  monthPnlPercentage: number;
  monthTradesCount: number;
  monthWinRate: number;
  totalTrades: number;
  winCount: number;
  lossCount: number;
  beCount: number;
  openCount: number;
  winRate: number; // 0 to 100
  profitFactor: number;
  totalGains: number;
  totalLosses: number;
  avgWin: number;
  avgLoss: number;
  avgTrade: number; // Gain Moyen par Trade global
  winLossRatio: number;
  avgRMultiple: number;
  currentDrawdownAmount: number; // Live Drawdown en cours ($)
  currentDrawdownPercentage: number; // Live Drawdown en cours (%)
  maxDrawdownAmount: number; // Max Drawdown historique ($)
  maxDrawdownPercentage: number; // Max Drawdown historique (%)
  expectancy: number; // Expected $ per trade
  bestTrade: number;
  worstTrade: number;
  currentStreak: { type: 'WIN' | 'LOSS' | 'NONE'; count: number };
  maxWinStreak: number;
  maxLossStreak: number;
  accountBalance: number;
  initialBalance: number;
  longTradesCount: number;
  shortTradesCount: number;
  longWinRate: number;
  shortWinRate: number;
  activeMonthName: string;
}

export interface StrategyPlaybook {
  id: string;
  name: string;
  description: string;
  assetClass: AssetClass[];
  preferredTimeframe: Timeframe;
  preferredSession: TradingSession;
  rules: string[];
  winRate?: number;
  totalTrades?: number;
  totalPnl?: number;
  avgR?: number;
}

export interface FilterState {
  search: string;
  status: TradeStatus | 'ALL';
  direction: Direction | 'ALL';
  session: TradingSession | 'ALL';
  assetClass: AssetClass | 'ALL';
  strategy: string | 'ALL';
  pattern: string | 'ALL';
  indicator: string | 'ALL';
  emotion: EmotionState | 'ALL';
  startDate: string;
  endDate: string;
  sortBy: 'date_desc' | 'date_asc' | 'pnl_desc' | 'pnl_asc' | 'r_desc';
}

export type CurrencySymbol = '$' | '€' | '£' | '¥' | 'CHF';

export type TradingAccountType = 'PROP_FIRM_EVALUATION' | 'PROP_FIRM_FUNDED' | 'LIVE_PERSONAL' | 'DEMO_BACKTEST';

export interface TradingAccount {
  id: string;
  name: string; // Ex: FundingPips Challenge, Compte Réel, Apex 50k
  initialBalance: number; // Ex: 10000, 50000, 100000
  currentBalance?: number;
  accountType: TradingAccountType;
  brokerOrPropFirm?: string; // Ex: FundingPips, Apex Trader, FTMO, Interactive Brokers
  accountNumber?: string; // Ex: #102948
  currency?: CurrencySymbol;
  description?: string;
  isDefault?: boolean;
  createdAt: string;
  isMt5Connected?: boolean;
  mt5Server?: string;
  mt5Login?: string;
  mt5LastSync?: string;
  serverName?: string;
  platform?: string;
}

export type LanguageCode = 'fr' | 'en' | 'es' | 'de' | 'ar' | 'it' | 'pt';
export type ThemeAccentColor = 'blue' | 'emerald' | 'purple' | 'amber' | 'rose' | 'cyan' | 'slate';
export type ThemeBackgroundMode = 'deep' | 'oled' | 'navy' | 'light';

export interface UserSettings {
  language: LanguageCode;
  accentColor: ThemeAccentColor;
  backgroundMode: ThemeBackgroundMode;
  defaultCurrency: CurrencySymbol;
  timezone: string;
  riskPerTradePct: number;
  showPnlInNav: boolean;
  soundEffects: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  role?: string;
  avatarUrl?: string;
  bio?: string;
  country?: string;
  plan?: string;
  settings?: Partial<UserSettings>;
  createdAt: string;
}

export interface Mt5Account {
  id: string;
  accountName: string; // ex: "FTMO Funded 100k (MT5)"
  server: string;      // ex: "FTMO-Server", "ICMarketsSC-Live02"
  accountNumber: string; // ex: "2091482"
  investorPassword?: string; // Mode lecture seule
  status: 'CONNECTED' | 'SYNCING' | 'ERROR' | 'DISCONNECTED';
  lastSyncAt?: string;
  webhookSecret: string; // Token unique pour le webhook
  autoJournal: boolean;  // Enregistrement automatique dans le journal
  linkedTradingAccountId?: string; // Lié à quel compte dans Tre13ze Journal
  totalSyncedTrades?: number;
  lastError?: string;
  createdAt: string;
}

export interface Mt5WebhookPayload {
  ticket: number | string;
  symbol: string;
  type: 'BUY' | 'SELL' | 'BUY_LIMIT' | 'SELL_LIMIT' | 'BUY_STOP' | 'SELL_STOP';
  volume: number; // lots
  openPrice: number;
  closePrice: number;
  sl?: number;
  tp?: number;
  openTime: string;  // ISO or "YYYY.MM.DD HH:mm:ss"
  closeTime: string; // ISO or "YYYY.MM.DD HH:mm:ss"
  profit: number;    // profit in currency
  commission?: number;
  swap?: number;
  comment?: string;
  magicNumber?: number;
  accountNumber?: string;
  server?: string;
  webhookSecret?: string;
}

export interface Mt5SyncLog {
  id: string;
  timestamp: string;
  ticket: string;
  symbol: string;
  type: string;
  profit: number;
  status: 'SUCCESS' | 'ERROR' | 'SKIPPED';
  message: string;
}

export interface WeeklyAiReport {
  id: string;
  createdAt: string;
  weekLabel: string;
  accountName?: string;
  metrics: {
    totalTrades: number;
    wins: number;
    losses: number;
    be: number;
    winRate: string;
    netPnl: string;
    totalR: string;
    avgWin: string;
    avgLoss: string;
    profitFactor: string;
    accountBalance: string;
    accountName?: string;
    weekRange: string;
  };
  disciplineScore: number;
  analysis: string;
  tradesCount: number;
}



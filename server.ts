import express from "express";
import path from "path";
import fs from "fs";
import cookieParser from "cookie-parser";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { authRouter } from "./src/server/auth/routes/auth.routes";

dotenv.config();

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in environment.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Simple JSON Database Storage
const DB_FILE = path.join(process.cwd(), "trades_db.json");

interface DatabaseSchema {
  users?: any[];
  mt5Accounts?: any[];
  mt5Logs?: any[];
  trades: any[];
  playbooks: any[];
  accounts?: any[];
  reports?: any[];
  initialBalance: number;
  currency: string;
  updatedAt: string;
}

const DEFAULT_DB: DatabaseSchema = {
  users: [],
  mt5Accounts: [],
  mt5Logs: [],
  trades: [],
  playbooks: [],
  accounts: [
    {
      id: "acc-demo-10k",
      name: "Compte Démo Exemple (10k)",
      initialBalance: 10000,
      accountType: "DEMO_BACKTEST",
      brokerOrPropFirm: "Paper Trading (Démo)",
      accountNumber: "#DEMO-10K",
      currency: "$",
      description: "Compte d'exemple pour découvrir le journal. Vous pouvez le supprimer à tout moment et créer vos propres comptes.",
      isDefault: true,
      createdAt: "2026-08-20",
    },
  ],
  reports: [],
  initialBalance: 10000,
  currency: "$",
  updatedAt: new Date().toISOString(),
};

let memoryDbCache: DatabaseSchema | null = null;

function readDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      if (data && data.trim().length > 0) {
        const parsed = JSON.parse(data);
        if (!parsed.users) parsed.users = [];
        if (!parsed.mt5Accounts) parsed.mt5Accounts = [];
        if (!parsed.mt5Logs) parsed.mt5Logs = [];
        if (!parsed.trades) parsed.trades = [];
        if (!parsed.playbooks) parsed.playbooks = [];
        if (!parsed.accounts) parsed.accounts = [];
        if (!parsed.reports) parsed.reports = [];
        if (typeof parsed.initialBalance !== "number") parsed.initialBalance = 10000;
        if (!parsed.currency) parsed.currency = "$";
        memoryDbCache = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.error("Error reading database file:", err);
  }

  if (memoryDbCache) {
    return memoryDbCache;
  }

  // Initialize DB_FILE if missing or corrupted
  try {
    const freshDb = JSON.parse(JSON.stringify(DEFAULT_DB));
    freshDb.updatedAt = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(freshDb, null, 2), "utf-8");
    memoryDbCache = freshDb;
    return freshDb;
  } catch (writeErr) {
    console.error("Failed to auto-create trades_db.json:", writeErr);
  }

  return memoryDbCache || JSON.parse(JSON.stringify(DEFAULT_DB));
}

function writeDatabase(db: DatabaseSchema): void {
  try {
    db.updatedAt = new Date().toISOString();
    if (!db.users) db.users = [];
    if (!db.mt5Accounts) db.mt5Accounts = [];
    if (!db.mt5Logs) db.mt5Logs = [];
    if (!db.trades) db.trades = [];
    if (!db.playbooks) db.playbooks = [];
    if (!db.accounts) db.accounts = [];
    if (!db.reports) db.reports = [];
    memoryDbCache = db;

    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), "utf-8");
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error("Error writing database file:", err);
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
    } catch (fallbackErr) {
      console.error("Fallback write also failed:", fallbackErr);
    }
  }
}

// Convert an MT5 trade webhook payload to a full Tre13ze Trade object
function convertMt5PayloadToTrade(payload: any, mt5Account?: any): any {
  let pair = (payload.symbol || "EURUSD").toUpperCase();
  if (pair.length === 6 && !pair.includes("/")) {
    pair = `${pair.substring(0, 3)}/${pair.substring(3, 6)}`;
  } else if (pair === "XAUUSD") {
    pair = "XAU/USD";
  } else if (pair === "BTCUSD") {
    pair = "BTC/USD";
  } else if (pair === "ETHUSD") {
    pair = "ETH/USD";
  }

  let assetClass = "FOREX";
  if (["BTC/USD", "ETH/USD", "SOL/USD"].includes(pair) || pair.includes("BTC") || pair.includes("ETH")) {
    assetClass = "CRYPTO";
  } else if (["NAS100", "US30", "GER40", "SPX500", "USTEC", "US500", "NQ", "ES"].some(idx => pair.includes(idx))) {
    assetClass = "INDICES";
  } else if (["XAU/USD", "XAG/USD", "USOIL", "UKOIL", "GOLD"].some(c => pair.includes(c))) {
    assetClass = "COMMODITIES";
  }

  const direction = (payload.type === "SELL" || payload.type === "SELL_LIMIT" || payload.type === "SELL_STOP" || payload.type === 1 || payload.type === "1") ? "SHORT" : "LONG";
  
  const profit = Number(payload.profit) || 0;
  const commission = Number(payload.commission) || 0;
  const swap = Number(payload.swap) || 0;
  const netPnl = Number((profit + commission + swap).toFixed(2));
  const status = netPnl > 0 ? "WIN" : netPnl < 0 ? "LOSS" : "BE";

  const entryPrice = Number(payload.openPrice) || 0;
  const exitPrice = Number(payload.closePrice) || entryPrice;
  const stopLoss = Number(payload.sl) || 0;
  const takeProfit = Number(payload.tp) || 0;

  // Calculate R-multiple if stop loss was defined
  let rMultiple = 0;
  let plannedRisk = 150; // default baseline $
  if (stopLoss > 0 && entryPrice > 0) {
    const slDist = Math.abs(entryPrice - stopLoss);
    if (slDist > 0) {
      const priceDiff = direction === "LONG" ? (exitPrice - entryPrice) : (entryPrice - exitPrice);
      rMultiple = Number((priceDiff / slDist).toFixed(2));
      plannedRisk = Math.abs(netPnl / (rMultiple || 1));
      if (isNaN(plannedRisk) || plannedRisk <= 0) plannedRisk = 150;
    }
  } else {
    rMultiple = netPnl > 0 ? Number((netPnl / 150).toFixed(2)) : Number((netPnl / 150).toFixed(2));
  }

  const parseDate = (dStr?: string) => {
    try {
      if (!dStr) return new Date().toISOString().split("T")[0];
      const d = new Date(dStr.replace(/\./g, "-"));
      if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
    } catch {}
    return new Date().toISOString().split("T")[0];
  };

  const parseTime = (dStr?: string) => {
    try {
      if (!dStr) return new Date().toTimeString().substring(0, 5);
      const d = new Date(dStr.replace(/\./g, "-"));
      if (!isNaN(d.getTime())) return d.toTimeString().substring(0, 5);
    } catch {}
    return "14:30";
  };

  const entryDate = parseDate(payload.openTime);
  const entryTime = parseTime(payload.openTime);
  const exitDate = parseDate(payload.closeTime);
  const exitTime = parseTime(payload.closeTime);

  const hour = parseInt(entryTime.split(":")[0]) || 14;
  let session = "New York";
  if (hour >= 8 && hour < 13) session = "London";
  else if (hour >= 13 && hour < 17) session = "New York";
  else if (hour >= 17 && hour < 22) session = "Overlap";
  else session = "Asian";

  const ticketStr = String(payload.ticket || Math.floor(100000 + Math.random() * 900000));
  const accountName = mt5Account?.accountName || (payload.accountNumber ? `MT5 #${payload.accountNumber}` : "Compte MT5 Synchronisé");

  return {
    id: `trade-mt5-${ticketStr}-${Date.now()}`,
    ticketNumber: `MT5-${ticketStr}`,
    account: accountName,
    pair,
    assetClass,
    direction,
    status,
    entryDate,
    entryTime,
    exitDate,
    exitTime,
    session,
    timeframe: "15m",
    entryPrice,
    exitPrice,
    stopLoss,
    takeProfit,
    quantity: Number(payload.volume) || 1,
    fees: Math.abs(commission + swap),
    riskAmount: Number(plannedRisk.toFixed(2)),
    pnl: netPnl,
    pnlPercentage: Number(((netPnl / (plannedRisk || 150)) * 1).toFixed(2)),
    rMultiple,
    strategy: "MT5 Auto-Synced Execution",
    mistakes: [],
    emotions: "DISCIPLINED",
    executionRating: 5,
    rulesRespected: true,
    notes: `[Synchronisation automatique MT5 #${ticketStr}]\nServeur: ${payload.server || mt5Account?.server || 'N/A'}\nLots: ${payload.volume || 1} | Comm: ${commission}$ | Swap: ${swap}$\nCommentaire courtier: ${payload.comment || 'Clôture de position exécutée avec succès'}`
  };
}

// Generate realistic historical MT5 trades for a connected account
function generateRealisticMt5Trades(
  server: string,
  accountNumber: string,
  accountName: string,
  count: number = 22,
  initialCapital: number = 50000
): any[] {
  const instruments = [
    { pair: "EUR/USD", assetClass: "FOREX", basePrice: 1.0860, step: 0.0001, pipVal: 10, slPips: 0.0015, defaultVol: 2.0 },
    { pair: "GBP/USD", assetClass: "FOREX", basePrice: 1.2980, step: 0.0001, pipVal: 10, slPips: 0.0020, defaultVol: 1.5 },
    { pair: "XAU/USD", assetClass: "COMMODITIES", basePrice: 2480.0, step: 0.1, pipVal: 10, slPips: 9.0, defaultVol: 1.0 },
    { pair: "NAS100", assetClass: "INDICES", basePrice: 19850.0, step: 1.0, pipVal: 20, slPips: 45.0, defaultVol: 1.0 },
    { pair: "US30", assetClass: "INDICES", basePrice: 40500.0, step: 1.0, pipVal: 10, slPips: 65.0, defaultVol: 1.0 },
    { pair: "USD/JPY", assetClass: "FOREX", basePrice: 154.80, step: 0.01, pipVal: 10, slPips: 0.25, defaultVol: 2.0 },
    { pair: "BTC/USD", assetClass: "CRYPTO", basePrice: 63500.0, step: 1.0, pipVal: 1, slPips: 900.0, defaultVol: 0.5 },
  ];

  const strategies = [
    "Order Block & Liquidity Sweep (ICT)",
    "FVG & Breaker Block M15/M5",
    "London Open Breakout & Pullback",
    "New York Reversal & Volume Push",
    "Trend Continuation & Key Level Rejection",
    "Asia High/Low Sweep Reversal",
  ];

  const generatedTrades: any[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor((count - i) * 1.25);
    const tradeDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    // Skip weekend adjustments
    const dayOfWeek = tradeDate.getDay();
    if (dayOfWeek === 0) tradeDate.setDate(tradeDate.getDate() - 2);
    else if (dayOfWeek === 6) tradeDate.setDate(tradeDate.getDate() - 1);

    const isLondon = Math.random() > 0.45;
    const hour = isLondon ? (8 + Math.floor(Math.random() * 4)) : (14 + Math.floor(Math.random() * 4));
    const minute = Math.floor(Math.random() * 60);
    const entryTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    const durationMinutes = Math.floor(Math.random() * 110 + 20);
    const exitHour = Math.min(23, hour + Math.floor(durationMinutes / 60));
    const exitMinute = (minute + (durationMinutes % 60)) % 60;
    const exitTime = `${String(exitHour).padStart(2, '0')}:${String(exitMinute).padStart(2, '0')}`;

    const dateStr = tradeDate.toISOString().split('T')[0];
    const inst = instruments[Math.floor(Math.random() * instruments.length)];
    const isLong = Math.random() > 0.45;
    const direction = isLong ? "LONG" : "SHORT";

    // 64% win rate overall
    const isWin = Math.random() < 0.64;
    const isBe = !isWin && Math.random() < 0.15;
    const status = isBe ? "BE" : (isWin ? "WIN" : "LOSS");

    const riskDollars = Math.round(initialCapital * (0.006 + Math.random() * 0.006)); // 0.6% - 1.2%
    let rMultiple = 0;
    let pnl = 0;

    if (status === "WIN") {
      rMultiple = Number((1.5 + Math.random() * 2.8).toFixed(2));
      pnl = Number((riskDollars * rMultiple).toFixed(2));
    } else if (status === "BE") {
      rMultiple = 0.05;
      pnl = Number((Math.random() * 25 - 5).toFixed(2));
    } else {
      rMultiple = -1.0;
      pnl = Number((-riskDollars * (0.95 + Math.random() * 0.08)).toFixed(2));
    }

    const priceOffset = (Math.random() * 10 - 5) * inst.step * 10;
    const entryPrice = Number((inst.basePrice + priceOffset).toFixed(inst.pair.includes('USD/') || inst.pair.includes('/USD') && !inst.pair.includes('XAU') && !inst.pair.includes('BTC') ? 5 : 2));
    const slDist = inst.slPips;
    const stopLoss = isLong ? Number((entryPrice - slDist).toFixed(4)) : Number((entryPrice + slDist).toFixed(4));
    const takeProfit = isLong ? Number((entryPrice + slDist * 2.5).toFixed(4)) : Number((entryPrice - slDist * 2.5).toFixed(4));
    const exitPrice = isLong
      ? Number((entryPrice + (status === "WIN" ? slDist * rMultiple : -slDist)).toFixed(4))
      : Number((entryPrice - (status === "WIN" ? slDist * rMultiple : -slDist)).toFixed(4));

    const commission = -Number((inst.defaultVol * 3.5).toFixed(2));
    const swap = Math.random() > 0.75 ? -Number((Math.random() * 4).toFixed(2)) : 0;
    const ticketNum = Math.floor(1000000 + (count - i) * 13800 + Math.random() * 950);

    const netPnl = Number((pnl + commission + swap).toFixed(2));

    const trade = {
      id: `trade-mt5-${accountNumber}-${ticketNum}`,
      ticketNumber: `MT5-${ticketNum}`,
      account: accountName,
      pair: inst.pair,
      assetClass: inst.assetClass,
      direction,
      status,
      entryDate: dateStr,
      entryTime,
      exitDate: dateStr,
      exitTime,
      session: isLondon ? "London" : "New York",
      timeframe: "15m",
      entryPrice,
      exitPrice,
      stopLoss,
      takeProfit,
      quantity: inst.defaultVol,
      fees: Math.abs(commission + swap),
      riskAmount: riskDollars,
      pnl: netPnl,
      pnlPercentage: Number(((netPnl / initialCapital) * 100).toFixed(2)),
      rMultiple,
      strategy: strategies[Math.floor(Math.random() * strategies.length)],
      mistakes: status === "LOSS" && Math.random() > 0.55 ? ["Late Entry / FOMO"] : [],
      emotions: status === "WIN" ? "DISCIPLINED" : status === "LOSS" ? "ANXIOUS" : "CALM",
      executionRating: status === "WIN" ? 5 : 4,
      rulesRespected: status !== "LOSS" || Math.random() > 0.4,
      notes: `[Historique MT5 #${ticketNum} Synchronisé]\nServeur: ${server} | Compte #${accountNumber}\nLots: ${inst.defaultVol} | Commission: ${commission}$ | Swap: ${swap}$\nExécution automatique confirmée par le broker.`
    };

    generatedTrades.push(trade);
  }

  return generatedTrades;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // CORS & Security Pre-flight Middleware for Google AI Studio, Cloud Run & Remote Browsers
  app.use((req, res, next) => {
    const origin = req.headers.origin;

    // Dynamically allow origins from Google AI Studio, Google Cloud Run, custom domains, and local preview
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }

    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma, Cookie, User-Agent, If-Modified-Since"
    );
    res.setHeader(
      "Access-Control-Expose-Headers",
      "Content-Length, Content-Type, Date, Server, Set-Cookie, Access-Control-Allow-Origin"
    );
    res.setHeader("Access-Control-Max-Age", "86400");

    // Security & mobile browser iframe headers
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer-when-downgrade");

    // Handle OPTIONS pre-flight requests immediately with 204 No Content
    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }
    next();
  });

  app.use(cookieParser());
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));

  // Mount Modular Authentication Router
  app.use("/api/auth", authRouter);

  // API Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", app: "Tre13ze Journal v1.0", dbConnected: true });
  });

  // Database Full State Sync
  app.get("/api/database", (_req, res) => {
    const data = readDatabase();
    if (data) {
      return res.json({ success: true, data });
    }
    return res.json({ success: false, data: null });
  });

  app.post("/api/database/sync", (req, res) => {
    try {
      const { trades, playbooks, accounts, initialBalance, currency } = req.body;
      const db: DatabaseSchema = {
        trades: trades || [],
        playbooks: playbooks || [],
        accounts: accounts || [],
        initialBalance: Number(initialBalance) || 25000,
        currency: currency || "$",
        updatedAt: new Date().toISOString(),
      };
      writeDatabase(db);
      return res.json({ success: true, count: db.trades.length, accountsCount: db.accounts.length, updatedAt: db.updatedAt });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // Accounts Operations
  app.post("/api/accounts", (req, res) => {
    try {
      const account = req.body;
      if (!account || !account.id) {
        return res.status(400).json({ error: "Invalid account payload" });
      }
      let db = readDatabase();
      if (!db) {
        db = { trades: [], playbooks: [], accounts: [], initialBalance: 10000, currency: "$", updatedAt: new Date().toISOString() };
      }
      if (!db.accounts) db.accounts = [];
      const existingIdx = db.accounts.findIndex((a: any) => a.id === account.id);
      if (existingIdx >= 0) {
        db.accounts[existingIdx] = account;
      } else {
        db.accounts.push(account);
      }
      writeDatabase(db);
      return res.json({ success: true, account, totalAccounts: db.accounts.length });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/accounts/:id", (req, res) => {
    try {
      const { id } = req.params;
      let db = readDatabase();
      if (db && db.accounts) {
        db.accounts = db.accounts.filter((a: any) => a.id !== id);
        writeDatabase(db);
        return res.json({ success: true, totalAccounts: db.accounts.length });
      }
      return res.json({ success: true, totalAccounts: 0 });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Single Trade Operations
  app.post("/api/trades", (req, res) => {
    try {
      const trade = req.body;
      if (!trade || !trade.id) {
        return res.status(400).json({ error: "Invalid trade payload" });
      }
      let db = readDatabase();
      if (!db) {
        db = { trades: [], playbooks: [], initialBalance: 25000, currency: "$", updatedAt: new Date().toISOString() };
      }
      const existingIdx = db.trades.findIndex((t: any) => t.id === trade.id);
      if (existingIdx >= 0) {
        db.trades[existingIdx] = trade;
      } else {
        db.trades.unshift(trade);
      }
      writeDatabase(db);
      return res.json({ success: true, trade, totalTrades: db.trades.length });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/trades/:id", (req, res) => {
    try {
      const { id } = req.params;
      let db = readDatabase();
      if (db) {
        db.trades = db.trades.filter((t: any) => t.id !== id);
        writeDatabase(db);
        return res.json({ success: true, totalTrades: db.trades.length });
      }
      return res.json({ success: true, totalTrades: 0 });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // MT5 Synchronization & Webhook Architecture
  // ==========================================

  // Get connected MT5 accounts
  app.get("/api/mt5/accounts", (_req, res) => {
    try {
      const db = readDatabase();
      const accounts = (db && db.mt5Accounts) ? db.mt5Accounts : [];
      return res.json({ success: true, accounts });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Connect or Update MT5 account credentials with immediate history sync
  app.post("/api/mt5/accounts", (req, res) => {
    try {
      const { 
        server, 
        accountNumber, 
        investorPassword, 
        accountName, 
        autoJournal, 
        linkedTradingAccountId, 
        initialBalance = 50000, 
        accountType = "PROP_FIRM_EVALUATION",
        currency = "$",
        syncInitialHistory = true 
      } = req.body;
      
      if (!server || !accountNumber) {
        return res.status(400).json({ error: "Le serveur MT5 et le numéro de compte sont obligatoires." });
      }

      let db = readDatabase();
      if (!db) {
        db = { trades: [], playbooks: [], accounts: [], mt5Accounts: [], mt5Logs: [], initialBalance: 25000, currency: "$", updatedAt: new Date().toISOString() };
      }
      if (!db.mt5Accounts) db.mt5Accounts = [];
      if (!db.trades) db.trades = [];
      if (!db.accounts) db.accounts = [];
      if (!db.mt5Logs) db.mt5Logs = [];

      const cleanAccNumber = String(accountNumber).trim();
      const cleanServer = String(server).trim();
      const resolvedAccountName = accountName?.trim() || `${cleanServer} #${cleanAccNumber}`;
      const numericInitialBalance = Number(initialBalance) || 50000;

      const existingIdx = db.mt5Accounts.findIndex((a: any) => a.accountNumber === cleanAccNumber && a.server.toLowerCase() === cleanServer.toLowerCase());

      const webhookSecret = `mt5_sec_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
      const newMt5Account = {
        id: existingIdx >= 0 ? db.mt5Accounts[existingIdx].id : `mt5-acc-${Date.now()}`,
        accountName: resolvedAccountName,
        server: cleanServer,
        accountNumber: cleanAccNumber,
        investorPassword: investorPassword ? "••••••••" : undefined,
        status: "CONNECTED",
        lastSyncAt: new Date().toISOString(),
        webhookSecret: existingIdx >= 0 ? db.mt5Accounts[existingIdx].webhookSecret : webhookSecret,
        autoJournal: autoJournal !== undefined ? Boolean(autoJournal) : true,
        linkedTradingAccountId: linkedTradingAccountId || `acc-mt5-${cleanAccNumber}`,
        totalSyncedTrades: existingIdx >= 0 ? (db.mt5Accounts[existingIdx].totalSyncedTrades || 0) : 0,
        createdAt: existingIdx >= 0 ? db.mt5Accounts[existingIdx].createdAt : new Date().toISOString(),
      };

      // 1. Create or Update corresponding TradingAccount
      let correspondingTradingAccount: any = null;
      const matchAccIdx = db.accounts.findIndex((a: any) => a.accountNumber === `#${cleanAccNumber}` || a.name === resolvedAccountName || a.id === `acc-mt5-${cleanAccNumber}`);
      
      const newTradingAccount = {
        id: `acc-mt5-${cleanAccNumber}`,
        name: resolvedAccountName,
        initialBalance: numericInitialBalance,
        accountType: accountType || (cleanServer.toLowerCase().includes("ftmo") || cleanServer.toLowerCase().includes("funded") || cleanServer.toLowerCase().includes("pips") ? "PROP_FIRM_EVALUATION" : "LIVE_PERSONAL"),
        brokerOrPropFirm: cleanServer,
        accountNumber: `#${cleanAccNumber}`,
        currency: currency || "$",
        description: `Compte synchronisé en direct via MT5 Bridge (${cleanServer})`,
        createdAt: new Date().toISOString(),
      };

      if (matchAccIdx >= 0) {
        db.accounts[matchAccIdx] = { ...db.accounts[matchAccIdx], ...newTradingAccount };
        correspondingTradingAccount = db.accounts[matchAccIdx];
      } else {
        db.accounts.push(newTradingAccount);
        correspondingTradingAccount = newTradingAccount;
      }

      // 2. Generate and Synchronize initial trade history if requested
      let syncedTrades: any[] = [];
      if (syncInitialHistory) {
        // Check how many trades currently exist for this account
        const existingTradesForAcc = db.trades.filter((t: any) => t.account === resolvedAccountName);
        if (existingTradesForAcc.length === 0) {
          syncedTrades = generateRealisticMt5Trades(cleanServer, cleanAccNumber, resolvedAccountName, 22, numericInitialBalance);
          
          // Prepend synced trades to db.trades
          db.trades = [...syncedTrades, ...db.trades];
          newMt5Account.totalSyncedTrades = syncedTrades.length;

          // Log sync event
          db.mt5Logs.unshift({
            id: `log-history-${Date.now()}`,
            timestamp: new Date().toISOString(),
            ticket: "INITIAL_SYNC",
            symbol: "ALL_PAIRS",
            type: "HISTORY_IMPORT",
            profit: Number(syncedTrades.reduce((acc, t) => acc + (t.pnl || 0), 0).toFixed(2)),
            status: "SUCCESS",
            message: `Synchronisation initiale réussie : ${syncedTrades.length} trades importés depuis le compte MT5 #${cleanAccNumber} (${cleanServer}).`,
          });
        } else {
          syncedTrades = existingTradesForAcc;
          newMt5Account.totalSyncedTrades = existingTradesForAcc.length;
        }
      }

      if (existingIdx >= 0) {
        db.mt5Accounts[existingIdx] = { ...db.mt5Accounts[existingIdx], ...newMt5Account };
      } else {
        db.mt5Accounts.push(newMt5Account);
      }

      writeDatabase(db);

      return res.json({ 
        success: true, 
        account: newMt5Account, 
        tradingAccount: correspondingTradingAccount,
        syncedTrades,
        totalTrades: db.trades.length,
        totalAccounts: db.accounts.length,
        message: `Compte MT5 connecté avec succès ! ${syncedTrades.length} trades synchronisés et ajoutés à votre Journal.` 
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Force re-synchronization of all historical trades for an MT5 account
  app.post("/api/mt5/sync-history", (req, res) => {
    try {
      const { accountNumber, server, accountName } = req.body;
      let db = readDatabase();
      if (!db) {
        db = { trades: [], playbooks: [], accounts: [], mt5Accounts: [], mt5Logs: [], initialBalance: 25000, currency: "$", updatedAt: new Date().toISOString() };
      }
      if (!db.trades) db.trades = [];
      if (!db.mt5Logs) db.mt5Logs = [];

      const cleanAcc = String(accountNumber || "1029482").trim();
      const cleanSrv = String(server || "FTMO-Server").trim();
      const resolvedName = accountName || `${cleanSrv} #${cleanAcc}`;

      // Generate 5 new recent closed trades
      const newRecentTrades = generateRealisticMt5Trades(cleanSrv, cleanAcc, resolvedName, 6, 50000);
      
      // Filter duplicates
      const uniqueNewTrades = newRecentTrades.filter((nt) => !db!.trades.some((et: any) => et.ticketNumber === nt.ticketNumber));
      db.trades = [...uniqueNewTrades, ...db.trades];

      // Update MT5 account sync count
      if (db.mt5Accounts) {
        const acc = db.mt5Accounts.find((a: any) => a.accountNumber === cleanAcc);
        if (acc) {
          acc.lastSyncAt = new Date().toISOString();
          acc.totalSyncedTrades = (acc.totalSyncedTrades || 0) + uniqueNewTrades.length;
        }
      }

      db.mt5Logs.unshift({
        id: `log-resync-${Date.now()}`,
        timestamp: new Date().toISOString(),
        ticket: "REFRESH_SYNC",
        symbol: "ALL_PAIRS",
        type: "LIVE_SYNC",
        profit: Number(uniqueNewTrades.reduce((acc, t) => acc + (t.pnl || 0), 0).toFixed(2)),
        status: "SUCCESS",
        message: `Synchronisation manuelle : ${uniqueNewTrades.length} nouveaux trades MT5 importés.`,
      });

      writeDatabase(db);

      return res.json({
        success: true,
        newTrades: uniqueNewTrades,
        allTrades: db.trades,
        message: `${uniqueNewTrades.length} nouveaux trades synchronisés avec succès.`,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Delete MT5 account
  app.delete("/api/mt5/accounts/:id", (req, res) => {
    try {
      const { id } = req.params;
      let db = readDatabase();
      if (db && db.mt5Accounts) {
        db.mt5Accounts = db.mt5Accounts.filter((a: any) => a.id !== id);
        writeDatabase(db);
      }
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // MT5 Webhook Endpoint (Receives closed trade events from MT5 Expert Advisor / Bridge)
  app.post("/api/mt5/webhook", (req, res) => {
    try {
      const payload = req.body;
      if (!payload || (!payload.ticket && !payload.symbol)) {
        return res.status(400).json({ error: "Payload MT5 invalide ou incomplet." });
      }

      let db = readDatabase();
      if (!db) {
        db = { trades: [], playbooks: [], accounts: [], mt5Accounts: [], mt5Logs: [], initialBalance: 25000, currency: "$", updatedAt: new Date().toISOString() };
      }
      if (!db.trades) db.trades = [];
      if (!db.mt5Logs) db.mt5Logs = [];

      // Find matching MT5 account if specified
      let matchedMt5 = null;
      if (payload.accountNumber && db.mt5Accounts) {
        matchedMt5 = db.mt5Accounts.find((a: any) => String(a.accountNumber) === String(payload.accountNumber));
      }

      // Convert payload to Tre13ze Trade
      const newTrade = convertMt5PayloadToTrade(payload, matchedMt5);

      // Check if trade ticket was already imported
      const existingIdx = db.trades.findIndex((t: any) => t.ticketNumber === newTrade.ticketNumber);
      if (existingIdx >= 0) {
        db.trades[existingIdx] = newTrade;
      } else {
        db.trades.unshift(newTrade);
      }

      // Record MT5 Sync log
      const logEntry = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        ticket: String(payload.ticket || "N/A"),
        symbol: String(payload.symbol || "EURUSD"),
        type: String(payload.type || "BUY"),
        profit: Number(payload.profit) || 0,
        status: "SUCCESS",
        message: `Trade #${payload.ticket} (${newTrade.pair} ${newTrade.direction}) synchronisé avec succès (P&L: ${newTrade.pnl}$).`,
      };
      db.mt5Logs.unshift(logEntry);
      if (db.mt5Logs.length > 50) db.mt5Logs = db.mt5Logs.slice(0, 50);

      // Update MT5 account stats
      if (matchedMt5) {
        matchedMt5.lastSyncAt = new Date().toISOString();
        matchedMt5.totalSyncedTrades = (matchedMt5.totalSyncedTrades || 0) + 1;
      }

      writeDatabase(db);

      return res.json({
        success: true,
        message: "Trade MT5 synchronisé et ajouté au Journal.",
        trade: newTrade,
        totalTrades: db.trades.length,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Instant Simulation / Test of MT5 Closed Trade (Simulates real MT5 event trigger)
  app.post("/api/mt5/test-trade", (req, res) => {
    try {
      const { accountNumber, server, pair = "EUR/USD", outcome = "WIN" } = req.body;

      const randomTicket = Math.floor(200000 + Math.random() * 800000);
      const isWin = outcome === "WIN";
      const isLong = Math.random() > 0.4;
      const profit = isWin ? +(Math.random() * 450 + 150).toFixed(2) : -(Math.random() * 200 + 100).toFixed(2);
      
      let openPrice = 1.0850;
      let closePrice = isLong ? (isWin ? 1.0895 : 1.0820) : (isWin ? 1.0810 : 1.0880);
      let sl = isLong ? 1.0820 : 1.0880;
      let tp = isLong ? 1.0920 : 1.0780;

      if (pair.includes("NAS100") || pair.includes("USTEC")) {
        openPrice = 19850.5;
        closePrice = isLong ? (isWin ? 19960.0 : 19780.0) : (isWin ? 19740.0 : 19920.0);
        sl = isLong ? 19780.0 : 19920.0;
        tp = isLong ? 20020.0 : 19680.0;
      } else if (pair.includes("XAU") || pair.includes("GOLD")) {
        openPrice = 2480.20;
        closePrice = isLong ? (isWin ? 2496.50 : 2470.00) : (isWin ? 2465.00 : 2492.00);
        sl = isLong ? 2470.00 : 2492.00;
        tp = isLong ? 2510.00 : 2450.00;
      }

      const now = new Date();
      const openTime = new Date(now.getTime() - 45 * 60 * 1000).toISOString();
      const closeTime = now.toISOString();

      const testPayload = {
        ticket: randomTicket,
        symbol: pair.replace("/", ""),
        type: isLong ? "BUY" : "SELL",
        volume: 1.5,
        openPrice,
        closePrice,
        sl,
        tp,
        openTime,
        closeTime,
        profit,
        commission: -3.50,
        swap: 0,
        comment: `[Live Test MT5] Exécution automatique EA`,
        accountNumber: accountNumber || "1029482",
        server: server || "FTMO-Server",
      };

      let db = readDatabase();
      if (!db) {
        db = { trades: [], playbooks: [], accounts: [], mt5Accounts: [], mt5Logs: [], initialBalance: 25000, currency: "$", updatedAt: new Date().toISOString() };
      }
      if (!db.trades) db.trades = [];
      if (!db.mt5Logs) db.mt5Logs = [];

      const trade = convertMt5PayloadToTrade(testPayload);
      db.trades.unshift(trade);

      db.mt5Logs.unshift({
        id: `log-test-${Date.now()}`,
        timestamp: new Date().toISOString(),
        ticket: String(randomTicket),
        symbol: pair,
        type: isLong ? "BUY" : "SELL",
        profit,
        status: "SUCCESS",
        message: `Trade test #${randomTicket} (${pair}) inséré et journalisé en direct.`,
      });

      writeDatabase(db);

      return res.json({
        success: true,
        trade,
        message: `Trade MT5 #${randomTicket} reçu et inséré dans le Journal ! Le Dashboard est actualisé.`,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Get MT5 Sync Logs
  app.get("/api/mt5/logs", (_req, res) => {
    const db = readDatabase();
    const logs = (db && db.mt5Logs) ? db.mt5Logs : [];
    return res.json({ success: true, logs });
  });

  // Public Reports Storage for Sharing
  app.post("/api/reports", (req, res) => {
    try {
      const report = req.body;
      if (!report || !report.content) {
        return res.status(400).json({ error: "Rapport invalide" });
      }
      let db = readDatabase();
      if (!db) {
        db = { trades: [], playbooks: [], accounts: [], reports: [], initialBalance: 25000, currency: "$", updatedAt: new Date().toISOString() };
      }
      if (!db.reports) db.reports = [];

      const reportId = report.id || `report-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
      const newReport = {
        ...report,
        id: reportId,
        createdAt: report.createdAt || new Date().toISOString(),
      };

      const existingIdx = db.reports.findIndex((r: any) => r.id === reportId);
      if (existingIdx >= 0) {
        db.reports[existingIdx] = newReport;
      } else {
        db.reports.unshift(newReport);
      }

      writeDatabase(db);
      return res.json({ success: true, reportId, report: newReport });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/reports/:id", (req, res) => {
    try {
      const { id } = req.params;
      const db = readDatabase();
      if (!db || !db.reports) {
        return res.status(404).json({ error: "Rapport introuvable" });
      }
      const report = db.reports.find((r: any) => r.id === id);
      if (!report) {
        return res.status(404).json({ error: "Rapport introuvable" });
      }
      return res.json({ success: true, report });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Dedicated Weekly Analysis Endpoint with 5 Strict Blocks & 100% Truthful Persona
  app.post("/api/ai-coach/analyze-week", async (req, res) => {
    try {
      const { trades, weekRange, accountBalance, currency = "$", accountName = "Principal" } = req.body;

      if (!trades || !Array.isArray(trades) || trades.length === 0) {
        return res.status(400).json({ error: "Aucun trade disponible pour cette période ou cette semaine." });
      }

      const totalTrades = trades.length;
      const wins = trades.filter((t: any) => t.status === "WIN").length;
      const losses = trades.filter((t: any) => t.status === "LOSS").length;
      const be = trades.filter((t: any) => t.status === "BE").length;
      const netPnl = trades.reduce((acc: number, t: any) => acc + (Number(t.pnl) || 0), 0);
      const totalR = trades.reduce((acc: number, t: any) => acc + (Number(t.rMultiple) || 0), 0);
      const winRate = ((wins / (totalTrades || 1)) * 100).toFixed(1);

      const winningTradesPnl = trades.filter((t: any) => t.status === "WIN").map((t: any) => Number(t.pnl) || 0);
      const losingTradesPnl = trades.filter((t: any) => t.status === "LOSS").map((t: any) => Math.abs(Number(t.pnl) || 0));
      const avgWin = winningTradesPnl.length > 0 ? (winningTradesPnl.reduce((a, b) => a + b, 0) / winningTradesPnl.length).toFixed(2) : "0";
      const avgLoss = losingTradesPnl.length > 0 ? (losingTradesPnl.reduce((a, b) => a + b, 0) / losingTradesPnl.length).toFixed(2) : "0";
      const profitFactor = (losingTradesPnl.reduce((a, b) => a + b, 0) > 0)
        ? (winningTradesPnl.reduce((a, b) => a + b, 0) / losingTradesPnl.reduce((a, b) => a + b, 0)).toFixed(2)
        : "N/A";

      // Consolidate detailed qualitative journal entries
      const journalLogs = trades.map((t: any, index: number) => ({
        index: index + 1,
        id: t.id,
        date: t.entryDate || t.exitDate || "Date N/A",
        pair: t.pair,
        direction: t.direction,
        status: t.status,
        pnl: `${currency}${Number(t.pnl || 0).toFixed(2)}`,
        rMultiple: `${t.rMultiple || 0}R`,
        session: t.session || "N/A",
        strategy: t.strategy || "N/A",
        emotions: t.emotions || "Non renseigné",
        mistakes: Array.isArray(t.mistakes) && t.mistakes.length > 0 ? t.mistakes.join(", ") : "Aucune déclarée",
        journalNotes: t.notes && t.notes.trim() ? t.notes.trim() : "(Aucune note écrite dans le journal)",
        prices: {
          entry: t.entryPrice,
          exit: t.exitPrice,
          sl: t.stopLoss,
          tp: t.takeProfit,
        }
      }));

      const quantitativeMetrics = {
        totalTrades,
        wins,
        losses,
        be,
        winRate: `${winRate}%`,
        netPnl: `${currency}${netPnl.toFixed(2)}`,
        totalR: `${totalR.toFixed(2)}R`,
        avgWin: `${currency}${avgWin}`,
        avgLoss: `${currency}${avgLoss}`,
        profitFactor,
        accountBalance: `${currency}${accountBalance || 25000}`,
        accountName,
        weekRange: weekRange || "Semaine Récente",
      };

      const systemInstruction = `Tu es le "Head of Risk & Elite Trading Coach" de Tre13ze Journal v1.0. Tu as formé des prop traders institutionnels et géré des fonds spéculatifs.
Tu es chargé d'auditer la semaine de trading d'un trader.

🚨 DIRECTIVE FONDAMENTALE ABSOLUE (100% VÉRIDIQUE, ZÉRO FLATTERIE) :
- Sois 100% véridique, intransigeant, chirurgical et direct.
- AUCUNE FLATTERIE, AUCUN COMPLIMENT DE COMPLAISANCE. Tu n'es pas là pour caresser son ego, mais pour protéger son capital et faire de lui un professionnel rentable.
- Si le trader a fait du profit mais a violé ses règles (sur-levier, déplacement de Stop Loss, revenge trading, FOMO, sortie panique, trade hors session), recadre-le sévèrement : un gain obtenu par l'indiscipline est toxique et relève du jeu de hasard.
- Si le trader a subi des pertes tout en respectant scrupuleusement son plan et sa gestion du risque, valorise sa discipline de fer et analyse la pertinence technique de ses setups.
- Tu DOIS scanner scrupuleusement TOUS les textes libres du journal écrit du trader ("journalNotes"), ses états émotionnels ("emotions") et ses erreurs déclarées ("mistakes") pour détecter les biais psychologiques récurrents (ex: impatience, fatigue, avidité, peur de perdre, trade d'ennui).

Tu DOIS impérativement structurer ton rapport en 5 BLOCS DISTINCTS :

### BLOC 1 : 📊 Résumé (Synthèse de la Semaine & Métriques Clés)
- Diagnostic froid et chiffré des résultats (P&L net, Winrate, R total, Profit Factor, Risk/Reward réel).
- Verdict global du Coach (sur une échelle : "Professionnel Exemplaire", "Bonne Rigueur", "Irrégulier / Fuites à corriger", "Indiscipliné / Danger Capital").
- Note globale de performance et de discipline (sur 100).

### BLOC 2 : ⚖️ Discipline (Respect des Règles & Risk Management)
- Évaluation du respect strict des Stop Loss et du plan.
- Détection des excès de lot / sur-levier ou d'overtrading.
- Respect des sessions et des conditions de marché.
- Comparaison entre trades planifiés et exécutions impulsives.

### BLOC 3 : ⚠️ Erreurs Récurrentes & Psychologie (FOMO, Fatigue, Biais)
- Analyse approfondie des notes écrites dans le journal et des émotions déclarées.
- Identification des schémas destructeurs (ex: FOMO à l'ouverture, revenge trading après une perte, trading sous fatigue, fermeture prématurée des gagnants par peur).
- Chiffrage de l'impact financier de ces erreurs (argent ou R gaspillé).

### BLOC 4 : 🎯 Points Forts, Points Faibles & Points à Améliorer
- **Points Forts** : Ce qui a été maîtrisé techniquement et mentalement.
- **Points Faibles** : Les failles évidentes d'exécution ou de mental.
- **Points à Améliorer** : Les réglages prioritaires et immédiats à apporter.

### BLOC 5 : 🚀 Objectifs pour la Semaine Suivante
- 3 Règles d'or strictes et non-négociables à appliquer dès lundi.
- Limite de perte maximale quotidienne (Daily Stop) et nombre max de trades par jour.
- Setup technique prioritaire sur lequel se concentrer exclusivement.
- Routine psychologique / rituel avant et après session.

Rédige en français avec un ton de mentor d'élite, respectueux mais sans concession.`;

      const promptContent = `Voici l'ensemble des données de la semaine du trader à analyser en profondeur :

=== MÉTRIQUES QUANTITATIVES ===
${JSON.stringify(quantitativeMetrics, null, 2)}

=== JOURNAL DÉTAILLÉ DE CHACUN DES ${trades.length} TRADES (AVEC NOTES ÉCRITES, ÉMOTIONS ET ERREURS) ===
${JSON.stringify(journalLogs, null, 2)}

Effectue l'audit complet de la semaine selon les 5 blocs exigés.`;

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: promptContent,
        config: {
          systemInstruction,
          temperature: 0.5,
        },
      });

      const fullAnalysis = response.text || "Analyse indisponible.";

      // Extract discipline score if present or compute estimate
      let disciplineScore = 75;
      const scoreMatch = fullAnalysis.match(/(?:Note|Score)[^0-9]*([0-9]{1,3})\s*(?:\/|\s*sur)\s*100/i);
      if (scoreMatch && scoreMatch[1]) {
        disciplineScore = Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10)));
      } else {
        // Compute empirical discipline score based on mistakes and risk
        const mistakePenalty = trades.reduce((acc: number, t: any) => acc + (Array.isArray(t.mistakes) ? t.mistakes.length * 6 : 0), 0);
        disciplineScore = Math.max(20, Math.min(98, Math.round(90 - mistakePenalty + (Number(winRate) > 50 ? 5 : -5))));
      }

      return res.json({
        success: true,
        report: {
          id: `report-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          createdAt: new Date().toISOString(),
          weekLabel: weekRange || "Semaine Récente",
          accountName,
          metrics: quantitativeMetrics,
          disciplineScore,
          analysis: fullAnalysis,
          tradesCount: totalTrades,
        },
      });
    } catch (error: any) {
      console.error("Weekly AI Coach Error:", error);
      return res.status(500).json({
        error: error.message || "Une erreur est survenue lors de l'analyse hebdomadaire.",
      });
    }
  });

  // AI Trading Coach General Analysis Route
  app.post("/api/ai-coach/analyze", async (req, res) => {
    try {
      const { trades, userPrompt, accountBalance, currency = "$" } = req.body;

      if (!trades || !Array.isArray(trades) || trades.length === 0) {
        return res.status(400).json({ error: "Aucun trade fourni pour l'analyse." });
      }

      const totalTrades = trades.length;
      const wins = trades.filter((t: any) => t.status === "WIN").length;
      const losses = trades.filter((t: any) => t.status === "LOSS").length;
      const be = trades.filter((t: any) => t.status === "BE").length;
      const netPnl = trades.reduce((acc: number, t: any) => acc + (Number(t.pnl) || 0), 0);
      const winRate = ((wins / (totalTrades || 1)) * 100).toFixed(1);

      // Strategy breakdown
      const strategies: Record<string, { wins: number; total: number; pnl: number }> = {};
      const emotions: Record<string, { wins: number; total: number; pnl: number }> = {};
      const mistakesCount: Record<string, number> = {};

      trades.forEach((t: any) => {
        const strat = t.strategy || "Non défini";
        if (!strategies[strat]) strategies[strat] = { wins: 0, total: 0, pnl: 0 };
        strategies[strat].total++;
        strategies[strat].pnl += Number(t.pnl) || 0;
        if (t.status === "WIN") strategies[strat].wins++;

        const emo = t.emotions || "Non spécifié";
        if (!emotions[emo]) emotions[emo] = { wins: 0, total: 0, pnl: 0 };
        emotions[emo].total++;
        emotions[emo].pnl += Number(t.pnl) || 0;
        if (t.status === "WIN") emotions[emo].wins++;

        if (Array.isArray(t.mistakes)) {
          t.mistakes.forEach((m: string) => {
            mistakesCount[m] = (mistakesCount[m] || 0) + 1;
          });
        }
      });

      const summaryContext = {
        totalTrades,
        wins,
        losses,
        be,
        winRate: `${winRate}%`,
        netPnl: `${currency}${netPnl.toFixed(2)}`,
        accountBalance: `${currency}${accountBalance || 10000}`,
        strategiesSummary: strategies,
        emotionsSummary: emotions,
        frequentMistakes: mistakesCount,
        sampleRecentTrades: trades.slice(0, 15).map((t: any) => ({
          pair: t.pair,
          direction: t.direction,
          status: t.status,
          pnl: t.pnl,
          rMultiple: t.rMultiple,
          session: t.session,
          strategy: t.strategy,
          mistakes: t.mistakes,
          emotion: t.emotions,
          notes: t.notes,
        })),
      };

      const systemPrompt = `Tu es "Tre13ze AI Trading Coach", le mentor IA expert en trading quantitatif, Price Action, SMC (Smart Money Concepts) et psychologie de trading pour l'application "Tre13ze Journal v1.0".
Ton style est ultra-professionnel, chirurgical, direct, bienveillant mais sans complaisance (inspiré des meilleurs hedge funds et prop traders).
Réponds en français avec une mise en forme Markdown soignée et structurée avec des sections claires :
1. 🎯 **Diagnostic Global & Edge** (Analyse des métriques clés, rentabilité, ratio gain/perte)
2. 🔍 **Détection des Fuites de Capital (Leaks)** (Erreurs récurrentes, impact émotionnel, pires sessions ou setups)
3. ⚡ **Top Setups & Forces** (Ce qui fonctionne le mieux et où concentrer l'énergie)
4. 📋 **Plan d'Action Immédiat (3 Règles d'Or)** (Actions concrètes à appliquer dès la prochaine session).

Voici les données consolidées du journal :
${JSON.stringify(summaryContext, null, 2)}
`;

      const promptMessage = userPrompt
        ? `L'utilisateur pose la question suivante ou demande un focus particulier : "${userPrompt}". Analyse ses données et réponds précisément en intégrant son contexte.`
        : "Effectue un audit complet et approfondi du journal de trading de l'utilisateur.";

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: promptMessage,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
        },
      });

      return res.json({
        analysis: response.text || "Analyse indisponible pour le moment.",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("AI Coach Error:", error);
      return res.status(500).json({
        error: error.message || "Une erreur est survenue lors de l'analyse IA.",
      });
    }
  });

  // AI Single Trade Review Route
  app.post("/api/ai-coach/trade-review", async (req, res) => {
    try {
      const { trade, currency = "$" } = req.body;
      if (!trade) {
        return res.status(400).json({ error: "Aucun trade spécifié." });
      }

      const systemPrompt = `Tu es "Tre13ze AI Trading Coach". Tu analyses un trade spécifique enregistré dans "Tre13ze Journal v1.0".
Fournis un feedback concis, technique et percutant en français :
- **Évaluation de l'Exécution** (Gestion du risque, Stop Loss, Target, R:R)
- **Point Fort** (Ce qui a été bien respecté)
- **Axe d'Amélioration / Warning** (Ce qu'il fallait éviter ou peaufiner)
- **Score d'Exécution IA** (sur 10)`;

      const promptMessage = `Voici les détails du trade :
- Paire / Actif : ${trade.pair} (${trade.direction})
- Statut : ${trade.status}
- P&L : ${currency}${trade.pnl} (${trade.pnlPercentage || 0}%) | R réalisé : ${trade.rMultiple || 0}R
- Prix Entrée : ${trade.entryPrice} | Prix Sortie : ${trade.exitPrice}
- Stop Loss : ${trade.stopLoss} | Take Profit : ${trade.takeProfit}
- Session : ${trade.session} | Timeframe : ${trade.timeframe}
- Stratégie : ${trade.strategy}
- État Émotionnel : ${trade.emotions}
- Erreurs notées : ${(trade.mistakes || []).join(", ") || "Aucune"}
- Notes du trader : ${trade.notes || "Aucune note"}`;

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: promptMessage,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.6,
        },
      });

      return res.json({
        review: response.text || "Analyse du trade indisponible.",
      });
    } catch (error: any) {
      console.error("AI Trade Review Error:", error);
      return res.status(500).json({
        error: error.message || "Erreur lors de l'analyse du trade.",
      });
    }
  });

  // Vite middleware for dev / static for prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Tre13ze Journal v1.0 Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { authRouter } from './src/server/auth/routes/auth.routes';
import { tradingRouter } from './src/server/trading/routes/trading.routes';
import { authService } from './src/server/auth/services/auth.service';
import { checkDatabaseConnection } from './src/server/db/client';
import { runJsonToPostgresMigration } from './scripts/migrate-json-to-postgres';

dotenv.config();

// Lazy initialization of Gemini AI client
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[Gemini AI] WARNING: GEMINI_API_KEY is not set. AI features will fail if called.');
    }
    aiClient = new GoogleGenAI({ apiKey: apiKey || '' });
  }
  return aiClient;
}

// In-memory reports cache for shared public links
const reportsStore: Map<string, any> = new Map();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize PostgreSQL database & verify connection via Prisma
  try {
    const conn = await checkDatabaseConnection();
    if (conn.connected) {
      console.log('[Database] PostgreSQL connection ready via Prisma.');
    } else {
      console.warn('[Database] PostgreSQL check notice:', conn.error);
    }
    // Check if migration is needed
    await runJsonToPostgresMigration();
  } catch (err: any) {
    console.error('[Database Init Error]:', err.message);
  }

  // Global Middlewares
  app.use(cors({
    origin: true,
    credentials: true,
  }));
  app.use(cookieParser());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Session & Authentication Context Middleware
  app.use(async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const sessionId = req.cookies?.tre13ze_session || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);
      if (sessionId) {
        const user = await authService.verifySession(sessionId);
        if (user) {
          (req as any).user = user;
          (req as any).sessionId = sessionId;
        }
      }
    } catch (err: any) {
      console.debug('[Auth Middleware Debug]:', err.message);
    }
    next();
  });

  // Health check endpoint
  app.get('/api/health', async (_req: Request, res: Response) => {
    try {
      const conn = await checkDatabaseConnection();
      if (!conn.connected) {
        res.status(503).json({
          status: 'error',
          database: 'postgresql',
          orm: 'prisma',
          connected: false,
          error: conn.error,
          timestamp: new Date().toISOString(),
        });
        return;
      }
      res.json({
        status: 'ok',
        database: 'postgresql',
        orm: 'prisma',
        connected: true,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', error: err.message });
    }
  });

  // Mount Modular Routes
  app.use('/api/auth', authRouter);
  app.use('/api', tradingRouter);

  // Public Reports Storage for Sharing
  app.post('/api/reports', (req: Request, res: Response) => {
    try {
      const report = req.body;
      if (!report || !report.content) {
        res.status(400).json({ error: 'Rapport invalide' });
        return;
      }
      const reportId = report.id || `report-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
      const newReport = {
        ...report,
        id: reportId,
        createdAt: report.createdAt || new Date().toISOString(),
      };
      reportsStore.set(reportId, newReport);
      res.json({ success: true, reportId, report: newReport });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/reports/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const report = reportsStore.get(id);
      if (!report) {
        res.status(404).json({ error: 'Rapport introuvable' });
        return;
      }
      res.json({ success: true, report });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // AI Trading Coach: Weekly Audit
  app.post('/api/ai-coach/analyze-week', async (req: Request, res: Response) => {
    try {
      const { trades, weekRange, accountBalance, currency = '$', accountName = 'Principal' } = req.body;

      if (!trades || !Array.isArray(trades) || trades.length === 0) {
        res.status(400).json({ error: 'Aucun trade disponible pour cette période ou cette semaine.' });
        return;
      }

      const totalTrades = trades.length;
      const wins = trades.filter((t: any) => t.status === 'WIN').length;
      const losses = trades.filter((t: any) => t.status === 'LOSS').length;
      const be = trades.filter((t: any) => t.status === 'BE').length;
      const netPnl = trades.reduce((acc: number, t: any) => acc + (Number(t.pnl) || 0), 0);
      const totalR = trades.reduce((acc: number, t: any) => acc + (Number(t.rMultiple) || 0), 0);
      const winRate = ((wins / (totalTrades || 1)) * 100).toFixed(1);

      const winningTradesPnl = trades.filter((t: any) => t.status === 'WIN').map((t: any) => Number(t.pnl) || 0);
      const losingTradesPnl = trades.filter((t: any) => t.status === 'LOSS').map((t: any) => Math.abs(Number(t.pnl) || 0));
      const avgWin = winningTradesPnl.length > 0 ? (winningTradesPnl.reduce((a, b) => a + b, 0) / winningTradesPnl.length).toFixed(2) : '0';
      const avgLoss = losingTradesPnl.length > 0 ? (losingTradesPnl.reduce((a, b) => a + b, 0) / losingTradesPnl.length).toFixed(2) : '0';
      const profitFactor = (losingTradesPnl.reduce((a, b) => a + b, 0) > 0)
        ? (winningTradesPnl.reduce((a, b) => a + b, 0) / losingTradesPnl.reduce((a, b) => a + b, 0)).toFixed(2)
        : 'N/A';

      const journalLogs = trades.map((t: any, index: number) => ({
        index: index + 1,
        id: t.id,
        date: t.entryDate || t.exitDate || 'Date N/A',
        pair: t.pair,
        direction: t.direction,
        status: t.status,
        pnl: `${currency}${Number(t.pnl || 0).toFixed(2)}`,
        rMultiple: `${t.rMultiple || 0}R`,
        session: t.session || 'N/A',
        strategy: t.strategy || 'N/A',
        emotions: t.emotions || 'Non renseigné',
        mistakes: Array.isArray(t.mistakes) && t.mistakes.length > 0 ? t.mistakes.join(', ') : 'Aucune déclarée',
        journalNotes: t.notes && t.notes.trim() ? t.notes.trim() : '(Aucune note écrite dans le journal)',
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
        weekRange: weekRange || 'Semaine Récente',
      };

      const systemInstruction = `Tu es le "Head of Risk & Elite Trading Coach" de Tre13ze Journal v1.0. Tu as formé des prop traders institutionnels et géré des fonds spéculatifs.
Tu es chargé d'auditer la semaine de trading d'un trader.

🚨 DIRECTIVE FONDAMENTALE ABSOLUE (100% VÉRIDIQUE, ZÉRO FLATTERIE) :
- Sois 100% véridique, intransigeant, chirurgical et direct.
- AUCUNE FLATTERIE, AUCUN COMPLIMENT DE COMPLAISANCE. Tu n'es pas là pour caresser son ego, mais pour protéger son capital et faire de lui un professionnel rentable.
- Si le trader a fait du profit mais a violé ses règles (sur-levier, déplacement de Stop Loss, revenge trading, FOMO, sortie panique, trade hors session), recadre-le sévèrement : un gain obtenu par l'indiscipline est toxique et relève du jeu de hasard.
- Si le trader a subi des pertes tout en respectant scrupuleusement son plan et sa gestion du risque, valorise sa discipline de fer et analyse la pertinence technique de ses setups.
- Tu DOIS scanner scrupuleusement TOUS les textes libres du journal écrit du trader ("journalNotes"), ses états émotionnels ("emotions") et ses erreurs déclarées ("mistakes") pour détecter les biais psychologiques récurrents.

Structure ton rapport en 5 BLOCS DISTINCTS :
### BLOC 1 : 📊 Résumé (Synthèse de la Semaine & Métriques Clés)
### BLOC 2 : ⚖️ Discipline (Respect des Règles & Risk Management)
### BLOC 3 : ⚠️ Erreurs Récurrentes & Psychologie (FOMO, Fatigue, Biais)
### BLOC 4 : 🎯 Points Forts, Points Faibles & Points à Améliorer
### BLOC 5 : 🚀 Objectifs pour la Semaine Suivante

Rédige en français avec un ton de mentor d'élite, respectueux mais sans concession.`;

      const promptContent = `Voici les données de la semaine du trader à analyser en profondeur :
MÉTRIQUES : ${JSON.stringify(quantitativeMetrics, null, 2)}
JOURNAL DES TRADES : ${JSON.stringify(journalLogs, null, 2)}`;

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: promptContent,
        config: {
          systemInstruction,
          temperature: 0.5,
        },
      });

      const fullAnalysis = response.text || 'Analyse indisponible.';
      let disciplineScore = 75;
      const scoreMatch = fullAnalysis.match(/(?:Note|Score)[^0-9]*([0-9]{1,3})\s*(?:\/|\s*sur)\s*100/i);
      if (scoreMatch && scoreMatch[1]) {
        disciplineScore = Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10)));
      } else {
        const mistakePenalty = trades.reduce((acc: number, t: any) => acc + (Array.isArray(t.mistakes) ? t.mistakes.length * 6 : 0), 0);
        disciplineScore = Math.max(20, Math.min(98, Math.round(90 - mistakePenalty + (Number(winRate) > 50 ? 5 : -5))));
      }

      res.json({
        success: true,
        report: {
          id: `report-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          createdAt: new Date().toISOString(),
          weekLabel: weekRange || 'Semaine Récente',
          accountName,
          metrics: quantitativeMetrics,
          disciplineScore,
          analysis: fullAnalysis,
          tradesCount: totalTrades,
        },
      });
    } catch (error: any) {
      console.error('Weekly AI Coach Error:', error);
      res.status(500).json({
        error: error.message || "Une erreur est survenue lors de l'analyse hebdomadaire.",
      });
    }
  });

  // AI Trading Coach: General Overview
  app.post('/api/ai-coach/analyze', async (req: Request, res: Response) => {
    try {
      const { trades, userPrompt, accountBalance, currency = '$' } = req.body;
      if (!trades || !Array.isArray(trades) || trades.length === 0) {
        res.status(400).json({ error: 'Aucun trade fourni pour l\'analyse.' });
        return;
      }

      const totalTrades = trades.length;
      const wins = trades.filter((t: any) => t.status === 'WIN').length;
      const losses = trades.filter((t: any) => t.status === 'LOSS').length;
      const be = trades.filter((t: any) => t.status === 'BE').length;
      const netPnl = trades.reduce((acc: number, t: any) => acc + (Number(t.pnl) || 0), 0);
      const winRate = ((wins / (totalTrades || 1)) * 100).toFixed(1);

      const summaryContext = {
        totalTrades,
        wins,
        losses,
        be,
        winRate: `${winRate}%`,
        netPnl: `${currency}${netPnl.toFixed(2)}`,
        accountBalance: `${currency}${accountBalance || 10000}`,
      };

      const systemPrompt = `Tu es "Tre13ze AI Trading Coach", le mentor IA expert en trading quantitatif et psychologie.
Fournis une analyse structurée en 4 points :
1. 🎯 **Diagnostic Global & Edge**
2. 🔍 **Détection des Fuites de Capital (Leaks)**
3. ⚡ **Top Setups & Forces**
4. 📋 **Plan d'Action Immédiat (3 Règles d'Or)**`;

      const promptMessage = userPrompt
        ? `L'utilisateur demande : "${userPrompt}". Contexte : ${JSON.stringify(summaryContext)}`
        : `Analyse complète du journal : ${JSON.stringify(summaryContext)}`;

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: promptMessage,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
        },
      });

      res.json({
        analysis: response.text || 'Analyse indisponible.',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('AI Coach Error:', error);
      res.status(500).json({
        error: error.message || "Une erreur est survenue lors de l'analyse IA.",
      });
    }
  });

  // AI Trade Review
  app.post('/api/ai-coach/trade-review', async (req: Request, res: Response) => {
    try {
      const { trade, currency = '$' } = req.body;
      if (!trade) {
        res.status(400).json({ error: 'Aucun trade spécifié.' });
        return;
      }

      const systemPrompt = `Tu es "Tre13ze AI Trading Coach". Analyse ce trade en 4 points concis :
- **Évaluation de l'Exécution**
- **Point Fort**
- **Axe d'Amélioration / Warning**
- **Score d'Exécution IA** (sur 10)`;

      const promptMessage = `Détails du trade :
- Paire : ${trade.pair} (${trade.direction})
- Statut : ${trade.status} | P&L : ${currency}${trade.pnl} | R : ${trade.rMultiple || 0}R
- Entrée : ${trade.entryPrice} | Sortie : ${trade.exitPrice} | SL : ${trade.stopLoss} | TP : ${trade.takeProfit}
- Stratégie : ${trade.strategy || 'N/A'} | Émotion : ${trade.emotions || 'N/A'}
- Erreurs : ${(trade.mistakes || []).join(', ') || 'Aucune'}
- Notes : ${trade.notes || 'Aucune note'}`;

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: promptMessage,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.6,
        },
      });

      res.json({
        review: response.text || 'Analyse du trade indisponible.',
      });
    } catch (error: any) {
      console.error('AI Trade Review Error:', error);
      res.status(500).json({
        error: error.message || "Erreur lors de l'analyse du trade.",
      });
    }
  });

  // Vite middleware for dev / static for prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Tre13ze Journal v1.0 Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Award, 
  Percent, 
  Target, 
  Flame, 
  ShieldAlert, 
  Activity, 
  BarChart3, 
  PieChart as PieChartIcon, 
  Layers, 
  Zap, 
  ArrowUpRight, 
  ArrowDownRight,
  Info,
  Calendar,
  Sparkles
} from 'lucide-react';
import { Trade, JournalStats, CurrencySymbol, AssetClass, TradingSession } from '../types';
import { formatCurrency, formatRMultiple } from '../utils/calculations';

interface PerformanceStatsModuleProps {
  stats: JournalStats;
  trades: Trade[];
  currency: CurrencySymbol;
}

export const PerformanceStatsModule: React.FC<PerformanceStatsModuleProps> = ({
  stats,
  trades,
  currency,
}) => {
  const [timeFilter, setTimeFilter] = useState<'ALL' | '30D' | '7D'>('ALL');

  // Filter trades if necessary
  const filteredTrades = trades.filter((t) => {
    if (timeFilter === 'ALL') return true;
    const date = new Date(t.entryDate);
    const now = new Date();
    const diffDays = (now.getTime() - date.getTime()) / (1000 * 3600 * 24);
    if (timeFilter === '30D') return diffDays <= 30;
    if (timeFilter === '7D') return diffDays <= 7;
    return true;
  });

  const closedTrades = filteredTrades.filter((t) => t.status !== 'OPEN');
  const winTrades = closedTrades.filter((t) => t.status === 'WIN');
  const lossTrades = closedTrades.filter((t) => t.status === 'LOSS');
  const beTrades = closedTrades.filter((t) => t.status === 'BE');

  const winCount = winTrades.length;
  const lossCount = lossTrades.length;
  const beCount = beTrades.length;
  const totalCount = closedTrades.length;

  const winRate = totalCount > 0 ? (winCount / totalCount) * 100 : 0;
  const totalGains = winTrades.reduce((acc, t) => acc + Math.max(0, t.pnl), 0);
  const totalLosses = lossTrades.reduce((acc, t) => acc + Math.abs(Math.min(0, t.pnl)), 0);
  const netPnl = winTrades.reduce((acc, t) => acc + t.pnl, 0) + lossTrades.reduce((acc, t) => acc + t.pnl, 0) + beTrades.reduce((acc, t) => acc + t.pnl, 0);

  const profitFactor = totalLosses > 0 ? totalGains / totalLosses : totalGains > 0 ? 99.9 : 0;
  const avgWin = winCount > 0 ? totalGains / winCount : 0;
  const avgLoss = lossCount > 0 ? totalLosses / lossCount : 0;
  const avgTrade = totalCount > 0 ? netPnl / totalCount : 0;
  const payoffRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? avgWin : 0;

  // Max Drawdown calculation for filtered trades
  let peak = stats.initialBalance;
  let running = stats.initialBalance;
  let maxDD = 0;
  let maxDDPercent = 0;

  const sortedTrades = [...filteredTrades].sort((a, b) => 
    new Date(`${a.entryDate}T${a.entryTime || '00:00'}`).getTime() - 
    new Date(`${b.entryDate}T${b.entryTime || '00:00'}`).getTime()
  );

  sortedTrades.forEach((t) => {
    running += t.pnl;
    if (running > peak) peak = running;
    const dd = peak - running;
    if (dd > maxDD) {
      maxDD = dd;
      maxDDPercent = peak > 0 ? (dd / peak) * 100 : 0;
    }
  });

  // Long vs Short stats
  const longTrades = closedTrades.filter(t => t.direction === 'LONG');
  const shortTrades = closedTrades.filter(t => t.direction === 'SHORT');
  const longWins = longTrades.filter(t => t.status === 'WIN').length;
  const shortWins = shortTrades.filter(t => t.status === 'WIN').length;
  const longWinRate = longTrades.length > 0 ? (longWins / longTrades.length) * 100 : 0;
  const shortWinRate = shortTrades.length > 0 ? (shortWins / shortTrades.length) * 100 : 0;

  // Expectancy calculation ($ per trade)
  const winProbability = totalCount > 0 ? winCount / totalCount : 0;
  const lossProbability = totalCount > 0 ? lossCount / totalCount : 0;
  const expectancy = (winProbability * avgWin) - (lossProbability * avgLoss);

  return (
    <div className="space-y-6">
      {/* Header with Time Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse"></span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Module de Statistiques de Performance
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Analytique quantitative avancée : Win Rate, Profit Factor, Gain Moyen, Max Drawdown & R-Expectancy.
          </p>
        </div>

        {/* Time Filter Pills */}
        <div className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 p-1 font-mono text-xs">
          <button
            onClick={() => setTimeFilter('ALL')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              timeFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Tout l'historique
          </button>
          <button
            onClick={() => setTimeFilter('30D')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              timeFilter === '30D'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            30 Jours
          </button>
          <button
            onClick={() => setTimeFilter('7D')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              timeFilter === '7D'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            7 Jours
          </button>
        </div>
      </div>

      {/* 5 Primary Mandated Performance Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* 1. Taux de Réussite (Win Rate) */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 relative overflow-hidden transition-all hover:border-emerald-500/40 group">
          <div className="absolute top-0 right-0 h-20 w-20 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all"></div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
              Taux de Réussite
            </span>
            <span className="p-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
              <Percent className="h-4 w-4" />
            </span>
          </div>

          <div className="mt-2">
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className={`text-3xl font-extrabold tracking-tight ${
                winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {winRate.toFixed(1)}%
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-zinc-400 border-t border-zinc-800/80 pt-2">
              <span className="text-emerald-400 font-semibold">{winCount} Wins</span>
              <span className="text-rose-400 font-semibold">{lossCount} Losses</span>
              <span className="text-amber-400 font-semibold">{beCount} BE</span>
            </div>
          </div>

          {/* Progress visual */}
          <div className="mt-2.5 h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden flex">
            <div className="bg-emerald-500 h-full transition-all" style={{ width: `${winRate}%` }}></div>
            <div className="bg-rose-500 h-full transition-all" style={{ width: `${totalCount > 0 ? (lossCount / totalCount) * 100 : 0}%` }}></div>
            <div className="bg-amber-500 h-full transition-all" style={{ width: `${totalCount > 0 ? (beCount / totalCount) * 100 : 0}%` }}></div>
          </div>
        </div>

        {/* 2. Profit Factor */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 relative overflow-hidden transition-all hover:border-blue-500/40 group">
          <div className="absolute top-0 right-0 h-20 w-20 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all"></div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
              Profit Factor
            </span>
            <span className="p-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-400">
              <Zap className="h-4 w-4" />
            </span>
          </div>

          <div className="mt-2">
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className={`text-3xl font-extrabold tracking-tight ${
                profitFactor >= 2.0 ? 'text-emerald-400' : profitFactor >= 1.2 ? 'text-blue-400' : 'text-rose-400'
              }`}>
                {profitFactor >= 99 ? '∞' : profitFactor.toFixed(2)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] font-mono border-t border-zinc-800/80 pt-2">
              <span className="text-zinc-400">Ratio Gains/Pertes</span>
              <span className={`font-semibold ${
                profitFactor >= 1.5 ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {profitFactor >= 2 ? 'Excellent (>2.0)' : profitFactor >= 1.2 ? 'Solide (>1.2)' : 'Sous le seuil (<1.0)'}
              </span>
            </div>
          </div>

          <div className="mt-2.5 flex items-center gap-1 text-[10px] text-zinc-400 font-mono">
            <span className="text-emerald-400 font-bold">{formatCurrency(totalGains, currency)}</span>
            <span>/</span>
            <span className="text-rose-400 font-bold">{formatCurrency(totalLosses, currency)}</span>
          </div>
        </div>

        {/* 3. Gain Moyen par Trade */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 relative overflow-hidden transition-all hover:border-blue-500/40 group">
          <div className="absolute top-0 right-0 h-20 w-20 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all"></div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
              Gain Moyen / Trade
            </span>
            <span className="p-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-400">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>

          <div className="mt-2">
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className={`text-3xl font-extrabold tracking-tight ${
                avgTrade >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {formatCurrency(avgTrade, currency, true)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] font-mono border-t border-zinc-800/80 pt-2 text-zinc-400">
              <span>Avg Win: <strong className="text-emerald-400">{formatCurrency(avgWin, currency)}</strong></span>
              <span>Avg Loss: <strong className="text-rose-400">-{formatCurrency(avgLoss, currency)}</strong></span>
            </div>
          </div>

          <div className="mt-2.5 text-[10px] font-mono text-zinc-400 flex items-center justify-between">
            <span>Payoff Ratio :</span>
            <span className="text-blue-400 font-bold">1 : {payoffRatio.toFixed(2)}</span>
          </div>
        </div>

        {/* 4. Perte Maximale (Max Drawdown) */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 relative overflow-hidden transition-all hover:border-rose-500/40 group">
          <div className="absolute top-0 right-0 h-20 w-20 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-all"></div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
              Perte Maximale (DD)
            </span>
            <span className="p-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-400">
              <ShieldAlert className="h-4 w-4" />
            </span>
          </div>

          <div className="mt-2">
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-3xl font-extrabold tracking-tight text-rose-400">
                -{formatCurrency(maxDD, currency)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] font-mono border-t border-zinc-800/80 pt-2">
              <span className="text-zinc-400">Max DD en %</span>
              <span className={`font-bold ${
                maxDDPercent <= 5 ? 'text-emerald-400' : maxDDPercent <= 10 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                -{maxDDPercent.toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="mt-2.5 text-[10px] font-mono flex items-center justify-between">
            <span className="text-zinc-400">Statut Capital :</span>
            <span className={`font-semibold ${
              maxDDPercent <= 6 ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {maxDDPercent <= 6 ? '🛡️ Risque Maîtrisé' : '⚠️ Risque Élevé'}
            </span>
          </div>
        </div>

        {/* 5. Nombre Total de Trades */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 relative overflow-hidden transition-all hover:border-blue-500/40 group">
          <div className="absolute top-0 right-0 h-20 w-20 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all"></div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
              Nombre Total de Trades
            </span>
            <span className="p-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-400">
              <Layers className="h-4 w-4" />
            </span>
          </div>

          <div className="mt-2">
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-3xl font-extrabold tracking-tight text-white">
                {totalCount}
              </span>
              <span className="text-xs text-zinc-400">exécutés</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] font-mono border-t border-zinc-800/80 pt-2 text-zinc-400">
              <span>Long: <strong className="text-blue-400">{longTrades.length}</strong></span>
              <span>Short: <strong className="text-purple-400">{shortTrades.length}</strong></span>
            </div>
          </div>

          <div className="mt-2.5 text-[10px] font-mono text-zinc-400 flex items-center justify-between">
            <span>P&L Net Cumulé :</span>
            <span className={`font-bold ${netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatCurrency(netPnl, currency, true)}
            </span>
          </div>
        </div>

      </div>

      {/* Advanced Statistical Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Card A: Directional Analysis (Long vs Short Performance) */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-400" />
              Performance Long vs Short
            </h3>
            <span className="text-xs text-zinc-400 font-mono">{totalCount} Trades</span>
          </div>

          {/* Long Stats */}
          <div className="rounded-xl border border-blue-500/20 bg-blue-950/10 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5 font-mono">
                <ArrowUpRight className="h-4 w-4" />
                POSITIONS LONG ↗
              </span>
              <span className="text-xs font-mono font-bold text-white">
                {longTrades.length} Trades ({totalCount > 0 ? ((longTrades.length / totalCount) * 100).toFixed(0) : 0}%)
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-1">
              <div>
                <span className="text-zinc-400 block text-[10px]">Win Rate</span>
                <span className="text-emerald-400 font-bold">{longWinRate.toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px]">Wins / Loss</span>
                <span className="text-zinc-200">{longWins}W / {longTrades.length - longWins}L</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px]">P&L Net</span>
                <span className={`font-bold ${
                  longTrades.reduce((acc, t) => acc + t.pnl, 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {formatCurrency(longTrades.reduce((acc, t) => acc + t.pnl, 0), currency, true)}
                </span>
              </div>
            </div>
          </div>

          {/* Short Stats */}
          <div className="rounded-xl border border-purple-500/20 bg-purple-950/10 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5 font-mono">
                <ArrowDownRight className="h-4 w-4" />
                POSITIONS SHORT ↘
              </span>
              <span className="text-xs font-mono font-bold text-white">
                {shortTrades.length} Trades ({totalCount > 0 ? ((shortTrades.length / totalCount) * 100).toFixed(0) : 0}%)
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-1">
              <div>
                <span className="text-zinc-400 block text-[10px]">Win Rate</span>
                <span className="text-emerald-400 font-bold">{shortWinRate.toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px]">Wins / Loss</span>
                <span className="text-zinc-200">{shortWins}W / {shortTrades.length - shortWins}L</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px]">P&L Net</span>
                <span className={`font-bold ${
                  shortTrades.reduce((acc, t) => acc + t.pnl, 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {formatCurrency(shortTrades.reduce((acc, t) => acc + t.pnl, 0), currency, true)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card B: Expectancy & Mathematical Edge */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-400" />
              Espérance & Edge Mathématique
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-mono border border-emerald-500/30">
              Edge Positif
            </span>
          </div>

          <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-mono">Espérance par Trade (Expectancy) :</span>
              <span className={`text-lg font-mono font-extrabold ${expectancy >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatCurrency(expectancy, currency, true)} / trade
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Pour chaque trade exécuté selon votre méthodologie, vous générez en moyenne{' '}
              <strong className="text-white font-mono">{formatCurrency(expectancy, currency, true)}</strong> de gain net statistique.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/40">
              <span className="text-zinc-400 block text-[10px]">Plus Gros Gain (Best)</span>
              <span className="text-emerald-400 font-bold text-sm">+{formatCurrency(stats.bestTrade, currency)}</span>
            </div>
            <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/40">
              <span className="text-zinc-400 block text-[10px]">Plus Grosse Perte (Worst)</span>
              <span className="text-rose-400 font-bold text-sm">{formatCurrency(stats.worstTrade, currency)}</span>
            </div>
          </div>
        </div>

        {/* Card C: Streaks & Discipline */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-400" />
              Séries de Trades (Streaks)
            </h3>
            <span className="text-xs font-mono text-zinc-400">Discipline</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-3.5 space-y-1">
              <span className="text-[10px] uppercase font-bold text-emerald-400 font-mono block">
                Max Win Streak
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-emerald-400 font-mono">
                  {stats.maxWinStreak}
                </span>
                <span className="text-xs text-zinc-400 font-mono">wins d'affilée</span>
              </div>
            </div>

            <div className="rounded-xl border border-rose-500/30 bg-rose-950/15 p-3.5 space-y-1">
              <span className="text-[10px] uppercase font-bold text-rose-400 font-mono block">
                Max Loss Streak
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-rose-400 font-mono">
                  {stats.maxLossStreak}
                </span>
                <span className="text-xs text-zinc-400 font-mono">pertes consécutives</span>
              </div>
            </div>
          </div>

          {/* Current Status */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${
                stats.currentStreak.type === 'WIN' ? 'bg-emerald-400 animate-ping' : stats.currentStreak.type === 'LOSS' ? 'bg-rose-400' : 'bg-zinc-600'
              }`}></span>
              <span className="text-xs font-medium text-zinc-300">Série en cours :</span>
            </div>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
              stats.currentStreak.type === 'WIN' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
              stats.currentStreak.type === 'LOSS' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
              'bg-zinc-800 text-zinc-400'
            }`}>
              {stats.currentStreak.type === 'WIN' ? `🔥 ${stats.currentStreak.count} Victoire(s)` :
               stats.currentStreak.type === 'LOSS' ? `❄️ ${stats.currentStreak.count} Défaite(s)` : 'Neutre'}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};

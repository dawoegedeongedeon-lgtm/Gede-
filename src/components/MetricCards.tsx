import React from 'react';
import { 
  DollarSign, 
  Target, 
  Flame, 
  ShieldAlert, 
  Scale, 
  TrendingUp,
  Calendar,
  Layers,
  Activity
} from 'lucide-react';
import { CurrencySymbol, JournalStats } from '../types';
import { formatCurrency, formatRMultiple } from '../utils/calculations';

interface MetricCardsProps {
  stats: JournalStats;
  currency: CurrencySymbol;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ stats, currency }) => {
  const isMonthPositive = stats.monthPnl >= 0;
  const isNetPositive = stats.netPnl >= 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      
      {/* 1. Profit du Mois (Real-time Monthly P&L) */}
      <div className="relative overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 backdrop-blur-sm transition-all hover:border-zinc-700/80 group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium tracking-wider text-zinc-400 uppercase flex items-center gap-1">
            <Calendar className="h-3 w-3 text-blue-400" />
            Profit du Mois
          </span>
          <div className={`p-1.5 rounded-lg ${isMonthPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            <DollarSign className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className={`font-mono text-xl sm:text-2xl font-bold tracking-tight ${
            isMonthPositive ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {formatCurrency(stats.monthPnl, currency, true)}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
            <span className={`font-medium ${isMonthPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {stats.monthPnlPercentage >= 0 ? '+' : ''}{stats.monthPnlPercentage.toFixed(2)}%
            </span>
            <span className="text-zinc-500">{stats.monthTradesCount} trades ({stats.activeMonthName})</span>
          </div>
        </div>
        <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${isMonthPositive ? 'bg-emerald-500/50' : 'bg-rose-500/50'}`} />
      </div>

      {/* 2. Winrate Global (Live Win Rate) */}
      <div className="relative overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 backdrop-blur-sm transition-all hover:border-zinc-700/80">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium tracking-wider text-zinc-400 uppercase flex items-center gap-1">
            <Target className="h-3 w-3 text-blue-400" />
            Winrate Global
          </span>
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
            <Target className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-white flex items-baseline gap-1.5">
            <span>{stats.winRate.toFixed(1)}%</span>
            <span className="text-[10px] font-mono text-emerald-400 font-medium">({stats.winCount} TP)</span>
          </div>
          {/* Visual Mini Progress Bar */}
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div 
              className="h-full bg-emerald-500 transition-all duration-500" 
              style={{ width: `${Math.min(100, Math.max(0, stats.winRate))}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-400 font-mono">
            <span className="text-emerald-400 font-medium">{stats.winCount}W (TP)</span>
            <span className="text-rose-400 font-medium">{stats.lossCount}L (SL)</span>
            <span className="text-amber-400 font-medium">{stats.beCount}BE</span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500/40" />
      </div>

      {/* 3. Nombre de Trades (Total Trades & Long/Short) */}
      <div className="relative overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 backdrop-blur-sm transition-all hover:border-zinc-700/80">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium tracking-wider text-zinc-400 uppercase flex items-center gap-1">
            <Layers className="h-3 w-3 text-blue-400" />
            Nombre de Trades
          </span>
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
            <Activity className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-white">
              {stats.totalTrades}
            </span>
            <span className="text-[11px] text-zinc-400">exécutions</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400 font-mono">
            <span className="text-emerald-400">Long: {stats.longTradesCount} ({stats.longWinRate.toFixed(0)}% W)</span>
            <span className="text-rose-400">Short: {stats.shortTradesCount} ({stats.shortWinRate.toFixed(0)}% W)</span>
          </div>
          <div className="mt-1 text-[10px] text-zinc-500 font-mono">
            {stats.openCount > 0 ? `${stats.openCount} position(s) ouverte(s)` : '0 position ouverte'}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500/40" />
      </div>

      {/* 4. Drawdown Live & Max (Live & Historical Drawdown) */}
      <div className="relative overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 backdrop-blur-sm transition-all hover:border-zinc-700/80">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium tracking-wider text-zinc-400 uppercase flex items-center gap-1">
            <ShieldAlert className="h-3 w-3 text-rose-400" />
            Drawdown Live
          </span>
          <div className={`p-1.5 rounded-lg ${stats.currentDrawdownPercentage > 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
            <ShieldAlert className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className={`font-mono text-xl sm:text-2xl font-bold tracking-tight ${
            stats.currentDrawdownPercentage > 5 ? 'text-rose-400' : stats.currentDrawdownPercentage > 0 ? 'text-amber-400' : 'text-emerald-400'
          }`}>
            {stats.currentDrawdownPercentage > 0 ? `-${stats.currentDrawdownPercentage.toFixed(2)}%` : '0.00%'}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
            <span className="text-rose-400">
              {stats.currentDrawdownAmount > 0 ? `-${formatCurrency(stats.currentDrawdownAmount, currency)}` : 'Au sommet (ATH)'}
            </span>
          </div>
          <div className="mt-1 text-[10px] text-zinc-500 font-mono">
            Max hist: <span className="text-rose-400">-{stats.maxDrawdownPercentage.toFixed(2)}%</span>
          </div>
        </div>
        <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${stats.currentDrawdownPercentage > 0 ? 'bg-rose-500/50' : 'bg-emerald-500/50'}`} />
      </div>

      {/* 5. Profit Factor & Espérance */}
      <div className="relative overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 backdrop-blur-sm transition-all hover:border-zinc-700/80">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium tracking-wider text-zinc-400 uppercase">
            Profit Factor
          </span>
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Scale className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className={`font-mono text-xl sm:text-2xl font-bold tracking-tight ${
            stats.profitFactor >= 2 ? 'text-emerald-400' : stats.profitFactor >= 1.2 ? 'text-blue-400' : 'text-amber-400'
          }`}>
            {stats.profitFactor >= 99 ? '∞' : stats.profitFactor.toFixed(2)}
          </div>
          <div className="mt-1 text-[11px] text-zinc-400 flex items-center justify-between font-mono">
            <span className="text-emerald-400">+{formatCurrency(stats.totalGains, currency)}</span>
            <span className="text-rose-400">-{formatCurrency(stats.totalLosses, currency)}</span>
          </div>
          <div className="mt-1 text-[10px] text-zinc-500 font-mono">
            Espérance: <span className="text-emerald-400">+{formatCurrency(stats.expectancy, currency)}</span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500/40" />
      </div>

      {/* 6. Net P&L Total & R-Moyen */}
      <div className="relative overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 backdrop-blur-sm transition-all hover:border-zinc-700/80">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium tracking-wider text-zinc-400 uppercase">
            Net P&L Total
          </span>
          <div className={`p-1.5 rounded-lg ${isNetPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className={`font-mono text-xl sm:text-2xl font-bold tracking-tight ${
            isNetPositive ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {formatCurrency(stats.netPnl, currency, true)}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
            <span className="text-blue-400 font-medium">
              {stats.avgRMultiple > 0 ? `+${stats.avgRMultiple.toFixed(2)}R` : `${stats.avgRMultiple.toFixed(2)}R`} moy.
            </span>
            <span className="text-zinc-500">
              {stats.currentStreak.type === 'WIN' ? `🔥 ${stats.currentStreak.count}W` : stats.currentStreak.type === 'LOSS' ? `⚠️ ${stats.currentStreak.count}L` : ''}
            </span>
          </div>
          <div className="mt-1 text-[10px] text-zinc-500 font-mono">
            Capital: {formatCurrency(stats.accountBalance, currency)}
          </div>
        </div>
        <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${isNetPositive ? 'bg-emerald-500/40' : 'bg-rose-500/40'}`} />
      </div>

    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { 
  Activity, 
  Layers, 
  BarChart2, 
  Shield, 
  TrendingUp, 
  TrendingDown, 
  Filter, 
  ExternalLink, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Sparkles,
  Plus,
  Eye,
  Info,
  Calendar,
  Zap,
  Target
} from 'lucide-react';
import { Trade, CurrencySymbol, Timeframe } from '../types';
import { formatCurrency, formatRMultiple } from '../utils/calculations';

interface TechnicalAnalysisViewProps {
  trades: Trade[];
  currency: CurrencySymbol;
  onViewTrade: (trade: Trade) => void;
  onNewTrade: () => void;
}

export const TechnicalAnalysisView: React.FC<TechnicalAnalysisViewProps> = ({
  trades,
  currency,
  onViewTrade,
  onNewTrade,
}) => {
  const [selectedIndicator, setSelectedIndicator] = useState<string | 'ALL'>('ALL');
  const [selectedPattern, setSelectedPattern] = useState<string | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'PATTERNS' | 'INDICATORS' | 'LEVELS' | 'SETUPS'>('OVERVIEW');

  // Compute stats per Indicator
  const indicatorStats = useMemo(() => {
    const map = new Map<string, { total: number; wins: number; losses: number; be: number; pnl: number; grossGain: number; grossLoss: number }>();
    
    trades.forEach((t) => {
      (t.indicators || []).forEach((ind) => {
        const entry = map.get(ind) || { total: 0, wins: 0, losses: 0, be: 0, pnl: 0, grossGain: 0, grossLoss: 0 };
        entry.total += 1;
        if (t.status === 'WIN') {
          entry.wins += 1;
          entry.grossGain += Math.max(0, t.pnl);
        } else if (t.status === 'LOSS') {
          entry.losses += 1;
          entry.grossLoss += Math.abs(Math.min(0, t.pnl));
        } else {
          entry.be += 1;
        }
        entry.pnl += t.pnl;
        map.set(ind, entry);
      });
    });

    return Array.from(map.entries()).map(([name, data]) => {
      const winRate = data.total > 0 ? (data.wins / data.total) * 100 : 0;
      const profitFactor = data.grossLoss > 0 ? data.grossGain / data.grossLoss : data.grossGain > 0 ? 99 : 0;
      const avgPnl = data.total > 0 ? data.pnl / data.total : 0;
      return {
        name,
        ...data,
        winRate,
        profitFactor,
        avgPnl,
      };
    }).sort((a, b) => b.total - a.total);
  }, [trades]);

  // Compute stats per Chart Pattern
  const patternStats = useMemo(() => {
    const map = new Map<string, { total: number; wins: number; losses: number; be: number; pnl: number; grossGain: number; grossLoss: number }>();
    
    trades.forEach((t) => {
      (t.chartPatterns || []).forEach((pattern) => {
        const entry = map.get(pattern) || { total: 0, wins: 0, losses: 0, be: 0, pnl: 0, grossGain: 0, grossLoss: 0 };
        entry.total += 1;
        if (t.status === 'WIN') {
          entry.wins += 1;
          entry.grossGain += Math.max(0, t.pnl);
        } else if (t.status === 'LOSS') {
          entry.losses += 1;
          entry.grossLoss += Math.abs(Math.min(0, t.pnl));
        } else {
          entry.be += 1;
        }
        entry.pnl += t.pnl;
        map.set(pattern, entry);
      });
    });

    return Array.from(map.entries()).map(([name, data]) => {
      const winRate = data.total > 0 ? (data.wins / data.total) * 100 : 0;
      const profitFactor = data.grossLoss > 0 ? data.grossGain / data.grossLoss : data.grossGain > 0 ? 99 : 0;
      const avgPnl = data.total > 0 ? data.pnl / data.total : 0;
      return {
        name,
        ...data,
        winRate,
        profitFactor,
        avgPnl,
      };
    }).sort((a, b) => b.total - a.total);
  }, [trades]);

  // All trades with Technical Analysis
  const techTrades = useMemo(() => {
    return trades.filter((t) => {
      const hasIndicators = (t.indicators && t.indicators.length > 0);
      const hasPatterns = (t.chartPatterns && t.chartPatterns.length > 0);
      const hasLevels = ((t.supportLevels && t.supportLevels.length > 0) || (t.resistanceLevels && t.resistanceLevels.length > 0));
      const hasTechNotes = Boolean(t.technicalNotes);
      return hasIndicators || hasPatterns || hasLevels || hasTechNotes;
    });
  }, [trades]);

  // Filtered setups list
  const filteredSetups = useMemo(() => {
    return techTrades.filter((t) => {
      if (selectedIndicator !== 'ALL') {
        if (!t.indicators?.includes(selectedIndicator)) return false;
      }
      if (selectedPattern !== 'ALL') {
        if (!t.chartPatterns?.includes(selectedPattern)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchPair = t.pair.toLowerCase().includes(q);
        const matchNotes = (t.technicalNotes || '').toLowerCase().includes(q);
        const matchInd = (t.indicators || []).some(i => i.toLowerCase().includes(q));
        const matchPat = (t.chartPatterns || []).some(p => p.toLowerCase().includes(q));
        if (!matchPair && !matchNotes && !matchInd && !matchPat) return false;
      }
      return true;
    });
  }, [techTrades, selectedIndicator, selectedPattern, searchQuery]);

  // Unique lists for filters
  const allUsedIndicators = Array.from(new Set(techTrades.flatMap(t => t.indicators || [])));
  const allUsedPatterns = Array.from(new Set(techTrades.flatMap(t => t.chartPatterns || [])));

  return (
    <div className="space-y-6">
      {/* Header & Sub-nav */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Section Analyse Technique & Confluences
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Centralisation des indicateurs (RSI, MACD, VWAP...), niveaux clés S/R et schémas graphiques.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onNewTrade}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/20 transition-all font-sans"
          >
            <Plus className="h-4 w-4" />
            Nouveau Trade avec Setup
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-zinc-800/80 pb-2 overflow-x-auto text-xs font-medium">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'OVERVIEW'
              ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Vue d'Ensemble & Synthèse
        </button>
        <button
          onClick={() => setActiveTab('PATTERNS')}
          className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'PATTERNS'
              ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          Schémas Graphiques ({patternStats.length})
        </button>
        <button
          onClick={() => setActiveTab('INDICATORS')}
          className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'INDICATORS'
              ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <BarChart2 className="h-3.5 w-3.5" />
          Matrice Indicateurs ({indicatorStats.length})
        </button>
        <button
          onClick={() => setActiveTab('SETUPS')}
          className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'SETUPS'
              ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <Eye className="h-3.5 w-3.5" />
          Explorateur de Setups ({filteredSetups.length})
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                Trades avec Analyse Technique
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-white font-mono">{techTrades.length}</span>
                <span className="text-xs text-blue-400 font-mono">
                  ({trades.length > 0 ? ((techTrades.length / trades.length) * 100).toFixed(0) : 0}% du total)
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                Indicateur le Plus Rentable
              </span>
              <div className="mt-1">
                {indicatorStats.length > 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-emerald-400 font-mono truncate max-w-[140px]">
                      {indicatorStats[0].name}
                    </span>
                    <span className="text-xs text-zinc-400 font-mono">
                      {indicatorStats[0].winRate.toFixed(0)}% WR
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-zinc-400 italic">Pas encore de données</span>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                Schéma Graphique Phare
              </span>
              <div className="mt-1">
                {patternStats.length > 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-indigo-400 font-mono truncate max-w-[140px]">
                      {patternStats[0].name}
                    </span>
                    <span className="text-xs text-zinc-400 font-mono">
                      {patternStats[0].winRate.toFixed(0)}% WR
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-zinc-400 italic">Pas encore de données</span>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                P&L Net Généré (Setups)
              </span>
              <div className="mt-1">
                <span className={`text-2xl font-bold font-mono ${
                  techTrades.reduce((acc, t) => acc + t.pnl, 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {formatCurrency(techTrades.reduce((acc, t) => acc + t.pnl, 0), currency, true)}
                </span>
              </div>
            </div>
          </div>

          {/* Dual Column: Top Patterns & Top Indicators */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Patterns Table */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Performance par Schéma Graphique
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTab('PATTERNS')}
                  className="text-xs text-blue-400 hover:underline"
                >
                  Voir tous ({patternStats.length}) →
                </button>
              </div>

              <div className="space-y-2.5">
                {patternStats.slice(0, 5).map((p) => (
                  <div
                    key={p.name}
                    className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3 flex items-center justify-between transition-all hover:border-indigo-500/40"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-100">{p.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                          {p.total} trades
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono mt-1 flex items-center gap-2">
                        <span className="text-emerald-400">{p.wins}W</span> •{' '}
                        <span className="text-rose-400">{p.losses}L</span> •{' '}
                        <span className="text-amber-400">{p.be}BE</span>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className={`text-sm font-bold ${p.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {p.winRate.toFixed(1)}% WR
                      </div>
                      <div className={`text-xs ${p.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatCurrency(p.pnl, currency, true)}
                      </div>
                    </div>
                  </div>
                ))}

                {patternStats.length === 0 && (
                  <div className="text-center py-6 text-xs text-zinc-400">
                    Aucun schéma graphique encore consigné. Ajoutez-en lors de la création d'un trade !
                  </div>
                )}
              </div>
            </div>

            {/* Top Indicators Table */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-blue-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Efficacité des Indicateurs
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTab('INDICATORS')}
                  className="text-xs text-blue-400 hover:underline"
                >
                  Voir tous ({indicatorStats.length}) →
                </button>
              </div>

              <div className="space-y-2.5">
                {indicatorStats.slice(0, 5).map((ind) => (
                  <div
                    key={ind.name}
                    className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3 flex items-center justify-between transition-all hover:border-blue-500/40"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-100">{ind.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                          {ind.total} trades
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono mt-1 flex items-center gap-2">
                        <span className="text-emerald-400">{ind.wins}W</span> •{' '}
                        <span className="text-rose-400">{ind.losses}L</span> •{' '}
                        <span>PF: {ind.profitFactor >= 99 ? '∞' : ind.profitFactor.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className={`text-sm font-bold ${ind.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {ind.winRate.toFixed(1)}% WR
                      </div>
                      <div className={`text-xs ${ind.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatCurrency(ind.pnl, currency, true)}
                      </div>
                    </div>
                  </div>
                ))}

                {indicatorStats.length === 0 && (
                  <div className="text-center py-6 text-xs text-zinc-400">
                    Aucun indicateur encore répertorié.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PATTERNS TAB */}
      {activeTab === 'PATTERNS' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Schémas Graphiques et Configurations Techniques
                </h3>
                <p className="text-xs text-zinc-400">
                  Taux de réussite et rentabilité par structure chartiste (Tête et Épaules, Double Top/Bottom, Triangles, Drapeaux...).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {patternStats.map((p) => (
                <div
                  key={p.name}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3 transition-all hover:border-indigo-500/40"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-indigo-300 font-sans">{p.name}</h4>
                      <span className="text-[11px] font-mono text-zinc-400">{p.total} configurations tradées</span>
                    </div>
                    <span className={`text-base font-extrabold font-mono ${p.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {p.winRate.toFixed(1)}% WR
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden flex">
                    <div className="bg-emerald-500 h-full" style={{ width: `${p.winRate}%` }}></div>
                    <div className="bg-rose-500 h-full" style={{ width: `${p.total > 0 ? (p.losses / p.total) * 100 : 0}%` }}></div>
                    <div className="bg-amber-500 h-full" style={{ width: `${p.total > 0 ? (p.be / p.total) * 100 : 0}%` }}></div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs font-mono border-t border-zinc-800/80 pt-2 text-zinc-400">
                    <div>
                      <span className="text-[10px] block text-zinc-400">Gains/Pertes</span>
                      <span className="text-white font-bold">{p.wins}W / {p.losses}L</span>
                    </div>
                    <div>
                      <span className="text-[10px] block text-zinc-400">Profit Factor</span>
                      <span className="text-blue-400 font-bold">{p.profitFactor >= 99 ? '∞' : p.profitFactor.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] block text-zinc-400">P&L Net</span>
                      <span className={`font-bold ${p.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatCurrency(p.pnl, currency, true)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* INDICATORS TAB */}
      {activeTab === 'INDICATORS' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Matrice d'Efficacité des Indicateurs Techniques
                </h3>
                <p className="text-xs text-zinc-400">
                  Évaluez la rentabilité statistique des indicateurs (RSI, MACD, VWAP, Moyennes Mobiles, Bandes de Bollinger...).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {indicatorStats.map((ind) => (
                <div
                  key={ind.name}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3 transition-all hover:border-blue-500/40"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-blue-300 font-mono">{ind.name}</h4>
                      <span className="text-[11px] font-mono text-zinc-400">{ind.total} occurrences</span>
                    </div>
                    <span className={`text-base font-extrabold font-mono ${ind.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {ind.winRate.toFixed(1)}% WR
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden flex">
                    <div className="bg-emerald-500 h-full" style={{ width: `${ind.winRate}%` }}></div>
                    <div className="bg-rose-500 h-full" style={{ width: `${ind.total > 0 ? (ind.losses / ind.total) * 100 : 0}%` }}></div>
                    <div className="bg-amber-500 h-full" style={{ width: `${ind.total > 0 ? (ind.be / ind.total) * 100 : 0}%` }}></div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs font-mono border-t border-zinc-800/80 pt-2 text-zinc-400">
                    <div>
                      <span className="text-[10px] block text-zinc-400">Wins/Losses</span>
                      <span className="text-white font-bold">{ind.wins}W / {ind.losses}L</span>
                    </div>
                    <div>
                      <span className="text-[10px] block text-zinc-400">Profit Factor</span>
                      <span className="text-blue-400 font-bold">{ind.profitFactor >= 99 ? '∞' : ind.profitFactor.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] block text-zinc-400">P&L Net</span>
                      <span className={`font-bold ${ind.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatCurrency(ind.pnl, currency, true)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SETUPS EXPLORER TAB */}
      {activeTab === 'SETUPS' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par actif, pattern, note..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-400 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Indicator filter */}
              <div>
                <select
                  value={selectedIndicator}
                  onChange={(e) => setSelectedIndicator(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 focus:border-blue-500 focus:outline-none"
                >
                  <option value="ALL">Tous les indicateurs</option>
                  {allUsedIndicators.map(i => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>

              {/* Pattern filter */}
              <div>
                <select
                  value={selectedPattern}
                  onChange={(e) => setSelectedPattern(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 focus:border-blue-500 focus:outline-none"
                >
                  <option value="ALL">Tous les schémas graphiques</option>
                  {allUsedPatterns.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Setups Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSetups.map((trade) => (
              <div
                key={trade.id}
                onClick={() => onViewTrade(trade)}
                className="group rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-3 cursor-pointer transition-all hover:border-blue-500/50 hover:bg-zinc-900/40"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-white font-mono">{trade.pair}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                        trade.direction === 'LONG' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {trade.direction}
                      </span>
                      <span className="text-xs text-zinc-400 font-mono">{trade.timeframe}</span>
                    </div>
                    <span className="text-[11px] text-zinc-400 font-mono block mt-0.5">
                      {trade.entryDate} • {trade.session}
                    </span>
                  </div>

                  <div className="text-right font-mono">
                    <span className={`text-sm font-bold block ${
                      trade.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {formatCurrency(trade.pnl, currency, true)}
                    </span>
                    <span className="text-[10px] text-blue-400 font-bold">
                      {formatRMultiple(trade.rMultiple)}
                    </span>
                  </div>
                </div>

                {/* Patterns and indicators */}
                <div className="space-y-1.5 pt-1">
                  {trade.chartPatterns && trade.chartPatterns.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {trade.chartPatterns.map(p => (
                        <span key={p} className="text-[10px] px-2 py-0.5 rounded-md border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
                          {p}
                        </span>
                      ))}
                    </div>
                  )}

                  {trade.indicators && trade.indicators.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {trade.indicators.map(i => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-md border border-blue-500/30 bg-blue-500/10 text-blue-300 font-mono">
                          {i}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* S/R Levels */}
                {((trade.supportLevels && trade.supportLevels.length > 0) || (trade.resistanceLevels && trade.resistanceLevels.length > 0)) && (
                  <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                    {(trade.supportLevels || []).map(s => (
                      <span key={s} className="px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-500/30">
                        S: {s}
                      </span>
                    ))}
                    {(trade.resistanceLevels || []).map(r => (
                      <span key={r} className="px-1.5 py-0.5 rounded bg-rose-950/40 text-rose-300 border border-rose-500/30">
                        R: {r}
                      </span>
                    ))}
                  </div>
                )}

                {/* Technical notes snippet */}
                {trade.technicalNotes && (
                  <p className="text-xs text-zinc-300 line-clamp-2 italic bg-zinc-900/60 p-2 rounded-lg border border-zinc-800/80">
                    "{trade.technicalNotes}"
                  </p>
                )}

                {/* Chart preview thumbnail if exists */}
                {trade.chartUrl && (
                  <div className="h-24 rounded-lg overflow-hidden border border-zinc-800/80 bg-zinc-900 flex items-center justify-center">
                    <img
                      src={trade.chartUrl}
                      alt="Preview"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
              </div>
            ))}

            {filteredSetups.length === 0 && (
              <div className="col-span-full py-12 text-center text-xs text-zinc-400 bg-zinc-950 rounded-2xl border border-zinc-800">
                Aucun setup ne correspond à vos filtres actuels.
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

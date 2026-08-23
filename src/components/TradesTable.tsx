import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  ChevronDown, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  MinusCircle, 
  Sparkles,
  TrendingUp,
  Tag,
  Clock,
  Briefcase,
  Layers,
  ChevronRight,
  Plus
} from 'lucide-react';
import { Trade, CurrencySymbol, FilterState, TradeStatus, Direction, TradingSession, AssetClass, EmotionState } from '../types';
import { formatCurrency, formatRMultiple } from '../utils/calculations';

interface TradesTableProps {
  trades: Trade[];
  currency: CurrencySymbol;
  onSelectTrade: (trade: Trade) => void;
  onEditTrade: (trade: Trade) => void;
  onDeleteTrade: (id: string) => void;
  onOpenNewTrade: () => void;
}

export const TradesTable: React.FC<TradesTableProps> = ({
  trades,
  currency,
  onSelectTrade,
  onEditTrade,
  onDeleteTrade,
  onOpenNewTrade,
}) => {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'ALL',
    direction: 'ALL',
    session: 'ALL',
    assetClass: 'ALL',
    strategy: 'ALL',
    emotion: 'ALL',
    startDate: '',
    endDate: '',
    sortBy: 'date_desc',
  });

  const [selectedTradeIds, setSelectedTradeIds] = useState<string[]>([]);

  // Unique lists for dropdowns
  const availableStrategies = useMemo(() => {
    const set = new Set<string>();
    trades.forEach((t) => { if (t.strategy) set.add(t.strategy); });
    return Array.from(set);
  }, [trades]);

  // Filtered & sorted trades
  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      // Search
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const matchesPair = t.pair.toLowerCase().includes(q);
        const matchesStrat = t.strategy?.toLowerCase().includes(q);
        const matchesNotes = t.notes?.toLowerCase().includes(q);
        const matchesTicket = t.ticketNumber?.toLowerCase().includes(q);
        if (!matchesPair && !matchesStrat && !matchesNotes && !matchesTicket) return false;
      }

      // Status
      if (filters.status !== 'ALL' && t.status !== filters.status) return false;

      // Direction
      if (filters.direction !== 'ALL' && t.direction !== filters.direction) return false;

      // Session
      if (filters.session !== 'ALL' && t.session !== filters.session) return false;

      // Asset Class
      if (filters.assetClass !== 'ALL' && t.assetClass !== filters.assetClass) return false;

      // Strategy
      if (filters.strategy !== 'ALL' && t.strategy !== filters.strategy) return false;

      // Emotion
      if (filters.emotion !== 'ALL' && t.emotions !== filters.emotion) return false;

      // Date Range
      if (filters.startDate && t.entryDate < filters.startDate) return false;
      if (filters.endDate && t.entryDate > filters.endDate) return false;

      return true;
    }).sort((a, b) => {
      if (filters.sortBy === 'date_desc') {
        return new Date(`${b.entryDate}T${b.entryTime || '00:00'}`).getTime() - 
               new Date(`${a.entryDate}T${a.entryTime || '00:00'}`).getTime();
      }
      if (filters.sortBy === 'date_asc') {
        return new Date(`${a.entryDate}T${a.entryTime || '00:00'}`).getTime() - 
               new Date(`${b.entryDate}T${b.entryTime || '00:00'}`).getTime();
      }
      if (filters.sortBy === 'pnl_desc') {
        return (Number(b.pnl) || 0) - (Number(a.pnl) || 0);
      }
      if (filters.sortBy === 'pnl_asc') {
        return (Number(a.pnl) || 0) - (Number(b.pnl) || 0);
      }
      if (filters.sortBy === 'r_desc') {
        return (Number(b.rMultiple) || 0) - (Number(a.rMultiple) || 0);
      }
      return 0;
    });
  }, [trades, filters]);

  // Filtered quick stats
  const filteredPnl = filteredTrades.reduce((acc, t) => acc + (Number(t.pnl) || 0), 0);
  const filteredWins = filteredTrades.filter((t) => t.status === 'WIN').length;
  const filteredLosses = filteredTrades.filter((t) => t.status === 'LOSS').length;
  const filteredWinrate = (filteredWins + filteredLosses) > 0 
    ? (filteredWins / (filteredWins + filteredLosses)) * 100 
    : 0;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedTradeIds(filteredTrades.map((t) => t.id));
    } else {
      setSelectedTradeIds([]);
    }
  };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTradeIds((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDeleteBatch = () => {
    if (window.confirm(`Confirmer la suppression de ${selectedTradeIds.length} trade(s) ?`)) {
      selectedTradeIds.forEach((id) => onDeleteTrade(id));
      setSelectedTradeIds([]);
    }
  };

  return (
    <div className="space-y-4 w-full">
      {/* Controls & Filter Bar */}
      <div className="rounded-2xl border border-zinc-800/90 bg-[#0b0e17] p-3.5 sm:p-5 shadow-xl space-y-3.5">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Rechercher par paire, ticket, notes..."
              className="w-full min-h-[44px] rounded-xl border border-zinc-800 bg-[#07090e] pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Quick Filter Status Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'ALL', label: 'Tous' },
              { id: 'WIN', label: 'Gagnants (Wins)' },
              { id: 'LOSS', label: 'Pertes (Losses)' },
              { id: 'BE', label: 'Break Even' },
            ].map((p) => {
              const active = filters.status === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setFilters({ ...filters, status: p.id as any })}
                  className={`min-h-[38px] sm:min-h-[34px] rounded-xl px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                    active
                      ? p.id === 'WIN'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-sm'
                        : p.id === 'LOSS'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 shadow-sm'
                        : p.id === 'BE'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-sm'
                        : 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'border border-zinc-800 bg-[#07090e] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dropdowns Row */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 pt-2 border-t border-zinc-800/80 text-xs">
          
          {/* Direction Filter */}
          <select
            value={filters.direction}
            onChange={(e) => setFilters({ ...filters, direction: e.target.value as any })}
            className="w-full sm:w-auto min-h-[40px] sm:min-h-[36px] rounded-xl border border-zinc-800 bg-[#07090e] px-3 py-1.5 text-zinc-200 focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">Toutes Directions</option>
            <option value="LONG">LONG ↗</option>
            <option value="SHORT">SHORT ↘</option>
          </select>

          {/* Session Filter */}
          <select
            value={filters.session}
            onChange={(e) => setFilters({ ...filters, session: e.target.value as any })}
            className="w-full sm:w-auto min-h-[40px] sm:min-h-[36px] rounded-xl border border-zinc-800 bg-[#07090e] px-3 py-1.5 text-zinc-200 focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">Toutes Sessions</option>
            <option value="London">London</option>
            <option value="New York">New York</option>
            <option value="Asian">Asian</option>
            <option value="Overlap">Overlap</option>
          </select>

          {/* Asset Class Filter */}
          <select
            value={filters.assetClass}
            onChange={(e) => setFilters({ ...filters, assetClass: e.target.value as any })}
            className="w-full sm:w-auto min-h-[40px] sm:min-h-[36px] rounded-xl border border-zinc-800 bg-[#07090e] px-3 py-1.5 text-zinc-200 focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">Toutes Classes</option>
            <option value="CRYPTO">Crypto</option>
            <option value="INDICES">Indices</option>
            <option value="FOREX">Forex</option>
            <option value="COMMODITIES">Matières Premières</option>
          </select>

          {/* Strategy Filter */}
          {availableStrategies.length > 0 && (
            <select
              value={filters.strategy}
              onChange={(e) => setFilters({ ...filters, strategy: e.target.value })}
              className="w-full sm:w-auto min-h-[40px] sm:min-h-[36px] rounded-xl border border-zinc-800 bg-[#07090e] px-3 py-1.5 text-zinc-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">Toutes Stratégies</option>
              {availableStrategies.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}

          {/* Sort By */}
          <div className="col-span-2 sm:col-auto sm:ml-auto flex items-center gap-1.5 w-full sm:w-auto">
            <ArrowUpDown className="h-4 w-4 text-zinc-400 shrink-0" />
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
              className="w-full min-h-[40px] sm:min-h-[36px] rounded-xl border border-zinc-800 bg-[#07090e] px-3 py-1.5 text-zinc-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="date_desc">Date (Récent d'abord)</option>
              <option value="date_asc">Date (Ancien d'abord)</option>
              <option value="pnl_desc">P&L ($ Décroissant)</option>
              <option value="pnl_asc">P&L ($ Croissant)</option>
              <option value="r_desc">R-Multiple (Max R)</option>
            </select>
          </div>
        </div>

        {/* Filter Summary & Batch Delete */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-zinc-800/60 text-xs text-zinc-400">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              <strong className="text-white font-mono">{filteredTrades.length}</strong> trades trouvés
            </span>
            <span className="hidden sm:inline">•</span>
            <span>
              Winrate : <strong className="text-emerald-400 font-mono">{filteredWinrate.toFixed(1)}%</strong>
            </span>
            <span className="hidden sm:inline">•</span>
            <span>
              Net P&L : <strong className={`font-mono font-bold ${
                filteredPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {formatCurrency(filteredPnl, currency, true)}
              </strong>
            </span>
          </div>

          {selectedTradeIds.length > 0 && (
            <button
              onClick={handleDeleteBatch}
              className="min-h-[38px] flex items-center justify-center gap-2 rounded-xl bg-rose-600/20 border border-rose-500/40 px-3 py-1.5 text-rose-300 hover:bg-rose-600/30 transition-all active:scale-95"
            >
              <Trash2 className="h-4 w-4" />
              <span>Supprimer ({selectedTradeIds.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* MOBILE VIEW: Thumb-Friendly Responsive Card Feed (< md) */}
      <div className="md:hidden space-y-3">
        {filteredTrades.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 bg-[#0b0e17] p-8 text-center space-y-3">
            <Tag className="h-10 w-10 text-zinc-500 mx-auto opacity-70" />
            <p className="text-sm font-medium text-zinc-300">Aucun trade trouvé.</p>
            <button
              onClick={onOpenNewTrade}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Ajouter un Trade</span>
            </button>
          </div>
        ) : (
          filteredTrades.map((t) => {
            const isWin = t.status === 'WIN';
            const isLoss = t.status === 'LOSS';
            const isBE = t.status === 'BE';
            const isSelected = selectedTradeIds.includes(t.id);

            return (
              <div
                key={t.id}
                onClick={() => onSelectTrade(t)}
                className={`relative rounded-2xl border p-4 transition-all active:scale-[0.99] cursor-pointer shadow-lg ${
                  isSelected
                    ? 'border-blue-500/60 bg-blue-950/25 ring-1 ring-blue-500/30'
                    : 'border-zinc-800/90 bg-[#0b0e17] hover:border-zinc-700'
                }`}
              >
                {/* Top Row: Pair, Direction, Status */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold text-white tracking-tight font-sans">
                      {t.pair}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold ${
                      t.direction === 'LONG'
                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                        : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                    }`}>
                      {t.direction === 'LONG' ? 'LONG ↗' : 'SHORT ↘'}
                    </span>
                    <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
                      {t.timeframe}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isWin && (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-mono font-bold text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" /> WIN
                      </span>
                    )}
                    {isLoss && (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/15 px-2.5 py-1 text-[11px] font-mono font-bold text-rose-400">
                        <XCircle className="h-3.5 w-3.5" /> LOSS
                      </span>
                    )}
                    {isBE && (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-[11px] font-mono font-bold text-amber-400">
                        <MinusCircle className="h-3.5 w-3.5" /> BE
                      </span>
                    )}
                    {t.status === 'OPEN' && (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-blue-500/40 bg-blue-500/15 px-2.5 py-1 text-[11px] font-mono font-bold text-blue-400">
                        EN COURS
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle Row: PnL & R-Multiple */}
                <div className="mt-3 flex items-baseline justify-between border-y border-zinc-800/60 py-2.5">
                  <div>
                    <span className="text-[10px] uppercase font-medium text-zinc-500 block">Résultat Net</span>
                    <div className={`font-mono text-xl font-bold ${
                      isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-amber-400'
                    }`}>
                      {formatCurrency(t.pnl, currency, true)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-medium text-zinc-500 block">Performance</span>
                    <div className="flex items-center gap-2 font-mono text-sm font-semibold">
                      <span className={isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-amber-400'}>
                        {formatRMultiple(t.rMultiple)}
                      </span>
                      <span className="text-xs text-zinc-400">
                        ({t.pnlPercentage >= 0 ? '+' : ''}{t.pnlPercentage.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Info row: Date, Session, Account */}
                <div className="mt-2.5 flex items-center justify-between text-xs text-zinc-400">
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <Clock className="h-3.5 w-3.5 text-zinc-500" />
                    <span>{t.entryDate} • {t.entryTime}</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 font-medium truncate max-w-[140px]">
                    💼 {t.account || 'Principal'}
                  </div>
                </div>

                {/* Bottom Action Bar (Large Thumb Touch Targets) */}
                <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onSelectTrade(t)}
                    className="min-h-[44px] flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-[#07090e] hover:bg-zinc-800 text-xs font-semibold text-blue-300 transition-all active:scale-95"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Détails</span>
                  </button>

                  <button
                    onClick={() => onEditTrade(t)}
                    className="min-h-[44px] px-4 flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-[#07090e] hover:bg-zinc-800 text-xs font-semibold text-zinc-300 transition-all active:scale-95"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span>Modifier</span>
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm(`Supprimer le trade ${t.pair} (${t.ticketNumber}) ?`)) {
                        onDeleteTrade(t.id);
                      }
                    }}
                    className="min-h-[44px] px-3.5 flex items-center justify-center rounded-xl border border-rose-900/30 bg-rose-950/20 hover:bg-rose-900/40 text-rose-400 transition-all active:scale-95"
                    title="Supprimer ce trade"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP & TABLET VIEW: High Performance Data Table (>= md) */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-zinc-800/90 bg-[#0b0e17] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            {/* Header */}
            <thead className="border-b border-zinc-800/90 bg-[#07090e] font-mono text-[11px] uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="p-3.5 pl-4 w-8">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={selectedTradeIds.length === filteredTrades.length && filteredTrades.length > 0}
                    className="rounded border-zinc-700 bg-zinc-900 text-blue-500 focus:ring-0"
                  />
                </th>
                <th className="p-3.5">Ticket & Paire</th>
                <th className="p-3.5">Direction</th>
                <th className="p-3.5">Statut</th>
                <th className="p-3.5">Date & Heure</th>
                <th className="p-3.5">Compte</th>
                <th className="p-3.5">Entrée / Sortie</th>
                <th className="p-3.5 text-right">P&L Net ($)</th>
                <th className="p-3.5 text-right">R-Multiple</th>
                <th className="p-3.5 text-center">Émotion & Règles</th>
                <th className="p-3.5 text-right pr-4">Actions</th>
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-zinc-800/60 font-sans">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Tag className="h-8 w-8 text-zinc-500 opacity-60" />
                      <p className="text-sm font-medium text-zinc-300">Aucun trade ne correspond aux critères.</p>
                      <button
                        onClick={() => setFilters({
                          search: '',
                          status: 'ALL',
                          direction: 'ALL',
                          session: 'ALL',
                          assetClass: 'ALL',
                          strategy: 'ALL',
                          emotion: 'ALL',
                          startDate: '',
                          endDate: '',
                          sortBy: 'date_desc',
                        })}
                        className="text-xs text-blue-400 hover:underline"
                      >
                        Réinitialiser les filtres
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTrades.map((t) => {
                  const isWin = t.status === 'WIN';
                  const isLoss = t.status === 'LOSS';
                  const isBE = t.status === 'BE';
                  const isSelected = selectedTradeIds.includes(t.id);

                  return (
                    <tr
                      key={t.id}
                      onClick={() => onSelectTrade(t)}
                      className={`group transition-colors cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-950/25 hover:bg-blue-950/35' 
                          : 'hover:bg-zinc-800/40'
                      }`}
                    >
                      {/* Select checkbox */}
                      <td className="p-3.5 pl-4" onClick={(e) => handleToggleSelect(t.id, e)}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded border-zinc-700 bg-zinc-900 text-blue-500 focus:ring-0"
                        />
                      </td>

                      {/* Ticket & Pair */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-zinc-400">{t.ticketNumber}</span>
                          <span className="font-bold text-white tracking-tight">{t.pair}</span>
                          <span className="rounded bg-zinc-800/80 px-1 py-0.5 text-[9px] font-mono text-zinc-400">
                            {t.timeframe}
                          </span>
                        </div>
                      </td>

                      {/* Direction */}
                      <td className="p-3.5">
                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[11px] font-bold ${
                          t.direction === 'LONG'
                            ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                            : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                        }`}>
                          {t.direction === 'LONG' ? 'LONG ↗' : 'SHORT ↘'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        {isWin && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> WIN
                          </span>
                        )}
                        {isLoss && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-400">
                            <XCircle className="h-3 w-3" /> LOSS
                          </span>
                        )}
                        {isBE && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-400">
                            <MinusCircle className="h-3 w-3" /> BREAK EVEN
                          </span>
                        )}
                        {t.status === 'OPEN' && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-blue-500/30 bg-blue-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-400">
                            EN COURS
                          </span>
                        )}
                      </td>

                      {/* Date & Time */}
                      <td className="p-3.5">
                        <div className="font-mono text-zinc-200 font-medium">{t.entryDate}</div>
                        <div className="text-[10px] text-zinc-400">{t.entryTime} • {t.session}</div>
                      </td>

                      {/* Account & Details */}
                      <td className="p-3.5">
                        <div className="font-medium text-zinc-200 max-w-[150px] truncate">
                          {t.account || 'Compte Principal'}
                        </div>
                        {t.screenshotBefore && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-blue-400 font-mono">
                            📷 Capture dispo
                          </span>
                        )}
                      </td>

                      {/* Prices */}
                      <td className="p-3.5 font-mono text-zinc-300">
                        <div>In: {t.entryPrice}</div>
                        <div className="text-[10px] text-zinc-400">Out: {t.exitPrice}</div>
                      </td>

                      {/* PnL Net */}
                      <td className="p-3.5 text-right font-mono font-bold">
                        <div className={`text-sm ${
                          isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-amber-400'
                        }`}>
                          {formatCurrency(t.pnl, currency, true)}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          {t.pnlPercentage >= 0 ? '+' : ''}{t.pnlPercentage.toFixed(2)}%
                        </div>
                      </td>

                      {/* R-Multiple */}
                      <td className="p-3.5 text-right font-mono font-semibold">
                        <span className={isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-amber-400'}>
                          {formatRMultiple(t.rMultiple)}
                        </span>
                      </td>

                      {/* Emotion & Rating */}
                      <td className="p-3.5 text-center">
                        <div className="text-[10px] font-mono text-zinc-300">
                          {t.emotions}
                        </div>
                        <div className="text-[11px] text-amber-400">
                          {'★'.repeat(t.executionRating || 5)}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onSelectTrade(t)}
                            className="p-1.5 text-zinc-400 hover:text-blue-400 rounded-lg hover:bg-zinc-800 transition-all"
                            title="Inspecter le trade"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onEditTrade(t)}
                            className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition-all"
                            title="Modifier"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Supprimer le trade ${t.pair} (${t.ticketNumber}) ?`)) {
                                onDeleteTrade(t.id);
                              }
                            }}
                            className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-zinc-800 transition-all"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Briefcase,
  Layers,
  Image as ImageIcon,
  DollarSign,
  Maximize2,
  X,
  Scale
} from 'lucide-react';
import { Trade, CurrencySymbol } from '../types';
import { formatCurrency, formatRMultiple } from '../utils/calculations';

interface CalendarViewProps {
  trades: Trade[];
  currency: CurrencySymbol;
  onSelectTrade: (trade: Trade) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  trades,
  currency,
  onSelectTrade,
}) => {
  // Current viewing date (default to latest trade date or today)
  const [currentDate, setCurrentDate] = useState(() => {
    if (trades.length > 0) {
      const dates = trades.map((t) => new Date(t.entryDate).getTime()).filter((d) => !isNaN(d));
      if (dates.length > 0) {
        const latest = Math.max(...dates);
        return new Date(latest);
      }
    }
    return new Date();
  });

  const [selectedDayData, setSelectedDayData] = useState<{
    dateStr: string;
    dayNum: number;
    trades: Trade[];
  } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleYearChange = (newYear: number) => {
    setCurrentDate(new Date(newYear, month, 1));
  };

  const handleMonthChange = (newMonth: number) => {
    setCurrentDate(new Date(year, newMonth, 1));
  };

  const monthNamesFr = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const daysOfWeekFr = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  // Days in month calculation
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const totalDays = lastDayOfMonth.getDate();

  // Adjust starting day for Monday = 0
  let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startingDayOfWeek === -1) startingDayOfWeek = 6;

  // Group all trades by date string YYYY-MM-DD
  const tradesByDate = useMemo(() => {
    const map: Record<string, Trade[]> = {};
    trades.forEach((t) => {
      if (!map[t.entryDate]) {
        map[t.entryDate] = [];
      }
      map[t.entryDate].push(t);
    });
    return map;
  }, [trades]);

  // Monthly stats calculations
  const monthStats = useMemo(() => {
    const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const monthTrades = trades.filter((t) => t.entryDate.startsWith(currentMonthPrefix));
    
    let totalPnl = 0;
    let totalR = 0;
    let winCount = 0;
    let lossCount = 0;
    let beCount = 0;
    let bestDayPnl = -Infinity;
    let worstDayPnl = Infinity;

    // Per day aggregation
    const dayPnlMap: Record<string, number> = {};

    monthTrades.forEach((t) => {
      const pnl = Number(t.pnl) || 0;
      const r = Number(t.rMultiple) || 0;
      totalPnl += pnl;
      totalR += r;

      if (t.status === 'WIN') winCount++;
      else if (t.status === 'LOSS') lossCount++;
      else beCount++;

      dayPnlMap[t.entryDate] = (dayPnlMap[t.entryDate] || 0) + pnl;
    });

    let winningDays = 0;
    let losingDays = 0;
    let neutralDays = 0;

    Object.values(dayPnlMap).forEach((pnl) => {
      if (pnl > 0) {
        winningDays++;
        if (pnl > bestDayPnl) bestDayPnl = pnl;
      } else if (pnl < 0) {
        losingDays++;
        if (pnl < worstDayPnl) worstDayPnl = pnl;
      } else {
        neutralDays++;
      }
    });

    const activeDaysCount = winningDays + losingDays + neutralDays;
    const dayWinRate = activeDaysCount > 0 ? (winningDays / activeDaysCount) * 100 : 0;
    const tradeWinRate = monthTrades.length > 0 ? (winCount / monthTrades.length) * 100 : 0;

    return {
      monthTrades,
      totalPnl,
      totalR,
      winCount,
      lossCount,
      beCount,
      winningDays,
      losingDays,
      neutralDays,
      activeDaysCount,
      dayWinRate,
      tradeWinRate,
      bestDayPnl: bestDayPnl === -Infinity ? 0 : bestDayPnl,
      worstDayPnl: worstDayPnl === Infinity ? 0 : worstDayPnl,
    };
  }, [trades, year, month]);

  const todayStr = new Date().toISOString().split('T')[0];

  // Generate calendar grid cells
  const calendarCells = [];

  // Blank filler cells for preceding month offset
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarCells.push(
      <div 
        key={`blank-${i}`} 
        className="min-h-[105px] sm:min-h-[125px] rounded-2xl border border-zinc-900/40 bg-zinc-950/20 p-2.5 opacity-25 select-none" 
      />
    );
  }

  // Actual day cells for the current month
  for (let day = 1; day <= totalDays; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayTrades = tradesByDate[dateStr] || [];
    const hasTrades = dayTrades.length > 0;
    const isToday = dateStr === todayStr;
    
    let dayPnl = 0;
    let dayR = 0;
    let winCount = 0;
    let lossCount = 0;
    let beCount = 0;

    dayTrades.forEach((t) => {
      dayPnl += Number(t.pnl) || 0;
      dayR += Number(t.rMultiple) || 0;
      if (t.status === 'WIN') winCount++;
      else if (t.status === 'LOSS') lossCount++;
      else beCount++;
    });

    const isProfit = dayPnl > 0;
    const isLoss = dayPnl < 0;
    const isNeutral = dayPnl === 0 && hasTrades;

    // Check if multiple trades took place with mixed outcomes (both wins and losses)
    const isMixedTrades = hasTrades && dayTrades.length > 1 && winCount > 0 && lossCount > 0;
    const isMultipleSameOutcome = hasTrades && dayTrades.length > 1 && !isMixedTrades;

    calendarCells.push(
      <div
        key={`day-${day}`}
        onClick={() => {
          if (hasTrades) {
            setSelectedDayData({ dateStr, dayNum: day, trades: dayTrades });
          }
        }}
        className={`group relative flex flex-col justify-between rounded-2xl border p-3 transition-all min-h-[105px] sm:min-h-[130px] ${
          isToday ? 'ring-2 ring-blue-500/80 ring-offset-2 ring-offset-zinc-950' : ''
        } ${
          hasTrades
            ? isMixedTrades
              ? 'border-amber-500/40 bg-gradient-to-br from-emerald-950/25 via-zinc-900/80 to-rose-950/25 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer'
              : isProfit
              ? 'border-emerald-500/35 bg-emerald-950/15 hover:border-emerald-400/80 hover:bg-emerald-950/30 hover:shadow-lg hover:shadow-emerald-500/10 cursor-pointer'
              : isLoss
              ? 'border-rose-500/35 bg-rose-950/15 hover:border-rose-400/80 hover:bg-rose-950/30 hover:shadow-lg hover:shadow-rose-500/10 cursor-pointer'
              : 'border-amber-500/35 bg-amber-950/15 hover:border-amber-400/80 hover:bg-amber-950/30 hover:shadow-lg hover:shadow-amber-500/10 cursor-pointer'
            : 'border-zinc-800/60 bg-zinc-900/30 hover:border-zinc-700/60'
        }`}
      >
        {/* Day Card Header: Day number + Total trade count */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={`font-mono text-xs font-bold ${
              isToday 
                ? 'h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md' 
                : hasTrades 
                ? 'text-white' 
                : 'text-zinc-500'
            }`}>
              {day}
            </span>
            {isToday && (
              <span className="hidden sm:inline-block text-[9px] font-semibold text-blue-400 uppercase">
                Aujourd'hui
              </span>
            )}
          </div>

          {hasTrades && (
            <span className="rounded-md border border-zinc-700/60 bg-zinc-950/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-300 shadow-sm">
              {dayTrades.length} trade{dayTrades.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Center: Dynamic Pastilles as specified by user */}
        {hasTrades ? (
          <div className="my-auto space-y-1.5 py-1">
            
            {/* Condition 1: Multiple trades with mixed outcomes -> Dual split badge (moitié verte / moitié rouge) */}
            {isMixedTrades ? (
              <div className="flex flex-col items-center gap-1">
                {/* Visual Dual Split Pill */}
                <div 
                  className="w-full max-w-[120px] mx-auto rounded-full overflow-hidden border border-zinc-700/80 shadow-md flex items-center text-[10px] font-mono font-bold"
                  title={`${winCount} TP (Gagné) et ${lossCount} SL (Perdu)`}
                >
                  {/* Left Half (Green / TP) */}
                  <div className="flex-1 bg-emerald-600/90 hover:bg-emerald-500 text-emerald-50 py-0.5 px-1.5 flex items-center justify-center gap-1 transition-colors">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                    <span>{winCount} TP</span>
                  </div>
                  
                  {/* Right Half (Red / SL) */}
                  <div className="flex-1 bg-rose-600/90 hover:bg-rose-500 text-rose-50 py-0.5 px-1.5 flex items-center justify-center gap-1 border-l border-zinc-950/80 transition-colors">
                    <span>{lossCount} SL</span>
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-white" />
                  </div>
                </div>

                {/* Net P&L below dual pill */}
                <div className={`font-mono text-xs font-extrabold tracking-tight ${
                  isProfit ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-amber-400'
                }`}>
                  {formatCurrency(dayPnl, currency, true)}
                </div>
              </div>
            ) : isProfit ? (
              /* Condition 2: Journée globalement en profit (TP) -> Pastille Verte */
              <div className="flex flex-col items-center gap-1">
                <div className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300 shadow-sm shadow-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>TP {dayR > 0 ? `+${dayR.toFixed(1)}R` : ''}</span>
                </div>
                <div className="font-mono text-xs sm:text-sm font-extrabold text-emerald-400 tracking-tight">
                  {formatCurrency(dayPnl, currency, true)}
                </div>
              </div>
            ) : isLoss ? (
              /* Condition 3: Journée globalement en perte (SL) -> Pastille Rouge */
              <div className="flex flex-col items-center gap-1">
                <div className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-rose-300 shadow-sm shadow-rose-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                  <span>SL {dayR !== 0 ? `${dayR.toFixed(1)}R` : ''}</span>
                </div>
                <div className="font-mono text-xs sm:text-sm font-extrabold text-rose-400 tracking-tight">
                  {formatCurrency(dayPnl, currency, true)}
                </div>
              </div>
            ) : (
              /* Condition 4: Journée neutre (BE) -> Pastille Jaune */
              <div className="flex flex-col items-center gap-1">
                <div className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300 shadow-sm shadow-amber-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <span>BE (Neutre)</span>
                </div>
                <div className="font-mono text-xs font-bold text-amber-400">
                  {formatCurrency(dayPnl, currency, true)}
                </div>
              </div>
            )}

            {/* Micro Breakdown if single outcome with multiple trades */}
            {isMultipleSameOutcome && (
              <div className="text-center text-[9px] font-mono text-zinc-400">
                {winCount > 0 && `${winCount} gagnants`}
                {lossCount > 0 && `${lossCount} perdants`}
              </div>
            )}
          </div>
        ) : (
          <div className="my-auto text-center text-xs text-zinc-600 font-mono select-none">
            —
          </div>
        )}

        {/* Footer: Click prompt on hover */}
        {hasTrades ? (
          <div className="flex items-center justify-between text-[9px] text-zinc-400 font-mono pt-1 border-t border-zinc-800/40">
            <span className="truncate max-w-[70px] text-zinc-400">
              {dayTrades[0].pair}
            </span>
            <span className="text-blue-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
              Détails →
            </span>
          </div>
        ) : (
          <div className="h-2" />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* 1. Monthly Performance Banner & Navigation Bar */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/70 p-5 sm:p-6 backdrop-blur-sm shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Month Title & Fast Switcher */}
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 shadow-md">
              <CalendarIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-bold text-white font-sans tracking-tight">
                  {monthNamesFr[month]} {year}
                </h2>
                <span className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs font-mono text-zinc-300">
                  {monthStats.activeDaysCount} jour{monthStats.activeDaysCount > 1 ? 's' : ''} actif{monthStats.activeDaysCount > 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Grille interactive de régularité financière & scan des exécutions
              </p>
            </div>
          </div>

          {/* Controls: Prev, Today, Next & Selector */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Quick Month / Year Selector */}
            <div className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950/80 p-1">
              <select
                value={month}
                onChange={(e) => handleMonthChange(Number(e.target.value))}
                className="bg-transparent text-xs text-zinc-200 font-semibold focus:outline-none px-2 py-1 cursor-pointer"
              >
                {monthNamesFr.map((m, idx) => (
                  <option key={m} value={idx} className="bg-zinc-900 text-white">
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={year}
                onChange={(e) => handleYearChange(Number(e.target.value))}
                className="bg-transparent text-xs font-mono text-zinc-300 font-semibold focus:outline-none px-1.5 py-1 border-l border-zinc-800 cursor-pointer"
              >
                {[2023, 2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y} className="bg-zinc-900 text-white">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Navigation Arrows */}
            <div className="flex items-center rounded-xl border border-zinc-800 bg-zinc-950/80 p-1">
              <button
                onClick={prevMonth}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-all active:scale-95"
                title="Mois précédent"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={goToToday}
                className="px-2.5 py-1 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-md transition-all"
              >
                Aujourd'hui
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-all active:scale-95"
                title="Mois suivant"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 2. Monthly High-Level Performance Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 border-t border-zinc-800/80 font-mono">
          
          {/* Card 1: PnL Net du Mois */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-sans font-medium">
              P&L Net Mensuel
            </span>
            <span className={`text-base font-extrabold block mt-0.5 ${
              monthStats.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {formatCurrency(monthStats.totalPnl, currency, true)}
            </span>
            <span className="text-[10px] text-zinc-400">
              {monthStats.totalR > 0 ? `+${monthStats.totalR.toFixed(1)}R généré` : `${monthStats.totalR.toFixed(1)}R`}
            </span>
          </div>

          {/* Card 2: Winrate Jours */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-sans font-medium">
              Winrate Jours
            </span>
            <span className="text-base font-bold text-blue-400 block mt-0.5">
              {monthStats.dayWinRate.toFixed(1)}%
            </span>
            <span className="text-[10px] text-zinc-400">
              {monthStats.winningDays}V / {monthStats.losingDays}D ({monthStats.activeDaysCount}j)
            </span>
          </div>

          {/* Card 3: Journées Gagnantes (Green Days) */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-3">
            <span className="text-[10px] text-emerald-300 uppercase tracking-wider block font-sans font-medium">
              Jours Verts (TP)
            </span>
            <span className="text-base font-bold text-emerald-400 block mt-0.5">
              {monthStats.winningDays} jours
            </span>
            <span className="text-[10px] text-emerald-500/80">
              Gains clôturés
            </span>
          </div>

          {/* Card 4: Journées Perdantes (Red Days) */}
          <div className="rounded-xl border border-rose-500/20 bg-rose-950/10 p-3">
            <span className="text-[10px] text-rose-300 uppercase tracking-wider block font-sans font-medium">
              Jours Rouges (SL)
            </span>
            <span className="text-base font-bold text-rose-400 block mt-0.5">
              {monthStats.losingDays} jours
            </span>
            <span className="text-[10px] text-rose-500/80">
              Pertes maîtrisées
            </span>
          </div>

          {/* Card 5: Meilleure Journée */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-sans font-medium">
              Meilleur Jour
            </span>
            <span className="text-sm font-bold text-emerald-400 block mt-0.5">
              {monthStats.bestDayPnl > 0 ? formatCurrency(monthStats.bestDayPnl, currency, true) : '—'}
            </span>
            <span className="text-[10px] text-zinc-400">
              Max profit / jour
            </span>
          </div>

          {/* Card 6: Total Trades du mois */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-sans font-medium">
              Total Trades
            </span>
            <span className="text-sm font-bold text-zinc-200 block mt-0.5">
              {monthStats.monthTrades.length} trades
            </span>
            <span className="text-[10px] text-zinc-400">
              {monthStats.tradeWinRate.toFixed(0)}% de trades gagnés
            </span>
          </div>

        </div>

        {/* 3. Visual Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800/60 text-xs text-zinc-400">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-semibold text-zinc-300">Légende des Pastilles :</span>
            
            {/* Green Pill */}
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                TP
              </span>
              <span>Journée en Profit</span>
            </div>

            {/* Red Pill */}
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-rose-300">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                SL
              </span>
              <span>Journée en Perte</span>
            </div>

            {/* Yellow Pill */}
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                BE
              </span>
              <span>Journée Neutre (Break-Even)</span>
            </div>

            {/* Dual Split Pill */}
            <div className="flex items-center gap-1.5">
              <div className="rounded-full overflow-hidden border border-zinc-700 flex text-[9px] font-mono font-bold">
                <span className="bg-emerald-600 text-white px-1.5 py-0.5">TP</span>
                <span className="bg-rose-600 text-white px-1.5 py-0.5 border-l border-zinc-900">SL</span>
              </div>
              <span>Multiples trades (Gains & Pertes mixtes)</span>
            </div>
          </div>

          <div className="text-[11px] text-zinc-400 font-mono">
            💡 Cliquez sur n'importe quel jour actif pour ouvrir les détails
          </div>
        </div>

      </div>

      {/* 4. The Monthly Calendar Grid */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950 p-3 sm:p-6 shadow-2xl space-y-3 overflow-x-auto">
        <div className="min-w-[580px] sm:min-w-0">
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5 text-center text-xs font-bold text-zinc-400 font-sans tracking-wide pb-2 border-b border-zinc-800">
            {daysOfWeekFr.map((d) => (
              <div key={d} className="uppercase text-[11px] text-zinc-400">
                <span className="hidden sm:inline">{d}</span>
                <span className="sm:hidden">{d.slice(0, 3)}</span>
              </div>
            ))}
          </div>

          {/* 7-Column Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5 mt-2">
            {calendarCells}
          </div>
        </div>
      </div>

      {/* 5. Detailed Day Trades Modal / Drawer */}
      {selectedDayData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 p-5 bg-zinc-900/60">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  <CalendarIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-sans flex items-center gap-2">
                    Trades du {selectedDayData.dateStr}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {selectedDayData.trades.length} exécution{selectedDayData.trades.length > 1 ? 's' : ''} enregistrée{selectedDayData.trades.length > 1 ? 's' : ''} ce jour
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Day Summary Pill in Modal */}
                {(() => {
                  const dayPnl = selectedDayData.trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
                  const dayR = selectedDayData.trades.reduce((sum, t) => sum + (t.rMultiple || 0), 0);
                  const isProfit = dayPnl > 0;
                  return (
                    <div className="text-right font-mono hidden sm:block">
                      <div className={`text-sm font-extrabold ${isProfit ? 'text-emerald-400' : dayPnl < 0 ? 'text-rose-400' : 'text-amber-400'}`}>
                        {formatCurrency(dayPnl, currency, true)}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {dayR > 0 ? `+${dayR.toFixed(2)}R` : `${dayR.toFixed(2)}R`}
                      </div>
                    </div>
                  );
                })()}

                <button
                  onClick={() => setSelectedDayData(null)}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                  title="Fermer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Trades List Scroll Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 divide-y divide-zinc-900">
              {selectedDayData.trades.map((t, idx) => {
                const isWin = t.status === 'WIN';
                const isLoss = t.status === 'LOSS';
                const hasScreenshots = Boolean(t.screenshotBefore || t.screenshotAfter || t.chartUrl);

                return (
                  <div
                    key={t.id || idx}
                    onClick={() => {
                      setSelectedDayData(null);
                      onSelectTrade(t);
                    }}
                    className="pt-3 first:pt-0 group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-zinc-800/70 bg-zinc-900/40 hover:border-blue-500/50 hover:bg-zinc-900/90 transition-all cursor-pointer shadow-sm"
                  >
                    {/* Left: Direction, Pair, Session, Account */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-extrabold ${
                          t.direction === 'LONG' 
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                            : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        }`}>
                          {t.direction}
                        </span>

                        <span className="font-bold text-white text-base font-sans group-hover:text-blue-300 transition-colors">
                          {t.pair}
                        </span>

                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-bold ${
                          isWin 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                            : isLoss 
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          {isWin ? 'TP (Gagné)' : isLoss ? 'SL (Perdu)' : 'BE (Neutre)'}
                        </span>

                        {hasScreenshots && (
                          <span className="flex items-center gap-1 text-[10px] text-blue-400 font-mono border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 rounded">
                            <ImageIcon className="h-3 w-3" />
                            Capture
                          </span>
                        )}
                      </div>

                      {/* Timing & Meta info */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3 text-zinc-500" />
                          {t.entryTime || '—'} {t.exitTime ? `➔ ${t.exitTime}` : ''}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-zinc-300">{t.session}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-zinc-300">
                          <Briefcase className="h-3 w-3 text-zinc-500" />
                          {t.account || 'Compte Principal'}
                        </span>
                      </div>

                      {t.notes && (
                        <p className="text-xs text-zinc-400 line-clamp-1 italic">
                          "{t.notes}"
                        </p>
                      )}
                    </div>

                    {/* Right: Metrics & PnL */}
                    <div className="flex items-center justify-between sm:justify-end gap-6 sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-800">
                      <div>
                        <div className={`font-mono text-base font-black ${
                          isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-amber-400'
                        }`}>
                          {formatCurrency(t.pnl, currency, true)}
                        </div>
                        <div className="font-mono text-xs text-zinc-400 font-semibold">
                          {t.rMultiple > 0 ? `+${t.rMultiple}R` : `${t.rMultiple}R`}
                        </div>
                      </div>

                      <div className="text-blue-400 group-hover:translate-x-0.5 transition-transform">
                        <Maximize2 className="h-4 w-4" />
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between text-xs text-zinc-400">
              <span>Cliquez sur une ligne pour ouvrir le journal complet du trade.</span>
              <button
                onClick={() => setSelectedDayData(null)}
                className="px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 font-semibold"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

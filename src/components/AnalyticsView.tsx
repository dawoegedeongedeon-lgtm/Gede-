import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell, 
  PieChart, 
  Pie,
  CartesianGrid,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { Trade, CurrencySymbol, JournalStats, AssetClass } from '../types';
import { formatCurrency, formatRMultiple } from '../utils/calculations';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown,
  Clock, 
  Target, 
  Flame, 
  ShieldAlert, 
  BarChart3,
  Layers,
  Calendar,
  Coins,
  Timer,
  Award,
  Zap,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Activity,
  ChevronRight
} from 'lucide-react';
import { PerformanceStatsModule } from './PerformanceStatsModule';

interface AnalyticsViewProps {
  trades: Trade[];
  stats: JournalStats;
  currency: CurrencySymbol;
}

type PerformanceCategory = 'all' | 'monthly' | 'assets' | 'time_minute' | 'daily' | 'strategy' | 'psychology';

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ trades, stats, currency }) => {
  const [activeCategory, setActiveCategory] = useState<PerformanceCategory>('all');
  const [selectedAssetClassFilter, setSelectedAssetClassFilter] = useState<string>('ALL');
  const [minuteZoomMode, setMinuteZoomMode] = useState<'15m_buckets' | 'exact_minute' | 'timeframe_comp'>('15m_buckets');

  // Closed Trades only for realized calculations
  const closedTrades = useMemo(() => trades.filter((t) => t.status !== 'OPEN'), [trades]);

  // =========================================================================
  // 1. PERFORMANCE PAR MOIS (Monthly Performance)
  // =========================================================================
  const monthlyStats = useMemo(() => {
    const map: Record<string, { 
      key: string; 
      label: string; 
      year: number; 
      monthIndex: number;
      total: number; 
      wins: number; 
      losses: number; 
      be: number; 
      pnl: number; 
      totalGains: number;
      totalLosses: number;
      totalR: number;
      bestTrade: number;
      worstTrade: number;
    }> = {};

    closedTrades.forEach((t) => {
      const dateStr = t.entryDate || t.exitDate || '2026-01-01';
      const [yearStr, monthStr] = dateStr.split('-');
      const year = parseInt(yearStr, 10) || new Date().getFullYear();
      const monthIndex = parseInt(monthStr, 10) - 1 || 0;
      const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

      const dateObj = new Date(year, monthIndex, 1);
      const label = dateObj.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);

      if (!map[key]) {
        map[key] = {
          key,
          label: capitalizedLabel,
          year,
          monthIndex,
          total: 0,
          wins: 0,
          losses: 0,
          be: 0,
          pnl: 0,
          totalGains: 0,
          totalLosses: 0,
          totalR: 0,
          bestTrade: -Infinity,
          worstTrade: Infinity,
        };
      }

      const pnl = Number(t.pnl) || 0;
      const r = Number(t.rMultiple) || 0;

      map[key].total++;
      map[key].pnl += pnl;
      map[key].totalR += r;

      if (pnl > map[key].bestTrade) map[key].bestTrade = pnl;
      if (pnl < map[key].worstTrade) map[key].worstTrade = pnl;

      if (t.status === 'WIN') {
        map[key].wins++;
        map[key].totalGains += Math.max(0, pnl);
      } else if (t.status === 'LOSS') {
        map[key].losses++;
        map[key].totalLosses += Math.abs(Math.min(0, pnl));
      } else if (t.status === 'BE') {
        map[key].be++;
      }
    });

    const list = Object.values(map).map((m) => {
      const decisive = m.wins + m.losses;
      const winRate = decisive > 0 ? (m.wins / decisive) * 100 : (m.total > 0 && m.be === m.total ? 0 : 0);
      const profitFactor = m.totalLosses > 0 ? m.totalGains / m.totalLosses : m.totalGains > 0 ? 99.9 : 0;
      const avgTrade = m.total > 0 ? m.pnl / m.total : 0;

      return {
        ...m,
        winRate,
        profitFactor,
        avgTrade,
        avgR: m.total > 0 ? m.totalR / m.total : 0,
        bestTrade: m.bestTrade === -Infinity ? 0 : m.bestTrade,
        worstTrade: m.worstTrade === Infinity ? 0 : m.worstTrade,
      };
    });

    // Sort chronologically
    return list.sort((a, b) => a.key.localeCompare(b.key));
  }, [closedTrades]);

  // Monthly summary metrics
  const monthlySummary = useMemo(() => {
    if (monthlyStats.length === 0) return { bestMonth: null, worstMonth: null, profitableMonthsCount: 0, losingMonthsCount: 0, avgMonthlyPnl: 0 };
    let best = monthlyStats[0];
    let worst = monthlyStats[0];
    let winMonths = 0;
    let lossMonths = 0;
    let totalPnl = 0;

    monthlyStats.forEach((m) => {
      if (m.pnl > best.pnl) best = m;
      if (m.pnl < worst.pnl) worst = m;
      if (m.pnl >= 0) winMonths++;
      else lossMonths++;
      totalPnl += m.pnl;
    });

    return {
      bestMonth: best,
      worstMonth: worst,
      profitableMonthsCount: winMonths,
      losingMonthsCount: lossMonths,
      avgMonthlyPnl: totalPnl / monthlyStats.length,
    };
  }, [monthlyStats]);

  // =========================================================================
  // 2. PERFORMANCE PAR ACTIF / PAIRE (Asset & Pair Breakdown)
  // =========================================================================
  const assetStats = useMemo(() => {
    const map: Record<string, {
      pair: string;
      assetClass: string;
      total: number;
      wins: number;
      losses: number;
      be: number;
      longs: number;
      shorts: number;
      pnl: number;
      totalGains: number;
      totalLosses: number;
      totalR: number;
      totalLots: number;
      bestTrade: number;
    }> = {};

    closedTrades.forEach((t) => {
      const p = t.pair || 'Inconnu';
      const aClass = t.assetClass || 'FOREX';

      if (!map[p]) {
        map[p] = {
          pair: p,
          assetClass: aClass,
          total: 0,
          wins: 0,
          losses: 0,
          be: 0,
          longs: 0,
          shorts: 0,
          pnl: 0,
          totalGains: 0,
          totalLosses: 0,
          totalR: 0,
          totalLots: 0,
          bestTrade: -Infinity,
        };
      }

      const pnl = Number(t.pnl) || 0;
      const r = Number(t.rMultiple) || 0;
      const qty = Number(t.quantity) || 1;

      map[p].total++;
      map[p].pnl += pnl;
      map[p].totalR += r;
      map[p].totalLots += qty;

      if (t.direction === 'LONG') map[p].longs++;
      else if (t.direction === 'SHORT') map[p].shorts++;

      if (pnl > map[p].bestTrade) map[p].bestTrade = pnl;

      if (t.status === 'WIN') {
        map[p].wins++;
        map[p].totalGains += Math.max(0, pnl);
      } else if (t.status === 'LOSS') {
        map[p].losses++;
        map[p].totalLosses += Math.abs(Math.min(0, pnl));
      } else if (t.status === 'BE') {
        map[p].be++;
      }
    });

    const list = Object.values(map).map((a) => {
      const decisive = a.wins + a.losses;
      const winRate = decisive > 0 ? (a.wins / decisive) * 100 : 0;
      const profitFactor = a.totalLosses > 0 ? a.totalGains / a.totalLosses : a.totalGains > 0 ? 99.9 : 0;
      const avgTrade = a.total > 0 ? a.pnl / a.total : 0;
      const avgR = a.total > 0 ? a.totalR / a.total : 0;

      return {
        ...a,
        winRate,
        profitFactor,
        avgTrade,
        avgR,
        bestTrade: a.bestTrade === -Infinity ? 0 : a.bestTrade,
      };
    });

    return list.sort((a, b) => b.pnl - a.pnl);
  }, [closedTrades]);

  // Filtered Assets based on Asset Class selector
  const filteredAssetStats = useMemo(() => {
    if (selectedAssetClassFilter === 'ALL') return assetStats;
    return assetStats.filter((a) => a.assetClass === selectedAssetClassFilter);
  }, [assetStats, selectedAssetClassFilter]);

  // Asset Class summary breakdown
  const assetClassBreakdown = useMemo(() => {
    const map: Record<string, { name: string; total: number; pnl: number; wins: number; losses: number }> = {};
    closedTrades.forEach((t) => {
      const c = t.assetClass || 'FOREX';
      if (!map[c]) map[c] = { name: c, total: 0, pnl: 0, wins: 0, losses: 0 };
      map[c].total++;
      map[c].pnl += Number(t.pnl) || 0;
      if (t.status === 'WIN') map[c].wins++;
      else if (t.status === 'LOSS') map[c].losses++;
    });

    return Object.values(map).map((c) => ({
      ...c,
      winRate: (c.wins + c.losses) > 0 ? (c.wins / (c.wins + c.losses)) * 100 : 0,
    })).sort((a, b) => b.pnl - a.pnl);
  }, [closedTrades]);

  // =========================================================================
  // 3. PERFORMANCE PAR HEURE & MINUTE (Hour & Minute / Scalping M1-M5)
  // =========================================================================
  
  // 3a. 24-Hours Distribution (00h à 23h)
  const hourlyStats = useMemo(() => {
    const hours: { hour: number; label: string; total: number; wins: number; losses: number; be: number; pnl: number; winRate: number }[] = [];
    for (let h = 0; h < 24; h++) {
      hours.push({
        hour: h,
        label: `${String(h).padStart(2, '0')}h`,
        total: 0,
        wins: 0,
        losses: 0,
        be: 0,
        pnl: 0,
        winRate: 0,
      });
    }

    closedTrades.forEach((t) => {
      const timeStr = t.entryTime || '14:00';
      const hourPart = parseInt(timeStr.split(':')[0], 10);
      if (!isNaN(hourPart) && hourPart >= 0 && hourPart < 24) {
        hours[hourPart].total++;
        hours[hourPart].pnl += Number(t.pnl) || 0;
        if (t.status === 'WIN') hours[hourPart].wins++;
        else if (t.status === 'LOSS') hours[hourPart].losses++;
        else if (t.status === 'BE') hours[hourPart].be++;
      }
    });

    return hours.map((h) => ({
      ...h,
      winRate: (h.wins + h.losses) > 0 ? (h.wins / (h.wins + h.losses)) * 100 : 0,
    }));
  }, [closedTrades]);

  // Golden Hour & Toxic Hour
  const hourlyInsights = useMemo(() => {
    const activeHours = hourlyStats.filter((h) => h.total > 0);
    if (activeHours.length === 0) return { goldenHour: null, toxicHour: null, mostActiveHour: null };

    let golden = activeHours[0];
    let toxic = activeHours[0];
    let mostActive = activeHours[0];

    activeHours.forEach((h) => {
      if (h.pnl > golden.pnl) golden = h;
      if (h.pnl < toxic.pnl) toxic = h;
      if (h.total > mostActive.total) mostActive = h;
    });

    return {
      goldenHour: golden,
      toxicHour: toxic,
      mostActiveHour: mostActive,
    };
  }, [hourlyStats]);

  // 3b. 15-Minutes Interval Buckets (:00-:15, :15-:30, :30-:45, :45-:59)
  const minuteIntervalStats = useMemo(() => {
    const intervals = [
      { key: '00-15', label: 'Minute :00 - :15 (Openings / Clôtures M15)', total: 0, wins: 0, losses: 0, pnl: 0 },
      { key: '15-30', label: 'Minute :15 - :30 (Développement de Bougie)', total: 0, wins: 0, losses: 0, pnl: 0 },
      { key: '30-45', label: 'Minute :30 - :45 (Macro News & Clôtures M30)', total: 0, wins: 0, losses: 0, pnl: 0 },
      { key: '45-59', label: 'Minute :45 - :59 (Fin d\'Heure / Retracements)', total: 0, wins: 0, losses: 0, pnl: 0 },
    ];

    closedTrades.forEach((t) => {
      const timeStr = t.entryTime || '14:00';
      const parts = timeStr.split(':');
      const minPart = parseInt(parts[1] || '0', 10);
      const pnl = Number(t.pnl) || 0;

      let idx = 0;
      if (minPart >= 0 && minPart < 15) idx = 0;
      else if (minPart >= 15 && minPart < 30) idx = 1;
      else if (minPart >= 30 && minPart < 45) idx = 2;
      else idx = 3;

      intervals[idx].total++;
      intervals[idx].pnl += pnl;
      if (t.status === 'WIN') intervals[idx].wins++;
      else if (t.status === 'LOSS') intervals[idx].losses++;
    });

    return intervals.map((inv) => ({
      ...inv,
      winRate: (inv.wins + inv.losses) > 0 ? (inv.wins / (inv.wins + inv.losses)) * 100 : 0,
    }));
  }, [closedTrades]);

  // 3c. Exact Minute Scalper Histogram (Pour M1 / Scalpers rapides)
  const exactMinuteStats = useMemo(() => {
    // Group in 5-minute clusters for clean readability: :00, :05, :10, :15, :20, :25, :30, :35, :40, :45, :50, :55
    const buckets: { bucket: string; total: number; wins: number; pnl: number; winRate: number }[] = [];
    for (let m = 0; m < 60; m += 5) {
      const label = `:${String(m).padStart(2, '0')}`;
      buckets.push({
        bucket: label,
        total: 0,
        wins: 0,
        pnl: 0,
        winRate: 0,
      });
    }

    closedTrades.forEach((t) => {
      const timeStr = t.entryTime || '09:00';
      const min = parseInt(timeStr.split(':')[1] || '0', 10);
      const bucketIdx = Math.floor(min / 5);
      if (bucketIdx >= 0 && bucketIdx < buckets.length) {
        buckets[bucketIdx].total++;
        buckets[bucketIdx].pnl += Number(t.pnl) || 0;
        if (t.status === 'WIN') buckets[bucketIdx].wins++;
      }
    });

    return buckets.map((b) => ({
      ...b,
      winRate: b.total > 0 ? (b.wins / b.total) * 100 : 0,
    }));
  }, [closedTrades]);

  // 3d. Timeframe Comparison (M1 vs M5 vs M15 vs 1H vs 4H vs Daily)
  const timeframeStats = useMemo(() => {
    const map: Record<string, { tf: string; total: number; wins: number; losses: number; pnl: number; totalR: number }> = {};
    closedTrades.forEach((t) => {
      const tf = t.timeframe || '5m';
      if (!map[tf]) map[tf] = { tf, total: 0, wins: 0, losses: 0, pnl: 0, totalR: 0 };
      map[tf].total++;
      map[tf].pnl += Number(t.pnl) || 0;
      map[tf].totalR += Number(t.rMultiple) || 0;
      if (t.status === 'WIN') map[tf].wins++;
      else if (t.status === 'LOSS') map[tf].losses++;
    });

    const order = ['1m', '5m', '15m', '1H', '4H', 'Daily'];
    return Object.values(map)
      .map((t) => ({
        ...t,
        winRate: (t.wins + t.losses) > 0 ? (t.wins / (t.wins + t.losses)) * 100 : 0,
        avgR: t.total > 0 ? t.totalR / t.total : 0,
      }))
      .sort((a, b) => order.indexOf(a.tf) - order.indexOf(b.tf));
  }, [closedTrades]);

  // =========================================================================
  // 4. PERFORMANCE PAR JOUR DE LA SEMAINE (Daily / Day of Week)
  // =========================================================================
  const dayOfWeekStats = useMemo(() => {
    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const days = [
      { dayIndex: 1, name: 'Lundi', total: 0, wins: 0, losses: 0, be: 0, pnl: 0, totalR: 0 },
      { dayIndex: 2, name: 'Mardi', total: 0, wins: 0, losses: 0, be: 0, pnl: 0, totalR: 0 },
      { dayIndex: 3, name: 'Mercredi', total: 0, wins: 0, losses: 0, be: 0, pnl: 0, totalR: 0 },
      { dayIndex: 4, name: 'Jeudi', total: 0, wins: 0, losses: 0, be: 0, pnl: 0, totalR: 0 },
      { dayIndex: 5, name: 'Vendredi', total: 0, wins: 0, losses: 0, be: 0, pnl: 0, totalR: 0 },
      { dayIndex: 6, name: 'Samedi (Crypto)', total: 0, wins: 0, losses: 0, be: 0, pnl: 0, totalR: 0 },
      { dayIndex: 0, name: 'Dimanche (Crypto/Open)', total: 0, wins: 0, losses: 0, be: 0, pnl: 0, totalR: 0 },
    ];

    closedTrades.forEach((t) => {
      const dateStr = t.entryDate || '2026-01-01';
      const d = new Date(dateStr);
      const dayIdx = d.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const match = days.find((item) => item.dayIndex === dayIdx);
      if (match) {
        match.total++;
        match.pnl += Number(t.pnl) || 0;
        match.totalR += Number(t.rMultiple) || 0;
        if (t.status === 'WIN') match.wins++;
        else if (t.status === 'LOSS') match.losses++;
        else if (t.status === 'BE') match.be++;
      }
    });

    return days.map((d) => ({
      ...d,
      winRate: (d.wins + d.losses) > 0 ? (d.wins / (d.wins + d.losses)) * 100 : 0,
      avgR: d.total > 0 ? d.totalR / d.total : 0,
    }));
  }, [closedTrades]);

  // Day of Week best vs worst
  const daySummary = useMemo(() => {
    const activeDays = dayOfWeekStats.filter((d) => d.total > 0);
    if (activeDays.length === 0) return { bestDay: null, worstDay: null };

    let best = activeDays[0];
    let worst = activeDays[0];

    activeDays.forEach((d) => {
      if (d.pnl > best.pnl) best = d;
      if (d.pnl < worst.pnl) worst = d;
    });

    return { bestDay: best, worstDay: worst };
  }, [dayOfWeekStats]);

  // =========================================================================
  // 5. STRATEGY & PSYCHOLOGY STATS
  // =========================================================================
  const strategyStats = useMemo(() => {
    const map: Record<string, { name: string; total: number; wins: number; losses: number; be: number; pnl: number; totalR: number }> = {};
    closedTrades.forEach((t) => {
      const s = t.strategy || 'Non spécifié';
      if (!map[s]) map[s] = { name: s, total: 0, wins: 0, losses: 0, be: 0, pnl: 0, totalR: 0 };
      map[s].total++;
      map[s].pnl += Number(t.pnl) || 0;
      map[s].totalR += Number(t.rMultiple) || 0;
      if (t.status === 'WIN') map[s].wins++;
      else if (t.status === 'LOSS') map[s].losses++;
      else if (t.status === 'BE') map[s].be++;
    });

    return Object.values(map).map((s) => ({
      ...s,
      winRate: (s.wins + s.losses) > 0 ? (s.wins / (s.wins + s.losses)) * 100 : 0,
      avgR: s.total > 0 ? s.totalR / s.total : 0,
    })).sort((a, b) => b.pnl - a.pnl);
  }, [closedTrades]);

  const emotionalImpact = useMemo(() => {
    const map: Record<string, { emotion: string; count: number; wins: number; pnl: number }> = {};
    closedTrades.forEach((t) => {
      const emo = t.emotions || 'Non spécifié';
      if (!map[emo]) map[emo] = { emotion: emo, count: 0, wins: 0, pnl: 0 };
      map[emo].count++;
      map[emo].pnl += Number(t.pnl) || 0;
      if (t.status === 'WIN') map[emo].wins++;
    });

    return Object.values(map).map((e) => ({
      ...e,
      winRate: e.count > 0 ? (e.wins / e.count) * 100 : 0,
    })).sort((a, b) => b.pnl - a.pnl);
  }, [closedTrades]);

  // R-Multiple Buckets
  const rDistribution = useMemo(() => {
    const buckets = [
      { range: '< -1R', count: 0, color: '#ef4444' },
      { range: '-1R (Full SL)', count: 0, color: '#f87171' },
      { range: '0R (BE)', count: 0, color: '#f59e0b' },
      { range: '1R - 2R', count: 0, color: '#60a5fa' },
      { range: '2R - 3R', count: 0, color: '#3b82f6' },
      { range: '> 3R (Runner)', count: 0, color: '#10b981' },
    ];

    closedTrades.forEach((t) => {
      const r = Number(t.rMultiple) || 0;
      if (r < -1.05) buckets[0].count++;
      else if (r >= -1.05 && r <= -0.8) buckets[1].count++;
      else if (r > -0.8 && r < 0.5) buckets[2].count++;
      else if (r >= 0.5 && r < 2.0) buckets[3].count++;
      else if (r >= 2.0 && r < 3.0) buckets[4].count++;
      else if (r >= 3.0) buckets[5].count++;
    });

    return buckets;
  }, [closedTrades]);

  return (
    <div className="space-y-6">
      
      {/* 1. Main Global Performance Header with Category Selector Tabs */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950 p-4 sm:p-5 backdrop-blur-md space-y-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 ring-1 ring-blue-400/40">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight font-sans">
                  Centre d'Analyse des Performances
                </h1>
                <span className="rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-blue-300">
                  {closedTrades.length} Trades Clôturés
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Décomposition granulaire par <strong className="text-zinc-200">Mois</strong>, par <strong className="text-zinc-200">Actif</strong>, par <strong className="text-zinc-200">Heure / Minute (M1/M5)</strong> et par <strong className="text-zinc-200">Jour</strong>.
              </p>
            </div>
          </div>

          {/* Quick Summary Pill */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 flex items-center gap-2">
              <span className="text-zinc-400">Net P&L :</span>
              <span className={`font-bold ${stats.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatCurrency(stats.netPnl, currency, true)}
              </span>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 flex items-center gap-2">
              <span className="text-zinc-400">Win Rate :</span>
              <span className="font-bold text-emerald-400">
                {stats.winRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Categories Bar Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar border-t border-zinc-800/80 pt-3">
          {[
            { id: 'all', label: 'Vue Complète', icon: Layers },
            { id: 'monthly', label: '📅 Par Mois', icon: Calendar, badge: `${monthlyStats.length} mois` },
            { id: 'assets', label: '🪙 Par Actif & Paire', icon: Coins, badge: `${assetStats.length} actifs` },
            { id: 'time_minute', label: '⏱️ Par Heure & Minute (M1/M5)', icon: Timer, badge: 'Scalping & Intraday' },
            { id: 'daily', label: '🗓️ Par Jour de la Semaine', icon: Activity, badge: '7 Jours' },
            { id: 'strategy', label: '🎯 Par Stratégie', icon: Target },
            { id: 'psychology', label: '🧠 Psychologie & Risque', icon: Brain },
          ].map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as PerformanceCategory)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400/50'
                    : 'border border-zinc-800/80 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-850 hover:text-zinc-200'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-blue-400'}`} />
                <span>{cat.label}</span>
                {cat.badge && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                    isActive ? 'bg-blue-700/80 text-blue-100' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {cat.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

      </div>

      {/* 2. Top Specialized 5 Mandated Metric Cards (Winrate, Profit factor, Avg Trade, DD, Total) */}
      {(activeCategory === 'all' || activeCategory === 'monthly') && (
        <PerformanceStatsModule
          stats={stats}
          trades={trades}
          currency={currency}
        />
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: PERFORMANCE PAR MOIS                                           */}
      {/* ========================================================================= */}
      {(activeCategory === 'all' || activeCategory === 'monthly') && (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 sm:p-6 backdrop-blur-sm space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white font-sans flex items-center gap-2">
                  Performance par Mois
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono">
                    Historique Mensuel
                  </span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Régularité, rentabilité mensuelle nette et progression de votre compte au fil des mois.
                </p>
              </div>
            </div>

            {/* Monthly Key Metrics Cards */}
            {monthlySummary.bestMonth && (
              <div className="flex items-center gap-2 text-xs font-mono">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-3 py-1.5">
                  <span className="text-[10px] text-zinc-400 block">Meilleur Mois 🏆</span>
                  <span className="font-bold text-emerald-400">
                    {monthlySummary.bestMonth.label} ({formatCurrency(monthlySummary.bestMonth.pnl, currency, true)})
                  </span>
                </div>
                {monthlySummary.worstMonth && monthlySummary.worstMonth.pnl < 0 && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 px-3 py-1.5">
                    <span className="text-[10px] text-zinc-400 block">Pire Mois 📉</span>
                    <span className="font-bold text-rose-400">
                      {monthlySummary.worstMonth.label} ({formatCurrency(monthlySummary.worstMonth.pnl, currency, true)})
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Monthly P&L Evolution Chart */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-300 font-mono">Courbe des Gains / Pertes par Mois</span>
              <span className="text-zinc-400 text-[11px] font-mono">
                {monthlySummary.profitableMonthsCount} Mois Positifs • {monthlySummary.losingMonthsCount} Mois Négatifs
              </span>
            </div>

            <div className="h-64 w-full rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyStats} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.5} />
                  <XAxis dataKey="label" stroke="#71717a" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                  <YAxis stroke="#71717a" tick={{ fill: '#a1a1aa', fontSize: 11 }} tickFormatter={(v) => `${v}${currency}`} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-zinc-700 bg-zinc-950 p-3 shadow-2xl font-mono text-xs space-y-1">
                            <p className="font-bold text-white text-sm">{data.label}</p>
                            <p className={`font-bold ${data.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              P&L Net : {formatCurrency(data.pnl, currency, true)}
                            </p>
                            <p className="text-zinc-300">Win Rate : {data.winRate.toFixed(1)}%</p>
                            <p className="text-zinc-400">{data.total} Trades ({data.wins}W / {data.losses}L / {data.be}BE)</p>
                            <p className="text-blue-400">Profit Factor : {data.profitFactor.toFixed(2)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                    {monthlyStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#f43f5e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Detailed Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="pb-3">Mois</th>
                  <th className="pb-3">Trades</th>
                  <th className="pb-3">Win Rate</th>
                  <th className="pb-3">Profit Factor</th>
                  <th className="pb-3">Gain Moyen</th>
                  <th className="pb-3">R Cumulé</th>
                  <th className="pb-3">Meilleur Trade</th>
                  <th className="pb-3 text-right">P&L Net Réalisé</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-sans">
                {monthlyStats.map((m) => {
                  const isProfitable = m.pnl >= 0;
                  return (
                    <tr key={m.key} className="hover:bg-zinc-800/30 transition-colors font-mono">
                      <td className="py-3 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${isProfitable ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                          <span className="font-sans font-bold">{m.label}</span>
                        </div>
                      </td>
                      <td className="py-3 text-zinc-300">
                        {m.total} <span className="text-zinc-500 text-[10px]">({m.wins}W / {m.losses}L)</span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-200">{m.winRate.toFixed(1)}%</span>
                          <div className="h-1.5 w-12 overflow-hidden rounded-full bg-zinc-800">
                            <div className="h-full bg-emerald-500" style={{ width: `${m.winRate}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-blue-400 font-bold">
                        {m.profitFactor >= 99 ? '∞' : m.profitFactor.toFixed(2)}
                      </td>
                      <td className="py-3 text-zinc-300">
                        {formatCurrency(m.avgTrade, currency, true)}
                      </td>
                      <td className="py-3 font-bold text-purple-400">
                        {m.totalR > 0 ? `+${m.totalR.toFixed(1)}R` : `${m.totalR.toFixed(1)}R`}
                      </td>
                      <td className="py-3 text-emerald-400">
                        +{formatCurrency(m.bestTrade, currency)}
                      </td>
                      <td className="py-3 text-right font-bold text-sm">
                        <span className={isProfitable ? 'text-emerald-400' : 'text-rose-400'}>
                          {formatCurrency(m.pnl, currency, true)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: PERFORMANCE PAR ACTIF / PAIRE                                  */}
      {/* ========================================================================= */}
      {(activeCategory === 'all' || activeCategory === 'assets') && (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 sm:p-6 backdrop-blur-sm space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white font-sans flex items-center gap-2">
                  Performance par Actif & Paire de Trading
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                    {assetStats.length} Instruments
                  </span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Découvrez vos actifs les plus profitables et détectez les paires à pertes récurrentes (Leaks).
                </p>
              </div>
            </div>

            {/* Asset Class Filter Buttons */}
            <div className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 p-1 text-xs font-mono">
              {['ALL', 'FOREX', 'INDICES', 'COMMODITIES', 'CRYPTO'].map((cls) => (
                <button
                  key={cls}
                  onClick={() => setSelectedAssetClassFilter(cls)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    selectedAssetClassFilter === cls
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {cls === 'ALL' ? 'Tous' : cls}
                </button>
              ))}
            </div>
          </div>

          {/* Top Asset Performers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredAssetStats.slice(0, 4).map((a, idx) => {
              const isWin = a.pnl >= 0;
              return (
                <div 
                  key={a.pair} 
                  className={`rounded-xl border p-4 transition-all relative overflow-hidden ${
                    isWin 
                      ? 'border-emerald-500/30 bg-emerald-950/15 hover:border-emerald-500/50' 
                      : 'border-rose-500/30 bg-rose-950/15 hover:border-rose-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-zinc-900/80 text-zinc-300 font-bold border border-zinc-700">
                      #{idx + 1} {a.pair}
                    </span>
                    <span className="text-[10px] uppercase font-mono text-zinc-400 font-semibold">
                      {a.assetClass}
                    </span>
                  </div>

                  <div className="mt-3">
                    <span className="text-[10px] text-zinc-400 font-mono block">P&L Réalisé :</span>
                    <span className={`text-xl font-mono font-extrabold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatCurrency(a.pnl, currency, true)}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-1 border-t border-zinc-800/80 pt-2 text-[11px] font-mono">
                    <div>
                      <span className="text-zinc-500 block text-[9px]">Winrate</span>
                      <span className="text-zinc-200 font-bold">{a.winRate.toFixed(0)}%</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[9px]">Trades</span>
                      <span className="text-zinc-300">{a.total} ({a.longs}L/{a.shorts}S)</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[9px]">PF</span>
                      <span className="text-blue-400 font-bold">{a.profitFactor >= 99 ? '∞' : a.profitFactor.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Asset P&L Distribution Bar Chart */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-zinc-300 font-mono">
              Comparatif P&L Net par Actif / Symbole ({currency})
            </span>
            <div className="h-60 w-full rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredAssetStats} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.5} />
                  <XAxis dataKey="pair" stroke="#71717a" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                  <YAxis stroke="#71717a" tick={{ fill: '#a1a1aa', fontSize: 11 }} tickFormatter={(v) => `${v}${currency}`} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-zinc-700 bg-zinc-950 p-3 shadow-2xl font-mono text-xs space-y-1">
                            <p className="font-bold text-white text-sm">{data.pair} ({data.assetClass})</p>
                            <p className={`font-bold ${data.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              P&L Net : {formatCurrency(data.pnl, currency, true)}
                            </p>
                            <p className="text-zinc-300">Win Rate : {data.winRate.toFixed(1)}%</p>
                            <p className="text-zinc-400">{data.total} Trades ({data.wins}W / {data.losses}L)</p>
                            <p className="text-purple-400">R Moyen : {data.avgR > 0 ? `+${data.avgR.toFixed(2)}R` : `${data.avgR.toFixed(2)}R`}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                    {filteredAssetStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#f43f5e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Full Asset Performance Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="pb-3">Actif / Symbole</th>
                  <th className="pb-3">Classe</th>
                  <th className="pb-3">Trades</th>
                  <th className="pb-3">Ratio Long / Short</th>
                  <th className="pb-3">Win Rate</th>
                  <th className="pb-3">Profit Factor</th>
                  <th className="pb-3">R Moyen</th>
                  <th className="pb-3 text-right">P&L Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-sans">
                {filteredAssetStats.map((a) => {
                  const isProfitable = a.pnl >= 0;
                  return (
                    <tr key={a.pair} className="hover:bg-zinc-800/30 transition-colors font-mono">
                      <td className="py-3 font-bold text-white font-mono text-sm">
                        {a.pair}
                      </td>
                      <td className="py-3">
                        <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300 font-semibold">
                          {a.assetClass}
                        </span>
                      </td>
                      <td className="py-3 text-zinc-300">
                        {a.total} <span className="text-zinc-500 text-[10px]">({a.wins}W / {a.losses}L)</span>
                      </td>
                      <td className="py-3 text-zinc-400">
                        <span className="text-blue-400 font-bold">{a.longs}L</span> / <span className="text-purple-400 font-bold">{a.shorts}S</span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-200">{a.winRate.toFixed(0)}%</span>
                          <div className="h-1.5 w-12 overflow-hidden rounded-full bg-zinc-800">
                            <div className="h-full bg-emerald-500" style={{ width: `${a.winRate}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-blue-400 font-bold">
                        {a.profitFactor >= 99 ? '∞' : a.profitFactor.toFixed(2)}
                      </td>
                      <td className="py-3 text-purple-400 font-semibold">
                        {a.avgR > 0 ? `+${a.avgR.toFixed(2)}R` : `${a.avgR.toFixed(2)}R`}
                      </td>
                      <td className="py-3 text-right font-bold text-sm">
                        <span className={isProfitable ? 'text-emerald-400' : 'text-rose-400'}>
                          {formatCurrency(a.pnl, currency, true)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: PERFORMANCE PAR HEURE & MINUTE (M1 / M5 Scalpers Mode)        */}
      {/* ========================================================================= */}
      {(activeCategory === 'all' || activeCategory === 'time_minute') && (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 sm:p-6 backdrop-blur-sm space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
                <Timer className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white font-sans flex items-center gap-2">
                  Performance par Heure & Minute (Mode Scalper M1/M5)
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono">
                    Intraday Timing
                  </span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Analyse de précision temporelle : tranches horaires 24h, quarts d'heure (:00-:15) et clusters scalping M1.
                </p>
              </div>
            </div>

            {/* Timing Toggle Sub-tabs */}
            <div className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 p-1 text-xs font-mono">
              <button
                onClick={() => setMinuteZoomMode('15m_buckets')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  minuteZoomMode === '15m_buckets'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                15-Min Clusters
              </button>
              <button
                onClick={() => setMinuteZoomMode('exact_minute')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  minuteZoomMode === 'exact_minute'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Minute M1 Exacte
              </button>
              <button
                onClick={() => setMinuteZoomMode('timeframe_comp')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  minuteZoomMode === 'timeframe_comp'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Timeframes M1→Daily
              </button>
            </div>
          </div>

          {/* Golden Hour & Toxic Hour Insights Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Golden Hour */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  HEURE D'OR (GOLDEN HOUR) 🌟
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                  Plus Profitable
                </span>
              </div>
              {hourlyInsights.goldenHour ? (
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-white font-mono">
                      {hourlyInsights.goldenHour.label} - {String(hourlyInsights.goldenHour.hour + 1).padStart(2, '0')}h
                    </span>
                    <span className="text-sm font-bold text-emerald-400 font-mono">
                      +{formatCurrency(hourlyInsights.goldenHour.pnl, currency)}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-mono pt-1">
                    {hourlyInsights.goldenHour.total} trades exécutés • {hourlyInsights.goldenHour.winRate.toFixed(0)}% Win Rate
                  </p>
                </div>
              ) : (
                <p className="text-xs text-zinc-400">Aucune donnée</p>
              )}
            </div>

            {/* Toxic Hour */}
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-400 font-mono flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  HEURE TOXIQUE (À ÉVITER) ⚠️
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono">
                  Plus de Pertes
                </span>
              </div>
              {hourlyInsights.toxicHour && hourlyInsights.toxicHour.pnl < 0 ? (
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-white font-mono">
                      {hourlyInsights.toxicHour.label} - {String(hourlyInsights.toxicHour.hour + 1).padStart(2, '0')}h
                    </span>
                    <span className="text-sm font-bold text-rose-400 font-mono">
                      {formatCurrency(hourlyInsights.toxicHour.pnl, currency, true)}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-mono pt-1">
                    {hourlyInsights.toxicHour.total} trades • {hourlyInsights.toxicHour.winRate.toFixed(0)}% Win Rate (Sur-trading / Faux signaux)
                  </p>
                </div>
              ) : (
                <div>
                  <span className="text-xl font-bold text-emerald-400 font-mono">Aucune heure toxique</span>
                  <p className="text-xs text-zinc-400 pt-1">Toutes vos heures de trading restent rentables.</p>
                </div>
              )}
            </div>

            {/* Most Active Volume Hour */}
            <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-400 font-mono flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  PIC D'ACTIVITÉ & VOLUME 📊
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono">
                  Fréquence Max
                </span>
              </div>
              {hourlyInsights.mostActiveHour ? (
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-white font-mono">
                      {hourlyInsights.mostActiveHour.label} - {String(hourlyInsights.mostActiveHour.hour + 1).padStart(2, '0')}h
                    </span>
                    <span className="text-xs text-zinc-300 font-mono">
                      ({hourlyInsights.mostActiveHour.total} trades)
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-mono pt-1">
                    P&L : {formatCurrency(hourlyInsights.mostActiveHour.pnl, currency, true)} • Winrate {hourlyInsights.mostActiveHour.winRate.toFixed(0)}%
                  </p>
                </div>
              ) : (
                <p className="text-xs text-zinc-400">Aucune donnée</p>
              )}
            </div>

          </div>

          {/* 24-Hours Hourly Bar Distribution Chart */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-300 font-mono">
                Distribution P&L sur 24 Heures (00:00 à 23:00)
              </span>
              <span className="text-zinc-400 text-[11px] font-mono">
                Open Londres (08h-10h) • Open NY (15h30-17h)
              </span>
            </div>

            <div className="h-60 w-full rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyStats} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.5} />
                  <XAxis dataKey="label" stroke="#71717a" tick={{ fill: '#a1a1aa', fontSize: 10 }} />
                  <YAxis stroke="#71717a" tick={{ fill: '#a1a1aa', fontSize: 11 }} tickFormatter={(v) => `${v}${currency}`} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-zinc-700 bg-zinc-950 p-3 shadow-2xl font-mono text-xs space-y-1">
                            <p className="font-bold text-white text-sm">{data.label} (Créneau {data.hour}h00 - {data.hour}h59)</p>
                            <p className={`font-bold ${data.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              P&L Net : {formatCurrency(data.pnl, currency, true)}
                            </p>
                            <p className="text-zinc-300">Win Rate : {data.winRate.toFixed(1)}%</p>
                            <p className="text-zinc-400">{data.total} Trades ({data.wins}W / {data.losses}L / {data.be}BE)</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                    {hourlyStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#8b5cf6' : '#f43f5e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sub-view: 15-Min Clusters OR Exact Minute M1 OR Timeframe Comparison */}
          {minuteZoomMode === '15m_buckets' && (
            <div className="space-y-3">
              <span className="text-xs font-semibold text-zinc-300 font-mono block">
                Tranches de 15 Minutes d'Exécution Intraday (:00-:15 vs :15-:30 vs :30-:45 vs :45-:59)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {minuteIntervalStats.map((inv) => {
                  const isProfitable = inv.pnl >= 0;
                  return (
                    <div key={inv.key} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-200 text-xs font-mono">{inv.label}</span>
                      </div>
                      <div className={`text-lg font-mono font-extrabold ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatCurrency(inv.pnl, currency, true)}
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono border-t border-zinc-800/80 pt-1.5 text-zinc-400">
                        <span>{inv.total} trades</span>
                        <span className="text-zinc-200 font-bold">{inv.winRate.toFixed(0)}% Winrate</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {minuteZoomMode === 'exact_minute' && (
            <div className="space-y-3">
              <span className="text-xs font-semibold text-zinc-300 font-mono block">
                Cluster des Minutes d'Entrée M1 (Précision :00 à :55)
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
                {exactMinuteStats.map((b) => {
                  const isWin = b.pnl >= 0;
                  return (
                    <div key={b.bucket} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-2.5 text-center space-y-1">
                      <span className="text-xs font-mono font-bold text-purple-300 block">{b.bucket}</span>
                      <span className={`text-xs font-mono font-bold block ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatCurrency(b.pnl, currency, true)}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono block">{b.total} trades ({b.winRate.toFixed(0)}% W)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {minuteZoomMode === 'timeframe_comp' && (
            <div className="space-y-3">
              <span className="text-xs font-semibold text-zinc-300 font-mono block">
                Rentabilité par Unité de Temps (Timeframe d'Exécution : M1, M5, M15, 1H, 4H, Daily)
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {timeframeStats.map((tf) => {
                  const isWin = tf.pnl >= 0;
                  return (
                    <div key={tf.tf} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 text-center space-y-1">
                      <span className="text-xs font-mono font-bold text-blue-400 block uppercase">UT {tf.tf}</span>
                      <span className={`text-base font-mono font-bold block ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatCurrency(tf.pnl, currency, true)}
                      </span>
                      <span className="text-[11px] text-zinc-300 font-mono block font-semibold">{tf.winRate.toFixed(0)}% Winrate</span>
                      <span className="text-[10px] text-zinc-500 font-mono block">{tf.total} trades</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: PERFORMANCE PAR JOUR DE LA SEMAINE                              */}
      {/* ========================================================================= */}
      {(activeCategory === 'all' || activeCategory === 'daily') && (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 sm:p-6 backdrop-blur-sm space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white font-sans flex items-center gap-2">
                  Performance par Jour de la Semaine
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                    Lundi → Dimanche
                  </span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Identifiez vos meilleurs jours de régularité et les sessions hebdomadaires à risque.
                </p>
              </div>
            </div>

            {daySummary.bestDay && (
              <div className="flex items-center gap-2 text-xs font-mono">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-3 py-1.5">
                  <span className="text-[10px] text-zinc-400 block">Meilleur Jour 🌟</span>
                  <span className="font-bold text-emerald-400">
                    {daySummary.bestDay.name} ({formatCurrency(daySummary.bestDay.pnl, currency, true)})
                  </span>
                </div>
                {daySummary.worstDay && daySummary.worstDay.pnl < 0 && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 px-3 py-1.5">
                    <span className="text-[10px] text-zinc-400 block">Jour le Plus Faible 📉</span>
                    <span className="font-bold text-rose-400">
                      {daySummary.worstDay.name} ({formatCurrency(daySummary.worstDay.pnl, currency, true)})
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Days Grid Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {dayOfWeekStats.slice(0, 5).map((d) => {
              const isWin = d.pnl >= 0;
              return (
                <div 
                  key={d.name}
                  className={`rounded-xl border p-4 transition-all relative overflow-hidden ${
                    isWin 
                      ? 'border-emerald-500/30 bg-zinc-950 hover:border-emerald-500/50' 
                      : 'border-rose-500/30 bg-zinc-950 hover:border-rose-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white font-sans text-sm">{d.name}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isWin ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {d.winRate.toFixed(0)}% Win
                    </span>
                  </div>

                  <div className="mt-3">
                    <span className="text-[10px] text-zinc-400 font-mono block">P&L Net Cumulé :</span>
                    <span className={`text-xl font-mono font-extrabold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatCurrency(d.pnl, currency, true)}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-zinc-800/80 pt-2 text-[11px] font-mono text-zinc-400">
                    <span>{d.total} trades ({d.wins}W/{d.losses}L)</span>
                    <span className="text-purple-400 font-bold">{d.avgR > 0 ? `+${d.avgR.toFixed(1)}R` : `${d.avgR.toFixed(1)}R`}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Day of Week Chart */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-zinc-300 font-mono">
              Comparatif P&L Réalisé par Jour de la Semaine ({currency})
            </span>
            <div className="h-56 w-full rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayOfWeekStats.slice(0, 5)} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.5} />
                  <XAxis dataKey="name" stroke="#71717a" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                  <YAxis stroke="#71717a" tick={{ fill: '#a1a1aa', fontSize: 11 }} tickFormatter={(v) => `${v}${currency}`} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-zinc-700 bg-zinc-950 p-3 shadow-2xl font-mono text-xs space-y-1">
                            <p className="font-bold text-white text-sm">{data.name}</p>
                            <p className={`font-bold ${data.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              P&L Net : {formatCurrency(data.pnl, currency, true)}
                            </p>
                            <p className="text-zinc-300">Win Rate : {data.winRate.toFixed(1)}%</p>
                            <p className="text-zinc-400">{data.total} Trades ({data.wins}W / {data.losses}L)</p>
                            <p className="text-purple-400">R Moyen : {data.avgR > 0 ? `+${data.avgR.toFixed(2)}R` : `${data.avgR.toFixed(2)}R`}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                    {dayOfWeekStats.slice(0, 5).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#f43f5e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5: STRATÉGIES, R-MULTIPLE & PSYCHOLOGIE                           */}
      {/* ========================================================================= */}
      {(activeCategory === 'all' || activeCategory === 'strategy' || activeCategory === 'psychology') && (
        <div className="space-y-6">
          
          {/* Strategy Leaderboard */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 sm:p-6 backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-sans">
                    Performance par Stratégie & Setups
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Identification de vos avantages statistiques (Edge) réels
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-800 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="pb-3">Stratégie</th>
                    <th className="pb-3">Trades</th>
                    <th className="pb-3">Win Rate</th>
                    <th className="pb-3">R Moyen</th>
                    <th className="pb-3 text-right">P&L Net Réalisé</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-sans">
                  {strategyStats.map((s) => {
                    const isProfitable = s.pnl >= 0;
                    return (
                      <tr key={s.name} className="hover:bg-zinc-800/30 transition-colors font-mono">
                        <td className="py-3 font-semibold text-white font-sans">
                          {s.name}
                        </td>
                        <td className="py-3 text-zinc-300">
                          {s.total} <span className="text-zinc-500 text-[10px]">({s.wins}W / {s.losses}L / {s.be}BE)</span>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-200">{s.winRate.toFixed(1)}%</span>
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-800">
                              <div className="h-full bg-emerald-500" style={{ width: `${s.winRate}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 font-medium text-blue-400">
                          {s.avgR > 0 ? `+${s.avgR.toFixed(2)}R` : `${s.avgR.toFixed(2)}R`}
                        </td>
                        <td className="py-3 text-right font-bold">
                          <span className={isProfitable ? 'text-emerald-400' : 'text-rose-400'}>
                            {formatCurrency(s.pnl, currency, true)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* R-Multiple & Psychology Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* R-Multiple Distribution Histogram */}
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 sm:p-6 backdrop-blur-sm space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-white font-sans">
                    Distribution du R-Multiple (Asymétrie)
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Fréquence des gains / pertes selon le multiple de risque
                  </p>
                </div>
                <span className="rounded-lg bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-300">
                  Histogramme R
                </span>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="range" stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 10 }} />
                    <YAxis stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px' }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {rDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Psychological Impact */}
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 sm:p-6 backdrop-blur-sm space-y-3">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-800/60">
                <Brain className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm sm:text-base font-semibold text-white font-sans">
                  Impact Psychologique & Discipline
                </h3>
              </div>

              <div className="space-y-2.5">
                {emotionalImpact.map((e) => {
                  const isGood = e.pnl >= 0;
                  return (
                    <div key={e.emotion} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-xs font-mono">
                      <div className="flex items-center gap-2.5">
                        <span className="font-semibold text-zinc-200 font-sans">{e.emotion}</span>
                        <span className="text-zinc-500 text-[10px]">({e.count} trades)</span>
                      </div>
                      <div className={`font-bold ${isGood ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatCurrency(e.pnl, currency, true)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};

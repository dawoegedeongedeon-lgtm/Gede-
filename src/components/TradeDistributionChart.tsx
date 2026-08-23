import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { Trade, CurrencySymbol } from '../types';
import { formatCurrency, formatRMultiple } from '../utils/calculations';
import { 
  PieChart as PieIcon, 
  CheckCircle2, 
  XCircle, 
  MinusCircle, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  ShieldAlert,
  Percent
} from 'lucide-react';

interface TradeDistributionChartProps {
  trades: Trade[];
  currency: CurrencySymbol;
}

export const TradeDistributionChart: React.FC<TradeDistributionChartProps> = ({
  trades,
  currency,
}) => {
  const [filterPeriod, setFilterPeriod] = useState<'ALL' | 'MONTH'>('ALL');

  // Filter trades based on period if requested
  const filteredTrades = useMemo(() => {
    if (filterPeriod === 'ALL') return trades;
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Check if any trades in current month, otherwise pick latest month
    const months = Array.from(new Set(trades.map((t) => (t.entryDate ? t.entryDate.substring(0, 7) : ''))))
      .filter(Boolean)
      .sort()
      .reverse();
    
    const targetMonth = months.includes(currentMonth) ? currentMonth : months[0] || currentMonth;
    return trades.filter((t) => t.entryDate && t.entryDate.startsWith(targetMonth));
  }, [trades, filterPeriod]);

  // Compute distribution dynamically
  const distribution = useMemo(() => {
    let winCount = 0;
    let lossCount = 0;
    let beCount = 0;
    let openCount = 0;

    let winPnl = 0;
    let lossPnl = 0;
    let bePnl = 0;

    let winR = 0;
    let lossR = 0;

    let bestWin = 0;
    let worstLoss = 0;

    filteredTrades.forEach((t) => {
      const pnl = Number(t.pnl) || 0;
      const r = Number(t.rMultiple) || 0;

      if (t.status === 'WIN') {
        winCount++;
        winPnl += pnl;
        winR += r;
        if (pnl > bestWin) bestWin = pnl;
      } else if (t.status === 'LOSS') {
        lossCount++;
        lossPnl += Math.abs(pnl);
        lossR += r;
        if (pnl < worstLoss) worstLoss = pnl;
      } else if (t.status === 'BE') {
        beCount++;
        bePnl += pnl;
      } else if (t.status === 'OPEN') {
        openCount++;
      }
    });

    const total = filteredTrades.length || 1;
    const closed = winCount + lossCount + beCount || 1;
    const decisive = winCount + lossCount || 1;

    const winRate = (winCount / decisive) * 100;
    const avgWin = winCount > 0 ? winPnl / winCount : 0;
    const avgLoss = lossCount > 0 ? lossPnl / lossCount : 0;
    const avgWinR = winCount > 0 ? winR / winCount : 0;
    const avgLossR = lossCount > 0 ? lossR / lossCount : 0;

    const chartData = [
      {
        name: 'Take Profit (TP)',
        status: 'WIN',
        value: winCount,
        percentage: ((winCount / total) * 100).toFixed(1),
        pnl: winPnl,
        avgPnl: avgWin,
        avgR: avgWinR,
        color: '#10b981', // Emerald 500
        gradientId: 'tpGradient',
      },
      {
        name: 'Stop Loss (SL)',
        status: 'LOSS',
        value: lossCount,
        percentage: ((lossCount / total) * 100).toFixed(1),
        pnl: -lossPnl,
        avgPnl: avgLoss,
        avgR: avgLossR,
        color: '#f43f5e', // Rose 500
        gradientId: 'slGradient',
      },
      {
        name: 'Break Even (BE)',
        status: 'BE',
        value: beCount,
        percentage: ((beCount / total) * 100).toFixed(1),
        pnl: bePnl,
        avgPnl: beCount > 0 ? bePnl / beCount : 0,
        avgR: 0,
        color: '#f59e0b', // Amber 500
        gradientId: 'beGradient',
      },
      ...(openCount > 0
        ? [
            {
              name: 'En Cours (OPEN)',
              status: 'OPEN',
              value: openCount,
              percentage: ((openCount / total) * 100).toFixed(1),
              pnl: 0,
              avgPnl: 0,
              avgR: 0,
              color: '#0ea5e9', // Sky 500
              gradientId: 'openGradient',
            },
          ]
        : []),
    ];

    return {
      winCount,
      lossCount,
      beCount,
      openCount,
      total: filteredTrades.length,
      winPnl,
      lossPnl,
      winRate,
      avgWin,
      avgLoss,
      avgWinR,
      avgLossR,
      bestWin,
      worstLoss,
      chartData,
    };
  }, [filteredTrades]);

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-xl border border-zinc-700/80 bg-zinc-950/95 p-3.5 shadow-2xl backdrop-blur-md min-w-[190px]">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: data.color }}
            />
            <span className="font-semibold text-xs text-white">
              {data.name}
            </span>
          </div>

          <div className="mt-2.5 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-zinc-400">
              <span>Nombre :</span>
              <span className="font-mono font-bold text-white">
                {data.value} ({data.percentage}%)
              </span>
            </div>
            
            {data.status !== 'OPEN' && (
              <>
                <div className="flex items-center justify-between text-zinc-400">
                  <span>P&L Total :</span>
                  <span
                    className={`font-mono font-bold ${
                      data.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {formatCurrency(data.pnl, currency, true)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Moyenne/Trade :</span>
                  <span className="font-mono text-zinc-200">
                    {formatCurrency(data.avgPnl, currency)}
                  </span>
                </div>
                {data.avgR !== 0 && (
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>R Moyen :</span>
                    <span className="font-mono font-semibold text-blue-400">
                      {formatRMultiple(data.avgR)}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 sm:p-6 backdrop-blur-sm flex flex-col justify-between">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <PieIcon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight">
              Distribution des Résultats (TP / SL / BE)
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Répartition en temps réel des issues sur {distribution.total} trades enregistrés.
            </p>
          </div>
        </div>

        {/* Toggle Period */}
        <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-950/70 p-0.5 text-xs">
          <button
            onClick={() => setFilterPeriod('ALL')}
            className={`rounded-md px-2.5 py-1 font-medium transition-all ${
              filterPeriod === 'ALL'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Global
          </button>
          <button
            onClick={() => setFilterPeriod('MONTH')}
            className={`rounded-md px-2.5 py-1 font-medium transition-all ${
              filterPeriod === 'MONTH'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Ce Mois
          </button>
        </div>
      </div>

      {/* Main Visual: Pie Chart + Category Legend Breakdown */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        
        {/* Donut Pie Chart */}
        <div className="md:col-span-5 relative flex items-center justify-center h-[200px] sm:h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<CustomPieTooltip />} />
              <Pie
                data={distribution.chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {distribution.chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Centered KPI in Donut */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-[10px] font-medium tracking-wider text-zinc-400 uppercase">
              Win Rate
            </span>
            <span className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-white">
              {distribution.winRate.toFixed(1)}%
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">
              {distribution.winCount}W / {distribution.lossCount}L
            </span>
          </div>
        </div>

        {/* Detailed Category Legend Rows */}
        <div className="md:col-span-7 space-y-2.5">
          
          {/* 1. Take Profit (TP / WIN) */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-3 flex items-center justify-between transition-all hover:bg-emerald-950/20">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-zinc-100">Take Profit (TP)</span>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
                    {distribution.winCount} trades
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400 font-mono">
                  Moyenne: <strong className="text-emerald-400">+{formatCurrency(distribution.avgWin, currency)}</strong> ({formatRMultiple(distribution.avgWinR)})
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm font-bold text-emerald-400">
                +{formatCurrency(distribution.winPnl, currency)}
              </div>
              <span className="text-[10px] text-zinc-400">
                {((distribution.winCount / (distribution.total || 1)) * 100).toFixed(0)}% du total
              </span>
            </div>
          </div>

          {/* 2. Stop Loss (SL / LOSS) */}
          <div className="rounded-xl border border-rose-500/20 bg-rose-950/10 p-3 flex items-center justify-between transition-all hover:bg-rose-950/20">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
                <XCircle className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-zinc-100">Stop Loss (SL)</span>
                  <span className="rounded-full bg-rose-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-400">
                    {distribution.lossCount} trades
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400 font-mono">
                  Moyenne: <strong className="text-rose-400">-{formatCurrency(distribution.avgLoss, currency)}</strong> ({formatRMultiple(distribution.avgLossR)})
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm font-bold text-rose-400">
                -{formatCurrency(distribution.lossPnl, currency)}
              </div>
              <span className="text-[10px] text-zinc-400">
                {((distribution.lossCount / (distribution.total || 1)) * 100).toFixed(0)}% du total
              </span>
            </div>
          </div>

          {/* 3. Break Even (BE) */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-3 flex items-center justify-between transition-all hover:bg-amber-950/20">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                <MinusCircle className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-zinc-100">Break Even (BE)</span>
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-400">
                    {distribution.beCount} trades
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400">
                  Protection de capital / 0 risque
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm font-semibold text-amber-400">
                0.00 {currency}
              </div>
              <span className="text-[10px] text-zinc-400">
                {((distribution.beCount / (distribution.total || 1)) * 100).toFixed(0)}% du total
              </span>
            </div>
          </div>

          {/* 4. Optional Open Positions */}
          {distribution.openCount > 0 && (
            <div className="rounded-xl border border-sky-500/20 bg-sky-950/10 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-zinc-100">Positions en Cours (OPEN)</span>
                    <span className="rounded-full bg-sky-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-400">
                      {distribution.openCount}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400">
                    Positions actives sur le marché
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Footer Metrics Row */}
      <div className="mt-4 pt-3 border-t border-zinc-800/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="rounded-lg bg-zinc-950/60 p-2 border border-zinc-800/50">
          <span className="text-[10px] text-zinc-400 block">Meilleur Gain (TP)</span>
          <span className="font-mono font-bold text-emerald-400">+{formatCurrency(distribution.bestWin, currency)}</span>
        </div>
        <div className="rounded-lg bg-zinc-950/60 p-2 border border-zinc-800/50">
          <span className="text-[10px] text-zinc-400 block">Pire Perte (SL)</span>
          <span className="font-mono font-bold text-rose-400">{formatCurrency(distribution.worstLoss, currency)}</span>
        </div>
        <div className="rounded-lg bg-zinc-950/60 p-2 border border-zinc-800/50">
          <span className="text-[10px] text-zinc-400 block">Ratio Gain / Perte</span>
          <span className="font-mono font-bold text-blue-400">
            {distribution.avgLoss > 0 ? (distribution.avgWin / distribution.avgLoss).toFixed(2) : '∞'} : 1
          </span>
        </div>
        <div className="rounded-lg bg-zinc-950/60 p-2 border border-zinc-800/50">
          <span className="text-[10px] text-zinc-400 block">Taux TP vs SL</span>
          <span className="font-mono font-bold text-zinc-200">
            {distribution.lossCount > 0 ? (distribution.winCount / distribution.lossCount).toFixed(2) : distribution.winCount}x
          </span>
        </div>
      </div>

    </div>
  );
};

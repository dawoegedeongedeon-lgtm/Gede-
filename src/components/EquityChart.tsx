import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { Trade, CurrencySymbol } from '../types';
import { generateEquityCurveData, formatCurrency, formatRMultiple } from '../utils/calculations';
import { TrendingUp, Activity, ArrowUpRight, ArrowDownRight, Layers, DollarSign } from 'lucide-react';

interface EquityChartProps {
  trades: Trade[];
  initialBalance: number;
  currency: CurrencySymbol;
}

export const EquityChart: React.FC<EquityChartProps> = ({
  trades,
  initialBalance,
  currency,
}) => {
  // Modes : 'pnl' (P&L Cumulé), 'balance' (Courbe de Capital), 'rMultiple' (R Cumulé)
  const [chartMode, setChartMode] = useState<'pnl' | 'balance' | 'rMultiple'>('pnl');

  const curveData = useMemo(() => {
    return generateEquityCurveData(trades, initialBalance);
  }, [trades, initialBalance]);

  const latestPoint = curveData[curveData.length - 1] || {
    balance: initialBalance,
    cumulativePnl: 0,
    cumulativeR: 0,
  };

  const isProfitable = (latestPoint.cumulativePnl ?? 0) >= 0;
  const totalTradePoints = curveData.length - 1; // excluding Start point

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isStart = data.tradeIndex === 0;
      const isWin = data.status === 'WIN';
      const isLoss = data.status === 'LOSS';
      const isBE = data.status === 'BE';

      return (
        <div className="rounded-xl border border-zinc-700/80 bg-zinc-950/95 p-3 sm:p-3.5 shadow-2xl backdrop-blur-md font-mono text-xs z-50 min-w-[190px]">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-1.5 text-zinc-400">
            <span className="font-bold text-white font-sans flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              {isStart ? 'Point Initial' : `Point #${data.tradeIndex} (${data.ticket})`}
            </span>
            <span className="text-[10px] text-zinc-400">{data.date}</span>
          </div>

          <div className="mt-2 space-y-1.5">
            {!isStart && (
              <>
                <div className="flex items-center justify-between gap-3 text-zinc-300">
                  <span className="text-zinc-400">Actif :</span>
                  <span className="font-bold text-white font-mono flex items-center gap-1">
                    {data.pair}
                    {data.direction === 'LONG' ? (
                      <span className="text-emerald-400 text-[10px]">↗</span>
                    ) : data.direction === 'SHORT' ? (
                      <span className="text-purple-400 text-[10px]">↘</span>
                    ) : null}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-zinc-400">P&L du Trade :</span>
                  <span className={`font-bold ${
                    isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-amber-400'
                  }`}>
                    {formatCurrency(data.pnl, currency, true)}
                  </span>
                </div>
              </>
            )}

            <div className="flex items-center justify-between gap-3 pt-1 border-t border-zinc-850">
              <span className="text-zinc-400">P&L Cumulé :</span>
              <span className={`font-bold ${
                data.cumulativePnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {formatCurrency(data.cumulativePnl, currency, true)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-zinc-400">Capital Compte :</span>
              <span className="font-bold text-white">
                {formatCurrency(data.balance, currency)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-zinc-400">R Cumulé :</span>
              <span className="text-blue-400 font-semibold">
                {formatRMultiple(data.cumulativeR)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-3.5 sm:p-5 backdrop-blur-sm space-y-3.5">
      
      {/* Header with Title & Mode Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight font-sans flex items-center gap-2">
              <span>Évolution du P&L & Courbe de Capital</span>
              <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {totalTradePoints} point{totalTradePoints > 1 ? 's' : ''} tracé{totalTradePoints > 1 ? 's' : ''}
              </span>
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Chaque trade ajouté génère un nouveau point chronologique sur le graphique.
          </p>
        </div>

        {/* View mode toggle - Optimized for thumb on mobile */}
        <div className="inline-flex rounded-xl border border-zinc-800 bg-zinc-950 p-1 text-xs font-mono self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setChartMode('pnl')}
            className={`min-h-[34px] rounded-lg px-3 py-1 font-semibold transition-all ${
              chartMode === 'pnl'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            P&L Cumulé ($)
          </button>
          <button
            type="button"
            onClick={() => setChartMode('balance')}
            className={`min-h-[34px] rounded-lg px-3 py-1 font-semibold transition-all ${
              chartMode === 'balance'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Capital Total ($)
          </button>
          <button
            type="button"
            onClick={() => setChartMode('rMultiple')}
            className={`min-h-[34px] rounded-lg px-3 py-1 font-semibold transition-all ${
              chartMode === 'rMultiple'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            R-Multiple (R)
          </button>
        </div>
      </div>

      {/* Main Chart Canvas - Highly fluid on mobile */}
      <div className="h-[250px] sm:h-[320px] w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={curveData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isProfitable ? '#10b981' : '#f43f5e'} stopOpacity={0.35} />
                <stop offset="95%" stopColor={isProfitable ? '#10b981' : '#f43f5e'} stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" vertical={false} />
            
            <XAxis
              dataKey="date"
              stroke="#52525b"
              tickLine={false}
              axisLine={{ stroke: '#27272a' }}
              tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }}
              tickFormatter={(val) => {
                if (!val || val === 'Départ') return 'Start';
                // Shorten date for mobile
                return val.length > 5 ? val.substring(5) : val;
              }}
            />
            
            <YAxis
              stroke="#52525b"
              tickLine={false}
              axisLine={{ stroke: '#27272a' }}
              tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }}
              tickFormatter={(val) => {
                if (chartMode === 'balance') {
                  if (Math.abs(val) >= 1000) return `${currency}${Math.round(val / 1000)}k`;
                  return `${currency}${val}`;
                }
                if (chartMode === 'pnl') {
                  if (Math.abs(val) >= 1000) return `${currency}${Math.round(val / 1000)}k`;
                  return `${currency}${val}`;
                }
                return `${val}R`;
              }}
              domain={['auto', 'auto']}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Zero Line for P&L or R-Multiple */}
            {chartMode === 'pnl' && (
              <ReferenceLine y={0} stroke="#52525b" strokeDasharray="3 3" />
            )}
            {chartMode === 'rMultiple' && (
              <ReferenceLine y={0} stroke="#52525b" strokeDasharray="3 3" />
            )}
            {chartMode === 'balance' && (
              <ReferenceLine
                y={initialBalance}
                stroke="#3f3f46"
                strokeDasharray="3 3"
                label={{ value: 'Départ', fill: '#71717a', fontSize: 10, position: 'insideTopLeft' }}
              />
            )}

            <Area
              type="monotone"
              dataKey={chartMode === 'balance' ? 'balance' : chartMode === 'pnl' ? 'cumulativePnl' : 'cumulativeR'}
              stroke={chartMode === 'pnl' ? (isProfitable ? '#10b981' : '#f43f5e') : '#3b82f6'}
              strokeWidth={2.5}
              fill={chartMode === 'pnl' ? 'url(#pnlGradient)' : 'url(#blueGradient)'}
              activeDot={{
                r: 6,
                fill: chartMode === 'pnl' ? (isProfitable ? '#34d399' : '#fb7185') : '#60a5fa',
                stroke: '#090d16',
                strokeWidth: 2,
              }}
              dot={curveData.length <= 40 ? { r: 3, fill: '#3b82f6', stroke: '#090d16', strokeWidth: 1.5 } : false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Metrics Row - Fluid on mobile screens */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-zinc-800/60 font-mono text-xs">
        
        <div className="bg-zinc-950/60 rounded-xl p-2.5 border border-zinc-800/60">
          <span className="text-zinc-500 text-[10px] uppercase block">Points / Trades</span>
          <span className="font-bold text-white text-sm">
            {totalTradePoints} trade{totalTradePoints > 1 ? 's' : ''}
          </span>
        </div>

        <div className="bg-zinc-950/60 rounded-xl p-2.5 border border-zinc-800/60">
          <span className="text-zinc-500 text-[10px] uppercase block">P&L Cumulé</span>
          <span className={`font-bold text-sm ${
            latestPoint.cumulativePnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {formatCurrency(latestPoint.cumulativePnl || 0, currency, true)}
          </span>
        </div>

        <div className="bg-zinc-950/60 rounded-xl p-2.5 border border-zinc-800/60">
          <span className="text-zinc-500 text-[10px] uppercase block">Solde Compte</span>
          <span className="font-bold text-white text-sm">
            {formatCurrency(latestPoint.balance || initialBalance, currency)}
          </span>
        </div>

        <div className="bg-zinc-950/60 rounded-xl p-2.5 border border-zinc-800/60">
          <span className="text-zinc-500 text-[10px] uppercase block">Performance R</span>
          <span className="font-bold text-blue-400 text-sm">
            {formatRMultiple(latestPoint.cumulativeR || 0)}
          </span>
        </div>

      </div>

    </div>
  );
};

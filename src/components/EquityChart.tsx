import React, { useState } from 'react';
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
import { generateEquityCurveData, formatCurrency } from '../utils/calculations';
import { TrendingUp, Maximize2, Layers } from 'lucide-react';

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
  const [chartMode, setChartMode] = useState<'balance' | 'pnl' | 'rMultiple'>('balance');
  const curveData = generateEquityCurveData(trades, initialBalance);

  const isProfitable = curveData[curveData.length - 1]?.cumulativePnl >= 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isWin = data.status === 'WIN';
      const isLoss = data.status === 'LOSS';
      const isBE = data.status === 'BE';

      return (
        <div className="rounded-xl border border-zinc-700/80 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-1.5 text-xs text-zinc-400">
            <span className="font-semibold text-zinc-200">
              {data.tradeIndex === 0 ? 'Point Initial' : `Trade ${data.ticket}`}
            </span>
            <span className="font-mono text-[11px]">{data.date}</span>
          </div>

          <div className="mt-2 space-y-1 text-xs">
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Capital :</span>
              <span className="font-mono font-bold text-white">
                {formatCurrency(data.balance, currency)}
              </span>
            </div>

            {data.tradeIndex > 0 && (
              <>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-zinc-400">P&L Trade :</span>
                  <span className={`font-mono font-bold ${
                    isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-amber-400'
                  }`}>
                    {formatCurrency(data.pnl, currency, true)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-zinc-400">Cumulé R :</span>
                  <span className="font-mono text-blue-400 font-semibold">
                    {data.cumulativeR > 0 ? `+${data.cumulativeR}R` : `${data.cumulativeR}R`}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 sm:p-6 backdrop-blur-sm">
      {/* Chart Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500" />
            <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight font-sans">
              Courbe d'Équité & Progression du Compte
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Évolution continue du solde en temps réel basé sur les {trades.length} trades exécutés.
          </p>
        </div>

        {/* View mode toggle */}
        <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-950/70 p-0.5 text-xs">
          <button
            onClick={() => setChartMode('balance')}
            className={`rounded-md px-3 py-1 font-medium transition-all ${
              chartMode === 'balance'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Capital Total
          </button>
          <button
            onClick={() => setChartMode('pnl')}
            className={`rounded-md px-3 py-1 font-medium transition-all ${
              chartMode === 'pnl'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            P&L Net
          </button>
          <button
            onClick={() => setChartMode('rMultiple')}
            className={`rounded-md px-3 py-1 font-medium transition-all ${
              chartMode === 'rMultiple'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            R-Multiple (R)
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="mt-4 h-[280px] sm:h-[340px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={curveData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#222734" vertical={false} />
            
            <XAxis
              dataKey="date"
              stroke="#52525b"
              tickLine={false}
              axisLine={{ stroke: '#27272a' }}
              tick={{ fill: '#71717a', fontSize: 11 }}
            />
            
            <YAxis
              stroke="#52525b"
              tickLine={false}
              axisLine={{ stroke: '#27272a' }}
              tick={{ fill: '#71717a', fontSize: 11 }}
              tickFormatter={(val) => {
                if (chartMode === 'balance') return `${currency}${Math.round(val / 1000)}k`;
                if (chartMode === 'pnl') return `${currency}${val}`;
                return `${val}R`;
              }}
              domain={['dataMin - 100', 'dataMax + 100']}
            />

            <Tooltip content={<CustomTooltip />} />

            {chartMode === 'pnl' && (
              <ReferenceLine y={0} stroke="#52525b" strokeDasharray="3 3" />
            )}
            {chartMode === 'balance' && (
              <ReferenceLine y={initialBalance} stroke="#3f3f46" strokeDasharray="3 3" label={{ value: 'Départ', fill: '#71717a', fontSize: 10 }} />
            )}

            <Area
              type="monotone"
              dataKey={chartMode === 'balance' ? 'balance' : chartMode === 'pnl' ? 'cumulativePnl' : 'cumulativeR'}
              stroke="#3b82f6"
              strokeWidth={2.5}
              fill="url(#blueGradient)"
              activeDot={{ r: 6, fill: '#60a5fa', stroke: '#1d4ed8', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Metrics Row */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/60 pt-3 text-xs text-zinc-400">
        <div className="flex items-center gap-4">
          <div>
            Solde Initial : <span className="font-mono text-zinc-200">{formatCurrency(initialBalance, currency)}</span>
          </div>
          <div>
            Solde Actuel : <span className="font-mono font-semibold text-emerald-400">
              {formatCurrency(curveData[curveData.length - 1]?.balance || initialBalance, currency)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          <span className="font-mono text-zinc-300">
            {isProfitable ? '+' : ''}{curveData[curveData.length - 1]?.cumulativeR || 0}R Réalisés
          </span>
        </div>
      </div>
    </div>
  );
};

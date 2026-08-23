import React, { useState } from 'react';
import { 
  X, 
  Calculator, 
  AlertTriangle, 
  Check, 
  ShieldCheck, 
  DollarSign, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { CurrencySymbol } from '../types';
import { formatCurrency } from '../utils/calculations';

interface RiskCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountBalance: number;
  currency: CurrencySymbol;
  onApplyToNewTrade?: (calc: { entryPrice: number; stopLoss: number; quantity: number; riskAmount: number }) => void;
}

export const RiskCalculatorModal: React.FC<RiskCalculatorModalProps> = ({
  isOpen,
  onClose,
  accountBalance,
  currency,
  onApplyToNewTrade,
}) => {
  const [balance, setBalance] = useState<number>(accountBalance || 25000);
  const [riskPercent, setRiskPercent] = useState<number>(1.0);
  const [entryPrice, setEntryPrice] = useState<number>(19800);
  const [stopLossPrice, setStopLossPrice] = useState<number>(19760);
  const [instrumentType, setInstrumentType] = useState<'INDICES' | 'FOREX' | 'CRYPTO' | 'GOLD'>('INDICES');

  if (!isOpen) return null;

  const riskAmount = (balance * (riskPercent / 100));
  const stopDistance = Math.abs(entryPrice - stopLossPrice);

  let calculatedQuantity = 0;
  if (stopDistance > 0) {
    if (instrumentType === 'FOREX') {
      // Standard lot = 100,000 units. 1 pip = 0.0001 (or 0.01 for JPY)
      const pips = stopDistance * 10000;
      calculatedQuantity = pips > 0 ? riskAmount / (pips * 10) : 0;
    } else {
      // Indices, Crypto, Gold
      calculatedQuantity = riskAmount / stopDistance;
    }
  }

  const roundedQty = Math.round(calculatedQuantity * 100) / 100;
  const isHighRisk = riskPercent > 2.0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-sans">
                Calculateur de Risque & Taille de Position
              </h3>
              <p className="text-xs text-zinc-400">
                Dimensionnement chirurgical pour préserver votre capital
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Inputs */}
        <div className="space-y-4 text-xs">
          
          {/* Balance & Risk % */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-400 font-medium mb-1">Capital du Compte</label>
              <div className="relative">
                <input
                  type="number"
                  value={balance}
                  onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-white font-semibold focus:border-blue-500 focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 font-mono">
                  {currency}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 font-medium mb-1">Risque par Trade (%)</label>
              <div className="flex gap-1.5">
                {[0.5, 1.0, 1.5, 2.0].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRiskPercent(r)}
                    className={`flex-1 rounded-lg py-1.5 font-mono font-medium transition-all ${
                      riskPercent === r
                        ? 'bg-blue-600 text-white font-bold'
                        : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {r}%
                  </button>
                ))}
              </div>
              <input
                type="number"
                step="0.1"
                value={riskPercent}
                onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 0)}
                className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1 text-center font-mono text-zinc-200 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Instrument Type */}
          <div>
            <label className="block text-zinc-400 font-medium mb-1">Type d'Instrument</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'INDICES', label: 'Indices' },
                { id: 'FOREX', label: 'Forex (Lots)' },
                { id: 'CRYPTO', label: 'Crypto' },
                { id: 'GOLD', label: 'Gold (XAU)' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setInstrumentType(t.id as any)}
                  className={`rounded-xl py-2 font-medium text-[11px] transition-all ${
                    instrumentType === t.id
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 font-semibold'
                      : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Entry & Stop Loss */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-400 font-medium mb-1">Prix d'Entrée Prévu</label>
              <input
                type="number"
                step="any"
                value={entryPrice}
                onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-white font-semibold focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-zinc-400 font-medium mb-1">Stop Loss Prévu</label>
              <input
                type="number"
                step="any"
                value={stopLossPrice}
                onChange={(e) => setStopLossPrice(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-rose-400 font-semibold focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Warnings */}
          {isHighRisk && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-amber-300">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>
                Attention : Un risque supérieur à 2.0% par trade augmente drastiquement le risque de ruine (Drawdown).
              </span>
            </div>
          )}

          {/* Results Box */}
          <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-950/20 to-zinc-900/60 p-4 space-y-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-blue-400 font-bold block">
              Résultats du Calcul
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono">
              <div>
                <span className="text-zinc-400 text-[10px] block">Risque Monétaire Max</span>
                <span className="text-base font-bold text-rose-400">
                  {formatCurrency(riskAmount, currency)}
                </span>
              </div>

              <div>
                <span className="text-zinc-400 text-[10px] block">Distance Stop Loss</span>
                <span className="text-base font-bold text-zinc-200">
                  {stopDistance.toFixed(2)} pts / pips
                </span>
              </div>

              <div className="col-span-2 sm:col-span-1 rounded-lg bg-blue-600/20 border border-blue-500/30 p-2 text-center">
                <span className="text-blue-300 text-[10px] block uppercase font-bold">
                  Taille Recommandée
                </span>
                <span className="text-lg font-bold text-blue-400">
                  {roundedQty} {instrumentType === 'FOREX' ? 'Lots' : 'Contrats/Unités'}
                </span>
              </div>
            </div>

            {/* Target Projections */}
            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
              <span>Gain @ 2R: <strong className="text-emerald-400">{formatCurrency(riskAmount * 2, currency)}</strong></span>
              <span>Gain @ 3R: <strong className="text-emerald-400">{formatCurrency(riskAmount * 3, currency)}</strong></span>
              <span>Gain @ 4R: <strong className="text-emerald-400">{formatCurrency(riskAmount * 4, currency)}</strong></span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-zinc-800 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};

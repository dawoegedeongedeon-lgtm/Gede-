import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Edit3, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Calendar, 
  Layers, 
  ExternalLink,
  Shield,
  Activity,
  Award,
  AlertCircle
} from 'lucide-react';
import { Trade, CurrencySymbol } from '../types';
import { formatCurrency, formatRMultiple } from '../utils/calculations';

interface TradeDetailDrawerProps {
  trade: Trade | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
  currency: CurrencySymbol;
}

export const TradeDetailDrawer: React.FC<TradeDetailDrawerProps> = ({
  trade,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  currency,
}) => {
  const [aiReview, setAiReview] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  if (!isOpen || !trade) return null;

  const isWin = trade.status === 'WIN';
  const isLoss = trade.status === 'LOSS';
  const isBE = trade.status === 'BE';

  // Planned R:R calculation
  const plannedRiskDistance = Math.abs(trade.entryPrice - trade.stopLoss);
  const plannedRewardDistance = trade.takeProfit ? Math.abs(trade.takeProfit - trade.entryPrice) : 0;
  const plannedRR = plannedRiskDistance > 0 && plannedRewardDistance > 0 
    ? (plannedRewardDistance / plannedRiskDistance).toFixed(2) 
    : 'N/A';

  const handleRequestAiReview = async () => {
    setIsLoadingAi(true);
    setAiError(null);
    try {
      const res = await fetch('/api/ai-coach/trade-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trade, currency }),
      });

      if (!res.ok) {
        throw new Error('Erreur lors de la récupération de la revue IA.');
      }

      const data = await res.json();
      setAiReview(data.review);
    } catch (err: any) {
      setAiError(err.message || 'Impossible de joindre le Coach IA.');
    } finally {
      setIsLoadingAi(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold ${
              trade.direction === 'LONG'
                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
            }`}>
              {trade.direction === 'LONG' ? 'LONG ↗' : 'SHORT ↘'}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white font-sans">{trade.pair}</h2>
                <span className="font-mono text-xs text-zinc-400">{trade.ticketNumber}</span>
              </div>
              <p className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5 flex-wrap">
                <Calendar className="h-3 w-3" /> {trade.entryDate} {trade.entryTime} • {trade.session} ({trade.timeframe})
                {trade.account && (
                  <span className="rounded-md border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300 font-medium">
                    {trade.account}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(trade)}
              className="p-2 text-zinc-400 hover:text-white rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 transition-all"
              title="Modifier ce trade"
            >
              <Edit3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Supprimer le trade ${trade.pair} ?`)) {
                  onDelete(trade.id);
                  onClose();
                }
              }}
              className="p-2 text-zinc-400 hover:text-rose-400 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 transition-all"
              title="Supprimer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Highlight Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5">
            <span className="text-[10px] uppercase font-medium text-zinc-400 tracking-wider block">
              P&L Net Réalisé
            </span>
            <div className={`font-mono text-xl font-bold mt-1 ${
              isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-amber-400'
            }`}>
              {formatCurrency(trade.pnl, currency, true)}
            </div>
            <span className="text-[11px] text-zinc-400 font-mono">
              {trade.pnlPercentage >= 0 ? '+' : ''}{trade.pnlPercentage.toFixed(2)}% du compte
            </span>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5">
            <span className="text-[10px] uppercase font-medium text-zinc-400 tracking-wider block">
              R-Multiple Réalisé
            </span>
            <div className={`font-mono text-xl font-bold mt-1 ${
              isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-amber-400'
            }`}>
              {formatRMultiple(trade.rMultiple)}
            </div>
            <span className="text-[11px] text-zinc-400 font-mono">
              Prévu : 1:{plannedRR}
            </span>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5">
            <span className="text-[10px] uppercase font-medium text-zinc-400 tracking-wider block">
              Risque Engagé ($)
            </span>
            <div className="font-mono text-xl font-bold text-zinc-100 mt-1">
              {formatCurrency(trade.riskAmount, currency)}
            </div>
            <span className="text-[11px] text-zinc-400 font-mono">
              Frais : {formatCurrency(trade.fees, currency)}
            </span>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5">
            <span className="text-[10px] uppercase font-medium text-zinc-400 tracking-wider block">
              Discipline & Note
            </span>
            <div className="font-mono text-xl font-bold text-amber-400 mt-1">
              {'★'.repeat(trade.executionRating || 5)}
            </div>
            <span className="text-[11px] text-zinc-300 font-mono">
              {trade.emotions}
            </span>
          </div>
        </div>

        {/* Execution Details Table */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
          <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider font-mono">
            Paramètres d'Exécution
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <span className="text-zinc-400 block text-[10px]">Prix d'Entrée</span>
              <span className="text-white font-bold">{trade.entryPrice}</span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px]">Prix de Sortie</span>
              <span className="text-white font-bold">{trade.exitPrice}</span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px]">Stop Loss</span>
              <span className="text-rose-400 font-bold">{trade.stopLoss}</span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px]">Take Profit</span>
              <span className="text-emerald-400 font-bold">{trade.takeProfit || 'Manuel'}</span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px]">Quantité / Lots</span>
              <span className="text-zinc-200 font-semibold">{trade.quantity}</span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px]">Stratégie</span>
              <span className="text-blue-400 font-semibold">{trade.strategy}</span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px]">Session</span>
              <span className="text-zinc-200 font-semibold">{trade.session}</span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px]">Erreur Notée</span>
              <span className="text-amber-400 font-semibold">
                {(trade.mistakes || []).join(', ') || 'Aucune'}
              </span>
            </div>
          </div>
        </div>

        {/* Section Analyse Technique */}
        {((trade.indicators && trade.indicators.length > 0) ||
          (trade.supportLevels && trade.supportLevels.length > 0) ||
          (trade.resistanceLevels && trade.resistanceLevels.length > 0) ||
          (trade.chartPatterns && trade.chartPatterns.length > 0) ||
          trade.technicalNotes) && (
          <div className="rounded-xl border border-blue-500/30 bg-blue-950/15 p-4 space-y-3.5">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
              <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-blue-400" />
                Analyse Technique & Confluences Graphiques
              </h4>
              <span className="text-[10px] text-zinc-400 font-mono">
                {trade.timeframe} • {trade.pair}
              </span>
            </div>

            {/* Indicateurs & Patterns Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Indicateurs */}
              {trade.indicators && trade.indicators.length > 0 && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 space-y-1.5">
                  <span className="text-[10px] uppercase font-semibold text-zinc-400 block">
                    Indicateurs Utilisés
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {trade.indicators.map((ind) => (
                      <span
                        key={ind}
                        className="text-xs px-2 py-0.5 rounded-md border border-blue-500/40 bg-blue-500/15 text-blue-300 font-medium font-mono"
                      >
                        {ind}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Schémas & Patterns */}
              {trade.chartPatterns && trade.chartPatterns.length > 0 && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 space-y-1.5">
                  <span className="text-[10px] uppercase font-semibold text-zinc-400 block">
                    Schémas / Patterns Observés
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {trade.chartPatterns.map((pattern) => (
                      <span
                        key={pattern}
                        className="text-xs px-2 py-0.5 rounded-md border border-indigo-500/40 bg-indigo-500/15 text-indigo-300 font-medium"
                      >
                        {pattern}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Supports & Resistances */}
            {((trade.supportLevels && trade.supportLevels.length > 0) ||
              (trade.resistanceLevels && trade.resistanceLevels.length > 0)) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {trade.supportLevels && trade.supportLevels.length > 0 && (
                  <div className="rounded-lg border border-emerald-900/30 bg-emerald-950/20 p-2.5 space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-emerald-400 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      Supports Clés (Demand / Plafond)
                    </span>
                    <div className="flex flex-wrap gap-1.5 font-mono">
                      {trade.supportLevels.map((lvl) => (
                        <span
                          key={lvl}
                          className="text-xs px-2 py-0.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-bold"
                        >
                          S: {lvl}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {trade.resistanceLevels && trade.resistanceLevels.length > 0 && (
                  <div className="rounded-lg border border-rose-900/30 bg-rose-950/20 p-2.5 space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-rose-400 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                      Résistances Clés (Supply / Sol)
                    </span>
                    <div className="flex flex-wrap gap-1.5 font-mono">
                      {trade.resistanceLevels.map((lvl) => (
                        <span
                          key={lvl}
                          className="text-xs px-2 py-0.5 rounded-md border border-rose-500/40 bg-rose-500/10 text-rose-300 font-bold"
                        >
                          R: {lvl}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Description / Notes Techniques */}
            {trade.technicalNotes && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-zinc-400 block font-mono">
                  Description de la Structure Technique
                </span>
                <p className="text-xs text-zinc-200 leading-relaxed">
                  {trade.technicalNotes}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Chart Screenshots (Avant / Après) */}
        {(trade.screenshotBefore || trade.screenshotAfter || trade.chartUrl) && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
            <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider font-mono flex items-center justify-between">
              <span>Captures Graphiques</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(trade.screenshotBefore || trade.chartUrl) && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-blue-300 font-semibold font-mono">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-blue-400"></span>
                      Capture Avant Trade
                    </span>
                    <a 
                      href={trade.screenshotBefore || trade.chartUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5"
                    >
                      Agrandir <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                  <div className="rounded-lg overflow-hidden border border-zinc-800/80 bg-zinc-950 max-h-56 flex items-center justify-center">
                    <img
                      src={trade.screenshotBefore || trade.chartUrl}
                      alt="Capture Avant Trade"
                      className="w-full h-auto max-h-56 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              )}

              {trade.screenshotAfter && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-emerald-300 font-semibold font-mono">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                      Capture Après Trade
                    </span>
                    <a 
                      href={trade.screenshotAfter} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-[10px] text-emerald-400 hover:underline flex items-center gap-0.5"
                    >
                      Agrandir <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                  <div className="rounded-lg overflow-hidden border border-zinc-800/80 bg-zinc-950 max-h-56 flex items-center justify-center">
                    <img
                      src={trade.screenshotAfter}
                      alt="Capture Après Trade"
                      className="w-full h-auto max-h-56 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes & Key Takeaway */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-1.5">
            <h4 className="text-xs font-semibold text-zinc-300 font-sans">
              Notes du Trader
            </h4>
            <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {trade.notes || "Aucune note consignée pour ce trade."}
            </p>
          </div>

          <div className="rounded-xl border border-blue-900/30 bg-blue-950/10 p-4 space-y-1.5">
            <h4 className="text-xs font-semibold text-blue-400 font-sans flex items-center gap-1.5">
              <Award className="h-4 w-4" /> Leçon / Règle d'Or Retenue
            </h4>
            <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {trade.keyTakeaway || "Aucune leçon particulière saisie."}
            </p>
          </div>
        </div>

        {/* Tre13ze AI Surgical Trade Review */}
        <div className="rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-950/30 to-zinc-900/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-400" />
              <h4 className="text-xs font-bold text-white font-sans uppercase tracking-wider">
                Revue Chirurgicale par l'IA Coach
              </h4>
            </div>
            {!aiReview && (
              <button
                onClick={handleRequestAiReview}
                disabled={isLoadingAi}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1 text-xs font-semibold text-white transition-all disabled:opacity-50"
              >
                {isLoadingAi ? 'Analyse en cours...' : 'Générer Diagnostic IA'}
              </button>
            )}
          </div>

          {isLoadingAi && (
            <div className="p-4 text-center text-xs text-blue-300 animate-pulse font-mono">
              Le Coach IA analyse les coordonnées d'exécution, le R:R et la structure du trade...
            </div>
          )}

          {aiError && (
            <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-950/20 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{aiError}</span>
            </div>
          )}

          {aiReview && (
            <div className="mt-2 rounded-lg bg-zinc-950/80 p-4 border border-zinc-800 text-xs text-zinc-200 leading-relaxed space-y-2 whitespace-pre-wrap font-sans">
              {aiReview}
            </div>
          )}
        </div>

        {/* Close */}
        <div className="flex justify-end pt-2 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition-all"
          >
            Fermer l'inspecteur
          </button>
        </div>

      </div>
    </div>
  );
};

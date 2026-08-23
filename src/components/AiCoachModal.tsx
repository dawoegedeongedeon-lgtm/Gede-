import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Send, 
  Brain, 
  Target, 
  RefreshCw, 
  AlertCircle,
  Share2,
  Check,
  Award,
  ShieldCheck,
  Copy,
  Calendar
} from 'lucide-react';
import { Trade, CurrencySymbol, WeeklyAiReport } from '../types';

interface AiCoachModalProps {
  isOpen: boolean;
  onClose: () => void;
  trades: Trade[];
  accountBalance: number;
  currency: CurrencySymbol;
  onNavigateToFullPage?: () => void;
}

export const AiCoachModal: React.FC<AiCoachModalProps> = ({
  isOpen,
  onClose,
  trades,
  accountBalance,
  currency,
  onNavigateToFullPage,
}) => {
  const [activeMode, setActiveMode] = useState<'week_audit' | 'chat'>('week_audit');
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyAiReport | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  // Run Weekly Analysis (5 Blocks, 100% Truthful, scans notes + numbers)
  const runWeeklyAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    setShareUrl(null);
    try {
      const res = await fetch('/api/ai-coach/analyze-week', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trades,
          weekRange: 'Semaine Récente',
          accountBalance,
          currency,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Erreur lors de l’audit de la semaine.');
      }

      const data = await res.json();
      if (data.success && data.report) {
        setWeeklyReport(data.report);
        setAnalysisText(data.report.analysis);
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  // Run Custom Prompt Analysis
  const runCustomAnalysis = async (prompt?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai-coach/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trades,
          userPrompt: prompt || customPrompt || undefined,
          accountBalance,
          currency,
        }),
      });

      if (!res.ok) {
        throw new Error('Erreur lors de la communication avec le Coach IA.');
      }

      const data = await res.json();
      setAnalysisText(data.analysis);
      setWeeklyReport(null);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  // Share Report as Public Link
  const handleShareReport = async () => {
    if (!weeklyReport && !analysisText) return;

    try {
      const reportPayload = {
        id: weeklyReport?.id || `report-${Date.now().toString(36)}`,
        weekLabel: weeklyReport?.weekLabel || 'Analyse IA',
        metrics: weeklyReport?.metrics || {
          totalTrades: trades.length,
          wins: trades.filter(t => t.status === 'WIN').length,
          losses: trades.filter(t => t.status === 'LOSS').length,
          be: trades.filter(t => t.status === 'BE').length,
          winRate: 'N/A',
          netPnl: 'N/A',
          totalR: 'N/A',
          avgWin: 'N/A',
          avgLoss: 'N/A',
          profitFactor: 'N/A',
          accountBalance: String(accountBalance),
          weekRange: 'Semaine Récente',
        },
        disciplineScore: weeklyReport?.disciplineScore || 80,
        content: analysisText || '',
        tradesCount: trades.length,
        createdAt: new Date().toISOString(),
      };

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportPayload),
      });

      if (!res.ok) throw new Error('Impossible de sauvegarder le rapport.');

      const data = await res.json();
      const generatedUrl = `${window.location.origin}${window.location.pathname}?report=${data.reportId}`;
      setShareUrl(generatedUrl);
      await navigator.clipboard.writeText(generatedUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 4000);
    } catch (err: any) {
      setError('Erreur lors du partage : ' + err.message);
    }
  };

  const QUICK_QUESTIONS = [
    "🔍 Détecter mes fuites de capital et pires erreurs",
    "⚡ Quel est mon setup le plus rentable et fiable ?",
    "⏰ Analyser ma performance par session horaire",
    "🎯 Établir mon plan d'action pour la semaine prochaine"
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-5 my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25 ring-1 ring-blue-400/40">
              <Brain className="h-5 w-5 text-white" />
              <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-zinc-950 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white font-sans">
                  Tre13ze AI Trading Coach
                </h2>
                <span className="rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-mono font-medium tracking-wider text-blue-400 uppercase">
                  Gemini 3.7
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Audit 100% véridique, sans flatterie • Scan quantitatif & journal écrit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveMode('week_audit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeMode === 'week_audit'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              📅 Audit Hebdomadaire (5 Blocs)
            </button>
            <button
              onClick={() => setActiveMode('chat')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeMode === 'chat'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              💬 Question Libre au Coach
            </button>
          </div>

          {onNavigateToFullPage && (
            <button
              onClick={() => {
                onClose();
                onNavigateToFullPage();
              }}
              className="text-[11px] text-blue-400 hover:underline font-medium"
            >
              Ouvrir la page complète →
            </button>
          )}
        </div>

        {/* Mode 1: Weekly Audit (5 Blocks) */}
        {activeMode === 'week_audit' && (
          <div className="space-y-4">
            
            {/* Primary Action Button: [ Analyser ma semaine ] */}
            <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-950/20 to-zinc-900/60 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white font-sans flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Rapport Hebdomadaire en 5 Blocs Structurés
                </h3>
                <p className="text-xs text-zinc-400 max-w-md">
                  L'IA scanne vos <strong>{trades.length} trades</strong> (statistiques chiffrées + texte libre du journal).
                </p>
              </div>

              <button
                onClick={runWeeklyAnalysis}
                disabled={isLoading || trades.length === 0}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Audit en cours...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-blue-200 animate-pulse" />
                    <span>[ Analyser ma semaine ]</span>
                  </>
                )}
              </button>
            </div>

            {/* Share link banner if active */}
            {shareUrl && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-3 text-xs text-emerald-200 flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] truncate">Lien copié : {shareUrl}</span>
                <span className="text-[10px] font-bold uppercase bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-300">Copié</span>
              </div>
            )}
          </div>
        )}

        {/* Mode 2: Chat / Custom Prompt */}
        {activeMode === 'chat' && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {QUICK_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCustomPrompt(q);
                    runCustomAnalysis(q);
                  }}
                  disabled={isLoading}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-300 hover:border-blue-500/50 hover:bg-blue-950/20 hover:text-blue-300 transition-all disabled:opacity-50 text-left"
                >
                  {q}
                </button>
              ))}
            </div>

            <div className="relative">
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customPrompt.trim()) {
                    runCustomAnalysis();
                  }
                }}
                placeholder="Posez une question sur vos trades, vos pertes, vos sessions..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-4 pr-24 py-2.5 text-xs text-white placeholder-zinc-400 focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={() => runCustomAnalysis()}
                disabled={isLoading || (!customPrompt.trim() && !analysisText)}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1 text-xs font-semibold text-white transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>{isLoading ? 'Analyse...' : 'Analyser'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-3 animate-pulse text-xs text-zinc-400 font-mono">
            <div className="h-4 bg-zinc-800 rounded w-1/3" />
            <div className="h-3 bg-zinc-800 rounded w-full" />
            <div className="h-3 bg-zinc-800 rounded w-5/6" />
            <div className="h-3 bg-zinc-800 rounded w-4/6" />
            <div className="pt-2 text-center text-blue-400">
              Analyse sans complaisance des métriques et des notes du journal en cours...
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Output Render */}
        {analysisText && !isLoading && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Award className="h-4 w-4 text-blue-400" />
                Rapport du Coach IA
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleShareReport}
                  className="flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg transition-all"
                >
                  {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5" />}
                  <span>{isCopied ? 'Lien copié' : 'Partager le rapport'}</span>
                </button>
              </div>
            </div>

            <div className="max-h-[45vh] overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 text-xs text-zinc-200 leading-relaxed space-y-3 font-sans whitespace-pre-wrap">
              {analysisText}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-800 pt-3 text-xs text-zinc-400">
          <span className="font-mono text-[11px]">
            {trades.length} trades scannés • Capital: {currency}{accountBalance}
          </span>
          <button
            onClick={onClose}
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-1.5 text-zinc-300 hover:text-white transition-all cursor-pointer"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};

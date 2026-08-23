import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Brain, 
  Share2, 
  Download, 
  Copy, 
  Check, 
  AlertTriangle, 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Award, 
  Zap, 
  Calendar, 
  RefreshCw, 
  ExternalLink,
  MessageSquare,
  Flame,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  Briefcase
} from 'lucide-react';
import { Trade, CurrencySymbol, TradingAccount, WeeklyAiReport } from '../types';
import { formatCurrency } from '../utils/calculations';

interface AiCoachViewProps {
  trades: Trade[];
  accounts: TradingAccount[];
  activeAccountId: string;
  currency: CurrencySymbol;
  accountBalance: number;
}

export const AiCoachView: React.FC<AiCoachViewProps> = ({
  trades,
  accounts,
  activeAccountId,
  currency,
  accountBalance,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'last_week' | 'month' | 'all'>('week');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentReport, setCurrentReport] = useState<WeeklyAiReport | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [savedReports, setSavedReports] = useState<WeeklyAiReport[]>(() => {
    try {
      const saved = localStorage.getItem('tre13ze_saved_reports_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const activeAccount = useMemo(() => {
    return accounts.find(a => a.id === activeAccountId) || null;
  }, [accounts, activeAccountId]);

  // Filter trades based on selected period
  const filteredTrades = useMemo(() => {
    const now = new Date();
    return trades.filter((t) => {
      if (selectedPeriod === 'all') return true;
      if (!t.entryDate) return true;
      
      const tradeDate = new Date(t.entryDate);
      const diffTime = Math.abs(now.getTime() - tradeDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (selectedPeriod === 'week') {
        return diffDays <= 7;
      }
      if (selectedPeriod === 'last_week') {
        return diffDays > 7 && diffDays <= 14;
      }
      if (selectedPeriod === 'month') {
        return diffDays <= 31;
      }
      return true;
    });
  }, [trades, selectedPeriod]);

  // Metrics for the selected trades
  const periodMetrics = useMemo(() => {
    const count = filteredTrades.length;
    const wins = filteredTrades.filter(t => t.status === 'WIN').length;
    const losses = filteredTrades.filter(t => t.status === 'LOSS').length;
    const be = filteredTrades.filter(t => t.status === 'BE').length;
    const netPnl = filteredTrades.reduce((acc, t) => acc + (Number(t.pnl) || 0), 0);
    const totalR = filteredTrades.reduce((acc, t) => acc + (Number(t.rMultiple) || 0), 0);
    const winRate = count > 0 ? ((wins / count) * 100).toFixed(1) : '0';
    const notesCount = filteredTrades.filter(t => t.notes && t.notes.trim().length > 0).length;
    
    return { count, wins, losses, be, netPnl, totalR, winRate, notesCount };
  }, [filteredTrades]);

  const periodLabel = useMemo(() => {
    if (selectedPeriod === 'week') return 'Semaine en cours (7 derniers jours)';
    if (selectedPeriod === 'last_week') return 'Semaine précédente (J-8 à J-14)';
    if (selectedPeriod === 'month') return 'Mois en cours (30 derniers jours)';
    return 'Tous les trades disponibles';
  }, [selectedPeriod]);

  // Run Weekly AI Analysis
  const handleAnalyzeWeek = async () => {
    if (filteredTrades.length === 0) {
      setError("Aucun trade trouvé pour la période sélectionnée. Ajoutez des trades ou élargissez la période.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setShareUrl(null);

    try {
      const res = await fetch('/api/ai-coach/analyze-week', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trades: filteredTrades,
          weekRange: periodLabel,
          accountBalance,
          currency,
          accountName: activeAccount ? activeAccount.name : 'Tous les comptes',
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors de la génération du rapport.');
      }

      const data = await res.json();
      if (data.success && data.report) {
        setCurrentReport(data.report);
        
        // Auto-save to saved reports
        const updated = [data.report, ...savedReports.filter(r => r.id !== data.report.id)].slice(0, 10);
        setSavedReports(updated);
        localStorage.setItem('tre13ze_saved_reports_v1', JSON.stringify(updated));
      } else {
        throw new Error('Réponse invalide du serveur.');
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de l’analyse.');
    } finally {
      setIsLoading(false);
    }
  };

  // Share Report & Generate Public Unique Link
  const handleShareReport = async () => {
    if (!currentReport) return;

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentReport.id,
          weekLabel: currentReport.weekLabel,
          accountName: currentReport.accountName,
          metrics: currentReport.metrics,
          disciplineScore: currentReport.disciplineScore,
          content: currentReport.analysis,
          tradesCount: currentReport.tradesCount,
          createdAt: currentReport.createdAt,
        }),
      });

      if (!res.ok) throw new Error('Impossible de sauvegarder le rapport public.');

      const data = await res.json();
      const generatedUrl = `${window.location.origin}${window.location.pathname}?report=${data.reportId}`;
      setShareUrl(generatedUrl);

      // Copy to clipboard
      await navigator.clipboard.writeText(generatedUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 4000);
    } catch (err: any) {
      setError("Erreur lors de la création du lien de partage : " + err.message);
    }
  };

  // Copy full markdown report
  const handleCopyMarkdown = () => {
    if (!currentReport) return;
    navigator.clipboard.writeText(currentReport.analysis);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Render markdown blocks with clean styling
  const renderFormattedAnalysis = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-4 text-xs sm:text-sm text-zinc-200 leading-relaxed font-sans">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('### BLOC') || trimmed.startsWith('## BLOC') || trimmed.startsWith('### 1.') || trimmed.startsWith('### 2.') || trimmed.startsWith('### 3.') || trimmed.startsWith('### 4.') || trimmed.startsWith('### 5.')) {
            return (
              <div key={idx} className="pt-4 pb-2 border-b border-zinc-800">
                <h3 className="text-base font-bold text-white flex items-center gap-2 text-blue-400">
                  {trimmed.replace(/^#+\s*/, '')}
                </h3>
              </div>
            );
          }
          if (trimmed.startsWith('###') || trimmed.startsWith('##')) {
            return (
              <h4 key={idx} className="text-sm font-bold text-zinc-100 pt-2 text-blue-300">
                {trimmed.replace(/^#+\s*/, '')}
              </h4>
            );
          }
          if (trimmed.startsWith('- **') || trimmed.startsWith('* **')) {
            const parts = trimmed.substring(2).split('**');
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span className="text-blue-400 font-bold mt-0.5">•</span>
                <p>
                  <strong className="text-zinc-100 font-semibold">{parts[1]}</strong>
                  <span className="text-zinc-300">{parts.slice(2).join('**')}</span>
                </p>
              </div>
            );
          }
          if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-2 text-zinc-300">
                <span className="text-zinc-400 mt-0.5">•</span>
                <p>{trimmed.substring(1).trim()}</p>
              </div>
            );
          }
          if (trimmed.startsWith('1.') || trimmed.startsWith('2.') || trimmed.startsWith('3.') || trimmed.startsWith('4.') || trimmed.startsWith('5.')) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-2 text-zinc-200 bg-zinc-900/40 p-2 rounded-lg border border-zinc-800/50">
                <span className="font-mono font-bold text-blue-400">{trimmed.slice(0, 2)}</span>
                <p>{trimmed.slice(2).trim()}</p>
              </div>
            );
          }
          if (trimmed === '') {
            return <div key={idx} className="h-1" />;
          }
          return <p key={idx} className="text-zinc-300">{trimmed}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Banner & Coach Persona Header */}
      <div className="relative overflow-hidden rounded-3xl border border-blue-500/30 bg-gradient-to-br from-blue-950/40 via-zinc-900/80 to-zinc-950 p-6 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/25 ring-2 ring-blue-400/40">
              <Brain className="h-7 w-7 text-white" />
              <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 ring-2 ring-zinc-950">
                <Zap className="h-2.5 w-2.5 text-zinc-950" />
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-sans">
                  Tre13ze AI Trading Coach
                </h1>
                <span className="rounded-md border border-blue-500/40 bg-blue-500/10 px-2.5 py-0.5 text-xs font-mono font-bold tracking-wider text-blue-300 uppercase">
                  Gemini 3.7 Pro Mentor
                </span>
                <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  100% Véridique & Sans Flatterie
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
                Mentor de trading institutionnel et gestionnaire du risque. L'IA scanne en profondeur vos <strong>données quantitatives</strong> ET vos <strong>notes écrites du journal</strong> pour déceler vos failles psychologiques et optimiser votre régularité.
              </p>
            </div>
          </div>

          {/* Quick Stats Capsule */}
          <div className="flex flex-wrap items-center gap-3 bg-zinc-900/90 border border-zinc-800 p-3 rounded-2xl">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-mono text-zinc-400">Périmètre Actif</span>
              <span className="text-xs font-bold text-white flex items-center gap-1">
                <Briefcase className="h-3 w-3 text-blue-400" />
                {activeAccount ? activeAccount.name : 'Tous les comptes'}
              </span>
            </div>
            <div className="h-7 w-px bg-zinc-800" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-mono text-zinc-400">Trades Scannés</span>
              <span className="text-xs font-bold text-blue-400 font-mono">
                {filteredTrades.length} trades ({periodMetrics.notesCount} avec journal)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Period Selection & Main Action "[ Analyser ma semaine ]" */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 backdrop-blur-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Period Selector Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            {[
              { id: 'week', label: '📅 Cette Semaine (7J)' },
              { id: 'last_week', label: '⏮️ Semaine Passée' },
              { id: 'month', label: '🗓️ Ce Mois (30J)' },
              { id: 'all', label: '🌐 Tout le Journal' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedPeriod(tab.id as any)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  selectedPeriod === tab.id
                    ? 'bg-blue-600 text-white font-semibold shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Primary Action Button "[ Analyser ma semaine ]" */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleAnalyzeWeek}
              disabled={isLoading || filteredTrades.length === 0}
              id="btn-analyze-week"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-blue-600/30 hover:shadow-blue-500/40 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Audit des trades & du journal en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-blue-200 animate-pulse" />
                  <span>[ Analyser ma semaine ]</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Data Context summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-zinc-800/80 text-xs">
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-2.5">
            <span className="text-[10px] text-zinc-400 uppercase font-mono block">Trades de la période</span>
            <span className="font-bold text-sm text-zinc-100 font-mono">{periodMetrics.count}</span>
            <span className="text-[10px] text-zinc-400 ml-1">({periodMetrics.wins}W / {periodMetrics.losses}L / {periodMetrics.be}BE)</span>
          </div>
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-2.5">
            <span className="text-[10px] text-zinc-400 uppercase font-mono block">Taux de Réussite</span>
            <span className={`font-bold text-sm font-mono ${Number(periodMetrics.winRate) >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {periodMetrics.winRate}%
            </span>
          </div>
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-2.5">
            <span className="text-[10px] text-zinc-400 uppercase font-mono block">P&L Net Période</span>
            <span className={`font-bold text-sm font-mono ${periodMetrics.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatCurrency(periodMetrics.netPnl, currency, true)}
            </span>
          </div>
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-2.5">
            <span className="text-[10px] text-zinc-400 uppercase font-mono block">R-Multiple Cumulé</span>
            <span className={`font-bold text-sm font-mono ${periodMetrics.totalR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {periodMetrics.totalR >= 0 ? '+' : ''}{periodMetrics.totalR.toFixed(2)}R
            </span>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/30 p-4 text-xs sm:text-sm text-rose-300 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" />
          <div className="space-y-0.5">
            <p className="font-semibold text-white">Impossible de compléter l'analyse</p>
            <p className="text-rose-300/90">{error}</p>
          </div>
        </div>
      )}

      {/* Shared Link Copied Toast Banner */}
      {shareUrl && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-4 text-xs text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-emerald-950/40">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold text-white text-sm">Lien public unique généré et copié !</p>
              <p className="text-emerald-300/80 font-mono text-[11px] break-all">{shareUrl}</p>
            </div>
          </div>
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3 py-1.5 text-xs transition-all shadow-md shrink-0"
          >
            <span>Ouvrir la vue partagée</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-8 space-y-6 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-zinc-800" />
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-zinc-800 rounded w-1/3" />
              <div className="h-3 bg-zinc-800 rounded w-1/2" />
            </div>
          </div>
          <div className="space-y-3 pt-4">
            <div className="h-4 bg-zinc-800 rounded w-full" />
            <div className="h-4 bg-zinc-800 rounded w-5/6" />
            <div className="h-4 bg-zinc-800 rounded w-4/6" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="h-28 bg-zinc-800/60 rounded-2xl" />
            <div className="h-28 bg-zinc-800/60 rounded-2xl" />
            <div className="h-28 bg-zinc-800/60 rounded-2xl" />
          </div>
          <p className="text-center text-xs font-mono text-blue-400 pt-2 animate-bounce">
            Le Coach IA audite la conformité technique, les biais psychologiques et la gestion du risque...
          </p>
        </div>
      )}

      {/* Main Report View: Structured in 5 Blocks */}
      {currentReport && !isLoading && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          
          {/* Report Top Bar with Actions: Share, Copy, Export */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white font-sans flex items-center gap-2">
                  Rapport Hebdomadaire IA
                  <span className="text-xs font-mono font-normal text-zinc-400">
                    ({currentReport.weekLabel})
                  </span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Généré le {new Date(currentReport.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            {/* Action Buttons: Partager le rapport & Copier */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleShareReport}
                id="btn-share-report"
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98] cursor-pointer"
                title="Générer un lien public unique pour partager ce rapport"
              >
                {isCopied ? <Check className="h-4 w-4 text-emerald-300" /> : <Share2 className="h-4 w-4" />}
                <span>{isCopied ? 'Lien Copié !' : 'Partager le rapport'}</span>
              </button>

              <button
                onClick={handleCopyMarkdown}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 transition-all"
                title="Copier le texte brut Markdown"
              >
                <Copy className="h-3.5 w-3.5 text-zinc-400" />
                <span>Copier</span>
              </button>
            </div>
          </div>

          {/* Quick Scorecard & High Level Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Discipline & Rigor Score */}
            <div className="rounded-2xl border border-blue-500/30 bg-blue-950/20 p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-blue-300 font-semibold">
                  Score de Discipline
                </span>
                <ShieldCheck className="h-4 w-4 text-blue-400" />
              </div>
              <div className="my-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white font-mono">
                  {currentReport.disciplineScore}
                </span>
                <span className="text-xs text-zinc-400 font-mono">/ 100</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    currentReport.disciplineScore >= 80 ? 'bg-emerald-400' :
                    currentReport.disciplineScore >= 60 ? 'bg-blue-400' :
                    currentReport.disciplineScore >= 40 ? 'bg-amber-400' : 'bg-rose-400'
                  }`}
                  style={{ width: `${currentReport.disciplineScore}%` }}
                />
              </div>
            </div>

            {/* Net P&L of the Week */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-zinc-400">P&L Net Semaine</span>
                <TrendingUp className="h-4 w-4 text-zinc-400" />
              </div>
              <div className="my-3">
                <span className={`text-2xl font-bold font-mono ${
                  currentReport.metrics.netPnl.includes('-') ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {currentReport.metrics.netPnl}
                </span>
              </div>
              <span className="text-[11px] text-zinc-400 font-mono">
                {currentReport.metrics.totalR} généré
              </span>
            </div>

            {/* Winrate & Ratio */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-zinc-400">Taux de Réussite</span>
                <Target className="h-4 w-4 text-zinc-400" />
              </div>
              <div className="my-3">
                <span className="text-2xl font-bold font-mono text-zinc-100">
                  {currentReport.metrics.winRate}
                </span>
              </div>
              <span className="text-[11px] text-zinc-400 font-mono">
                {currentReport.metrics.wins}W - {currentReport.metrics.losses}L - {currentReport.metrics.be}BE
              </span>
            </div>

            {/* Profit Factor */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-zinc-400">Facteur de Profit</span>
                <Flame className="h-4 w-4 text-amber-400" />
              </div>
              <div className="my-3">
                <span className="text-2xl font-bold font-mono text-zinc-100">
                  {currentReport.metrics.profitFactor}
                </span>
              </div>
              <span className="text-[11px] text-zinc-400">
                Gain moy: {currentReport.metrics.avgWin} | Perte: {currentReport.metrics.avgLoss}
              </span>
            </div>
          </div>

          {/* Full Structured 5 Blocks Content */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 sm:p-8 backdrop-blur-md shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <h3 className="text-base font-bold text-white font-sans">
                  Audit Détaillé en 5 Blocs Structurés
                </h3>
              </div>
              <span className="text-xs font-mono text-zinc-400">
                Basé sur {currentReport.tradesCount} trades & notes qualitatives
              </span>
            </div>

            {/* Render formatted blocks */}
            <div className="prose prose-invert max-w-none">
              {renderFormattedAnalysis(currentReport.analysis)}
            </div>
          </div>
        </div>
      )}

      {/* Initial Empty State / Welcome to AI Coach */}
      {!currentReport && !isLoading && (
        <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/40 p-8 sm:p-12 text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30">
            <Sparkles className="h-8 w-8 animate-pulse" />
          </div>
          
          <div className="space-y-2 max-w-lg mx-auto">
            <h3 className="text-lg font-bold text-white font-sans">
              Prêt pour l'Audit Hebdomadaire de vos Trades
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Cliquez sur le bouton <strong>[ Analyser ma semaine ]</strong> ci-dessus pour lancer le scanner complet. L'IA va auditer vos chiffres et lire l'ensemble des notes rédigées dans vos journaux de trades pour vous fournir un feedback sans complaisance.
            </p>
          </div>

          {/* 5 Blocks Presentation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 max-w-4xl mx-auto text-left pt-4">
            {[
              { num: '01', title: 'Résumé', desc: 'Synthèse chiffrée, diagnostic P&L & verdict sans filtre' },
              { num: '02', title: 'Discipline', desc: 'Respect des règles, Stop Loss & gestion du risque' },
              { num: '03', title: 'Erreurs', desc: 'Scan du journal : FOMO, fatigue, revenge trading' },
              { num: '04', title: 'Forces & Faiblesses', desc: 'Points forts, points faibles & réglages prioritaires' },
              { num: '05', title: 'Objectifs', desc: 'Règles d\'or & plan d\'action strict pour la semaine suivante' },
            ].map((b) => (
              <div key={b.num} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-1.5">
                <span className="font-mono text-xs font-bold text-blue-400">{b.num}</span>
                <h4 className="text-xs font-bold text-zinc-100">{b.title}</h4>
                <p className="text-[11px] text-zinc-400 leading-snug">{b.desc}</p>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <button
              onClick={handleAnalyzeWeek}
              disabled={filteredTrades.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              <span>Lancer l'Analyse de la Semaine ({filteredTrades.length} trades)</span>
            </button>
          </div>
        </div>
      )}

      {/* Saved Previous Reports History Drawer/Accordion */}
      {savedReports.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-blue-400" />
            Historique des Analyses Hebdomadaires ({savedReports.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {savedReports.map((rep) => (
              <div
                key={rep.id}
                onClick={() => setCurrentReport(rep)}
                className="group p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 hover:border-blue-500/50 hover:bg-zinc-900 transition-all cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-200 group-hover:text-blue-300 truncate">
                    {rep.weekLabel}
                  </span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-semibold">
                    {rep.disciplineScore}/100
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                  <span>{rep.metrics.netPnl}</span>
                  <span>{rep.metrics.winRate}</span>
                </div>
                <div className="text-[10px] text-zinc-400 pt-1 border-t border-zinc-800/80 flex items-center justify-between">
                  <span>{new Date(rep.createdAt).toLocaleDateString('fr-FR')}</span>
                  <span className="text-blue-400 group-hover:underline flex items-center gap-0.5">
                    Voir <ArrowRight className="h-2.5 w-2.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

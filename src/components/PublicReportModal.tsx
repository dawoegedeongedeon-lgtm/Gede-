import React, { useState, useEffect } from 'react';
import { 
  X, 
  Brain, 
  ShieldCheck, 
  Award, 
  TrendingUp, 
  Target, 
  Flame, 
  Share2, 
  Check, 
  Copy, 
  Calendar,
  Zap,
  ExternalLink,
  Printer
} from 'lucide-react';
import { WeeklyAiReport } from '../types';

interface PublicReportModalProps {
  reportId: string | null;
  onClose: () => void;
}

export const PublicReportModal: React.FC<PublicReportModalProps> = ({
  reportId,
  onClose,
}) => {
  const [report, setReport] = useState<WeeklyAiReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!reportId) return;

    async function fetchReport() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/reports/${reportId}`);
        if (!res.ok) {
          throw new Error('Rapport introuvable ou expiré.');
        }
        const data = await res.json();
        if (data.success && data.report) {
          // Normalize format
          const r = data.report;
          setReport({
            id: r.id,
            createdAt: r.createdAt,
            weekLabel: r.weekLabel || 'Semaine',
            accountName: r.accountName,
            metrics: r.metrics || {
              totalTrades: r.tradesCount || 0,
              wins: 0,
              losses: 0,
              be: 0,
              winRate: 'N/A',
              netPnl: 'N/A',
              totalR: 'N/A',
              avgWin: 'N/A',
              avgLoss: 'N/A',
              profitFactor: 'N/A',
              accountBalance: 'N/A',
              weekRange: r.weekLabel || 'Semaine',
            },
            disciplineScore: r.disciplineScore || 80,
            analysis: r.analysis || r.content || '',
            tradesCount: r.tradesCount || 0,
          });
        } else {
          throw new Error('Format de rapport non reconnu.');
        }
      } catch (err: any) {
        setError(err.message || 'Impossible de charger le rapport.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchReport();
  }, [reportId]);

  if (!reportId) return null;

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="relative w-full max-w-4xl rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 shadow-2xl my-8 space-y-6 animate-in fade-in zoom-in-95 duration-200 print:border-none print:shadow-none print:my-0 print:text-black">
        
        {/* Top Header */}
        <div className="flex items-start justify-between border-b border-zinc-800 pb-5 print:border-zinc-300">
          <div className="flex items-center gap-3.5">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/25 ring-2 ring-blue-400/40 print:shadow-none">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white font-sans print:text-black">
                  Tre13ze Journal v1.0
                </span>
                <span className="rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-blue-400 uppercase print:border-zinc-400 print:text-zinc-700">
                  Rapport Public Partagé
                </span>
              </div>
              <p className="text-xs text-zinc-400 print:text-zinc-600">
                Audit Hebdomadaire IA & Détection des Biais de Trading
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 transition-all"
              title="Imprimer / Exporter PDF"
            >
              <Printer className="h-4 w-4" />
            </button>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:text-white transition-all"
            >
              {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{isCopied ? 'Lien Copié' : 'Copier Lien'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="py-12 text-center text-xs font-mono text-blue-400 animate-pulse">
            Chargement de l'analyse publique partagée...
          </div>
        )}

        {error && (
          <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 text-center">
            {error}
          </div>
        )}

        {report && !isLoading && (
          <div className="space-y-6">
            
            {/* Meta & Score bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-blue-500/20 bg-blue-950/20 p-4 print:border-zinc-300 print:bg-zinc-100">
                <span className="text-[10px] uppercase font-mono text-zinc-400 block">Score Discipline</span>
                <span className="text-2xl font-black font-mono text-white print:text-black">
                  {report.disciplineScore}/100
                </span>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 print:border-zinc-300 print:bg-zinc-100">
                <span className="text-[10px] uppercase font-mono text-zinc-400 block">P&L Net</span>
                <span className="text-xl font-bold font-mono text-emerald-400 print:text-black">
                  {report.metrics.netPnl}
                </span>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 print:border-zinc-300 print:bg-zinc-100">
                <span className="text-[10px] uppercase font-mono text-zinc-400 block">Win Rate</span>
                <span className="text-xl font-bold font-mono text-zinc-100 print:text-black">
                  {report.metrics.winRate}
                </span>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 print:border-zinc-300 print:bg-zinc-100">
                <span className="text-[10px] uppercase font-mono text-zinc-400 block">Période</span>
                <span className="text-xs font-bold text-zinc-200 truncate block mt-1 print:text-black">
                  {report.weekLabel}
                </span>
              </div>
            </div>

            {/* Structured Report Analysis */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8 space-y-4 max-h-[60vh] overflow-y-auto text-xs sm:text-sm text-zinc-200 leading-relaxed font-sans whitespace-pre-wrap print:max-h-none print:overflow-visible print:text-black print:border-zinc-300">
              {report.analysis}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-800 text-xs text-zinc-400 print:border-zinc-300 print:text-zinc-600">
              <span>Généré avec Tre13ze AI Coach (Gemini 3.7)</span>
              <span className="font-mono">{new Date(report.createdAt).toLocaleDateString('fr-FR')}</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

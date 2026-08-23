import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  FileText, 
  Check, 
  AlertCircle,
  Database
} from 'lucide-react';
import { Trade } from '../types';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  trades: Trade[];
  onImportTrades: (trades: Trade[]) => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  trades,
  onImportTrades,
}) => {
  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  // Export JSON
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(trades, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `tre13ze_journal_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export CSV
  const handleExportCsv = () => {
    if (trades.length === 0) return;

    const headers = [
      'Ticket', 'Pair', 'Direction', 'Status', 'Date', 'Time', 'Session',
      'Timeframe', 'EntryPrice', 'ExitPrice', 'StopLoss', 'TakeProfit',
      'Quantity', 'Fees', 'PnL', 'PnL_Percent', 'R_Multiple', 'Strategy',
      'Emotions', 'Rating', 'Notes'
    ];

    const rows = trades.map((t) => [
      t.ticketNumber,
      t.pair,
      t.direction,
      t.status,
      t.entryDate,
      t.entryTime,
      t.session,
      t.timeframe,
      t.entryPrice,
      t.exitPrice,
      t.stopLoss,
      t.takeProfit || '',
      t.quantity,
      t.fees,
      t.pnl,
      t.pnlPercentage,
      t.rMultiple,
      `"${(t.strategy || '').replace(/"/g, '""')}"`,
      t.emotions,
      t.executionRating,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tre13ze_journal_trades_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Import JSON File
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          onImportTrades(parsed);
          setImportStatus(`${parsed.length} trades importés avec succès !`);
        } else {
          setImportStatus('Format JSON invalide ou aucun trade trouvé.');
        }
      } catch (err) {
        setImportStatus('Erreur de lecture du fichier JSON.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-sans">
                Export & Sauvegarde des Données
              </h3>
              <p className="text-xs text-zinc-400">
                Gérez vos sauvegardes de journal en toute indépendance
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

        {/* Action Blocks */}
        <div className="space-y-4 text-xs">
          
          {/* Export section */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
            <span className="font-semibold text-zinc-200 uppercase tracking-wider text-[11px] block font-mono">
              Exporter vos {trades.length} trades
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleExportJson}
                className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 px-3 text-zinc-200 hover:border-blue-500/50 hover:bg-blue-950/20 hover:text-blue-300 font-medium transition-all"
              >
                <Download className="h-4 w-4 text-blue-400" />
                <span>Export JSON (Backup)</span>
              </button>

              <button
                onClick={handleExportCsv}
                className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 px-3 text-zinc-200 hover:border-emerald-500/50 hover:bg-emerald-950/20 hover:text-emerald-300 font-medium transition-all"
              >
                <FileText className="h-4 w-4 text-emerald-400" />
                <span>Export CSV (Excel)</span>
              </button>
            </div>
          </div>

          {/* Import section */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
            <span className="font-semibold text-zinc-200 uppercase tracking-wider text-[11px] block font-mono">
              Restaurer / Importer un fichier
            </span>
            <label className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-950/50 p-6 text-center hover:border-blue-500/50 hover:bg-zinc-900/50 cursor-pointer transition-all">
              <Upload className="h-6 w-6 text-blue-400 mb-2" />
              <span className="font-semibold text-white">Cliquez pour sélectionner un fichier JSON</span>
              <span className="text-[11px] text-zinc-400 mt-0.5">Format .json exporté de Tre13ze Journal</span>
              <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
            </label>

            {importStatus && (
              <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-950/20 text-blue-300 flex items-center gap-2">
                <Check className="h-4 w-4 flex-shrink-0" />
                <span>{importStatus}</span>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition-all"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { 
  BookOpen, 
  Plus, 
  CheckCircle2, 
  Layers, 
  Trash2, 
  ShieldCheck,
  Zap,
  TrendingUp
} from 'lucide-react';
import { StrategyPlaybook, Trade, CurrencySymbol } from '../types';
import { formatCurrency } from '../utils/calculations';

interface PlaybookViewProps {
  playbooks: StrategyPlaybook[];
  trades: Trade[];
  currency: CurrencySymbol;
  onAddPlaybook: (playbook: StrategyPlaybook) => void;
  onDeletePlaybook: (id: string) => void;
}

export const PlaybookView: React.FC<PlaybookViewProps> = ({
  playbooks,
  trades,
  currency,
  onAddPlaybook,
  onDeletePlaybook,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newSetup, setNewSetup] = useState<Partial<StrategyPlaybook>>({
    name: '',
    description: '',
    preferredSession: 'New York',
    preferredTimeframe: '5m',
    rules: [''],
  });

  const handleAddRule = () => {
    setNewSetup((prev) => ({
      ...prev,
      rules: [...(prev.rules || []), ''],
    }));
  };

  const handleUpdateRule = (index: number, val: string) => {
    const updated = [...(newSetup.rules || [])];
    updated[index] = val;
    setNewSetup({ ...newSetup, rules: updated });
  };

  const handleRemoveRule = (index: number) => {
    const updated = (newSetup.rules || []).filter((_, i) => i !== index);
    setNewSetup({ ...newSetup, rules: updated });
  };

  const handleSubmitNewSetup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetup.name) return;

    const playbookToSave: StrategyPlaybook = {
      id: `play-${Date.now()}`,
      name: newSetup.name,
      description: newSetup.description || '',
      assetClass: ['INDICES', 'FOREX'],
      preferredSession: newSetup.preferredSession || 'New York',
      preferredTimeframe: newSetup.preferredTimeframe || '5m',
      rules: (newSetup.rules || []).filter((r) => r.trim().length > 0),
    };

    onAddPlaybook(playbookToSave);
    setNewSetup({ name: '', description: '', rules: [''], preferredSession: 'New York', preferredTimeframe: '5m' });
    setIsCreating(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 sm:p-6 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white font-sans">
              Playbook de Trading & Règles de Setups
            </h2>
            <p className="text-xs text-zinc-400">
              Formalisez vos stratégies, critères d'invalidation et plans d'exécution
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Créer un Setup</span>
        </button>
      </div>

      {/* Creation Modal / Form */}
      {isCreating && (
        <div className="rounded-2xl border border-blue-500/40 bg-zinc-950 p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 className="text-sm font-bold text-white font-sans flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-400" />
              Nouveau Setup de Trading
            </h3>
            <button
              onClick={() => setIsCreating(false)}
              className="text-xs text-zinc-400 hover:text-white"
            >
              Annuler
            </button>
          </div>

          <form onSubmit={handleSubmitNewSetup} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Nom du Setup / Stratégie</label>
                <input
                  type="text"
                  required
                  value={newSetup.name}
                  onChange={(e) => setNewSetup({ ...newSetup, name: e.target.value })}
                  placeholder="Ex: Liquidity Sweep & CHoCH"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-medium focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Session Préférée</label>
                <select
                  value={newSetup.preferredSession}
                  onChange={(e) => setNewSetup({ ...newSetup, preferredSession: e.target.value as any })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 focus:border-blue-500 focus:outline-none"
                >
                  <option value="New York">New York</option>
                  <option value="London">London</option>
                  <option value="Asian">Asian</option>
                  <option value="Overlap">Overlap</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Unité de Temps (Timeframe)</label>
                <select
                  value={newSetup.preferredTimeframe}
                  onChange={(e) => setNewSetup({ ...newSetup, preferredTimeframe: e.target.value as any })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 focus:border-blue-500 focus:outline-none"
                >
                  <option value="1m">1m</option>
                  <option value="5m">5m</option>
                  <option value="15m">15m</option>
                  <option value="1H">1H</option>
                  <option value="4H">4H</option>
                  <option value="Daily">Daily</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">Description de l'Avantage Statistique (Edge)</label>
              <textarea
                rows={2}
                value={newSetup.description}
                onChange={(e) => setNewSetup({ ...newSetup, description: e.target.value })}
                placeholder="Expliquez la logique fondamentale ou institutionnelle..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-zinc-200 focus:border-blue-500 focus:outline-none resize-none"
              />
            </div>

            {/* Rules Checklist Builder */}
            <div className="space-y-2">
              <label className="block text-zinc-400 font-medium">
                Règles de Confirmation Obligatoires (Checklist)
              </label>
              {(newSetup.rules || []).map((rule, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="font-mono text-zinc-400 text-xs w-4">{idx + 1}.</span>
                  <input
                    type="text"
                    value={rule}
                    onChange={(e) => handleUpdateRule(idx, e.target.value)}
                    placeholder={`Règle #${idx + 1} (ex: Attendre la clôture de bougie 5m)`}
                    className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-zinc-200 focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveRule(idx)}
                    className="p-1.5 text-zinc-400 hover:text-rose-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddRule}
                className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-medium pt-1"
              >
                + Ajouter une condition / règle
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow"
              >
                Sauvegarder la Stratégie
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Playbooks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {playbooks.map((pb) => {
          // Calculate live stats for this strategy from logged trades
          const strategyTrades = trades.filter((t) => t.strategy?.toLowerCase() === pb.name.toLowerCase());
          const wins = strategyTrades.filter((t) => t.status === 'WIN').length;
          const total = strategyTrades.length;
          const winRate = total > 0 ? (wins / total) * 100 : 0;
          const pnl = strategyTrades.reduce((acc, t) => acc + (Number(t.pnl) || 0), 0);

          return (
            <div
              key={pb.id}
              className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 backdrop-blur-sm space-y-4 hover:border-zinc-700 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white font-sans">{pb.name}</h3>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
                      <span className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-300">
                        {pb.preferredSession}
                      </span>
                      <span>•</span>
                      <span className="rounded bg-blue-500/10 text-blue-400 px-2 py-0.5 border border-blue-500/20">
                        {pb.preferredTimeframe}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onDeletePlaybook(pb.id)}
                    className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-zinc-800 transition-all"
                    title="Supprimer ce setup"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed">
                  {pb.description}
                </p>

                {/* Rules Checklist */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5 space-y-2">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-semibold block">
                    Checklist d'Exécution :
                  </span>
                  <div className="space-y-1.5">
                    {pb.rules.map((rule, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>{rule}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Performance Footprint */}
              <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-zinc-400 text-[10px] block">Historique Réel</span>
                  <span className="font-semibold text-zinc-200">
                    {total} trades ({winRate.toFixed(0)}% W)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-zinc-400 text-[10px] block">P&L Généré</span>
                  <span className={`font-bold ${
                    pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {formatCurrency(pnl, currency, true)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};

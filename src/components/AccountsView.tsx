import React, { useState, useMemo } from 'react';
import { 
  Briefcase, 
  Plus, 
  Check, 
  Trash2, 
  Edit3, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Layers, 
  DollarSign, 
  Building, 
  Sparkles, 
  ArrowRight,
  ExternalLink,
  Info,
  CheckCircle2,
  Lock,
  Wallet,
  Scale,
  Activity
} from 'lucide-react';
import { TradingAccount, TradingAccountType, Trade, CurrencySymbol } from '../types';
import { formatCurrency } from '../utils/calculations';

interface AccountsViewProps {
  accounts: TradingAccount[];
  activeAccountId: string; // 'ALL' or specific account id
  onSelectAccount: (accountId: string) => void;
  onAddAccount: (account: TradingAccount) => void;
  onUpdateAccount: (account: TradingAccount) => void;
  onDeleteAccount: (accountId: string) => void;
  trades: Trade[];
  currency: CurrencySymbol;
  onOpenNewTradeForAccount?: (accountName: string) => void;
  onOpenMt5Sync?: () => void;
}

const ACCOUNT_TYPE_CONFIG: Record<TradingAccountType, { label: string; badgeClass: string; icon: any; desc: string }> = {
  PROP_FIRM_EVALUATION: {
    label: 'Prop Firm (Évaluation / Challenge)',
    badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    icon: Sparkles,
    desc: 'Challenge à étapes avec règles de target & drawdown'
  },
  PROP_FIRM_FUNDED: {
    label: 'Prop Firm (Compte Financé / PA)',
    badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    icon: ShieldCheck,
    desc: 'Compte financé réel avec partage des profits (payouts)'
  },
  LIVE_PERSONAL: {
    label: 'Compte Réel Personnel',
    badgeClass: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
    icon: Wallet,
    desc: 'Capital personnel chez un broker régulé'
  },
  DEMO_BACKTEST: {
    label: 'Compte Démo / Backtest',
    badgeClass: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
    icon: Layers,
    desc: 'Simulateur ou paper trading pour valider des stratégies'
  }
};

const QUICK_PRESETS = [
  { name: 'FundingPips Challenge 10k', balance: 10000, type: 'PROP_FIRM_EVALUATION' as TradingAccountType, broker: 'FundingPips' },
  { name: 'FundingPips Challenge 100k', balance: 100000, type: 'PROP_FIRM_EVALUATION' as TradingAccountType, broker: 'FundingPips' },
  { name: 'Apex 50k PA', balance: 50000, type: 'PROP_FIRM_FUNDED' as TradingAccountType, broker: 'Apex Trader' },
  { name: 'TopStep 50k Combine', balance: 50000, type: 'PROP_FIRM_EVALUATION' as TradingAccountType, broker: 'TopStep' },
  { name: 'Compte Personnel 5k', balance: 5000, type: 'LIVE_PERSONAL' as TradingAccountType, broker: 'Broker Perso' },
  { name: 'Paper Trading 25k', balance: 25000, type: 'DEMO_BACKTEST' as TradingAccountType, broker: 'Paper Trading' },
];

export const AccountsView: React.FC<AccountsViewProps> = ({
  accounts,
  activeAccountId,
  onSelectAccount,
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount,
  trades,
  currency,
  onOpenNewTradeForAccount,
  onOpenMt5Sync
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [initialBalance, setInitialBalance] = useState<number>(100000);
  const [accountType, setAccountType] = useState<TradingAccountType>('PROP_FIRM_EVALUATION');
  const [brokerOrPropFirm, setBrokerOrPropFirm] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [description, setDescription] = useState('');

  // Calculate per-account metrics
  const accountStatsMap = useMemo(() => {
    const map = new Map<string, {
      tradesCount: number;
      winCount: number;
      lossCount: number;
      netPnl: number;
      winRate: number;
      currentBalance: number;
      pnlPercentage: number;
    }>();

    accounts.forEach((acc) => {
      // Match trades by account id OR exact account name
      const accountTrades = trades.filter((t) => 
        t.account === acc.name || t.account === acc.id || (!t.account && acc.isDefault)
      );

      const tradesCount = accountTrades.length;
      let netPnl = 0;
      let winCount = 0;
      let lossCount = 0;

      accountTrades.forEach((t) => {
        netPnl += t.pnl || 0;
        if (t.status === 'WIN') winCount++;
        else if (t.status === 'LOSS') lossCount++;
      });

      const decidedTrades = winCount + lossCount;
      const winRate = decidedTrades > 0 ? (winCount / decidedTrades) * 100 : 0;
      const currentBalance = acc.initialBalance + netPnl;
      const pnlPercentage = acc.initialBalance > 0 ? (netPnl / acc.initialBalance) * 100 : 0;

      map.set(acc.id, {
        tradesCount,
        winCount,
        lossCount,
        netPnl,
        winRate,
        currentBalance,
        pnlPercentage
      });
    });

    return map;
  }, [accounts, trades]);

  const handleStartEdit = (acc: TradingAccount) => {
    setEditingAccountId(acc.id);
    setName(acc.name);
    setInitialBalance(acc.initialBalance);
    setAccountType(acc.accountType);
    setBrokerOrPropFirm(acc.brokerOrPropFirm || '');
    setAccountNumber(acc.accountNumber || '');
    setDescription(acc.description || '');
    setShowAddForm(true);
  };

  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingAccountId(null);
    setName('');
    setInitialBalance(100000);
    setAccountType('PROP_FIRM_EVALUATION');
    setBrokerOrPropFirm('');
    setAccountNumber('');
    setDescription('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingAccountId) {
      const existing = accounts.find((a) => a.id === editingAccountId);
      if (existing) {
        onUpdateAccount({
          ...existing,
          name: name.trim(),
          initialBalance: Number(initialBalance) || 0,
          accountType,
          brokerOrPropFirm: brokerOrPropFirm.trim() || undefined,
          accountNumber: accountNumber.trim() || undefined,
          description: description.trim() || undefined,
        });
      }
    } else {
      const newAcc: TradingAccount = {
        id: `acc-${Date.now()}`,
        name: name.trim(),
        initialBalance: Number(initialBalance) || 0,
        accountType,
        brokerOrPropFirm: brokerOrPropFirm.trim() || undefined,
        accountNumber: accountNumber.trim() || `#${Math.floor(10000 + Math.random() * 90000)}`,
        currency,
        description: description.trim() || undefined,
        isDefault: accounts.length === 0,
        createdAt: new Date().toISOString().split('T')[0],
      };
      onAddAccount(newAcc);
    }

    handleCancelForm();
  };

  const applyPreset = (preset: typeof QUICK_PRESETS[0]) => {
    setName(preset.name);
    setInitialBalance(preset.balance);
    setAccountType(preset.type);
    setBrokerOrPropFirm(preset.broker);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Quick Controls */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 sm:p-6 backdrop-blur-sm shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20">
                <Briefcase className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-white font-sans">
                Gestion des Profils & Comptes de Trading
              </h2>
            </div>
            <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
              Créez et isolez vos profils de trading (Challenges Prop Firms, Comptes Financés PA, Comptes Personnels Réels). 
              Le compte sélectionné filtre automatiquement l'ensemble de votre Dashboard, vos métriques de gains, de winrate et vos courbes de performance.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {onOpenMt5Sync && (
              <button
                onClick={onOpenMt5Sync}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-900/40 px-3.5 py-2.5 text-xs font-semibold text-emerald-300 transition-all shadow-sm"
                title="Connecter ou synchroniser un compte MetaTrader 5 (MT5)"
              >
                <Activity className="h-4 w-4 text-emerald-400" />
                <span>Synchro MT5</span>
              </button>
            )}

            <button
              onClick={() => {
                if (onOpenMt5Sync) {
                  onOpenMt5Sync();
                } else {
                  handleCancelForm();
                  setShowAddForm(true);
                }
              }}
              className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              <span>Ajouter un Compte</span>
            </button>
          </div>
        </div>

        {/* Global vs Specific Filter Indicator */}
        <div className="mt-5 pt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-zinc-400 font-medium">Compte Actif pour le Dashboard :</span>
            <div className="flex flex-wrap items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950 p-1 max-w-full overflow-x-auto">
              <button
                onClick={() => onSelectAccount('ALL')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  activeAccountId === 'ALL'
                    ? 'bg-blue-600 text-white shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                🌐 Tous les comptes
              </button>
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => onSelectAccount(acc.id)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                    activeAccountId === acc.id
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span>{acc.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            {accounts.length} compte{accounts.length > 1 ? 's' : ''} configuré{accounts.length > 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Form: Add or Edit Account */}
      {showAddForm && (
        <div className="rounded-2xl border border-blue-500/40 bg-zinc-950 p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-400" />
              {editingAccountId ? 'Modifier le Compte de Trading' : 'Créer un Nouveau Compte de Trading'}
            </h3>
            <button
              onClick={handleCancelForm}
              className="text-xs text-zinc-400 hover:text-white"
            >
              Annuler
            </button>
          </div>

          {/* Quick Presets Pills */}
          {!editingAccountId && (
            <div className="space-y-1.5">
              <label className="text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">
                Remplissage rapide par modèles populaires :
              </label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="text-[11px] px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-blue-500/50 hover:bg-zinc-850 hover:text-blue-300 transition-all"
                  >
                    + {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              
              {/* Field 1: Nom du compte */}
              <div>
                <label className="block text-zinc-300 font-medium mb-1.5">
                  Nom du Compte <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: FundingPips Challenge, Compte Réel, Apex 50k"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-medium placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                />
                <p className="text-[10px] text-zinc-500 mt-1">
                  Ce nom sera affiché dans le sélecteur de trade et le Dashboard.
                </p>
              </div>

              {/* Field 2: Capital Initial */}
              <div>
                <label className="block text-zinc-300 font-medium mb-1.5">
                  Capital Initial ({currency}) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    required
                    min="1"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(parseFloat(e.target.value) || 0)}
                    placeholder="Ex: 10000, 50000, 100000"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono font-bold placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2 text-zinc-500 font-mono">{currency}</span>
                </div>
                <div className="flex gap-1.5 mt-1">
                  {[10000, 25000, 50000, 100000, 200000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setInitialBalance(amt)}
                      className="text-[10px] font-mono text-zinc-400 hover:text-blue-400 underline"
                    >
                      {amt >= 1000 ? `${amt / 1000}k` : amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Field 3: Type de Compte */}
              <div>
                <label className="block text-zinc-300 font-medium mb-1.5">
                  Type de Compte <span className="text-rose-400">*</span>
                </label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value as TradingAccountType)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-medium focus:border-blue-500 focus:outline-none"
                >
                  <option value="PROP_FIRM_EVALUATION">Prop Firm (Évaluation / Challenge)</option>
                  <option value="PROP_FIRM_FUNDED">Prop Firm (Compte Financé / PA)</option>
                  <option value="LIVE_PERSONAL">Compte Réel Personnel</option>
                  <option value="DEMO_BACKTEST">Compte Démo / Backtest</option>
                </select>
                <p className="text-[10px] text-zinc-500 mt-1">
                  {ACCOUNT_TYPE_CONFIG[accountType].desc}
                </p>
              </div>

              {/* Field 4: Broker ou Prop Firm */}
              <div>
                <label className="block text-zinc-300 font-medium mb-1.5">
                  Courtier / Firme (Optionnel)
                </label>
                <input
                  type="text"
                  value={brokerOrPropFirm}
                  onChange={(e) => setBrokerOrPropFirm(e.target.value)}
                  placeholder="Ex: FundingPips, Apex, FTMO, Interactive Brokers"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Field 5: Identifiant ou N° Compte */}
              <div>
                <label className="block text-zinc-300 font-medium mb-1.5">
                  Identifiant / Ticket de Compte
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Ex: #FP-94821 ou #APEX-1029"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Field 6: Objectifs / Description */}
              <div>
                <label className="block text-zinc-300 font-medium mb-1.5">
                  Règles & Notes du Compte
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Target 8%, Max daily loss $500, Risque 1%"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={handleCancelForm}
                className="min-h-[44px] px-5 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white font-semibold transition-all active:scale-[0.98]"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-white shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98]"
              >
                {editingAccountId ? 'Mettre à jour le compte' : 'Enregistrer le compte'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Helper Banner when only demo account is present */}
      {accounts.length === 1 && accounts[0].id === 'acc-demo-10k' && (
        <div className="rounded-2xl border border-blue-500/30 bg-blue-950/20 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-blue-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-white">Compte Démo d'Exemple Actif</p>
              <p className="text-zinc-400 text-[11px]">
                Ce compte est préchargé pour vous permettre de tester l'interface. Vous pouvez le supprimer à tout moment et créer vos propres comptes.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              handleCancelForm();
              setShowAddForm(true);
            }}
            className="whitespace-nowrap px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-md transition-all text-xs"
          >
            + Créer mon Vrai Compte
          </button>
        </div>
      )}

      {/* Account Cards Grid or Empty State */}
      {accounts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 p-10 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-zinc-800/80 flex items-center justify-center text-zinc-400">
            <Briefcase className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Aucun compte de trading configuré</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Créez votre propre profil de trading (Prop Firm, Réel, Démo) pour commencer à consigner et analyser vos exécutions.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                handleCancelForm();
                setShowAddForm(true);
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Créer un Compte de Trading</span>
            </button>
            <button
              onClick={() => {
                const demoAcc: TradingAccount = {
                  id: 'acc-demo-10k',
                  name: 'Compte Démo Exemple (10k)',
                  initialBalance: 10000,
                  currentBalance: 10000,
                  accountType: 'DEMO_BACKTEST',
                  brokerOrPropFirm: 'Paper Trading (Démo)',
                  accountNumber: '#DEMO-10K',
                  currency: '$',
                  description: 'Compte d\'exemple pour découvrir le journal.',
                  isDefault: true,
                  createdAt: new Date().toISOString().split('T')[0],
                };
                onAddAccount(demoAcc);
              }}
              className="px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 flex items-center gap-1.5 transition-all"
            >
              <Sparkles className="h-4 w-4 text-blue-400" />
              <span>Charger un Compte Démo Exemple</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {accounts.map((acc) => {
          const stats = accountStatsMap.get(acc.id) || {
            tradesCount: 0,
            winCount: 0,
            lossCount: 0,
            netPnl: 0,
            winRate: 0,
            currentBalance: acc.initialBalance,
            pnlPercentage: 0
          };

          const isSelected = activeAccountId === acc.id;
          const isProfitable = stats.netPnl >= 0;
          const typeConfig = ACCOUNT_TYPE_CONFIG[acc.accountType] || ACCOUNT_TYPE_CONFIG.PROP_FIRM_EVALUATION;
          const Icon = typeConfig.icon;

          return (
            <div
              key={acc.id}
              className={`relative rounded-2xl border transition-all flex flex-col justify-between overflow-hidden group ${
                isSelected
                  ? 'border-blue-500 bg-gradient-to-b from-blue-950/30 to-zinc-900/90 shadow-xl shadow-blue-500/10 ring-1 ring-blue-500/50'
                  : 'border-zinc-800/80 bg-zinc-900/60 hover:border-zinc-700/80 hover:bg-zinc-900/90'
              }`}
            >
              {/* Active Badge Strip */}
              {isSelected && (
                <div className="bg-blue-600 px-3 py-1 text-[11px] font-bold text-white flex items-center justify-between font-mono">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    COMPTE ACTIF SUR LE DASHBOARD
                  </span>
                  <span>FILTRE ACTIF</span>
                </div>
              )}

              <div className="p-5 space-y-4">
                {/* Header of Card */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-base font-sans group-hover:text-blue-300 transition-colors">
                        {acc.name}
                      </h3>
                      {acc.accountNumber && (
                        <span className="font-mono text-[10px] text-zinc-400 border border-zinc-800 rounded px-1.5 py-0.5 bg-zinc-950">
                          {acc.accountNumber}
                        </span>
                      )}
                    </div>
                    {acc.brokerOrPropFirm && (
                      <p className="text-xs text-zinc-400 flex items-center gap-1">
                        <Building className="h-3 w-3 text-zinc-500" />
                        {acc.brokerOrPropFirm}
                      </p>
                    )}
                  </div>

                  {/* Card Menu / Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEdit(acc)}
                      className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-all"
                      title="Modifier les informations du compte"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Supprimer le compte "${acc.name}" ? Vous pourrez créer ou reconnecter vos propres comptes de trading.`)) {
                          onDeleteAccount(acc.id);
                        }
                      }}
                      className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-zinc-800 transition-all"
                      title="Supprimer ce profil de compte"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Account Type Badge */}
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-medium ${typeConfig.badgeClass}`}>
                    <Icon className="h-3 w-3" />
                    {typeConfig.label}
                  </span>
                </div>

                {/* Account Balances & Metrics */}
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/80 p-3.5 space-y-2.5 font-mono">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Capital Initial :</span>
                    <span className="font-semibold text-zinc-200">
                      {formatCurrency(acc.initialBalance, currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Solde Actuel :</span>
                    <span className={`font-bold text-sm ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatCurrency(stats.currentBalance, currency)}
                    </span>
                  </div>

                  <div className="h-px bg-zinc-800/80" />

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Net P&L Réalisé :</span>
                    <span className={`font-bold flex items-center gap-0.5 ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                      <TrendingUp className={`h-3 w-3 ${!isProfitable && 'rotate-180'}`} />
                      {formatCurrency(stats.netPnl, currency, true)} ({stats.pnlPercentage >= 0 ? '+' : ''}{stats.pnlPercentage.toFixed(2)}%)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] border-t border-zinc-900">
                    <div>
                      <span className="text-zinc-500 block">Exécutions :</span>
                      <span className="font-semibold text-zinc-300">{stats.tradesCount} trades</span>
                    </div>
                    <div className="text-right">
                      <span className="text-zinc-500 block">Winrate :</span>
                      <span className="font-semibold text-blue-400">{stats.winRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {acc.description && (
                  <p className="text-[11px] text-zinc-400 italic bg-zinc-950/40 p-2 rounded-lg border border-zinc-800/50">
                    "{acc.description}"
                  </p>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="p-4 pt-0 space-y-2">
                <div className="flex items-center gap-2">
                  {!isSelected ? (
                    <button
                      onClick={() => onSelectAccount(acc.id)}
                      className="min-h-[44px] flex-1 flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/90 hover:bg-blue-600 hover:border-blue-500 hover:text-white py-2 px-3 text-xs font-bold text-zinc-200 transition-all shadow-sm active:scale-[0.98]"
                    >
                      <Check className="h-4 w-4" />
                      <span>Basculer sur ce compte</span>
                    </button>
                  ) : (
                    <div className="min-h-[44px] flex-1 flex items-center justify-between gap-2 px-1">
                      <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 font-mono">
                        ✓ Vue active sur le Dashboard
                      </span>
                      {onOpenNewTradeForAccount && (
                        <button
                          onClick={() => onOpenNewTradeForAccount(acc.name)}
                          className="min-h-[38px] px-2.5 rounded-lg bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 text-xs font-semibold"
                        >
                          + Trade →
                        </button>
                      )}
                    </div>
                  )}

                  {onOpenMt5Sync && (
                    <button
                      onClick={onOpenMt5Sync}
                      title="Gérer la synchronisation MT5"
                      className="min-h-[44px] px-3.5 py-2 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-[0.98]"
                    >
                      <Activity className="h-4 w-4" />
                      <span className="hidden sm:inline">MT5</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}

    </div>
  );
};

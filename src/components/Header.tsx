import React from 'react';
import { 
  Sparkles, 
  Plus, 
  Calculator, 
  Download, 
  RefreshCw, 
  TrendingUp, 
  Briefcase,
  Zap,
  ChevronDown,
  Activity,
  User,
  Mail,
  ShieldCheck,
  Settings
} from 'lucide-react';
import { CurrencySymbol, JournalStats, TradingAccount, UserProfile } from '../types';
import { formatCurrency } from '../utils/calculations';

interface HeaderProps {
  stats: JournalStats;
  currency: CurrencySymbol;
  setCurrency: (c: CurrencySymbol) => void;
  activeTab: 'dashboard' | 'trades' | 'analytics' | 'calendar' | 'accounts' | 'aicoach';
  setActiveTab: (tab: 'dashboard' | 'trades' | 'analytics' | 'calendar' | 'accounts' | 'aicoach') => void;
  accounts: TradingAccount[];
  activeAccountId: string;
  onSelectAccount: (accId: string) => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onOpenSettings?: () => void;
  onOpenMt5Sync: () => void;
  mt5ConnectedCount: number;
  onOpenNewTrade: () => void;
  onOpenAiCoach: () => void;
  onOpenRiskCalc: () => void;
  onOpenExportImport: () => void;
  onResetData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  currency,
  setCurrency,
  activeTab,
  setActiveTab,
  accounts,
  activeAccountId,
  onSelectAccount,
  currentUser,
  onOpenAuth,
  onOpenSettings,
  onOpenMt5Sync,
  mt5ConnectedCount,
  onOpenNewTrade,
  onOpenAiCoach,
  onOpenRiskCalc,
  onOpenExportImport,
  onResetData,
}) => {
  const isNetProfitable = stats.netPnl >= 0;
  const activeAccount = accounts.find((a) => a.id === activeAccountId);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-xl transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        
        {/* Brand & Version Badge */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 shadow-lg shadow-blue-500/25 ring-1 ring-blue-400/40">
              <Zap className="h-5 w-5 text-white" />
              <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-zinc-950 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-lg tracking-tight text-white font-sans">
                  Tre13ze <span className="text-blue-400">Journal</span>
                </span>
                <span className="rounded-md border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-mono font-medium tracking-wider text-blue-400 uppercase">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                SaaS Trading Desk & Auto-Sync
              </p>
            </div>
          </div>

          {/* Account Switcher Button & Dropdown in Header */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="relative inline-flex items-center">
              <select
                value={activeAccountId}
                onChange={(e) => onSelectAccount(e.target.value)}
                className="appearance-none rounded-xl border border-blue-500/40 bg-zinc-900/90 pl-8 pr-7 py-1.5 text-xs font-semibold text-blue-300 hover:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-all cursor-pointer"
                title="Filtrer tout le Dashboard par compte"
              >
                <option value="ALL">🌐 Tous les Comptes Combinés</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    💼 {acc.name} ({formatCurrency(acc.initialBalance, currency)})
                  </option>
                ))}
              </select>
              <Briefcase className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-blue-400" />
              <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-blue-400" />
            </div>

            <button
              onClick={() => setActiveTab('accounts')}
              className="text-[11px] text-zinc-400 hover:text-blue-400 hover:underline px-1 py-1 font-medium transition-all"
              title="Gérer ou ajouter des comptes"
            >
              Gérer
            </button>
          </div>

          {/* Balance Quick Capsule */}
          <div className="hidden xl:flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 px-3.5 py-1.5 shadow-inner">
            <div className="flex flex-col">
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                {activeAccount ? `Capital (${activeAccount.name})` : 'Capital Global'}
              </span>
              <span className="font-mono text-sm font-semibold text-zinc-100">
                {formatCurrency(stats.accountBalance, currency)}
              </span>
            </div>
            <div className="h-6 w-px bg-zinc-800" />
            <div className="flex flex-col">
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                Net P&L
              </span>
              <span className={`font-mono text-sm font-semibold flex items-center gap-0.5 ${
                isNetProfitable ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                <TrendingUp className={`h-3 w-3 ${!isNetProfitable && 'rotate-180'}`} />
                {formatCurrency(stats.netPnl, currency, true)}
                <span className="text-[11px] opacity-80">
                  ({stats.pnlPercentage >= 0 ? '+' : ''}{stats.pnlPercentage.toFixed(2)}%)
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Add Account / MT5 Button */}
          <button
            onClick={onOpenMt5Sync}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all shadow-sm ${
              mt5ConnectedCount > 0
                ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300 hover:border-emerald-400 hover:bg-emerald-900/40'
                : 'border-blue-900/50 bg-blue-950/40 text-blue-300 hover:border-blue-500 hover:bg-blue-900/40'
            }`}
            title="Ajouter un compte ou connecter MT5/MT4"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="font-sans">Ajouter Compte / MT5</span>
            {mt5ConnectedCount > 0 && (
              <span className="h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-emerald-950 ml-0.5" />
            )}
          </button>

          {/* User Auth Profile Capsule */}
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-xs text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800 hover:text-white transition-all shadow-sm"
            title={currentUser ? `Connecté : ${currentUser.email}` : 'Se connecter par e-mail'}
          >
            {currentUser ? (
              <>
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-600 text-[10px] font-bold text-white">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'T'}
                </div>
                <span className="hidden lg:inline max-w-[120px] truncate font-medium">
                  {currentUser.name || currentUser.email.split('@')[0]}
                </span>
              </>
            ) : (
              <>
                <User className="h-3.5 w-3.5 text-blue-400" />
                <span className="font-semibold text-blue-300">Connexion</span>
              </>
            )}
          </button>

          {/* Settings Button */}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800 hover:text-white transition-all shadow-sm"
              title="Paramètres : Compte, Langue, Thème, Déconnexion"
            >
              <Settings className="h-3.5 w-3.5 text-zinc-400 hover:text-blue-400 transition-colors" />
              <span className="hidden md:inline">Paramètres</span>
            </button>
          )}

          {/* Currency Toggle */}
          <div className="relative inline-flex rounded-lg border border-zinc-800 bg-zinc-900/80 p-0.5 text-xs">
            {(['$', '€', '£'] as CurrencySymbol[]).map((curr) => (
              <button
                key={curr}
                onClick={() => setCurrency(curr)}
                className={`rounded-md px-2 py-1 font-mono font-medium transition-all ${
                  currency === curr
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title={`Devise : ${curr}`}
              >
                {curr}
              </button>
            ))}
          </div>

          {/* Risk Calculator Trigger */}
          <button
            onClick={onOpenRiskCalc}
            className="hidden sm:flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/90 hover:text-white transition-all shadow-sm"
            title="Calculateur de Risque & Position"
          >
            <Calculator className="h-3.5 w-3.5 text-blue-400" />
            <span className="hidden md:inline">Calculateur</span>
          </button>

          {/* Tre13ze AI Coach */}
          <button
            onClick={onOpenAiCoach}
            className="relative flex items-center gap-1.5 rounded-lg border border-blue-500/40 bg-gradient-to-r from-blue-900/40 to-blue-600/20 px-3 py-1.5 text-xs font-medium text-blue-300 hover:border-blue-400 hover:from-blue-800/50 hover:to-blue-600/30 hover:text-white transition-all shadow-sm shadow-blue-500/10"
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
            <span className="font-semibold">Coach IA</span>
          </button>

          {/* Export / Backup */}
          <button
            onClick={onOpenExportImport}
            className="hidden sm:flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/90 hover:text-white transition-all"
            title="Exporter / Importer les données"
          >
            <Download className="h-3.5 w-3.5 text-zinc-400" />
            <span className="hidden lg:inline">Données</span>
          </button>

          {/* Reset button */}
          <button
            onClick={onResetData}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-all"
            title="Recharger l'échantillon de données (Reset)"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

          {/* Primary Action: New Trade */}
          <button
            onClick={onOpenNewTrade}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-3.5 py-1.5 text-xs font-semibold text-white transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>Nouveau Trade</span>
          </button>
        </div>
      </div>

      {/* Modern Navigation Tabs */}
      <div className="mx-auto flex max-w-7xl items-center gap-1 px-3 sm:px-6 overflow-x-auto no-scrollbar border-t border-zinc-900/80 pt-1.5 pb-2 touch-pan-x">
        {[
          { id: 'dashboard', label: 'Vue Globale & Dashboard' },
          { id: 'accounts', label: `Mes Comptes (${accounts.length})` },
          { id: 'trades', label: `Journal des Trades (${stats.totalTrades})` },
          { id: 'analytics', label: '📈 Statistiques & Performance' },
          { id: 'calendar', label: 'Calendrier P&L' },
          { id: 'aicoach', label: '🤖 IA Coach' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? 'bg-zinc-800/90 text-blue-400 font-semibold shadow-inner ring-1 ring-zinc-700/50'
                  : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'
              }`}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-blue-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};

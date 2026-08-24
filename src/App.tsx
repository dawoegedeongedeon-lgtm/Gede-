/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Calendar as CalendarIcon, 
  ShieldCheck, 
  ArrowUpRight, 
  BookOpen, 
  Layers, 
  Calculator,
  Zap,
  Briefcase,
  ChevronDown,
  ArrowRight
} from 'lucide-react';
import { Trade, StrategyPlaybook, CurrencySymbol, TradingAccount, UserProfile, Mt5Account } from './types';
import { INITIAL_TRADES, DEFAULT_PLAYBOOKS, DEFAULT_TRADING_ACCOUNTS } from './data/mockTrades';
import { calculateJournalStats, formatCurrency, formatRMultiple } from './utils/calculations';
import { Header } from './components/Header';
import { MetricCards } from './components/MetricCards';
import { EquityChart } from './components/EquityChart';
import { CalendarView } from './components/CalendarView';
import { TradesTable } from './components/TradesTable';
import { TradeModal } from './components/TradeModal';
import { TradeDetailDrawer } from './components/TradeDetailDrawer';
import { AnalyticsView } from './components/AnalyticsView';
import { AccountsView } from './components/AccountsView';
import { AiCoachView } from './components/AiCoachView';
import { PublicReportModal } from './components/PublicReportModal';
import { RiskCalculatorModal } from './components/RiskCalculatorModal';
import { AiCoachModal } from './components/AiCoachModal';
import { ExportImportModal } from './components/ExportImportModal';
import { TradeDistributionChart } from './components/TradeDistributionChart';
import { AuthModal } from './components/AuthModal';
import { Mt5SyncModal } from './components/Mt5SyncModal';
import { AddAccountModal } from './components/AddAccountModal';
import { LoginPage } from './components/LoginPage';
import { SettingsModal } from './components/SettingsModal';
import { UserSettings, LanguageCode, ThemeAccentColor, ThemeBackgroundMode } from './types';
import { useAuth } from './context/AuthContext';

const DEFAULT_SETTINGS: UserSettings = {
  language: 'fr',
  accentColor: 'blue',
  backgroundMode: 'deep',
  defaultCurrency: '$',
  timezone: 'Europe/Paris (UTC+1)',
  riskPerTradePct: 1.0,
  showPnlInNav: true,
  soundEffects: true,
};

const STORAGE_KEYS = {
  TRADES: 'tre13ze_journal_trades_v1',
  PLAYBOOKS: 'tre13ze_journal_playbooks_v1',
  ACCOUNTS: 'tre13ze_journal_accounts_v1',
  ACTIVE_ACCOUNT: 'tre13ze_journal_active_account_v1',
  CURRENCY: 'tre13ze_journal_currency_v1',
  BALANCE: 'tre13ze_journal_balance_v1',
  USER: 'tre13ze_journal_user_v1',
  SETTINGS: 'tre13ze_journal_settings_v1',
};

export default function App() {
  // Global Auth State
  const { user: currentUser, isLoading: isAuthLoading, logout, setUser: setCurrentUser } = useAuth();

  // Settings State
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (saved) {
      try { return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }; } catch (e) { console.error(e); }
    }
    return DEFAULT_SETTINGS;
  });

  // State from LocalStorage or defaults
  const [trades, setTrades] = useState<Trade[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TRADES);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return INITIAL_TRADES;
  });

  const [playbooks, setPlaybooks] = useState<StrategyPlaybook[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PLAYBOOKS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return DEFAULT_PLAYBOOKS;
  });

  const [accounts, setAccounts] = useState<TradingAccount[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return DEFAULT_TRADING_ACCOUNTS;
  });

  const [mt5Accounts, setMt5Accounts] = useState<Mt5Account[]>([]);

  const [activeAccountId, setActiveAccountId] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_ACCOUNT);
    return saved || 'ALL';
  });

  const [currency, setCurrency] = useState<CurrencySymbol>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENCY) as CurrencySymbol;
    return saved || '$';
  });

  const [initialBalance, setInitialBalance] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BALANCE);
    return saved ? Number(saved) : 25000;
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'accounts' | 'trades' | 'aicoach' | 'analytics' | 'calendar'>('dashboard');

  // Modal states
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isMt5SyncModalOpen, setIsMt5SyncModalOpen] = useState(false);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [inspectingTrade, setInspectingTrade] = useState<Trade | null>(null);
  const [isAiCoachOpen, setIsAiCoachOpen] = useState(false);
  const [isRiskCalcOpen, setIsRiskCalcOpen] = useState(false);
  const [isExportImportOpen, setIsExportImportOpen] = useState(false);
  const [isDbSynced, setIsDbSynced] = useState<boolean>(true);
  const [publicReportId, setPublicReportId] = useState<string | null>(null);
  const [syncToast, setSyncToast] = useState<{ title: string; subtitle: string; pnl: number } | null>(null);

  // Authentication & Settings Handlers
  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setSyncToast({
      title: `Connecté : ${user.email}`,
      subtitle: `Bienvenue sur votre espace ${user.name || 'Trader'}`,
      pnl: 0,
    });
    setTimeout(() => setSyncToast(null), 4000);
  };

  const handleLogout = async () => {
    await logout();
    setIsSettingsModalOpen(false);
    setIsAuthModalOpen(false);
    setSyncToast({
      title: 'Session fermée',
      subtitle: 'Vous avez été déconnecté avec succès.',
      pnl: 0,
    });
    setTimeout(() => setSyncToast(null), 3000);
  };

  const handleDeleteUserAccount = async () => {
    try {
      await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: currentUser?.email, id: currentUser?.id }),
      });
    } catch (e) {
      console.error(e);
    }
    await logout();
    setIsSettingsModalOpen(false);
    setIsAuthModalOpen(false);
    setSyncToast({
      title: 'Compte Supprimé',
      subtitle: 'Votre profil et vos sessions ont été effacés.',
      pnl: 0,
    });
    setTimeout(() => setSyncToast(null), 4000);
  };

  const handleUpdateProfile = (updatedProfile: Partial<UserProfile>) => {
    setCurrentUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updatedProfile };
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));
      return updated;
    });
  };

  const handleUpdateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
      if (newSettings.defaultCurrency) {
        setCurrency(newSettings.defaultCurrency);
      }
      return updated;
    });
  };

  // Check URL query param ?report= on mount
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const reportParam = params.get('report');
      if (reportParam) {
        setPublicReportId(reportParam);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Load from Database and MT5 on mount
  useEffect(() => {
    async function loadFromDb() {
      try {
        const [dbRes, mt5Res] = await Promise.all([
          fetch('/api/database'),
          fetch('/api/mt5/accounts'),
        ]);

        if (dbRes.ok) {
          const json = await dbRes.json();
          if (json.success && json.data) {
            if (json.data.trades && json.data.trades.length > 0) setTrades(json.data.trades);
            if (json.data.playbooks && json.data.playbooks.length > 0) setPlaybooks(json.data.playbooks);
            if (json.data.accounts && json.data.accounts.length > 0) setAccounts(json.data.accounts);
            if (json.data.initialBalance) setInitialBalance(json.data.initialBalance);
            if (json.data.currency) setCurrency(json.data.currency);
          }
        }

        if (mt5Res.ok) {
          const mt5Json = await mt5Res.json();
          if (mt5Json.success && mt5Json.accounts) {
            setMt5Accounts(mt5Json.accounts);
          }
        }
      } catch (err) {
        console.warn('Local database sync mode active', err);
      }
    }
    loadFromDb();

    // Periodic polling to check for newly closed MT5 trades from webhook
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/database');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data && json.data.trades) {
            // Check if there are new trades in db compared to current state
            if (json.data.trades.length > trades.length) {
              const newestTrade = json.data.trades[0];
              setTrades(json.data.trades);
              setSyncToast({
                title: `🟢 Nouveau trade MT5 #${newestTrade.ticketNumber || 'AUTO'}`,
                subtitle: `${newestTrade.pair} (${newestTrade.direction}) clôturé`,
                pnl: newestTrade.pnl || 0,
              });
              setTimeout(() => setSyncToast(null), 5000);
            }
          }
        }
      } catch (e) {
        // silent polling error
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [trades.length]);

  // Sync with LocalStorage & Database
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TRADES, JSON.stringify(trades));
    localStorage.setItem(STORAGE_KEYS.PLAYBOOKS, JSON.stringify(playbooks));
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ACCOUNT, activeAccountId);
    localStorage.setItem(STORAGE_KEYS.CURRENCY, currency);
    localStorage.setItem(STORAGE_KEYS.BALANCE, String(initialBalance));
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }

    // Background sync to backend database
    const timeout = setTimeout(async () => {
      try {
        await fetch('/api/database/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trades, playbooks, accounts, initialBalance, currency }),
        });
        setIsDbSynced(true);
      } catch (e) {
        setIsDbSynced(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [trades, playbooks, accounts, activeAccountId, currency, initialBalance, currentUser]);

  // Determine active account object
  const activeAccount = useMemo(() => {
    if (activeAccountId === 'ALL') return null;
    return accounts.find((a) => a.id === activeAccountId) || null;
  }, [accounts, activeAccountId]);

  // Filtered trades by active account for Dashboard & Analytics
  const activeTrades = useMemo(() => {
    if (!activeAccount || activeAccountId === 'ALL') {
      return trades;
    }
    return trades.filter((t) => 
      t.account === activeAccount.name || t.account === activeAccount.id || (!t.account && activeAccount.isDefault)
    );
  }, [trades, activeAccount, activeAccountId]);

  // Effective initial balance based on selected account
  const effectiveInitialBalance = useMemo(() => {
    if (activeAccount) {
      return activeAccount.initialBalance;
    }
    // If all accounts, sum all initial balances or fallback
    if (accounts.length > 0) {
      return accounts.reduce((sum, a) => sum + (a.initialBalance || 0), 0);
    }
    return initialBalance;
  }, [activeAccount, accounts, initialBalance]);

  // Compute stats dynamically for the active account
  const stats = useMemo(() => {
    return calculateJournalStats(activeTrades, effectiveInitialBalance);
  }, [activeTrades, effectiveInitialBalance]);

  const existingStrategies = useMemo(() => {
    const set = new Set<string>();
    playbooks.forEach((p) => set.add(p.name));
    trades.forEach((t) => { if (t.strategy) set.add(t.strategy); });
    return Array.from(set);
  }, [playbooks, trades]);

  // Handlers for Accounts
  const handleAddAccount = async (newAccount: TradingAccount) => {
    setAccounts((prev) => {
      const updated = [...prev, newAccount];
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(updated));
      return updated;
    });
    setActiveAccountId(newAccount.id);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ACCOUNT, newAccount.id);

    setSyncToast({
      title: 'Compte Ajouté',
      subtitle: `Le compte "${newAccount.name}" a été créé et sélectionné.`,
      pnl: 0,
    });
    setTimeout(() => setSyncToast(null), 3500);

    try {
      await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAccount),
      });
    } catch (err) {
      console.warn('Account sync failed', err);
    }
  };

  const handleUpdateAccount = async (updatedAccount: TradingAccount) => {
    setAccounts((prev) => {
      const updated = prev.map((a) => (a.id === updatedAccount.id ? updatedAccount : a));
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(updated));
      return updated;
    });

    setSyncToast({
      title: 'Compte Modifié',
      subtitle: `Informations de "${updatedAccount.name}" mises à jour.`,
      pnl: 0,
    });
    setTimeout(() => setSyncToast(null), 3000);

    try {
      await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedAccount),
      });
    } catch (err) {
      console.warn('Account sync failed', err);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    const deletedAcc = accounts.find((a) => a.id === id);
    setAccounts((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(updated));
      return updated;
    });

    if (activeAccountId === id) {
      setActiveAccountId('ALL');
      localStorage.setItem(STORAGE_KEYS.ACTIVE_ACCOUNT, 'ALL');
    }

    setSyncToast({
      title: 'Compte Supprimé',
      subtitle: deletedAcc ? `Le compte "${deletedAcc.name}" a été retiré.` : 'Profil de compte supprimé.',
      pnl: 0,
    });
    setTimeout(() => setSyncToast(null), 3500);

    try {
      await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Account deletion sync error', err);
    }
  };

  // Handlers for Trades
  const handleSaveTrade = async (trade: Trade) => {
    // 1. Instant optimistic UI update (triggers live Dashboard recalculation)
    setTrades((prev) => {
      const exists = prev.some((t) => t.id === trade.id);
      if (exists) {
        return prev.map((t) => (t.id === trade.id ? trade : t));
      }
      return [trade, ...prev];
    });
    setEditingTrade(null);

    // Live Toast notification confirming real-time update
    const rText = trade.rMultiple !== undefined ? ` • ${trade.rMultiple >= 0 ? '+' : ''}${trade.rMultiple}R` : '';
    setSyncToast({
      title: `⚡ Trade ${trade.pair} (${trade.direction}) Enregistré`,
      subtitle: `Dashboard, Calendrier et Statistiques actualisés instantanément${rText}`,
      pnl: trade.pnl || 0,
    });
    setTimeout(() => setSyncToast(null), 4500);

    // 2. Direct backend database persistence
    try {
      await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trade),
      });
      setIsDbSynced(true);
    } catch (err) {
      console.warn('Backend sync failed, falling back to client storage', err);
    }
  };

  const handleDeleteTrade = (id: string) => {
    setTrades((prev) => prev.filter((t) => t.id !== id));
    if (inspectingTrade?.id === id) setInspectingTrade(null);
  };

  const handleEditTrade = (trade: Trade) => {
    setEditingTrade(trade);
    setIsTradeModalOpen(true);
  };

  const handleSelectTrade = (trade: Trade) => {
    setInspectingTrade(trade);
  };

  const handleResetData = () => {
    if (window.confirm('Voulez-vous recharger les données de démonstration de Tre13ze Journal ?')) {
      setTrades(INITIAL_TRADES);
      setPlaybooks(DEFAULT_PLAYBOOKS);
      setAccounts(DEFAULT_TRADING_ACCOUNTS);
      setActiveAccountId('ALL');
      setInitialBalance(25000);
      setCurrency('$');
    }
  };

  const handleAddPlaybook = (playbook: StrategyPlaybook) => {
    setPlaybooks((prev) => [playbook, ...prev]);
  };

  const handleDeletePlaybook = (id: string) => {
    if (window.confirm('Supprimer cette stratégie du playbook ?')) {
      setPlaybooks((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const handleSaveBacktestTrade = (btTrade: Partial<Trade>) => {
    const pair = btTrade.pair || 'EUR/USD';
    let assetClass: Trade['assetClass'] = 'FOREX';
    if (['BTC/USD', 'ETH/USD'].includes(pair)) assetClass = 'CRYPTO';
    else if (['NAS100', 'US30'].includes(pair)) assetClass = 'INDICES';
    else if (['XAU/USD'].includes(pair)) assetClass = 'COMMODITIES';

    const newTrade: Trade = {
      id: `trade-bt-${Date.now()}`,
      ticketNumber: `BT-${Math.floor(1000 + Math.random() * 9000)}`,
      account: activeAccountId !== 'ALL' 
        ? (accounts.find(a => a.id === activeAccountId)?.name || activeAccountId) 
        : (accounts[0]?.name || 'Compte Principal'),
      pair,
      assetClass,
      direction: btTrade.direction || 'LONG',
      status: btTrade.status || 'WIN',
      entryDate: btTrade.entryDate || new Date().toISOString().split('T')[0],
      entryTime: '14:30',
      exitDate: btTrade.exitDate || new Date().toISOString().split('T')[0],
      exitTime: '15:15',
      entryPrice: btTrade.entryPrice || 0,
      exitPrice: btTrade.exitPrice || 0,
      stopLoss: btTrade.stopLoss || 0,
      takeProfit: btTrade.takeProfit || 0,
      quantity: 1,
      fees: 2.5,
      riskAmount: 250,
      pnl: btTrade.pnl || 0,
      pnlPercentage: (btTrade.pnl || 0) / 250,
      rMultiple: btTrade.rMultiple || 0,
      timeframe: '5m',
      strategy: btTrade.strategy || 'Backtest Replay Setup',
      notes: btTrade.notes || 'Trade importé du Backtest Manager Replay.',
      session: 'New York',
      mistakes: [],
      emotions: 'DISCIPLINED',
      executionRating: 5,
      rulesRespected: true,
    };
    handleSaveTrade(newTrade);
  };

  const handleImportTrades = (imported: Trade[]) => {
    setTrades(imported);
    setIsExportImportOpen(false);
  };

  // Background Theme Mode Class
  const bgThemeClass = useMemo(() => {
    if (settings.backgroundMode === 'oled') return 'bg-black';
    if (settings.backgroundMode === 'navy') return 'bg-[#060d1b]';
    return 'bg-[#08090c]';
  }, [settings.backgroundMode]);

  // Initial Auth Loading State
  if (isAuthLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#070b13] text-white">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
          <div className="h-10 w-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-zinc-400 font-sans tracking-wide">Initialisation de la session Tre13ze...</p>
        </div>
      </div>
    );
  }

  // If user is not logged in, render the dynamic login / register page
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className={`min-h-screen ${bgThemeClass} text-zinc-100 selection:bg-blue-600 selection:text-white font-sans antialiased`}>
      
      {/* Top Header */}
      <Header
        stats={stats}
        currency={currency}
        setCurrency={setCurrency}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        accounts={accounts}
        activeAccountId={activeAccountId}
        onSelectAccount={setActiveAccountId}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenMt5Sync={() => setIsMt5SyncModalOpen(true)}
        mt5ConnectedCount={mt5Accounts.length}
        onOpenNewTrade={() => {
          setEditingTrade(null);
          setIsTradeModalOpen(true);
        }}
        onOpenAiCoach={() => setIsAiCoachOpen(true)}
        onOpenRiskCalc={() => setIsRiskCalcOpen(true)}
        onOpenExportImport={() => setIsExportImportOpen(true)}
        onResetData={handleResetData}
      />

      {/* Live MT5 Sync Notification Toast */}
      {syncToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-zinc-950 p-4 shadow-2xl backdrop-blur-xl ring-1 ring-emerald-500/30 animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white font-sans">{syncToast.title}</h4>
            <p className="text-[11px] text-zinc-400">{syncToast.subtitle}</p>
            <span className={`text-xs font-mono font-bold ${syncToast.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              P&L : {formatCurrency(syncToast.pnl, currency, true)}
            </span>
          </div>
        </div>
      )}

      {/* Main Content Body - Protected against mobile horizontal shifting */}
      <main className="mx-auto w-full max-w-7xl px-3 sm:px-6 py-4 sm:py-6 space-y-6 overflow-x-hidden min-w-0">
        
        {/* 1. Dashboard View */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Active Account & MT5 Sync Filter Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20">
                  <Briefcase className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">Compte Actif :</span>
                    <span className="font-bold text-sm text-white font-sans">
                      {activeAccount ? activeAccount.name : 'Tous les comptes combinés (Vue Globale)'}
                    </span>
                    {activeAccount && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Capital {formatCurrency(activeAccount.initialBalance, currency)}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Affichage de <strong className="text-zinc-200">{activeTrades.length}</strong> exécution(s) filtrée(s) pour ce profil.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* MT5 Quick Sync Pill Button */}
                <button
                  onClick={() => setIsMt5SyncModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 hover:bg-emerald-900/30 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition-all shadow-sm"
                  title="Synchroniser MetaTrader 5"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>MT5 Sync</span>
                </button>

                {/* Switcher Dropdown */}
                <select
                  value={activeAccountId}
                  onChange={(e) => setActiveAccountId(e.target.value)}
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-blue-500 focus:outline-none"
                >
                  <option value="ALL">🌐 Tous les comptes</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>

                {/* Primary Button "Changer de compte" */}
                <button
                  onClick={() => setActiveTab('accounts')}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600/90 hover:bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-600/20 transition-all active:scale-[0.98]"
                >
                  <Briefcase className="h-3.5 w-3.5" />
                  <span>Gérer comptes</span>
                  <ArrowRight className="h-3 w-3 opacity-70" />
                </button>
              </div>
            </div>

            {/* KPI Metric Cards */}
            <MetricCards stats={stats} currency={currency} />

            {/* Middle Grid: Equity Curve + AI Edge Insight Banner */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Equity Curve (2 cols on large screen) */}
              <div className="lg:col-span-2">
                <EquityChart
                  trades={activeTrades}
                  initialBalance={effectiveInitialBalance}
                  currency={currency}
                />
              </div>

              {/* Quick AI Edge & Summary Card (1 col) */}
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 backdrop-blur-sm flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <h3 className="text-sm font-bold text-white font-sans">
                        Diagnostic Rapide Edge
                      </h3>
                    </div>
                    <span className="font-mono text-[10px] text-blue-400 font-semibold uppercase">
                      Tre13ze AI
                    </span>
                  </div>

                  <div className="rounded-xl border border-blue-500/20 bg-blue-950/20 p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-zinc-300">
                      <span>Espérance par Trade :</span>
                      <span className="font-mono font-bold text-emerald-400">
                        +{formatCurrency(stats.expectancy, currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-300">
                      <span>Ratio Gain/Perte :</span>
                      <span className="font-mono font-bold text-blue-400">
                        {stats.winLossRatio.toFixed(2)} : 1
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-300">
                      <span>Facteur de Profit :</span>
                      <span className="font-mono font-bold text-zinc-100">
                        {stats.profitFactor.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Le compte <strong>{activeAccount ? activeAccount.name : 'sélectionné'}</strong> enregistre actuellement <strong>{stats.winRate.toFixed(1)}% de réussite</strong> avec un gain net de <strong className="text-emerald-400">{formatCurrency(stats.netPnl, currency, true)}</strong>.
                  </p>
                </div>

                <div className="pt-2 border-t border-zinc-800/80 space-y-2">
                  <button
                    onClick={() => setIsAiCoachOpen(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 py-2 px-3 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 transition-all"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Lancer l'Audit IA Complet</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('calendar')}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 py-2 px-3 text-xs font-medium text-zinc-300 hover:text-white transition-all"
                  >
                    <CalendarIcon className="h-3.5 w-3.5 text-zinc-400" />
                    <span>Ouvrir le Calendrier P&L</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Dynamic TP / SL / BE Distribution & Execution Breakdown Chart */}
            <TradeDistributionChart trades={activeTrades} currency={currency} />

            {/* Recent Trades Table Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                  <h3 className="text-base font-bold text-white font-sans">
                    Dernières Exécutions {activeAccount ? `(${activeAccount.name})` : ''}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTab('trades')}
                  className="text-xs text-blue-400 hover:underline font-medium"
                >
                  Voir tous les trades ({activeTrades.length}) →
                </button>
              </div>

              <TradesTable
                trades={activeTrades.slice(0, 8)}
                currency={currency}
                onSelectTrade={handleSelectTrade}
                onEditTrade={handleEditTrade}
                onDeleteTrade={handleDeleteTrade}
                onOpenNewTrade={() => {
                  setEditingTrade(null);
                  setIsTradeModalOpen(true);
                }}
              />
            </div>
          </div>
        )}

        {/* 2. Accounts View (Mes Comptes) */}
        {activeTab === 'accounts' && (
          <div className="animate-in fade-in duration-200">
            <AccountsView
              accounts={accounts}
              activeAccountId={activeAccountId}
              onSelectAccount={(accId) => {
                setActiveAccountId(accId);
                setActiveTab('dashboard');
              }}
              onAddAccount={handleAddAccount}
              onUpdateAccount={handleUpdateAccount}
              onDeleteAccount={handleDeleteAccount}
              trades={trades}
              currency={currency}
              onOpenNewTradeForAccount={(accName) => {
                setEditingTrade(null);
                setIsTradeModalOpen(true);
              }}
              onOpenMt5Sync={() => setIsMt5SyncModalOpen(true)}
            />
          </div>
        )}

        {/* 3. Full Trades Log Tab */}
        {activeTab === 'trades' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <TradesTable
              trades={activeTrades}
              currency={currency}
              onSelectTrade={handleSelectTrade}
              onEditTrade={handleEditTrade}
              onDeleteTrade={handleDeleteTrade}
              onOpenNewTrade={() => {
                setEditingTrade(null);
                setIsTradeModalOpen(true);
              }}
            />
          </div>
        )}

        {/* 4. Quantitative Analytics & Performance Stats Tab */}
        {activeTab === 'analytics' && (
          <div className="animate-in fade-in duration-200">
            <AnalyticsView
              trades={activeTrades}
              stats={stats}
              currency={currency}
            />
          </div>
        )}

        {/* 5. Monthly P&L Calendar Tab */}
        {activeTab === 'calendar' && (
          <div className="animate-in fade-in duration-200">
            <CalendarView
              trades={activeTrades}
              currency={currency}
              onSelectTrade={handleSelectTrade}
            />
          </div>
        )}

        {/* 6. Tre13ze AI Coach & Weekly 5-Blocks Audit Tab */}
        {activeTab === 'aicoach' && (
          <div className="animate-in fade-in duration-200">
            <AiCoachView
              trades={activeTrades}
              accounts={accounts}
              activeAccountId={activeAccountId}
              currency={currency}
              accountBalance={effectiveInitialBalance}
            />
          </div>
        )}

      </main>

      {/* Modals & Drawers */}
      <TradeModal
        isOpen={isTradeModalOpen}
        onClose={() => {
          setIsTradeModalOpen(false);
          setEditingTrade(null);
        }}
        onSave={handleSaveTrade}
        editTrade={editingTrade}
        currency={currency}
        existingStrategies={existingStrategies}
        accounts={accounts}
        defaultSelectedAccountName={activeAccount ? activeAccount.name : undefined}
      />

      <TradeDetailDrawer
        trade={inspectingTrade}
        isOpen={!!inspectingTrade}
        onClose={() => setInspectingTrade(null)}
        onEdit={(t) => {
          setInspectingTrade(null);
          handleEditTrade(t);
        }}
        onDelete={handleDeleteTrade}
        currency={currency}
      />

      <RiskCalculatorModal
        isOpen={isRiskCalcOpen}
        onClose={() => setIsRiskCalcOpen(false)}
        accountBalance={stats.accountBalance}
        currency={currency}
      />

      <AiCoachModal
        isOpen={isAiCoachOpen}
        onClose={() => setIsAiCoachOpen(false)}
        trades={activeTrades}
        accountBalance={stats.accountBalance}
        currency={currency}
        onNavigateToFullPage={() => setActiveTab('aicoach')}
      />

      <PublicReportModal
        reportId={publicReportId}
        onClose={() => {
          setPublicReportId(null);
          // clean URL param
          if (window.history.pushState) {
            const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
            window.history.pushState({ path: newUrl }, '', newUrl);
          }
        }}
      />

      <ExportImportModal
        isOpen={isExportImportOpen}
        onClose={() => setIsExportImportOpen(false)}
        trades={trades}
        onImportTrades={handleImportTrades}
      />

      {/* User Authentication & Profile Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={(user) => {
          handleLoginSuccess(user);
          setIsAuthModalOpen(false);
        }}
        onLogout={handleLogout}
      />

      {/* Settings Modal (Compte, Langue, Thème/Couleur, Déconnexion, Suppression) */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentUser={currentUser}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onUpdateProfile={handleUpdateProfile}
        onLogout={handleLogout}
        onDeleteAccount={handleDeleteUserAccount}
      />

      {/* Add Account Modal (Manual or API MT5/MT4/cTrader/MatchTrader/Bitunix) matching screenshots */}
      <AddAccountModal
        isOpen={isMt5SyncModalOpen}
        onClose={() => setIsMt5SyncModalOpen(false)}
        currency={currency}
        onAddManualAccount={(newAccount) => {
          setAccounts((prev) => {
            const updated = [newAccount, ...prev];
            localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(updated));
            return updated;
          });
          setActiveAccountId(newAccount.id);
          localStorage.setItem(STORAGE_KEYS.ACTIVE_ACCOUNT, newAccount.id);
          setSyncToast({
            title: `💼 Compte Créé : ${newAccount.name}`,
            subtitle: `Compte manuel en ${currency} actif. Vous pouvez commencer à saisir vos trades !`,
            pnl: 0,
          });
          setTimeout(() => setSyncToast(null), 5000);
        }}
        onAddManualAccountAndTrade={(newAccount) => {
          setAccounts((prev) => {
            const updated = [newAccount, ...prev];
            localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(updated));
            return updated;
          });
          setActiveAccountId(newAccount.id);
          localStorage.setItem(STORAGE_KEYS.ACTIVE_ACCOUNT, newAccount.id);
          // Open trade modal immediately for this new account
          setEditingTrade(null);
          setIsTradeModalOpen(true);
        }}
        onConnectApiAccount={(newAccount, syncedTrades) => {
          // Add or update account
          setAccounts((prev) => {
            const exists = prev.some(a => a.id === newAccount.id || a.accountNumber === newAccount.accountNumber);
            const updated = exists 
              ? prev.map(a => (a.id === newAccount.id || a.accountNumber === newAccount.accountNumber) ? newAccount : a) 
              : [newAccount, ...prev];
            localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(updated));
            return updated;
          });

          // Switch active account to the newly connected account
          setActiveAccountId(newAccount.id);
          localStorage.setItem(STORAGE_KEYS.ACTIVE_ACCOUNT, newAccount.id);

          // Add synced historical trades
          if (syncedTrades && syncedTrades.length > 0) {
            setTrades((prev) => {
              const existingIds = new Set(prev.map(t => t.id || t.ticketNumber));
              const newItems = syncedTrades.filter(t => !existingIds.has(t.id) && !existingIds.has(t.ticketNumber));
              const combined = [...newItems, ...prev];
              localStorage.setItem(STORAGE_KEYS.TRADES, JSON.stringify(combined));
              return combined;
            });
          }

          const totalPnl = syncedTrades ? syncedTrades.reduce((acc, t) => acc + (t.pnl || 0), 0) : 0;
          setSyncToast({
            title: `✨ Compte Connecté : ${newAccount.name}`,
            subtitle: `Connexion API réussie (${newAccount.serverName || 'Serveur Actif'}). Prêt à enregistrer vos trades !`,
            pnl: totalPnl,
          });
          setTimeout(() => setSyncToast(null), 6000);
        }}
      />

    </div>
  );
}

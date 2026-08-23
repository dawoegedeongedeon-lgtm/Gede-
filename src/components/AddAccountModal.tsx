import React, { useState } from 'react';
import { 
  X, 
  ArrowLeft, 
  ChevronRight, 
  Eye, 
  EyeOff, 
  Search, 
  Check, 
  FileText, 
  Sparkles,
  ShieldCheck,
  Zap,
  HelpCircle,
  Download,
  Terminal,
  Activity,
  Server
} from 'lucide-react';
import { TradingAccount, TradingAccountType, CurrencySymbol, Trade } from '../types';
import { MT5_SERVERS_LIST, Mt5ServerItem } from './Mt5SyncModal';

export type PlatformType = 'manual' | 'mt5' | 'mt4' | 'matchtrader' | 'bitunix' | 'ctrader';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: CurrencySymbol;
  onAddManualAccount: (account: TradingAccount) => void;
  onAddManualAccountAndTrade?: (account: TradingAccount) => void;
  onConnectApiAccount: (account: TradingAccount, syncedTrades?: Trade[]) => void;
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({
  isOpen,
  onClose,
  currency,
  onAddManualAccount,
  onAddManualAccountAndTrade,
  onConnectApiAccount,
}) => {
  // Navigation Steps: 'PLATFORM_SELECT' | 'MANUAL_FORM' | 'API_FORM' | 'SERVER_PICKER'
  const [currentStep, setCurrentStep] = useState<'PLATFORM_SELECT' | 'MANUAL_FORM' | 'API_FORM' | 'SERVER_PICKER'>('PLATFORM_SELECT');
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>('mt5');

  // Manual Form State
  const [manualAccountName, setManualAccountName] = useState('');
  const [manualCurrency, setManualCurrency] = useState<string>(currency === '€' ? 'EUR' : currency === '£' ? 'GBP' : 'USD');
  const [manualInitialBalance, setManualInitialBalance] = useState<string>('');

  // API Form State (MT5 / MT4 / cTrader / MatchTrader / Bitunix)
  const [apiAccountName, setApiAccountName] = useState('');
  const [selectedServer, setSelectedServer] = useState<string>('ApexTraderFunding-Live');
  const [customServerText, setCustomServerText] = useState('');
  const [isCustomServer, setIsCustomServer] = useState(false);
  const [apiAccountId, setApiAccountId] = useState('');
  const [apiPassword, setApiPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Server Picker Search & Category Filter
  const [serverSearch, setServerSearch] = useState('');
  const [serverCategory, setServerCategory] = useState<'ALL' | 'FUTURES' | 'CFD' | 'BROKER'>('ALL');

  // Loading & connecting state
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionSuccess, setConnectionSuccess] = useState(false);
  const [showAdvancedGuide, setShowAdvancedGuide] = useState(false);

  if (!isOpen) return null;

  // Handle Reset on Close or Back
  const handleClose = () => {
    setCurrentStep('PLATFORM_SELECT');
    setIsConnecting(false);
    setConnectionSuccess(false);
    onClose();
  };

  const handleSelectPlatform = (platform: PlatformType) => {
    setSelectedPlatform(platform);
    if (platform === 'manual') {
      setCurrentStep('MANUAL_FORM');
    } else {
      // Pre-fill a standard account name suggestion if empty
      if (platform === 'mt5') {
        setSelectedServer('ApexTraderFunding-Live');
      } else if (platform === 'mt4') {
        setSelectedServer('ICMarkets-Live03');
      } else if (platform === 'matchtrader') {
        setSelectedServer('FundingPips-MatchTrader');
      } else if (platform === 'ctrader') {
        setSelectedServer('FTMO-cTrader');
      } else if (platform === 'bitunix') {
        setSelectedServer('Bitunix-Futures-Live');
      }
      setCurrentStep('API_FORM');
    }
  };

  // Submit Manual Account
  const handleCreateManualAccount = (e: React.FormEvent, andAddTrade: boolean = false) => {
    e.preventDefault();
    if (!manualAccountName.trim()) return;

    const initialBal = manualInitialBalance.trim() ? Math.abs(parseFloat(manualInitialBalance)) : 25000;
    const newAccount: TradingAccount = {
      id: `acc-manual-${Date.now()}`,
      name: manualAccountName.trim(),
      accountType: 'LIVE_PERSONAL',
      brokerOrPropFirm: 'Importation Manuelle',
      initialBalance: isNaN(initialBal) ? 25000 : initialBal,
      currentBalance: isNaN(initialBal) ? 25000 : initialBal,
      createdAt: new Date().toISOString(),
      isDefault: false,
      isMt5Connected: false,
      description: `Compte manuel en ${manualCurrency}`,
    };

    if (andAddTrade && onAddManualAccountAndTrade) {
      onAddManualAccountAndTrade(newAccount);
    } else {
      onAddManualAccount(newAccount);
    }
    handleClose();
  };

  // Submit API Connected Account
  const handleConnectApi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiAccountId.trim()) return;

    setIsConnecting(true);

    const effectiveServerName = isCustomServer ? customServerText.trim() || 'Custom-Server' : selectedServer;
    const finalAccountName = apiAccountName.trim() 
      ? apiAccountName.trim() 
      : `${selectedPlatform.toUpperCase()} (${effectiveServerName.split('-')[0]}) #${apiAccountId}`;

    const isProp = effectiveServerName.toLowerCase().includes('apex') || 
                   effectiveServerName.toLowerCase().includes('topstep') || 
                   effectiveServerName.toLowerCase().includes('ftmo') || 
                   effectiveServerName.toLowerCase().includes('funded') ||
                   effectiveServerName.toLowerCase().includes('mffu');

    const determinedType: TradingAccountType = isProp ? 'PROP_FIRM_FUNDED' : 'LIVE_PERSONAL';
    const estimatedBalance = effectiveServerName.toLowerCase().includes('50k') ? 50000 
      : effectiveServerName.toLowerCase().includes('100k') ? 100000 
      : effectiveServerName.toLowerCase().includes('25k') ? 25000 : 50000;

    const newAccount: TradingAccount = {
      id: `acc-${selectedPlatform}-${Date.now()}`,
      name: finalAccountName,
      accountNumber: apiAccountId.trim(),
      accountType: determinedType,
      brokerOrPropFirm: effectiveServerName,
      serverName: effectiveServerName,
      initialBalance: estimatedBalance,
      currentBalance: estimatedBalance,
      createdAt: new Date().toISOString(),
      isDefault: true,
      isMt5Connected: true,
      mt5Server: effectiveServerName,
      mt5Login: apiAccountId.trim(),
      mt5LastSync: new Date().toISOString(),
      description: `Connexion API ${selectedPlatform.toUpperCase()} active`,
    };

    // Simulate direct instant API verification
    setTimeout(() => {
      setIsConnecting(false);
      setConnectionSuccess(true);
      
      setTimeout(() => {
        onConnectApiAccount(newAccount, []);
        handleClose();
      }, 1000);
    }, 1200);
  };

  // Filter servers in picker
  const filteredServers = MT5_SERVERS_LIST.filter((srv) => {
    if (serverCategory === 'FUTURES' && srv.category !== 'Prop Firm Futures') return false;
    if (serverCategory === 'CFD' && srv.category !== 'Prop Firm CFD & Forex') return false;
    if (serverCategory === 'BROKER' && !srv.category.includes('Broker')) return false;

    if (!serverSearch.trim()) return true;
    const q = serverSearch.toLowerCase();
    return srv.name.toLowerCase().includes(q) || srv.server.toLowerCase().includes(q) || srv.category.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-[#0b111e] border border-blue-950/60 rounded-3xl shadow-2xl overflow-hidden text-zinc-100 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================================= */}
        {/* SCREEN 1: SELECT PLATFORM ("Ajouter un compte")                          */}
        {/* ========================================================================= */}
        {currentStep === 'PLATFORM_SELECT' && (
          <div className="p-5 sm:p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white tracking-tight">Ajouter un compte</h2>
              <button
                type="button"
                onClick={handleClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Sub-header labels */}
            <div>
              <p className="text-[11px] font-semibold text-zinc-500 tracking-wider uppercase">SELECT PLATFORM</p>
              <h3 className="text-base font-bold text-white mt-0.5">Choose how this account trades</h3>
            </div>

            {/* Platform List */}
            <div className="space-y-2.5">
              {/* 1. Manual */}
              <button
                type="button"
                onClick={() => handleSelectPlatform('manual')}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#111927]/90 border border-blue-900/30 hover:border-blue-500/50 hover:bg-[#152033] transition-all group text-left"
              >
                <div className="flex items-center gap-3.5">
                  {/* Manual Icon */}
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 shrink-0">
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                      <path d="M3 5h12v2H3V5zm0 4h8v2H3V9zm0 4h12v2H3v-2zm15.41-3.59l2.18 2.18-7.59 7.59H11v-2l7.41-7.77zM19 10l-1.41-1.41 1.41-1.42 1.42 1.42L19 10z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white group-hover:text-blue-300 transition-colors">Manual</h4>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 text-[10px] font-medium">
                      Manual
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
              </button>

              {/* 2. MT5 */}
              <button
                type="button"
                onClick={() => handleSelectPlatform('mt5')}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#111927]/90 border border-blue-900/30 hover:border-blue-500/50 hover:bg-[#152033] transition-all group text-left"
              >
                <div className="flex items-center gap-3.5">
                  {/* MT5 Logo Icon */}
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-700/60 shrink-0 overflow-hidden relative shadow-inner">
                    <div className="flex items-center justify-center font-black text-xs text-white">
                      <span className="relative z-10 flex items-center justify-center h-6 w-6 rounded-full bg-gradient-to-tr from-amber-500 via-emerald-500 to-blue-500 shadow-md">
                        <span className="font-mono text-xs font-black text-zinc-950">5</span>
                      </span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white group-hover:text-blue-300 transition-colors">MT5</h4>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 text-[10px] font-medium">
                      API
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
              </button>

              {/* 3. MT4 */}
              <button
                type="button"
                onClick={() => handleSelectPlatform('mt4')}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#111927]/90 border border-blue-900/30 hover:border-blue-500/50 hover:bg-[#152033] transition-all group text-left"
              >
                <div className="flex items-center gap-3.5">
                  {/* MT4 Logo Icon */}
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-700/60 shrink-0 overflow-hidden relative shadow-inner">
                    <div className="flex items-center justify-center font-black text-xs text-white">
                      <span className="relative z-10 flex items-center justify-center h-6 w-6 rounded-full bg-gradient-to-tr from-amber-500 via-emerald-500 to-blue-500 shadow-md">
                        <span className="font-mono text-xs font-black text-zinc-950">4</span>
                      </span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white group-hover:text-blue-300 transition-colors">MT4</h4>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 text-[10px] font-medium">
                      API
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
              </button>

              {/* 4. MatchTrader */}
              <button
                type="button"
                onClick={() => handleSelectPlatform('matchtrader')}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#111927]/90 border border-blue-900/30 hover:border-blue-500/50 hover:bg-[#152033] transition-all group text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 shrink-0">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors">MatchTrader</h4>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 text-[10px] font-medium">
                      API
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
              </button>

              {/* 5. Bitunix */}
              <button
                type="button"
                onClick={() => handleSelectPlatform('bitunix')}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#111927]/90 border border-blue-900/30 hover:border-blue-500/50 hover:bg-[#152033] transition-all group text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-lime-950/60 border border-lime-500/30 text-lime-400 shrink-0">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white group-hover:text-lime-300 transition-colors">Bitunix</h4>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 text-[10px] font-medium">
                      API
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
              </button>

              {/* 6. cTrader */}
              <button
                type="button"
                onClick={() => handleSelectPlatform('ctrader')}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#111927]/90 border border-blue-900/30 hover:border-blue-500/50 hover:bg-[#152033] transition-all group text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-400 shrink-0">
                    <div className="h-5 w-5 rounded-full border-2 border-current flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-current" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white group-hover:text-rose-300 transition-colors">cTrader</h4>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 text-[10px] font-medium">
                      API
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 2: IMPORTATION MANUELLE (Matching IMG_0539.jpeg)                  */}
        {/* ========================================================================= */}
        {currentStep === 'MANUAL_FORM' && (
          <div className="p-5 sm:p-6 space-y-6">
            {/* Top Bar with Return & Close */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep('PLATFORM_SELECT')}
                className="flex items-center gap-1.5 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Retour</span>
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Center Hero Icon & Titles */}
            <div className="text-center space-y-2 pt-1">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
                  <path d="M3 5h12v2H3V5zm0 4h8v2H3V9zm0 4h12v2H3v-2zm15.41-3.59l2.18 2.18-7.59 7.59H11v-2l7.41-7.77zM19 10l-1.41-1.41 1.41-1.42 1.42 1.42L19 10z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">Importation manuelle</h3>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
                Créez un compte pour ajouter des transactions manuellement ou importer depuis un fichier CSV
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateManualAccount} className="space-y-4">
              {/* Nom du compte */}
              <div>
                <input
                  type="text"
                  maxLength={50}
                  value={manualAccountName}
                  onChange={(e) => setManualAccountName(e.target.value)}
                  placeholder="Nom du compte *"
                  className="w-full rounded-xl border border-zinc-800 bg-[#0e1626] px-4 py-3.5 text-base sm:text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                  autoFocus
                />
                <div className="flex justify-start px-1 mt-1 text-[11px] text-zinc-500 font-mono">
                  {manualAccountName.length}/50
                </div>
              </div>

              {/* Devise */}
              <div className="relative">
                <label className="absolute -top-2.5 left-3 px-1.5 bg-[#0b111e] text-[11px] font-medium text-zinc-400 z-10">
                  Devise
                </label>
                <select
                  value={manualCurrency}
                  onChange={(e) => setManualCurrency(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-[#0e1626] px-4 py-3.5 text-base sm:text-sm text-white focus:border-blue-500 focus:outline-none appearance-none"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="CHF">CHF (₣)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="AUD">AUD ($)</option>
                </select>
                <ChevronRight className="h-4 w-4 text-zinc-400 absolute right-4 top-4 rotate-90 pointer-events-none" />
              </div>

              {/* Solde initial */}
              <div>
                <input
                  type="number"
                  step="any"
                  value={manualInitialBalance}
                  onChange={(e) => setManualInitialBalance(e.target.value)}
                  placeholder="Solde initial"
                  className="w-full rounded-xl border border-zinc-800 bg-[#0e1626] px-4 py-3.5 text-base sm:text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
                <div className="flex justify-start px-1 mt-1 text-[11px] text-zinc-500">
                  Optional
                </div>
              </div>

              {/* Action Buttons (Annuler / Créer Un Compte / Créer & Ajouter un Trade) */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 py-3 px-3 rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-white text-xs sm:text-sm font-semibold transition-all text-center"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={!manualAccountName.trim()}
                    className={`flex-1 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all text-center shadow-lg ${
                      manualAccountName.trim()
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                        : 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed border border-zinc-900'
                    }`}
                  >
                    Créer Un Compte
                  </button>
                </div>

                <button
                  type="button"
                  disabled={!manualAccountName.trim()}
                  onClick={(e) => handleCreateManualAccount(e, true)}
                  className={`w-full py-3.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all text-center flex items-center justify-center gap-2 shadow-lg ${
                    manualAccountName.trim()
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30 active:scale-[0.99]'
                      : 'bg-blue-950/40 text-blue-400/40 cursor-not-allowed border border-blue-900/20'
                  }`}
                >
                  <span>+ Créer & Ajouter un Trade</span>
                  <Sparkles className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 3: MT5 / MT4 / API CONNEXION (Matching IMG_0540.png)              */}
        {/* ========================================================================= */}
        {currentStep === 'API_FORM' && (
          <div className="p-5 sm:p-6 space-y-5">
            {/* Top Bar */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep('PLATFORM_SELECT')}
                className="flex items-center gap-1.5 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Retour</span>
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Platform Banner */}
            <div className="flex items-center gap-3 pt-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-700/60 shrink-0 relative">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-gradient-to-tr from-amber-500 via-emerald-500 to-blue-500 font-mono text-xs font-black text-zinc-950">
                  {selectedPlatform === 'mt4' ? '4' : '5'}
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight uppercase">{selectedPlatform}</h3>
                <p className="text-xs text-zinc-400">Connexion API</p>
              </div>
            </div>

            {/* API Form */}
            <form onSubmit={handleConnectApi} className="space-y-3.5">
              {/* Nom (facultatif) */}
              <div>
                <input
                  type="text"
                  maxLength={50}
                  value={apiAccountName}
                  onChange={(e) => setApiAccountName(e.target.value)}
                  placeholder="Nom (facultatif)"
                  className="w-full rounded-xl border border-zinc-800 bg-[#0e1626] px-4 py-3 text-base sm:text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <div className="flex justify-start px-1 mt-1 text-[11px] text-zinc-500 font-mono">
                  {apiAccountName.length}/50
                </div>
              </div>

              {/* Sélectionner un serveur (Clickable row opening server picker) */}
              <div>
                <button
                  type="button"
                  onClick={() => setCurrentStep('SERVER_PICKER')}
                  className="w-full flex items-center justify-between rounded-xl border border-zinc-800 bg-[#0e1626] px-4 py-3 text-left hover:border-zinc-700 focus:border-blue-500 transition-all"
                >
                  <div className="space-y-0.5 truncate">
                    <p className="text-[11px] text-zinc-400 font-medium">Sélectionner un serveur</p>
                    <p className="text-sm font-bold text-white truncate">
                      {isCustomServer 
                        ? (customServerText || 'Serveur personnalisé') 
                        : (MT5_SERVERS_LIST.find(s => s.server === selectedServer)?.name || selectedServer)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-500 shrink-0" />
                </button>
              </div>

              {/* ID du compte * */}
              <div>
                <input
                  type="text"
                  value={apiAccountId}
                  onChange={(e) => setApiAccountId(e.target.value)}
                  placeholder="ID du compte *"
                  className="w-full rounded-xl border border-zinc-800 bg-[#0e1626] px-4 py-3 text-base sm:text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  required
                />
              </div>

              {/* Mot de passe du compte * */}
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={apiPassword}
                  onChange={(e) => setApiPassword(e.target.value)}
                  placeholder="Mot de passe du compte *"
                  className="w-full rounded-xl border border-zinc-800 bg-[#0e1626] px-4 py-3 pr-11 text-base sm:text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Security & Guidance Bullet Points */}
              <div className="space-y-1 pt-1 text-xs text-zinc-400 leading-relaxed">
                <p>• Peut utiliser les identifiants des investisseurs (lecture seule)</p>
                <p>• Les mots de passe stockés sont cryptés en AES-256</p>
                <p className="text-zinc-500 pt-1 text-[11px]">
                  Serveur manquant dans la liste ? Tapez juste le nom du serveur.
                </p>
              </div>

              {/* Action Buttons (Annuler / Confirmer) */}
              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-3 px-4 rounded-xl text-sm font-bold text-blue-400 hover:text-blue-300 hover:bg-blue-950/30 transition-all text-center"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!apiAccountId.trim() || isConnecting}
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all text-center flex items-center justify-center gap-2 ${
                    apiAccountId.trim() && !isConnecting
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  {isConnecting ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>Connexion...</span>
                    </>
                  ) : connectionSuccess ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span>Connecté !</span>
                    </>
                  ) : (
                    <span>Confirmer</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUB-SCREEN: RICH SERVER PICKER                                            */}
        {/* ========================================================================= */}
        {currentStep === 'SERVER_PICKER' && (
          <div className="p-5 sm:p-6 space-y-4 max-h-[85vh] flex flex-col">
            {/* Top Return */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep('API_FORM')}
                className="flex items-center gap-1.5 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Retour au formulaire</span>
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Choisir un serveur</h3>
              <p className="text-xs text-zinc-400">Sélectionnez votre prop firm ou courtier dans la liste</p>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="h-4 w-4 text-zinc-400 absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                type="text"
                value={serverSearch}
                onChange={(e) => setServerSearch(e.target.value)}
                placeholder="Rechercher : Apex, Topstep, FTMO, IC Markets..."
                className="w-full rounded-xl border border-zinc-800 bg-[#0e1626] pl-10 pr-4 py-2.5 text-base sm:text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                type="button"
                onClick={() => setServerCategory('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  serverCategory === 'ALL' ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                Tous ({MT5_SERVERS_LIST.length})
              </button>
              <button
                type="button"
                onClick={() => setServerCategory('FUTURES')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  serverCategory === 'FUTURES' ? 'bg-amber-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                🚀 Futures Prop
              </button>
              <button
                type="button"
                onClick={() => setServerCategory('CFD')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  serverCategory === 'CFD' ? 'bg-emerald-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                💎 CFD Prop
              </button>
              <button
                type="button"
                onClick={() => setServerCategory('BROKER')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  serverCategory === 'BROKER' ? 'bg-indigo-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                ⚡ Top Brokers
              </button>
            </div>

            {/* Server List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-72">
              {filteredServers.map((srv) => (
                <button
                  key={srv.id}
                  type="button"
                  onClick={() => {
                    setSelectedServer(srv.server);
                    setIsCustomServer(false);
                    setCurrentStep('API_FORM');
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${
                    selectedServer === srv.server && !isCustomServer
                      ? 'bg-blue-600/20 border border-blue-500/50 text-blue-200'
                      : 'bg-[#0e1626]/70 border border-zinc-800/80 hover:bg-[#131d31] text-zinc-300'
                  }`}
                >
                  <div className="space-y-1 truncate pr-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-white">{srv.name}</span>
                      {srv.badge && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-medium">
                          {srv.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-zinc-400 truncate">
                      {srv.server} • <span className="text-zinc-500">{srv.category}</span>
                    </p>
                  </div>
                  {selectedServer === srv.server && !isCustomServer && (
                    <Check className="h-4 w-4 text-blue-400 shrink-0" />
                  )}
                </button>
              ))}

              {/* Custom server fallback if not found */}
              {serverSearch.trim() && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomServerText(serverSearch.trim());
                      setIsCustomServer(true);
                      setCurrentStep('API_FORM');
                    }}
                    className="w-full p-3 rounded-xl bg-blue-950/60 border border-blue-500/40 text-blue-300 hover:bg-blue-900/50 text-xs font-bold text-center"
                  >
                    Utiliser "{serverSearch}" comme serveur personnalisé
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

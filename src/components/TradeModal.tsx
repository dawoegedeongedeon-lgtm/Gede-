import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Save, 
  Sparkles, 
  Upload, 
  Activity, 
  Layers, 
  BarChart2, 
  Plus, 
  Trash2,
  Calendar,
  Clock,
  Briefcase,
  Globe,
  DollarSign,
  ClipboardPaste,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Trade, Direction, TradeStatus, AssetClass, TradingSession, Timeframe, EmotionState, CurrencySymbol, TradingAccount } from '../types';
import { formatCurrency, formatRMultiple } from '../utils/calculations';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (trade: Trade) => void;
  editTrade?: Trade | null;
  currency: CurrencySymbol;
  existingStrategies: string[];
  accounts?: TradingAccount[];
  defaultSelectedAccountName?: string;
}

const COMMON_PAIRS = [
  'NAS100', 'US30', 'SPX500', 'GER40',
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'GBP/JPY',
  'XAU/USD', 'WTI',
  'BTC/USDT', 'ETH/USDT', 'SOL/USDT',
  'NVDA', 'AAPL', 'TSLA'
];

const DEFAULT_ACCOUNTS = [
  'Apex 50k - #102948',
  'FundedNext 100k - #55231',
  'TopStep 50k - #88412',
  'MyForexFunds - #1102',
  'Compte Personnel Réel',
  'Compte Démo / Backtest'
];

const MISTAKES_OPTIONS = [
  'None - Followed Plan',
  'FOMO',
  'Chased Entry',
  'Moved Stop Loss',
  'Early Exit',
  'Overleveraged',
  'Revenge Trade',
  'Traded High Impact News',
  'No Clear Invalidation',
  'Late Session Fatigue'
];

const POPULAR_INDICATORS = [
  'RSI',
  'MACD',
  'EMA 20',
  'EMA 50',
  'EMA 200',
  'VWAP',
  'Bollinger Bands',
  'Volume Profile',
  'Stochastic',
  'ATR',
  'Fibonacci Retracement',
  'Ichimoku Cloud'
];

const POPULAR_PATTERNS = [
  'Tête et Épaules (Head & Shoulders)',
  'Tête et Épaules Inversée',
  'Drapeau Haussier (Bull Flag)',
  'Drapeau Baissier (Bear Flag)',
  'Double Bottom',
  'Double Top / Faux Breakout',
  'Triangle Ascendant',
  'Triangle Descendant',
  'Triangle Symétrique',
  'Order Block / FVG',
  'Liquidity Sweep',
  'Range / Consolidation'
];

export const TradeModal: React.FC<TradeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editTrade,
  currency,
  existingStrategies,
  accounts = [],
  defaultSelectedAccountName,
}) => {
  const [customIndicatorInput, setCustomIndicatorInput] = useState('');
  const [customPatternInput, setCustomPatternInput] = useState('');
  const [supportInput, setSupportInput] = useState('');
  const [resistanceInput, setResistanceInput] = useState('');
  
  // Custom account input
  const [customAccountInput, setCustomAccountInput] = useState('');
  const [isCustomAccount, setIsCustomAccount] = useState(false);

  const availableAccountNames = accounts.length > 0 
    ? accounts.map((a) => a.name) 
    : DEFAULT_ACCOUNTS;

  const defaultAccount = defaultSelectedAccountName || (availableAccountNames.length > 0 ? availableAccountNames[0] : DEFAULT_ACCOUNTS[0]);

  // Active paste zone indicator
  const [activePasteTarget, setActivePasteTarget] = useState<'BEFORE' | 'AFTER' | null>(null);
  const [pasteFeedback, setPasteFeedback] = useState<string | null>(null);

  const beforeZoneRef = useRef<HTMLDivElement>(null);
  const afterZoneRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<Partial<Trade>>({
    pair: 'NAS100',
    assetClass: 'INDICES',
    direction: 'LONG',
    status: 'WIN',
    account: defaultAccount,
    entryDate: new Date().toISOString().split('T')[0],
    entryTime: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    exitDate: new Date().toISOString().split('T')[0],
    exitTime: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    session: 'New York',
    timeframe: '5m',
    entryPrice: 19800,
    exitPrice: 19920,
    stopLoss: 19760,
    takeProfit: 19920,
    quantity: 2.0,
    fees: 4.5,
    riskAmount: 400,
    pnl: 1195.5,
    pnlPercentage: 2.98,
    rMultiple: 2.98,
    strategy: '',
    mistakes: ['None - Followed Plan'],
    emotions: 'DISCIPLINED',
    executionRating: 5,
    rulesRespected: true,
    indicators: ['RSI', 'VWAP'],
    supportLevels: [],
    resistanceLevels: [],
    chartPatterns: ['Drapeau Haussier (Bull Flag)'],
    technicalNotes: '',
    screenshotBefore: '',
    screenshotAfter: '',
    chartUrl: '',
    notes: '',
    keyTakeaway: '',
  });

  useEffect(() => {
    if (editTrade) {
      setFormData({
        ...editTrade,
        account: editTrade.account || defaultAccount,
        indicators: editTrade.indicators || [],
        supportLevels: editTrade.supportLevels || [],
        resistanceLevels: editTrade.resistanceLevels || [],
        chartPatterns: editTrade.chartPatterns || [],
        technicalNotes: editTrade.technicalNotes || '',
        screenshotBefore: editTrade.screenshotBefore || editTrade.chartUrl || '',
        screenshotAfter: editTrade.screenshotAfter || '',
      });
      if (editTrade.account && !availableAccountNames.includes(editTrade.account)) {
        setIsCustomAccount(true);
        setCustomAccountInput(editTrade.account);
      } else {
        setIsCustomAccount(false);
      }
    } else {
      const now = new Date();
      const currentDate = now.toISOString().split('T')[0];
      const currentTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      
      setFormData({
        pair: 'NAS100',
        assetClass: 'INDICES',
        direction: 'LONG',
        status: 'WIN',
        account: defaultAccount,
        entryDate: currentDate,
        entryTime: currentTime,
        exitDate: currentDate,
        exitTime: currentTime,
        session: 'New York',
        timeframe: '5m',
        entryPrice: 19800,
        exitPrice: 19920,
        stopLoss: 19760,
        takeProfit: 19920,
        quantity: 2.0,
        fees: 4.5,
        riskAmount: 400,
        pnl: 1195.5,
        pnlPercentage: 2.98,
        rMultiple: 2.98,
        strategy: '',
        mistakes: ['None - Followed Plan'],
        emotions: 'DISCIPLINED',
        executionRating: 5,
        rulesRespected: true,
        indicators: ['RSI', 'VWAP'],
        supportLevels: [],
        resistanceLevels: [],
        chartPatterns: ['Drapeau Haussier (Bull Flag)'],
        technicalNotes: '',
        screenshotBefore: '',
        screenshotAfter: '',
        chartUrl: '',
        notes: '',
        keyTakeaway: '',
      });
      setIsCustomAccount(false);
    }
  }, [editTrade, isOpen, defaultSelectedAccountName]);

  // Recalculate PnL & R-Multiple dynamically
  const recalculateMetrics = () => {
    const entry = Number(formData.entryPrice) || 0;
    const exit = Number(formData.exitPrice) || 0;
    const sl = Number(formData.stopLoss) || 0;
    const qty = Number(formData.quantity) || 1;
    const fees = Number(formData.fees) || 0;
    const dir = formData.direction || 'LONG';

    if (entry > 0 && sl > 0) {
      const riskPerUnit = Math.abs(entry - sl);
      const calculatedRiskAmount = riskPerUnit * qty;
      
      let rawPnl = 0;
      if (dir === 'LONG') {
        rawPnl = (exit - entry) * qty;
      } else {
        rawPnl = (entry - exit) * qty;
      }

      const netPnl = Math.round((rawPnl - fees) * 100) / 100;
      const rMultiple = calculatedRiskAmount > 0 ? Math.round((rawPnl / calculatedRiskAmount) * 100) / 100 : 0;
      const pnlPercentage = calculatedRiskAmount > 0 ? Math.round((netPnl / calculatedRiskAmount) * 100) / 100 : 0;

      let calculatedStatus: TradeStatus = formData.status || 'WIN';
      if (netPnl > 5) calculatedStatus = 'WIN';
      else if (netPnl < -5) calculatedStatus = 'LOSS';
      else if (Math.abs(netPnl) <= 5) calculatedStatus = 'BE';

      setFormData((prev) => ({
        ...prev,
        riskAmount: calculatedRiskAmount,
        pnl: netPnl,
        rMultiple: rMultiple,
        pnlPercentage: pnlPercentage,
        status: calculatedStatus,
      }));
    }
  };

  // Direct Clipboard Paste handler (Ctrl+V / Cmd+V)
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const base64 = e.target?.result as string;
              if (base64) {
                // Determine target: active Paste Target or default to Before, or if Before exists then After
                const target = activePasteTarget || (!formData.screenshotBefore ? 'BEFORE' : 'AFTER');
                
                if (target === 'BEFORE') {
                  setFormData((prev) => ({ ...prev, screenshotBefore: base64, chartUrl: base64 }));
                  triggerPasteNotification('Capture "Avant" collée avec succès depuis le presse-papier !');
                } else {
                  setFormData((prev) => ({ ...prev, screenshotAfter: base64 }));
                  triggerPasteNotification('Capture "Après" collée avec succès depuis le presse-papier !');
                }
              }
            };
            reader.readAsDataURL(blob);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [isOpen, activePasteTarget, formData.screenshotBefore]);

  const triggerPasteNotification = (msg: string) => {
    setPasteFeedback(msg);
    setTimeout(() => {
      setPasteFeedback(null);
    }, 3500);
  };

  const handleFileUpload = (target: 'BEFORE' | 'AFTER', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        if (target === 'BEFORE') {
          setFormData((prev) => ({ ...prev, screenshotBefore: base64, chartUrl: base64 }));
          triggerPasteNotification('Capture "Avant" importée avec succès');
        } else {
          setFormData((prev) => ({ ...prev, screenshotAfter: base64 }));
          triggerPasteNotification('Capture "Après" importée avec succès');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleIndicator = (ind: string) => {
    const current = formData.indicators || [];
    if (current.includes(ind)) {
      setFormData({ ...formData, indicators: current.filter((i) => i !== ind) });
    } else {
      setFormData({ ...formData, indicators: [...current, ind] });
    }
  };

  const addCustomIndicator = () => {
    if (!customIndicatorInput.trim()) return;
    const current = formData.indicators || [];
    if (!current.includes(customIndicatorInput.trim())) {
      setFormData({ ...formData, indicators: [...current, customIndicatorInput.trim()] });
    }
    setCustomIndicatorInput('');
  };

  const toggleChartPattern = (pattern: string) => {
    const current = formData.chartPatterns || [];
    if (current.includes(pattern)) {
      setFormData({ ...formData, chartPatterns: current.filter((p) => p !== pattern) });
    } else {
      setFormData({ ...formData, chartPatterns: [...current, pattern] });
    }
  };

  const addCustomPattern = () => {
    if (!customPatternInput.trim()) return;
    const current = formData.chartPatterns || [];
    if (!current.includes(customPatternInput.trim())) {
      setFormData({ ...formData, chartPatterns: [...current, customPatternInput.trim()] });
    }
    setCustomPatternInput('');
  };

  const addSupportLevel = () => {
    const val = parseFloat(supportInput);
    if (!isNaN(val)) {
      const current = formData.supportLevels || [];
      if (!current.includes(val)) {
        setFormData({ ...formData, supportLevels: [...current, val].sort((a, b) => a - b) });
      }
      setSupportInput('');
    }
  };

  const removeSupportLevel = (lvl: number) => {
    const current = formData.supportLevels || [];
    setFormData({ ...formData, supportLevels: current.filter((l) => l !== lvl) });
  };

  const addResistanceLevel = () => {
    const val = parseFloat(resistanceInput);
    if (!isNaN(val)) {
      const current = formData.resistanceLevels || [];
      if (!current.includes(val)) {
        setFormData({ ...formData, resistanceLevels: [...current, val].sort((a, b) => a - b) });
      }
      setResistanceInput('');
    }
  };

  const removeResistanceLevel = (lvl: number) => {
    const current = formData.resistanceLevels || [];
    setFormData({ ...formData, resistanceLevels: current.filter((l) => l !== lvl) });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalAccount = isCustomAccount ? customAccountInput.trim() || 'Compte Principal' : (formData.account || DEFAULT_ACCOUNTS[0]);

    const tradeToSave: Trade = {
      id: editTrade ? editTrade.id : `tr-${Date.now()}`,
      ticketNumber: editTrade?.ticketNumber || `#${Math.floor(1000 + Math.random() * 9000)}`,
      account: finalAccount,
      pair: formData.pair || 'NAS100',
      assetClass: (formData.assetClass as AssetClass) || 'INDICES',
      direction: (formData.direction as Direction) || 'LONG',
      status: (formData.status as TradeStatus) || 'WIN',
      entryDate: formData.entryDate || new Date().toISOString().split('T')[0],
      entryTime: formData.entryTime || '10:00',
      exitDate: formData.exitDate || formData.entryDate || new Date().toISOString().split('T')[0],
      exitTime: formData.exitTime || '11:00',
      session: (formData.session as TradingSession) || 'New York',
      timeframe: (formData.timeframe as Timeframe) || '5m',
      entryPrice: Number(formData.entryPrice) || 0,
      exitPrice: Number(formData.exitPrice) || 0,
      stopLoss: Number(formData.stopLoss) || 0,
      takeProfit: Number(formData.takeProfit) || 0,
      quantity: Number(formData.quantity) || 1,
      fees: Number(formData.fees) || 0,
      riskAmount: Number(formData.riskAmount) || 0,
      pnl: Number(formData.pnl) || 0,
      pnlPercentage: Number(formData.pnlPercentage) || 0,
      rMultiple: Number(formData.rMultiple) || 0,
      strategy: '', // Removed setup/strategy as requested
      mistakes: formData.mistakes || ['None - Followed Plan'],
      emotions: (formData.emotions as EmotionState) || 'DISCIPLINED',
      executionRating: Number(formData.executionRating) || 5,
      rulesRespected: formData.rulesRespected ?? true,
      indicators: formData.indicators || [],
      supportLevels: formData.supportLevels || [],
      resistanceLevels: formData.resistanceLevels || [],
      chartPatterns: formData.chartPatterns || [],
      technicalNotes: formData.technicalNotes || '',
      screenshotBefore: formData.screenshotBefore || '',
      screenshotAfter: formData.screenshotAfter || '',
      chartUrl: formData.screenshotBefore || formData.chartUrl || '',
      notes: formData.notes || '',
      keyTakeaway: formData.keyTakeaway || '',
    };

    if (tradeToSave.status === 'WIN') {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#10b981', '#60a5fa'],
      });
    }

    onSave(tradeToSave);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6 shadow-2xl space-y-5 my-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Paste Notification Banner */}
        {pasteFeedback && (
          <div className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/90 px-4 py-2.5 text-xs text-emerald-200 shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{pasteFeedback}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-400" />
              {editTrade ? `Modifier Trade ${editTrade.ticketNumber}` : 'Ajouter un Trade'}
            </h2>
            <p className="text-xs text-zinc-400">
              Enregistrement en base de données avec calculs instantanés et synchronisation du Dashboard
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          
          {/* Section 1: Date, Heure, Instrument & Compte */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            {/* Instrument / Paire */}
            <div>
              <label className="block text-zinc-300 font-medium mb-1 flex items-center gap-1">
                <BarChart2 className="h-3.5 w-3.5 text-blue-400" />
                Instrument (Actif) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={formData.pair}
                  onChange={(e) => setFormData({ ...formData, pair: e.target.value.toUpperCase() })}
                  list="pairs-datalist"
                  placeholder="Ex: NAS100, EUR/USD, BTC"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono font-bold placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                />
                <datalist id="pairs-datalist">
                  {COMMON_PAIRS.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Compte Sélectionné */}
            <div>
              <label className="block text-zinc-300 font-medium mb-1 flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5 text-emerald-400" />
                Compte Sélectionné <span className="text-rose-400">*</span>
              </label>
              {!isCustomAccount ? (
                <div className="flex gap-1.5">
                  <select
                    value={formData.account}
                    onChange={(e) => {
                      if (e.target.value === '__CUSTOM__') {
                        setIsCustomAccount(true);
                      } else {
                        setFormData({ ...formData, account: e.target.value });
                      }
                    }}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 font-medium focus:border-blue-500 focus:outline-none"
                  >
                    {availableAccountNames.map((acc) => (
                      <option key={acc} value={acc}>{acc}</option>
                    ))}
                    <option value="__CUSTOM__">+ Nouveau compte...</option>
                  </select>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    required
                    value={customAccountInput}
                    onChange={(e) => setCustomAccountInput(e.target.value)}
                    placeholder="Nom du compte..."
                    className="w-full rounded-xl border border-blue-500/50 bg-zinc-900 px-3 py-2 text-white font-medium focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setIsCustomAccount(false)}
                    className="px-2 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            {/* Date d'Exécution */}
            <div>
              <label className="block text-zinc-300 font-medium mb-1 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-blue-400" />
                Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.entryDate}
                onChange={(e) => setFormData({ ...formData, entryDate: e.target.value, exitDate: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Heure d'Exécution */}
            <div>
              <label className="block text-zinc-300 font-medium mb-1 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                Heure <span className="text-rose-400">*</span>
              </label>
              <input
                type="time"
                required
                value={formData.entryTime}
                onChange={(e) => setFormData({ ...formData, entryTime: e.target.value, exitTime: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Section 2: Session (Londres, New York ou ASIATIQUE) & Direction */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Session - Explicitly Londres, New York, ASIATIQUE */}
            <div>
              <label className="block text-zinc-300 font-medium mb-1 flex items-center gap-1">
                <Globe className="h-3.5 w-3.5 text-blue-400" />
                Session de Trading <span className="text-rose-400">*</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'London', label: 'Londres' },
                  { id: 'New York', label: 'New York' },
                  { id: 'Asian', label: 'ASIATIQUE' },
                ].map((s) => {
                  const isSelected = formData.session === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, session: s.id as TradingSession })}
                      className={`rounded-xl py-2 px-1 text-center font-medium transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-600/30 text-blue-300 border font-bold shadow-sm'
                          : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Direction */}
            <div>
              <label className="block text-zinc-300 font-medium mb-1">Direction</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, direction: 'LONG' })}
                  className={`rounded-xl py-2 font-mono font-bold transition-all ${
                    formData.direction === 'LONG'
                      ? 'bg-blue-600 text-white ring-2 ring-blue-400 shadow-md shadow-blue-500/20'
                      : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                  }`}
                >
                  LONG ↗
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, direction: 'SHORT' })}
                  className={`rounded-xl py-2 font-mono font-bold transition-all ${
                    formData.direction === 'SHORT'
                      ? 'bg-purple-600 text-white ring-2 ring-purple-400 shadow-md shadow-purple-500/20'
                      : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                  }`}
                >
                  SHORT ↘
                </button>
              </div>
            </div>

            {/* Résultat (TP / SL / BE / OPEN) */}
            <div>
              <label className="block text-zinc-300 font-medium mb-1">
                Résultat / Sortie <span className="text-rose-400">*</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, status: 'WIN' }));
                  }}
                  className={`rounded-xl py-2 font-mono font-bold transition-all ${
                    formData.status === 'WIN'
                      ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500 shadow-sm'
                      : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                  }`}
                >
                  TP (Win)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, status: 'LOSS' }));
                  }}
                  className={`rounded-xl py-2 font-mono font-bold transition-all ${
                    formData.status === 'LOSS'
                      ? 'bg-rose-600/30 text-rose-300 border border-rose-500 shadow-sm'
                      : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                  }`}
                >
                  SL (Perte)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, status: 'BE' }));
                  }}
                  className={`rounded-xl py-2 font-mono font-bold transition-all ${
                    formData.status === 'BE'
                      ? 'bg-amber-600/30 text-amber-300 border border-amber-500 shadow-sm'
                      : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                  }`}
                >
                  BE (Neutre)
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Données Numériques & Calculateur PnL / R-Multiple */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-zinc-300 font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-blue-400" />
                Coordonnées de Prix & Résultat (R-Multiple)
              </span>
              <button
                type="button"
                onClick={recalculateMetrics}
                className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 font-medium"
              >
                ⚡ Recalculer P&L & R
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <div>
                <label className="block text-zinc-400 mb-1">Prix d'Entrée</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.entryPrice}
                  onChange={(e) => setFormData({ ...formData, entryPrice: parseFloat(e.target.value) || 0 })}
                  onBlur={recalculateMetrics}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 font-mono text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Prix de Sortie</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.exitPrice}
                  onChange={(e) => setFormData({ ...formData, exitPrice: parseFloat(e.target.value) || 0 })}
                  onBlur={recalculateMetrics}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 font-mono text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Stop Loss (SL)</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.stopLoss}
                  onChange={(e) => setFormData({ ...formData, stopLoss: parseFloat(e.target.value) || 0 })}
                  onBlur={recalculateMetrics}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 font-mono text-rose-400 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Take Profit (TP)</label>
                <input
                  type="number"
                  step="any"
                  value={formData.takeProfit}
                  onChange={(e) => setFormData({ ...formData, takeProfit: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 font-mono text-emerald-400 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Quantité / Lots</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                  onBlur={recalculateMetrics}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 font-mono text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Frais / Comm. ({currency})</label>
                <input
                  type="number"
                  step="any"
                  value={formData.fees}
                  onChange={(e) => setFormData({ ...formData, fees: parseFloat(e.target.value) || 0 })}
                  onBlur={recalculateMetrics}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 font-mono text-zinc-300 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Calculated Preview Strip (R-Multiple & PnL) */}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-zinc-950 p-3.5 border border-zinc-800 font-mono shadow-inner">
              <div>
                <span className="text-zinc-400 text-[10px] uppercase block">Risque Prévu</span>
                <span className="text-zinc-200 font-bold text-sm">{formatCurrency(formData.riskAmount || 0, currency)}</span>
              </div>
              <div>
                <span className="text-zinc-400 text-[10px] uppercase block">P&L Net Calculé</span>
                <span className={`text-base font-bold ${
                  (formData.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {formatCurrency(formData.pnl || 0, currency, true)}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 text-[10px] uppercase block">R-Multiple Réalisé</span>
                <span className={`font-bold text-lg ${
                  (formData.rMultiple || 0) >= 0 ? 'text-blue-400' : 'text-rose-400'
                }`}>
                  {formatRMultiple(formData.rMultiple || 0)}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 text-[10px] uppercase block">Timeframe</span>
                <select
                  value={formData.timeframe}
                  onChange={(e) => setFormData({ ...formData, timeframe: e.target.value as any })}
                  className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none"
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
          </div>

          {/* Section 4: Captures Avant & Après (Support Copier-Coller Direct Ctrl+V / Cmd+V) */}
          <div className="rounded-xl border border-blue-500/30 bg-blue-950/10 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-blue-400" />
                <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                  Captures Graphiques (Avant / Après)
                </h3>
              </div>
              <span className="text-[11px] text-blue-300/80 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md flex items-center gap-1 font-mono">
                <ClipboardPaste className="h-3 w-3" />
                Copier-Coller direct actif (Ctrl+V / Cmd+V)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Capture Avant Trade */}
              <div
                ref={beforeZoneRef}
                onClick={() => setActivePasteTarget('BEFORE')}
                className={`relative rounded-xl border-2 border-dashed p-3.5 transition-all cursor-pointer flex flex-col justify-between ${
                  activePasteTarget === 'BEFORE'
                    ? 'border-blue-400 bg-blue-950/20 shadow-md shadow-blue-500/10'
                    : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-400"></span>
                    Capture "Avant Trade" (Setup & Entrée)
                  </span>
                  {formData.screenshotBefore && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormData((prev) => ({ ...prev, screenshotBefore: '' }));
                      }}
                      className="text-zinc-500 hover:text-rose-400 p-1"
                      title="Supprimer l'image"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {formData.screenshotBefore ? (
                  <div className="relative rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 max-h-44 flex items-center justify-center group">
                    <img
                      src={formData.screenshotBefore}
                      alt="Avant Trade"
                      className="max-h-44 w-auto object-contain"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-white">
                      Cliquez ou faites Ctrl+V pour remplacer
                    </div>
                  </div>
                ) : (
                  <div className="py-6 flex flex-col items-center justify-center text-center space-y-2">
                    <ClipboardPaste className="h-7 w-7 text-blue-400/80" />
                    <div>
                      <p className="text-xs font-semibold text-zinc-200">
                        Collez l'image ici (<kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-blue-300">Ctrl+V</kbd>)
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">ou sélectionnez un fichier</p>
                    </div>
                    <label 
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[11px] text-zinc-300 hover:bg-zinc-700 hover:text-white cursor-pointer"
                    >
                      <Upload className="h-3 w-3" />
                      <span>Parcourir</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload('BEFORE', e)}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Capture Après Trade */}
              <div
                ref={afterZoneRef}
                onClick={() => setActivePasteTarget('AFTER')}
                className={`relative rounded-xl border-2 border-dashed p-3.5 transition-all cursor-pointer flex flex-col justify-between ${
                  activePasteTarget === 'AFTER'
                    ? 'border-blue-400 bg-blue-950/20 shadow-md shadow-blue-500/10'
                    : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                    Capture "Après Trade" (Résultat / Sortie)
                  </span>
                  {formData.screenshotAfter && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormData((prev) => ({ ...prev, screenshotAfter: '' }));
                      }}
                      className="text-zinc-500 hover:text-rose-400 p-1"
                      title="Supprimer l'image"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {formData.screenshotAfter ? (
                  <div className="relative rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 max-h-44 flex items-center justify-center group">
                    <img
                      src={formData.screenshotAfter}
                      alt="Après Trade"
                      className="max-h-44 w-auto object-contain"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-white">
                      Cliquez ou faites Ctrl+V pour remplacer
                    </div>
                  </div>
                ) : (
                  <div className="py-6 flex flex-col items-center justify-center text-center space-y-2">
                    <ClipboardPaste className="h-7 w-7 text-emerald-400/80" />
                    <div>
                      <p className="text-xs font-semibold text-zinc-200">
                        Collez l'image ici (<kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-emerald-300">Ctrl+V</kbd>)
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">ou sélectionnez un fichier</p>
                    </div>
                    <label 
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[11px] text-zinc-300 hover:bg-zinc-700 hover:text-white cursor-pointer"
                    >
                      <Upload className="h-3 w-3" />
                      <span>Parcourir</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload('AFTER', e)}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Section 5: Analyse Technique (Indicateurs & Confluences Optionnelles) */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-zinc-300 font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-blue-400" />
                Confluences & Indicateurs Utilisés
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {POPULAR_INDICATORS.map((ind) => {
                const isSelected = formData.indicators?.includes(ind);
                return (
                  <button
                    key={ind}
                    type="button"
                    onClick={() => toggleIndicator(ind)}
                    className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                      isSelected
                        ? 'border-blue-500/60 bg-blue-500/20 text-blue-300'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}{ind}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 6: Notes & Psychologie */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-zinc-400 font-medium mb-1">État Émotionnel</label>
              <select
                value={formData.emotions}
                onChange={(e) => setFormData({ ...formData, emotions: e.target.value as any })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 focus:border-blue-500 focus:outline-none font-mono"
              >
                <option value="DISCIPLINED">🟢 DISCIPLINED (Plan suivi)</option>
                <option value="CALM">🔵 CALM (Serein)</option>
                <option value="ANXIOUS">🟡 ANXIOUS (Hésitant / Stressé)</option>
                <option value="GREEDY">🟠 GREEDY (Gourmand)</option>
                <option value="REVENGE">🔴 REVENGE (Vengeance)</option>
                <option value="FATIGUED">🟣 FATIGUED (Fatigue)</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 font-medium mb-1">Erreur Notée (Le cas échéant)</label>
              <select
                value={formData.mistakes?.[0] || 'None - Followed Plan'}
                onChange={(e) => setFormData({ ...formData, mistakes: [e.target.value] })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 focus:border-blue-500 focus:outline-none"
              >
                {MISTAKES_OPTIONS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-zinc-400 font-medium mb-1">Notes du Trade</label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Raison de la prise de position, contexte et observations..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-zinc-200 placeholder-zinc-500 focus:border-blue-500 focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-zinc-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-zinc-300 hover:text-white font-medium transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2 font-semibold text-white shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 active:scale-[0.98] transition-all"
            >
              <Save className="h-4 w-4" />
              <span>{editTrade ? 'Mettre à jour' : 'Enregistrer le Trade'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

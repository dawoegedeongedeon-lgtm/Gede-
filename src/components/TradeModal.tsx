import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  Save, 
  Sparkles, 
  Upload, 
  Activity, 
  BarChart2, 
  Trash2,
  Calendar,
  Clock,
  Briefcase,
  Globe,
  DollarSign,
  ClipboardPaste,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Target,
  Shield,
  Layers,
  Scale
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
  'BTC/USD', 'ETH/USD', 'SOL/USD',
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'GBP/JPY',
  'NAS100', 'US30', 'SPX500', 'GER40',
  'XAU/USD', 'WTI',
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

export const TradeModal: React.FC<TradeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editTrade,
  currency,
  existingStrategies: _existingStrategies,
  accounts = [],
  defaultSelectedAccountName,
}) => {
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
    pair: 'BTC/USD',
    assetClass: 'CRYPTO',
    direction: 'LONG',
    status: 'WIN',
    account: defaultAccount,
    entryDate: new Date().toISOString().split('T')[0],
    entryTime: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    exitDate: new Date().toISOString().split('T')[0],
    exitTime: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    session: 'New York',
    timeframe: '5m',
    entryPrice: 65000,
    exitPrice: 66500,
    stopLoss: 64500,
    takeProfit: 66500,
    quantity: 0.5,
    fees: 5.0,
    riskAmount: 250,
    pnl: 745.0,
    pnlPercentage: 2.98,
    rMultiple: 3.0,
    theoreticalRR: 3.0,
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
        pair: 'BTC/USD',
        assetClass: 'CRYPTO',
        direction: 'LONG',
        status: 'WIN',
        account: defaultAccount,
        entryDate: currentDate,
        entryTime: currentTime,
        exitDate: currentDate,
        exitTime: currentTime,
        session: 'New York',
        timeframe: '5m',
        entryPrice: 65000,
        exitPrice: 66500,
        stopLoss: 64500,
        takeProfit: 66500,
        quantity: 0.5,
        fees: 5.0,
        riskAmount: 250,
        pnl: 745.0,
        pnlPercentage: 2.98,
        rMultiple: 3.0,
        theoreticalRR: 3.0,
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

  // Real-time calculation of theoretical R:R, planned risk, planned reward & invalidation alerts
  const liveCalculations = useMemo(() => {
    const entry = Number(formData.entryPrice) || 0;
    const sl = Number(formData.stopLoss) || 0;
    const tp = Number(formData.takeProfit) || 0;
    const qty = Number(formData.quantity) || 0;
    const fees = Number(formData.fees) || 0;
    const exit = Number(formData.exitPrice) || 0;
    const dir = formData.direction || 'LONG';

    let riskPoints = 0;
    let rewardPoints = 0;
    let theoreticalRR = 0;
    let plannedRiskAmount = 0;
    let plannedRewardAmount = 0;
    let isSlValid = true;
    let isTpValid = true;
    let warningMessage = '';

    if (entry > 0) {
      if (dir === 'LONG') {
        if (sl > 0) {
          if (sl >= entry) {
            isSlValid = false;
            warningMessage = "⚠️ En position Long (Achat), le Stop-Loss doit être STRICTEMENT inférieur au prix d'entrée.";
          } else {
            riskPoints = entry - sl;
            plannedRiskAmount = Math.round(riskPoints * qty * 100) / 100;
          }
        }
        if (tp > 0) {
          if (tp <= entry) {
            isTpValid = false;
            if (!warningMessage) {
              warningMessage = "⚠️ En position Long (Achat), le Take-Profit doit être STRICTEMENT supérieur au prix d'entrée.";
            }
          } else {
            rewardPoints = tp - entry;
            plannedRewardAmount = Math.round(rewardPoints * qty * 100) / 100;
          }
        }
      } else {
        // SHORT
        if (sl > 0) {
          if (sl <= entry) {
            isSlValid = false;
            warningMessage = "⚠️ En position Short (Vente), le Stop-Loss doit être STRICTEMENT supérieur au prix d'entrée.";
          } else {
            riskPoints = sl - entry;
            plannedRiskAmount = Math.round(riskPoints * qty * 100) / 100;
          }
        }
        if (tp > 0) {
          if (tp >= entry) {
            isTpValid = false;
            if (!warningMessage) {
              warningMessage = "⚠️ En position Short (Vente), le Take-Profit doit être STRICTEMENT inférieur au prix d'entrée.";
            }
          } else {
            rewardPoints = entry - tp;
            plannedRewardAmount = Math.round(rewardPoints * qty * 100) / 100;
          }
        }
      }

      if (riskPoints > 0 && rewardPoints > 0) {
        theoreticalRR = Math.round((rewardPoints / riskPoints) * 100) / 100;
      }
    }

    // Realized metrics (if exit is set)
    let rawRealizedPnl = 0;
    if (entry > 0 && exit > 0 && qty > 0) {
      if (dir === 'LONG') {
        rawRealizedPnl = (exit - entry) * qty;
      } else {
        rawRealizedPnl = (entry - exit) * qty;
      }
    }
    const netRealizedPnl = Math.round((rawRealizedPnl - fees) * 100) / 100;
    const realizedR = plannedRiskAmount > 0 
      ? Math.round((rawRealizedPnl / plannedRiskAmount) * 100) / 100 
      : 0;

    return {
      entry,
      sl,
      tp,
      qty,
      exit,
      dir,
      riskPoints: Math.round(riskPoints * 100) / 100,
      rewardPoints: Math.round(rewardPoints * 100) / 100,
      theoreticalRR,
      plannedRiskAmount,
      plannedRewardAmount,
      isSlValid,
      isTpValid,
      warningMessage,
      netRealizedPnl,
      realizedR,
    };
  }, [formData.entryPrice, formData.stopLoss, formData.takeProfit, formData.quantity, formData.exitPrice, formData.fees, formData.direction]);

  // Recalculate and update realized PnL in formData
  const recalculateMetrics = () => {
    const { plannedRiskAmount, netRealizedPnl, realizedR } = liveCalculations;
    
    let calculatedStatus: TradeStatus = formData.status || 'WIN';
    if (netRealizedPnl > 5) calculatedStatus = 'WIN';
    else if (netRealizedPnl < -5) calculatedStatus = 'LOSS';
    else if (Math.abs(netRealizedPnl) <= 5) calculatedStatus = 'BE';

    setFormData((prev) => ({
      ...prev,
      riskAmount: plannedRiskAmount || prev.riskAmount,
      pnl: netRealizedPnl,
      rMultiple: realizedR,
      theoreticalRR: liveCalculations.theoreticalRR,
      pnlPercentage: plannedRiskAmount > 0 ? Math.round((netRealizedPnl / plannedRiskAmount) * 100) / 100 : 0,
      status: calculatedStatus,
    }));
  };

  // Quick helper to apply TP / SL / BE to Exit Price
  const applyPresetExitPrice = (target: 'TP' | 'SL' | 'BE') => {
    const entry = Number(formData.entryPrice) || 0;
    const tp = Number(formData.takeProfit) || 0;
    const sl = Number(formData.stopLoss) || 0;
    const qty = Number(formData.quantity) || 1;
    const fees = Number(formData.fees) || 0;
    const dir = formData.direction || 'LONG';

    let newExit = entry;
    let newStatus: TradeStatus = 'BE';

    if (target === 'TP' && tp > 0) {
      newExit = tp;
      newStatus = 'WIN';
    } else if (target === 'SL' && sl > 0) {
      newExit = sl;
      newStatus = 'LOSS';
    } else if (target === 'BE' && entry > 0) {
      newExit = entry;
      newStatus = 'BE';
    }

    const rawPnl = dir === 'LONG' ? (newExit - entry) * qty : (entry - newExit) * qty;
    const netPnl = Math.round((rawPnl - fees) * 100) / 100;
    const riskAmt = liveCalculations.plannedRiskAmount || 1;
    const rVal = riskAmt > 0 ? Math.round((rawPnl / riskAmt) * 100) / 100 : 0;

    setFormData((prev) => ({
      ...prev,
      exitPrice: newExit,
      status: newStatus,
      pnl: netPnl,
      rMultiple: rVal,
      pnlPercentage: riskAmt > 0 ? Math.round((netPnl / riskAmt) * 100) / 100 : 0,
      riskAmount: liveCalculations.plannedRiskAmount,
    }));

    triggerPasteNotification(`Sortie appliquée sur ${target} (${newExit})`);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalAccount = isCustomAccount ? customAccountInput.trim() || 'Compte Principal' : (formData.account || DEFAULT_ACCOUNTS[0]);
    const pairValue = (formData.pair || 'BTC/USD').trim().toUpperCase();
    const entryPrice = Number(formData.entryPrice) || 0;
    const stopLoss = Number(formData.stopLoss) || 0;
    const takeProfit = Number(formData.takeProfit) || 0;
    const quantity = Number(formData.quantity) || 1;
    const exitPrice = Number(formData.exitPrice) || takeProfit || entryPrice;
    const fees = Number(formData.fees) || 0;
    const direction = (formData.direction as Direction) || 'LONG';

    // Calculate final PnL and risk
    const riskAmt = liveCalculations.plannedRiskAmount > 0 
      ? liveCalculations.plannedRiskAmount 
      : Math.abs(entryPrice - stopLoss) * quantity;
    
    let rawPnl = direction === 'LONG' ? (exitPrice - entryPrice) * quantity : (entryPrice - exitPrice) * quantity;
    const finalNetPnl = Math.round((rawPnl - fees) * 100) / 100;
    const finalRMultiple = riskAmt > 0 ? Math.round((rawPnl / riskAmt) * 100) / 100 : 0;

    let finalStatus: TradeStatus = formData.status || 'WIN';
    if (finalNetPnl > 5) finalStatus = 'WIN';
    else if (finalNetPnl < -5) finalStatus = 'LOSS';
    else if (Math.abs(finalNetPnl) <= 5) finalStatus = 'BE';

    // Infer asset class
    let assetClass: AssetClass = 'CRYPTO';
    if (['EUR/USD', 'GBP/USD', 'USD/JPY', 'GBP/JPY', 'AUD/USD', 'USD/CAD'].includes(pairValue)) {
      assetClass = 'FOREX';
    } else if (['NAS100', 'US30', 'SPX500', 'GER40', 'CAC40', 'DAX40'].includes(pairValue)) {
      assetClass = 'INDICES';
    } else if (['XAU/USD', 'WTI', 'BRENT', 'GOLD', 'SILVER'].includes(pairValue)) {
      assetClass = 'COMMODITIES';
    } else if (['NVDA', 'AAPL', 'TSLA', 'AMZN', 'MSFT', 'META'].includes(pairValue)) {
      assetClass = 'STOCKS';
    }

    const tradeToSave: Trade = {
      id: editTrade ? editTrade.id : `tr-${Date.now()}`,
      ticketNumber: editTrade?.ticketNumber || `#${Math.floor(1000 + Math.random() * 9000)}`,
      account: finalAccount,
      pair: pairValue,
      assetClass: assetClass,
      direction: direction,
      status: finalStatus,
      entryDate: formData.entryDate || new Date().toISOString().split('T')[0],
      entryTime: formData.entryTime || '10:00',
      exitDate: formData.exitDate || formData.entryDate || new Date().toISOString().split('T')[0],
      exitTime: formData.exitTime || '11:00',
      session: (formData.session as TradingSession) || 'New York',
      timeframe: (formData.timeframe as Timeframe) || '5m',
      entryPrice: entryPrice,
      exitPrice: exitPrice,
      stopLoss: stopLoss,
      takeProfit: takeProfit,
      quantity: quantity,
      fees: fees,
      riskAmount: riskAmt,
      pnl: finalNetPnl,
      pnlPercentage: riskAmt > 0 ? Math.round((finalNetPnl / riskAmt) * 100) / 100 : 0,
      rMultiple: finalRMultiple,
      theoreticalRR: liveCalculations.theoreticalRR,
      strategy: '',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6 shadow-2xl space-y-5 my-6 animate-in fade-in zoom-in-95 duration-200">
        
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
              {editTrade ? `Modifier Trade ${editTrade.ticketNumber}` : 'Enregistrer une Position / Trade'}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Formulaire de saisie avec calcul automatique en temps réel du Ratio Risque/Rendement (R:R).
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Fermer la fenêtre"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          
          {/* SECTION 1 : Sélecteur Strict Long / Short & Symbole Actif */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl border border-blue-500/20 bg-blue-950/10">
            
            {/* 1. Sélecteur strict pour le Type de position : "Long" (Achat) ou "Short" (Vente) */}
            <div>
              <label className="block text-zinc-200 font-bold mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm">
                  <Scale className="h-4 w-4 text-blue-400" />
                  Type de Position <span className="text-rose-400">*</span>
                </span>
                <span className="text-[11px] font-mono font-normal text-zinc-400">
                  {formData.direction === 'LONG' ? '🟢 Achat (Haussier)' : '🟣 Vente (Baissier)'}
                </span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  id="trade-position-type-long"
                  onClick={() => setFormData({ ...formData, direction: 'LONG' })}
                  className={`min-h-[48px] rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                    formData.direction === 'LONG'
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-lg shadow-emerald-500/25 font-black'
                      : 'border border-zinc-800 bg-zinc-900/90 text-zinc-400 hover:text-white hover:border-zinc-700'
                  }`}
                >
                  <ArrowUpRight className="h-5 w-5 text-emerald-300" />
                  <span>Long (Achat)</span>
                </button>

                <button
                  type="button"
                  id="trade-position-type-short"
                  onClick={() => setFormData({ ...formData, direction: 'SHORT' })}
                  className={`min-h-[48px] rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                    formData.direction === 'SHORT'
                      ? 'bg-purple-600 text-white ring-2 ring-purple-400 shadow-lg shadow-purple-500/25 font-black'
                      : 'border border-zinc-800 bg-zinc-900/90 text-zinc-400 hover:text-white hover:border-zinc-700'
                  }`}
                >
                  <ArrowDownRight className="h-5 w-5 text-purple-300" />
                  <span>Short (Vente)</span>
                </button>
              </div>
            </div>

            {/* 2. Champ pour le "Symbole / Actif" (ex: BTC/USD, EUR/USD) */}
            <div>
              <label className="block text-zinc-200 font-bold mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm">
                  <BarChart2 className="h-4 w-4 text-blue-400" />
                  Symbole / Actif <span className="text-rose-400">*</span>
                </span>
                <span className="text-[11px] text-zinc-400 font-mono">Ex: BTC/USD, EUR/USD</span>
              </label>
              <div className="space-y-1.5">
                <input
                  type="text"
                  required
                  id="trade-symbol-input"
                  value={formData.pair}
                  onChange={(e) => setFormData({ ...formData, pair: e.target.value.toUpperCase() })}
                  list="pairs-datalist"
                  placeholder="Ex: BTC/USD, EUR/USD, NAS100..."
                  className="min-h-[48px] w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-white font-mono font-bold text-sm sm:text-base placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                />
                <datalist id="pairs-datalist">
                  {COMMON_PAIRS.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>

                {/* Quick Selection Pills for Mobile & Fast Entry */}
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {['BTC/USD', 'ETH/USD', 'EUR/USD', 'GBP/USD', 'NAS100', 'US30', 'XAU/USD'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setFormData({ ...formData, pair: preset })}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-mono transition-all ${
                        formData.pair === preset
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* SECTION 2 : Champs Numériques Obligatoires (Prix d'entrée, SL, TP, Taille) & Calculateur R:R Temps Réel */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-5 space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                  <DollarSign className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                    Paramètres Numériques de la Position
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Entrez vos niveaux pour visualiser instantanément le ratio Risque/Rendement (R:R)
                  </p>
                </div>
              </div>

              {/* Quick Actions to set Exit Price */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-zinc-400 font-medium">Clôturer :</span>
                <button
                  type="button"
                  onClick={() => applyPresetExitPrice('TP')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 text-[11px] font-bold transition-all"
                  title="Définir le prix de sortie égal au Take-Profit"
                >
                  Au TP
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetExitPrice('SL')}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 text-[11px] font-bold transition-all"
                  title="Définir le prix de sortie égal au Stop-Loss"
                >
                  Au SL
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetExitPrice('BE')}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 text-[11px] font-bold transition-all"
                  title="Définir le prix de sortie égal au Prix d'entrée"
                >
                  Au BE
                </button>
              </div>
            </div>

            {/* Invalidation Alert if SL or TP is on the wrong side */}
            {liveCalculations.warningMessage && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-3 flex items-start gap-2.5 text-amber-300 animate-in fade-in">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                <div className="text-xs font-medium">
                  {liveCalculations.warningMessage}
                </div>
              </div>
            )}

            {/* 3. Des champs numériques pour : Prix d'entrée, Stop-Loss (SL), Take-Profit (TP), Taille de position */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
              
              {/* Prix d'Entrée */}
              <div>
                <label className="block text-zinc-300 font-semibold mb-1 flex items-center justify-between">
                  <span>Prix d'Entrée <span className="text-rose-400">*</span></span>
                  <span className="text-[10px] text-blue-400 font-mono font-normal">Niveau Entry</span>
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  id="trade-entry-price"
                  value={formData.entryPrice}
                  onChange={(e) => setFormData({ ...formData, entryPrice: parseFloat(e.target.value) || 0 })}
                  onBlur={recalculateMetrics}
                  className="min-h-[44px] w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-white text-sm font-bold focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Stop-Loss (SL) */}
              <div>
                <label className="block text-rose-300 font-semibold mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Shield className="h-3.5 w-3.5 text-rose-400" />
                    Stop-Loss (SL) <span className="text-rose-400">*</span>
                  </span>
                  <span className="text-[10px] text-rose-400 font-mono font-normal">Invalidation</span>
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  id="trade-stop-loss"
                  value={formData.stopLoss}
                  onChange={(e) => setFormData({ ...formData, stopLoss: parseFloat(e.target.value) || 0 })}
                  onBlur={recalculateMetrics}
                  className={`min-h-[44px] w-full rounded-xl border bg-zinc-950 px-3 py-2 font-mono text-rose-400 text-sm font-bold focus:outline-none ${
                    !liveCalculations.isSlValid ? 'border-rose-500 ring-1 ring-rose-500' : 'border-zinc-800 focus:border-rose-500'
                  }`}
                />
              </div>

              {/* Take-Profit (TP) */}
              <div>
                <label className="block text-emerald-300 font-semibold mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Target className="h-3.5 w-3.5 text-emerald-400" />
                    Take-Profit (TP) <span className="text-rose-400">*</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono font-normal">Objectif</span>
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  id="trade-take-profit"
                  value={formData.takeProfit}
                  onChange={(e) => setFormData({ ...formData, takeProfit: parseFloat(e.target.value) || 0 })}
                  onBlur={recalculateMetrics}
                  className={`min-h-[44px] w-full rounded-xl border bg-zinc-950 px-3 py-2 font-mono text-emerald-400 text-sm font-bold focus:outline-none ${
                    !liveCalculations.isTpValid ? 'border-rose-500 ring-1 ring-rose-500' : 'border-zinc-800 focus:border-emerald-500'
                  }`}
                />
              </div>

              {/* Taille de Position (Lots / Unités) */}
              <div>
                <label className="block text-zinc-300 font-semibold mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5 text-amber-400" />
                    Taille Position <span className="text-rose-400">*</span>
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono font-normal">Lots / Unités</span>
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  id="trade-quantity"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                  onBlur={recalculateMetrics}
                  className="min-h-[44px] w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-white text-sm font-bold focus:border-blue-500 focus:outline-none"
                />
              </div>

            </div>

            {/* 4. CALCUL AUTOMATIQUE EN TEMPS RÉEL DU RATIO RISQUE / RENDEMENT (R:R THÉORIQUE) */}
            <div className="rounded-2xl border border-zinc-700/80 bg-zinc-950 p-4 shadow-xl space-y-3 font-mono">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                <span className="text-xs font-bold text-zinc-300 flex items-center gap-2">
                  <Scale className="h-4 w-4 text-blue-400" />
                  <span>Calcul Automatique en Temps Réel : Ratio Risque / Rendement</span>
                </span>
                <span className="text-[11px] text-zinc-400">
                  Calculé instantanément avant validation
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                
                {/* Badge Ratio R:R Théorique */}
                <div className="rounded-xl border border-blue-500/30 bg-blue-950/25 p-3 flex flex-col justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-blue-300 font-semibold block">
                    Ratio R:R Théorique
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className={`text-xl sm:text-2xl font-black ${
                      liveCalculations.theoreticalRR >= 2 
                        ? 'text-emerald-400' 
                        : liveCalculations.theoreticalRR >= 1.5 
                        ? 'text-blue-400' 
                        : liveCalculations.theoreticalRR >= 1 
                        ? 'text-amber-400' 
                        : 'text-rose-400'
                    }`}>
                      {liveCalculations.theoreticalRR > 0 ? `1 : ${liveCalculations.theoreticalRR.toFixed(2)}` : 'N/A'}
                    </span>
                    {liveCalculations.theoreticalRR > 0 && (
                      <span className="text-xs text-zinc-400">R</span>
                    )}
                  </div>
                </div>

                {/* Risque Théorique au SL */}
                <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3 flex flex-col justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-rose-300 font-semibold block">
                    Risque Max au SL
                  </span>
                  <div className="mt-1">
                    <span className="text-lg sm:text-xl font-bold text-rose-400 block">
                      {liveCalculations.plannedRiskAmount > 0 ? `-${formatCurrency(liveCalculations.plannedRiskAmount, currency)}` : '0.00'}
                    </span>
                    <span className="text-[10px] text-zinc-400 block">
                      {liveCalculations.riskPoints > 0 ? `${liveCalculations.riskPoints} pts de distance` : ''}
                    </span>
                  </div>
                </div>

                {/* Gain Théorique au TP */}
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 flex flex-col justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-semibold block">
                    Gain Potentiel au TP
                  </span>
                  <div className="mt-1">
                    <span className="text-lg sm:text-xl font-bold text-emerald-400 block">
                      {liveCalculations.plannedRewardAmount > 0 ? `+${formatCurrency(liveCalculations.plannedRewardAmount, currency)}` : '0.00'}
                    </span>
                    <span className="text-[10px] text-zinc-400 block">
                      {liveCalculations.rewardPoints > 0 ? `${liveCalculations.rewardPoints} pts d'objectif` : ''}
                    </span>
                  </div>
                </div>

                {/* P&L Réalisé (Selon Prix de Sortie) */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3 flex flex-col justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold block">
                    P&L Net Réalisé
                  </span>
                  <div className="mt-1">
                    <span className={`text-lg sm:text-xl font-bold block ${
                      liveCalculations.netRealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {formatCurrency(liveCalculations.netRealizedPnl, currency, true)}
                    </span>
                    <span className="text-[10px] text-blue-400 block">
                      {formatRMultiple(liveCalculations.realizedR)}
                    </span>
                  </div>
                </div>

              </div>

              {/* Extra row for Exit Price & Fees */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-800/80">
                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1">Prix de Sortie Réalisé</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.exitPrice}
                    onChange={(e) => setFormData({ ...formData, exitPrice: parseFloat(e.target.value) || 0 })}
                    onBlur={recalculateMetrics}
                    className="min-h-[38px] w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1">Frais / Comm. ({currency})</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.fees}
                    onChange={(e) => setFormData({ ...formData, fees: parseFloat(e.target.value) || 0 })}
                    onBlur={recalculateMetrics}
                    className="min-h-[38px] w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-zinc-300 font-mono text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1">Statut Résultat</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as TradeStatus })}
                    className="min-h-[38px] w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-zinc-200 font-mono text-xs focus:border-blue-500 focus:outline-none font-bold"
                  >
                    <option value="WIN">🟢 WIN (Gagnant)</option>
                    <option value="LOSS">🔴 LOSS (Perdant)</option>
                    <option value="BE">🟡 BE (Break-Even)</option>
                    <option value="OPEN">🔵 OPEN (En cours)</option>
                  </select>
                </div>
              </div>

            </div>

          </div>

          {/* SECTION 3 : Date, Heure, Compte & Session */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            
            {/* Compte Sélectionné */}
            <div>
              <label className="block text-zinc-300 font-medium mb-1 flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5 text-emerald-400" />
                Compte <span className="text-rose-400">*</span>
              </label>
              {!isCustomAccount ? (
                <select
                  value={formData.account}
                  onChange={(e) => {
                    if (e.target.value === '__CUSTOM__') {
                      setIsCustomAccount(true);
                    } else {
                      setFormData({ ...formData, account: e.target.value });
                    }
                  }}
                  className="min-h-[42px] w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 font-medium focus:border-blue-500 focus:outline-none"
                >
                  {availableAccountNames.map((acc) => (
                    <option key={acc} value={acc}>{acc}</option>
                  ))}
                  <option value="__CUSTOM__">+ Nouveau compte...</option>
                </select>
              ) : (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    required
                    value={customAccountInput}
                    onChange={(e) => setCustomAccountInput(e.target.value)}
                    placeholder="Nom du compte..."
                    className="min-h-[42px] w-full rounded-xl border border-blue-500/50 bg-zinc-900 px-3 py-2 text-white font-medium focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setIsCustomAccount(false)}
                    className="px-2.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            {/* Session de Trading */}
            <div>
              <label className="block text-zinc-300 font-medium mb-1 flex items-center gap-1">
                <Globe className="h-3.5 w-3.5 text-blue-400" />
                Session <span className="text-rose-400">*</span>
              </label>
              <select
                value={formData.session}
                onChange={(e) => setFormData({ ...formData, session: e.target.value as TradingSession })}
                className="min-h-[42px] w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 font-medium focus:border-blue-500 focus:outline-none"
              >
                <option value="London">Londres</option>
                <option value="New York">New York</option>
                <option value="Asian">Asiatique</option>
                <option value="Overlap">Overlap</option>
              </select>
            </div>

            {/* Date */}
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
                className="min-h-[42px] w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Heure */}
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
                className="min-h-[42px] w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

          </div>

          {/* SECTION 4 : Captures Graphiques Avant / Après (Ctrl+V supporté) */}
          <div className="rounded-xl border border-blue-500/20 bg-blue-950/10 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-blue-400" />
                <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                  Captures Graphiques (Avant / Après)
                </h3>
              </div>
              <span className="text-[11px] text-blue-300/80 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md flex items-center gap-1 font-mono">
                <ClipboardPaste className="h-3 w-3" />
                Coller direct actif (Ctrl+V)
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
                    Capture "Après Trade" (Sortie / Résultat)
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

          {/* SECTION 5 : Indicateurs & Psychologie */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-zinc-400 font-medium mb-1 flex items-center gap-1">
                <Activity className="h-3.5 w-3.5 text-blue-400" />
                Indicateurs Clés
              </label>
              <div className="flex flex-wrap gap-1">
                {POPULAR_INDICATORS.slice(0, 8).map((ind) => {
                  const isSelected = formData.indicators?.includes(ind);
                  return (
                    <button
                      key={ind}
                      type="button"
                      onClick={() => toggleIndicator(ind)}
                      className={`text-[11px] px-2 py-0.5 rounded-md border font-medium transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/20 text-blue-300 font-bold'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '}{ind}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 font-medium mb-1">Discipline & Psychologie</label>
              <select
                value={formData.emotions}
                onChange={(e) => setFormData({ ...formData, emotions: e.target.value as any })}
                className="min-h-[42px] w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 focus:border-blue-500 focus:outline-none font-mono"
              >
                <option value="DISCIPLINED">🟢 DISCIPLINED (Plan respecté à 100%)</option>
                <option value="CALM">🔵 CALM (Serein & Lucide)</option>
                <option value="ANXIOUS">🟡 ANXIOUS (Stressé / Précipité)</option>
                <option value="GREEDY">🟠 GREEDY (Gourmand / Trop levier)</option>
                <option value="REVENGE">🔴 REVENGE (Trade de vengeance)</option>
                <option value="FATIGUED">🟣 FATIGUED (Fatigue session)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-zinc-400 font-medium mb-1">Notes & Débriefing de la position</label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Raison d'entrée, contexte technique, confluences et ressenti..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-zinc-200 placeholder-zinc-500 focus:border-blue-500 focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Boutons d'Action (Thumb-Friendly) */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 border-t border-zinc-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-2.5 text-xs sm:text-sm text-zinc-300 hover:text-white font-semibold transition-all active:scale-[0.98]"
            >
              Annuler
            </button>
            <button
              type="submit"
              id="submit-trade-button"
              className="min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 active:scale-[0.98] transition-all"
            >
              <Save className="h-4 w-4" />
              <span>{editTrade ? 'Mettre à jour le Trade' : 'Enregistrer le Trade'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

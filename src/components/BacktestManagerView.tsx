import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  createChart, 
  ColorType, 
  CrosshairMode, 
  IChartApi, 
  ISeriesApi,
  CandlestickData,
  UTCTimestamp,
  CandlestickSeries
} from 'lightweight-charts';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  RotateCcw, 
  Sliders, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Zap, 
  Target, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Layers, 
  Clock, 
  BarChart2, 
  Sparkles, 
  ChevronRight,
  Maximize2,
  Minimize2,
  RefreshCw,
  Plus,
  Trash2,
  Save,
  ArrowRight,
  Info,
  SlidersHorizontal,
  Smartphone
} from 'lucide-react';
import { 
  generateRealisticHistoricalData, 
  AssetSymbol, 
  ASSET_CONFIGS, 
  TIMEFRAMES, 
  BacktestTimeframe, 
  CandlestickPoint 
} from '../utils/backtestDataGenerator';
import { Trade, CurrencySymbol } from '../types';
import { formatCurrency } from '../utils/calculations';

interface BacktestTrade {
  id: string;
  asset: AssetSymbol;
  timeframe: BacktestTimeframe;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  entryTime: number;
  exitTime?: number;
  exitPrice?: number;
  status: 'OPEN' | 'WIN' | 'LOSS' | 'BE';
  pnl: number;
  rMultiple: number;
  riskAmount: number;
  notes?: string;
}

interface BacktestManagerViewProps {
  currency: CurrencySymbol;
  onSaveTradeToJournal?: (trade: Partial<Trade>) => void;
}

export const BacktestManagerView: React.FC<BacktestManagerViewProps> = ({
  currency,
  onSaveTradeToJournal,
}) => {
  // Chart and replay configuration
  const [selectedAsset, setSelectedAsset] = useState<AssetSymbol>('EUR/USD');
  const [selectedTimeframe, setSelectedTimeframe] = useState<BacktestTimeframe>('5m');
  const [replayIndex, setReplayIndex] = useState<number>(120); // Current visible candle index in active timeframe
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeedMs, setPlaybackSpeedMs] = useState<number>(500); // ms per candle
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  // Synchronized historical datasets
  const [historicalData, setHistoricalData] = useState(() => 
    generateRealisticHistoricalData('EUR/USD', 600)
  );

  // Chart refs
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const playIntervalRef = useRef<any>(null);

  // Simulated Trading State
  const [simulatedBalance, setSimulatedBalance] = useState<number>(25000);
  const [riskPerTrade, setRiskPerTrade] = useState<number>(250); // 1% of 25k
  const [tradeDirection, setTradeDirection] = useState<'LONG' | 'SHORT'>('LONG');
  const [customStopLoss, setCustomStopLoss] = useState<string>('');
  const [customTakeProfit, setCustomTakeProfit] = useState<string>('');
  const [activeTrades, setActiveTrades] = useState<BacktestTrade[]>([]);
  const [closedTrades, setClosedTrades] = useState<BacktestTrade[]>([]);
  const [lastNotification, setLastNotification] = useState<{ message: string; type: 'win' | 'loss' | 'info' } | null>(null);
  const [savedTradeSuccess, setSavedTradeSuccess] = useState<string | null>(null);

  // Get current asset config
  const assetConfig = ASSET_CONFIGS[selectedAsset];

  // Current timeframe's full candle series
  const fullCandles = useMemo(() => {
    return historicalData.timeframeMap[selectedTimeframe] || [];
  }, [historicalData, selectedTimeframe]);

  // Ensure replayIndex is within bounds
  const clampedReplayIndex = Math.min(Math.max(10, replayIndex), fullCandles.length);

  // Sliced candles visible up to replayIndex
  const visibleCandles = useMemo(() => {
    return fullCandles.slice(0, clampedReplayIndex);
  }, [fullCandles, clampedReplayIndex]);

  // Current active candle and timestamp
  const currentCandle = visibleCandles[visibleCandles.length - 1] || fullCandles[0];
  const currentPrice = currentCandle ? currentCandle.close : assetConfig.basePrice;
  const currentTimestamp = currentCandle ? currentCandle.time : 0;

  // Auto calculate default SL/TP when price changes or direction toggles
  useEffect(() => {
    if (!currentCandle) return;
    const p = currentCandle.close;
    const defaultOffset = assetConfig.volatility * 3;
    const factor = Math.pow(10, assetConfig.precision);
    const roundP = (val: number) => Math.round(val * factor) / factor;

    if (tradeDirection === 'LONG') {
      setCustomStopLoss(roundP(p - defaultOffset).toString());
      setCustomTakeProfit(roundP(p + (defaultOffset * 2)).toString()); // 1:2 RR
    } else {
      setCustomStopLoss(roundP(p + defaultOffset).toString());
      setCustomTakeProfit(roundP(p - (defaultOffset * 2)).toString()); // 1:2 RR
    }
  }, [currentCandle?.close, tradeDirection, selectedAsset]);

  // Regenerate data when asset changes
  const handleAssetChange = (newAsset: AssetSymbol) => {
    setSelectedAsset(newAsset);
    const newData = generateRealisticHistoricalData(newAsset, 600);
    setHistoricalData(newData);
    setReplayIndex(120);
    setIsPlaying(false);
    setActiveTrades([]);
  };

  // Switch timeframe with strict Time Synchronization
  const handleTimeframeChange = (newTf: BacktestTimeframe) => {
    if (newTf === selectedTimeframe) return;

    // Time-based synchronization: find corresponding index in new timeframe
    const targetTime = currentTimestamp;
    const newCandles = historicalData.timeframeMap[newTf] || [];
    
    // Find index matching targetTime
    let targetIndex = newCandles.findIndex(c => c.time >= targetTime);
    if (targetIndex === -1) {
      targetIndex = newCandles.length - 1;
    }
    targetIndex = Math.max(10, Math.min(targetIndex + 1, newCandles.length));

    setSelectedTimeframe(newTf);
    setReplayIndex(targetIndex);
  };

  // Initialize and update Lightweight Charts
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clean up existing chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
    }

    const container = chartContainerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth,
      height: isFullScreen ? window.innerHeight - 160 : 500,
      layout: {
        background: { type: ColorType.Solid, color: '#090d16' },
        textColor: '#94a3b8',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: 12,
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.45)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.45)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#3b82f6',
          width: 1,
          style: 3, // dashed
          labelBackgroundColor: '#1e293b',
        },
        horzLine: {
          color: '#3b82f6',
          width: 1,
          style: 3,
          labelBackgroundColor: '#1e293b',
        },
      },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 10,
        minBarSpacing: 3,
        rightOffset: 12,
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        autoScale: true,
        scaleMargins: {
          top: 0.12,
          bottom: 0.12,
        },
      },
      // iPhone / Touch gestures optimization
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    chartInstanceRef.current = chart;

    // Add Candlestick Series
    let series: ISeriesApi<'Candlestick'>;
    if (typeof (chart as any).addCandlestickSeries === 'function') {
      series = (chart as any).addCandlestickSeries({
        upColor: '#10b981',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
      });
    } else {
      series = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
      });
    }

    candlestickSeriesRef.current = series;

    // Load visible data
    const chartFormattedData: CandlestickData[] = visibleCandles.map(c => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    series.setData(chartFormattedData);
    if (typeof (chart.timeScale() as any).scrollToRealTime === 'function') {
      (chart.timeScale() as any).scrollToRealTime();
    } else {
      chart.timeScale().fitContent();
    }

    // Handle container resize
    const resizeObserver = new ResizeObserver(entries => {
      if (!entries || entries.length === 0 || !chartInstanceRef.current) return;
      const { width, height } = entries[0].contentRect;
      chartInstanceRef.current.applyOptions({
        width: Math.max(300, width),
        height: isFullScreen ? window.innerHeight - 160 : Math.max(380, height || 500),
      });
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }
    };
  }, [selectedAsset, isFullScreen]); // reinit on asset or fullscreen toggle

  // Update chart data whenever visibleCandles changes
  useEffect(() => {
    if (!candlestickSeriesRef.current || visibleCandles.length === 0) return;

    const chartFormattedData: CandlestickData[] = visibleCandles.map(c => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    candlestickSeriesRef.current.setData(chartFormattedData);

    // Keep chart scrolled to the rightmost candle
    if (chartInstanceRef.current) {
      if (typeof (chartInstanceRef.current.timeScale() as any).scrollToRealTime === 'function') {
        (chartInstanceRef.current.timeScale() as any).scrollToRealTime();
      }
    }

    // Check Simulated Active Trades for SL / TP hits on new candle
    checkActiveTradesExecution(currentCandle);
  }, [visibleCandles]);

  // Check and resolve simulated trades when price moves
  const checkActiveTradesExecution = (candle: CandlestickPoint) => {
    if (!candle || activeTrades.length === 0) return;

    const remainingActive: BacktestTrade[] = [];
    const newClosed: BacktestTrade[] = [];

    activeTrades.forEach(trade => {
      let isClosed = false;
      let status: 'WIN' | 'LOSS' | 'BE' = 'BE';
      let exitPrice = candle.close;
      let pnl = 0;
      let rMultiple = 0;

      const riskDist = Math.abs(trade.entryPrice - trade.stopLoss);
      const rewardDist = Math.abs(trade.takeProfit - trade.entryPrice);
      const plannedRR = riskDist > 0 ? rewardDist / riskDist : 2;

      if (trade.direction === 'LONG') {
        // Long check: SL hit (Low <= SL) or TP hit (High >= TP)
        if (candle.low <= trade.stopLoss) {
          isClosed = true;
          status = 'LOSS';
          exitPrice = trade.stopLoss;
          pnl = -trade.riskAmount;
          rMultiple = -1.0;
          setLastNotification({
            message: `🛑 Stop Loss touché sur ${trade.asset} LONG à ${exitPrice} (-1.00R / ${formatCurrency(-trade.riskAmount, currency)})`,
            type: 'loss',
          });
        } else if (candle.high >= trade.takeProfit) {
          isClosed = true;
          status = 'WIN';
          exitPrice = trade.takeProfit;
          pnl = trade.riskAmount * plannedRR;
          rMultiple = Number(plannedRR.toFixed(2));
          setLastNotification({
            message: `🎯 Take Profit atteint sur ${trade.asset} LONG à ${exitPrice} (+${rMultiple}R / ${formatCurrency(pnl, currency)})`,
            type: 'win',
          });
        }
      } else {
        // Short check: SL hit (High >= SL) or TP hit (Low <= TP)
        if (candle.high >= trade.stopLoss) {
          isClosed = true;
          status = 'LOSS';
          exitPrice = trade.stopLoss;
          pnl = -trade.riskAmount;
          rMultiple = -1.0;
          setLastNotification({
            message: `🛑 Stop Loss touché sur ${trade.asset} SHORT à ${exitPrice} (-1.00R / ${formatCurrency(-trade.riskAmount, currency)})`,
            type: 'loss',
          });
        } else if (candle.low <= trade.takeProfit) {
          isClosed = true;
          status = 'WIN';
          exitPrice = trade.takeProfit;
          pnl = trade.riskAmount * plannedRR;
          rMultiple = Number(plannedRR.toFixed(2));
          setLastNotification({
            message: `🎯 Take Profit atteint sur ${trade.asset} SHORT à ${exitPrice} (+${rMultiple}R / ${formatCurrency(pnl, currency)})`,
            type: 'win',
          });
        }
      }

      if (isClosed) {
        const finalizedTrade: BacktestTrade = {
          ...trade,
          status,
          exitTime: candle.time,
          exitPrice,
          pnl,
          rMultiple,
        };
        newClosed.push(finalizedTrade);
        setSimulatedBalance(prev => prev + pnl);
      } else {
        remainingActive.push(trade);
      }
    });

    if (newClosed.length > 0) {
      setActiveTrades(remainingActive);
      setClosedTrades(prev => [...newClosed, ...prev]);
    }
  };

  // Replay Step Forward ("Bougie suivante")
  const handleStepForward = useCallback(() => {
    if (replayIndex < fullCandles.length) {
      setReplayIndex(prev => prev + 1);
    } else {
      setIsPlaying(false);
    }
  }, [replayIndex, fullCandles.length]);

  // Replay Step Backward ("Bougie précédente")
  const handleStepBackward = useCallback(() => {
    if (replayIndex > 10) {
      setReplayIndex(prev => prev - 1);
    }
  }, [replayIndex]);

  // Reset Replay to initial point
  const handleResetReplay = () => {
    setIsPlaying(false);
    setReplayIndex(100);
  };

  // Jump to specific point via slider
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setReplayIndex(val);
  };

  // Auto-play Loop (Interval)
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setReplayIndex(prev => {
          if (prev >= fullCandles.length) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playbackSpeedMs);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeedMs, fullCandles.length]);

  // Keyboard Navigation: Right arrow -> next candle, Space -> Play/Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ignore if typing in input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowRight' || e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        handleStepForward();
      } else if (e.key === 'ArrowLeft' || e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        handleStepBackward();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStepForward, handleStepBackward]);

  // Place a Simulated Order
  const handlePlaceOrder = () => {
    const sl = parseFloat(customStopLoss);
    const tp = parseFloat(customTakeProfit);
    const p = currentPrice;

    if (isNaN(sl) || isNaN(tp) || sl <= 0 || tp <= 0) {
      setLastNotification({
        message: "Veuillez spécifier des niveaux de Stop Loss et Take Profit valides.",
        type: 'info',
      });
      return;
    }

    // Validation
    if (tradeDirection === 'LONG' && (sl >= p || tp <= p)) {
      setLastNotification({
        message: "Pour un LONG : le Stop Loss doit être inférieur et le Take Profit supérieur au prix d'entrée.",
        type: 'info',
      });
      return;
    }
    if (tradeDirection === 'SHORT' && (sl <= p || tp >= p)) {
      setLastNotification({
        message: "Pour un SHORT : le Stop Loss doit être supérieur et le Take Profit inférieur au prix d'entrée.",
        type: 'info',
      });
      return;
    }

    const riskDist = Math.abs(p - sl);
    const rewardDist = Math.abs(tp - p);
    const calculatedRR = riskDist > 0 ? (rewardDist / riskDist).toFixed(2) : '2.00';

    const newTrade: BacktestTrade = {
      id: `bt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      asset: selectedAsset,
      timeframe: selectedTimeframe,
      direction: tradeDirection,
      entryPrice: p,
      stopLoss: sl,
      takeProfit: tp,
      entryTime: currentTimestamp,
      status: 'OPEN',
      pnl: 0,
      rMultiple: 0,
      riskAmount: riskPerTrade,
      notes: `Backtest ${selectedAsset} ${selectedTimeframe} (R:R 1:${calculatedRR})`,
    };

    setActiveTrades(prev => [newTrade, ...prev]);
    setLastNotification({
      message: `⚡ Ordre ${tradeDirection} exécuté à ${p} (SL: ${sl}, TP: ${tp}, Risque: ${formatCurrency(riskPerTrade, currency)})`,
      type: 'info',
    });
  };

  // Close trade manually at market
  const handleManualClose = (tradeId: string) => {
    const trade = activeTrades.find(t => t.id === tradeId);
    if (!trade) return;

    const exitPrice = currentPrice;
    let pnl = 0;
    let rMultiple = 0;
    const riskDist = Math.abs(trade.entryPrice - trade.stopLoss);

    if (trade.direction === 'LONG') {
      const gain = exitPrice - trade.entryPrice;
      rMultiple = riskDist > 0 ? gain / riskDist : 0;
    } else {
      const gain = trade.entryPrice - exitPrice;
      rMultiple = riskDist > 0 ? gain / riskDist : 0;
    }

    pnl = trade.riskAmount * rMultiple;
    const status = pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'BE';

    const finalized: BacktestTrade = {
      ...trade,
      status,
      exitPrice,
      exitTime: currentTimestamp,
      pnl,
      rMultiple: Number(rMultiple.toFixed(2)),
    };

    setActiveTrades(prev => prev.filter(t => t.id !== tradeId));
    setClosedTrades(prev => [finalized, ...prev]);
    setSimulatedBalance(prev => prev + pnl);

    setLastNotification({
      message: `Position clôturée manuellement à ${exitPrice} (${rMultiple >= 0 ? '+' : ''}${rMultiple.toFixed(2)}R)`,
      type: rMultiple >= 0 ? 'win' : 'loss',
    });
  };

  // Export Backtest trade to Main Journal
  const handleExportToMainJournal = (trade: BacktestTrade) => {
    if (!onSaveTradeToJournal) return;

    const entryDateStr = new Date(trade.entryTime * 1000).toISOString().split('T')[0];
    const exitDateStr = trade.exitTime ? new Date(trade.exitTime * 1000).toISOString().split('T')[0] : entryDateStr;

    onSaveTradeToJournal({
      pair: trade.asset,
      direction: trade.direction,
      status: trade.status === 'OPEN' ? 'BE' : trade.status,
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice || trade.entryPrice,
      stopLoss: trade.stopLoss,
      takeProfit: trade.takeProfit,
      pnl: trade.pnl,
      rMultiple: trade.rMultiple,
      timeframe: trade.timeframe as any,
      entryDate: entryDateStr,
      exitDate: exitDateStr,
      notes: `[Session Backtest Replay] ${trade.notes || ''}`,
      strategy: 'Backtest Setup',
    });

    setSavedTradeSuccess(trade.id);
    setTimeout(() => setSavedTradeSuccess(null), 3000);
  };

  // Backtest Session Statistics
  const stats = useMemo(() => {
    const total = closedTrades.length;
    const wins = closedTrades.filter(t => t.status === 'WIN').length;
    const losses = closedTrades.filter(t => t.status === 'LOSS').length;
    const be = closedTrades.filter(t => t.status === 'BE').length;
    const totalPnl = closedTrades.reduce((acc, t) => acc + t.pnl, 0);
    const totalR = closedTrades.reduce((acc, t) => acc + t.rMultiple, 0);
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0';

    const grossGain = closedTrades.filter(t => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0);
    const grossLoss = Math.abs(closedTrades.filter(t => t.pnl < 0).reduce((acc, t) => acc + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? (grossGain / grossLoss).toFixed(2) : grossGain > 0 ? 'Max' : '0.00';

    return { total, wins, losses, be, totalPnl, totalR, winRate, profitFactor };
  }, [closedTrades]);

  // Formatted date of current candle
  const formattedCurrentDate = useMemo(() => {
    if (!currentTimestamp) return '';
    return new Date(currentTimestamp * 1000).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [currentTimestamp]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* Top Banner & Asset / Timeframe Controls */}
      <div className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 p-4 sm:p-5 shadow-2xl space-y-4">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/25 ring-2 ring-blue-400/40">
              <BarChart2 className="h-6 w-6 text-white" />
              <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 ring-2 ring-zinc-950">
                <Zap className="h-2.5 w-2.5 text-zinc-950" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-white font-sans tracking-tight">
                  Backtest Manager
                </h1>
                <span className="rounded-md border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider text-blue-400 uppercase">
                  TradingView Lightweight Charts v5
                </span>
                <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300 flex items-center gap-1">
                  <Smartphone className="h-3 w-3" />
                  iPhone & Touch Ready
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Simulateur de marché réaliste • Replay bougie par bougie • Synchronisation multi-timeframe
              </p>
            </div>
          </div>

          {/* Session Overview Stats Widget */}
          <div className="flex items-center gap-3 bg-zinc-950/80 border border-zinc-800/80 px-4 py-2.5 rounded-2xl flex-wrap">
            <div>
              <span className="text-[10px] uppercase font-mono text-zinc-400 block">P&L Session</span>
              <span className={`text-sm font-bold font-mono ${stats.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatCurrency(stats.totalPnl, currency, true)} ({stats.totalR >= 0 ? '+' : ''}{stats.totalR.toFixed(2)}R)
              </span>
            </div>
            <div className="h-7 w-px bg-zinc-800" />
            <div>
              <span className="text-[10px] uppercase font-mono text-zinc-400 block">Win Rate</span>
              <span className="text-sm font-bold font-mono text-white">
                {stats.winRate}% <span className="text-[10px] text-zinc-400">({stats.wins}W / {stats.losses}L)</span>
              </span>
            </div>
            <div className="h-7 w-px bg-zinc-800" />
            <div>
              <span className="text-[10px] uppercase font-mono text-zinc-400 block">Capital Simulé</span>
              <span className="text-sm font-bold font-mono text-blue-400">
                {formatCurrency(simulatedBalance, currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Asset & Timeframe Selection Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-zinc-800/80">
          
          {/* Asset Selector */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <span className="text-xs font-mono text-zinc-400 font-semibold uppercase shrink-0">Actif :</span>
            {(Object.keys(ASSET_CONFIGS) as AssetSymbol[]).map(asset => (
              <button
                key={asset}
                onClick={() => handleAssetChange(asset)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold font-mono transition-all whitespace-nowrap cursor-pointer ${
                  selectedAsset === asset
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-400/50'
                    : 'bg-zinc-950 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                {asset}
              </button>
            ))}
          </div>

          {/* Timeframe Selector (Synchronized) */}
          <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800 shrink-0">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.id}
                onClick={() => handleTimeframeChange(tf.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedTimeframe === tf.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
                title={`Synchroniser sur l'Unité de Temps ${tf.label}`}
              >
                {tf.id}
              </button>
            ))}
          </div>

        </div>

      </div>

      {/* Notification / Trade Execution Toast */}
      {lastNotification && (
        <div className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 transition-all animate-in fade-in ${
          lastNotification.type === 'win' 
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 shadow-lg shadow-emerald-950/30' 
            : lastNotification.type === 'loss'
            ? 'bg-rose-950/40 border-rose-500/40 text-rose-300 shadow-lg shadow-rose-950/30'
            : 'bg-blue-950/40 border-blue-500/40 text-blue-300 shadow-lg shadow-blue-950/30'
        }`}>
          <div className="flex items-center gap-2">
            {lastNotification.type === 'win' ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> :
             lastNotification.type === 'loss' ? <XCircle className="h-4 w-4 text-rose-400 shrink-0" /> :
             <Info className="h-4 w-4 text-blue-400 shrink-0" />}
            <span className="font-semibold">{lastNotification.message}</span>
          </div>
          <button
            onClick={() => setLastNotification(null)}
            className="text-zinc-400 hover:text-white text-xs px-2 py-0.5 rounded hover:bg-zinc-800"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Main Backtest Workspace: TradingView Chart + Controls + Order Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        
        {/* Left 3 Cols: TradingView Candlestick Chart & Replay Bar */}
        <div className="lg:col-span-3 space-y-3">
          
          {/* Chart Container Card */}
          <div className={`relative rounded-3xl border border-zinc-800 bg-[#090d16] p-3 sm:p-4 shadow-2xl overflow-hidden transition-all ${
            isFullScreen ? 'fixed inset-0 z-50 rounded-none p-4 bg-[#090d16]' : ''
          }`}>
            
            {/* Chart Top Header: Asset / Price / OHLC / Date */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-850 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-white text-sm font-mono tracking-wide">
                  {selectedAsset}
                </span>
                <span className="px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-300 font-mono text-[11px]">
                  {selectedTimeframe}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className={`font-mono font-bold text-sm ${
                    currentCandle && currentCandle.close >= currentCandle.open ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {currentPrice.toFixed(assetConfig.precision)}
                  </span>
                </div>
              </div>

              {/* Current Candle OHLC */}
              {currentCandle && (
                <div className="hidden sm:flex items-center gap-2.5 font-mono text-[11px] text-zinc-400">
                  <span>O: <strong className="text-zinc-200">{currentCandle.open}</strong></span>
                  <span>H: <strong className="text-emerald-400">{currentCandle.high}</strong></span>
                  <span>L: <strong className="text-rose-400">{currentCandle.low}</strong></span>
                  <span>C: <strong className="text-zinc-200">{currentCandle.close}</strong></span>
                </div>
              )}

              {/* Fullscreen Toggle */}
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all ml-auto"
                title={isFullScreen ? "Quitter le plein écran" : "Plein écran"}
              >
                {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>

            {/* TradingView Lightweight Charts DOM Mount Point */}
            <div 
              ref={chartContainerRef} 
              className="w-full relative touch-pan-x touch-pan-y"
              style={{ minHeight: isFullScreen ? 'calc(100vh - 200px)' : '480px' }}
            />

            {/* Active Position Overlays on Chart */}
            {activeTrades.length > 0 && (
              <div className="absolute top-16 left-6 z-10 space-y-2 pointer-events-none">
                {activeTrades.map(trade => {
                  const gainPips = trade.direction === 'LONG'
                    ? (currentPrice - trade.entryPrice)
                    : (trade.entryPrice - currentPrice);
                  const isProfit = gainPips >= 0;

                  return (
                    <div 
                      key={trade.id}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-mono backdrop-blur-md shadow-xl flex items-center gap-2 ${
                        isProfit 
                          ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300' 
                          : 'bg-rose-950/80 border-rose-500/50 text-rose-300'
                      }`}
                    >
                      <span className="font-bold">{trade.direction}</span>
                      <span>@{trade.entryPrice}</span>
                      <span>(SL: {trade.stopLoss} | TP: {trade.takeProfit})</span>
                      <span className="font-bold">
                        {isProfit ? '+' : ''}{(gainPips / (Math.abs(trade.entryPrice - trade.stopLoss) || 1)).toFixed(2)}R
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

          </div>

          {/* BARRE DE CONTRÔLE DU MODE REPLAY (THE HERO COMPONENT) */}
          <div className="rounded-3xl border border-blue-500/30 bg-zinc-900/90 p-4 sm:p-5 shadow-2xl backdrop-blur-xl space-y-3.5">
            
            {/* Top row of Replay Bar: Timestamp & Progress */}
            <div className="flex items-center justify-between text-xs border-b border-zinc-800 pb-2.5">
              <div className="flex items-center gap-2 text-zinc-300">
                <Clock className="h-3.5 w-3.5 text-blue-400" />
                <span>Date de la bougie active :</span>
                <strong className="font-mono text-white text-xs">{formattedCurrentDate}</strong>
              </div>

              <div className="flex items-center gap-2 font-mono text-zinc-400 text-xs">
                <span>Bougie :</span>
                <strong className="text-blue-400">{clampedReplayIndex}</strong>
                <span>/ {fullCandles.length}</span>
                <span className="text-[10px] text-zinc-400">
                  ({Math.round((clampedReplayIndex / fullCandles.length) * 100)}%)
                </span>
              </div>
            </div>

            {/* Middle row: Main Replay Control Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              
              {/* Left group: Navigation buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                
                {/* Reset button */}
                <button
                  onClick={handleResetReplay}
                  className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-300 hover:text-white hover:bg-zinc-850 transition-all cursor-pointer"
                  title="Revenir au point de départ"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>

                {/* Step Backward */}
                <button
                  onClick={handleStepBackward}
                  disabled={replayIndex <= 10}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-850 transition-all disabled:opacity-40 cursor-pointer"
                  title="Bougie précédente (Touche Gauche)"
                >
                  <SkipBack className="h-4 w-4 text-zinc-400" />
                  <span className="hidden sm:inline">Précédente</span>
                </button>

                {/* Play / Pause Toggle */}
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-lg cursor-pointer ${
                    isPlaying 
                      ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30' 
                      : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  }`}
                  title="Lecture / Pause automatique (Barre Espace)"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  <span>{isPlaying ? 'Pause' : 'Lecture Auto'}</span>
                </button>

                {/* HERO BUTTON: "Bougie suivante" */}
                <button
                  onClick={handleStepForward}
                  disabled={replayIndex >= fullCandles.length}
                  id="btn-next-candle"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-bold text-white shadow-xl shadow-blue-600/35 hover:shadow-blue-500/45 transition-all active:scale-[0.97] cursor-pointer disabled:opacity-40"
                  title="Avancer d'une bougie (Touche Droite ou N)"
                >
                  <span>Bougie suivante</span>
                  <SkipForward className="h-4 w-4 text-blue-100 animate-pulse" />
                </button>

              </div>

              {/* Right group: Playback Speed selector */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-400 font-mono">Vitesse :</span>
                {[
                  { label: '0.1s', ms: 100 },
                  { label: '0.3s', ms: 300 },
                  { label: '0.5s', ms: 500 },
                  { label: '1.0s', ms: 1000 },
                ].map(speed => (
                  <button
                    key={speed.ms}
                    onClick={() => setPlaybackSpeedMs(speed.ms)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                      playbackSpeedMs === speed.ms
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {speed.label}
                  </button>
                ))}
              </div>

            </div>

            {/* Bottom Timeline Scrubber Slider */}
            <div className="pt-2 flex items-center gap-3">
              <span className="text-[10px] font-mono text-zinc-400">Début</span>
              <input
                type="range"
                min={10}
                max={fullCandles.length}
                value={clampedReplayIndex}
                onChange={handleSliderChange}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                title="Glisser pour avancer/reculer dans l'historique"
              />
              <span className="text-[10px] font-mono text-zinc-400">Fin</span>
            </div>

          </div>

        </div>

        {/* Right 1 Col: Simulated Order Execution & Backtest Session Log */}
        <div className="space-y-4">
          
          {/* Order Placement Panel */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white font-sans">
                  Exécuter un Ordre Simulé
                </h3>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                @{currentPrice.toFixed(assetConfig.precision)}
              </span>
            </div>

            {/* Direction Switcher (Buy / Sell) */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTradeDirection('LONG')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  tradeDirection === 'LONG'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400/50'
                    : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                <span>ACHAT (LONG)</span>
              </button>

              <button
                onClick={() => setTradeDirection('SHORT')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  tradeDirection === 'SHORT'
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 ring-2 ring-rose-400/50'
                    : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <TrendingDown className="h-4 w-4" />
                <span>VENTE (SHORT)</span>
              </button>
            </div>

            {/* Inputs: Stop Loss, Take Profit, Risk Amount */}
            <div className="space-y-3 text-xs">
              
              <div>
                <div className="flex items-center justify-between text-zinc-400 mb-1">
                  <span>Stop Loss (Prix)</span>
                  <span className="text-[10px] text-rose-400 font-mono">Invalidation</span>
                </div>
                <input
                  type="number"
                  step="any"
                  value={customStopLoss}
                  onChange={(e) => setCustomStopLoss(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-white text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-zinc-400 mb-1">
                  <span>Take Profit (Prix)</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Objectif</span>
                </div>
                <input
                  type="number"
                  step="any"
                  value={customTakeProfit}
                  onChange={(e) => setCustomTakeProfit(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-white text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-zinc-400 mb-1">
                  <span>Risque par Trade</span>
                  <span className="text-[10px] text-blue-400 font-mono">1% Capital</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[100, 250, 500].map(amt => (
                    <button
                      key={amt}
                      onClick={() => setRiskPerTrade(amt)}
                      className={`py-1 rounded-lg text-xs font-mono transition-all ${
                        riskPerTrade === amt
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {formatCurrency(amt, currency)}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Main Action: Place Order */}
            <button
              onClick={handlePlaceOrder}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold text-white shadow-xl transition-all active:scale-[0.98] cursor-pointer ${
                tradeDirection === 'LONG'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/30'
                  : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-600/30'
              }`}
            >
              <Plus className="h-4 w-4" />
              <span>Ouvrir Position {tradeDirection}</span>
            </button>

          </div>

          {/* Active Positions Live Tracker */}
          {activeTrades.length > 0 && (
            <div className="rounded-3xl border border-blue-500/30 bg-zinc-900/90 p-4 space-y-3">
              <h4 className="text-xs font-mono uppercase text-blue-400 font-bold flex items-center justify-between">
                <span>Positions Ouvertes ({activeTrades.length})</span>
                <span className="animate-pulse">● Live</span>
              </h4>
              <div className="space-y-2">
                {activeTrades.map(trade => {
                  const gainPips = trade.direction === 'LONG'
                    ? (currentPrice - trade.entryPrice)
                    : (trade.entryPrice - currentPrice);
                  const riskDist = Math.abs(trade.entryPrice - trade.stopLoss);
                  const floatingR = riskDist > 0 ? (gainPips / riskDist).toFixed(2) : '0.00';
                  const floatingPnl = trade.riskAmount * parseFloat(floatingR);

                  return (
                    <div key={trade.id} className="p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`font-bold ${trade.direction === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {trade.direction} {trade.asset}
                        </span>
                        <span className={`font-mono font-bold ${floatingPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {floatingPnl >= 0 ? '+' : ''}{floatingPnl.toFixed(1)}{currency} ({floatingR}R)
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono flex items-center justify-between">
                        <span>Entrée: {trade.entryPrice}</span>
                        <span>SL: {trade.stopLoss} | TP: {trade.takeProfit}</span>
                      </div>
                      <button
                        onClick={() => handleManualClose(trade.id)}
                        className="w-full py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-semibold transition-all cursor-pointer"
                      >
                        Clôturer au Marché
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Closed Trades History / Journal Export */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h4 className="text-xs font-mono uppercase text-zinc-400 font-bold">
                Historique Session ({closedTrades.length})
              </h4>
              {closedTrades.length > 0 && (
                <button
                  onClick={() => setClosedTrades([])}
                  className="text-[10px] text-zinc-500 hover:text-rose-400 transition-all"
                >
                  Effacer
                </button>
              )}
            </div>

            {closedTrades.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-500 italic">
                Aucun trade clôturé dans cette session. Ouvrez un trade et avancez avec <strong>"Bougie suivante"</strong>.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {closedTrades.map(trade => (
                  <div key={trade.id} className="p-2.5 rounded-xl border border-zinc-800/80 bg-zinc-950/80 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`font-bold font-mono ${trade.status === 'WIN' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {trade.status} {trade.direction} ({trade.rMultiple >= 0 ? '+' : ''}{trade.rMultiple}R)
                      </span>
                      <span className="font-mono text-zinc-300 font-bold">
                        {formatCurrency(trade.pnl, currency, true)}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono flex items-center justify-between">
                      <span>{trade.asset} • {trade.timeframe}</span>
                      <span>@{trade.entryPrice} → {trade.exitPrice}</span>
                    </div>

                    {/* Import to main journal button */}
                    {onSaveTradeToJournal && (
                      <div className="pt-1 border-t border-zinc-850 flex justify-end">
                        <button
                          onClick={() => handleExportToMainJournal(trade)}
                          className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
                        >
                          {savedTradeSuccess === trade.id ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                              <span className="text-emerald-400">Enregistré au journal !</span>
                            </>
                          ) : (
                            <>
                              <Save className="h-3 w-3" />
                              <span>Sauvegarder dans mon Journal</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};

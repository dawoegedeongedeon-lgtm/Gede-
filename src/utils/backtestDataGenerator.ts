export interface CandlestickPoint {
  time: number; // UTC timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export type AssetSymbol = 'EUR/USD' | 'GBP/USD' | 'USD/JPY' | 'BTC/USD' | 'ETH/USD' | 'NAS100' | 'US30' | 'XAU/USD';

export const ASSET_CONFIGS: Record<AssetSymbol, {
  name: string;
  category: 'Forex' | 'Crypto' | 'Indices' | 'Metals';
  basePrice: number;
  precision: number;
  pipFactor: number;
  typicalSpread: number;
  volatility: number;
}> = {
  'EUR/USD': {
    name: 'EUR / USD (Euro / US Dollar)',
    category: 'Forex',
    basePrice: 1.0850,
    precision: 4,
    pipFactor: 0.0001,
    typicalSpread: 0.0001,
    volatility: 0.0008,
  },
  'GBP/USD': {
    name: 'GBP / USD (British Pound / Dollar)',
    category: 'Forex',
    basePrice: 1.2950,
    precision: 4,
    pipFactor: 0.0001,
    typicalSpread: 0.00015,
    volatility: 0.0012,
  },
  'USD/JPY': {
    name: 'USD / JPY (Dollar / Yen)',
    category: 'Forex',
    basePrice: 154.20,
    precision: 2,
    pipFactor: 0.01,
    typicalSpread: 0.02,
    volatility: 0.15,
  },
  'BTC/USD': {
    name: 'BTC / USD (Bitcoin / Dollar)',
    category: 'Crypto',
    basePrice: 67500,
    precision: 1,
    pipFactor: 1,
    typicalSpread: 5,
    volatility: 350,
  },
  'ETH/USD': {
    name: 'ETH / USD (Ethereum / Dollar)',
    category: 'Crypto',
    basePrice: 3450,
    precision: 2,
    pipFactor: 0.1,
    typicalSpread: 0.5,
    volatility: 25,
  },
  'NAS100': {
    name: 'NAS100 / NQ (Nasdaq 100 Futures)',
    category: 'Indices',
    basePrice: 19800,
    precision: 1,
    pipFactor: 1,
    typicalSpread: 1.5,
    volatility: 60,
  },
  'US30': {
    name: 'US30 / YM (Dow Jones Industrial)',
    category: 'Indices',
    basePrice: 42200,
    precision: 0,
    pipFactor: 1,
    typicalSpread: 3,
    volatility: 90,
  },
  'XAU/USD': {
    name: 'XAU / USD (Gold Spot)',
    category: 'Metals',
    basePrice: 2640.50,
    precision: 2,
    pipFactor: 0.1,
    typicalSpread: 0.3,
    volatility: 5.5,
  },
};

export const TIMEFRAMES = [
  { id: '1m', label: '1 min', seconds: 60 },
  { id: '5m', label: '5 min', seconds: 300 },
  { id: '15m', label: '15 min', seconds: 900 },
  { id: '1h', label: '1 heure', seconds: 3600 },
  { id: '4h', label: '4 heures', seconds: 14400 },
  { id: '1D', label: '1 Jour', seconds: 86400 },
] as const;

export type BacktestTimeframe = typeof TIMEFRAMES[number]['id'];

// Deterministic Pseudo-Random Generator for consistent realistic historical charts
function pseudoRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Generate a realistic multi-timeframe synchronized dataset
 * Starting at base 5-minute intervals, aggregated dynamically for 15m, 1h, 4h, 1D.
 */
export function generateRealisticHistoricalData(
  asset: AssetSymbol,
  totalBaseCandles: number = 600
): {
  baseCandles: CandlestickPoint[];
  timeframeMap: Record<BacktestTimeframe, CandlestickPoint[]>;
} {
  const config = ASSET_CONFIGS[asset] || ASSET_CONFIGS['EUR/USD'];
  const rand = pseudoRandom(asset.split('').reduce((acc, c) => acc + c.charCodeAt(0), 1337));

  // Base timestamp: 30 days ago at 08:00 UTC
  const nowSec = Math.floor(Date.now() / 1000);
  const baseStepSec = 300; // 5 min
  const startTimeSec = nowSec - (totalBaseCandles * baseStepSec);

  const baseCandles: CandlestickPoint[] = [];
  let currentPrice = config.basePrice;

  // Market structure parameters (regimes: trend up, trend down, consolidation, liquidity grab)
  let trendPhase = 0;
  let trendDuration = 30 + Math.floor(rand() * 40);
  let trendDirection = 1; // 1 = bullish, -1 = bearish, 0 = range

  for (let i = 0; i < totalBaseCandles; i++) {
    const candleTime = startTimeSec + (i * baseStepSec);

    trendPhase++;
    if (trendPhase > trendDuration) {
      trendPhase = 0;
      trendDuration = 25 + Math.floor(rand() * 50);
      const roll = rand();
      if (roll < 0.4) trendDirection = 1;
      else if (roll < 0.8) trendDirection = -1;
      else trendDirection = 0;
    }

    const drift = trendDirection * (config.volatility * (0.2 + rand() * 0.4));
    const noise = (rand() - 0.5) * config.volatility * 1.6;
    const delta = drift + noise;

    const open = currentPrice;
    let close = open + delta;

    // Introduce occasional liquidity wicks (wick hunting)
    const isWickSweep = rand() < 0.08;
    let high = Math.max(open, close) + (rand() * config.volatility * (isWickSweep ? 2.5 : 0.8));
    let low = Math.min(open, close) - (rand() * config.volatility * (isWickSweep ? 2.5 : 0.8));

    // Ensure price bounds
    if (low <= 0.0001) low = 0.0001;
    if (close <= 0.0001) close = 0.0001;
    if (open <= 0.0001) low = 0.0001;

    // Formatting precision
    const factor = Math.pow(10, config.precision);
    const roundP = (val: number) => Math.round(val * factor) / factor;

    baseCandles.push({
      time: candleTime,
      open: roundP(open),
      high: roundP(high),
      low: roundP(low),
      close: roundP(close),
      volume: Math.round(100 + rand() * 800 + (isWickSweep ? 1200 : 0)),
    });

    currentPrice = close;
  }

  // Aggregate into all timeframes for strict multi-timeframe synchronization
  const aggregateToTimeframe = (intervalSeconds: number): CandlestickPoint[] => {
    if (intervalSeconds === baseStepSec) return baseCandles;
    
    // For 1m, synthesize sub-candles if needed or scale base
    if (intervalSeconds === 60) {
      // 1m sub-candles
      const m1Candles: CandlestickPoint[] = [];
      baseCandles.forEach((b) => {
        const step = (b.close - b.open) / 5;
        let subOpen = b.open;
        for (let j = 0; j < 5; j++) {
          const subClose = j === 4 ? b.close : subOpen + step + ((rand() - 0.5) * (config.volatility * 0.2));
          const subHigh = Math.max(subOpen, subClose) + (rand() * config.volatility * 0.15);
          const subLow = Math.min(subOpen, subClose) - (rand() * config.volatility * 0.15);
          m1Candles.push({
            time: b.time + (j * 60),
            open: Number(subOpen.toFixed(config.precision)),
            high: Number(subHigh.toFixed(config.precision)),
            low: Number(subLow.toFixed(config.precision)),
            close: Number(subClose.toFixed(config.precision)),
            volume: Math.round((b.volume || 100) / 5),
          });
          subOpen = subClose;
        }
      });
      return m1Candles;
    }

    const aggregated: CandlestickPoint[] = [];
    let currentBucketTime = Math.floor(baseCandles[0].time / intervalSeconds) * intervalSeconds;
    let currentBucket: CandlestickPoint[] = [];

    baseCandles.forEach((c) => {
      const bucketTime = Math.floor(c.time / intervalSeconds) * intervalSeconds;
      if (bucketTime !== currentBucketTime && currentBucket.length > 0) {
        // finalize current bucket
        const o = currentBucket[0].open;
        const cl = currentBucket[currentBucket.length - 1].close;
        const h = Math.max(...currentBucket.map(x => x.high));
        const l = Math.min(...currentBucket.map(x => x.low));
        const vol = currentBucket.reduce((acc, x) => acc + (x.volume || 0), 0);

        aggregated.push({
          time: currentBucketTime,
          open: o,
          high: h,
          low: l,
          close: cl,
          volume: vol,
        });

        currentBucket = [];
        currentBucketTime = bucketTime;
      }
      currentBucket.push(c);
    });

    if (currentBucket.length > 0) {
      const o = currentBucket[0].open;
      const cl = currentBucket[currentBucket.length - 1].close;
      const h = Math.max(...currentBucket.map(x => x.high));
      const l = Math.min(...currentBucket.map(x => x.low));
      const vol = currentBucket.reduce((acc, x) => acc + (x.volume || 0), 0);

      aggregated.push({
        time: currentBucketTime,
        open: o,
        high: h,
        low: l,
        close: cl,
        volume: vol,
      });
    }

    return aggregated;
  };

  const timeframeMap: Record<BacktestTimeframe, CandlestickPoint[]> = {
    '1m': aggregateToTimeframe(60),
    '5m': baseCandles,
    '15m': aggregateToTimeframe(900),
    '1h': aggregateToTimeframe(3600),
    '4h': aggregateToTimeframe(14400),
    '1D': aggregateToTimeframe(86400),
  };

  return {
    baseCandles,
    timeframeMap,
  };
}

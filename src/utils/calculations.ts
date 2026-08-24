import { Trade, JournalStats, CurrencySymbol } from '../types';

export function calculateJournalStats(trades: Trade[], initialBalance: number = 25000): JournalStats {
  const totalTrades = trades.length;
  
  if (totalTrades === 0) {
    return {
      netPnl: 0,
      pnlPercentage: 0,
      monthPnl: 0,
      monthPnlPercentage: 0,
      monthTradesCount: 0,
      monthWinRate: 0,
      totalTrades: 0,
      winCount: 0,
      lossCount: 0,
      beCount: 0,
      openCount: 0,
      winRate: 0,
      profitFactor: 0,
      totalGains: 0,
      totalLosses: 0,
      avgWin: 0,
      avgLoss: 0,
      avgTrade: 0,
      winLossRatio: 0,
      avgRMultiple: 0,
      currentDrawdownAmount: 0,
      currentDrawdownPercentage: 0,
      maxDrawdownAmount: 0,
      maxDrawdownPercentage: 0,
      expectancy: 0,
      bestTrade: 0,
      worstTrade: 0,
      currentStreak: { type: 'NONE', count: 0 },
      maxWinStreak: 0,
      maxLossStreak: 0,
      accountBalance: initialBalance,
      initialBalance,
      longTradesCount: 0,
      shortTradesCount: 0,
      longWinRate: 0,
      shortWinRate: 0,
      activeMonthName: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
    };
  }

  let winCount = 0;
  let lossCount = 0;
  let beCount = 0;
  let openCount = 0;

  let totalGains = 0;
  let totalLosses = 0;
  let totalR = 0;
  let bestTrade = -Infinity;
  let worstTrade = Infinity;

  let longTradesCount = 0;
  let shortTradesCount = 0;
  let longWinCount = 0;
  let shortWinCount = 0;

  trades.forEach((t) => {
    const pnl = Number(t.pnl) || 0;
    const r = Number(t.rMultiple) || 0;

    if (t.direction === 'LONG') {
      longTradesCount++;
      if (t.status === 'WIN') longWinCount++;
    } else if (t.direction === 'SHORT') {
      shortTradesCount++;
      if (t.status === 'WIN') shortWinCount++;
    }

    if (t.status === 'WIN') {
      winCount++;
      totalGains += pnl;
    } else if (t.status === 'LOSS') {
      lossCount++;
      totalLosses += Math.abs(pnl);
    } else if (t.status === 'BE') {
      beCount++;
    } else if (t.status === 'OPEN') {
      openCount++;
    }

    totalR += r;
    if (pnl > bestTrade) bestTrade = pnl;
    if (pnl < worstTrade) worstTrade = pnl;
  });

  const netPnl = totalGains - totalLosses;
  const closedTrades = winCount + lossCount + beCount;
  const decisiveTrades = winCount + lossCount;
  
  const winRate = decisiveTrades > 0 ? (winCount / decisiveTrades) * 100 : 0;
  const profitFactor = totalLosses > 0 ? totalGains / totalLosses : totalGains > 0 ? 99.9 : 0;
  const avgWin = winCount > 0 ? totalGains / winCount : 0;
  const avgLoss = lossCount > 0 ? totalLosses / lossCount : 0;
  const avgTrade = closedTrades > 0 ? netPnl / closedTrades : totalTrades > 0 ? netPnl / totalTrades : 0;
  const winLossRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? avgWin : 0;
  const avgRMultiple = closedTrades > 0 ? totalR / closedTrades : 0;

  const longWinRate = longTradesCount > 0 ? (longWinCount / longTradesCount) * 100 : 0;
  const shortWinRate = shortTradesCount > 0 ? (shortWinCount / shortTradesCount) * 100 : 0;

  // Expectancy = (Win% * AvgWin) - (Loss% * AvgLoss)
  const winProb = decisiveTrades > 0 ? winCount / decisiveTrades : 0;
  const lossProb = decisiveTrades > 0 ? lossCount / decisiveTrades : 0;
  const expectancy = (winProb * avgWin) - (lossProb * avgLoss);

  // Month P&L calculation: determine active/current month
  // Find current year-month (e.g. "2025-05")
  const currentRealDate = new Date();
  const currentYearMonth = `${currentRealDate.getFullYear()}-${String(currentRealDate.getMonth() + 1).padStart(2, '0')}`;
  
  // Look for trades in current month, or the latest month with trade activity
  const monthsWithTrades = Array.from(new Set(trades.map((t) => (t.entryDate ? t.entryDate.substring(0, 7) : ''))))
    .filter(Boolean)
    .sort()
    .reverse();

  const targetMonthPrefix = monthsWithTrades.includes(currentYearMonth)
    ? currentYearMonth
    : monthsWithTrades[0] || currentYearMonth;

  let activeMonthName = '';
  try {
    const [y, m] = targetMonthPrefix.split('-');
    const dateObj = new Date(Number(y), Number(m) - 1, 1);
    activeMonthName = dateObj.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    activeMonthName = activeMonthName.charAt(0).toUpperCase() + activeMonthName.slice(1);
  } catch {
    activeMonthName = targetMonthPrefix;
  }

  const monthTrades = trades.filter((t) => t.entryDate && t.entryDate.startsWith(targetMonthPrefix));
  const monthTradesCount = monthTrades.length;
  const monthPnl = monthTrades.reduce((acc, t) => acc + (Number(t.pnl) || 0), 0);
  const monthWins = monthTrades.filter((t) => t.status === 'WIN').length;
  const monthDecisive = monthTrades.filter((t) => t.status === 'WIN' || t.status === 'LOSS').length;
  const monthWinRate = monthDecisive > 0 ? (monthWins / monthDecisive) * 100 : 0;
  const monthPnlPercentage = initialBalance > 0 ? (monthPnl / initialBalance) * 100 : 0;

  // Calculate Max Drawdown and Live Drawdown from equity sequence
  const sortedTrades = [...trades].sort((a, b) => 
    new Date(`${a.entryDate}T${a.entryTime || '00:00'}`).getTime() - 
    new Date(`${b.entryDate}T${b.entryTime || '00:00'}`).getTime()
  );

  let currentPeak = initialBalance;
  let runningBalance = initialBalance;
  let maxDrawdownAmount = 0;
  let maxDrawdownPercentage = 0;

  sortedTrades.forEach((t) => {
    runningBalance += Number(t.pnl) || 0;
    if (runningBalance > currentPeak) {
      currentPeak = runningBalance;
    } else {
      const ddAmount = currentPeak - runningBalance;
      const ddPercent = currentPeak > 0 ? (ddAmount / currentPeak) * 100 : 0;
      if (ddAmount > maxDrawdownAmount) maxDrawdownAmount = ddAmount;
      if (ddPercent > maxDrawdownPercentage) maxDrawdownPercentage = ddPercent;
    }
  });

  // Current live drawdown relative to the all-time peak
  const currentDrawdownAmount = Math.max(0, currentPeak - runningBalance);
  const currentDrawdownPercentage = currentPeak > 0 ? (currentDrawdownAmount / currentPeak) * 100 : 0;

  // Streaks calculation (on chronologically sorted trades)
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;

  sortedTrades.forEach((t) => {
    if (t.status === 'WIN') {
      currentWinStreak++;
      currentLossStreak = 0;
      if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
    } else if (t.status === 'LOSS') {
      currentLossStreak++;
      currentWinStreak = 0;
      if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
    }
  });

  const lastTrade = sortedTrades[sortedTrades.length - 1];
  let currentStreakCount = 0;
  let currentStreakType: 'WIN' | 'LOSS' | 'NONE' = 'NONE';

  if (lastTrade) {
    if (lastTrade.status === 'WIN') {
      currentStreakType = 'WIN';
      for (let i = sortedTrades.length - 1; i >= 0; i--) {
        if (sortedTrades[i].status === 'WIN') currentStreakCount++;
        else if (sortedTrades[i].status !== 'BE') break;
      }
    } else if (lastTrade.status === 'LOSS') {
      currentStreakType = 'LOSS';
      for (let i = sortedTrades.length - 1; i >= 0; i--) {
        if (sortedTrades[i].status === 'LOSS') currentStreakCount++;
        else if (sortedTrades[i].status !== 'BE') break;
      }
    }
  }

  const accountBalance = initialBalance + netPnl;
  const pnlPercentage = (netPnl / initialBalance) * 100;

  return {
    netPnl,
    pnlPercentage,
    monthPnl,
    monthPnlPercentage,
    monthTradesCount,
    monthWinRate,
    totalTrades,
    winCount,
    lossCount,
    beCount,
    openCount,
    winRate,
    profitFactor,
    totalGains,
    totalLosses,
    avgWin,
    avgLoss,
    avgTrade,
    winLossRatio,
    avgRMultiple,
    currentDrawdownAmount,
    currentDrawdownPercentage,
    maxDrawdownAmount,
    maxDrawdownPercentage,
    expectancy,
    bestTrade: bestTrade === -Infinity ? 0 : bestTrade,
    worstTrade: worstTrade === Infinity ? 0 : worstTrade,
    currentStreak: { type: currentStreakType, count: currentStreakCount },
    maxWinStreak,
    maxLossStreak,
    accountBalance,
    initialBalance,
    longTradesCount,
    shortTradesCount,
    longWinRate,
    shortWinRate,
    activeMonthName,
  };
}

export function generateEquityCurveData(trades: Trade[], initialBalance: number = 25000) {
  const sorted = [...trades].sort((a, b) => 
    new Date(`${a.entryDate}T${a.entryTime || '00:00'}`).getTime() - 
    new Date(`${b.entryDate}T${b.entryTime || '00:00'}`).getTime()
  );

  let runningBalance = initialBalance;
  let runningPnl = 0;
  let runningR = 0;

  const curve = [
    {
      tradeIndex: 0,
      date: sorted[0]?.entryDate || 'Départ',
      time: '',
      ticket: 'Départ',
      pair: 'Initial',
      direction: '',
      balance: initialBalance,
      pnl: 0,
      cumulativePnl: 0,
      cumulativeR: 0,
      status: 'START',
    }
  ];

  sorted.forEach((t, idx) => {
    const pnl = Number(t.pnl) || 0;
    const r = Number(t.rMultiple) || 0;
    runningBalance += pnl;
    runningPnl += pnl;
    runningR += r;

    curve.push({
      tradeIndex: idx + 1,
      date: t.entryDate,
      time: t.entryTime || '',
      ticket: t.ticketNumber || `#${idx + 1}`,
      pair: t.pair || 'N/A',
      direction: t.direction || 'LONG',
      balance: Math.round(runningBalance * 100) / 100,
      pnl: pnl,
      cumulativePnl: Math.round(runningPnl * 100) / 100,
      cumulativeR: Math.round(runningR * 100) / 100,
      status: t.status,
    });
  });

  return curve;
}

export function formatCurrency(value: number, symbol: CurrencySymbol = '$', showSign: boolean = false): string {
  const isNeg = value < 0;
  const absVal = Math.abs(value);
  const formatted = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absVal);

  if (showSign && value > 0) {
    return `+${symbol}${formatted}`;
  }
  if (isNeg) {
    return `-${symbol}${formatted}`;
  }
  return `${symbol}${formatted}`;
}

export function formatRMultiple(r: number): string {
  if (r > 0) return `+${r.toFixed(2)}R`;
  if (r < 0) return `${r.toFixed(2)}R`;
  return `0.00R`;
}

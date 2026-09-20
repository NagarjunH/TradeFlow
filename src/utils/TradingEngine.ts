import type { Trade, AppSettings } from '../db/db';

export interface PerformanceMetrics {
  initialCapital: number;
  currentBalance: number;
  netPnl: number;
  roiPercent: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  winRate: number; // percentage (0-100)
  lossRate: number;
  profitFactor: number;
  expectancy: number; // in R
  expectancyUsd: number; // in $
  averageR: number;
  averageWinR: number;
  averageLossR: number;
  bestTrade: { pnl: number; rMultiple: number; pair: string; date: string } | null;
  worstTrade: { pnl: number; rMultiple: number; pair: string; date: string } | null;
  maxDrawdownUsd: number;
  maxDrawdownPercent: number;
  currentStreak: { type: 'WIN' | 'LOSS' | 'NONE'; count: number };
  maxWinStreak: number;
  maxLossStreak: number;
}

export interface DisciplineMetrics {
  disciplineScore: number; // 0-100%
  cleanTradesCount: number;
  violationTradesCount: number;
  cleanNetR: number;
  cleanNetPnl: number;
  cleanWinRate: number;
  violationNetR: number;
  violationNetPnl: number;
  violationWinRate: number;
  costOfIndisciplineUsd: number; // Financial cost of rule breaks
  costOfIndisciplineR: number;
  violationBreakdown: Record<string, { count: number; netPnl: number; netR: number }>;
}

export interface EquityCurvePoint {
  index: number;
  tradeNumber?: number;
  date: string;
  time?: string;
  equity: number;
  pnl: number;
  rMultiple: number;
  cumulativeR: number;
  returnPercent: number;
  peakEquity: number;
  drawdownUsd: number;
  drawdownPercent: number;
  isViolation: boolean;
}

export interface DayStatus {
  date: string;
  totalTrades: number;
  dailyPnl: number;
  dailyR: number;
  cleanTrades: number;
  violationTrades: number;
  emotionalTradesCount: number;
  dailyLimitHit: boolean;
  remainingR: number;
  status: 'ACTIVE' | 'WARNING' | 'LOCKED' | 'NO_TRADE' | 'CLOSED';
}

export function calculatePerformance(trades: Trade[], settings: AppSettings): PerformanceMetrics {
  const initialCapital = settings.initialCapital || 1000;
  const sorted = [...trades].sort((a, b) => new Date(`${a.date}T${a.time || '00:00'}`).getTime() - new Date(`${b.date}T${b.time || '00:00'}`).getTime());

  let currentBalance = initialCapital;
  let winningTrades = 0;
  let losingTrades = 0;
  let breakEvenTrades = 0;
  let totalGrossProfit = 0;
  let totalGrossLoss = 0;
  let totalR = 0;
  let totalWinR = 0;
  let totalLossR = 0;

  let bestTrade: PerformanceMetrics['bestTrade'] = null;
  let worstTrade: PerformanceMetrics['worstTrade'] = null;

  let peakEquity = initialCapital;
  let maxDrawdownUsd = 0;
  let maxDrawdownPercent = 0;

  let currentStreakType: 'WIN' | 'LOSS' | 'NONE' = 'NONE';
  let currentStreakCount = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let runningWinStreak = 0;
  let runningLossStreak = 0;

  for (const t of sorted) {
    const pnl = t.pnl;
    const r = t.rMultiple;
    currentBalance += pnl;
    totalR += r;

    // Best & Worst
    if (!bestTrade || pnl > bestTrade.pnl) {
      bestTrade = { pnl, rMultiple: r, pair: t.pair, date: t.date };
    }
    if (!worstTrade || pnl < worstTrade.pnl) {
      worstTrade = { pnl, rMultiple: r, pair: t.pair, date: t.date };
    }

    // Win / Loss / BE
    if (pnl > 0.001) {
      winningTrades++;
      totalGrossProfit += pnl;
      totalWinR += r;

      runningWinStreak++;
      runningLossStreak = 0;
      if (runningWinStreak > maxWinStreak) maxWinStreak = runningWinStreak;
      currentStreakType = 'WIN';
      currentStreakCount = runningWinStreak;
    } else if (pnl < -0.001) {
      losingTrades++;
      totalGrossLoss += Math.abs(pnl);
      totalLossR += Math.abs(r);

      runningLossStreak++;
      runningWinStreak = 0;
      if (runningLossStreak > maxLossStreak) maxLossStreak = runningLossStreak;
      currentStreakType = 'LOSS';
      currentStreakCount = runningLossStreak;
    } else {
      breakEvenTrades++;
      runningWinStreak = 0;
      runningLossStreak = 0;
    }

    // Drawdown
    if (currentBalance > peakEquity) {
      peakEquity = currentBalance;
    }
    const currentDd = peakEquity - currentBalance;
    const currentDdPct = peakEquity > 0 ? (currentDd / peakEquity) * 100 : 0;
    if (currentDd > maxDrawdownUsd) maxDrawdownUsd = currentDd;
    if (currentDdPct > maxDrawdownPercent) maxDrawdownPercent = currentDdPct;
  }

  const totalTrades = sorted.length;
  const netPnl = currentBalance - initialCapital;
  const roiPercent = initialCapital > 0 ? (netPnl / initialCapital) * 100 : 0;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const lossRate = totalTrades > 0 ? (losingTrades / totalTrades) * 100 : 0;

  const profitFactor = totalGrossLoss > 0 ? totalGrossProfit / totalGrossLoss : totalGrossProfit > 0 ? 99.9 : 0;

  const averageR = totalTrades > 0 ? totalR / totalTrades : 0;
  const averageWinR = winningTrades > 0 ? totalWinR / winningTrades : 0;
  const averageLossR = losingTrades > 0 ? totalLossR / losingTrades : 0;

  const winRatio = totalTrades > 0 ? winningTrades / totalTrades : 0;
  const lossRatio = totalTrades > 0 ? losingTrades / totalTrades : 0;
  const expectancy = (winRatio * averageWinR) - (lossRatio * averageLossR);

  const avgWinUsd = winningTrades > 0 ? totalGrossProfit / winningTrades : 0;
  const avgLossUsd = losingTrades > 0 ? totalGrossLoss / losingTrades : 0;
  const expectancyUsd = (winRatio * avgWinUsd) - (lossRatio * avgLossUsd);

  return {
    initialCapital,
    currentBalance,
    netPnl,
    roiPercent,
    totalTrades,
    winningTrades,
    losingTrades,
    breakEvenTrades,
    winRate,
    lossRate,
    profitFactor,
    expectancy,
    expectancyUsd,
    averageR,
    averageWinR,
    averageLossR,
    bestTrade,
    worstTrade,
    maxDrawdownUsd,
    maxDrawdownPercent,
    currentStreak: { type: currentStreakType, count: currentStreakCount },
    maxWinStreak,
    maxLossStreak,
  };
}

export function calculateDiscipline(trades: Trade[]): DisciplineMetrics {
  let cleanTradesCount = 0;
  let violationTradesCount = 0;
  let cleanWins = 0;
  let violationWins = 0;
  let cleanNetR = 0;
  let cleanNetPnl = 0;
  let violationNetR = 0;
  let violationNetPnl = 0;

  const violationBreakdown: Record<string, { count: number; netPnl: number; netR: number }> = {};

  for (const t of trades) {
    const isClean = t.execution === 'CLEAN';
    const pnl = t.pnl;
    const r = t.rMultiple;

    if (isClean) {
      cleanTradesCount++;
      cleanNetR += r;
      cleanNetPnl += pnl;
      if (pnl > 0.001) cleanWins++;
    } else {
      violationTradesCount++;
      violationNetR += r;
      violationNetPnl += pnl;
      if (pnl > 0.001) violationWins++;

      const reason = t.violationReason && t.violationReason !== 'None' ? t.violationReason : (t.emotion === 'FOMO' ? 'FOMO' : 'Rule Violation');
      if (!violationBreakdown[reason]) {
        violationBreakdown[reason] = { count: 0, netPnl: 0, netR: 0 };
      }
      violationBreakdown[reason].count++;
      violationBreakdown[reason].netPnl += pnl;
      violationBreakdown[reason].netR += r;
    }
  }

  const total = trades.length;
  // Weighted Discipline Score: 100% minus direct penalty of violations
  const disciplineScore = total === 0 ? 100 : Math.max(0, Math.round((cleanTradesCount / total) * 100));

  const cleanWinRate = cleanTradesCount > 0 ? (cleanWins / cleanTradesCount) * 100 : 0;
  const violationWinRate = violationTradesCount > 0 ? (violationWins / violationTradesCount) * 100 : 0;

  // Cost of Indiscipline = What was lost due to violation trades
  const costOfIndisciplineUsd = violationNetPnl < 0 ? Math.abs(violationNetPnl) : 0;
  const costOfIndisciplineR = violationNetR < 0 ? Math.abs(violationNetR) : 0;

  return {
    disciplineScore,
    cleanTradesCount,
    violationTradesCount,
    cleanNetR,
    cleanNetPnl,
    cleanWinRate,
    violationNetR,
    violationNetPnl,
    violationWinRate,
    costOfIndisciplineUsd,
    costOfIndisciplineR,
    violationBreakdown,
  };
}

export function generateEquityCurve(trades: Trade[], settings: AppSettings): EquityCurvePoint[] {
  const initialCapital = settings.initialCapital || 1000;
  const sorted = [...trades].sort((a, b) => new Date(`${a.date}T${a.time || '00:00'}`).getTime() - new Date(`${b.date}T${b.time || '00:00'}`).getTime());

  const points: EquityCurvePoint[] = [
    {
      index: 0,
      date: sorted.length > 0 ? sorted[0].date : new Date().toISOString().split('T')[0],
      equity: initialCapital,
      pnl: 0,
      rMultiple: 0,
      cumulativeR: 0,
      returnPercent: 0,
      peakEquity: initialCapital,
      drawdownUsd: 0,
      drawdownPercent: 0,
      isViolation: false,
    },
  ];

  let currentEquity = initialCapital;
  let peakEquity = initialCapital;
  let cumulativeR = 0;

  sorted.forEach((t, i) => {
    currentEquity += t.pnl;
    cumulativeR += t.rMultiple;
    if (currentEquity > peakEquity) peakEquity = currentEquity;

    const ddUsd = peakEquity - currentEquity;
    const ddPct = peakEquity > 0 ? (ddUsd / peakEquity) * 100 : 0;
    const returnPct = initialCapital > 0 ? ((currentEquity - initialCapital) / initialCapital) * 100 : 0;

    points.push({
      index: i + 1,
      tradeNumber: t.tradeNumber,
      date: t.date,
      time: t.time,
      equity: Number(currentEquity.toFixed(2)),
      pnl: t.pnl,
      rMultiple: t.rMultiple,
      cumulativeR: Number(cumulativeR.toFixed(2)),
      returnPercent: Number(returnPct.toFixed(2)),
      peakEquity: Number(peakEquity.toFixed(2)),
      drawdownUsd: Number(ddUsd.toFixed(2)),
      drawdownPercent: Number(ddPct.toFixed(2)),
      isViolation: t.execution === 'VIOLATION',
    });
  });

  return points;
}

export function getDayStatus(dateStr: string, trades: Trade[], settings: AppSettings): DayStatus {
  const dayTrades = trades.filter((t) => t.date === dateStr);
  const dailyLimitR = settings.dailyLossLimitR || 2.0;

  let dailyPnl = 0;
  let dailyR = 0;
  let cleanTrades = 0;
  let violationTrades = 0;
  let emotionalTradesCount = 0;

  for (const t of dayTrades) {
    dailyPnl += t.pnl;
    dailyR += t.rMultiple;
    if (t.execution === 'CLEAN') cleanTrades++;
    else violationTrades++;

    if (t.emotion === 'FOMO' || t.emotion === 'REVENGE' || t.violationReason === 'FOMO' || t.violationReason === 'Revenge') {
      emotionalTradesCount++;
    }
  }

  // Daily limit check: if loss is >= dailyLimitR (e.g., dailyR <= -2.0)
  const isLossLimitHit = dailyR <= -dailyLimitR;
  const remainingR = Math.max(0, dailyLimitR + dailyR); // e.g. 2 + (-1) = 1 remaining

  let status: DayStatus['status'] = 'ACTIVE';
  if (dayTrades.length === 0) {
    status = 'ACTIVE';
  } else if (isLossLimitHit || emotionalTradesCount >= 2) {
    status = 'LOCKED';
  } else if (remainingR <= 0.5 || emotionalTradesCount === 1) {
    status = 'WARNING';
  }

  return {
    date: dateStr,
    totalTrades: dayTrades.length,
    dailyPnl: Number(dailyPnl.toFixed(2)),
    dailyR: Number(dailyR.toFixed(2)),
    cleanTrades,
    violationTrades,
    emotionalTradesCount,
    dailyLimitHit: isLossLimitHit,
    remainingR: Number(remainingR.toFixed(2)),
    status,
  };
}

// XAUUSD Position Size Calculator
export interface RiskCalculationResult {
  riskAmountUsd: number;
  stopLossDistancePips: number;
  lotSize: number;
  estimatedCommission: number;
}

export function calculateXauusdPositionSize(
  balance: number,
  riskPercent: number,
  entryPrice: number,
  slPrice: number,
  contractSize = 100 // standard 100 oz per lot for XAUUSD
): RiskCalculationResult {
  const riskAmountUsd = (balance * riskPercent) / 100;
  const priceDiff = Math.abs(entryPrice - slPrice);
  // In Gold: $1 movement = 10 pips/points (e.g. 2650 to 2649 = $1 = 10 pips = $100 per 1 standard lot)
  const stopLossDistancePips = priceDiff * 10;

  if (priceDiff <= 0) {
    return { riskAmountUsd, stopLossDistancePips: 0, lotSize: 0.01, estimatedCommission: 0.07 };
  }

  // Risk = LotSize * ContractSize * PriceDiff
  // LotSize = Risk / (ContractSize * PriceDiff)
  let rawLots = riskAmountUsd / (contractSize * priceDiff);
  // Clamp to 2 decimals, min 0.01
  let lotSize = Math.max(0.01, Math.floor(rawLots * 100) / 100);

  return {
    riskAmountUsd: Number(riskAmountUsd.toFixed(2)),
    stopLossDistancePips: Number(stopLossDistancePips.toFixed(1)),
    lotSize,
    estimatedCommission: Number((lotSize * 7).toFixed(2)), // standard broker ~$7/lot round turn
  };
}

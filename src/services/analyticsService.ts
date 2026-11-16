// ============================================================================
// TradeFlow — Trading Performance Intelligence Service (Central Calculation Engine)
// Single Source of Truth for Dashboard, Analytics (5 Tabs), Journal & Reports
// ============================================================================

import type { Trade, AppSettings } from '../db/db';

export type PerformanceMode = 'ACTUAL' | 'STRATEGY';

export interface CorePerformanceMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  winRate: number; // 0 - 100 %
  lossRate: number;
  netPnl: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  expectancy: number; // $ per trade
  expectancyR: number; // R per trade
  avgWin: number;
  avgLoss: number;
  payoffRatio: number; // avgWin / avgLoss
  averageR: number;
  maxDrawdownUsd: number;
  maxDrawdownPercent: number;
  maxWinStreak: number;
  maxLossStreak: number;
  currentStreak: { type: 'WIN' | 'LOSS' | 'NONE'; count: number };
}

export interface DirectionMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  netPnl: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  avgTradePnl: number;
  avgWin: number;
  avgLoss: number;
  expectancy: number;
  totalLots: number;
}

export interface DirectionComparison {
  buy: DirectionMetrics;
  sell: DirectionMetrics;
  strongerDirection: 'BUY' | 'SELL' | 'BALANCED';
  winRateDiff: number; // BUY Win Rate - SELL Win Rate
  pnlDiff: number; // BUY PnL - SELL PnL
}

export interface HourlyMetric {
  hour: number;
  hourLabel: string; // "08:00"
  tradesCount: number;
  wins: number;
  losses: number;
  winRate: number;
  netPnl: number;
}

export interface WeekdayMetric {
  dayIndex: number; // 1 = Monday ... 5 = Friday
  dayName: string; // "Monday", "Tuesday", etc.
  tradesCount: number;
  wins: number;
  losses: number;
  winRate: number;
  netPnl: number;
}

export interface SessionMetric {
  session: string; // "Tokyo" | "London" | "London/NY Overlap" | "New York"
  tradesCount: number;
  wins: number;
  losses: number;
  winRate: number;
  netPnl: number;
}

export interface ExecutionIntelligence {
  totalTrades: number;
  cleanTradesCount: number;
  violationTradesCount: number;
  disciplineScore: number; // 0 - 100 %
  cleanNetPnl: number;
  cleanWinRate: number;
  violationNetPnl: number;
  violationWinRate: number;
  costOfMistakes: number; // Realized financial loss caused by violations
  lotSizeViolations: Trade[];
  stopOutRecords: Trade[];
  largestLosses: Trade[];
}

export interface EquityPoint {
  index: number;
  tradeNumber: number;
  date: string;
  time: string;
  pnl: number;
  equity: number;
  peakEquity: number;
  drawdownUsd: number;
  drawdownPercent: number;
  isViolation: boolean;
  order: 'BUY' | 'SELL';
  pair: string;
}

export interface FullIntelligenceReport {
  mode: PerformanceMode;
  initialCapital: number;
  currentBalance: number;
  activeTradesCount: number;
  excludedViolationsCount: number;
  core: CorePerformanceMetrics;
  direction: DirectionComparison;
  time: {
    hourly: HourlyMetric[];
    weekdays: WeekdayMetric[];
    sessions: SessionMetric[];
    bestHour: HourlyMetric | null;
    worstHour: HourlyMetric | null;
    bestWeekday: WeekdayMetric | null;
    worstWeekday: WeekdayMetric | null;
  };
  execution: ExecutionIntelligence;
  equityCurve: EquityPoint[];
  activeTrades: Trade[];
}

/** Check if a trade is explicitly classified as an execution blunder / mistake */
export function isExecutionMistake(trade: Trade): boolean {
  const pnl = Number(trade.pnl) || 0;
  const lot = Number(trade.lotSize) || 0.01;
  const rawNotes = (trade.notes || trade.exitReason || '').toLowerCase();

  if (trade.errorCategory && trade.errorCategory !== 'NONE') return true;
  if (trade.execution === 'VIOLATION' && trade.violationReason === 'Over-risk') return true;
  if (trade.tradeSuccessRate === 'MISTAKE') return true;
  if (pnl <= -50.0) return true; // e.g. Nov 10 trade (-$105.75)
  if (lot >= 0.05) return true; // Lot size anomaly (intended 0.01, executed 0.09)
  if (rawNotes.includes('[so ') || rawNotes.includes('stop out')) return true;

  return false;
}

/** Extract integer hour (0-23) from time string "14:51" or close timestamp */
export function extractHour(t: Trade): number {
  if (t.time && t.time.includes(':')) {
    const h = parseInt(t.time.split(':')[0], 10);
    if (!isNaN(h) && h >= 0 && h <= 23) return h;
  }
  if (t.closeTimeRaw && t.closeTimeRaw.includes(':')) {
    const parts = t.closeTimeRaw.trim().split(/\s+/);
    const timePart = parts[1] || parts[0];
    const h = parseInt(timePart.split(':')[0], 10);
    if (!isNaN(h) && h >= 0 && h <= 23) return h;
  }
  return 12; // fallback
}

/** Extract day of week (Monday=1, Sunday=0) from date string YYYY-MM-DD */
export function extractWeekday(dateStr: string): number {
  const dt = new Date(`${dateStr}T12:00:00Z`);
  return isNaN(dt.getTime()) ? 1 : dt.getUTCDay();
}

/** Calculate Core Performance Metrics */
export function calculateCoreMetrics(
  trades: Trade[],
  initialCapital = 1000
): CorePerformanceMetrics {
  const sorted = [...trades].sort((a, b) => {
    const dtA = `${a.date}T${a.time || '00:00'}`;
    const dtB = `${b.date}T${b.time || '00:00'}`;
    return dtA.localeCompare(dtB);
  });

  let winningTrades = 0;
  let losingTrades = 0;
  let breakEvenTrades = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let netPnl = 0;
  let totalR = 0;
  let totalWinR = 0;
  let totalLossR = 0;

  let runningBalance = initialCapital;
  let peakEquity = initialCapital;
  let maxDrawdownUsd = 0;
  let maxDrawdownPercent = 0;

  let currentStreakType: 'WIN' | 'LOSS' | 'NONE' = 'NONE';
  let runningWinStreak = 0;
  let runningLossStreak = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;

  for (const t of sorted) {
    const pnl = Number(t.pnl) || 0;
    netPnl += pnl;
    runningBalance += pnl;

    // R-Multiple
    let r = Number(t.rMultiple) || 0;
    if (pnl > 0.001) r = r > 0 ? r : 1.0;
    else if (pnl < -0.001) r = r < 0 ? r : -1.0;
    else r = 0;
    totalR += r;

    // Win / Loss / Breakeven
    if (pnl > 0.50) {
      winningTrades++;
      grossProfit += pnl;
      totalWinR += Math.abs(r);

      runningWinStreak++;
      runningLossStreak = 0;
      if (runningWinStreak > maxWinStreak) maxWinStreak = runningWinStreak;
      currentStreakType = 'WIN';
    } else if (pnl < -0.50) {
      losingTrades++;
      grossLoss += Math.abs(pnl);
      totalLossR += Math.abs(r);

      runningLossStreak++;
      runningWinStreak = 0;
      if (runningLossStreak > maxLossStreak) maxLossStreak = runningLossStreak;
      currentStreakType = 'LOSS';
    } else {
      breakEvenTrades++;
      runningWinStreak = 0;
      runningLossStreak = 0;
    }

    // Drawdown
    if (runningBalance > peakEquity) {
      peakEquity = runningBalance;
    }
    const ddUsd = peakEquity - runningBalance;
    const ddPct = peakEquity > 0 ? (ddUsd / peakEquity) * 100 : 0;
    if (ddUsd > maxDrawdownUsd) maxDrawdownUsd = ddUsd;
    if (ddPct > maxDrawdownPercent) maxDrawdownPercent = ddPct;
  }

  const totalTrades = sorted.length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const lossRate = totalTrades > 0 ? (losingTrades / totalTrades) * 100 : 0;

  const profitFactor =
    grossLoss > 0.001
      ? Number((grossProfit / grossLoss).toFixed(2))
      : grossProfit > 0
      ? 99.9
      : 0;

  const avgWin = winningTrades > 0 ? grossProfit / winningTrades : 0;
  const avgLoss = losingTrades > 0 ? grossLoss / losingTrades : 0;
  const payoffRatio = avgLoss > 0 ? Number((avgWin / avgLoss).toFixed(2)) : 0;

  // Expectancy ($ per trade): (WinRate * AvgWin) - (LossRate * AvgLoss) or NetPnl / TotalTrades
  const expectancy = totalTrades > 0 ? Number((netPnl / totalTrades).toFixed(2)) : 0;

  const avgWinR = winningTrades > 0 ? totalWinR / winningTrades : 0;
  const avgLossR = losingTrades > 0 ? totalLossR / losingTrades : 0;
  const expectancyR =
    totalTrades > 0
      ? Number(((winRate / 100) * avgWinR - (lossRate / 100) * avgLossR).toFixed(2))
      : 0;

  const averageR = totalTrades > 0 ? Number((totalR / totalTrades).toFixed(2)) : 0;

  const currentStreakCount =
    currentStreakType === 'WIN'
      ? runningWinStreak
      : currentStreakType === 'LOSS'
      ? runningLossStreak
      : 0;

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    breakEvenTrades,
    winRate: Number(winRate.toFixed(2)),
    lossRate: Number(lossRate.toFixed(2)),
    netPnl: Number(netPnl.toFixed(2)),
    grossProfit: Number(grossProfit.toFixed(2)),
    grossLoss: Number(grossLoss.toFixed(2)),
    profitFactor,
    expectancy,
    expectancyR,
    avgWin: Number(avgWin.toFixed(2)),
    avgLoss: Number(avgLoss.toFixed(2)),
    payoffRatio,
    averageR,
    maxDrawdownUsd: Number(maxDrawdownUsd.toFixed(2)),
    maxDrawdownPercent: Number(maxDrawdownPercent.toFixed(2)),
    maxWinStreak,
    maxLossStreak,
    currentStreak: { type: currentStreakType, count: currentStreakCount },
  };
}

/** Directional Analysis (BUY vs SELL deep-dive) */
export function calculateDirectionAnalysis(trades: Trade[]): DirectionComparison {
  const buys = trades.filter((t) => t.order === 'BUY');
  const sells = trades.filter((t) => t.order === 'SELL');

  const buildDirection = (group: Trade[]): DirectionMetrics => {
    const c = calculateCoreMetrics(group, 0);
    const totalLots = group.reduce((sum, t) => sum + (Number(t.lotSize) || 0.01), 0);
    return {
      totalTrades: c.totalTrades,
      winningTrades: c.winningTrades,
      losingTrades: c.losingTrades,
      winRate: c.winRate,
      netPnl: c.netPnl,
      grossProfit: c.grossProfit,
      grossLoss: c.grossLoss,
      profitFactor: c.profitFactor,
      avgTradePnl: c.expectancy,
      avgWin: c.avgWin,
      avgLoss: c.avgLoss,
      expectancy: c.expectancy,
      totalLots: Number(totalLots.toFixed(2)),
    };
  };

  const buy = buildDirection(buys);
  const sell = buildDirection(sells);

  const winRateDiff = Number((buy.winRate - sell.winRate).toFixed(2));
  const pnlDiff = Number((buy.netPnl - sell.netPnl).toFixed(2));

  let strongerDirection: 'BUY' | 'SELL' | 'BALANCED' = 'BALANCED';
  if (winRateDiff > 10 && buy.netPnl > sell.netPnl) strongerDirection = 'BUY';
  else if (winRateDiff < -10 && sell.netPnl > buy.netPnl) strongerDirection = 'SELL';

  return { buy, sell, strongerDirection, winRateDiff, pnlDiff };
}

/** Time & Schedule Analysis (Hours, Weekdays & Sessions) */
export function calculateTimeAnalysis(trades: Trade[]) {
  // 1. Hourly (0 to 23)
  const hourMap = new Map<number, Trade[]>();
  for (let i = 0; i < 24; i++) hourMap.set(i, []);
  for (const t of trades) {
    const h = extractHour(t);
    hourMap.get(h)?.push(t);
  }

  const hourly: HourlyMetric[] = [];
  for (let h = 0; h < 24; h++) {
    const list = hourMap.get(h) || [];
    const wins = list.filter((t) => (Number(t.pnl) || 0) > 0.50).length;
    const losses = list.filter((t) => (Number(t.pnl) || 0) < -0.50).length;
    const pnl = list.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
    const wr = list.length > 0 ? (wins / list.length) * 100 : 0;
    hourly.push({
      hour: h,
      hourLabel: `${String(h).padStart(2, '0')}:00`,
      tradesCount: list.length,
      wins,
      losses,
      winRate: Number(wr.toFixed(1)),
      netPnl: Number(pnl.toFixed(2)),
    });
  }

  // 2. Weekdays (Monday to Friday)
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weekdayMap = new Map<number, Trade[]>();
  for (let i = 0; i < 7; i++) weekdayMap.set(i, []);
  for (const t of trades) {
    const day = extractWeekday(t.date);
    weekdayMap.get(day)?.push(t);
  }

  const weekdays: WeekdayMetric[] = [1, 2, 3, 4, 5].map((d) => {
    const list = weekdayMap.get(d) || [];
    const wins = list.filter((t) => (Number(t.pnl) || 0) > 0.50).length;
    const losses = list.filter((t) => (Number(t.pnl) || 0) < -0.50).length;
    const pnl = list.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
    const wr = list.length > 0 ? (wins / list.length) * 100 : 0;
    return {
      dayIndex: d,
      dayName: dayNames[d],
      tradesCount: list.length,
      wins,
      losses,
      winRate: Number(wr.toFixed(1)),
      netPnl: Number(pnl.toFixed(2)),
    };
  });

  // 3. Sessions
  const sessionNames = ['Tokyo', 'London', 'London/NY Overlap', 'New York'];
  const sessionMap = new Map<string, Trade[]>();
  for (const s of sessionNames) sessionMap.set(s, []);

  for (const t of trades) {
    let sess = t.session || 'Tokyo';
    if (sess === 'Asian') sess = 'Tokyo';
    if (!sessionMap.has(sess)) sessionMap.set(sess, []);
    sessionMap.get(sess)?.push(t);
  }

  const sessions: SessionMetric[] = sessionNames.map((s) => {
    const list = sessionMap.get(s) || [];
    const wins = list.filter((t) => (Number(t.pnl) || 0) > 0.50).length;
    const losses = list.filter((t) => (Number(t.pnl) || 0) < -0.50).length;
    const pnl = list.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
    const wr = list.length > 0 ? (wins / list.length) * 100 : 0;
    return {
      session: s,
      tradesCount: list.length,
      wins,
      losses,
      winRate: Number(wr.toFixed(1)),
      netPnl: Number(pnl.toFixed(2)),
    };
  });

  // Best & Worst with at least 3 trades
  const significantHours = hourly.filter((h) => h.tradesCount >= 3);
  const bestHour =
    significantHours.length > 0
      ? [...significantHours].sort((a, b) => b.netPnl - a.netPnl)[0]
      : null;
  const worstHour =
    significantHours.length > 0
      ? [...significantHours].sort((a, b) => a.netPnl - b.netPnl)[0]
      : null;

  const significantDays = weekdays.filter((w) => w.tradesCount >= 3);
  const bestWeekday =
    significantDays.length > 0
      ? [...significantDays].sort((a, b) => b.netPnl - a.netPnl)[0]
      : null;
  const worstWeekday =
    significantDays.length > 0
      ? [...significantDays].sort((a, b) => a.netPnl - b.netPnl)[0]
      : null;

  return { hourly, weekdays, sessions, bestHour, worstHour, bestWeekday, worstWeekday };
}

/** Execution & Discipline Analysis */
export function calculateExecutionAnalysis(allTrades: Trade[]): ExecutionIntelligence {
  const cleanTrades: Trade[] = [];
  const violationTrades: Trade[] = [];
  const lotSizeViolations: Trade[] = [];
  const stopOutRecords: Trade[] = [];

  for (const t of allTrades) {
    const isMistake = isExecutionMistake(t);
    const lot = Number(t.lotSize) || 0.01;
    const notes = (t.notes || t.exitReason || '').toLowerCase();

    if (lot >= 0.03) {
      lotSizeViolations.push(t);
    }
    if (notes.includes('[so ') || notes.includes('stop out')) {
      stopOutRecords.push(t);
    }

    if (isMistake || t.execution === 'VIOLATION' || t.tradeQuality === 'VIOLATION') {
      violationTrades.push(t);
    } else {
      cleanTrades.push(t);
    }
  }

  const cleanCore = calculateCoreMetrics(cleanTrades, 0);
  const violationCore = calculateCoreMetrics(violationTrades, 0);

  const totalTrades = allTrades.length;
  const disciplineScore =
    totalTrades > 0 ? Math.round((cleanTrades.length / totalTrades) * 100) : 100;

  // Cost of mistakes is the net negative loss strictly produced by rule violations
  const violationNegativeLoss = violationTrades
    .filter((t) => (Number(t.pnl) || 0) < 0)
    .reduce((sum, t) => sum + Math.abs(Number(t.pnl) || 0), 0);

  const largestLosses = [...allTrades]
    .filter((t) => (Number(t.pnl) || 0) < 0)
    .sort((a, b) => (Number(a.pnl) || 0) - (Number(b.pnl) || 0))
    .slice(0, 5);

  return {
    totalTrades,
    cleanTradesCount: cleanTrades.length,
    violationTradesCount: violationTrades.length,
    disciplineScore,
    cleanNetPnl: cleanCore.netPnl,
    cleanWinRate: cleanCore.winRate,
    violationNetPnl: violationCore.netPnl,
    violationWinRate: violationCore.winRate,
    costOfMistakes: Number(violationNegativeLoss.toFixed(2)),
    lotSizeViolations,
    stopOutRecords,
    largestLosses,
  };
}

/** Generate Equity Curve Point Coordinates */
export function generateEquityCurve(
  trades: Trade[],
  initialCapital = 1000
): EquityPoint[] {
  const sorted = [...trades].sort((a, b) => {
    const dtA = `${a.date}T${a.time || '00:00'}`;
    const dtB = `${b.date}T${b.time || '00:00'}`;
    return dtA.localeCompare(dtB);
  });

  let runningBalance = initialCapital;
  let peakEquity = initialCapital;
  const points: EquityPoint[] = [];

  sorted.forEach((t, i) => {
    const pnl = Number(t.pnl) || 0;
    runningBalance += pnl;

    if (runningBalance > peakEquity) {
      peakEquity = runningBalance;
    }

    const ddUsd = peakEquity - runningBalance;
    const ddPct = peakEquity > 0 ? (ddUsd / peakEquity) * 100 : 0;

    points.push({
      index: i,
      tradeNumber: t.tradeNumber || i + 1,
      date: t.date,
      time: t.time || '10:00',
      pnl,
      equity: Number(runningBalance.toFixed(2)),
      peakEquity: Number(peakEquity.toFixed(2)),
      drawdownUsd: Number(ddUsd.toFixed(2)),
      drawdownPercent: Number(ddPct.toFixed(2)),
      isViolation: isExecutionMistake(t),
      order: t.order || 'BUY',
      pair: t.pair || 'XAU/USD',
    });
  });

  return points;
}

/** Complete Intelligence Report Generator with Dual Mode Toggle */
export function generateIntelligenceReport(
  allTrades: Trade[],
  settings: AppSettings,
  mode: PerformanceMode = 'ACTUAL'
): FullIntelligenceReport {
  const initialCapital = settings?.initialCapital > 0 ? settings.initialCapital : 1000;
  const currentBalance = settings?.currentBalance != null ? settings.currentBalance : initialCapital;

  // Filter dataset according to selected Performance Mode
  const activeTrades =
    mode === 'STRATEGY'
      ? allTrades.filter((t) => !isExecutionMistake(t))
      : allTrades;

  const excludedViolationsCount = allTrades.length - activeTrades.length;

  const core = calculateCoreMetrics(activeTrades, initialCapital);
  const direction = calculateDirectionAnalysis(activeTrades);
  const time = calculateTimeAnalysis(activeTrades);
  const execution = calculateExecutionAnalysis(allTrades);
  const equityCurve = generateEquityCurve(activeTrades, initialCapital);

  return {
    mode,
    initialCapital,
    currentBalance,
    activeTradesCount: activeTrades.length,
    excludedViolationsCount,
    core,
    direction,
    time,
    execution,
    equityCurve,
    activeTrades,
  };
}

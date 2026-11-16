import { useState, useMemo } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Percent, 
  BarChart2, 
  Trophy, 
  Lightbulb, 
  Target, 
  ArrowRight,
  Calendar,
  Activity,
  ChevronDown,
  Landmark,
  Pencil,
  X
} from 'lucide-react';
import { defaultSettings, type Trade, type DayRecord, type AppSettings } from '../db/db';
import type { TabType } from './Navbar';
import { calculatePerformance, generateEquityCurve } from '../utils/TradingEngine';
import { settingsApi } from '../lib/api/settingsApi';

interface DashboardViewProps {
  trades?: Trade[];
  days?: DayRecord[];
  settings?: AppSettings;
  onSelectDate?: (dateStr: string) => void;
  onTabChange?: (tab: TabType) => void;
  onOpenQuickTrade?: () => void;
  userId?: string;
  onSettingsUpdated?: () => void;
  selectedDate?: string;
}

// Catmull-Rom to Cubic Bezier smooth path generator
function generateSmoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M 55 ${pts[0].y.toFixed(1)} L 675 ${pts[0].y.toFixed(1)}`;
  if (pts.length === 2) return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} L ${pts[1].x.toFixed(1)} ${pts[1].y.toFixed(1)}`;

  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? i : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  trades = [],
  days = [],
  settings = defaultSettings,
  onSelectDate,
  onTabChange,
  onOpenQuickTrade: _onOpenQuickTrade,
  userId,
  onSettingsUpdated,
  selectedDate,
}) => {
  const [isEditStartedOpen, setIsEditStartedOpen] = useState(false);
  const [startedInput, setStartedInput] = useState<string>('');
  const [isSavingStarted, setIsSavingStarted] = useState(false);

  const [equityTab, setEquityTab] = useState<'$ P&L' | 'R-Multiple' | '% Return' | 'Drawdown'>('$ P&L');
  const [timeframe, setTimeframe] = useState<'7D' | '30D' | '90D' | '6M' | '1Y' | 'ALL'>('ALL');
  const [quickStatsPeriod, setQuickStatsPeriod] = useState<'This Month' | 'All Time'>('This Month');
  const [hoveredPoint, setHoveredPoint] = useState<{ 
    date: string; 
    time?: string;
    pnl: number; 
    r: number; 
    balance: number; 
    roi: number; 
    x: number; 
    y: number;
  } | null>(null);
  const [hoveredDaily, setHoveredDaily] = useState<{ date: string; pnl: number; count: number } | null>(null);
  const [hoveredDrawdown, setHoveredDrawdown] = useState<{ date: string; ddPct: number; ddUsd: number } | null>(null);

  // Active Selected Date / Today's Logic
  const activeDate = selectedDate || new Date().toISOString().split('T')[0];

  const activeDateFormatted = useMemo(() => {
    try {
      const parts = activeDate.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
      }
      return activeDate;
    } catch {
      return activeDate;
    }
  }, [activeDate]);

  // Today's Trades (From Vantage or synced records)
  const todayTrades = useMemo(() => {
    return trades.filter((t) => t.date === activeDate);
  }, [trades, activeDate]);

  const todayPnl = useMemo(() => {
    return todayTrades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
  }, [todayTrades]);

  const todayWins = todayTrades.filter((t) => (Number(t.pnl) || 0) > 0.001).length;
  const todayLosses = todayTrades.filter((t) => (Number(t.pnl) || 0) < -0.001).length;
  const todayBE = todayTrades.filter((t) => Math.abs(Number(t.pnl) || 0) <= 0.001).length;
  const todayCount = todayTrades.length;

  const currSymbol = settings.currency === 'USD' ? '$' : '₹';
  const initialCapital = settings.initialCapital > 0 ? settings.initialCapital : 1000;
  const perf = calculatePerformance(trades, settings);

  const dailyTradesLimit = (settings as any)?.dailyTradesLimit || 3;
  const riskDollarPerTrade = ((settings?.riskPerTradePercent || 1) / 100) * initialCapital;
  const dailyLossLimit = Math.abs((settings as any)?.dailyLossLimit || ((settings?.dailyLossLimitR || 2) * (riskDollarPerTrade > 0 ? riskDollarPerTrade : 25)));

  const isOverLossLimit = todayPnl < -dailyLossLimit;
  const isOverTradeLimit = todayCount > dailyTradesLimit;
  const isAtTradeLimit = todayCount === dailyTradesLimit;

  let todayStatusText = 'Within Rules';
  let todayStatusBadgeClass = 'bg-[#E8F8EE] dark:bg-[#132A1C] text-[#15803D] dark:text-[#34D399] border-[#B7ECC8] dark:border-[#1E432A]';

  if (isOverLossLimit) {
    todayStatusText = 'Daily Loss Limit Hit';
    todayStatusBadgeClass = 'bg-[#FEECEB] dark:bg-[#321B1B] text-[#DC2626] dark:text-[#F87171] border-[#FBC5C2] dark:border-[#4B1E1E]';
  } else if (isOverTradeLimit) {
    todayStatusText = 'Trade Limit Exceeded';
    todayStatusBadgeClass = 'bg-[#FEECEB] dark:bg-[#321B1B] text-[#DC2626] dark:text-[#F87171] border-[#FBC5C2] dark:border-[#4B1E1E]';
  } else if (isAtTradeLimit) {
    todayStatusText = 'Daily Limit Reached';
    todayStatusBadgeClass = 'bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] border-[#E8DCC8] dark:border-[#2E384D]';
  }

  const tradeLimitPct = Math.min(100, Math.round((todayCount / dailyTradesLimit) * 100));

  // Dynamic greeting based on current local time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning, Trader';
    if (hour < 17) return 'Good Afternoon, Trader';
    return 'Good Evening, Trader';
  }, []);

  const navigate = (tab: TabType) => {
    if (onTabChange) onTabChange(tab);
  };

  // Calculate Net R and Max Drawdown R across all trades
  const netR = useMemo(() => {
    return trades.reduce((sum, t) => sum + (t.rMultiple || 0), 0);
  }, [trades]);

  const maxDrawdownR = useMemo(() => {
    const sorted = [...trades].sort((a, b) => new Date(`${a.date}T${a.time || '00:00'}`).getTime() - new Date(`${b.date}T${b.time || '00:00'}`).getTime());
    let peakR = 0;
    let maxDd = 0;
    let cumR = 0;
    for (const t of sorted) {
      cumR += (t.rMultiple || 0);
      if (cumR > peakR) peakR = cumR;
      const dd = peakR - cumR;
      if (dd > maxDd) maxDd = dd;
    }
    return maxDd;
  }, [trades]);

  // Current month & year metadata (memoized so it does not trigger re-render cascades)
  const { currentYear, currentMonthIdx, currentMonthStr, currentMonthName, daysInCurrentMonth, currentDayOfMonth } = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const monthIdx = d.getMonth();
    const monthStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
    const monthName = d.toLocaleString('en-US', { month: 'long' });
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    const dayOfMonth = d.getDate();
    return {
      currentYear: year,
      currentMonthIdx: monthIdx,
      currentMonthStr: monthStr,
      currentMonthName: monthName,
      daysInCurrentMonth: daysInMonth,
      currentDayOfMonth: dayOfMonth,
    };
  }, []);

  // Filter trades for Equity Curve by timeframe (7D, 30D, 90D, 6M, 1Y, ALL)
  const filteredTradesForCurve = useMemo(() => {
    if (trades.length === 0) return [];
    
    // Sort chronologically
    const sorted = [...trades].sort((a, b) => new Date(`${a.date}T${a.time || '00:00'}`).getTime() - new Date(`${b.date}T${b.time || '00:00'}`).getTime());
    
    if (timeframe === 'ALL') return sorted;

    const now = new Date();
    let daysAgo = 30;
    if (timeframe === '7D') daysAgo = 7;
    else if (timeframe === '30D') daysAgo = 30;
    else if (timeframe === '90D') daysAgo = 90;
    else if (timeframe === '6M') daysAgo = 180;
    else if (timeframe === '1Y') daysAgo = 365;

    const cutoff = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return sorted.filter(t => t.date && t.date >= cutoff);
  }, [trades, timeframe]);

  // Equity Curve Points & SVG geometry matching the reference screenshot (Ultra HD Glow)
  const equityChartData = useMemo(() => {
    const rawPoints = generateEquityCurve(filteredTradesForCurve, settings);

    const left = 65;
    const right = 970;
    const top = 35;
    const bottom = 270;

    if (rawPoints.length <= 1 && filteredTradesForCurve.length === 0) {
      // Empty state baseline
      return {
        hasData: false,
        points: [],
        pathD: `M ${left} 150 L ${right} 150`,
        areaD: `M ${left} 150 L ${right} 150 L ${right} ${bottom} L ${left} ${bottom} Z`,
        baselineY: 150,
        baselinePct: 50,
        peakPoint: null as any,
        troughPoint: null as any,
        yTicks: [
          { y: 40, label: equityTab === '$ P&L' ? `${currSymbol}${initialCapital + 35}` : '+2.0' },
          { y: 95, label: equityTab === '$ P&L' ? `${currSymbol}${initialCapital + 25}` : '+1.0' },
          { y: 150, label: equityTab === '$ P&L' ? `${currSymbol}${initialCapital}` : '0.0' },
          { y: 205, label: equityTab === '$ P&L' ? `${currSymbol}${initialCapital - 15}` : '-1.0' },
          { y: 260, label: equityTab === '$ P&L' ? `${currSymbol}${initialCapital - 30}` : '-2.0' },
        ],
        xLabels: [
          { label: 'Oct 1', x: left },
          { label: 'Oct 7', x: left + 225 },
          { label: 'Oct 14', x: left + 450 },
          { label: 'Oct 21', x: left + 675 },
          { label: 'Oct 31', x: right },
        ],
      };
    }

    // Extract values based on active tab
    let peakEquity = initialCapital;
    const enrichedPoints = rawPoints.map(p => {
      if (p.equity > peakEquity) peakEquity = p.equity;
      const ddPct = peakEquity > 0 ? ((peakEquity - p.equity) / peakEquity) * 100 : 0;
      let val = p.equity;
      if (equityTab === 'R-Multiple') val = p.cumulativeR;
      else if (equityTab === '% Return') val = p.returnPercent;
      else if (equityTab === 'Drawdown') val = -ddPct;
      return { ...p, ddPct, val };
    });

    const values = enrichedPoints.map(p => p.val);
    let minVal = Math.min(...values);
    let maxVal = Math.max(...values);

    // If '$ P&L', ensure initialCapital is in the range so the baseline is always cleanly framed
    if (equityTab === '$ P&L') {
      minVal = Math.min(minVal, initialCapital);
      maxVal = Math.max(maxVal, initialCapital + 20);
    } else if (equityTab === 'Drawdown') {
      maxVal = Math.max(maxVal, 0);
      minVal = Math.min(minVal, -5);
    } else {
      minVal = Math.min(minVal, 0);
      maxVal = Math.max(maxVal, 1);
    }

    if (minVal === maxVal) {
      minVal -= 20;
      maxVal += 20;
    }

    const pad = (maxVal - minVal) * 0.15;
    const paddedMin = minVal - pad;
    const paddedMax = maxVal + pad;
    const range = paddedMax - paddedMin || 1;

    const coords = enrichedPoints.map((p, idx) => {
      const x = enrichedPoints.length === 1 ? (left + right) / 2 : left + (idx / (enrichedPoints.length - 1)) * (right - left);
      const y = bottom - ((p.val - paddedMin) / range) * (bottom - top);
      return {
        ...p,
        x,
        y,
        isWin: (p.pnl || 0) > 0.001 || ((p.pnl || 0) === 0 && (p.rMultiple || 0) > 0.001),
        isLoss: (p.pnl || 0) < -0.001 || ((p.pnl || 0) === 0 && (p.rMultiple || 0) < -0.001),
        isBE: Math.abs(p.pnl || 0) <= 0.001 && Math.abs(p.rMultiple || 0) <= 0.001,
      };
    });

    const pathD = generateSmoothPath(coords);
    const lastX = coords[coords.length - 1].x;
    const firstX = coords[0].x;
    const areaD = `${pathD} L ${lastX.toFixed(1)} ${bottom} L ${firstX.toFixed(1)} ${bottom} Z`;

    // Baseline Y for starting balance line
    const baselineVal = equityTab === '$ P&L' ? initialCapital : 0;
    const baselineY = Math.max(top, Math.min(bottom, bottom - ((baselineVal - paddedMin) / range) * (bottom - top)));
    const baselinePct = Math.max(0, Math.min(100, ((baselineY - top) / (bottom - top)) * 100));

    // Find high peak point and low trough point
    let peakPoint = coords[0];
    let troughPoint = coords[0];
    coords.forEach(pt => {
      if (pt.val > peakPoint.val) peakPoint = pt;
      if (pt.val < troughPoint.val) troughPoint = pt;
    });

    // 6 Clean Y-Ticks
    const tickCount = 6;
    const yTicks = Array.from({ length: tickCount }).map((_, i) => {
      const frac = i / (tickCount - 1);
      const val = paddedMax - frac * range;
      const y = top + frac * (bottom - top);
      let label = '';
      if (equityTab === '$ P&L') {
        label = `${currSymbol}${Math.round(val)}`;
      } else if (equityTab === 'R-Multiple') {
        label = `${val >= 0 ? '+' : ''}${val.toFixed(1)}R`;
      } else if (equityTab === 'Drawdown') {
        label = `${val.toFixed(1)}%`;
      } else {
        label = `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`;
      }
      return { y, label };
    });

    // Dynamic X-axis dates from points (formatted like "Oct 1", "Oct 4", "Oct 7")
    const step = Math.max(1, Math.floor((coords.length - 1) / 7));
    const xLabels: { label: string; x: number }[] = [];
    for (let i = 0; i < coords.length; i += step) {
      const pt = coords[i];
      if (pt.date && pt.date !== 'Start') {
        const d = new Date(pt.date);
        const lbl = isNaN(d.getTime()) ? pt.date : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        xLabels.push({ label: lbl, x: pt.x });
      } else if (pt.date === 'Start') {
        const d = trades[0]?.date ? new Date(trades[0].date) : new Date();
        const lbl = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        xLabels.push({ label: lbl, x: pt.x });
      }
    }
    if (xLabels.length === 0) {
      xLabels.push({ label: 'Oct 1', x: left }, { label: 'Oct 31', x: right });
    }

    return {
      hasData: true,
      points: coords,
      pathD,
      areaD,
      baselineY,
      baselinePct,
      peakPoint,
      troughPoint,
      yTicks,
      xLabels,
    };
  }, [filteredTradesForCurve, settings, equityTab, currSymbol, initialCapital, trades]);

  // Equity Curve Header Stats & Badges
  const equityCurveStats = useMemo(() => {
    const currentEquity = perf.currentBalance;
    const netReturn = perf.netPnl;
    const netReturnPct = initialCapital > 0 ? (netReturn / initialCapital) * 100 : 0;
    
    const mTrades = trades.filter(t => t.date && t.date.startsWith(currentMonthStr));
    const mPnl = mTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const mReturnPct = initialCapital > 0 ? (mPnl / initialCapital) * 100 : 0;

    let peakEquity = initialCapital;
    let runningEquity = initialCapital;
    trades.forEach(t => {
      runningEquity += (t.pnl || 0);
      if (runningEquity > peakEquity) peakEquity = runningEquity;
    });

    return {
      currentEquity,
      netReturn,
      netReturnPct,
      monthReturnPct: mReturnPct,
      monthPnl: mPnl,
      highestEquity: peakEquity,
      totalTrades: filteredTradesForCurve.length,
    };
  }, [initialCapital, perf.netPnl, trades, currentMonthStr, filteredTradesForCurve.length]);

  // Quick stats values
  const quickStats = useMemo(() => {
    const totalCount = trades.length;
    const wr = Math.round(perf.winRate);
    const avgR = perf.averageR;
    const wins = trades.filter((t) => (t.pnl || 0) > 0.001 || ((t.pnl || 0) === 0 && (t.rMultiple || 0) > 0));
    const losses = trades.filter((t) => (t.pnl || 0) < -0.001 || ((t.pnl || 0) === 0 && (t.rMultiple || 0) < 0));
    const bigWin = wins.length > 0 ? Math.max(...wins.map((t) => t.rMultiple || 0)) : (perf.bestTrade?.rMultiple || 0);
    const bigLoss = losses.length > 0 ? Math.min(...losses.map((t) => t.rMultiple || 0)) : (perf.worstTrade && perf.worstTrade.rMultiple < 0 ? perf.worstTrade.rMultiple : 0);
    const bigWinPnl = wins.length > 0 ? Math.max(...wins.map((t) => t.pnl || 0)) : (perf.bestTrade?.pnl || 0);
    const bigLossPnl = losses.length > 0 ? Math.min(...losses.map((t) => t.pnl || 0)) : (perf.worstTrade && perf.worstTrade.pnl < 0 ? perf.worstTrade.pnl : 0);

    return {
      totalTrades: totalCount,
      winRate: wr,
      avgR,
      avgTradeTime: '1h 42m',
      biggestWin: bigWin,
      biggestLoss: bigLoss,
      biggestWinPnl: bigWinPnl,
      biggestLossPnl: bigLossPnl,
    };
  }, [trades, perf]);

  // Monthly Cycle Progress numbers (Current Month)
  const cycleProgress = useMemo(() => {
    const currentMonthDays = days.filter(d => d.date && d.date.startsWith(currentMonthStr));
    const mTrades = trades.filter(t => t.date && t.date.startsWith(currentMonthStr));

    const dayRMap = new Map<string, number>();
    mTrades.forEach(t => {
      dayRMap.set(t.date, (dayRMap.get(t.date) || 0) + (t.rMultiple || 0));
    });

    let profitableDays = 0;
    let losingDays = 0;
    let beDays = 0;
    let tradedDates = new Set<string>();

    dayRMap.forEach((r, date) => {
      tradedDates.add(date);
      if (r > 0.001) profitableDays++;
      else if (r < -0.001) losingDays++;
      else beDays++;
    });

    // Check explicitly marked no trade days
    let markedNoTradeDays = 0;
    currentMonthDays.forEach(d => {
      if (d.isNoTradeDay) {
        markedNoTradeDays++;
      }
    });

    const activeDays = profitableDays + losingDays + beDays;
    const noTradeDays = Math.max(markedNoTradeDays, Math.max(0, currentDayOfMonth - activeDays));
    const percent = activeDays > 0 ? Math.round((profitableDays / activeDays) * 100) : (trades.length > 0 ? Math.round(perf.winRate) : 0);

    return {
      percent,
      profitableDays,
      losingDays,
      beDays,
      noTradeDays,
      totalDaysPassed: currentDayOfMonth,
      daysInMonth: daysInCurrentMonth,
    };
  }, [trades, days, currentMonthStr, currentDayOfMonth, daysInCurrentMonth, perf.winRate]);

  // Recent 5 trades
  const recentTradesList = useMemo(() => {
    return [...trades]
      .sort((a, b) => new Date(`${b.date}T${b.time || '00:00'}`).getTime() - new Date(`${a.date}T${a.time || '00:00'}`).getTime())
      .slice(0, 5);
  }, [trades]);

  // Institutional Monthly Trading Calendar with Weekly P&L Data
  const calendarWeeksData = useMemo(() => {
    // Sunday is 0, matching standard TradeZella / TraderSync calendars
    const firstDayOfWeek = new Date(currentYear, currentMonthIdx, 1).getDay();
    const offset = firstDayOfWeek; // 0 = Sun, 1 = Mon...

    const daysList: { 
      day?: number; 
      dateStr?: string; 
      r?: number; 
      pnl?: number; 
      hasTrade?: boolean; 
      count?: number;
      isWin?: boolean;
      isLoss?: boolean;
      isBE?: boolean;
    }[] = [];

    for (let i = 0; i < offset; i++) {
      daysList.push({});
    }

    const dayRMap = new Map<number, number>();
    const dayPnlMap = new Map<number, number>();
    const dayCountMap = new Map<number, number>();

    trades.forEach(t => {
      if (t.date && t.date.startsWith(currentMonthStr)) {
        const d = parseInt(t.date.split('-')[2], 10);
        dayRMap.set(d, (dayRMap.get(d) || 0) + (t.rMultiple || 0));
        dayPnlMap.set(d, (dayPnlMap.get(d) || 0) + (t.pnl || 0));
        dayCountMap.set(d, (dayCountMap.get(d) || 0) + 1);
      }
    });

    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = `${currentMonthStr}-${String(d).padStart(2, '0')}`;
      const hasTrade = dayPnlMap.has(d);
      const r = dayRMap.get(d) || 0;
      const pnl = dayPnlMap.get(d) || 0;
      const count = dayCountMap.get(d) || 0;
      const isWin = hasTrade && pnl > 0.001;
      const isLoss = hasTrade && pnl < -0.001;
      const isBE = hasTrade && Math.abs(pnl) <= 0.001;
      daysList.push({ day: d, dateStr, r, pnl, hasTrade, count, isWin, isLoss, isBE });
    }

    // Pad end of list to complete the last week row
    while (daysList.length % 7 !== 0) {
      daysList.push({});
    }

    // Group days into calendar weeks
    const weeks: {
      weekIndex: number;
      days: typeof daysList;
      pnl: number;
      tradeCount: number;
      wins: number;
      losses: number;
      be: number;
      winRate: number;
    }[] = [];

    for (let i = 0; i < daysList.length; i += 7) {
      const weekDays = daysList.slice(i, i + 7);
      let pnl = 0;
      let tradeCount = 0;
      let wins = 0;
      let losses = 0;
      let be = 0;

      weekDays.forEach(d => {
        if (d.hasTrade) {
          pnl += d.pnl || 0;
          tradeCount += d.count || 0;
          if (d.isWin) wins += 1;
          else if (d.isLoss) losses += 1;
          else if (d.isBE) be += 1;
        }
      });

      const totalDecided = wins + losses;
      const winRate = totalDecided > 0 ? Math.round((wins / totalDecided) * 100) : 0;

      weeks.push({
        weekIndex: Math.floor(i / 7) + 1,
        days: weekDays,
        pnl,
        tradeCount,
        wins,
        losses,
        be,
        winRate,
      });
    }

    const maxWeeklyAbsPnl = Math.max(1, ...weeks.map(w => Math.abs(w.pnl)));

    // Calculate current winning streak for the month
    let streak = 0;
    const sortedTradingDays = daysList
      .filter(d => d.hasTrade)
      .sort((a, b) => (a.day || 0) - (b.day || 0));

    for (let i = sortedTradingDays.length - 1; i >= 0; i--) {
      const d = sortedTradingDays[i];
      if (d.isWin) {
        streak++;
      } else if (d.isBE) {
        continue;
      } else {
        break;
      }
    }

    // Month summary statistics
    const monthTrades = trades.filter(t => t.date && t.date.startsWith(currentMonthStr));
    const monthTradesCount = monthTrades.length;
    const monthPnl = monthTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const monthReturnPct = initialCapital > 0 ? (monthPnl / initialCapital) * 100 : 0;
    const monthWins = monthTrades.filter(t => (t.pnl || 0) > 0.001).length;
    const monthLosses = monthTrades.filter(t => (t.pnl || 0) < -0.001).length;
    const monthWR = monthWins + monthLosses > 0 ? Math.round((monthWins / (monthWins + monthLosses)) * 100) : 0;

    return {
      daysList,
      weeks,
      maxWeeklyAbsPnl,
      streak,
      monthTradesCount,
      monthPnl,
      monthReturnPct,
      monthWR,
    };
  }, [currentYear, currentMonthIdx, currentMonthStr, daysInCurrentMonth, trades, initialCapital]);

  const chronoTrades = useMemo(() => {
    return [...trades].sort((a, b) => new Date(`${a.date}T${a.time || '00:00'}`).getTime() - new Date(`${b.date}T${b.time || '00:00'}`).getTime());
  }, [trades]);

  // Win/Loss Breakdown stats
  const winningTrades = useMemo(() => trades.filter((t) => (t.pnl || 0) > 0.001), [trades]);
  const losingTrades = useMemo(() => trades.filter((t) => (t.pnl || 0) < -0.001), [trades]);
  const beTrades = useMemo(() => trades.filter((t) => Math.abs(t.pnl || 0) <= 0.001), [trades]);
  const totalGrossProfit = useMemo(() => winningTrades.reduce((acc, t) => acc + (t.pnl || 0), 0), [winningTrades]);
  const totalGrossLoss = useMemo(() => Math.abs(losingTrades.reduce((acc, t) => acc + (t.pnl || 0), 0)), [losingTrades]);
  const avgWin = winningTrades.length > 0 ? totalGrossProfit / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? totalGrossLoss / losingTrades.length : 0;
  const winLossRatio = losingTrades.length > 0
    ? (winningTrades.length / losingTrades.length).toFixed(2) + ' : 1'
    : winningTrades.length > 0
    ? '∞ : 1'
    : '0.00 : 1';

  // 1. Daily P&L Data (aggregating trades by date)
  const allDailyData = useMemo(() => {
    const map = new Map<string, { pnl: number; count: number }>();
    chronoTrades.forEach((t) => {
      if (!t.date) return;
      const cur = map.get(t.date) || { pnl: 0, count: 0 };
      cur.pnl += (t.pnl || 0);
      cur.count += 1;
      map.set(t.date, cur);
    });

    return Array.from(map.entries())
      .map(([date, data]) => ({
        date,
        label: date.split('-').slice(1).join('/'),
        pnl: Number(data.pnl.toFixed(2)),
        count: data.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [chronoTrades]);

  // 2. Drawdown Underwater Data
  const allDrawdownData = useMemo(() => {
    const pts: { date: string; ddPct: number; ddUsd: number }[] = [];
    let currentEquity = initialCapital;
    let peakEquity = initialCapital;

    pts.push({ date: 'Start', ddPct: 0, ddUsd: 0 });

    chronoTrades.forEach((t) => {
      currentEquity += (t.pnl || 0);
      if (currentEquity > peakEquity) peakEquity = currentEquity;
      const ddUsd = peakEquity - currentEquity;
      const ddPct = peakEquity > 0 ? (ddUsd / peakEquity) * 100 : 0;
      pts.push({
        date: t.date,
        ddPct: Number(ddPct.toFixed(2)),
        ddUsd: Number(ddUsd.toFixed(2)),
      });
    });

    return pts;
  }, [chronoTrades, initialCapital]);

  // 3. Daily SVG Data
  const dailySvgData = useMemo(() => {
    const W = 520;
    const H = 190;
    const L = 45;
    const R = 15;
    const T = 15;
    const B = 28;
    const iw = W - L - R;
    const ih = H - T - B;

    const items = allDailyData.slice(-30);
    const vals = items.map((a) => a.pnl);
    let min = Math.min(0, ...vals);
    let max = Math.max(0, ...vals);
    if (min === 0 && max === 0) {
      min = -50;
      max = 50;
    }
    const pad = (max - min) * 0.15 || 10;
    min -= pad;
    max += pad;

    const getY = (v: number) => T + ((max - v) / (max - min)) * ih;
    const baselineY = getY(0);
    const step = items.length > 0 ? iw / items.length : iw;
    const bw = Math.max(4, Math.min(24, step * 0.58));

    const gridLevels = [0, 1, 2].map((stepIdx) => {
      const v = min + ((max - min) * stepIdx) / 2;
      const y = getY(v);
      const label = Math.abs(v) >= 1000
        ? `${v < 0 ? '-' : ''}${currSymbol}${(Math.abs(v) / 1000).toFixed(1)}k`
        : `${v < 0 ? '-' : ''}${currSymbol}${Math.round(Math.abs(v))}`;
      return { y, label };
    });

    const bars = items.map((item, i) => {
      const x = L + step * i + step / 2 - bw / 2;
      const y = getY(item.pnl);
      const height = Math.max(2, Math.abs(baselineY - y));
      const barY = Math.min(y, baselineY);
      return {
        item,
        x,
        y: barY,
        width: bw,
        height,
        isPositive: item.pnl >= 0,
      };
    });

    return { W, H, L, R, T, B, baselineY, gridLevels, bars };
  }, [allDailyData, currSymbol]);

  // 6. Drawdown SVG Data
  const drawdownSvgData = useMemo(() => {
    const W = 520;
    const H = 190;
    const L = 45;
    const R = 15;
    const T = 15;
    const B = 28;
    const iw = W - L - R;
    const ih = H - T - B;

    const pts = allDrawdownData;
    const maxDdPct = Math.max(0.1, ...pts.map((p) => p.ddPct));
    const maxScale = Math.max(5, Math.ceil(maxDdPct * 1.25));

    const getX = (i: number) => L + (i * iw) / Math.max(1, pts.length - 1);
    const getY = (pct: number) => T + (pct / maxScale) * ih;

    const gridLevels = [0, 0.5, 1].map((ratio) => {
      const pct = maxScale * ratio;
      const y = getY(pct);
      const label = `-${pct.toFixed(0)}%`;
      return { y, label };
    });

    const pathD = pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(p.ddPct).toFixed(1)}`)
      .join(' ');

    const areaD = pts.length > 0
      ? `${pathD} L ${getX(pts.length - 1).toFixed(1)} ${T} L ${getX(0).toFixed(1)} ${T} Z`
      : '';

    return { W, H, L, R, T, B, gridLevels, pathD, areaD, pts, getX, getY };
  }, [allDrawdownData]);

  // Donut circumference
  const donutRadius = 43;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const winArcLength = (perf.winRate / 100) * donutCircumference;

  return (
    <div className="space-y-4 animate-fade-in pb-12 text-[#1F1A16] dark:text-[#F0F4F8] font-sans selection:bg-[#DB9F35]/30 transition-colors">
      
      {/* 1. Greeting Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 pb-1">
        <div className="flex items-center gap-3">
          <span className="text-3xl select-none" role="img" aria-label="Waving hand">
            👋
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#1F1A16] dark:text-[#F0F4F8]">
              {greeting}
            </h1>
            <p className="text-xs text-[#786F66] dark:text-[#94A3B8] font-medium tracking-tight">
              Track. Analyze. Improve. Repeat.
            </p>
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <p className="text-xs text-[#786F66] dark:text-[#94A3B8] italic font-serif leading-snug">
            “Better decisions today, stronger results tomorrow.”
          </p>
          <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] tracking-wider block uppercase mt-0.5">
            — TradeFlow
          </span>
        </div>
      </div>

      {/* 2. Today's Trading Status Card (Dynamic on Daily Vantage Trade Basis) */}
      <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E7E0D6]/60 dark:border-[#242D3D] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E8F8EE] dark:bg-[#132A1C] text-[#10B981] flex items-center justify-center border border-[#10B981]/20">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                  Today's Trading Status
                </h3>
                <span className="text-[11px] font-mono text-[#786F66] dark:text-[#94A3B8]">
                  ({activeDateFormatted})
                </span>
              </div>
              <p className="text-[11px] text-[#786F66] dark:text-[#94A3B8]">
                Daily Vantage execution limits &amp; rule adherence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${todayStatusBadgeClass}`}>
              ● {todayStatusText}
            </span>
            <button
              type="button"
              onClick={() => onTabChange?.('journal')}
              className="text-xs font-bold text-[#DB9F35] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View in Journal</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Progress Bar & Trades Taken Callout (As shown in reference image) */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <div className="text-2xl sm:text-3xl font-black font-mono text-[#1F1A16] dark:text-[#F0F4F8]">
              {todayCount} / {dailyTradesLimit} Trades
            </div>
            <span className="text-xs font-mono font-bold text-[#786F66] dark:text-[#94A3B8]">
              {tradeLimitPct}% of Daily Cap
            </span>
          </div>

          {/* Clean Progress Bar */}
          <div className="w-full h-2.5 rounded-full bg-[#E7E0D6] dark:bg-[#242D3D] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isOverTradeLimit || isOverLossLimit
                  ? 'bg-[#DC2626]'
                  : isAtTradeLimit
                  ? 'bg-[#DB9F35]'
                  : 'bg-[#10B981]'
              }`}
              style={{ width: `${tradeLimitPct}%` }}
            />
          </div>

          <p className="text-xs text-[#786F66] dark:text-[#94A3B8]">
            {todayCount === 0
              ? 'No trades executed yet for this date. Follow your A+ setup rules when entering.'
              : todayCount < dailyTradesLimit
              ? `${dailyTradesLimit - todayCount} trade${dailyTradesLimit - todayCount === 1 ? '' : 's'} remaining under your daily limit.`
              : todayCount === dailyTradesLimit
              ? 'Daily trade limit reached. Protect profits and preserve mental capital.'
              : `Limit exceeded by ${todayCount - dailyTradesLimit} trade(s). Step away to prevent overtrading.`}
          </p>
        </div>

        {/* 4 Overview Mini-Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          {/* Today's P&L */}
          <div className="bg-white dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] rounded-xl p-3">
            <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase block">
              Today's P&L
            </span>
            <span className={`text-base sm:text-lg font-black font-mono block mt-0.5 ${
              todayPnl > 0.001 ? 'text-[#10B981]' : todayPnl < -0.001 ? 'text-[#DC2626]' : 'text-[#786F66] dark:text-[#94A3B8]'
            }`}>
              {todayPnl > 0.001 ? '+' : ''}{currSymbol}{todayPnl.toFixed(2)}
            </span>
            <span className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">
              {todayCount > 0 ? `${todayWins}W / ${todayLosses}L` : '0 Trades'}
            </span>
          </div>

          {/* Trades Taken */}
          <div className="bg-white dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] rounded-xl p-3">
            <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase block">
              Trades Taken
            </span>
            <span className="text-base sm:text-lg font-black font-mono text-[#1F1A16] dark:text-[#F0F4F8] block mt-0.5">
              {todayCount}
            </span>
            <span className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">
              Cap: max {dailyTradesLimit}/day
            </span>
          </div>

          {/* Winning / Losing Trades */}
          <div className="bg-white dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] rounded-xl p-3">
            <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase block">
              Win / Loss Split
            </span>
            <div className="text-sm sm:text-base font-black font-mono flex items-center gap-1.5 mt-0.5">
              <span className="text-[#10B981]">{todayWins}W</span>
              <span className="text-[#786F66] dark:text-[#94A3B8] font-normal">/</span>
              <span className="text-[#DC2626]">{todayLosses}L</span>
              {todayBE > 0 && <span className="text-[#DB9F35] text-xs">({todayBE}BE)</span>}
            </div>
            <span className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">
              Win Rate: {todayCount > 0 ? Math.round((todayWins / todayCount) * 100) : 0}%
            </span>
          </div>

          {/* Daily Loss Limit */}
          <div className="bg-white dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] rounded-xl p-3">
            <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase block">
              Daily Loss Limit
            </span>
            <span className={`text-base sm:text-lg font-black font-mono block mt-0.5 ${
              isOverLossLimit ? 'text-[#DC2626]' : 'text-[#1F1A16] dark:text-[#F0F4F8]'
            }`}>
              {currSymbol}{Math.abs(Math.min(0, todayPnl)).toFixed(2)}
              <span className="text-[11px] font-normal text-[#786F66] dark:text-[#94A3B8]"> / -{currSymbol}{dailyLossLimit}</span>
            </span>
            <span className={`text-[10px] font-semibold ${isOverLossLimit ? 'text-[#DC2626]' : 'text-[#10B981]'}`}>
              {isOverLossLimit ? 'Exceeded Limit' : `${currSymbol}${(dailyLossLimit - Math.abs(Math.min(0, todayPnl))).toFixed(2)} Buffer`}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Top 6 KPI Metric Cards (Symmetrical Grid with Uniform Height & Width) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        
        {/* Card 1: CURRENT BALANCE */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 sm:p-4.5 shadow-2xs hover:shadow-md hover:border-[#DB9F35]/40 dark:hover:border-[#DB9F35]/30 transition-all duration-200 flex flex-col justify-between min-h-[128px] sm:min-h-[136px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider truncate">
              CURRENT BALANCE
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center shadow-2xs shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-black font-mono text-[#1F1A16] dark:text-[#F0F4F8] tracking-tight truncate leading-tight" title={`${currSymbol}${perf.currentBalance.toFixed(2)}`}>
              {currSymbol}{perf.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono pt-1.5 border-t border-[#E7E0D6]/60 dark:border-[#242D3D]/80">
            <span className={`font-bold flex items-center gap-0.5 ${perf.netPnl >= 0 ? 'text-[#15803D] dark:text-[#10B981]' : 'text-[#DC2626] dark:text-[#EF4444]'}`}>
              {perf.netPnl >= 0 ? '↑ +' : '↓ -'}{currSymbol}{Math.abs(perf.netPnl).toFixed(2)}
            </span>
            <span className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">
              Live Equity
            </span>
          </div>
        </div>

        {/* Card 2: STARTED BALANCE (Manual Capital) */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 sm:p-4.5 shadow-2xs hover:shadow-md hover:border-[#DB9F35]/40 dark:hover:border-[#DB9F35]/30 transition-all duration-200 flex flex-col justify-between min-h-[128px] sm:min-h-[136px] group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider truncate">
              STARTED BALANCE
            </span>
            <button
              type="button"
              onClick={() => {
                setStartedInput(String(initialCapital));
                setIsEditStartedOpen(true);
              }}
              className="w-8 h-8 rounded-xl bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] hover:bg-[#DB9F35] hover:text-white flex items-center justify-center shadow-2xs transition-all cursor-pointer shrink-0"
              title="Click to manually update Started Balance"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-black font-mono text-[#1F1A16] dark:text-[#F0F4F8] tracking-tight truncate leading-tight" title={`${currSymbol}${initialCapital.toFixed(2)}`}>
              {currSymbol}{initialCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono pt-1.5 border-t border-[#E7E0D6]/60 dark:border-[#242D3D]/80">
            <span className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">Base Capital</span>
            <button
              type="button"
              onClick={() => {
                setStartedInput(String(initialCapital));
                setIsEditStartedOpen(true);
              }}
              className="font-bold text-[#DB9F35] hover:underline cursor-pointer text-[10px]"
            >
              Edit
            </button>
          </div>
        </div>

        {/* Card 3: NET P&L */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 sm:p-4.5 shadow-2xs hover:shadow-md hover:border-[#DB9F35]/40 dark:hover:border-[#DB9F35]/30 transition-all duration-200 flex flex-col justify-between min-h-[128px] sm:min-h-[136px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider truncate">
              NET P&amp;L
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center shadow-2xs shrink-0">
              <BarChart2 className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight truncate leading-tight ${
              perf.netPnl >= 0 ? 'text-[#15803D] dark:text-[#10B981]' : 'text-[#DC2626] dark:text-[#EF4444]'
            }`} title={`${perf.netPnl >= 0 ? '+' : '-'}${currSymbol}${Math.abs(perf.netPnl).toFixed(2)}`}>
              {perf.netPnl >= 0 ? '+' : '-'}{currSymbol}{Math.abs(perf.netPnl).toFixed(2)}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono pt-1.5 border-t border-[#E7E0D6]/60 dark:border-[#242D3D]/80">
            <span className={`font-bold ${netR >= 0 ? 'text-[#15803D] dark:text-[#10B981]' : 'text-[#DC2626] dark:text-[#EF4444]'}`}>
              {netR >= 0 ? '+' : ''}{netR.toFixed(1)}R
            </span>
            <span className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">
              {perf.netPnl >= 0 ? '+' : ''}{(initialCapital > 0 ? (perf.netPnl / initialCapital) * 100 : 0).toFixed(1)}% Return
            </span>
          </div>
        </div>

        {/* Card 4: WIN RATE */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 sm:p-4.5 shadow-2xs hover:shadow-md hover:border-[#DB9F35]/40 dark:hover:border-[#DB9F35]/30 transition-all duration-200 flex flex-col justify-between min-h-[128px] sm:min-h-[136px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider truncate">
              WIN RATE
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center shadow-2xs shrink-0">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2 flex items-center justify-between">
            <div className="text-xl sm:text-2xl font-black font-mono text-[#1F1A16] dark:text-[#F0F4F8] leading-tight">
              {trades.length > 0 ? Math.round(perf.winRate) : 0}%
            </div>
            <div className="relative w-7 h-7 shrink-0">
              <svg className="w-7 h-7 -rotate-90" viewBox="0 0 36 36">
                <path className="text-[#E7E0D6] dark:text-[#242D3D]" stroke="currentColor" strokeWidth="4.5" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="text-[#10B981]" stroke="currentColor" strokeWidth="4.5" strokeDasharray={`${trades.length > 0 ? perf.winRate : 0}, 100`} strokeLinecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono pt-1.5 border-t border-[#E7E0D6]/60 dark:border-[#242D3D]/80">
            <span className="font-bold text-[#15803D] dark:text-[#10B981]">
              {perf.winningTrades}W <span className="text-[#DC2626] dark:text-[#EF4444]">{perf.losingTrades}L</span>
            </span>
            <span className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">
              {perf.breakEvenTrades} BE
            </span>
          </div>
        </div>

        {/* Card 5: PROFIT FACTOR */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 sm:p-4.5 shadow-2xs hover:shadow-md hover:border-[#DB9F35]/40 dark:hover:border-[#DB9F35]/30 transition-all duration-200 flex flex-col justify-between min-h-[128px] sm:min-h-[136px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider truncate">
              PROFIT FACTOR
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center shadow-2xs shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-black font-mono text-[#1F1A16] dark:text-[#F0F4F8] tracking-tight truncate leading-tight">
              {trades.length > 0 ? (perf.profitFactor > 99 ? '∞' : perf.profitFactor.toFixed(2)) : '0.00'}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono pt-1.5 border-t border-[#E7E0D6]/60 dark:border-[#242D3D]/80">
            <span className={`font-bold ${perf.expectancyUsd >= 0 ? 'text-[#15803D] dark:text-[#10B981]' : 'text-[#DC2626] dark:text-[#EF4444]'}`}>
              {trades.length > 0 ? `${perf.expectancyUsd >= 0 ? '+' : '-'}${currSymbol}${Math.abs(perf.expectancyUsd).toFixed(1)}` : `${currSymbol}0.0`}
            </span>
            <span className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">
              {trades.length > 0 ? `${perf.expectancy >= 0 ? '+' : ''}${perf.expectancy.toFixed(1)}R` : '0.0R'} Exp
            </span>
          </div>
        </div>

        {/* Card 6: MAX DRAWDOWN */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 sm:p-4.5 shadow-2xs hover:shadow-md hover:border-[#DC2626]/40 dark:hover:border-[#DC2626]/30 transition-all duration-200 flex flex-col justify-between min-h-[128px] sm:min-h-[136px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider truncate">
              MAX DRAWDOWN
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FEECEB] dark:bg-[#321B1B] text-[#DC2626] flex items-center justify-center shadow-2xs shrink-0">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-xl sm:text-2xl font-black font-mono text-[#DC2626] tracking-tight truncate leading-tight">
              -{currSymbol}{perf.maxDrawdownUsd.toFixed(2)}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono pt-1.5 border-t border-[#E7E0D6]/60 dark:border-[#242D3D]/80">
            <span className="font-bold text-[#DC2626]">
              -{perf.maxDrawdownPercent.toFixed(1)}%
            </span>
            <span className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">
              {maxDrawdownR > 0 ? `-${maxDrawdownR.toFixed(1)}R` : '0.0R'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Ultra HD Glowing Line Equity Curve (Theme-Aligned Fintech Visuals) */}
      <div className="w-full bg-[#FAF6EE] dark:bg-[#131822] text-[#1F1A16] dark:text-[#F0F4F8] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xs space-y-4 transition-all">
        {/* Header: Title & Subtitle on Left, 4 Metric Stats on Right */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E8F8EE] dark:bg-[#132A1C] border border-[#B7ECC8] dark:border-[#10B981]/30 flex items-center justify-center text-[#15803D] dark:text-[#10B981] shadow-2xs shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-[#1F1A16] dark:text-[#F0F4F8] tracking-tight">
                  Equity Curve
                </h3>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[#E8F8EE] dark:bg-[#10B981]/10 text-[#15803D] dark:text-[#10B981] border border-[#B7ECC8] dark:border-[#10B981]/30">
                  4K • RETINA ULTRA-HD
                </span>
              </div>
              <p className="text-xs text-[#786F66] dark:text-[#94A3B8] mt-0.5">
                Cumulative account performance trajectory across all closed positions
              </p>
            </div>
          </div>

          {/* 4 Top Stat Badges matching Image 1 */}
          <div className="flex items-center flex-wrap gap-4 sm:gap-6">
            <div>
              <div className="text-lg sm:text-xl font-black font-mono text-[#1F1A16] dark:text-[#F0F4F8] leading-tight">
                {currSymbol}{equityCurveStats.currentEquity.toFixed(2)}
              </div>
              <div className="text-[11px] font-semibold text-[#786F66] dark:text-[#94A3B8] mt-0.5">
                Current Equity
              </div>
            </div>

            <div className="border-l border-[#E7E0D6] dark:border-[#242D3D] pl-4 sm:pl-6">
              <div className={`text-lg sm:text-xl font-black font-mono leading-tight ${equityCurveStats.netReturn >= 0 ? 'text-[#15803D] dark:text-[#10B981]' : 'text-[#DC2626] dark:text-[#EF4444]'}`}>
                {equityCurveStats.netReturn >= 0 ? '+' : '-'}{currSymbol}{Math.abs(equityCurveStats.netReturn).toFixed(2)}
              </div>
              <div className={`text-[11px] font-bold font-mono mt-0.5 ${equityCurveStats.netReturn >= 0 ? 'text-[#15803D] dark:text-[#10B981]' : 'text-[#DC2626] dark:text-[#EF4444]'}`}>
                Net Return ({equityCurveStats.netReturnPct >= 0 ? '+' : ''}{equityCurveStats.netReturnPct.toFixed(1)}%)
              </div>
            </div>

            <div className="border-l border-[#E7E0D6] dark:border-[#242D3D] pl-4 sm:pl-6">
              <div className={`text-lg sm:text-xl font-black font-mono leading-tight ${equityCurveStats.monthReturnPct >= 0 ? 'text-[#15803D] dark:text-[#10B981]' : 'text-[#DC2626] dark:text-[#EF4444]'}`}>
                {equityCurveStats.monthReturnPct >= 0 ? '+' : ''}{equityCurveStats.monthReturnPct.toFixed(2)}%
              </div>
              <div className="text-[11px] font-semibold text-[#786F66] dark:text-[#94A3B8] mt-0.5">
                This Month
              </div>
            </div>

            <div className="border-l border-[#E7E0D6] dark:border-[#242D3D] pl-4 sm:pl-6">
              <div className="text-lg sm:text-xl font-black font-mono text-[#1F1A16] dark:text-[#F0F4F8] leading-tight">
                {trades.length}
              </div>
              <div className="text-[11px] font-semibold text-[#786F66] dark:text-[#94A3B8] mt-0.5">
                Total Trades
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls Row: Timeframe Pills on Left, Metrics on Right */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-1">
          {/* Timeframe Pills: 7D, 30D, 90D, 6M, 1Y, ALL */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['7D', '30D', '90D', '6M', '1Y', 'ALL'] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  timeframe === tf
                    ? 'bg-[#E8F8EE] dark:bg-[#10B981]/20 border border-[#10B981] text-[#15803D] dark:text-[#10B981] shadow-2xs'
                    : 'bg-white dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] text-[#786F66] dark:text-[#94A3B8] hover:text-[#1F1A16] dark:hover:text-white hover:bg-[#F2ECE0] dark:hover:bg-[#242D3D]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Right side: Metric Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['$ P&L', 'R-Multiple', '% Return', 'Drawdown'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setEquityTab(tab)}
                className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  equityTab === tab
                    ? 'bg-[#E8F8EE] dark:bg-[#10B981]/20 border border-[#10B981] text-[#15803D] dark:text-[#10B981] shadow-2xs'
                    : 'bg-white dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] text-[#786F66] dark:text-[#94A3B8] hover:text-[#1F1A16] dark:hover:text-white hover:bg-[#F2ECE0] dark:hover:bg-[#242D3D]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Ultra HD Glowing SVG Curve Area (1000 x 320) */}
        <div className="relative pt-2 pb-1 w-full overflow-visible z-10">
          <svg 
            className="w-full h-auto block" 
            viewBox="0 0 1000 320" 
            shapeRendering="geometricPrecision" 
            textRendering="geometricPrecision"
          >
            <defs>
              {/* Ultra HD Glow Filter */}
              <filter id="neonGlowUltra" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Dynamic Line Color Gradient transitioning at baseline */}
              <linearGradient id="neonLineGrad" x1="0" y1="0" x2="0" y2="100%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset={`${Math.max(0, equityChartData.baselinePct - 3)}%`} stopColor="#10B981" />
                <stop offset={`${Math.min(100, equityChartData.baselinePct + 3)}%`} stopColor="#EF4444" />
                <stop offset="100%" stopColor="#EF4444" />
              </linearGradient>

              {/* Profit Area Green Gradient */}
              <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="100%">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.00" />
              </linearGradient>

              {/* Drawdown Area Red Gradient */}
              <linearGradient id="drawdownGrad" x1="0" y1="0" x2="0" y2="100%">
                <stop offset="0%" stopColor="#EF4444" stopOpacity="0.00" />
                <stop offset="100%" stopColor="#EF4444" stopOpacity="0.22" />
              </linearGradient>
            </defs>

            {/* Micro Horizontal Gridlines & Y-Axis Labels on Left */}
            {equityChartData.yTicks.map((grid, i) => (
              <g key={i}>
                <line 
                  x1="65" 
                  y1={grid.y} 
                  x2="970" 
                  y2={grid.y} 
                  stroke="currentColor"
                  strokeDasharray="2 4" 
                  strokeWidth="1" 
                  className="text-[#E7E0D6] dark:text-[#242D3D]"
                />
                <text 
                  x="15" 
                  y={grid.y + 3.5} 
                  className="fill-[#786F66] dark:fill-[#8290A8] text-[10px] font-mono"
                >
                  {grid.label}
                </text>
              </g>
            ))}

            {/* Starting Balance Dashed Baseline Line */}
            {equityTab === '$ P&L' && equityChartData.baselineY >= 35 && equityChartData.baselineY <= 270 && (
              <g>
                <line
                  x1="65"
                  y1={equityChartData.baselineY}
                  x2="970"
                  y2={equityChartData.baselineY}
                  stroke="currentColor"
                  strokeDasharray="4 4"
                  strokeWidth="1.2"
                  className="text-[#786F66] dark:text-[#64748B]"
                  opacity="0.6"
                />
              </g>
            )}

            {/* Gradient Area Fill (Profit Area) */}
            <path
              d={equityChartData.areaD}
              fill="url(#profitGrad)"
            />

            {/* Layer 1: Outer Neon Glow Halo */}
            <path
              d={equityChartData.pathD}
              fill="none"
              stroke="url(#neonLineGrad)"
              strokeWidth="7"
              opacity="0.25"
              filter="url(#neonGlowUltra)"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Layer 2: Mid Neon Glow Path */}
            <path
              d={equityChartData.pathD}
              fill="none"
              stroke="url(#neonLineGrad)"
              strokeWidth="4.5"
              opacity="0.6"
              filter="url(#neonGlowUltra)"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Layer 3: Ultra-Sharp Core Laser Curve */}
            <path
              d={equityChartData.pathD}
              fill="none"
              stroke="url(#neonLineGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Vertical Cursor Tracking Line */}
            {hoveredPoint && (
              <line
                x1={hoveredPoint.x}
                y1={hoveredPoint.y}
                x2={hoveredPoint.x}
                y2={270}
                stroke="#10B981"
                strokeDasharray="3 3"
                strokeWidth="1.5"
                opacity="0.6"
              />
            )}

            {/* High Peak Callout Bubble (matching Image 1) */}
            {equityChartData.peakPoint && equityChartData.hasData && (
              <g className="cursor-pointer" onClick={() => onSelectDate?.(equityChartData.peakPoint.date)}>
                {/* Glowing Green Pin */}
                <circle
                  cx={equityChartData.peakPoint.x}
                  cy={equityChartData.peakPoint.y}
                  r="7"
                  fill="#10B981"
                  fillOpacity="0.25"
                  className="animate-ping"
                />
                <circle
                  cx={equityChartData.peakPoint.x}
                  cy={equityChartData.peakPoint.y}
                  r="5"
                  fill="#10B981"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
                {/* Callout Bubble */}
                <g transform={`translate(${Math.max(70, Math.min(920, equityChartData.peakPoint.x))}, ${Math.max(42, equityChartData.peakPoint.y - 12)})`}>
                  <rect
                    x="-44"
                    y="-34"
                    width="88"
                    height="30"
                    rx="8"
                    className="fill-white dark:fill-[#08140F] stroke-[#10B981]"
                    strokeWidth="1.2"
                    filter="url(#neonGlowUltra)"
                  />
                  <text x="0" y="-19" textAnchor="middle" className="fill-[#786F66] dark:fill-[#94A3B8]" fontSize="8.5" fontFamily="monospace">
                    {equityChartData.peakPoint.date}
                  </text>
                  <text x="0" y="-8" textAnchor="middle" className="fill-[#15803D] dark:fill-[#00FF88]" fontSize="10.5" fontWeight="bold" fontFamily="monospace">
                    {currSymbol}{equityChartData.peakPoint.val.toFixed(2)} (High)
                  </text>
                </g>
              </g>
            )}

            {/* Low Trough Callout Bubble (matching Image 1, shown if trough in drawdown) */}
            {equityChartData.troughPoint && equityChartData.hasData && equityChartData.troughPoint.val < (equityTab === '$ P&L' ? initialCapital : 0) && (
              <g className="cursor-pointer" onClick={() => onSelectDate?.(equityChartData.troughPoint.date)}>
                {/* Glowing Red Pin */}
                <circle
                  cx={equityChartData.troughPoint.x}
                  cy={equityChartData.troughPoint.y}
                  r="7"
                  fill="#DC2626"
                  fillOpacity="0.25"
                  className="animate-ping"
                />
                <circle
                  cx={equityChartData.troughPoint.x}
                  cy={equityChartData.troughPoint.y}
                  r="5"
                  fill="#DC2626"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
                {/* Callout Bubble */}
                <g transform={`translate(${Math.max(70, Math.min(920, equityChartData.troughPoint.x))}, ${Math.min(265, equityChartData.troughPoint.y + 12)})`}>
                  <rect
                    x="-44"
                    y="4"
                    width="88"
                    height="30"
                    rx="8"
                    className="fill-white dark:fill-[#1A0A0C] stroke-[#DC2626]"
                    strokeWidth="1.2"
                    filter="url(#neonGlowUltra)"
                  />
                  <text x="0" y="19" textAnchor="middle" className="fill-[#786F66] dark:fill-[#94A3B8]" fontSize="8.5" fontFamily="monospace">
                    {equityChartData.troughPoint.date}
                  </text>
                  <text x="0" y="30" textAnchor="middle" className="fill-[#DC2626] dark:fill-[#FF3B30]" fontSize="10.5" fontWeight="bold" fontFamily="monospace">
                    {currSymbol}{equityChartData.troughPoint.val.toFixed(2)} (Low)
                  </text>
                </g>
              </g>
            )}

            {/* Invisible Hit Zones for Hover Tracking */}
            {equityChartData.points.map((pt, idx) => (
              <g
                key={`pt-hit-${idx}`}
                className="cursor-pointer"
                onMouseEnter={() =>
                  setHoveredPoint({
                    date: pt.date,
                    time: pt.time,
                    pnl: pt.pnl,
                    r: pt.rMultiple,
                    balance: pt.equity,
                    roi: pt.returnPercent,
                    x: pt.x,
                    y: pt.y,
                  })
                }
                onMouseLeave={() => setHoveredPoint(null)}
                onClick={() => onSelectDate?.(pt.date)}
              >
                <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />
              </g>
            ))}
          </svg>

          {/* Interactive Floating Hover Tooltip (Smart vertical flip so it is NEVER clipped at the top) */}
          {hoveredPoint && (() => {
            const isNearTop = hoveredPoint.y < 120; // top 37.5% of chart
            const topPct = (hoveredPoint.y / 320) * 100;
            const leftPct = Math.max(16, Math.min(84, (hoveredPoint.x / 1000) * 100));

            return (
              <div 
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  transform: isNearTop ? 'translate(-50%, 14px)' : 'translate(-50%, -100%)',
                }}
                className="absolute pointer-events-none bg-white dark:bg-[#0B0F17] rounded-xl p-3 text-xs shadow-2xl border border-[#E7E0D6] dark:border-[#242D3D] z-50 min-w-[145px] text-[#1F1A16] dark:text-white transition-transform duration-75"
              >
                <div className="text-[10px] text-[#786F66] dark:text-[#94A3B8] font-mono">
                  {hoveredPoint.date} {hoveredPoint.time ? `· ${hoveredPoint.time}` : ''}
                </div>
                <div className="text-sm font-black font-mono text-[#1F1A16] dark:text-white mt-0.5">
                  {currSymbol}{hoveredPoint.balance.toFixed(2)}
                </div>
                <div className={`text-[10px] font-mono font-bold mt-0.5 ${
                  hoveredPoint.pnl >= 0 ? 'text-[#15803D] dark:text-[#00FF88]' : 'text-[#DC2626] dark:text-[#FF3B30]'
                }`}>
                  {hoveredPoint.pnl >= 0 ? '+' : '-'}{currSymbol}{Math.abs(hoveredPoint.pnl).toFixed(2)} ({hoveredPoint.roi >= 0 ? '+' : ''}{hoveredPoint.roi.toFixed(1)}%)
                </div>
              </div>
            );
          })()}

          {/* Empty state overlay if no trades */}
          {!equityChartData.hasData && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
              <div className="p-2.5 rounded-full bg-[#FAF2E6] dark:bg-white/5 text-[#DB9F35] mb-2">
                <Activity className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-[#1F1A16] dark:text-white">
                No trades recorded for this timeframe
              </p>
              <p className="text-[11px] text-[#786F66] dark:text-[#94A3B8] mt-0.5 max-w-xs">
                Log your trades in the Trading Journal or sync Vantage to visualize your equity curve.
              </p>
            </div>
          )}
        </div>

        {/* X-Axis Dates */}
        <div className="flex justify-between px-16 text-[10px] font-mono text-[#786F66] dark:text-[#8290A8] border-t border-[#E7E0D6] dark:border-[#242D3D] pt-2.5">
          {equityChartData.xLabels.map((lbl, i) => (
            <span key={i}>{lbl.label}</span>
          ))}
        </div>

        {/* Footer Strip: Legend on Left, Badges on Right */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#E7E0D6] dark:border-[#242D3D]">
          {/* Legend Items */}
          <div className="flex items-center flex-wrap gap-4 text-xs font-medium text-[#786F66] dark:text-[#94A3B8]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-xs" />
              <span className="text-[#1F1A16] dark:text-white text-[11px] font-semibold">Equity (Cumulative P&amp;L)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 border-b-2 border-dashed border-[#786F66] dark:border-[#94A3B8]" />
              <span className="text-[11px]">Starting Balance ({currSymbol}{initialCapital.toFixed(2)})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#10B981]/25 border border-[#10B981]" />
              <span className="text-[11px]">Profit Area</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#DC2626]/20 border border-[#DC2626]" />
              <span className="text-[11px]">Drawdown Area</span>
            </div>
          </div>

          {/* Badges on Right */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#081711] border border-[#B7ECC8] dark:border-[#10B981]/40 shadow-2xs">
              <div className="w-5 h-5 rounded-full bg-[#E8F8EE] dark:bg-[#10B981]/20 text-[#15803D] dark:text-[#00FF88] flex items-center justify-center text-xs font-bold">
                ↗
              </div>
              <div>
                <div className="text-[9px] text-[#786F66] dark:text-[#94A3B8] leading-none">Highest Equity</div>
                <div className="text-xs font-black font-mono text-[#15803D] dark:text-[#00FF88] mt-0.5">
                  {currSymbol}{equityCurveStats.highestEquity.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#1A0A0C] border border-[#FBC5C2] dark:border-[#FF3B30]/40 shadow-2xs">
              <div className="w-5 h-5 rounded-full bg-[#FEECEB] dark:bg-[#FF3B30]/20 text-[#DC2626] dark:text-[#FF3B30] flex items-center justify-center text-xs font-bold">
                ↘
              </div>
              <div>
                <div className="text-[9px] text-[#786F66] dark:text-[#94A3B8] leading-none">Max Drawdown</div>
                <div className="text-xs font-black font-mono text-[#DC2626] dark:text-[#FF3B30] mt-0.5">
                  -{perf.maxDrawdownPercent.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Quick Execution Stats (Full-Width Responsive 6-KPI Strip) */}
      <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 sm:p-5 shadow-2xs transition-colors space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#DB9F35]" />
            <h3 className="text-xs sm:text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
              Execution Performance &amp; Quick Stats
            </h3>
          </div>
          <div className="relative">
            <select
              value={quickStatsPeriod}
              onChange={(e) => setQuickStatsPeriod(e.target.value as any)}
              className="appearance-none pl-2.5 pr-6 py-0.5 bg-[#F2ECE0] dark:bg-[#1C2331] border border-[#DFD5C6] dark:border-[#2E384D] rounded-lg text-[10px] font-semibold text-[#1F1A16] dark:text-[#F0F4F8] outline-none cursor-pointer"
            >
              <option value="This Month">This Month</option>
              <option value="All Time">All Time</option>
            </select>
            <ChevronDown className="w-2.5 h-2.5 text-[#786F66] absolute right-2 top-2 pointer-events-none" />
          </div>
        </div>

        {/* 6 Mini KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Card 1: Total Trades */}
          <div className="p-3 rounded-xl bg-white dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] hover:border-[#DB9F35]/40 transition-all flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] block leading-none">Total Trades</span>
              <span className="text-base font-black font-mono mt-1.5 text-[#1F1A16] dark:text-[#F0F4F8] block">
                {trades.length}
              </span>
            </div>
            <div className="flex items-end gap-0.5 h-4 text-[#10B981]">
              <span className="w-1.5 h-2 bg-[#10B981] rounded-xs" />
              <span className="w-1.5 h-3.5 bg-[#10B981] rounded-xs" />
              <span className="w-1.5 h-2.5 bg-[#10B981] rounded-xs" />
            </div>
          </div>

          {/* Card 2: Win Rate */}
          <div className="p-3 rounded-xl bg-white dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] hover:border-[#DB9F35]/40 transition-all flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] block leading-none">Win Rate</span>
              <div className="flex items-baseline gap-1 mt-1.5">
                <span className="text-base font-black font-mono text-[#1F1A16] dark:text-[#F0F4F8] leading-none">
                  {Math.round(perf.winRate)}%
                </span>
                <span className="text-[9px] font-mono text-[#786F66] dark:text-[#94A3B8]">
                  {perf.winningTrades}W/{perf.losingTrades}L
                </span>
              </div>
            </div>
            <div className="relative w-7 h-7 shrink-0">
              <svg className="w-7 h-7 -rotate-90" viewBox="0 0 36 36">
                <path className="text-[#E7E0D6] dark:text-[#242D3D]" stroke="currentColor" strokeWidth="3.5" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="text-[#10B981]" stroke="currentColor" strokeWidth="3.5" strokeDasharray={`${trades.length > 0 ? perf.winRate : 0}, 100`} strokeLinecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
            </div>
          </div>

          {/* Card 3: Avg R / Trade */}
          <div className="p-3 rounded-xl bg-white dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] hover:border-[#DB9F35]/40 transition-all flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] block leading-none">Avg R / Trade</span>
              <span className={`text-base font-black font-mono mt-1.5 block ${
                perf.averageR >= 0 ? 'text-[#10B981]' : 'text-[#DC2626]'
              }`}>
                {perf.averageR >= 0 ? '+' : ''}{perf.averageR.toFixed(2)}R
              </span>
            </div>
            <div className="flex items-end gap-0.5 h-4">
              <span className="w-1.5 h-1.5 bg-[#10B981] rounded-xs" />
              <span className="w-1.5 h-3 bg-[#10B981] rounded-xs" />
              <span className="w-1.5 h-4 bg-[#10B981] rounded-xs" />
            </div>
          </div>

          {/* Card 4: Avg Trade Time */}
          <div className="p-3 rounded-xl bg-white dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] hover:border-[#DB9F35]/40 transition-all flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] block leading-none">Avg Trade Time</span>
              <span className="text-base font-black font-mono mt-1.5 text-[#1F1A16] dark:text-[#F0F4F8] block">
                1h 42m
              </span>
            </div>
            <div className="w-7 h-7 rounded-full bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>

          {/* Card 5: Biggest Win */}
          <div className="p-3 rounded-xl bg-white dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] hover:border-[#10B981]/40 transition-all flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] block leading-none">Biggest Win</span>
              <span className="text-sm font-black font-mono mt-1.5 text-[#10B981] block">
                +{currSymbol}{quickStats.biggestWinPnl.toFixed(2)}
              </span>
            </div>
            <div className="w-6 h-6 rounded-full bg-[#E8F8EE] dark:bg-[#132A1C] text-[#10B981] flex items-center justify-center text-xs font-bold shadow-2xs">
              ↗
            </div>
          </div>

          {/* Card 6: Biggest Loss */}
          <div className="p-3 rounded-xl bg-white dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] hover:border-[#DC2626]/40 transition-all flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] block leading-none">Biggest Loss</span>
              <span className="text-sm font-black font-mono mt-1.5 text-[#DC2626] block">
                -{currSymbol}{Math.abs(quickStats.biggestLossPnl).toFixed(2)}
              </span>
            </div>
            <div className="w-6 h-6 rounded-full bg-[#FEECEB] dark:bg-[#321B1B] text-[#DC2626] flex items-center justify-center text-xs font-bold shadow-2xs">
              ↘
            </div>
          </div>
        </div>
      </div>

      {/* 4. Portfolio Performance & Breakdown (Ultra HD 4K Crisp Visualizations) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Panel 1: Daily P&L Bar Chart */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#E7E0D6]/70 dark:border-[#242D3D]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center">
                  <BarChart2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                    Daily P&amp;L
                  </h3>
                  <p className="text-[11px] text-[#786F66] dark:text-[#94A3B8]">
                    Closed trade results · {currSymbol}
                  </p>
                </div>
              </div>
              <div className="text-xs font-mono font-bold text-[#786F66] dark:text-[#94A3B8]">
                {allDailyData.length} trading days
              </div>
            </div>

            <div className="mt-3 relative">
              <svg 
                className="w-full h-auto block" 
                viewBox={`0 0 ${dailySvgData.W} ${dailySvgData.H}`}
                shapeRendering="geometricPrecision"
                textRendering="geometricPrecision"
              >
                {/* Gridlines */}
                {dailySvgData.gridLevels.map((g, i) => (
                  <g key={i}>
                    <line
                      x1={dailySvgData.L}
                      y1={g.y}
                      x2={dailySvgData.W - dailySvgData.R}
                      y2={g.y}
                      stroke="#E7E0D6"
                      strokeDasharray="3 5"
                      className="dark:stroke-[#202C40]"
                    />
                    <text
                      x={dailySvgData.L - 6}
                      y={g.y + 3}
                      textAnchor="end"
                      className="fill-[#786F66] dark:fill-[#8290A8] text-[9px] font-mono"
                    >
                      {g.label}
                    </text>
                  </g>
                ))}

                {/* Baseline at y = 0 */}
                <line
                  x1={dailySvgData.L}
                  y1={dailySvgData.baselineY}
                  x2={dailySvgData.W - dailySvgData.R}
                  y2={dailySvgData.baselineY}
                  stroke="#786F66"
                  strokeWidth="1"
                  opacity="0.4"
                />

                {/* Bars */}
                {dailySvgData.bars.map((b, i) => (
                  <rect
                    key={i}
                    x={b.x}
                    y={b.y}
                    width={b.width}
                    height={b.height}
                    rx="2"
                    fill={b.isPositive ? '#10B981' : '#DC2626'}
                    className="cursor-pointer transition-all hover:opacity-80"
                    onMouseEnter={() => setHoveredDaily(b.item)}
                    onMouseLeave={() => setHoveredDaily(null)}
                    onClick={() => onSelectDate?.(b.item.date)}
                  />
                ))}

                {/* X-axis labels */}
                {dailySvgData.bars
                  .filter((_, i) => dailySvgData.bars.length <= 8 || i % Math.ceil(dailySvgData.bars.length / 7) === 0)
                  .map((b, i) => (
                    <text
                      key={i}
                      x={b.x + b.width / 2}
                      y={dailySvgData.H - 8}
                      textAnchor="middle"
                      className="fill-[#786F66] dark:fill-[#8290A8] text-[9px] font-mono"
                    >
                      {b.item.label}
                    </text>
                  ))}
              </svg>

              {/* Tooltip */}
              {hoveredDaily && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-[#1F1A16] dark:bg-[#0B0F17] text-white px-2.5 py-1 rounded-lg text-[10px] font-mono shadow-lg border border-[#3A322A] dark:border-[#242D3D] pointer-events-none z-20 whitespace-nowrap">
                  <span>{hoveredDaily.date}: </span>
                  <span className={hoveredDaily.pnl >= 0 ? 'text-[#34D399] font-bold' : 'text-[#F87171] font-bold'}>
                    {hoveredDaily.pnl >= 0 ? '+' : '-'}{currSymbol}{Math.abs(hoveredDaily.pnl).toFixed(2)}
                  </span>
                  <span className="text-[#9E958C] ml-1.5">({hoveredDaily.count} trade{hoveredDaily.count === 1 ? '' : 's'})</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-[#786F66] dark:text-[#94A3B8] font-mono mt-3 pt-2 border-t border-[#E7E0D6]/50 dark:border-[#242D3D]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#10B981]" />
              Profit
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#DC2626]" />
              Loss
            </span>
          </div>
        </div>

        {/* Panel 2: Drawdown analysis */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#E7E0D6]/70 dark:border-[#242D3D]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#FEECEB] dark:bg-[#321B1B] text-[#DC2626] flex items-center justify-center">
                  <TrendingDown className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                    Drawdown analysis
                  </h3>
                  <p className="text-[11px] text-[#786F66] dark:text-[#94A3B8]">
                    Decline from previous equity peak
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 relative">
              <svg 
                className="w-full h-auto block" 
                viewBox={`0 0 ${drawdownSvgData.W} ${drawdownSvgData.H}`}
                shapeRendering="geometricPrecision"
                textRendering="geometricPrecision"
              >
                <defs>
                  <linearGradient id="drawdownGradientDash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#DC2626" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="#DC2626" stopOpacity="0.3" />
                  </linearGradient>
                </defs>

                {/* Gridlines */}
                {drawdownSvgData.gridLevels.map((g, i) => (
                  <g key={i}>
                    <line
                      x1={drawdownSvgData.L}
                      y1={g.y}
                      x2={drawdownSvgData.W - drawdownSvgData.R}
                      y2={g.y}
                      stroke="#E7E0D6"
                      strokeDasharray="3 5"
                      className="dark:stroke-[#202C40]"
                    />
                    <text
                      x={drawdownSvgData.L - 6}
                      y={g.y + 3}
                      textAnchor="end"
                      className="fill-[#786F66] dark:fill-[#8290A8] text-[9px] font-mono"
                    >
                      {g.label}
                    </text>
                  </g>
                ))}

                {/* Underwater Area */}
                {drawdownSvgData.areaD && (
                  <path d={drawdownSvgData.areaD} fill="url(#drawdownGradientDash)" />
                )}

                {/* Underwater Line */}
                <path
                  d={drawdownSvgData.pathD}
                  fill="none"
                  stroke="#DC2626"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />

                {/* Interactive Points */}
                {drawdownSvgData.pts.map((pt, i) => (
                  <circle
                    key={i}
                    cx={drawdownSvgData.getX(i)}
                    cy={drawdownSvgData.getY(pt.ddPct)}
                    r={hoveredDrawdown?.date === pt.date ? 4.5 : 2.5}
                    fill="#DC2626"
                    stroke="#FFFFFF"
                    strokeWidth={hoveredDrawdown?.date === pt.date ? 2 : 1}
                    className="cursor-pointer transition-all hover:r-4"
                    onMouseEnter={() => setHoveredDrawdown(pt)}
                    onMouseLeave={() => setHoveredDrawdown(null)}
                  />
                ))}

                {/* X labels */}
                <text x={drawdownSvgData.L} y={drawdownSvgData.H - 8} className="fill-[#786F66] dark:fill-[#8290A8] text-[9px] font-mono">
                  Peak Start
                </text>
                <text
                  x={drawdownSvgData.W - drawdownSvgData.R}
                  y={drawdownSvgData.H - 8}
                  textAnchor="end"
                  className="fill-[#786F66] dark:fill-[#8290A8] text-[9px] font-mono"
                >
                  Current
                </text>
              </svg>

              {/* Tooltip */}
              {hoveredDrawdown && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-[#1F1A16] dark:bg-[#0B0F17] text-white px-2.5 py-1 rounded-lg text-[10px] font-mono shadow-lg border border-[#3A322A] dark:border-[#242D3D] pointer-events-none z-20 whitespace-nowrap">
                  <span>{hoveredDrawdown.date}: </span>
                  <span className="text-[#F87171] font-bold">-{hoveredDrawdown.ddPct.toFixed(2)}%</span>
                  <span className="text-[#9E958C] ml-1.5">(-{currSymbol}{hoveredDrawdown.ddUsd.toFixed(2)})</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-3 mt-2 border-t border-[#E7E0D6]/50 dark:border-[#242D3D]">
            <span className="text-[#786F66] dark:text-[#94A3B8]">Maximum drawdown</span>
            <b className="text-[#DC2626] dark:text-[#F87171] font-mono">
              -{perf.maxDrawdownPercent.toFixed(2)}% (-{currSymbol}{perf.maxDrawdownUsd.toFixed(2)})
            </b>
          </div>
        </div>

        {/* Panel 3: Performance breakdown */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#E7E0D6]/70 dark:border-[#242D3D]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center">
                  <Target className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                    Performance breakdown
                  </h3>
                  <p className="text-[11px] text-[#786F66] dark:text-[#94A3B8]">
                    Closed positions &amp; win/loss metrics
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 my-3">
              {/* Donut SVG */}
              <div className="w-[110px] h-[110px] shrink-0 relative flex items-center justify-center">
                <svg viewBox="0 0 110 110" width="110" height="110" shapeRendering="geometricPrecision" textRendering="geometricPrecision">
                  {/* Base Track (Losses) */}
                  <circle
                    cx="55"
                    cy="55"
                    r={donutRadius}
                    fill="none"
                    stroke="#DC2626"
                    strokeWidth="11"
                    opacity="0.85"
                  />
                  {/* Win Arc */}
                  <circle
                    cx="55"
                    cy="55"
                    r={donutRadius}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="11"
                    strokeDasharray={`${winArcLength} ${donutCircumference - winArcLength}`}
                    transform="rotate(-90 55 55)"
                    strokeLinecap="round"
                  />
                  <text
                    x="55"
                    y="52"
                    fill="currentColor"
                    textAnchor="middle"
                    className="text-lg font-black fill-[#1F1A16] dark:fill-[#F0F4F8]"
                  >
                    {perf.winRate.toFixed(0)}%
                  </text>
                  <text
                    x="55"
                    y="67"
                    fill="#786F66"
                    textAnchor="middle"
                    className="text-[9px] font-bold fill-[#786F66] dark:fill-[#94A3B8]"
                  >
                    WIN RATE
                  </text>
                </svg>
              </div>

              {/* Stats next to Donut */}
              <div className="space-y-1.5">
                <div>
                  <div className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">
                    Win / loss ratio
                  </div>
                  <div className="text-xl font-black font-mono text-[#1F1A16] dark:text-[#F0F4F8]">
                    {winLossRatio}
                  </div>
                </div>

                <div className="flex flex-col gap-1 text-[11px] font-mono">
                  <span className="flex items-center gap-1.5 text-[#10B981]">
                    <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                    {winningTrades.length} winners
                  </span>
                  <span className="flex items-center gap-1.5 text-[#DC2626]">
                    <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
                    {losingTrades.length} losers
                  </span>
                  {beTrades.length > 0 && (
                    <span className="flex items-center gap-1.5 text-[#9E958C]">
                      <span className="w-2 h-2 rounded-full bg-[#9E958C]" />
                      {beTrades.length} BE
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-3 mt-2 border-t border-[#E7E0D6]/50 dark:border-[#242D3D]">
            <span className="text-[#786F66] dark:text-[#94A3B8]">
              Avg win: <b className="text-[#10B981] font-mono">+{currSymbol}{avgWin.toFixed(2)}</b>
            </span>
            <span className="text-[#786F66] dark:text-[#94A3B8]">
              Avg loss: <b className="text-[#DC2626] font-mono">-{currSymbol}{avgLoss.toFixed(2)}</b>
            </span>
          </div>
        </div>

      </div>

      {/* 5. Institutional Monthly Trading Calendar with Weekly P&L (TradeZella Style matching Image 2) */}
      <div className="w-full bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xs transition-colors space-y-4">
        {/* Top Header matching Image 2 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#1F1A16] dark:text-[#F0F4F8] leading-tight">
                  Calendar — {currentMonthName} {currentYear}
                </h3>
                <p className="text-[11px] text-[#786F66] dark:text-[#94A3B8]">
                  Overview of your daily trades and journal entries.
                </p>
              </div>
            </div>
          </div>

          {/* Right Action / View Toggles */}
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#FAF2E6] dark:bg-[#1A2433] text-[#DB9F35] border border-[#DB9F35]/30">
              Month View
            </span>
            <button
              type="button"
              onClick={() => navigate('cycle')}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] hover:border-[#10B981] text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8] flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
            >
              <span>31-Day Cycle</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#10B981]" />
            </button>
          </div>
        </div>

        {/* Winning Streak Pill Banner matching Image 2 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-[#FAF2E6] dark:bg-[#161F2E] border border-[#E8DCC8] dark:border-[#243044] text-xs">
          <div className="flex items-center gap-2">
            <span className="text-sm">🔥</span>
            <span className="font-bold text-[#D97706] dark:text-[#FBBF24]">
              {calendarWeeksData.streak} day winning streak
            </span>
            <span className="text-[#786F66] dark:text-[#94A3B8] hidden sm:inline">
              | Breakeven days don't break your streak.
            </span>
          </div>
          <div className="font-mono font-bold text-[11px] text-[#786F66] dark:text-[#94A3B8]">
            {calendarWeeksData.monthTradesCount} trades • {currSymbol}{calendarWeeksData.monthPnl.toFixed(2)} • ↗ {calendarWeeksData.monthReturnPct >= 0 ? '+' : ''}{calendarWeeksData.monthReturnPct.toFixed(1)}% • {calendarWeeksData.monthWR}% WR
          </div>
        </div>

        {/* 2-Column Institutional Calendar Grid: Calendar (Left) + Weekly PNL (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 pt-1">
          {/* Left Column: 7 Days Columns */}
          <div className="lg:col-span-9 xl:col-span-10 flex flex-col justify-between">
            {/* 7-Col Days Header: SUN, MON, TUE, WED, THU, FRI, SAT */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center pb-2 text-[10px] sm:text-xs font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider border-b border-[#E7E0D6]/40 dark:border-[#242D3D]">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Weeks Container */}
            <div className="space-y-1 sm:space-y-2 pt-2">
              {calendarWeeksData.weeks.map((week, wIdx) => (
                <div key={`wrow-${wIdx}`} className="grid grid-cols-7 gap-1 sm:gap-2">
                  {week.days.map((c, dIdx) => {
                    if (!c.day) {
                      return (
                        <div
                          key={`empty-${dIdx}`}
                          className="min-h-[56px] sm:min-h-[82px] rounded-lg sm:rounded-xl bg-transparent"
                        />
                      );
                    }
                    const isSelected = c.dateStr === activeDate;
                    
                    let tileStyle = 'bg-white dark:bg-[#151C28]/60 border-[#E7E0D6] dark:border-[#242D3D] text-[#786F66] dark:text-[#94A3B8] hover:border-[#DB9F35]/50';
                    let pnlColor = 'text-[#786F66] dark:text-[#94A3B8]';
                    let dayNumColor = 'text-[#786F66] dark:text-[#94A3B8]';
                    let tradesColor = 'text-[#786F66] dark:text-[#94A3B8]';

                    if (c.isWin) {
                      tileStyle = 'bg-[#E8F8EE] dark:bg-[#0D281E] border-[#B7ECC8] dark:border-[#10B981]/40 shadow-2xs hover:border-[#10B981]';
                      pnlColor = 'text-[#15803D] dark:text-[#34D399]';
                      dayNumColor = 'text-[#15803D] dark:text-white/80';
                      tradesColor = 'text-[#15803D]/80 dark:text-[#94A3B8]';
                    } else if (c.isLoss) {
                      tileStyle = 'bg-[#FEECEB] dark:bg-[#2A1316] border-[#FBC5C2] dark:border-[#EF4444]/40 shadow-2xs hover:border-[#EF4444]';
                      pnlColor = 'text-[#DC2626] dark:text-[#F87171]';
                      dayNumColor = 'text-[#DC2626] dark:text-white/80';
                      tradesColor = 'text-[#DC2626]/80 dark:text-[#94A3B8]';
                    } else if (c.isBE) {
                      tileStyle = 'bg-[#FFFBEB] dark:bg-[#252013] border-[#FDE68A] dark:border-[#F59E0B]/40 shadow-2xs hover:border-[#F59E0B]';
                      pnlColor = 'text-[#D97706] dark:text-[#FBBF24]';
                      dayNumColor = 'text-[#D97706] dark:text-white/80';
                      tradesColor = 'text-[#D97706]/80 dark:text-[#94A3B8]';
                    }

                    return (
                      <div
                        key={`day-${c.day}`}
                        onClick={() => c.dateStr && onSelectDate?.(c.dateStr)}
                        title={
                          c.hasTrade
                            ? `${c.dateStr}: ${c.pnl && c.pnl >= 0 ? '+' : '-'}${currSymbol}${Math.abs(c.pnl || 0).toFixed(2)} (${c.count} trades)`
                            : `${c.dateStr}: No trades recorded`
                        }
                        className={`p-1 sm:p-2 rounded-lg sm:rounded-xl border min-h-[56px] sm:min-h-[82px] flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] ${
                          isSelected ? 'ring-2 ring-[#DB9F35] dark:ring-[#F59E0B] border-[#DB9F35] dark:border-[#F59E0B] shadow-md' : ''
                        } ${tileStyle}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] sm:text-xs font-mono font-bold ${dayNumColor}`}>
                            {c.day}
                          </span>
                          {c.isLoss && <span className="text-[10px]" title="Loss day">🔥</span>}
                        </div>

                        {c.hasTrade ? (
                          <div className="pt-0.5">
                            <span className={`text-[11px] sm:text-xs font-black font-mono block leading-tight truncate ${pnlColor}`}>
                              {c.isWin ? '+' : c.isLoss ? '-' : ''}{currSymbol}{Math.abs(c.pnl || 0).toFixed(0)}
                            </span>
                            <span className={`text-[8px] sm:text-[9px] font-mono block mt-0.5 truncate ${tradesColor}`}>
                              {c.count} trade{c.count === 1 ? '' : 's'}
                            </span>
                          </div>
                        ) : (
                          <div className="h-4" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: WEEKLY PNL Column */}
          <div className="lg:col-span-3 xl:col-span-2 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-[#E7E0D6]/60 dark:border-[#242D3D] pt-3 lg:pt-0 lg:pl-3.5">
            <div className="text-[10px] sm:text-xs font-bold text-[#786F66] dark:text-[#94A3B8] pb-2 uppercase tracking-wider hidden lg:block border-b border-[#E7E0D6]/40 dark:border-[#242D3D]">
              Weekly PNL
            </div>

            <div className="flex flex-col justify-between h-full space-y-1.5 sm:space-y-2 pt-2">
              {calendarWeeksData.weeks.map((week, wIdx) => {
                const isPositive = week.pnl >= 0;
                const barWidthPct = calendarWeeksData.maxWeeklyAbsPnl > 0
                  ? Math.min(100, Math.max(10, Math.round((Math.abs(week.pnl) / calendarWeeksData.maxWeeklyAbsPnl) * 100)))
                  : 0;

                return (
                  <div
                    key={`wcard-${wIdx}`}
                    className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] flex flex-col justify-between min-h-[64px] sm:min-h-[82px] shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8]">
                        Week {week.weekIndex}
                      </span>
                      <span className={`text-[11px] font-black font-mono ${
                        week.pnl > 0.001 ? 'text-[#15803D] dark:text-[#10B981]' : week.pnl < -0.001 ? 'text-[#DC2626] dark:text-[#EF4444]' : 'text-[#786F66] dark:text-[#94A3B8]'
                      }`}>
                        {week.pnl > 0.001 ? '+' : week.pnl < -0.001 ? '-' : ''}{currSymbol}{Math.abs(week.pnl).toFixed(0)}
                      </span>
                    </div>

                    {/* Mini Horizontal P&L Bar */}
                    <div className="w-full h-1.5 rounded-full bg-[#E7E0D6] dark:bg-[#242D3D] overflow-hidden my-1">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isPositive ? 'bg-[#10B981]' : 'bg-[#EF4444]'
                        }`}
                        style={{ width: `${week.tradeCount === 0 ? 0 : barWidthPct}%` }}
                      />
                    </div>

                    {/* Breakdown */}
                    <div className="flex items-center justify-between text-[9px] font-mono text-[#786F66] dark:text-[#94A3B8]">
                      <span>{week.wins}W {week.be > 0 ? `${week.be}BE ` : ''}{week.losses}L</span>
                      <span className="font-bold">{week.tradeCount > 0 ? `${week.winRate}%` : '--'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 6. Recent Trades & Mistakes / Cycle Breakdown (2-Column Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Recent Trades Table */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#DB9F35]" />
                <h4 className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                  Recent Executed Trades
                </h4>
              </div>
              <button
                type="button"
                onClick={() => navigate('journal')}
                className="text-xs font-bold text-[#DB9F35] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View All Journal</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {recentTradesList.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#786F66] dark:text-[#94A3B8]">
                No trades recorded yet. Log your trades in the Journal or sync from Vantage.
              </div>
            ) : (
              <div className="overflow-x-auto py-2 text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
                      <th className="pb-2">Pair</th>
                      <th className="pb-2">Type</th>
                      <th className="pb-2 text-center">R</th>
                      <th className="pb-2 text-right">P&L</th>
                      <th className="pb-2 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E0D6]/40 dark:divide-[#242D3D]">
                    {recentTradesList.map((t) => (
                      <tr 
                        key={t.id} 
                        onClick={() => onSelectDate?.(t.date)}
                        className="hover:bg-[#F2ECE0]/60 dark:hover:bg-[#1C2331]/60 transition-colors cursor-pointer"
                      >
                        <td className="py-2 font-bold font-mono text-[#1F1A16] dark:text-[#F0F4F8]">{t.pair}</td>
                        <td className="py-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            t.order === 'BUY'
                              ? 'bg-[#E8F8EE] dark:bg-[#132A1C] text-[#15803D] dark:text-[#34D399]'
                              : 'bg-[#FEECEB] dark:bg-[#321B1B] text-[#DC2626] dark:text-[#F87171]'
                          }`}>
                            {t.order}
                          </span>
                        </td>
                        <td className={`py-2 text-center font-bold font-mono ${
                          (t.rMultiple || 0) >= 0 ? 'text-[#10B981]' : 'text-[#DC2626]'
                        }`}>
                          {(t.rMultiple || 0) >= 0 ? `+${t.rMultiple}R` : `${t.rMultiple}R`}
                        </td>
                        <td className={`py-2 text-right font-bold font-mono ${
                          (t.pnl || 0) >= 0 ? 'text-[#10B981]' : 'text-[#DC2626]'
                        }`}>
                          {(t.pnl || 0) >= 0 ? `+${currSymbol}${(t.pnl || 0).toFixed(2)}` : `-${currSymbol}${Math.abs(t.pnl || 0).toFixed(2)}`}
                        </td>
                        <td className="py-2 text-right text-[11px] font-mono text-[#786F66] dark:text-[#94A3B8]">
                          {t.time || '10:00'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: Monthly Cycle & Mistakes / Insights */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-[#DB9F35]" />
                <h4 className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                  Monthly Discipline &amp; Leaks
                </h4>
              </div>
              <button
                type="button"
                onClick={() => navigate('analytics')}
                className="text-xs font-bold text-[#DB9F35] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Analytics</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Circular Progress & Days Breakdown */}
            <div className="flex items-center gap-4 py-3">
              <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                  <path className="text-[#E7E0D6] dark:text-[#242D3D]" stroke="currentColor" strokeWidth="3.5" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-[#10B981]" stroke="currentColor" strokeWidth="3.5" strokeDasharray={`${cycleProgress.percent}, 100`} strokeLinecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div className="absolute text-center">
                  <span className="text-xs font-black text-[#1F1A16] dark:text-[#F0F4F8] leading-none block">
                    {cycleProgress.percent}%
                  </span>
                  <span className="text-[8px] text-[#786F66] dark:text-[#94A3B8] font-mono leading-none block mt-0.5">
                    {cycleProgress.totalDaysPassed}/{cycleProgress.daysInMonth}d
                  </span>
                </div>
              </div>

              <div className="space-y-1 flex-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[#786F66] dark:text-[#94A3B8]">
                    <span className="w-2 h-2 rounded-full bg-[#10B981]" /> Profitable Days
                  </span>
                  <span className="font-bold text-[#10B981] font-mono">{cycleProgress.profitableDays}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[#786F66] dark:text-[#94A3B8]">
                    <span className="w-2 h-2 rounded-full bg-[#DC2626]" /> Losing Days
                  </span>
                  <span className="font-bold text-[#DC2626] font-mono">{cycleProgress.losingDays}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[#786F66] dark:text-[#94A3B8]">
                    <span className="w-2 h-2 rounded-full bg-[#DB9F35]" /> Break Even
                  </span>
                  <span className="font-bold text-[#786F66] dark:text-[#94A3B8] font-mono">{cycleProgress.beDays}</span>
                </div>
              </div>
            </div>

            {/* Focus This Week Highlight Callout */}
            <div className="mt-2 p-3 rounded-xl bg-[#FAF2E6] dark:bg-[#1A2230] border border-[#E8DCC8] dark:border-[#2E384D] flex items-start gap-2 text-xs">
              <Target className="w-4 h-4 text-[#DB9F35] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[#1F1A16] dark:text-[#F0F4F8] block text-[11px]">
                  Focus Target
                </span>
                <p className="text-[10px] text-[#786F66] dark:text-[#94A3B8] mt-0.5 leading-snug">
                  Strict 0.01 lot ceiling &amp; avoid impulsive entries around 11:00 or high-impact news spikes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Footer */}
      <footer className="pt-4 border-t border-[#E7E0D6] dark:border-[#242D3D] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#786F66] dark:text-[#94A3B8] transition-colors">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#1F1A16] dark:text-[#F0F4F8]">TradeFlow</span>
          <span>|</span>
          <span>Trade Better. Be Better.</span>
        </div>
        <div className="font-mono text-[10px]">
          Last updated: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </footer>

      {/* Quick Edit Started Balance Modal */}
      {isEditStartedOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setIsEditStartedOpen(false)}
        >
          <div 
            className="bg-white dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#E7E0D6] dark:border-[#242D3D]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">Update Started Balance</h3>
                  <p className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">Manual starting capital</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditStartedOpen(false)}
                className="text-[#786F66] hover:text-[#1F1A16] dark:hover:text-[#F0F4F8] p-1 rounded-lg hover:bg-[#FAF7F2] dark:hover:bg-[#1A2230] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const num = parseFloat(startedInput);
                if (isNaN(num) || num <= 0) return;
                setIsSavingStarted(true);
                try {
                  if (userId) {
                    await settingsApi.save(userId, { ...settings, initialCapital: num });
                  }
                  onSettingsUpdated?.();
                  setIsEditStartedOpen(false);
                } catch (err) {
                  console.error('Failed to update started balance:', err);
                } finally {
                  setIsSavingStarted(false);
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[#786F66] dark:text-[#94A3B8] uppercase block">
                  Started Balance ({currSymbol})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-mono text-sm text-[#786F66]">{currSymbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    value={startedInput}
                    onChange={(e) => setStartedInput(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-[#FAF7F2] dark:bg-[#0E121B] border border-[#E7E0D6] dark:border-[#242D3D] rounded-xl text-base font-black font-mono text-[#1F1A16] dark:text-[#F0F4F8] focus:border-[#DB9F35] outline-none"
                    placeholder="e.g. 100.00"
                    autoFocus
                  />
                </div>
                <p className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">
                  This is your manual baseline deposit / starting capital.
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditStartedOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-[#E7E0D6] dark:border-[#242D3D] text-xs font-semibold text-[#786F66] dark:text-[#94A3B8] hover:bg-[#FAF7F2] dark:hover:bg-[#1A2230] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingStarted}
                  className="flex-1 py-2 rounded-xl bg-[#DB9F35] hover:bg-[#C28B2B] text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingStarted ? 'Saving...' : 'Save Balance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

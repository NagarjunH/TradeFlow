import { useState, useMemo } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Percent, 
  ShieldCheck, 
  BarChart2, 
  Trophy, 
  Lightbulb, 
  Target, 
  ArrowRight,
  Calendar,
  Award,
  Brain,
  Activity,
  ChevronDown
} from 'lucide-react';
import { defaultSettings, type Trade, type DayRecord, type AppSettings } from '../db/db';
import type { TabType } from './Navbar';
import { calculatePerformance, calculateDiscipline, generateEquityCurve } from '../utils/TradingEngine';

interface DashboardViewProps {
  trades?: Trade[];
  days?: DayRecord[];
  settings?: AppSettings;
  onSelectDate?: (dateStr: string) => void;
  onTabChange?: (tab: TabType) => void;
  onOpenQuickTrade?: () => void;
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
}) => {
  const [performerTab, setPerformerTab] = useState<'By R-Multiple' | 'By P&L'>('By P&L');
  const [equityTab, setEquityTab] = useState<'$ P&L' | 'R-Multiple' | '% Return' | 'Drawdown'>('$ P&L');
  const [timeframe, setTimeframe] = useState<'7D' | '30D' | '90D' | '6M' | '1Y' | 'ALL'>('30D');
  const [periodDropdown, setPeriodDropdown] = useState<'This Month' | 'Last 30 Days' | 'All Time'>('This Month');
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
  const [hoveredBar, setHoveredBar] = useState<{ day: number; r: number; pnl: number; count: number } | null>(null);

  // Dynamic calculations from live data
  const perf = calculatePerformance(trades, settings);
  const discipline = calculateDiscipline(trades);
  const currSymbol = settings.currency === 'USD' ? '$' : '₹';
  const initialCapital = settings.initialCapital || 10000;

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

  // Equity Curve Points & SVG geometry matching the reference screenshot
  const equityChartData = useMemo(() => {
    const rawPoints = generateEquityCurve(filteredTradesForCurve, settings);

    if (rawPoints.length <= 1 && filteredTradesForCurve.length === 0) {
      // Empty state baseline
      return {
        hasData: false,
        points: [],
        pathD: `M 55 110 L 675 110`,
        areaD: `M 55 110 L 675 110 L 675 200 L 55 200 Z`,
        baselineY: 110,
        yTicks: [
          { y: 25, label: equityTab === '$ P&L' ? `${currSymbol}${initialCapital + 35}` : '+2.0' },
          { y: 60, label: equityTab === '$ P&L' ? `${currSymbol}${initialCapital + 25}` : '+1.0' },
          { y: 95, label: equityTab === '$ P&L' ? `${currSymbol}${initialCapital + 15}` : '0.0' },
          { y: 130, label: equityTab === '$ P&L' ? `${currSymbol}${initialCapital + 5}` : '-1.0' },
          { y: 165, label: equityTab === '$ P&L' ? `${currSymbol}${initialCapital}` : '-2.0' },
        ],
        xLabels: [
          { label: 'Oct 1', x: 55 },
          { label: 'Oct 7', x: 210 },
          { label: 'Oct 14', x: 365 },
          { label: 'Oct 21', x: 520 },
          { label: 'Oct 31', x: 675 },
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

    const pad = (maxVal - minVal) * 0.12;
    const paddedMin = minVal - pad;
    const paddedMax = maxVal + pad;
    const range = paddedMax - paddedMin || 1;

    const left = 55;
    const right = 675;
    const top = 25;
    const bottom = 195;

    const coords = enrichedPoints.map((p, idx) => {
      const x = enrichedPoints.length === 1 ? (left + right) / 2 : left + (idx / (enrichedPoints.length - 1)) * (right - left);
      const y = bottom - ((p.val - paddedMin) / range) * (bottom - top);
      return {
        ...p,
        x,
        y,
        isWin: (p.rMultiple || 0) > 0.001,
        isLoss: (p.rMultiple || 0) < -0.001,
        isBE: Math.abs(p.rMultiple || 0) <= 0.001,
      };
    });

    const pathD = generateSmoothPath(coords);
    const lastX = coords[coords.length - 1].x;
    const firstX = coords[0].x;
    const areaD = `${pathD} L ${lastX.toFixed(1)} ${bottom} L ${firstX.toFixed(1)} ${bottom} Z`;

    // Baseline Y for starting balance line
    const baselineVal = equityTab === '$ P&L' ? initialCapital : 0;
    const baselineY = bottom - ((baselineVal - paddedMin) / range) * (bottom - top);

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
      yTicks,
      xLabels,
    };
  }, [filteredTradesForCurve, settings, equityTab, currSymbol, initialCapital, trades]);

  // Equity Curve Header Stats & Badges
  const equityCurveStats = useMemo(() => {
    const currentEquity = initialCapital + perf.netPnl;
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

  // Current Month trades & Daily breakdown for Monthly Performance bar chart
  const { monthlyTotalR, monthlyTotalPnl, dailyRData } = useMemo(() => {
    const mTrades = trades.filter(t => t.date && t.date.startsWith(currentMonthStr));
    const mTotalR = mTrades.reduce((sum, t) => sum + (t.rMultiple || 0), 0);
    const mTotalPnl = mTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

    const dateMap = new Map<number, { r: number; pnl: number; count: number }>();
    mTrades.forEach(t => {
      const parts = t.date.split('-');
      if (parts.length === 3) {
        const d = parseInt(parts[2], 10);
        const cur = dateMap.get(d) || { r: 0, pnl: 0, count: 0 };
        cur.r += (t.rMultiple || 0);
        cur.pnl += (t.pnl || 0);
        cur.count += 1;
        dateMap.set(d, cur);
      }
    });

    const daysArr: { day: number; r: number; pnl: number; count: number }[] = [];
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const item = dateMap.get(d);
      daysArr.push({
        day: d,
        r: item ? item.r : 0,
        pnl: item ? item.pnl : 0,
        count: item ? item.count : 0,
      });
    }

    return { monthlyTotalR: mTotalR, monthlyTotalPnl: mTotalPnl, dailyRData: daysArr };
  }, [trades, currentMonthStr, daysInCurrentMonth]);

  // Quick stats values
  const quickStats = useMemo(() => {
    const totalCount = trades.length;
    const wr = Math.round(perf.winRate);
    const avgR = perf.averageR;
    const wins = trades.filter((t) => (t.rMultiple || 0) > 0);
    const losses = trades.filter((t) => (t.rMultiple || 0) < 0);
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

  // Live Pair Stats for Top Performers
  const pairStats = useMemo(() => {
    const map = new Map<string, { totalR: number; totalPnl: number; wins: number; total: number }>();
    trades.forEach((t) => {
      const p = (t.pair || 'OTHER').replace('/', '').toUpperCase();
      const cur = map.get(p) || { totalR: 0, totalPnl: 0, wins: 0, total: 0 };
      cur.totalR += (t.rMultiple || 0);
      cur.totalPnl += (t.pnl || 0);
      if ((t.rMultiple || 0) > 0) cur.wins += 1;
      cur.total += 1;
      map.set(p, cur);
    });

    return Array.from(map.entries())
      .map(([pair, stats]) => ({
        pair,
        avgR: stats.total > 0 ? stats.totalR / stats.total : 0,
        totalR: stats.totalR,
        totalPnl: stats.totalPnl,
        winRate: stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0,
        count: stats.total,
      }))
      .sort((a, b) => (performerTab === 'By R-Multiple' ? b.totalR - a.totalR : b.totalPnl - a.totalPnl));
  }, [trades, performerTab]);

  // Live Violations list
  const violationsList = useMemo(() => {
    const counts = new Map<string, { count: number; lossR: number }>();
    trades.forEach((t) => {
      if (t.execution === 'VIOLATION') {
        const reason = t.violationReason && t.violationReason !== 'None' ? t.violationReason : (t.emotion === 'FOMO' ? 'FOMO' : 'Rule Violation');
        const cur = counts.get(reason) || { count: 0, lossR: 0 };
        cur.count += 1;
        if ((t.rMultiple || 0) < 0) cur.lossR += Math.abs(t.rMultiple || 0);
        counts.set(reason, cur);
      }
    });

    return Array.from(counts.entries())
      .map(([reason, s]) => ({ reason, count: s.count, lossR: s.lossR }))
      .sort((a, b) => b.count - a.count);
  }, [trades]);

  // Trading calendar mini grid for the current month
  const calendarDays = useMemo(() => {
    const firstDayOfWeek = new Date(currentYear, currentMonthIdx, 1).getDay(); // 0 = Sun, 1 = Mon...
    // Shift Sunday to 6 so Monday is 0
    const offset = (firstDayOfWeek + 6) % 7;

    const daysList: { day?: number; dateStr?: string; r?: number; pnl?: number; hasTrade?: boolean }[] = [];
    for (let i = 0; i < offset; i++) {
      daysList.push({});
    }

    const dayRMap = new Map<number, number>();
    const dayPnlMap = new Map<number, number>();
    trades.forEach(t => {
      if (t.date && t.date.startsWith(currentMonthStr)) {
        const d = parseInt(t.date.split('-')[2], 10);
        dayRMap.set(d, (dayRMap.get(d) || 0) + (t.rMultiple || 0));
        dayPnlMap.set(d, (dayPnlMap.get(d) || 0) + (t.pnl || 0));
      }
    });

    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = `${currentMonthStr}-${String(d).padStart(2, '0')}`;
      const hasTrade = dayPnlMap.has(d);
      const r = dayRMap.get(d) || 0;
      const pnl = dayPnlMap.get(d) || 0;
      daysList.push({ day: d, dateStr, r, pnl, hasTrade });
    }

    return daysList;
  }, [currentYear, currentMonthIdx, currentMonthStr, daysInCurrentMonth, trades]);

  // Data for Monthly Performance Bar Chart
  const monthlyBarChartData = useMemo(() => {
    const maxAbsPnl = Math.max(10, Math.ceil(Math.max(...dailyRData.map(d => Math.abs(d.pnl)))) || 10);
    const roundedMax = Math.ceil(maxAbsPnl / 5) * 5;
    const halfMax = Math.round(roundedMax / 2);

    const yTicks = [
      { val: roundedMax, label: `${currSymbol}${roundedMax}` },
      { val: halfMax, label: `${currSymbol}${halfMax}` },
      { val: 0, label: `${currSymbol}0` },
      { val: -halfMax, label: `-${currSymbol}${halfMax}` },
      { val: -roundedMax, label: `-${currSymbol}${roundedMax}` },
    ];

    return {
      daysArr: dailyRData,
      roundedMax,
      yTicks,
      totalPnl: monthlyTotalPnl,
      totalR: monthlyTotalR,
    };
  }, [dailyRData, monthlyTotalPnl, monthlyTotalR, currSymbol]);

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

      {/* 2. Top 6 KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* Card 1: CURRENT EQUITY */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider">
              CURRENT EQUITY
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-[#1F1A16] dark:text-[#F0F4F8] tracking-tight truncate">
              {currSymbol}{perf.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={`text-[10px] font-bold flex items-center gap-1 mt-0.5 ${
              perf.netPnl >= 0 ? 'text-[#10B981]' : 'text-[#DC2626]'
            }`}>
              <span>{perf.netPnl >= 0 ? '↑' : '↓'}</span>
              <span>
                {perf.netPnl >= 0 ? '+' : '-'}{currSymbol}{Math.abs(perf.netPnl).toFixed(2)} ({perf.netPnl >= 0 ? '+' : ''}{perf.roiPercent.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: NET P&L */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider">
              NET P&amp;L
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center">
              <BarChart2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className={`text-xl sm:text-2xl font-black tracking-tight truncate ${
              perf.netPnl >= 0 ? 'text-[#10B981]' : 'text-[#DC2626]'
            }`}>
              {perf.netPnl >= 0 ? '+' : '-'}{currSymbol}{Math.abs(perf.netPnl).toFixed(2)}
            </div>
            <div className={`text-[10px] font-bold mt-0.5 ${
              netR >= 0 ? 'text-[#10B981]' : 'text-[#DC2626]'
            }`}>
              {netR >= 0 ? '+' : ''}{netR.toFixed(1)}R
            </div>
          </div>
        </div>

        {/* Card 3: WIN RATE */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider">
              WIN RATE
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center">
              <Percent className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div>
              <div className="text-xl sm:text-2xl font-black text-[#1F1A16] dark:text-[#F0F4F8] leading-none">
                {trades.length > 0 ? Math.round(perf.winRate) : 0}%
              </div>
              <div className="text-[9px] font-mono text-[#786F66] dark:text-[#94A3B8] mt-1">
                {perf.winningTrades}W • {perf.losingTrades}L • {perf.breakEvenTrades}BE
              </div>
            </div>
            <div className="relative w-8 h-8 shrink-0">
              <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                <path className="text-[#E7E0D6] dark:text-[#242D3D]" stroke="currentColor" strokeWidth="4" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="text-[#10B981]" stroke="currentColor" strokeWidth="4" strokeDasharray={`${trades.length > 0 ? perf.winRate : 0}, 100`} strokeLinecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 4: EXPECTANCY */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider">
              EXPECTANCY
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className={`text-xl sm:text-2xl font-black tracking-tight ${
              trades.length === 0 ? 'text-[#786F66] dark:text-[#94A3B8]' : perf.expectancyUsd >= 0 ? 'text-[#10B981]' : 'text-[#DC2626]'
            }`}>
              {trades.length > 0 ? `${perf.expectancyUsd >= 0 ? '+' : '-'}${currSymbol}${Math.abs(perf.expectancyUsd).toFixed(2)}` : `${currSymbol}0.00`}
            </div>
            <div className="text-[9px] font-mono text-[#786F66] dark:text-[#94A3B8] mt-0.5 truncate">
              PF {trades.length > 0 ? (perf.profitFactor > 99 ? '∞' : perf.profitFactor.toFixed(2)) : '0.00'} | {trades.length > 0 ? `${perf.expectancy >= 0 ? '+' : ''}${perf.expectancy.toFixed(2)}R` : '0.00R'} / trade
            </div>
          </div>
        </div>

        {/* Card 5: MAX DRAWDOWN */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider">
              MAX DRAWDOWN
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#FEECEB] dark:bg-[#321B1B] text-[#DC2626] flex items-center justify-center">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-[#DC2626] tracking-tight">
              -{currSymbol}{perf.maxDrawdownUsd.toFixed(2)}
            </div>
            <div className="text-[10px] font-bold text-[#DC2626] mt-0.5">
              {maxDrawdownR > 0 ? `-${maxDrawdownR.toFixed(1)}R` : '0.0R'} (-{perf.maxDrawdownPercent.toFixed(1)}%)
            </div>
          </div>
        </div>

        {/* Card 6: DISCIPLINE SCORE */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider">
              DISCIPLINE SCORE
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-[#1F1A16] dark:text-[#F0F4F8] leading-none">
              {trades.length > 0 ? discipline.disciplineScore : 100}%
            </div>
            <div className="text-[10px] font-bold text-[#10B981] mt-1">
              {trades.length > 0 ? `${discipline.cleanTradesCount}/${trades.length}` : '0/0'} Clean
            </div>
          </div>
        </div>
      </div>

      {/* 3. Performance Suite (Equity Curve, Monthly Performance & Quick Stats - Matched to Reference) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left: Equity Curve (8 Columns) */}
        <div className="lg:col-span-8 bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 shadow-2xs flex flex-col justify-between transition-colors">
          <div>
            {/* Header: Title on Left, 4 Stats on Right */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center shrink-0">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                    Equity Curve
                  </h3>
                  <p className="text-xs text-[#786F66] dark:text-[#94A3B8]">
                    Cumulative account performance over time
                  </p>
                </div>
              </div>

              {/* 4 Top Stat Badges */}
              <div className="flex items-center flex-wrap gap-4 sm:gap-6">
                <div>
                  <div className="text-base sm:text-lg font-black font-mono text-[#1F1A16] dark:text-[#F0F4F8] leading-tight">
                    {currSymbol}{equityCurveStats.currentEquity.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">
                    Current Equity
                  </div>
                </div>

                <div className="border-l border-[#E7E0D6] dark:border-[#242D3D] pl-4 sm:pl-6">
                  <div className={`text-base sm:text-lg font-black font-mono leading-tight ${equityCurveStats.netReturn >= 0 ? 'text-[#10B981]' : 'text-[#DC2626]'}`}>
                    {equityCurveStats.netReturn >= 0 ? '+' : '-'}{currSymbol}{Math.abs(equityCurveStats.netReturn).toFixed(2)}
                  </div>
                  <div className={`text-[10px] font-bold ${equityCurveStats.netReturn >= 0 ? 'text-[#10B981]' : 'text-[#DC2626]'}`}>
                    Net Return ({equityCurveStats.netReturnPct >= 0 ? '+' : ''}{equityCurveStats.netReturnPct.toFixed(1)}%)
                  </div>
                </div>

                <div className="border-l border-[#E7E0D6] dark:border-[#242D3D] pl-4 sm:pl-6">
                  <div className={`text-base sm:text-lg font-black font-mono leading-tight ${equityCurveStats.monthReturnPct >= 0 ? 'text-[#10B981]' : 'text-[#DC2626]'}`}>
                    {equityCurveStats.monthReturnPct >= 0 ? '+' : ''}{equityCurveStats.monthReturnPct.toFixed(2)}%
                  </div>
                  <div className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">
                    This Month
                  </div>
                </div>

                <div className="border-l border-[#E7E0D6] dark:border-[#242D3D] pl-4 sm:pl-6">
                  <div className="text-base sm:text-lg font-black font-mono text-[#1F1A16] dark:text-[#F0F4F8] leading-tight">
                    {trades.length}
                  </div>
                  <div className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">
                    Total Trades
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Controls Row: Timeframe Pills on Left, Metrics & Dropdown on Right */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 pb-2">
              {/* Timeframe Pills: 7D, 30D, 90D, 6M, 1Y, ALL */}
              <div className="flex items-center gap-1">
                {(['7D', '30D', '90D', '6M', '1Y', 'ALL'] as const).map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setTimeframe(tf)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      timeframe === tf
                        ? 'bg-[#0D3B36] dark:bg-[#10B981] text-white dark:text-[#0B0F17] shadow-2xs'
                        : 'border border-transparent text-[#786F66] dark:text-[#94A3B8] hover:text-[#1F1A16] dark:hover:text-[#F0F4F8]'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              {/* Right side: Metric Pills & Dropdown */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {(['$ P&L', 'R-Multiple', '% Return', 'Drawdown'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setEquityTab(tab)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        equityTab === tab
                          ? 'bg-[#0D3B36] dark:bg-[#10B981] text-white dark:text-[#0B0F17] shadow-2xs'
                          : 'border border-transparent text-[#786F66] dark:text-[#94A3B8] hover:text-[#1F1A16] dark:hover:text-[#F0F4F8]'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <select
                    value={periodDropdown}
                    onChange={(e) => setPeriodDropdown(e.target.value as any)}
                    className="appearance-none pl-3 pr-7 py-1 bg-[#F2ECE0] dark:bg-[#1C2331] border border-[#DFD5C6] dark:border-[#2E384D] rounded-xl text-xs font-semibold text-[#1F1A16] dark:text-[#F0F4F8] outline-none cursor-pointer"
                  >
                    <option value="This Month">This Month</option>
                    <option value="Last 30 Days">Last 30 Days</option>
                    <option value="All Time">All Time</option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-[#786F66] absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Interactive SVG Curve Area */}
            <div className="relative pt-3 pb-1 h-64 w-full">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 700 230" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="eqGreenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.00" />
                  </linearGradient>
                </defs>

                {/* Y-Axis Horizontal Grid Lines & Labels */}
                {equityChartData.yTicks.map((grid, i) => (
                  <g key={i}>
                    <line 
                      x1="55" 
                      y1={grid.y} 
                      x2="685" 
                      y2={grid.y} 
                      stroke="currentColor" 
                      className="text-[#E7E0D6]/70 dark:text-[#242D3D]" 
                      strokeDasharray="3 3" 
                      strokeWidth="1" 
                    />
                    <text 
                      x="10" 
                      y={grid.y + 4} 
                      className="fill-[#9E958C] dark:fill-[#64748B] text-[10px] font-mono"
                    >
                      {grid.label}
                    </text>
                  </g>
                ))}

                {/* Starting Balance Dashed Baseline (Light Blue) */}
                {equityTab === '$ P&L' && equityChartData.baselineY >= 25 && equityChartData.baselineY <= 200 && (
                  <line
                    x1="55"
                    y1={equityChartData.baselineY}
                    x2="685"
                    y2={equityChartData.baselineY}
                    stroke="#93C5FD"
                    strokeDasharray="4 4"
                    strokeWidth="1.5"
                  />
                )}

                {/* Gradient Area Fill */}
                <path
                  d={equityChartData.areaD}
                  fill="url(#eqGreenGrad)"
                />

                {/* Smooth Curve Line in Emerald Green */}
                <path
                  d={equityChartData.pathD}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Vertical Drop Line to bottom when point is hovered */}
                {hoveredPoint && (
                  <line
                    x1={hoveredPoint.x}
                    y1={hoveredPoint.y}
                    x2={hoveredPoint.x}
                    y2={195}
                    stroke="#10B981"
                    strokeDasharray="3 3"
                    strokeWidth="1.5"
                    opacity="0.6"
                  />
                )}

                {/* Data Points (Green = win, Red = loss, Amber = BE, Gray = Start) */}
                {equityChartData.points.map((pt, idx) => {
                  const isOrigin = idx === 0 && equityChartData.points.length > 1;
                  const isHovered = hoveredPoint?.x === pt.x && hoveredPoint?.y === pt.y;
                  const fillColor = isOrigin 
                    ? '#9CA3AF' 
                    : pt.isWin 
                    ? '#10B981' 
                    : pt.isLoss 
                    ? '#EF4444' 
                    : '#F59E0B';

                  return (
                    <g
                      key={`pt-${idx}`}
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
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="16"
                        fill="transparent"
                      />
                      {isHovered && (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="10"
                          fill={fillColor}
                          fillOpacity="0.2"
                          stroke={fillColor}
                          strokeWidth="1.5"
                          className="pointer-events-none"
                        />
                      )}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 6 : (isOrigin ? 4 : 4.5)}
                        fill={fillColor}
                        stroke="white"
                        strokeWidth={isHovered ? 2 : 1.5}
                        className="transition-all duration-100 ease-out pointer-events-none shadow-sm"
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Dynamic Hover Tooltip Matching Screenshot */}
              {hoveredPoint && (
                <div 
                  style={{
                    left: `${Math.max(14, Math.min(86, (hoveredPoint.x / 700) * 100))}%`,
                    top: `${Math.max(5, (hoveredPoint.y / 230) * 100 - 18)}%`,
                    transform: 'translate(-50%, -100%)',
                  }}
                  className="absolute pointer-events-none bg-white dark:bg-[#1C2331] rounded-xl p-2.5 text-xs shadow-xl border border-[#E7E0D6] dark:border-[#2E384D] z-30 min-w-[130px]"
                >
                  <div className="text-[10px] text-[#786F66] dark:text-[#94A3B8] font-mono">
                    {hoveredPoint.date}
                  </div>
                  <div className="text-sm font-black font-mono text-[#1F1A16] dark:text-[#F0F4F8] mt-0.5">
                    {currSymbol}{hoveredPoint.balance.toFixed(2)}
                  </div>
                  <div className={`text-[10px] font-mono font-bold mt-0.5 ${
                    hoveredPoint.pnl >= 0 ? 'text-[#10B981]' : 'text-[#DC2626]'
                  }`}>
                    {hoveredPoint.pnl >= 0 ? '+' : '-'}{currSymbol}{Math.abs(hoveredPoint.pnl).toFixed(2)} ({hoveredPoint.roi >= 0 ? '+' : ''}{hoveredPoint.roi.toFixed(1)}%)
                  </div>
                </div>
              )}

              {/* Empty state overlay if no trades */}
              {!equityChartData.hasData && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                  <div className="p-2.5 rounded-full bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] mb-2">
                    <Activity className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                    No trades recorded for this timeframe
                  </p>
                  <p className="text-[11px] text-[#786F66] dark:text-[#94A3B8] mt-0.5 max-w-xs">
                    Log your trades in the Trading Journal or Quick Trade to visualize your equity curve.
                  </p>
                </div>
              )}
            </div>

            {/* X-Axis Dates */}
            <div className="flex justify-between px-12 text-[10px] font-mono text-[#9E958C] dark:text-[#64748B] border-t border-[#E7E0D6]/60 dark:border-[#242D3D] pt-2">
              {equityChartData.xLabels.map((lbl, i) => (
                <span key={i}>{lbl.label}</span>
              ))}
            </div>
          </div>

          {/* Footer Strip: Legend on Left, Highest Equity & Max Drawdown Badges on Right */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 mt-3 border-t border-[#E7E0D6]/60 dark:border-[#242D3D]">
            {/* Legend */}
            <div className="flex items-center flex-wrap gap-4 text-xs font-medium text-[#786F66] dark:text-[#94A3B8]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                <span>Winning Trade</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                <span>Losing Trade</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                <span>Break Even</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 border-b-2 border-dashed border-[#93C5FD]" />
                <span>Starting Balance ({currSymbol}{initialCapital.toFixed(2)})</span>
              </div>
            </div>

            {/* Badges on Right */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#E8F8EE] dark:bg-[#132A1C] border border-[#B7ECC8] dark:border-[#1E432A]">
                <div className="w-5 h-5 rounded-full bg-[#10B981]/20 text-[#10B981] flex items-center justify-center text-xs font-bold">
                  ↗
                </div>
                <div>
                  <div className="text-[9px] text-[#786F66] dark:text-[#94A3B8] leading-none">Highest Equity</div>
                  <div className="text-xs font-black font-mono text-[#10B981] mt-0.5">
                    {currSymbol}{equityCurveStats.highestEquity.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FEECEB] dark:bg-[#321B1B] border border-[#FBC5C2] dark:border-[#4B1E1E]">
                <div className="w-5 h-5 rounded-full bg-[#DC2626]/20 text-[#DC2626] flex items-center justify-center text-xs font-bold">
                  ↘
                </div>
                <div>
                  <div className="text-[9px] text-[#786F66] dark:text-[#94A3B8] leading-none">Max Drawdown</div>
                  <div className="text-xs font-black font-mono text-[#DC2626] mt-0.5">
                    -{perf.maxDrawdownPercent.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Monthly Performance & Quick Stats (4 Columns) */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-4">
          
          {/* Top Card: Monthly Performance */}
          <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs transition-colors flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center shrink-0">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                    Monthly Performance
                  </h3>
                  <p className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">
                    Net P&amp;L by day ({currentMonthName} {currentYear})
                  </p>
                </div>
              </div>

              <span className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold ${
                monthlyBarChartData.totalPnl >= 0 
                  ? 'bg-[#E8F8EE] dark:bg-[#132A1C] text-[#10B981]'
                  : 'bg-[#FEECEB] dark:bg-[#321B1B] text-[#DC2626]'
              }`}>
                {monthlyBarChartData.totalPnl >= 0 ? '+' : '-'}{currSymbol}{Math.abs(monthlyBarChartData.totalPnl).toFixed(2)} ({equityCurveStats.monthReturnPct >= 0 ? '+' : ''}{equityCurveStats.monthReturnPct.toFixed(2)}%)
              </span>
            </div>

            {/* Daily Bar Chart with Y-Axis */}
            <div className="h-32 w-full pt-2 relative flex items-center">
              {/* Y-axis Ticks on Left */}
              <div className="h-full flex flex-col justify-between text-[9px] font-mono text-[#9E958C] pr-1.5 shrink-0 text-right select-none">
                <span>{currSymbol}{monthlyBarChartData.roundedMax}</span>
                <span>{currSymbol}{Math.round(monthlyBarChartData.roundedMax / 2)}</span>
                <span>{currSymbol}0</span>
                <span>-{currSymbol}{Math.round(monthlyBarChartData.roundedMax / 2)}</span>
                <span>-{currSymbol}{monthlyBarChartData.roundedMax}</span>
              </div>

              <div className="relative flex-1 h-full flex items-center">
                {/* Horizontal $0 Midline */}
                <div className="absolute inset-x-0 top-1/2 border-b border-dashed border-[#E7E0D6] dark:border-[#2E384D]" />
                
                {/* Bars */}
                <div className="w-full flex items-end justify-between gap-0.5 sm:gap-1 h-full z-10 px-1">
                  {monthlyBarChartData.daysArr.map((item) => {
                    const isPositive = item.pnl > 0.001;
                    const isNegative = item.pnl < -0.001;
                    const heightPercent = Math.min(46, (Math.abs(item.pnl) / monthlyBarChartData.roundedMax) * 46);

                    return (
                      <div 
                        key={item.day} 
                        className="flex-1 flex flex-col items-center h-full justify-center group relative cursor-pointer"
                        onMouseEnter={() => setHoveredBar(item)}
                        onMouseLeave={() => setHoveredBar(null)}
                        onClick={() => {
                          const dateStr = `${currentMonthStr}-${String(item.day).padStart(2, '0')}`;
                          onSelectDate?.(dateStr);
                        }}
                      >
                        {isPositive ? (
                          <div className="w-full flex flex-col items-center justify-end h-1/2">
                            <div
                              style={{ height: `${Math.max(14, heightPercent * 2)}%` }}
                              className="w-full max-w-[6px] rounded-t-sm bg-[#10B981] group-hover:bg-[#059669] transition-all"
                            />
                          </div>
                        ) : isNegative ? (
                          <div className="w-full flex flex-col items-center justify-start h-1/2">
                            <div
                              style={{ height: `${Math.max(14, heightPercent * 2)}%` }}
                              className="w-full max-w-[6px] rounded-b-sm bg-[#EF4444] group-hover:bg-[#DC2626] transition-all"
                            />
                          </div>
                        ) : (
                          <div className="w-1 h-1 rounded-full bg-[#E7E0D6] dark:bg-[#242D3D] group-hover:bg-[#DB9F35] transition-colors" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bar Hover Tooltip */}
              {hoveredBar && (
                <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-[#1F1A16] dark:bg-[#0B0F17] text-white px-2.5 py-1 rounded-lg text-[10px] font-mono shadow-lg border border-[#3A322A] dark:border-[#242D3D] pointer-events-none z-20 whitespace-nowrap">
                  <span>Day {hoveredBar.day}: </span>
                  <span className={hoveredBar.pnl > 0 ? 'text-[#10B981] font-bold' : hoveredBar.pnl < 0 ? 'text-[#EF4444] font-bold' : 'text-[#9E958C]'}>
                    {hoveredBar.pnl >= 0 ? '+' : '-'}{currSymbol}{Math.abs(hoveredBar.pnl).toFixed(2)} ({hoveredBar.r >= 0 ? '+' : ''}{hoveredBar.r.toFixed(1)}R)
                  </span>
                  <span className="text-[#9E958C] ml-1.5">({hoveredBar.count} trade{hoveredBar.count === 1 ? '' : 's'})</span>
                </div>
              )}
            </div>

            {/* X-Axis labels for days */}
            <div className="flex justify-between pl-6 text-[9px] font-mono text-[#9E958C] dark:text-[#64748B] border-t border-[#E7E0D6]/60 dark:border-[#242D3D] pt-1 mt-1">
              <span>1</span>
              <span>5</span>
              <span>10</span>
              <span>15</span>
              <span>20</span>
              <span>25</span>
              <span>31</span>
            </div>
          </div>

          {/* Bottom Card: Quick Stats */}
          <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs transition-colors flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#DB9F35]" />
                <span className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8]">Quick Stats</span>
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

            {/* 6 Mini Stats in 2 Columns x 3 Rows */}
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              {/* Card 1: Total Trades */}
              <div className="p-2.5 rounded-xl bg-[#F2ECE0]/70 dark:bg-[#1A2230] border border-[#DFD5C6]/60 dark:border-[#283244] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#786F66] dark:text-[#94A3B8] block leading-none">Total Trades</span>
                  <span className="text-sm font-black font-mono mt-1 text-[#1F1A16] dark:text-[#F0F4F8] block">
                    {trades.length}
                  </span>
                </div>
                <div className="flex items-end gap-0.5 h-4 text-[#10B981]">
                  <span className="w-1 h-2 bg-[#10B981] rounded-xs" />
                  <span className="w-1 h-3.5 bg-[#10B981] rounded-xs" />
                  <span className="w-1 h-2.5 bg-[#10B981] rounded-xs" />
                </div>
              </div>

              {/* Card 2: Win Rate */}
              <div className="p-2.5 rounded-xl bg-[#F2ECE0]/70 dark:bg-[#1A2230] border border-[#DFD5C6]/60 dark:border-[#283244] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#786F66] dark:text-[#94A3B8] block leading-none">Win Rate</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-sm font-black font-mono text-[#1F1A16] dark:text-[#F0F4F8] leading-none">
                      {Math.round(perf.winRate)}%
                    </span>
                    <span className="text-[9px] font-mono text-[#786F66] dark:text-[#94A3B8]">
                      {perf.winningTrades}W / {perf.losingTrades}L
                    </span>
                  </div>
                </div>
                <div className="relative w-6 h-6 shrink-0">
                  <svg className="w-6 h-6 -rotate-90" viewBox="0 0 36 36">
                    <path className="text-[#E7E0D6] dark:text-[#242D3D]" stroke="currentColor" strokeWidth="3.5" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-[#10B981]" stroke="currentColor" strokeWidth="3.5" strokeDasharray={`${trades.length > 0 ? perf.winRate : 0}, 100`} strokeLinecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                </div>
              </div>

              {/* Card 3: Avg R / Trade */}
              <div className="p-2.5 rounded-xl bg-[#F2ECE0]/70 dark:bg-[#1A2230] border border-[#DFD5C6]/60 dark:border-[#283244] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#786F66] dark:text-[#94A3B8] block leading-none">Avg R / Trade</span>
                  <span className={`text-sm font-black font-mono mt-1 block ${
                    perf.averageR >= 0 ? 'text-[#10B981]' : 'text-[#DC2626]'
                  }`}>
                    {perf.averageR >= 0 ? '+' : ''}{perf.averageR.toFixed(2)}R
                  </span>
                </div>
                <div className="flex items-end gap-0.5 h-4">
                  <span className="w-1 h-1.5 bg-[#10B981] rounded-xs" />
                  <span className="w-1 h-3 bg-[#10B981] rounded-xs" />
                  <span className="w-1 h-4 bg-[#10B981] rounded-xs" />
                </div>
              </div>

              {/* Card 4: Avg Trade Time */}
              <div className="p-2.5 rounded-xl bg-[#F2ECE0]/70 dark:bg-[#1A2230] border border-[#DFD5C6]/60 dark:border-[#283244] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#786F66] dark:text-[#94A3B8] block leading-none">Avg Trade Time</span>
                  <span className="text-sm font-black font-mono mt-1 text-[#1F1A16] dark:text-[#F0F4F8] block">
                    1h 42m
                  </span>
                </div>
                <div className="w-6 h-6 rounded-full bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center">
                  <Activity className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Card 5: Biggest Win */}
              <div className="p-2.5 rounded-xl bg-[#F2ECE0]/70 dark:bg-[#1A2230] border border-[#DFD5C6]/60 dark:border-[#283244] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#786F66] dark:text-[#94A3B8] block leading-none">Biggest Win</span>
                  <span className="text-xs font-black font-mono mt-1 text-[#10B981] block">
                    +{currSymbol}{quickStats.biggestWinPnl.toFixed(2)} (+{quickStats.biggestWin.toFixed(1)}R)
                  </span>
                </div>
                <div className="w-5 h-5 rounded-full bg-[#E8F8EE] dark:bg-[#132A1C] text-[#10B981] flex items-center justify-center text-xs font-bold">
                  ↗
                </div>
              </div>

              {/* Card 6: Biggest Loss */}
              <div className="p-2.5 rounded-xl bg-[#F2ECE0]/70 dark:bg-[#1A2230] border border-[#DFD5C6]/60 dark:border-[#283244] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#786F66] dark:text-[#94A3B8] block leading-none">Biggest Loss</span>
                  <span className="text-xs font-black font-mono mt-1 text-[#DC2626] block">
                    -{currSymbol}{Math.abs(quickStats.biggestLossPnl).toFixed(2)} ({quickStats.biggestLoss <= 0 ? quickStats.biggestLoss.toFixed(1) : -quickStats.biggestLoss.toFixed(1)}R)
                  </span>
                </div>
                <div className="w-5 h-5 rounded-full bg-[#FEECEB] dark:bg-[#321B1B] text-[#DC2626] flex items-center justify-center text-xs font-bold">
                  ↘
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* 6. Middle Row: 3-Column Balanced Feature Grid (Trading Rules removed per user request) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        
        {/* Card 1: Monthly Cycle Progress */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-[#DB9F35]" />
                <div>
                  <h4 className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                    Monthly Cycle Progress
                  </h4>
                  <p className="text-[9px] text-[#786F66] dark:text-[#94A3B8]">
                    {currentMonthName} {currentYear}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('cycle')}
                className="text-[10px] font-bold text-[#DB9F35] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>View Calendar</span>
                <ArrowRight className="w-2.5 h-2.5" />
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
                    {cycleProgress.totalDaysPassed}/{cycleProgress.daysInMonth} Days
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 flex-1 text-[11px]">
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
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[#786F66] dark:text-[#94A3B8]">
                    <span className="w-2 h-2 rounded-full bg-[#9E958C]" /> No Trade Days
                  </span>
                  <span className="font-bold text-[#786F66] dark:text-[#94A3B8] font-mono">{cycleProgress.noTradeDays}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Recent Trades Table */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-[#DB9F35]" />
                <h4 className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                  Recent Trades
                </h4>
              </div>
              <button
                type="button"
                onClick={() => navigate('journal')}
                className="text-[10px] font-bold text-[#DB9F35] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>View All</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>

            {recentTradesList.length === 0 ? (
              <div className="py-6 text-center text-[11px] text-[#786F66] dark:text-[#94A3B8]">
                No trades recorded yet. Log your trades in the Journal.
              </div>
            ) : (
              <div className="overflow-x-auto py-1 text-[11px]">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[9px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
                      <th className="pb-1.5">Pair</th>
                      <th className="pb-1.5">Type</th>
                      <th className="pb-1.5 text-center">R</th>
                      <th className="pb-1.5 text-right">P&L</th>
                      <th className="pb-1.5 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E0D6]/40 dark:divide-[#242D3D]">
                    {recentTradesList.map((t) => (
                      <tr 
                        key={t.id} 
                        onClick={() => onSelectDate?.(t.date)}
                        className="hover:bg-[#F2ECE0]/60 dark:hover:bg-[#1C2331]/60 transition-colors cursor-pointer"
                      >
                        <td className="py-1.5 font-bold font-mono text-[#1F1A16] dark:text-[#F0F4F8]">{t.pair}</td>
                        <td className="py-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            t.order === 'BUY'
                              ? 'bg-[#E8F8EE] dark:bg-[#132A1C] text-[#15803D] dark:text-[#34D399]'
                              : 'bg-[#FEECEB] dark:bg-[#321B1B] text-[#DC2626] dark:text-[#F87171]'
                          }`}>
                            {t.order}
                          </span>
                        </td>
                        <td className={`py-1.5 text-center font-bold font-mono ${
                          (t.rMultiple || 0) >= 0 ? 'text-[#10B981]' : 'text-[#DC2626]'
                        }`}>
                          {(t.rMultiple || 0) >= 0 ? `+${t.rMultiple}R` : `${t.rMultiple}R`}
                        </td>
                        <td className={`py-1.5 text-right font-bold font-mono ${
                          (t.pnl || 0) >= 0 ? 'text-[#10B981]' : 'text-[#DC2626]'
                        }`}>
                          {(t.pnl || 0) >= 0 ? `+${currSymbol}${(t.pnl || 0).toFixed(2)}` : `-${currSymbol}${Math.abs(t.pnl || 0).toFixed(2)}`}
                        </td>
                        <td className="py-1.5 text-right text-[10px] font-mono text-[#786F66] dark:text-[#94A3B8]">
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

        {/* Card 3: Trading Calendar Mini-Grid */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-[#DB9F35]" />
                <h4 className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                  Trading Calendar
                </h4>
              </div>
              <button
                type="button"
                onClick={() => navigate('cycle')}
                className="text-[10px] font-bold text-[#DB9F35] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>View Full</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>

            {/* Mini Calendar Week Header */}
            <div className="grid grid-cols-7 gap-1 text-[9px] font-bold text-[#786F66] dark:text-[#94A3B8] text-center pt-2 pb-1 border-b border-[#E7E0D6]/40 dark:border-[#242D3D]">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>

            {/* Mini Calendar Day Cells */}
            <div className="grid grid-cols-7 gap-1 pt-2 text-[9px] font-mono text-center">
              {calendarDays.map((c, i) => {
                if (!c.day) {
                  return <div key={i} className="min-h-[28px]" />;
                }
                const isWin = c.hasTrade && (c.pnl || 0) > 0.001;
                const isLoss = c.hasTrade && (c.pnl || 0) < -0.001;
                const isBE = c.hasTrade && Math.abs(c.pnl || 0) <= 0.001;

                return (
                  <div
                    key={i}
                    onClick={() => c.dateStr && onSelectDate?.(c.dateStr)}
                    title={c.hasTrade ? `${c.dateStr}: ${(c.pnl || 0) >= 0 ? '+' : '-'}${currSymbol}${Math.abs(c.pnl || 0).toFixed(2)} (${(c.r || 0) >= 0 ? '+' : ''}${(c.r || 0).toFixed(1)}R)` : undefined}
                    className={`p-1 rounded-md border min-h-[28px] flex flex-col justify-between cursor-pointer transition-all hover:scale-105 ${
                      isWin
                        ? 'bg-[#E8F8EE] dark:bg-[#132A1C] border-[#B7ECC8] dark:border-[#1E432A] text-[#15803D] dark:text-[#34D399]'
                        : isLoss
                        ? 'bg-[#FEECEB] dark:bg-[#321B1B] border-[#FBC5C2] dark:border-[#4B1E1E] text-[#DC2626] dark:text-[#F87171]'
                        : isBE
                        ? 'bg-[#FAF2E6] dark:bg-[#1C2331] border-[#E8DCC8] dark:border-[#2E384D] text-[#DB9F35]'
                        : 'bg-transparent border-transparent text-[#9E958C] dark:text-[#64748B] hover:bg-[#F2ECE0] dark:hover:bg-[#1C2331]'
                    }`}
                  >
                    <span className="text-[8px] font-bold block leading-none">{c.day}</span>
                    {c.hasTrade && (
                      <span className="text-[7px] font-bold block leading-none truncate">
                        {(c.pnl || 0) >= 0 ? `+${currSymbol}${Math.abs(c.pnl || 0).toFixed(0)}` : `-${currSymbol}${Math.abs(c.pnl || 0).toFixed(0)}`}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Bottom Row: 3-Column Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        
        {/* Card 1: Top Performers */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[#DB9F35]" />
                <div>
                  <h4 className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                    Top Performers
                  </h4>
                  <p className="text-[9px] text-[#786F66] dark:text-[#94A3B8]">
                    Best performing pairs &amp; setups
                  </p>
                </div>
              </div>

              {/* Toggle: By R-Multiple / By P&L */}
              <div className="flex items-center bg-[#F2ECE0] dark:bg-[#1C2331] p-0.5 rounded-lg border border-[#DFD5C6] dark:border-[#2E384D] text-[10px] font-semibold">
                <button
                  type="button"
                  onClick={() => setPerformerTab('By R-Multiple')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
                    performerTab === 'By R-Multiple'
                      ? 'bg-[#DB9F35] text-[#1F1A16] font-bold shadow-2xs'
                      : 'text-[#786F66] dark:text-[#94A3B8]'
                  }`}
                >
                  By R-Multiple
                </button>
                <button
                  type="button"
                  onClick={() => setPerformerTab('By P&L')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
                    performerTab === 'By P&L'
                      ? 'bg-[#DB9F35] text-[#1F1A16] font-bold shadow-2xs'
                      : 'text-[#786F66] dark:text-[#94A3B8]'
                  }`}
                >
                  By P&amp;L
                </button>
              </div>
            </div>

            {pairStats.length === 0 ? (
              <div className="py-6 text-center text-[11px] text-[#786F66] dark:text-[#94A3B8]">
                No trade pairs recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto py-2 text-[11px]">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[9px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
                      <th className="pb-1.5 w-6">#</th>
                      <th className="pb-1.5">Pair</th>
                      <th className="pb-1.5 text-right">{performerTab === 'By R-Multiple' ? 'Avg R' : 'Net P&L'}</th>
                      <th className="pb-1.5 text-right">Win Rate</th>
                      <th className="pb-1.5 text-right">Trades</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E0D6]/40 dark:divide-[#242D3D]">
                    {pairStats.slice(0, 4).map((p, idx) => (
                      <tr key={p.pair} className="hover:bg-[#F2ECE0]/60 dark:hover:bg-[#1C2331]/60 transition-colors">
                        <td className="py-2 text-[10px] font-mono text-[#9E958C] dark:text-[#64748B]">{idx + 1}</td>
                        <td className="py-2 font-bold font-mono text-[#1F1A16] dark:text-[#F0F4F8]">{p.pair}</td>
                        <td className={`py-2 text-right font-mono font-bold ${
                          (performerTab === 'By R-Multiple' ? p.avgR : p.totalPnl) >= 0 ? 'text-[#10B981]' : 'text-[#DC2626]'
                        }`}>
                          {performerTab === 'By R-Multiple' 
                            ? `${p.avgR >= 0 ? '+' : ''}${p.avgR.toFixed(1)}R`
                            : `${p.totalPnl >= 0 ? '+' : '-'}${currSymbol}${Math.abs(p.totalPnl).toFixed(2)}`}
                        </td>
                        <td className="py-2 text-right font-mono text-[#1F1A16] dark:text-[#F0F4F8]">{p.winRate}%</td>
                        <td className="py-2 text-right font-mono text-[#786F66] dark:text-[#94A3B8]">{p.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Mistakes & Insights */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-[#DB9F35]" />
                <h4 className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                  Mistakes &amp; Insights
                </h4>
              </div>
              <button
                type="button"
                onClick={() => navigate('challenge21')}
                className="text-[10px] font-bold text-[#DB9F35] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>View Details</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>

            <div className="pt-2">
              <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider block mb-2">
                Biggest Leaks
              </span>

              {violationsList.length === 0 ? (
                <div className="py-4 text-center text-[11px] text-[#10B981] font-medium">
                  ✓ 100% Clean Execution! No rule leaks detected.
                </div>
              ) : (
                <div className="space-y-2">
                  {violationsList.slice(0, 3).map((v, i) => (
                    <div key={v.reason} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] font-bold text-[10px] flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[#FEECEB] dark:bg-[#321B1B] text-[#DC2626] font-bold text-[11px]">
                          {v.reason}
                        </span>
                      </div>
                      <span className="text-[#786F66] dark:text-[#94A3B8] text-[11px]">{v.count} occurrence{v.count === 1 ? '' : 's'}</span>
                      <span className="font-bold font-mono text-xs text-[#DC2626]">
                        -{v.lossR.toFixed(1)}R
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Focus This Week Highlight Callout */}
          <div className="mt-3 p-3 rounded-xl bg-[#FAF2E6] dark:bg-[#1A2230] border border-[#E8DCC8] dark:border-[#2E384D] flex items-start gap-2 text-xs">
            <Target className="w-4 h-4 text-[#DB9F35] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#1F1A16] dark:text-[#F0F4F8] block text-[11px]">
                Focus This Week
              </span>
              <p className="text-[10px] text-[#786F66] dark:text-[#94A3B8] mt-0.5 leading-snug">
                Avoid FOMO after strong market moves. Protect capital and wait patiently for valid setups.
              </p>
            </div>
          </div>
        </div>

        {/* Card 3: Discipline & Behavior */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-[#DB9F35]" />
                <h4 className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                  Discipline &amp; Behavior
                </h4>
              </div>
              <button
                type="button"
                onClick={() => navigate('challenge21')}
                className="text-[10px] font-bold text-[#DB9F35] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>View Details</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>

            <div className="flex items-center gap-4 py-3">
              {/* Donut Indicator */}
              <div className="relative w-18 h-18 shrink-0 flex items-center justify-center">
                <svg className="w-18 h-18 -rotate-90" viewBox="0 0 36 36">
                  <path className="text-[#E7E0D6] dark:text-[#242D3D]" stroke="currentColor" strokeWidth="3.5" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-[#10B981]" stroke="currentColor" strokeWidth="3.5" strokeDasharray={`${trades.length > 0 ? discipline.disciplineScore : 100}, 100`} strokeLinecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div className="absolute text-center">
                  <span className="text-sm font-black text-[#1F1A16] dark:text-[#F0F4F8] leading-none block">
                    {trades.length > 0 ? discipline.disciplineScore : 100}%
                  </span>
                  <span className="text-[8px] text-[#786F66] dark:text-[#94A3B8] font-mono leading-none block mt-0.5">
                    {discipline.cleanTradesCount}/{trades.length} Clean
                  </span>
                </div>
              </div>

              {/* Rule Violations breakdown */}
              <div className="space-y-1.5 flex-1 text-[11px]">
                <div className="pb-1 mb-1 border-b border-[#E7E0D6]/50 dark:border-[#242D3D]">
                  <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] block">
                    Rule Violations
                  </span>
                  <span className="text-sm font-black text-[#1F1A16] dark:text-[#F0F4F8] font-mono">
                    {discipline.violationTradesCount} <span className="text-[9px] font-normal text-[#786F66] dark:text-[#94A3B8]">
                      {trades.length > 0 ? `${Math.round((discipline.violationTradesCount / trades.length) * 100)}% of total trades` : '0%'}
                    </span>
                  </span>
                </div>

                {violationsList.length === 0 ? (
                  <div className="text-[11px] text-[#10B981] font-medium py-1">
                    Zero rule violations recorded
                  </div>
                ) : (
                  violationsList.slice(0, 3).map((v) => (
                    <div key={v.reason} className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[#786F66] dark:text-[#94A3B8]">
                        <span className="w-2 h-2 rounded-full bg-[#DC2626]" /> {v.reason}
                      </span>
                      <span className="font-bold text-[#DC2626] font-mono">{v.count}</span>
                    </div>
                  ))
                )}
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
    </div>
  );
};

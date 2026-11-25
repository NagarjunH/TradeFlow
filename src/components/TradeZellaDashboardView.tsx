import React, { useState, useMemo } from 'react';
import {
  Info,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { type Trade, type DayRecord, type AppSettings, defaultSettings } from '../db/db';
import type { TabType } from './Navbar';
import { calculatePerformance } from '../utils/TradingEngine';

interface TradeZellaDashboardViewProps {
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

// -------------------------------------------------------------
// Helper: Semi-circle Speedometer Gauge for Win Rate & Day Win Rate
// -------------------------------------------------------------
const SemiCircleGauge: React.FC<{
  value: number; // 0 to 100
  leftLabel?: string;
  rightLabel?: string;
  leftCount?: number | string;
  rightCount?: number | string;
}> = ({ value, leftLabel: _leftLabel, rightLabel: _rightLabel, leftCount, rightCount }) => {
  const clamped = Math.max(0, Math.min(100, value));
  const r = 36;
  const arcLength = Math.PI * r; // ~113.1
  const strokeDash = (clamped / 100) * arcLength;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-14 overflow-hidden">
        <svg viewBox="0 0 100 55" className="w-full h-full">
          {/* Background Loss Arc (Red) */}
          <path
            d="M 12 50 A 38 38 0 0 1 88 50"
            fill="none"
            stroke="#EF4444"
            strokeWidth="8"
            strokeLinecap="round"
            className="opacity-70 dark:opacity-80"
          />
          {/* Foreground Win Arc (Green) */}
          <path
            d="M 12 50 A 38 38 0 0 1 88 50"
            fill="none"
            stroke="#10B981"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${strokeDash} ${arcLength}`}
          />
        </svg>
      </div>

      {/* Mini counts below gauge */}
      {(leftCount !== undefined || rightCount !== undefined) && (
        <div className="flex items-center justify-between w-full px-2 text-[10px] font-mono font-bold mt-0.5">
          <span className="text-[#10B981]">{leftCount ?? ''}</span>
          <span className="text-[#EF4444]">{rightCount ?? ''}</span>
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------------------
// Helper: Circular Ring Gauge for Profit Factor
// -------------------------------------------------------------
const DonutRingGauge: React.FC<{
  profitFactor: number;
}> = ({ profitFactor }) => {
  const r = 18;
  const c = 2 * Math.PI * r; // ~113.1
  // Scale profit factor: 1.0 = 50%, 2.0 = 80%, 3.0+ = 100%
  const normalized = profitFactor <= 0 ? 0 : Math.min(100, (profitFactor / 2.5) * 100);
  const strokeDash = (normalized / 100) * c;

  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
        {/* Background ring */}
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="4.5"
          className="text-[#E7E0D6] dark:text-[#283244]"
        />
        {/* Value ring */}
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="#10B981"
          strokeWidth="4.5"
          strokeDasharray={`${strokeDash} ${c}`}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

// -------------------------------------------------------------
// Helper: Split Bar for Avg Win / Loss Comparison
// -------------------------------------------------------------
const SplitWinLossBar: React.FC<{
  avgWin: number;
  avgLoss: number;
  currSymbol: string;
}> = ({ avgWin, avgLoss, currSymbol }) => {
  const total = avgWin + Math.abs(avgLoss);
  const winPct = total > 0 ? (avgWin / total) * 100 : 50;
  const lossPct = 100 - winPct;

  const formatShort = (val: number) => {
    if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return val.toFixed(1);
  };

  return (
    <div className="w-full space-y-1.5 pt-1">
      {/* Horizontal split bar */}
      <div className="w-full h-2.5 rounded-full bg-[#E7E0D6] dark:bg-[#283244] flex overflow-hidden">
        <div
          className="bg-[#10B981] h-full transition-all duration-500"
          style={{ width: `${winPct}%` }}
        />
        <div
          className="bg-[#EF4444] h-full transition-all duration-500"
          style={{ width: `${lossPct}%` }}
        />
      </div>

      {/* Values on bottom */}
      <div className="flex items-center justify-between text-[10px] font-mono font-bold">
        <span className="text-[#10B981]">
          {avgWin > 0 ? `+${currSymbol}${formatShort(avgWin)}` : `${currSymbol}0.0`}
        </span>
        <span className="text-[#EF4444]">
          {avgLoss > 0 ? `-${currSymbol}${formatShort(avgLoss)}` : `${currSymbol}0.0`}
        </span>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// Main TradeZella Dashboard View Component
// -------------------------------------------------------------
export const TradeZellaDashboardView: React.FC<TradeZellaDashboardViewProps> = ({
  trades = [],
  days = [],
  settings = defaultSettings,
  onSelectDate,
  onTabChange,
  selectedDate,
}) => {
  const [recentTab, setRecentTab] = useState<'recent' | 'open'>('recent');
  const [hoveredPoint, setHoveredPoint] = useState<{
    date: string;
    pnl: number;
    cumulative: number;
    x: number;
    y: number;
  } | null>(null);

  const currSymbol = settings.currency === 'USD' ? '$' : '₹';
  const initialCap = settings.initialCapital || 1000;
  const activeDate = selectedDate || new Date().toISOString().split('T')[0];

  // 1. Performance Engine Metrics
  const perf = useMemo(() => {
    return calculatePerformance(trades, settings);
  }, [trades, settings]);

  // 2. Day-level Statistics (Group trades by calendar date)
  const dayStats = useMemo(() => {
    const map = new Map<string, { pnl: number; wins: number; losses: number; count: number }>();

    for (const t of trades) {
      const d = t.date;
      const cur = map.get(d) || { pnl: 0, wins: 0, losses: 0, count: 0 };
      cur.pnl += t.pnl;
      cur.count += 1;
      if (t.pnl > 0.001) cur.wins += 1;
      else if (t.pnl < -0.001) cur.losses += 1;
      map.set(d, cur);
    }

    let winningDays = 0;
    let losingDays = 0;
    let breakevenDays = 0;

    for (const val of map.values()) {
      if (val.pnl > 0.001) winningDays += 1;
      else if (val.pnl < -0.001) losingDays += 1;
      else breakevenDays += 1;
    }

    const totalDays = map.size;
    const dayWinRate = totalDays > 0 ? (winningDays / totalDays) * 100 : 0;

    return {
      dailyMap: map,
      winningDays,
      losingDays,
      breakevenDays,
      totalDays,
      dayWinRate,
    };
  }, [trades]);

  // 3. Avg Win / Avg Loss Ratio
  const avgWinLossStats = useMemo(() => {
    let winSum = 0;
    let winCount = 0;
    let lossSum = 0;
    let lossCount = 0;

    for (const t of trades) {
      if (t.pnl > 0.001) {
        winSum += t.pnl;
        winCount += 1;
      } else if (t.pnl < -0.001) {
        lossSum += Math.abs(t.pnl);
        lossCount += 1;
      }
    }

    const avgWin = winCount > 0 ? winSum / winCount : 0;
    const avgLoss = lossCount > 0 ? lossSum / lossCount : 0;
    const ratio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 3.0 : 0;

    return {
      avgWin,
      avgLoss,
      ratio,
    };
  }, [trades]);

  // 4. TradeFlow / Zella Radar Score (6 axes: Win %, PF, Avg Win/Loss, Recovery, Max DD, Consistency)
  const radarMetrics = useMemo(() => {
    const winScore = Math.min(100, Math.max(0, (perf.winRate / 60) * 100));
    const pfScore = Math.min(100, Math.max(0, (perf.profitFactor / 2.5) * 100));
    const wlScore = Math.min(100, Math.max(0, (avgWinLossStats.ratio / 2.0) * 100));
    const recoveryScore =
      perf.maxDrawdownUsd > 0
        ? Math.min(100, Math.max(0, (perf.netPnl / perf.maxDrawdownUsd) * 30))
        : perf.netPnl >= 0
        ? 90
        : 30;
    const ddScore = Math.max(0, Math.min(100, 100 - perf.maxDrawdownPercent * 4.5));
    const consistencyScore = Math.min(
      100,
      Math.max(0, dayStats.dayWinRate * 0.7 + (trades.length > 5 ? 25 : 10))
    );

    const overallScore =
      trades.length === 0
        ? 0
        : Math.round(
            ((winScore + pfScore + wlScore + recoveryScore + ddScore + consistencyScore) / 6) * 10
          ) / 10;

    // Hexagonal points math for SVG radar
    const cx = 110;
    const cy = 85;
    const maxR = 56;
    const scores = [winScore, pfScore, wlScore, recoveryScore, ddScore, consistencyScore];

    const polyPoints = scores
      .map((score, i) => {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const dist = (score / 100) * maxR;
        const x = cx + dist * Math.cos(angle);
        const y = cy + dist * Math.sin(angle);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    const labels = [
      { text: 'Win %', x: cx, y: cy - maxR - 7 },
      { text: 'Profit factor', x: cx + maxR + 24, y: cy - maxR / 2 },
      { text: 'Avg win/loss', x: cx + maxR + 24, y: cy + maxR / 2 + 5 },
      { text: 'Recovery factor', x: cx, y: cy + maxR + 13 },
      { text: 'Max drawdown', x: cx - maxR - 26, y: cy + maxR / 2 + 5 },
      { text: 'Consistency', x: cx - maxR - 22, y: cy - maxR / 2 },
    ];

    return {
      winScore,
      pfScore,
      wlScore,
      recoveryScore,
      ddScore,
      consistencyScore,
      overallScore,
      polyPoints,
      labels,
      cx,
      cy,
      maxR,
    };
  }, [perf, dayStats, avgWinLossStats, trades.length]);

  // 5. Progress Tracker (GitHub / TradeZella Activity Heatmap Matrix for last 10 weeks)
  const heatmapData = useMemo(() => {
    const today = new Date();
    const cells: { dateStr: string; pnl: number; tradesCount: number; isToday: boolean }[] = [];

    // 10 weeks = 70 days
    const totalDays = 70;
    const start = new Date(today);
    start.setDate(today.getDate() - totalDays + 1);

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const cur = dayStats.dailyMap.get(dateStr);
      cells.push({
        dateStr,
        pnl: cur ? cur.pnl : 0,
        tradesCount: cur ? cur.count : 0,
        isToday: dateStr === activeDate,
      });
    }

    // Split into 7 rows (Sun to Sat)
    const rows: { dateStr: string; pnl: number; tradesCount: number; isToday: boolean }[][] = [
      [], [], [], [], [], [], []
    ];

    cells.forEach((cell) => {
      const dayOfWeek = new Date(cell.dateStr).getDay();
      rows[dayOfWeek].push(cell);
    });

    // Today's rules score
    const todayRecord = days.find((d) => d.date === activeDate);
    let rulesAdhered = 0;
    const totalRules = 5;
    if (todayRecord && todayRecord.rules) {
      const r = todayRecord.rules;
      if (r.riskManagement) rulesAdhered++;
      if (r.dailyLossLimit) rulesAdhered++;
      if (r.slPredefined) rulesAdhered++;
      if (r.htfContextClear) rulesAdhered++;
      if (r.noEmotionalTrade) rulesAdhered++;
    } else {
      // Default good standing if no violations
      rulesAdhered = 4;
    }

    return {
      rows,
      rulesAdhered,
      totalRules,
    };
  }, [dayStats.dailyMap, days, activeDate]);

  // 6. Cumulative PnL Curve Data
  const cumulativeEquityCurve = useMemo(() => {
    const sorted = [...trades].sort(
      (a, b) => new Date(`${a.date}T${a.time || '00:00'}`).getTime() - new Date(`${b.date}T${b.time || '00:00'}`).getTime()
    );

    let runningPnl = 0;
    const points: { date: string; pnl: number; cumulative: number }[] = [];

    for (const t of sorted) {
      runningPnl += t.pnl;
      points.push({
        date: t.date,
        pnl: t.pnl,
        cumulative: runningPnl,
      });
    }

    if (points.length === 0) {
      return { points: [], pathD: '', minVal: 0, maxVal: 100, areaPathD: '' };
    }

    const minVal = Math.min(0, ...points.map((p) => p.cumulative));
    const maxVal = Math.max(100, ...points.map((p) => p.cumulative));
    const valRange = maxVal - minVal || 1;

    const width = 500;
    const height = 150;
    const padL = 10;
    const padR = 10;
    const padT = 15;
    const padB = 25;

    const chartW = width - padL - padR;
    const chartH = height - padT - padB;

    const coords = points.map((p, idx) => {
      const x = padL + (idx / Math.max(1, points.length - 1)) * chartW;
      const y = padT + (1 - (p.cumulative - minVal) / valRange) * chartH;
      return { x, y, ...p };
    });

    let pathD = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
    for (let i = 1; i < coords.length; i++) {
      pathD += ` L ${coords[i].x.toFixed(1)} ${coords[i].y.toFixed(1)}`;
    }

    const zeroY = padT + (1 - (0 - minVal) / valRange) * chartH;
    const areaPathD = `${pathD} L ${coords[coords.length - 1].x.toFixed(1)} ${zeroY.toFixed(1)} L ${coords[0].x.toFixed(1)} ${zeroY.toFixed(1)} Z`;

    return {
      points: coords,
      pathD,
      areaPathD,
      minVal,
      maxVal,
      zeroY,
      width,
      height,
    };
  }, [trades]);

  // 7. Net Daily P&L Bars (Recent trading days)
  const dailyBarData = useMemo(() => {
    const dates = Array.from(dayStats.dailyMap.keys()).sort().slice(-14);
    const bars = dates.map((d) => {
      const cur = dayStats.dailyMap.get(d)!;
      return {
        date: d,
        pnl: cur.pnl,
        tradesCount: cur.count,
      };
    });

    const maxAbs = Math.max(10, ...bars.map((b) => Math.abs(b.pnl)));

    return {
      bars,
      maxAbs,
    };
  }, [dayStats.dailyMap]);

  // 8. Recent Closed Trades & Open Positions
  const recentTradesList = useMemo(() => {
    return [...trades]
      .sort((a, b) => new Date(`${b.date}T${b.time || '00:00'}`).getTime() - new Date(`${a.date}T${a.time || '00:00'}`).getTime())
      .slice(0, 7);
  }, [trades]);

  return (
    <div className="space-y-4 sm:space-y-5 animate-fade-in pb-16 text-[#1F1A16] dark:text-[#F0F4F8] transition-colors font-sans">
      
      {/* ======================================================== */}
      {/* 1. TOP ROW: 5 KPI Metric Cards with TradeZella Visual Gauges */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        
        {/* Card 1: Net P&L */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between transition-all hover:shadow-md">
          <div className="flex items-center gap-1.5 text-xs text-[#786F66] dark:text-[#94A3B8]">
            <span className="font-bold tracking-tight">Net P&amp;L</span>
            <Info className="w-3 h-3 opacity-60" />
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#FAF2E6] dark:bg-[#1C2433] text-[#D97706] border border-[#E7E0D6] dark:border-[#2E384D] ml-auto">
              {trades.length} trades
            </span>
          </div>

          <div className="my-2.5">
            <div
              className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                perf.netPnl >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'
              }`}
            >
              {perf.netPnl >= 0 ? '+' : '-'}
              {currSymbol}
              {Math.abs(perf.netPnl).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-[#E7E0D6]/60 dark:border-[#242D3D] flex items-center justify-between text-[11px] font-mono">
            <span className="text-[#786F66] dark:text-[#94A3B8]">Return:</span>
            <span className={`font-bold ${perf.roiPercent >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
              {perf.roiPercent >= 0 ? '+' : ''}{perf.roiPercent.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Card 2: Trade win % (With Semi-Circle Speedometer Gauge) */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between transition-all hover:shadow-md">
          <div className="flex items-center gap-1.5 text-xs text-[#786F66] dark:text-[#94A3B8]">
            <span className="font-bold tracking-tight">Trade win %</span>
            <Info className="w-3 h-3 opacity-60" />
          </div>

          <div className="my-1.5 flex items-center justify-between gap-2">
            <div className="text-2xl sm:text-3xl font-black font-mono text-[#1F1A16] dark:text-[#F0F4F8]">
              {trades.length > 0 ? perf.winRate.toFixed(1) : '0.0'}%
            </div>
            <SemiCircleGauge
              value={perf.winRate}
              leftCount={`${perf.winningTrades}W`}
              rightCount={`${perf.losingTrades}L`}
            />
          </div>

          <div className="pt-2 border-t border-[#E7E0D6]/60 dark:border-[#242D3D] flex items-center justify-between text-[11px] font-mono text-[#786F66] dark:text-[#94A3B8]">
            <span>Break-even:</span>
            <span className="font-bold text-[#D97706]">{perf.breakEvenTrades} BE</span>
          </div>
        </div>

        {/* Card 3: Profit factor (With Circular Ring Gauge) */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between transition-all hover:shadow-md">
          <div className="flex items-center gap-1.5 text-xs text-[#786F66] dark:text-[#94A3B8]">
            <span className="font-bold tracking-tight">Profit factor</span>
            <Info className="w-3 h-3 opacity-60" />
          </div>

          <div className="my-1.5 flex items-center justify-between gap-2">
            <div className="text-2xl sm:text-3xl font-black font-mono text-[#1F1A16] dark:text-[#F0F4F8]">
              {trades.length > 0
                ? perf.profitFactor > 99
                  ? '∞'
                  : perf.profitFactor.toFixed(2)
                : '0.00'}
            </div>
            <DonutRingGauge profitFactor={perf.profitFactor} />
          </div>

          <div className="pt-2 border-t border-[#E7E0D6]/60 dark:border-[#242D3D] flex items-center justify-between text-[11px] font-mono text-[#786F66] dark:text-[#94A3B8]">
            <span>Expectancy:</span>
            <span className={`font-bold ${perf.expectancyUsd >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
              {perf.expectancyUsd >= 0 ? '+' : ''}{currSymbol}{perf.expectancyUsd.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Card 4: Day win % (With Winning vs Losing Days Gauge) */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between transition-all hover:shadow-md">
          <div className="flex items-center gap-1.5 text-xs text-[#786F66] dark:text-[#94A3B8]">
            <span className="font-bold tracking-tight">Day win %</span>
            <Info className="w-3 h-3 opacity-60" />
          </div>

          <div className="my-1.5 flex items-center justify-between gap-2">
            <div className="text-2xl sm:text-3xl font-black font-mono text-[#1F1A16] dark:text-[#F0F4F8]">
              {dayStats.totalDays > 0 ? dayStats.dayWinRate.toFixed(1) : '0.0'}%
            </div>
            <SemiCircleGauge
              value={dayStats.dayWinRate}
              leftCount={`${dayStats.winningDays}D`}
              rightCount={`${dayStats.losingDays}D`}
            />
          </div>

          <div className="pt-2 border-t border-[#E7E0D6]/60 dark:border-[#242D3D] flex items-center justify-between text-[11px] font-mono text-[#786F66] dark:text-[#94A3B8]">
            <span>Traded Days:</span>
            <span className="font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
              {dayStats.totalDays} days
            </span>
          </div>
        </div>

        {/* Card 5: Avg win/loss trade (With Split Horizontal Bar) */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between transition-all hover:shadow-md">
          <div className="flex items-center gap-1.5 text-xs text-[#786F66] dark:text-[#94A3B8]">
            <span className="font-bold tracking-tight">Avg win/loss trade</span>
            <Info className="w-3 h-3 opacity-60" />
          </div>

          <div className="my-1 space-y-1">
            <div className="text-2xl sm:text-3xl font-black font-mono text-[#1F1A16] dark:text-[#F0F4F8]">
              {avgWinLossStats.ratio.toFixed(2)}
            </div>
            <SplitWinLossBar
              avgWin={avgWinLossStats.avgWin}
              avgLoss={avgWinLossStats.avgLoss}
              currSymbol={currSymbol}
            />
          </div>

          <div className="pt-2 border-t border-[#E7E0D6]/60 dark:border-[#242D3D] flex items-center justify-between text-[11px] font-mono text-[#786F66] dark:text-[#94A3B8]">
            <span>Avg Win / Loss:</span>
            <span className="font-bold text-[#D97706]">{avgWinLossStats.ratio.toFixed(1)}:1</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. MIDDLE ROW: TradeFlow Radar Score | Progress Heatmap | Cumulative P&L */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4">
        
        {/* Card A: TradeFlow Score (Radar / Spider Chart) */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between transition-all">
          <div className="flex items-center justify-between pb-2 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8]">TradeFlow Score</span>
              <Info className="w-3 h-3 text-[#786F66] dark:text-[#94A3B8]" />
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#FAF2E6] dark:bg-[#1C2433] text-[#D97706] border border-[#E7E0D6] dark:border-[#2E384D]">
              6-AXIS RADAR
            </span>
          </div>

          {/* SVG Radar Spider Chart */}
          <div className="py-2 flex items-center justify-center">
            <svg viewBox="0 0 220 175" className="w-full max-w-[250px] h-auto overflow-visible">
              {/* Concentric Background Hexagons */}
              {[0.25, 0.5, 0.75, 1.0].map((level) => {
                const pts = [0, 1, 2, 3, 4, 5]
                  .map((i) => {
                    const angle = (Math.PI / 3) * i - Math.PI / 2;
                    const d = level * radarMetrics.maxR;
                    return `${(radarMetrics.cx + d * Math.cos(angle)).toFixed(1)},${(
                      radarMetrics.cy + d * Math.sin(angle)
                    ).toFixed(1)}`;
                  })
                  .join(' ');
                return (
                  <polygon
                    key={level}
                    points={pts}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.8"
                    className="text-[#E7E0D6] dark:text-[#283244]"
                  />
                );
              })}

              {/* Radial Axis Lines */}
              {[0, 1, 2, 3, 4, 5].map((i) => {
                const angle = (Math.PI / 3) * i - Math.PI / 2;
                const x2 = radarMetrics.cx + radarMetrics.maxR * Math.cos(angle);
                const y2 = radarMetrics.cy + radarMetrics.maxR * Math.sin(angle);
                return (
                  <line
                    key={i}
                    x1={radarMetrics.cx}
                    y1={radarMetrics.cy}
                    x2={x2}
                    y2={y2}
                    stroke="currentColor"
                    strokeWidth="0.8"
                    className="text-[#E7E0D6] dark:text-[#283244]"
                  />
                );
              })}

              {/* Radar Filled Polygon */}
              {trades.length > 0 && (
                <polygon
                  points={radarMetrics.polyPoints}
                  fill="rgba(217, 119, 6, 0.28)"
                  stroke="#D97706"
                  strokeWidth="2"
                  className="transition-all duration-500"
                />
              )}

              {/* Axis Labels */}
              {radarMetrics.labels.map((lbl, idx) => (
                <text
                  key={idx}
                  x={lbl.x}
                  y={lbl.y}
                  textAnchor="middle"
                  className="text-[7.5px] font-bold fill-[#786F66] dark:fill-[#94A3B8]"
                >
                  {lbl.text}
                </text>
              ))}
            </svg>
          </div>

          {/* Score Readout & Spectrum Bar */}
          <div className="pt-2 border-t border-[#E7E0D6]/60 dark:border-[#242D3D] space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-semibold text-[#786F66] dark:text-[#94A3B8]">
                Your TradeFlow Score
              </span>
              <span className="text-lg font-black font-mono text-[#D97706]">
                {radarMetrics.overallScore.toFixed(1)}
              </span>
            </div>

            {/* Gradient Spectrum Bar with Marker */}
            <div className="relative w-full h-2 rounded-full bg-gradient-to-r from-red-500 via-amber-400 via-emerald-400 to-emerald-600">
              <div
                className="absolute -top-1 w-4 h-4 rounded-full bg-white dark:bg-[#131822] border-2 border-[#D97706] shadow-sm -ml-2 transition-all duration-500"
                style={{ left: `${Math.min(98, Math.max(2, radarMetrics.overallScore))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[9px] font-mono text-[#786F66] dark:text-[#94A3B8] pt-0.5">
              <span>0</span>
              <span>20</span>
              <span>40</span>
              <span>60</span>
              <span>80</span>
              <span>100</span>
            </div>
          </div>
        </div>

        {/* Card B: Progress Tracker (Heatmap Calendar Grid & Daily Checklist) */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between transition-all">
          <div className="flex items-center justify-between pb-2 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8]">Progress tracker</span>
              <Info className="w-3 h-3 text-[#786F66] dark:text-[#94A3B8]" />
            </div>
            <button
              type="button"
              onClick={() => onTabChange?.('cycle')}
              className="text-[11px] font-bold text-[#D97706] hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>View cycle</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* 7-Day Matrix Grid */}
          <div className="py-3 flex items-start gap-2 overflow-x-auto no-scrollbar">
            {/* Day of Week Labels */}
            <div className="flex flex-col gap-1 text-[9px] font-mono text-[#786F66] dark:text-[#94A3B8] pr-1 pt-0.5 shrink-0">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Matrix Tiles */}
            <div className="grid grid-flow-col grid-rows-7 gap-1">
              {heatmapData.rows.flat().map((cell, idx) => {
                let bg = 'bg-[#E7E0D6]/60 dark:bg-[#1E2638]';
                if (cell.pnl > 0.001) {
                  bg = cell.pnl > 50 ? 'bg-[#10B981]' : 'bg-[#10B981]/60';
                } else if (cell.pnl < -0.001) {
                  bg = Math.abs(cell.pnl) > 50 ? 'bg-[#EF4444]' : 'bg-[#EF4444]/60';
                }

                return (
                  <div
                    key={idx}
                    title={`${cell.dateStr}: ${cell.pnl >= 0 ? '+' : ''}${currSymbol}${cell.pnl.toFixed(2)} (${cell.tradesCount} trades)`}
                    className={`w-3.5 h-3.5 rounded-[3px] transition-transform hover:scale-125 cursor-pointer ${bg} ${
                      cell.isToday ? 'ring-1.5 ring-[#D97706]' : ''
                    }`}
                    onClick={() => onSelectDate?.(cell.dateStr)}
                  />
                );
              })}
            </div>
          </div>

          {/* Heatmap Legend */}
          <div className="flex items-center justify-end gap-1.5 text-[9px] font-mono text-[#786F66] dark:text-[#94A3B8] pb-2">
            <span>Less</span>
            <div className="w-2.5 h-2.5 rounded-[2px] bg-[#E7E0D6]/60 dark:bg-[#1E2638]" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-[#10B981]/40" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-[#10B981]/70" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-[#10B981]" />
            <span>More</span>
          </div>

          {/* Today's Checklist Score */}
          <div className="pt-2 border-t border-[#E7E0D6]/60 dark:border-[#242D3D] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                Today's score
              </span>
              <span className="font-mono font-bold text-[#D97706]">
                {heatmapData.rulesAdhered} / {heatmapData.totalRules}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 rounded-full bg-[#E7E0D6] dark:bg-[#283244] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#10B981] transition-all duration-500"
                style={{ width: `${(heatmapData.rulesAdhered / heatmapData.totalRules) * 100}%` }}
              />
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <span className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">
                Discipline adhering to trade plan
              </span>
              <button
                type="button"
                onClick={() => onTabChange?.('rules')}
                className="text-[11px] font-bold text-[#D97706] hover:underline cursor-pointer"
              >
                Daily checklist
              </button>
            </div>
          </div>
        </div>

        {/* Card C: Daily Net Cumulative P&L (Equity Curve Area Chart) */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between transition-all">
          <div className="flex items-center justify-between pb-2 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8]">Daily net cumulative P&amp;L</span>
              <Info className="w-3 h-3 text-[#786F66] dark:text-[#94A3B8]" />
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/25">
              GROWTH
            </span>
          </div>

          {/* Interactive Area Chart */}
          <div className="relative py-2 flex items-center justify-center">
            {cumulativeEquityCurve.points.length > 0 ? (
              <svg
                viewBox={`0 0 ${cumulativeEquityCurve.width} ${cumulativeEquityCurve.height}`}
                className="w-full h-auto overflow-visible cursor-crosshair"
              >
                <defs>
                  <linearGradient id="zellaAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {/* Gridlines */}
                <line x1="10" y1="20" x2="490" y2="20" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" className="text-[#E7E0D6] dark:text-[#283244]" />
                <line x1="10" y1="75" x2="490" y2="75" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" className="text-[#E7E0D6] dark:text-[#283244]" />
                <line x1="10" y1="130" x2="490" y2="130" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" className="text-[#E7E0D6] dark:text-[#283244]" />

                {/* Gradient area under line */}
                <path d={cumulativeEquityCurve.areaPathD} fill="url(#zellaAreaGrad)" />

                {/* Line */}
                <path
                  d={cumulativeEquityCurve.pathD}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Interactive Points */}
                {cumulativeEquityCurve.points.map((pt, idx) => (
                  <circle
                    key={idx}
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredPoint?.x === pt.x ? 5 : 3}
                    fill={hoveredPoint?.x === pt.x ? '#10B981' : '#FFFFFF'}
                    stroke="#10B981"
                    strokeWidth="2"
                    className="transition-all cursor-pointer"
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                ))}
              </svg>
            ) : (
              <div className="py-12 text-center text-xs text-[#786F66] dark:text-[#94A3B8]">
                No trade data recorded yet
              </div>
            )}

            {/* Hover Tooltip */}
            {hoveredPoint && (
              <div className="absolute top-2 right-2 bg-black/85 text-white text-[10px] font-mono px-2.5 py-1.5 rounded-lg shadow-lg pointer-events-none z-10">
                <div>Date: {hoveredPoint.date}</div>
                <div className={hoveredPoint.cumulative >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}>
                  Net P&amp;L: {hoveredPoint.cumulative >= 0 ? '+' : ''}{currSymbol}{hoveredPoint.cumulative.toFixed(2)}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Labels */}
          <div className="pt-2 border-t border-[#E7E0D6]/60 dark:border-[#242D3D] flex items-center justify-between text-[10px] font-mono text-[#786F66] dark:text-[#94A3B8]">
            <span>Peak: {currSymbol}{cumulativeEquityCurve.maxVal.toFixed(1)}</span>
            <span className="font-bold text-[#10B981]">
              Current: {currSymbol}{perf.netPnl.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. BOTTOM ROW: Net Daily P&L | Recent Trades | Account Balance */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4">
        
        {/* Card 1: Net Daily P&L (Vertical Bar Chart) */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between transition-all">
          <div className="flex items-center justify-between pb-2 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8]">Net daily P&amp;L</span>
              <Info className="w-3 h-3 text-[#786F66] dark:text-[#94A3B8]" />
            </div>
            <span className="text-[10px] font-mono text-[#786F66] dark:text-[#94A3B8]">
              Last {dailyBarData.bars.length} sessions
            </span>
          </div>

          {/* Bar Chart Canvas */}
          <div className="relative py-4 flex items-center justify-center min-h-[160px]">
            {dailyBarData.bars.length > 0 ? (
              <div className="w-full flex items-end justify-between gap-1.5 h-36 px-2">
                {dailyBarData.bars.map((bar, idx) => {
                  const maxH = 60; // pixels max in each direction
                  const height = Math.max(4, Math.min(maxH, (Math.abs(bar.pnl) / (dailyBarData.maxAbs || 1)) * maxH));
                  const isProfit = bar.pnl >= 0;

                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center justify-center group relative cursor-pointer"
                      onClick={() => onSelectDate?.(bar.date)}
                    >
                      {/* Bar */}
                      <div
                        className={`w-full max-w-[20px] rounded-t-sm transition-all duration-300 group-hover:opacity-80 ${
                          isProfit ? 'bg-[#10B981]' : 'bg-[#EF4444]'
                        }`}
                        style={{ height: `${height}px` }}
                      />

                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 left-1/2 -translate-x-1/2 bg-black/85 text-white text-[9px] font-mono px-2 py-1 rounded shadow pointer-events-none whitespace-nowrap z-20">
                        {bar.date}: {isProfit ? '+' : ''}{currSymbol}{bar.pnl.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-xs text-[#786F66] dark:text-[#94A3B8]">
                No daily trading sessions recorded
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-[#E7E0D6]/60 dark:border-[#242D3D] flex items-center justify-between text-[10px] font-mono text-[#786F66] dark:text-[#94A3B8]">
            <span>Winning Days: {dayStats.winningDays}</span>
            <span>Losing Days: {dayStats.losingDays}</span>
          </div>
        </div>

        {/* Card 2: Recent Trades / Open Positions Table */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between transition-all">
          <div className="flex items-center justify-between pb-2 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
            {/* Tabs: Recent trades vs Open positions */}
            <div className="flex items-center gap-1 bg-[#FAF2E6] dark:bg-[#1C2433] p-0.5 rounded-lg border border-[#E7E0D6] dark:border-[#2E384D] text-xs font-bold">
              <button
                type="button"
                onClick={() => setRecentTab('recent')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  recentTab === 'recent'
                    ? 'bg-white dark:bg-[#242D3D] text-[#1F1A16] dark:text-[#F0F4F8] shadow-2xs font-bold'
                    : 'text-[#786F66] dark:text-[#94A3B8] hover:text-[#1F1A16]'
                }`}
              >
                Recent trades
              </button>
              <button
                type="button"
                onClick={() => setRecentTab('open')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  recentTab === 'open'
                    ? 'bg-white dark:bg-[#242D3D] text-[#1F1A16] dark:text-[#F0F4F8] shadow-2xs font-bold'
                    : 'text-[#786F66] dark:text-[#94A3B8] hover:text-[#1F1A16]'
                }`}
              >
                Open positions
              </button>
            </div>

            <button
              type="button"
              onClick={() => onTabChange?.('journal')}
              className="text-[11px] font-bold text-[#D97706] hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>View all</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {/* Table Content */}
          <div className="py-2 flex-1 overflow-x-auto no-scrollbar">
            {recentTab === 'recent' ? (
              recentTradesList.length > 0 ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] font-mono text-[#786F66] dark:text-[#94A3B8] border-b border-[#E7E0D6]/40 dark:border-[#242D3D]/60 text-left">
                      <th className="pb-1.5 font-normal">Close Date</th>
                      <th className="pb-1.5 font-normal">Symbol</th>
                      <th className="pb-1.5 font-normal text-right">Net P&amp;L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E0D6]/30 dark:divide-[#242D3D]/40 font-mono">
                    {recentTradesList.map((t, idx) => {
                      const isProfit = t.pnl >= 0;
                      return (
                        <tr key={t.id || idx} className="hover:bg-[#FAF2E6]/40 dark:hover:bg-[#1C2433]/40 transition-colors">
                          <td className="py-2 text-[11px] text-[#786F66] dark:text-[#94A3B8]">
                            {t.date}
                          </td>
                          <td className="py-2">
                            <span className="font-bold text-[#1F1A16] dark:text-[#F0F4F8] text-[11px]">
                              {t.pair}
                            </span>
                            <span
                              className={`ml-1 text-[9px] px-1 py-0.2 rounded font-bold ${
                                t.order === 'BUY'
                                  ? 'bg-[#10B981]/15 text-[#10B981]'
                                  : 'bg-[#EF4444]/15 text-[#EF4444]'
                              }`}
                            >
                              {t.order}
                            </span>
                          </td>
                          <td className={`py-2 text-right font-black text-[11px] ${
                            isProfit ? 'text-[#10B981]' : 'text-[#EF4444]'
                          }`}>
                            {isProfit ? '+' : ''}{currSymbol}{t.pnl.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="py-8 text-center text-xs text-[#786F66] dark:text-[#94A3B8]">
                  No trades recorded
                </div>
              )
            ) : (
              <div className="py-10 text-center text-xs text-[#786F66] dark:text-[#94A3B8] space-y-1">
                <p className="font-bold">No open positions currently</p>
                <p className="text-[10px]">All trades are closed and logged in your journal.</p>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-[#E7E0D6]/60 dark:border-[#242D3D] flex items-center justify-between text-[10px] font-mono text-[#786F66] dark:text-[#94A3B8]">
            <span>Synced with Vantage Broker</span>
            <span className="text-[#10B981] font-bold">● Live Sync</span>
          </div>
        </div>

        {/* Card 3: Account Balance & Drawdown Curve */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between transition-all">
          <div className="flex items-center justify-between pb-2 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8]">Account balance</span>
              <Info className="w-3 h-3 text-[#786F66] dark:text-[#94A3B8]" />
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="flex items-center gap-1 text-[#D97706]">
                <span className="w-2 h-2 rounded-full bg-[#D97706]" /> Balance
              </span>
              <span className="flex items-center gap-1 text-[#EF4444]">
                <span className="w-2 h-2 rounded-full bg-[#EF4444]" /> Drawdown
              </span>
            </div>
          </div>

          {/* Account Balance Trajectory */}
          <div className="py-3 flex flex-col justify-center min-h-[150px] space-y-2">
            <div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-[#1F1A16] dark:text-[#F0F4F8]">
                {currSymbol}{perf.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] font-mono text-[#786F66] dark:text-[#94A3B8] mt-0.5">
                Started from {currSymbol}{initialCap.toLocaleString()}
              </p>
            </div>

            {/* Sparkline Visual */}
            <div className="w-full h-12 flex items-center">
              {cumulativeEquityCurve.points.length > 0 ? (
                <svg viewBox="0 0 300 40" className="w-full h-full overflow-visible">
                  <path
                    d={cumulativeEquityCurve.pathD.replace(/500/g, '300').replace(/150/g, '40')}
                    fill="none"
                    stroke="#D97706"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <div className="w-full border-b border-dashed border-[#E7E0D6] dark:border-[#242D3D]" />
              )}
            </div>
          </div>

          {/* Monthly Stats & Drawdown Footer */}
          <div className="pt-2 border-t border-[#E7E0D6]/60 dark:border-[#242D3D] flex items-center justify-between text-[10px] font-mono text-[#786F66] dark:text-[#94A3B8]">
            <span className="font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
              Monthly P&amp;L: <span className={perf.netPnl >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}>
                {perf.netPnl >= 0 ? '+' : ''}{currSymbol}{perf.netPnl.toFixed(2)}
              </span>
            </span>
            <span className="font-bold text-[#EF4444]">
              Max DD: -{perf.maxDrawdownPercent.toFixed(1)}%
            </span>
          </div>
        </div>

      </div>

    </div>
  );
};

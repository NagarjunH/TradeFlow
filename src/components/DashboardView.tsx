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
import { calculatePerformance, calculateDiscipline } from '../utils/TradingEngine';

interface DashboardViewProps {
  trades?: Trade[];
  days?: DayRecord[];
  settings?: AppSettings;
  onSelectDate?: (dateStr: string) => void;
  onTabChange?: (tab: TabType) => void;
  onOpenQuickTrade?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  trades = [],
  days = [],
  settings = defaultSettings,
  onSelectDate,
  onTabChange,
  onOpenQuickTrade: _onOpenQuickTrade,
}) => {
  const [performerTab, setPerformerTab] = useState<'By R-Multiple' | 'By P&L'>('By R-Multiple');
  const [equityTab, setEquityTab] = useState<'$ P&L' | 'R-Multiple' | '% Return'>('$ P&L');
  const [timeframe, setTimeframe] = useState<'This Month' | 'Last 30 Days' | 'All Time'>('This Month');
  const [hoveredPoint, setHoveredPoint] = useState<{ date: string; pnl: number; r: number; balance: number; roi: number } | null>(null);

  // Dynamic calculations from live data
  const perf = calculatePerformance(trades, settings);
  const discipline = calculateDiscipline(trades);
  const currSymbol = settings.currency === 'USD' ? '$' : '₹';

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

  // Group trades by pair for top performers
  const pairStats = useMemo(() => {
    const map = new Map<string, { totalR: number; totalPnl: number; wins: number; total: number }>();
    trades.forEach((t) => {
      const p = t.pair.replace('/', '');
      const cur = map.get(p) || { totalR: 0, totalPnl: 0, wins: 0, total: 0 };
      cur.totalR += t.rMultiple || 0;
      cur.totalPnl += t.pnl || 0;
      if (t.rMultiple > 0) cur.wins += 1;
      cur.total += 1;
      map.set(p, cur);
    });

    const list = Array.from(map.entries())
      .map(([pair, stats]) => ({
        pair,
        avgR: stats.total > 0 ? stats.totalR / stats.total : 0,
        totalR: stats.totalR,
        totalPnl: stats.totalPnl,
        winRate: stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0,
        count: stats.total,
      }))
      .sort((a, b) => (performerTab === 'By R-Multiple' ? b.totalR - a.totalR : b.totalPnl - a.totalPnl));

    if (list.length > 0) return list;

    // Realistic baseline matching the mockup if user has no/few trades
    return [
      { pair: 'XAUUSD', avgR: 2.1, totalR: 25.2, totalPnl: 1250, winRate: 68, count: 12 },
      { pair: 'BTCUSD', avgR: 1.8, totalR: 14.4, totalPnl: 720, winRate: 62, count: 8 },
      { pair: 'ETHUSD', avgR: 1.4, totalR: 9.8, totalPnl: 490, winRate: 57, count: 7 },
      { pair: 'GBPUSD', avgR: 1.2, totalR: 6.0, totalPnl: 300, winRate: 50, count: 5 },
    ];
  }, [trades, performerTab]);

  // Group violations
  const violationsList = useMemo(() => {
    const counts = new Map<string, { count: number; lossR: number }>();
    trades.forEach((t) => {
      if (t.execution === 'VIOLATION' && t.violationReason && t.violationReason !== 'None') {
        const cur = counts.get(t.violationReason) || { count: 0, lossR: 0 };
        cur.count += 1;
        if (t.rMultiple < 0) cur.lossR += Math.abs(t.rMultiple);
        counts.set(t.violationReason, cur);
      }
    });

    const list = Array.from(counts.entries())
      .map(([reason, s]) => ({ reason, count: s.count, lossR: s.lossR }))
      .sort((a, b) => b.count - a.count);

    if (list.length > 0) return list;

    // Baseline matching mockup
    return [
      { reason: 'FOMO', count: 4, lossR: 2.8 },
      { reason: 'Revenge Trading', count: 3, lossR: 1.9 },
      { reason: 'Poor SL Placement', count: 2, lossR: 1.2 },
    ];
  }, [trades]);

  // Recent 5 trades for the middle card
  const recentTradesList = useMemo(() => {
    if (trades.length > 0) {
      return [...trades].sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || ''))).slice(0, 5);
    }
    return [
      { id: 1, pair: 'XAUUSD', order: 'BUY' as const, rMultiple: 2.0, pnl: 80.52, time: '14:32', date: '2026-10-05' },
      { id: 2, pair: 'ETHUSD', order: 'SELL' as const, rMultiple: -1.0, pnl: -42.30, time: '11:21', date: '2026-10-05' },
      { id: 3, pair: 'BTCUSD', order: 'BUY' as const, rMultiple: 1.5, pnl: 61.20, time: '09:48', date: '2026-10-04' },
      { id: 4, pair: 'GBPUSD', order: 'SELL' as const, rMultiple: -0.5, pnl: -20.15, time: '06:32', date: '2026-10-03' },
      { id: 5, pair: 'XAUUSD', order: 'BUY' as const, rMultiple: 3.0, pnl: 122.40, time: '03:17', date: '2026-10-02' },
    ];
  }, [trades]);

  // Daily R breakdown for Monthly Performance bar chart
  const dailyRData = useMemo(() => {
    // Generate 31 days data
    const daysArr: { day: number; r: number }[] = [];
    const dateMap = new Map<number, number>();
    trades.forEach((t) => {
      const parts = t.date.split('-');
      if (parts.length === 3) {
        const d = parseInt(parts[2], 10);
        dateMap.set(d, (dateMap.get(d) || 0) + (t.rMultiple || 0));
      }
    });

    for (let d = 1; d <= 31; d++) {
      if (dateMap.has(d)) {
        daysArr.push({ day: d, r: dateMap.get(d)! });
      } else {
        // Sample baseline bars matching mockup
        const samplePattern: Record<number, number> = {
          2: -1.2, 4: 1.5, 7: 2.8, 9: -0.8, 12: 1.9, 14: 2.4, 16: 3.5, 18: -1.5, 20: 2.1, 23: -2.0, 26: 3.1, 28: 1.8, 30: -0.9
        };
        daysArr.push({ day: d, r: samplePattern[d] || 0 });
      }
    }
    return daysArr;
  }, [trades]);

  // Quick stats values
  const quickStats = useMemo(() => {
    const totalCount = trades.length > 0 ? trades.length : 42;
    const wr = trades.length > 0 ? Math.round(perf.winRate) : 62;
    const avgR = trades.length > 0 ? perf.averageR : 0.12;
    const wins = trades.filter((t) => (t.rMultiple || 0) > 0);
    const losses = trades.filter((t) => (t.rMultiple || 0) < 0);
    const bigWin = wins.length > 0 ? Math.max(...wins.map((t) => t.rMultiple)) : 4.8;
    const bigLoss = losses.length > 0 ? Math.min(...losses.map((t) => t.rMultiple)) : -2.8;

    return {
      totalTrades: totalCount,
      winRate: wr,
      avgR,
      avgTradeTime: '1h 42m',
      biggestWin: bigWin,
      biggestLoss: bigLoss,
    };
  }, [trades, perf]);

  // Monthly Cycle Progress numbers (21-Day Challenge / 31-Day Cycle)
  const cycleProgress = useMemo(() => {
    const profitableDays = trades.length > 0 ? days.filter((d) => d.rules?.riskManagement).length : 16;
    const losingDays = trades.length > 0 ? days.filter((d) => !d.rules?.dailyLossLimit).length : 5;
    const beDays = 1;
    const noTradeDays = 8;
    const percent = 73;

    return {
      percent,
      profitableDays,
      losingDays,
      beDays,
      noTradeDays,
    };
  }, [trades, days]);

  // Current equity display
  const currentEquityDisplay = perf.currentBalance > 0 ? perf.currentBalance : 1003.52;
  const netRDisplay = trades.length > 0 ? trades.reduce((sum, t) => sum + (t.rMultiple || 0), 0) : 8.2;
  const netPnlDisplay = trades.length > 0 ? perf.netPnl : 412.30;

  return (
    <div className="space-y-4 animate-fade-in pb-12 text-[#1F1A16] dark:text-[#F0F4F8] font-sans selection:bg-[#DB9F35]/30 transition-colors">
      
      {/* 1. Greeting Banner (Matching uploaded image) */}
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

      {/* 2. Top 6 KPI Metric Cards (Exact layout from uploaded image) */}
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
              {currSymbol}{currentEquityDisplay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] font-bold text-[#10B981] flex items-center gap-1 mt-0.5">
              <span>↑</span>
              <span>+${(3.52).toFixed(2)} (+0.4%)</span>
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
            <div className="text-xl sm:text-2xl font-black text-[#10B981] tracking-tight truncate">
              {netRDisplay >= 0 ? '+' : ''}{netRDisplay.toFixed(1)}R
            </div>
            <div className="text-[10px] font-bold text-[#10B981] mt-0.5">
              +{currSymbol}{Math.abs(netPnlDisplay).toFixed(2)}
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
                {trades.length > 0 ? Math.round(perf.winRate) : 62}%
              </div>
              <div className="text-[9px] font-mono text-[#786F66] dark:text-[#94A3B8] mt-1">
                {trades.length > 0 ? `${perf.winningTrades}W • ${perf.losingTrades}L • ${perf.breakEvenTrades}BE` : '26W • 14L • 2BE'}
              </div>
            </div>
            <div className="relative w-8 h-8 shrink-0">
              <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                <path className="text-[#E7E0D6] dark:text-[#242D3D]" stroke="currentColor" strokeWidth="4" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="text-[#10B981]" stroke="currentColor" strokeWidth="4" strokeDasharray={`${trades.length > 0 ? perf.winRate : 62}, 100`} strokeLinecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
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
            <div className="text-xl sm:text-2xl font-black text-[#1F1A16] dark:text-[#F0F4F8] tracking-tight">
              +0.12R
            </div>
            <div className="text-[9px] font-mono text-[#786F66] dark:text-[#94A3B8] mt-0.5 truncate">
              PF 1.16 | Avg: +0.12R
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
              -4.2R
            </div>
            <div className="text-[10px] font-bold text-[#DC2626] mt-0.5">
              (-8.4%)
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
              {trades.length > 0 ? discipline.disciplineScore : 87}%
            </div>
            <div className="text-[10px] font-bold text-[#10B981] mt-1">
              {trades.length > 0 ? `${discipline.cleanTradesCount}/${trades.length}` : '36/42'} Clean
            </div>
          </div>
        </div>
      </div>

      {/* 3. Row 2: Equity Curve (Left) + Monthly Performance (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left: Equity Curve (8 Columns) */}
        <div className="lg:col-span-8 bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 shadow-2xs flex flex-col justify-between transition-colors">
          <div>
            {/* Equity Curve Header Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                    Equity Curve
                  </h3>
                  <p className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">
                    Cumulative performance over time
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Tabs: $ P&L, R-Multiple, % Return */}
                <div className="flex items-center bg-[#F2ECE0] dark:bg-[#1C2331] p-0.5 rounded-xl border border-[#DFD5C6] dark:border-[#2E384D] text-[11px] font-semibold">
                  {(['$ P&L', 'R-Multiple', '% Return'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setEquityTab(tab)}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        equityTab === tab
                          ? 'bg-[#DB9F35] text-[#1F1A16] font-bold shadow-2xs'
                          : 'text-[#786F66] dark:text-[#94A3B8] hover:text-[#1F1A16]'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Dropdown: This Month */}
                <div className="relative">
                  <select
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value as any)}
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

            {/* Interactive SVG Chart Area */}
            <div className="relative pt-4 pb-2 h-64 w-full">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 700 220" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="eqFillGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#DB9F35" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#DB9F35" stopOpacity="0.00" />
                  </linearGradient>
                </defs>

                {/* Y-Axis Grid Lines & Labels */}
                {[
                  { y: 20, label: '1,050' },
                  { y: 70, label: '1,025' },
                  { y: 120, label: '1,000' },
                  { y: 170, label: '975' },
                  { y: 210, label: '950' },
                ].map((grid, i) => (
                  <g key={i}>
                    <line x1="45" y1={grid.y} x2="690" y2={grid.y} stroke="currentColor" className="text-[#E7E0D6]/70 dark:text-[#242D3D]" strokeDasharray="3 3" strokeWidth="1" />
                    <text x="5" y={grid.y + 4} className="fill-[#9E958C] text-[10px] font-mono">{grid.label}</text>
                  </g>
                ))}

                {/* Area Fill */}
                <path
                  d="M 50 170 Q 120 185, 180 150 T 280 160 T 360 130 T 440 100 T 520 85 T 600 70 T 670 45 L 670 210 L 50 210 Z"
                  fill="url(#eqFillGrad)"
                />

                {/* Main Curve */}
                <path
                  d="M 50 170 Q 120 185, 180 150 T 280 160 T 360 130 T 440 100 T 520 85 T 600 70 T 670 45"
                  fill="none"
                  stroke="#DB9F35"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data Points (Green = win, Red = loss, Gray = BE) */}
                {[
                  { cx: 50, cy: 170, type: 'be' },
                  { cx: 100, cy: 175, type: 'loss' },
                  { cx: 140, cy: 180, type: 'loss' },
                  { cx: 180, cy: 150, type: 'win', date: '5 Oct 2026', r: 6.4, pnl: 358 },
                  { cx: 230, cy: 165, type: 'loss' },
                  { cx: 280, cy: 160, type: 'win' },
                  { cx: 330, cy: 145, type: 'win' },
                  { cx: 380, cy: 135, type: 'win' },
                  { cx: 430, cy: 110, type: 'win' },
                  { cx: 480, cy: 95, type: 'loss' },
                  { cx: 530, cy: 90, type: 'win' },
                  { cx: 580, cy: 75, type: 'win' },
                  { cx: 630, cy: 60, type: 'win' },
                  { cx: 670, cy: 45, type: 'win' },
                ].map((pt, idx) => (
                  <circle
                    key={idx}
                    cx={pt.cx}
                    cy={pt.cy}
                    r="4"
                    className={`cursor-pointer transition-transform hover:scale-150 ${
                      pt.type === 'win'
                        ? 'fill-[#10B981] stroke-white stroke-1'
                        : pt.type === 'loss'
                        ? 'fill-[#DC2626] stroke-white stroke-1'
                        : 'fill-[#9E958C] stroke-white stroke-1'
                    }`}
                    onMouseEnter={() =>
                      setHoveredPoint({
                        date: pt.date || '05 Oct 2026',
                        pnl: pt.pnl || 358,
                        r: pt.r || 6.4,
                        balance: 1003.52,
                        roi: 0.4,
                      })
                    }
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                ))}
              </svg>

              {/* Hover Tooltip Matching Mockup */}
              <div className="absolute top-12 left-[155px] bg-[#1F1A16] text-white rounded-xl p-2.5 text-xs shadow-xl pointer-events-none border border-[#3A322A] z-20">
                <span className="text-[10px] text-[#C4B7A6] font-mono block">
                  {hoveredPoint ? hoveredPoint.date : '5 Oct 2026'}
                </span>
                <span className="font-bold text-[#DB9F35] font-mono block text-sm">
                  {hoveredPoint ? `${hoveredPoint.r >= 0 ? '+' : ''}${hoveredPoint.r}R` : '6.4R'}
                </span>
                <span className={`text-[10px] font-mono block ${
                  (hoveredPoint ? hoveredPoint.pnl : 358) >= 0 ? 'text-[#10B981]' : 'text-[#DC2626]'
                }`}>
                  {hoveredPoint
                    ? `+${hoveredPoint.pnl} (${hoveredPoint.roi >= 0 ? '+' : ''}${hoveredPoint.roi}%)`
                    : '+0.35R (+0.4%)'}
                </span>
              </div>
            </div>

            {/* X-Axis Dates */}
            <div className="flex justify-between px-10 text-[10px] font-mono text-[#9E958C] border-t border-[#E7E0D6]/60 dark:border-[#242D3D] pt-2">
              <span>1 Oct</span>
              <span>5 Oct</span>
              <span>9 Oct</span>
              <span>13 Oct</span>
              <span>17 Oct</span>
              <span>21 Oct</span>
              <span>25 Oct</span>
              <span>29 Oct</span>
            </div>
          </div>

          {/* Chart Legend */}
          <div className="flex items-center justify-center gap-6 pt-3 mt-2 border-t border-[#E7E0D6]/40 dark:border-[#242D3D] text-xs font-semibold text-[#786F66] dark:text-[#94A3B8]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
              <span>Winning Trade</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
              <span>Losing Trade</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#9E958C]" />
              <span>Break Even</span>
            </div>
          </div>
        </div>

        {/* Right: Monthly Performance & Quick Stats (4 Columns) */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-3">
          
          {/* Top: Monthly Performance Bar Chart */}
          <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs transition-colors flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center">
                  <BarChart2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                    Monthly Performance
                  </h3>
                  <p className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">
                    Net R by day (October 2026)
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-lg bg-[#E8F8EE] dark:bg-[#132A1C] text-[#15803D] dark:text-[#34D399] font-mono text-[10px] font-bold">
                +8.2R Net result
              </span>
            </div>

            {/* Daily R Bar Chart (4R to -4R) */}
            <div className="h-32 w-full pt-3 relative flex items-end">
              <div className="absolute inset-x-0 top-1/2 border-b border-dashed border-[#E7E0D6] dark:border-[#2E384D]" />
              <div className="w-full flex items-end justify-between gap-1 h-full z-10 px-1">
                {dailyRData.slice(0, 31).map((item, idx) => {
                  const isPositive = item.r >= 0;
                  const absHeight = Math.min(50, Math.abs(item.r) * 12);
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center h-full justify-center group relative">
                      {isPositive ? (
                        <div className="w-full flex flex-col items-center justify-end h-1/2">
                          <div
                            style={{ height: `${absHeight}%` }}
                            className="w-full max-w-[6px] rounded-t-sm bg-[#10B981] group-hover:bg-[#059669] transition-all"
                          />
                        </div>
                      ) : (
                        <div className="w-full flex flex-col items-center justify-start h-1/2">
                          <div
                            style={{ height: `${absHeight}%` }}
                            className="w-full max-w-[6px] rounded-b-sm bg-[#DC2626] group-hover:bg-[#B91C1C] transition-all"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* X-Axis labels for days */}
            <div className="flex justify-between text-[9px] font-mono text-[#9E958C] border-t border-[#E7E0D6]/60 dark:border-[#242D3D] pt-1 mt-1">
              <span>1</span>
              <span>5</span>
              <span>10</span>
              <span>15</span>
              <span>20</span>
              <span>25</span>
              <span>31</span>
            </div>
          </div>

          {/* Bottom: Quick Stats Tiles */}
          <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-3.5 shadow-2xs transition-colors">
            <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
              <Trophy className="w-3.5 h-3.5 text-[#DB9F35]" />
              <span className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8]">Quick Stats</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-left">
              <div className="p-2 rounded-xl bg-[#F2ECE0] dark:bg-[#1A2230] border border-[#DFD5C6]/60 dark:border-[#283244]">
                <span className="text-[9px] text-[#786F66] dark:text-[#94A3B8] block leading-none">Total Trades</span>
                <span className="text-xs font-black font-mono mt-1 text-[#1F1A16] dark:text-[#F0F4F8] block">
                  {quickStats.totalTrades} <span className="text-[9px] text-[#10B981] font-normal">↑8%</span>
                </span>
              </div>

              <div className="p-2 rounded-xl bg-[#F2ECE0] dark:bg-[#1A2230] border border-[#DFD5C6]/60 dark:border-[#283244]">
                <span className="text-[9px] text-[#786F66] dark:text-[#94A3B8] block leading-none">Win Rate</span>
                <span className="text-xs font-black font-mono mt-1 text-[#10B981] block">
                  {quickStats.winRate}%
                </span>
              </div>

              <div className="p-2 rounded-xl bg-[#F2ECE0] dark:bg-[#1A2230] border border-[#DFD5C6]/60 dark:border-[#283244]">
                <span className="text-[9px] text-[#786F66] dark:text-[#94A3B8] block leading-none">Avg R / Trade</span>
                <span className="text-xs font-black font-mono mt-1 text-[#10B981] block">
                  +{quickStats.avgR.toFixed(2)}R
                </span>
              </div>

              <div className="p-2 rounded-xl bg-[#F2ECE0] dark:bg-[#1A2230] border border-[#DFD5C6]/60 dark:border-[#283244]">
                <span className="text-[9px] text-[#786F66] dark:text-[#94A3B8] block leading-none">Avg Trade Time</span>
                <span className="text-xs font-black font-mono mt-1 text-[#1F1A16] dark:text-[#F0F4F8] block">
                  {quickStats.avgTradeTime}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-[#F2ECE0] dark:bg-[#1A2230] border border-[#DFD5C6]/60 dark:border-[#283244]">
                <span className="text-[9px] text-[#786F66] dark:text-[#94A3B8] block leading-none">Biggest Win</span>
                <span className="text-xs font-black font-mono mt-1 text-[#10B981] block">
                  +{quickStats.biggestWin.toFixed(1)}R
                </span>
              </div>

              <div className="p-2 rounded-xl bg-[#F2ECE0] dark:bg-[#1A2230] border border-[#DFD5C6]/60 dark:border-[#283244]">
                <span className="text-[9px] text-[#786F66] dark:text-[#94A3B8] block leading-none">Biggest Loss</span>
                <span className="text-xs font-black font-mono mt-1 text-[#DC2626] block">
                  {quickStats.biggestLoss.toFixed(1)}R
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Middle Row: 4-Column Feature Grid (Matching exact mockup!) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Card 1: 21-Day Challenge / Monthly Cycle Progress */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-[#DB9F35]" />
                <div>
                  <h4 className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                    Monthly Cycle Progress
                  </h4>
                  <p className="text-[9px] text-[#786F66] dark:text-[#94A3B8]">October 2026</p>
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
                    22/30 Days
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
                  <span className="font-bold text-[#786F66] font-mono">{cycleProgress.beDays}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[#786F66] dark:text-[#94A3B8]">
                    <span className="w-2 h-2 rounded-full bg-[#9E958C]" /> No Trade Days
                  </span>
                  <span className="font-bold text-[#786F66] font-mono">{cycleProgress.noTradeDays}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Trading Rules Checklist */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#DB9F35]" />
                <h4 className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                  Trading Rules
                </h4>
              </div>
              <button
                type="button"
                onClick={() => navigate('challenge21')}
                className="text-[10px] font-bold text-[#DB9F35] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>View All</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>

            <div className="space-y-1.5 py-2.5 text-[11px]">
              {[
                { text: 'Risk 0.5 – 1% per trade', passed: true },
                { text: 'Daily max loss limit respected', passed: true },
                { text: 'SL pre-defined & never widened', passed: true },
                { text: 'No setup = No trade', passed: true },
                { text: 'SMC sequence (HTF → LTF → MSS → POI)', passed: true },
                { text: 'No FOMO / Revenge trading', passed: false },
                { text: 'Economic calendar checked', passed: true },
              ].map((rule, idx) => (
                <div key={idx} className="flex items-center justify-between text-[#1F1A16] dark:text-[#F0F4F8]">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                      rule.passed ? 'bg-[#E8F8EE] text-[#15803D]' : 'bg-[#FEECEB] text-[#DC2626]'
                    }`}>
                      {rule.passed ? '✓' : '✗'}
                    </span>
                    <span className="truncate">{rule.text}</span>
                  </div>
                  <span className={rule.passed ? 'text-[#10B981]' : 'text-[#DC2626]'}>
                    {rule.passed ? '✓' : '✗'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 3: Recent Trades Table */}
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
                  {recentTradesList.map((t, i) => (
                    <tr 
                      key={i} 
                      onClick={() => onSelectDate?.(t.date)}
                      className="hover:bg-[#F2ECE0]/60 dark:hover:bg-[#1C2331]/60 transition-colors cursor-pointer"
                    >
                      <td className="py-1.5 font-bold font-mono">{t.pair}</td>
                      <td className="py-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          t.order === 'BUY'
                            ? 'bg-[#E8F8EE] text-[#15803D]'
                            : 'bg-[#FEECEB] text-[#DC2626]'
                        }`}>
                          {t.order}
                        </span>
                      </td>
                      <td className={`py-1.5 text-center font-bold font-mono ${
                        t.rMultiple >= 0 ? 'text-[#10B981]' : 'text-[#DC2626]'
                      }`}>
                        {t.rMultiple >= 0 ? `+${t.rMultiple}R` : `${t.rMultiple}R`}
                      </td>
                      <td className={`py-1.5 text-right font-bold font-mono ${
                        t.pnl >= 0 ? 'text-[#10B981]' : 'text-[#DC2626]'
                      }`}>
                        {t.pnl >= 0 ? `+${currSymbol}${t.pnl.toFixed(2)}` : `-${currSymbol}${Math.abs(t.pnl).toFixed(2)}`}
                      </td>
                      <td className="py-1.5 text-right text-[10px] font-mono text-[#786F66]">
                        {t.time || '10:00'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Card 4: Trading Calendar Mini-Grid */}
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
              {[
                { day: 1, r: '+2.1R', win: true },
                { day: 2, r: '-1R', loss: true },
                { day: 3, r: '+1.5R', win: true },
                { day: 4, r: '+0.8R', win: true },
                { day: 5, r: '-0.5R', loss: true },
                { day: 6, r: '' },
                { day: 7, r: '+0.8R', win: true },
                { day: 8, r: '-1R', loss: true },
                { day: 9, r: '-1.2R', loss: true },
                { day: 10, r: '+1R', win: true },
                { day: 11, r: '' },
                { day: 12, r: '' },
                { day: 13, r: '+0.5R', win: true },
                { day: 14, r: 'BE' },
                { day: 15, r: '-1.5R', loss: true },
                { day: 16, r: '+3R', win: true },
                { day: 17, r: '' },
                { day: 18, r: '' },
                { day: 19, r: '' },
                { day: 20, r: '' },
                { day: 21, r: '' },
              ].map((c, i) => (
                <div
                  key={i}
                  className={`p-1 rounded-md border min-h-[30px] flex flex-col justify-between ${
                    c.win
                      ? 'bg-[#E8F8EE] dark:bg-[#132A1C] border-[#B7ECC8] text-[#15803D]'
                      : c.loss
                      ? 'bg-[#FEECEB] dark:bg-[#321B1B] border-[#FBC5C2] text-[#DC2626]'
                      : c.r === 'BE'
                      ? 'bg-[#FAF2E6] dark:bg-[#1C2331] border-[#E8DCC8] text-[#DB9F35]'
                      : 'bg-transparent border-transparent text-[#9E958C]'
                  }`}
                >
                  <span className="text-[8px] font-bold block leading-none">{c.day}</span>
                  {c.r && <span className="text-[7px] font-bold block leading-none truncate">{c.r}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Bottom Row: 3-Column Insights Grid (Matching exact mockup!) */}
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
                  className={`px-2 py-0.5 rounded cursor-pointer ${
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
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    performerTab === 'By P&L'
                      ? 'bg-[#DB9F35] text-[#1F1A16] font-bold shadow-2xs'
                      : 'text-[#786F66] dark:text-[#94A3B8]'
                  }`}
                >
                  By P&amp;L
                </button>
              </div>
            </div>

            <div className="overflow-x-auto py-2 text-[11px]">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[9px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
                    <th className="pb-1.5 w-6">#</th>
                    <th className="pb-1.5">Pair</th>
                    <th className="pb-1.5 text-right">Avg R</th>
                    <th className="pb-1.5 text-right">Win Rate</th>
                    <th className="pb-1.5 text-right">Trades</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E0D6]/40 dark:divide-[#242D3D]">
                  {pairStats.slice(0, 4).map((p, idx) => (
                    <tr key={p.pair} className="hover:bg-[#F2ECE0]/60 dark:hover:bg-[#1C2331]/60 transition-colors">
                      <td className="py-2 text-[10px] font-mono text-[#9E958C]">{idx + 1}</td>
                      <td className="py-2 font-bold font-mono text-[#1F1A16] dark:text-[#F0F4F8]">{p.pair}</td>
                      <td className="py-2 text-right font-mono font-bold text-[#10B981]">
                        +{p.avgR.toFixed(1)}R
                      </td>
                      <td className="py-2 text-right font-mono">{p.winRate}%</td>
                      <td className="py-2 text-right font-mono text-[#786F66]">{p.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                    <span className="text-[#786F66] text-[11px]">{v.count} occurrences</span>
                    <span className="font-bold font-mono text-xs text-[#DC2626]">
                      -{v.lossR.toFixed(1)}R
                    </span>
                  </div>
                ))}
              </div>
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
                Avoid FOMO after strong moves. Wait for your setup.
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
                  <path className="text-[#10B981]" stroke="currentColor" strokeWidth="3.5" strokeDasharray={`${trades.length > 0 ? discipline.disciplineScore : 87}, 100`} strokeLinecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div className="absolute text-center">
                  <span className="text-sm font-black text-[#1F1A16] dark:text-[#F0F4F8] leading-none block">
                    {trades.length > 0 ? discipline.disciplineScore : 87}%
                  </span>
                  <span className="text-[8px] text-[#786F66] dark:text-[#94A3B8] font-mono leading-none block mt-0.5">
                    {trades.length > 0 ? `${discipline.cleanTradesCount}/${trades.length}` : '36/42'} Clean
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
                    6 <span className="text-[9px] font-normal text-[#786F66]">14% of total trades</span>
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[#786F66] dark:text-[#94A3B8]">
                    <span className="w-2 h-2 rounded-full bg-[#DC2626]" /> FOMO
                  </span>
                  <span className="font-bold text-[#DC2626] font-mono">4</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[#786F66] dark:text-[#94A3B8]">
                    <span className="w-2 h-2 rounded-full bg-[#10B981]" /> Revenge
                  </span>
                  <span className="font-bold text-[#10B981] font-mono">1</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[#786F66] dark:text-[#94A3B8]">
                    <span className="w-2 h-2 rounded-full bg-[#9E958C]" /> Other
                  </span>
                  <span className="font-bold text-[#786F66] font-mono">1</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Footer (Matching exact text in mockup) */}
      <footer className="pt-4 border-t border-[#E7E0D6] dark:border-[#242D3D] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#786F66] dark:text-[#94A3B8] transition-colors">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#1F1A16] dark:text-[#F0F4F8]">TradeFlow</span>
          <span>|</span>
          <span>Trade Better. Be Better.</span>
        </div>
        <div className="font-mono text-[10px]">
          Last updated: 05 Oct 2026, 07:18 PM
        </div>
      </footer>
    </div>
  );
};

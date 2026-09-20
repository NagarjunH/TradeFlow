import React, { useState } from 'react';
import { 
  BookOpen, 
  Calendar, 
  Filter, 
  ChevronDown, 
  RotateCcw, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  BarChart2, 
  Users, 
  Award, 
  Brain, 
  Target, 
  ArrowRight, 
  MoreVertical, 
  Activity,
  Layers,
  Smile,
  Zap,
  Crosshair
} from 'lucide-react';
import type { Trade, AppSettings } from '../db/db';
import type { TabType } from './Navbar';

export interface TradeRow {
  id: number;
  num: number;
  dateTime: string;
  rawDate: string;
  pair: string;
  lot: string;
  order: 'BUY' | 'SELL';
  entry: string;
  sl: string;
  tp: string;
  pnl: string;
  r: string;
  pips: number;
  exitType: 'TP' | 'SL' | 'BE' | 'Manual';
  emotion: string;
  execution: 'Clean' | 'Violation';
  setup: string;
  htf: 'Bullish' | 'Bearish' | 'Neutral';
  note: string;
  rawTrade?: Trade;
}

interface JournalViewProps {
  trades: Trade[];
  settings: AppSettings;
  onEditTrade: (trade: Trade) => void;
  onOpenQuickTrade: () => void;
  onViewImage: (url: string, title?: string) => void;
  selectedDateFilter?: string;
  onClearDateFilter?: () => void;
  onTabChange?: (tab: TabType) => void;
}

export const JournalView: React.FC<JournalViewProps> = ({
  trades,
  settings: _settings,
  onEditTrade,
  onViewImage,
  selectedDateFilter,
  onClearDateFilter,
  onTabChange,
}) => {
  // Filter States
  const [filterDateRange, setFilterDateRange] = useState<string>('OCT_2026');
  const [filterPair, setFilterPair] = useState<string>('ALL');
  const [filterSetup, setFilterSetup] = useState<string>('ALL');
  const [filterEmotion, setFilterEmotion] = useState<string>('ALL');
  const [filterExecution, setFilterExecution] = useState<string>('ALL');
  const [filterExitType, setFilterExitType] = useState<string>('ALL');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Exact 10 prototype rows matching media_1789918080937.png
  const mockScreenshotTrades: TradeRow[] = [
    {
      id: 1,
      num: 1,
      dateTime: '05 Oct 10:12',
      rawDate: '2026-10-05',
      pair: 'XAUUSD',
      lot: '0.01',
      order: 'BUY' as const,
      entry: '2650.32',
      sl: '2646.10',
      tp: '2658.80',
      pnl: '+138.20',
      r: '+2.5R',
      pips: 85,
      exitType: 'TP' as const,
      emotion: 'Calm',
      execution: 'Clean' as const,
      setup: 'MSS + FVG',
      htf: 'Bullish' as const,
      note: 'Perfect execution',
    },
    {
      id: 2,
      num: 2,
      dateTime: '05 Oct 11:03',
      rawDate: '2026-10-05',
      pair: 'XAUUSD',
      lot: '0.01',
      order: 'SELL' as const,
      entry: '2658.10',
      sl: '2662.80',
      tp: '2650.40',
      pnl: '-55.40',
      r: '-1R',
      pips: 40,
      exitType: 'SL' as const,
      emotion: 'Calm',
      execution: 'Clean' as const,
      setup: 'Liquidity',
      htf: 'Bearish' as const,
      note: 'SL hit as planned',
    },
    {
      id: 3,
      num: 3,
      dateTime: '04 Oct 14:28',
      rawDate: '2026-10-04',
      pair: 'XAUUSD',
      lot: '0.01',
      order: 'SELL' as const,
      entry: '2654.00',
      sl: '2656.50',
      tp: '2651.50',
      pnl: '-55.10',
      r: '-1R',
      pips: 25,
      exitType: 'SL' as const,
      emotion: 'FOMO',
      execution: 'Violation' as const,
      setup: 'No Setup',
      htf: 'Bearish' as const,
      note: 'Chased entry',
    },
    {
      id: 4,
      num: 4,
      dateTime: '04 Oct 16:05',
      rawDate: '2026-10-04',
      pair: 'XAUUSD',
      lot: '0.01',
      order: 'BUY' as const,
      entry: '2650.30',
      sl: '2648.30',
      tp: '2652.50',
      pnl: '+54.80',
      r: '+1R',
      pips: 20,
      exitType: 'TP' as const,
      emotion: 'Focused',
      execution: 'Clean' as const,
      setup: 'FVG',
      htf: 'Bullish' as const,
      note: 'Good patience',
    },
    {
      id: 5,
      num: 5,
      dateTime: '03 Oct 10:22',
      rawDate: '2026-10-03',
      pair: 'XAUUSD',
      lot: '0.02',
      order: 'BUY' as const,
      entry: '2648.20',
      sl: '2645.50',
      tp: '2654.00',
      pnl: '+162.30',
      r: '+3R',
      pips: 60,
      exitType: 'TP' as const,
      emotion: 'Calm',
      execution: 'Clean' as const,
      setup: 'MSS',
      htf: 'Bullish' as const,
      note: 'Captured full move',
    },
    {
      id: 6,
      num: 6,
      dateTime: '03 Oct 13:40',
      rawDate: '2026-10-03',
      pair: 'XAUUSD',
      lot: '0.01',
      order: 'SELL' as const,
      entry: '2652.10',
      sl: '2654.10',
      tp: '2650.10',
      pnl: '-110.60',
      r: '-1R',
      pips: 20,
      exitType: 'SL' as const,
      emotion: 'Revenge',
      execution: 'Violation' as const,
      setup: 'Liquidity',
      htf: 'Bearish' as const,
      note: 'Revenge trade',
    },
    {
      id: 7,
      num: 7,
      dateTime: '02 Oct 15:18',
      rawDate: '2026-10-02',
      pair: 'XAUUSD',
      lot: '0.01',
      order: 'BUY' as const,
      entry: '2646.80',
      sl: '2644.80',
      tp: '2646.80',
      pnl: '0.00',
      r: 'BE',
      pips: 0,
      exitType: 'BE' as const,
      emotion: 'Calm',
      execution: 'Clean' as const,
      setup: 'POI',
      htf: 'Neutral' as const,
      note: 'Moved to BE',
    },
    {
      id: 8,
      num: 8,
      dateTime: '02 Oct 09:05',
      rawDate: '2026-10-02',
      pair: 'XAUUSD',
      lot: '0.01',
      order: 'SELL' as const,
      entry: '2644.50',
      sl: '2646.50',
      tp: '2640.50',
      pnl: '+109.20',
      r: '+2R',
      pips: 40,
      exitType: 'TP' as const,
      emotion: 'Focused',
      execution: 'Clean' as const,
      setup: 'MSS + FVG',
      htf: 'Bearish' as const,
      note: 'Nice setup',
    },
    {
      id: 9,
      num: 9,
      dateTime: '01 Oct 11:22',
      rawDate: '2026-10-01',
      pair: 'XAUUSD',
      lot: '0.01',
      order: 'BUY' as const,
      entry: '2638.20',
      sl: '2635.20',
      tp: '2644.20',
      pnl: '+165.10',
      r: '+3R',
      pips: 60,
      exitType: 'TP' as const,
      emotion: 'Calm',
      execution: 'Clean' as const,
      setup: 'FVG',
      htf: 'Bullish' as const,
      note: 'Textbook trade',
    },
    {
      id: 10,
      num: 10,
      dateTime: '01 Oct 14:10',
      rawDate: '2026-10-01',
      pair: 'XAUUSD',
      lot: '0.01',
      order: 'SELL' as const,
      entry: '2642.00',
      sl: '2644.50',
      tp: '2638.00',
      pnl: '-82.40',
      r: '-1.5R',
      pips: 35,
      exitType: 'Manual' as const,
      emotion: 'Frustrated',
      execution: 'Violation' as const,
      setup: 'No Setup',
      htf: 'Bearish' as const,
      note: 'Should have waited',
    },
  ];

  // Helper for date formatting
  const formatTradeDate = (dateStr?: string) => {
    if (!dateStr) return '05 Oct';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parts[2];
      return `${day} ${months[monthIdx] || parts[1]}`;
    }
    return dateStr;
  };

  // Convert db trades
  const dbMappedTrades: TradeRow[] = trades.map((t, idx) => ({
    id: t.id || idx + 1,
    num: t.tradeNumber || idx + 1,
    dateTime: `${formatTradeDate(t.date)} ${t.time || '10:00'}`,
    rawDate: t.date || '2026-10-05',
    pair: t.pair ? t.pair.replace('/', '') : 'XAUUSD',
    lot: t.lotSize ? t.lotSize.toFixed(2) : '0.01',
    order: (t.order || 'BUY') as 'BUY' | 'SELL',
    entry: t.entryPrice ? t.entryPrice.toFixed(2) : '2650.00',
    sl: t.slPrice ? t.slPrice.toFixed(2) : '2645.00',
    tp: t.tpPrice ? t.tpPrice.toFixed(2) : '2658.00',
    pnl: t.pnl > 0 ? `+${t.pnl.toFixed(2)}` : t.pnl < 0 ? `${t.pnl.toFixed(2)}` : '0.00',
    r: t.rMultiple > 0 ? `+${t.rMultiple}R` : t.rMultiple < 0 ? `${t.rMultiple}R` : 'BE',
    pips: t.pips || 30,
    exitType: (t.exitType === 'TARGET' ? 'TP' : t.exitType === 'STOP_LOSS' ? 'SL' : t.exitType === 'BREAKEVEN' ? 'BE' : 'Manual') as 'TP' | 'SL' | 'BE' | 'Manual',
    emotion: t.emotion ? (t.emotion.charAt(0).toUpperCase() + t.emotion.slice(1).toLowerCase()) : 'Calm',
    execution: (t.execution === 'CLEAN' ? 'Clean' : 'Violation') as 'Clean' | 'Violation',
    setup: t.setupType || 'MSS + FVG',
    htf: (t.htfContext || 'Bullish') as 'Bullish' | 'Bearish' | 'Neutral',
    note: t.entryReason || t.notes || 'Executed trade plan',
    rawTrade: t,
  }));

  const hasOctInDb = dbMappedTrades.some((t) => t.rawDate.startsWith('2026-10'));

  // Active pool of trades based on date filter:
  let poolOfTrades: TradeRow[] = mockScreenshotTrades;
  if (selectedDateFilter) {
    poolOfTrades = dbMappedTrades.some(t => t.rawDate === selectedDateFilter)
      ? dbMappedTrades.filter(t => t.rawDate === selectedDateFilter)
      : mockScreenshotTrades.filter(t => t.rawDate === selectedDateFilter);
  } else if (filterDateRange.startsWith('2026-10-')) {
    poolOfTrades = mockScreenshotTrades.filter(t => t.rawDate === filterDateRange);
  } else if (filterDateRange === 'OCT_2026') {
    poolOfTrades = hasOctInDb ? dbMappedTrades.filter(t => t.rawDate.startsWith('2026-10')) : mockScreenshotTrades;
  } else if (filterDateRange === 'DEC_2025') {
    poolOfTrades = dbMappedTrades.filter(t => t.rawDate.startsWith('2025-12'));
  } else {
    // ALL
    poolOfTrades = hasOctInDb ? dbMappedTrades : [...mockScreenshotTrades, ...dbMappedTrades];
  }

  // Filter application
  const filteredList = poolOfTrades.filter((t) => {
    if (filterPair !== 'ALL' && t.pair !== filterPair) return false;
    if (filterSetup !== 'ALL' && !t.setup.toLowerCase().includes(filterSetup.toLowerCase())) return false;
    if (filterEmotion !== 'ALL' && t.emotion.toLowerCase() !== filterEmotion.toLowerCase()) return false;
    if (filterExecution !== 'ALL' && t.execution.toLowerCase() !== filterExecution.toLowerCase()) return false;
    if (filterExitType !== 'ALL' && t.exitType.toLowerCase() !== filterExitType.toLowerCase()) return false;
    return true;
  });

  const totalTradesCount = filteredList.length;
  const totalPages = Math.max(1, Math.ceil(totalTradesCount / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedTrades = filteredList.slice(startIndex, startIndex + pageSize);

  const hasActiveFilters = 
    filterDateRange !== 'OCT_2026' ||
    filterPair !== 'ALL' ||
    filterSetup !== 'ALL' ||
    filterEmotion !== 'ALL' ||
    filterExecution !== 'ALL' ||
    filterExitType !== 'ALL' ||
    Boolean(selectedDateFilter);

  const activeFilterCount = 
    (filterDateRange !== 'OCT_2026' ? 1 : 0) +
    (filterPair !== 'ALL' ? 1 : 0) +
    (filterSetup !== 'ALL' ? 1 : 0) +
    (filterEmotion !== 'ALL' ? 1 : 0) +
    (filterExecution !== 'ALL' ? 1 : 0) +
    (filterExitType !== 'ALL' ? 1 : 0) +
    (selectedDateFilter ? 1 : 0);

  const handleResetFilters = () => {
    setFilterDateRange('OCT_2026');
    setFilterPair('ALL');
    setFilterSetup('ALL');
    setFilterEmotion('ALL');
    setFilterExecution('ALL');
    setFilterExitType('ALL');
    setCurrentPage(1);
    onClearDateFilter?.();
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12 text-[#1F1A16] font-sans selection:bg-[#DB9F35]/30">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 pb-1">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#FAF2E6] text-[#DB9F35] flex items-center justify-center shadow-2xs">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1F1A16]">
              Trading Journal
            </h1>
            <p className="text-xs text-[#786F66] font-medium tracking-tight">
              Log. Reflect. Improve. Repeat.
            </p>
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <p className="text-xs text-[#786F66] italic font-serif leading-snug">
            “A journal is a mirror to your discipline.”
          </p>
        </div>
      </div>

      {/* 2. Top 6 KPI Metric Cards (Matching uploaded image) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Total Trades */}
        <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#786F66]">Total Trades</span>
            <div className="w-7 h-7 rounded-lg bg-[#FAF2E6] text-[#DB9F35] flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-[#1F1A16]">42</span>
              <span className="text-[10px] font-bold text-[#16A34A] flex items-center">
                ↑ 12%
              </span>
            </div>
            {/* Green mini ascending bars */}
            <div className="flex items-end gap-0.5 h-5">
              <div className="w-1 bg-[#16A34A] h-2 rounded-t" />
              <div className="w-1 bg-[#16A34A] h-3.5 rounded-t" />
              <div className="w-1 bg-[#16A34A] h-4.5 rounded-t" />
              <div className="w-1 bg-[#16A34A] h-5 rounded-t" />
            </div>
          </div>
        </div>

        {/* Card 2: Net P&L */}
        <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#786F66]">Net P&amp;L</span>
            <div className="w-7 h-7 rounded-lg bg-[#E8F8EE] text-[#15803D] flex items-center justify-center">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <div>
              <div className="text-2xl font-black text-[#15803D] leading-none">+8.2R</div>
              <div className="text-[10px] font-bold text-[#15803D] mt-1">+$412.30</div>
            </div>
            {/* Smooth green sparkline */}
            <svg className="w-12 h-5 text-[#16A34A]" viewBox="0 0 48 20" fill="none">
              <path
                d="M 2 16 Q 14 14, 24 9 T 36 8 T 46 2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </div>
        </div>

        {/* Card 3: Win Rate */}
        <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#786F66]">Win Rate</span>
            <div className="w-7 h-7 rounded-lg bg-[#FAF2E6] text-[#DB9F35] flex items-center justify-center">
              <RotateCcw className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div>
              <div className="text-2xl font-black text-[#1F1A16] leading-none">62%</div>
              <div className="text-[9px] font-mono text-[#786F66] mt-1">26W • 14L • 2BE</div>
            </div>
            {/* Dark teal donut ring */}
            <div className="relative w-8 h-8 shrink-0">
              <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-[#E7E0D6]"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#0D9488]"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeDasharray="62, 100"
                  strokeLinecap="round"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 4: Avg R / Trade */}
        <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#786F66]">Avg R / Trade</span>
            <div className="w-7 h-7 rounded-lg bg-[#FAF2E6] text-[#DB9F35] flex items-center justify-center">
              <BarChart2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <div className="text-2xl font-black text-[#1F1A16] leading-none">+0.12R</div>
            {/* Mini bars */}
            <div className="flex items-end gap-0.5 h-5">
              <div className="w-1 bg-[#16A34A] h-2 rounded-t" />
              <div className="w-1 bg-[#16A34A] h-3.5 rounded-t" />
              <div className="w-1 bg-[#16A34A] h-5 rounded-t" />
            </div>
          </div>
        </div>

        {/* Card 5: Expectancy */}
        <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#786F66]">Expectancy</span>
            <div className="w-7 h-7 rounded-lg bg-[#FEECEB] text-[#DC2626] flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-[#1F1A16] leading-none">+0.12R</div>
            <div className="text-[10px] text-[#786F66] mt-1">PF: 1.16</div>
          </div>
        </div>

        {/* Card 6: Discipline Score */}
        <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#786F66]">Discipline Score</span>
            <div className="w-7 h-7 rounded-lg bg-[#FAF2E6] text-[#DB9F35] flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-[#1F1A16] leading-none">87%</div>
            <div className="text-[10px] font-bold text-[#15803D] mt-1">36/42 Clean</div>
          </div>
        </div>
      </div>

      {/* 3. Filter Toolbar Strip (Matching image) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#FAF6EE] border border-[#E7E0D6] p-2 rounded-2xl shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Date range filter */}
          <div className="relative">
            <select
              value={selectedDateFilter ? 'CUSTOM' : filterDateRange}
              onChange={(e) => {
                if (selectedDateFilter) onClearDateFilter?.();
                setFilterDateRange(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none pl-7 pr-7 py-1.5 bg-[#F2ECE0] border border-[#DFD5C6] rounded-xl text-xs font-semibold text-[#1F1A16] outline-none cursor-pointer hover:bg-[#ECE4D5]"
            >
              <option value="OCT_2026">Oct 01, 2026 - Oct 31, 2026 (Full Month)</option>
              <option value="2026-10-05">05 Oct 2026 (Mon • Active Session)</option>
              <option value="2026-10-04">04 Oct 2026 (Sun)</option>
              <option value="2026-10-03">03 Oct 2026 (Sat)</option>
              <option value="2026-10-02">02 Oct 2026 (Fri)</option>
              <option value="2026-10-01">01 Oct 2026 (Thu)</option>
              <option value="DEC_2025">Dec 01, 2025 - Dec 31, 2025</option>
              <option value="ALL">All Dates (Full History)</option>
              {selectedDateFilter && (
                <option value="CUSTOM">Custom Date: {selectedDateFilter}</option>
              )}
            </select>
            <Calendar className="w-3.5 h-3.5 text-[#786F66] absolute left-2.5 top-2.5 pointer-events-none" />
            <ChevronDown className="w-3 h-3 text-[#786F66] absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Pair filter */}
          <div className="relative">
            <select
              value={filterPair}
              onChange={(e) => {
                setFilterPair(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none pl-7 pr-7 py-1.5 bg-[#F2ECE0] border border-[#DFD5C6] rounded-xl text-xs font-semibold text-[#1F1A16] outline-none cursor-pointer hover:bg-[#ECE4D5]"
            >
              <option value="ALL">All Pairs</option>
              <option value="XAUUSD">XAUUSD</option>
              <option value="BTCUSD">BTCUSD</option>
              <option value="ETHUSD">ETHUSD</option>
              <option value="GBPUSD">GBPUSD</option>
            </select>
            <Filter className="w-3.5 h-3.5 text-[#786F66] absolute left-2.5 top-2.5 pointer-events-none" />
            <ChevronDown className="w-3 h-3 text-[#786F66] absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Setup filter */}
          <div className="relative">
            <select
              value={filterSetup}
              onChange={(e) => {
                setFilterSetup(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none pl-7 pr-7 py-1.5 bg-[#F2ECE0] border border-[#DFD5C6] rounded-xl text-xs font-medium text-[#1F1A16] outline-none cursor-pointer hover:bg-[#ECE4D5]"
            >
              <option value="ALL">All Setups</option>
              <option value="MSS">MSS</option>
              <option value="FVG">FVG</option>
              <option value="Liquidity">Liquidity</option>
              <option value="POI">POI</option>
              <option value="Chased Move">Chased Move</option>
              <option value="No Setup">No Setup</option>
            </select>
            <Layers className="w-3.5 h-3.5 text-[#786F66] absolute left-2.5 top-2.5 pointer-events-none" />
            <ChevronDown className="w-3 h-3 text-[#786F66] absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Emotion filter */}
          <div className="relative">
            <select
              value={filterEmotion}
              onChange={(e) => {
                setFilterEmotion(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none pl-7 pr-7 py-1.5 bg-[#F2ECE0] border border-[#DFD5C6] rounded-xl text-xs font-medium text-[#1F1A16] outline-none cursor-pointer hover:bg-[#ECE4D5]"
            >
              <option value="ALL">All Emotions</option>
              <option value="Calm">Calm</option>
              <option value="Focused">Focused</option>
              <option value="FOMO">FOMO</option>
              <option value="Revenge">Revenge</option>
              <option value="Frustrated">Frustrated</option>
            </select>
            <Smile className="w-3.5 h-3.5 text-[#786F66] absolute left-2.5 top-2.5 pointer-events-none" />
            <ChevronDown className="w-3 h-3 text-[#786F66] absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Execution filter */}
          <div className="relative">
            <select
              value={filterExecution}
              onChange={(e) => {
                setFilterExecution(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none pl-7 pr-7 py-1.5 bg-[#F2ECE0] border border-[#DFD5C6] rounded-xl text-xs font-medium text-[#1F1A16] outline-none cursor-pointer hover:bg-[#ECE4D5]"
            >
              <option value="ALL">All Execution</option>
              <option value="Clean">Clean</option>
              <option value="Violation">Violation</option>
            </select>
            <Zap className="w-3.5 h-3.5 text-[#786F66] absolute left-2.5 top-2.5 pointer-events-none" />
            <ChevronDown className="w-3 h-3 text-[#786F66] absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Exit Type filter */}
          <div className="relative">
            <select
              value={filterExitType}
              onChange={(e) => {
                setFilterExitType(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none pl-7 pr-7 py-1.5 bg-[#F2ECE0] border border-[#DFD5C6] rounded-xl text-xs font-medium text-[#1F1A16] outline-none cursor-pointer hover:bg-[#ECE4D5]"
            >
              <option value="ALL">All Exit Types</option>
              <option value="TP">TP</option>
              <option value="SL">SL</option>
              <option value="BE">BE</option>
              <option value="Manual">Manual</option>
            </select>
            <Crosshair className="w-3.5 h-3.5 text-[#786F66] absolute left-2.5 top-2.5 pointer-events-none" />
            <ChevronDown className="w-3 h-3 text-[#786F66] absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Reset button */}
        <button
          onClick={handleResetFilters}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-2xs ml-auto ${
            hasActiveFilters
              ? 'bg-[#DB9F35] text-[#1F1A16] font-bold hover:bg-[#C98E2A] shadow-xs cursor-pointer'
              : 'bg-[#F2ECE0] hover:bg-[#ECE4D5] text-[#786F66] hover:text-[#1F1A16] border border-[#DFD5C6] cursor-pointer'
          }`}
          title="Reset all filters to default"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${hasActiveFilters ? 'text-[#1F1A16]' : 'text-[#786F66]'}`} />
          <span>Reset</span>
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-[#1F1A16] text-[#FAF6EE] text-[9px] flex items-center justify-center font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* 4. Detailed Trades Table */}
      <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
            <thead>
              <tr className="bg-[#F2ECE0] border-b border-[#E7E0D6] text-[10px] font-bold text-[#786F66] uppercase tracking-wider">
                <th className="py-3 px-3 text-center w-8">#</th>
                <th className="py-3 px-3 font-bold">Date &amp; Time</th>
                <th className="py-3 px-3 font-bold">Pair</th>
                <th className="py-3 px-2 font-bold">Lot</th>
                <th className="py-3 px-3 font-bold">Order</th>
                <th className="py-3 px-3 font-bold">Entry</th>
                <th className="py-3 px-3 font-bold">SL</th>
                <th className="py-3 px-3 font-bold">TP</th>
                <th className="py-3 px-3 font-bold text-right">P&amp;L ($)</th>
                <th className="py-3 px-3 font-bold text-center">R</th>
                <th className="py-3 px-2 font-bold text-center">Pips</th>
                <th className="py-3 px-3 font-bold text-center">Exit Type</th>
                <th className="py-3 px-3 font-bold text-center">Emotion</th>
                <th className="py-3 px-3 font-bold text-center">Execution</th>
                <th className="py-3 px-3 font-bold">Setup</th>
                <th className="py-3 px-3 font-bold text-center">HTF Context</th>
                <th className="py-3 px-3 font-bold text-center">Chart</th>
                <th className="py-3 px-4 font-bold">Note</th>
                <th className="py-3 px-3 text-center">···</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E0D6]/60">
              {paginatedTrades.map((t, idx) => {
                const isWin = t.r.startsWith('+');
                const isLoss = t.r.startsWith('-');

                return (
                  <tr
                    key={t.id}
                    className="hover:bg-[#F2ECE0]/70 transition-colors text-[11px]"
                  >
                    {/* # Index */}
                    <td className="py-2.5 px-3 text-center font-bold text-[#9E958C]">
                      {t.num || startIndex + idx + 1}
                    </td>

                    {/* Date & Time */}
                    <td className="py-2.5 px-3 font-medium text-[#1F1A16]">
                      {t.dateTime}
                    </td>

                    {/* Pair */}
                    <td className="py-2.5 px-3 font-bold text-[#1F1A16]">
                      {t.pair}
                    </td>

                    {/* Lot */}
                    <td className="py-2.5 px-2 font-mono text-[#786F66]">
                      {t.lot}
                    </td>

                    {/* Order Pill */}
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          t.order === 'BUY'
                            ? 'bg-[#E8F8EE] text-[#15803D]'
                            : 'bg-[#FEECEB] text-[#DC2626]'
                        }`}
                      >
                        {t.order}
                      </span>
                    </td>

                    {/* Entry */}
                    <td className="py-2.5 px-3 font-mono font-medium text-[#1F1A16]">
                      {t.entry}
                    </td>

                    {/* SL */}
                    <td className="py-2.5 px-3 font-mono font-medium text-[#786F66]">
                      {t.sl}
                    </td>

                    {/* TP */}
                    <td className="py-2.5 px-3 font-mono font-medium text-[#786F66]">
                      {t.tp}
                    </td>

                    {/* P&L ($) */}
                    <td
                      className={`py-2.5 px-3 text-right font-mono font-bold ${
                        isWin
                          ? 'text-[#15803D]'
                          : isLoss
                          ? 'text-[#DC2626]'
                          : 'text-[#786F66]'
                      }`}
                    >
                      {t.pnl}
                    </td>

                    {/* R-Multiple */}
                    <td
                      className={`py-2.5 px-3 text-center font-mono font-bold ${
                        isWin
                          ? 'text-[#15803D]'
                          : isLoss
                          ? 'text-[#DC2626]'
                          : 'text-[#786F66]'
                      }`}
                    >
                      {t.r}
                    </td>

                    {/* Pips */}
                    <td className="py-2.5 px-2 text-center font-mono text-[#786F66]">
                      {t.pips}
                    </td>

                    {/* Exit Type */}
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          t.exitType === 'TP'
                            ? 'bg-[#E0F2FE] text-[#0284C7]'
                            : t.exitType === 'SL'
                            ? 'bg-[#FEECEB] text-[#DC2626]'
                            : t.exitType === 'BE'
                            ? 'bg-[#E0F2FE] text-[#0284C7]'
                            : 'bg-[#FEF3C7] text-[#B45309]'
                        }`}
                      >
                        {t.exitType === 'TP' && <span className="text-[9px]">🎯</span>}
                        {t.exitType === 'SL' && <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />}
                        {t.exitType === 'BE' && <span className="text-[9px]">↕</span>}
                        {t.exitType === 'Manual' && <span className="text-[9px]">✍</span>}
                        <span>{t.exitType}</span>
                      </span>
                    </td>

                    {/* Emotion */}
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-medium ${
                          t.emotion === 'Calm'
                            ? 'bg-[#E8F8EE] text-[#15803D]'
                            : t.emotion === 'Focused'
                            ? 'bg-[#E0F2FE] text-[#0284C7]'
                            : 'bg-[#FEECEB] text-[#DC2626]'
                        }`}
                      >
                        {t.emotion}
                      </span>
                    </td>

                    {/* Execution Badge */}
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                          t.execution === 'Clean'
                            ? 'bg-[#E8F8EE] text-[#15803D]'
                            : 'bg-[#FEECEB] text-[#DC2626]'
                        }`}
                      >
                        {t.execution}
                      </span>
                    </td>

                    {/* Setup */}
                    <td className="py-2.5 px-3 font-medium text-[#1F1A16]">
                      {t.setup}
                    </td>

                    {/* HTF Context */}
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-medium ${
                          t.htf === 'Bullish'
                            ? 'bg-[#E8F8EE] text-[#15803D]'
                            : t.htf === 'Bearish'
                            ? 'bg-[#FEECEB] text-[#DC2626]'
                            : 'bg-[#F3EDE2] text-[#786F66]'
                        }`}
                      >
                        {t.htf}
                      </span>
                    </td>

                    {/* Chart Thumbnail (Candlestick Graphic) */}
                    <td className="py-2.5 px-3 text-center">
                      <div
                        onClick={() =>
                          onViewImage(
                            'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="%23161B22"/><text x="50%" y="50%" fill="%23DB9F35" font-size="20" text-anchor="middle" font-family="sans-serif">XAUUSD Trade Setup Chart</text></svg>',
                            `Trade #${t.num} Chart Preview`
                          )
                        }
                        className="w-10 h-6 bg-[#161B22] rounded border border-[#30363D] mx-auto flex items-center justify-center p-0.5 cursor-pointer hover:border-[#DB9F35] transition-colors shadow-2xs"
                        title="Click to view chart"
                      >
                        <svg className="w-full h-full" viewBox="0 0 40 24" fill="none">
                          <line x1="0" y1="12" x2="40" y2="12" stroke="#21262D" strokeWidth="0.8" strokeDasharray="2 2" />
                          <line x1="6" y1="4" x2="6" y2="18" stroke="#3FB950" strokeWidth="1" />
                          <rect x="4.5" y="8" width="3" height="7" fill="#3FB950" rx="0.5" />
                          <line x1="14" y1="6" x2="14" y2="20" stroke="#F85149" strokeWidth="1" />
                          <rect x="12.5" y="10" width="3" height="6" fill="#F85149" rx="0.5" />
                          <line x1="22" y1="5" x2="22" y2="17" stroke="#3FB950" strokeWidth="1" />
                          <rect x="20.5" y="7" width="3" height="7" fill="#3FB950" rx="0.5" />
                          <line x1="30" y1="2" x2="30" y2="15" stroke="#3FB950" strokeWidth="1" />
                          <rect x="28.5" y="4" width="3" height="8" fill="#3FB950" rx="0.5" />
                          <polyline points="6,12 14,14 22,10 30,6" fill="none" stroke="#58A6FF" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                      </div>
                    </td>

                    {/* Note */}
                    <td className="py-2.5 px-4 text-[#786F66] text-[11px] max-w-xs truncate">
                      {t.note}
                    </td>

                    {/* Actions Menu */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => {
                          if ('rawTrade' in t && t.rawTrade) {
                            onEditTrade(t.rawTrade as Trade);
                          }
                        }}
                        className="p-1 rounded-md text-[#9E958C] hover:text-[#1F1A16] hover:bg-[#F2ECE0] transition-colors"
                        title="Trade actions"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 5. Table Footer & Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[#E7E0D6] bg-[#F2ECE0] text-xs text-[#786F66]">
          {/* Show dropdown */}
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-lg px-2 py-1 text-xs font-semibold text-[#1F1A16] outline-none cursor-pointer shadow-2xs"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>of {totalTradesCount} trades</span>
          </div>

          {/* Pagination numbers */}
          <div className="flex items-center gap-1 font-semibold text-xs">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validCurrentPage === 1}
              className="w-6 h-6 rounded-md flex items-center justify-center text-[#786F66] hover:bg-[#F0E8DC] disabled:opacity-40"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-6 h-6 rounded-md flex items-center justify-center text-xs transition-all ${
                  validCurrentPage === pageNum
                    ? 'bg-[#F0E5D3] text-[#9B671B] font-bold border border-[#E2D1B8] shadow-2xs'
                    : 'text-[#786F66] hover:bg-[#F0E8DC] hover:text-[#1F1A16]'
                }`}
              >
                {pageNum}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validCurrentPage === totalPages}
              className="w-6 h-6 rounded-md flex items-center justify-center text-[#786F66] hover:bg-[#F0E8DC] disabled:opacity-40"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* 6. Bottom Quick Insights Strip (Matching uploaded image) */}
      <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-3.5 shadow-2xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Quick Insights Text */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#FAF2E6] text-[#DB9F35] flex items-center justify-center shrink-0 shadow-2xs">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-[#1F1A16] block">Quick Insights</span>
            <p className="text-[11px] text-[#786F66] mt-0.5">
              You made <span className="font-bold text-[#15803D]">+5.4R</span> on clean trades, but lost{' '}
              <span className="font-bold text-[#DC2626]">-2.8R on rule violations.</span>
            </p>
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="h-8 w-px bg-[#E7E0D6] hidden xl:block shrink-0" />

        {/* Modules Strip */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          {/* Biggest Win */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#FAF2E6] text-[#DB9F35] flex items-center justify-center shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-[#786F66] block leading-none">Biggest Win</span>
              <span className="text-xs font-black text-[#15803D] font-mono mt-0.5 block">+3R</span>
            </div>
          </div>

          {/* Biggest Loss */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#FEECEB] text-[#DC2626] flex items-center justify-center shrink-0">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-[#786F66] block leading-none">Biggest Loss</span>
              <span className="text-xs font-black text-[#DC2626] font-mono mt-0.5 block">-2R</span>
            </div>
          </div>

          {/* Most Common Emotion */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-[#786F66] block leading-none">Most Common Emotion</span>
              <span className="text-xs font-bold text-[#1F1A16] mt-0.5 block">FOMO (12)</span>
            </div>
          </div>

          {/* Most Common Setup */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#F3E8FF] text-[#9333EA] flex items-center justify-center shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-[#786F66] block leading-none">Most Common Setup</span>
              <span className="text-xs font-bold text-[#1F1A16] mt-0.5 block">MSS (14)</span>
            </div>
          </div>
        </div>

        {/* View Analytics CTA */}
        <button
          onClick={() => onTabChange?.('analytics')}
          className="px-4 py-2 rounded-xl bg-[#DB9F35] hover:bg-[#C98E2A] text-[#1F1A16] font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all hover:scale-102 shrink-0"
        >
          <span>View Analytics</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

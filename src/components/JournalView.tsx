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
  onOpenQuickTrade,
  onViewImage,
  selectedDateFilter,
  onClearDateFilter,
  onTabChange,
}) => {
  // Filter States
  const [filterDateRange, setFilterDateRange] = useState<string>('ALL');
  const [filterPair, setFilterPair] = useState<string>('ALL');
  const [filterSetup, setFilterSetup] = useState<string>('ALL');
  const [filterEmotion, setFilterEmotion] = useState<string>('ALL');
  const [filterExecution, setFilterExecution] = useState<string>('ALL');
  const [filterExitType, setFilterExitType] = useState<string>('ALL');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

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

  // Dynamic KPI calculation from live trades
  const perf = React.useMemo(() => {
    const total = trades.length;
    const wins = trades.filter((t) => (t.rMultiple || 0) > 0);
    const losses = trades.filter((t) => (t.rMultiple || 0) < 0);
    const bes = trades.filter((t) => (t.rMultiple || 0) === 0);
    const winRate = total > 0 ? (wins.length / total) * 100 : 0;
    const netPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const netR = trades.reduce((sum, t) => sum + (t.rMultiple || 0), 0);
    const totalWinR = wins.reduce((sum, t) => sum + (t.rMultiple || 0), 0);
    const totalLossR = Math.abs(losses.reduce((sum, t) => sum + (t.rMultiple || 0), 0));
    const profitFactor = totalLossR > 0 ? totalWinR / totalLossR : totalWinR > 0 ? 99 : 1.0;
    const avgWinR = wins.length > 0 ? totalWinR / wins.length : 0;
    const avgLossR = losses.length > 0 ? totalLossR / losses.length : 0;
    const cleanTrades = trades.filter((t) => t.execution === 'CLEAN').length;
    const disciplineScore = total > 0 ? Math.round((cleanTrades / total) * 100) : 100;

    return {
      total,
      wins: wins.length,
      losses: losses.length,
      bes: bes.length,
      winRate,
      netPnl,
      netR,
      profitFactor,
      avgWinR,
      avgLossR,
      cleanTrades,
      disciplineScore,
    };
  }, [trades]);

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

  // Active pool of trades: only live cloud database trades
  let poolOfTrades: TradeRow[] = dbMappedTrades;
  if (selectedDateFilter) {
    poolOfTrades = poolOfTrades.filter((t) => t.rawDate === selectedDateFilter);
  }

  // Filter application
  const filteredList = poolOfTrades.filter((t) => {
    if (filterDateRange === 'OCT_2026' && !t.rawDate.startsWith('2026-10')) return false;
    if (filterDateRange === 'DEC_2025' && !t.rawDate.startsWith('2025-12')) return false;
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
    filterDateRange !== 'ALL' ||
    filterPair !== 'ALL' ||
    filterSetup !== 'ALL' ||
    filterEmotion !== 'ALL' ||
    filterExecution !== 'ALL' ||
    filterExitType !== 'ALL' ||
    Boolean(selectedDateFilter);

  const activeFilterCount = 
    (filterDateRange !== 'ALL' ? 1 : 0) +
    (filterPair !== 'ALL' ? 1 : 0) +
    (filterSetup !== 'ALL' ? 1 : 0) +
    (filterEmotion !== 'ALL' ? 1 : 0) +
    (filterExecution !== 'ALL' ? 1 : 0) +
    (filterExitType !== 'ALL' ? 1 : 0) +
    (selectedDateFilter ? 1 : 0);

  const handleResetFilters = () => {
    setFilterDateRange('ALL');
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
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#786F66] dark:text-[#94A3B8]">Total Trades</span>
            <div className="w-7 h-7 rounded-lg bg-[#FAF2E6] dark:bg-[#1C2331] text-[#10B981] flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-[#1F1A16] dark:text-[#F0F4F8]">{perf.total}</span>
              <span className="text-[10px] font-bold text-[#10B981] flex items-center">
                Live
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Net P&L */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#786F66] dark:text-[#94A3B8]">Net P&amp;L</span>
            <div className="w-7 h-7 rounded-lg bg-[#E8F8EE] dark:bg-[#132A1C] text-[#15803D] dark:text-[#34D399] flex items-center justify-center">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <div>
              <div className={`text-2xl font-black leading-none ${perf.netR >= 0 ? 'text-[#10B981]' : 'text-[#DC2626]'}`}>
                {perf.netR >= 0 ? '+' : ''}{perf.netR.toFixed(1)}R
              </div>
              <div className={`text-[10px] font-bold mt-1 ${perf.netPnl >= 0 ? 'text-[#10B981]' : 'text-[#DC2626]'}`}>
                {perf.netPnl >= 0 ? '+' : ''}${perf.netPnl.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Win Rate */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#786F66] dark:text-[#94A3B8]">Win Rate</span>
            <div className="w-7 h-7 rounded-lg bg-[#FAF2E6] dark:bg-[#1C2331] text-[#10B981] flex items-center justify-center">
              <RotateCcw className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div>
              <div className="text-2xl font-black text-[#1F1A16] dark:text-[#F0F4F8] leading-none">{perf.winRate.toFixed(0)}%</div>
              <div className="text-[9px] font-mono text-[#786F66] dark:text-[#94A3B8] mt-1">{perf.wins}W • {perf.losses}L • {perf.bes}BE</div>
            </div>
            <div className="relative w-8 h-8 shrink-0">
              <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-[#E7E0D6] dark:text-[#242D3D]"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#10B981]"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeDasharray={`${perf.winRate}, 100`}
                  strokeLinecap="round"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 4: Avg Win / Loss */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#786F66] dark:text-[#94A3B8]">Avg Win / Loss</span>
            <div className="w-7 h-7 rounded-lg bg-[#FAF2E6] dark:bg-[#1C2331] text-[#10B981] flex items-center justify-center">
              <BarChart2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <div className="text-sm font-black font-mono leading-none">
              <span className="text-[#10B981]">+{perf.avgWinR.toFixed(1)}R</span> / <span className="text-[#DC2626]">-{perf.avgLossR.toFixed(1)}R</span>
            </div>
          </div>
        </div>

        {/* Card 5: Profit Factor */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#786F66] dark:text-[#94A3B8]">Profit Factor</span>
            <div className="w-7 h-7 rounded-lg bg-[#FAF2E6] dark:bg-[#1C2331] text-[#10B981] flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-[#1F1A16] dark:text-[#F0F4F8] leading-none">{perf.profitFactor.toFixed(2)}</div>
            <div className="text-[10px] text-[#786F66] dark:text-[#94A3B8] mt-1">Ratio</div>
          </div>
        </div>

        {/* Card 6: Discipline Score */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#786F66] dark:text-[#94A3B8]">Discipline Score</span>
            <div className="w-7 h-7 rounded-lg bg-[#FAF2E6] dark:bg-[#1C2331] text-[#10B981] flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-[#1F1A16] dark:text-[#F0F4F8] leading-none">{perf.disciplineScore}%</div>
            <div className="text-[10px] font-bold text-[#10B981] mt-1">{perf.cleanTrades}/{perf.total} Clean</div>
          </div>
        </div>
      </div>

      {/* 3. Filter Toolbar Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] p-2 rounded-2xl shadow-2xs transition-colors">
        <div className="flex flex-wrap items-center gap-2">
          {/* Date range filter */}
          <div className="relative">
            <select
              value={selectedDateFilter ? 'CUSTOM' : filterDateRange}
              onChange={(e) => {
                setFilterDateRange(e.target.value);
                setCurrentPage(1);
                if (e.target.value !== 'CUSTOM') onClearDateFilter?.();
              }}
              className="appearance-none pl-8 pr-8 py-1.5 bg-[#F2ECE0] dark:bg-[#1C2331] border border-[#DFD5C6] dark:border-[#2E384D] rounded-xl text-xs font-semibold text-[#1F1A16] dark:text-[#F0F4F8] outline-none cursor-pointer hover:bg-[#ECE4D5] dark:hover:bg-[#252E40] transition-colors"
            >
              <option value="ALL">All Dates (Full History)</option>
              <option value="OCT_2026">Oct 01, 2026 - Oct 31, 2026</option>
              <option value="DEC_2025">Dec 01, 2025 - Dec 31, 2025</option>
              {selectedDateFilter && (
                <option value="CUSTOM">Custom Date: {selectedDateFilter}</option>
              )}
            </select>
            <Calendar className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8] absolute left-2.5 top-2.5 pointer-events-none" />
            <ChevronDown className="w-3 h-3 text-[#786F66] dark:text-[#94A3B8] absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Pair filter */}
          <div className="relative">
            <select
              value={filterPair}
              onChange={(e) => {
                setFilterPair(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none pl-7 pr-7 py-1.5 bg-[#F2ECE0] dark:bg-[#1C2331] border border-[#DFD5C6] dark:border-[#2E384D] rounded-xl text-xs font-semibold text-[#1F1A16] dark:text-[#F0F4F8] outline-none cursor-pointer hover:bg-[#ECE4D5] dark:hover:bg-[#252E40] transition-colors"
            >
              <option value="ALL">All Pairs</option>
              <option value="XAUUSD">XAUUSD</option>
              <option value="BTCUSD">BTCUSD</option>
              <option value="ETHUSD">ETHUSD</option>
              <option value="GBPUSD">GBPUSD</option>
            </select>
            <Filter className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8] absolute left-2.5 top-2.5 pointer-events-none" />
            <ChevronDown className="w-3 h-3 text-[#786F66] dark:text-[#94A3B8] absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Setup filter */}
          <div className="relative">
            <select
              value={filterSetup}
              onChange={(e) => {
                setFilterSetup(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none pl-7 pr-7 py-1.5 bg-[#F2ECE0] dark:bg-[#1C2331] border border-[#DFD5C6] dark:border-[#2E384D] rounded-xl text-xs font-medium text-[#1F1A16] dark:text-[#F0F4F8] outline-none cursor-pointer hover:bg-[#ECE4D5] dark:hover:bg-[#252E40] transition-colors"
            >
              <option value="ALL">All Setups</option>
              <option value="MSS">MSS</option>
              <option value="FVG">FVG</option>
              <option value="Liquidity">Liquidity</option>
              <option value="POI">POI</option>
              <option value="Chased Move">Chased Move</option>
              <option value="No Setup">No Setup</option>
            </select>
            <Layers className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8] absolute left-2.5 top-2.5 pointer-events-none" />
            <ChevronDown className="w-3 h-3 text-[#786F66] dark:text-[#94A3B8] absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Emotion filter */}
          <div className="relative">
            <select
              value={filterEmotion}
              onChange={(e) => {
                setFilterEmotion(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none pl-7 pr-7 py-1.5 bg-[#F2ECE0] dark:bg-[#1C2331] border border-[#DFD5C6] dark:border-[#2E384D] rounded-xl text-xs font-medium text-[#1F1A16] dark:text-[#F0F4F8] outline-none cursor-pointer hover:bg-[#ECE4D5] dark:hover:bg-[#252E40] transition-colors"
            >
              <option value="ALL">All Emotions</option>
              <option value="Calm">Calm</option>
              <option value="Focused">Focused</option>
              <option value="FOMO">FOMO</option>
              <option value="Revenge">Revenge</option>
              <option value="Frustrated">Frustrated</option>
            </select>
            <Smile className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8] absolute left-2.5 top-2.5 pointer-events-none" />
            <ChevronDown className="w-3 h-3 text-[#786F66] dark:text-[#94A3B8] absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Execution filter */}
          <div className="relative">
            <select
              value={filterExecution}
              onChange={(e) => {
                setFilterExecution(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none pl-7 pr-7 py-1.5 bg-[#F2ECE0] dark:bg-[#1C2331] border border-[#DFD5C6] dark:border-[#2E384D] rounded-xl text-xs font-medium text-[#1F1A16] dark:text-[#F0F4F8] outline-none cursor-pointer hover:bg-[#ECE4D5] dark:hover:bg-[#252E40] transition-colors"
            >
              <option value="ALL">All Execution</option>
              <option value="Clean">Clean</option>
              <option value="Violation">Violation</option>
            </select>
            <Zap className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8] absolute left-2.5 top-2.5 pointer-events-none" />
            <ChevronDown className="w-3 h-3 text-[#786F66] dark:text-[#94A3B8] absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Exit Type filter */}
          <div className="relative">
            <select
              value={filterExitType}
              onChange={(e) => {
                setFilterExitType(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none pl-7 pr-7 py-1.5 bg-[#F2ECE0] dark:bg-[#1C2331] border border-[#DFD5C6] dark:border-[#2E384D] rounded-xl text-xs font-medium text-[#1F1A16] dark:text-[#F0F4F8] outline-none cursor-pointer hover:bg-[#ECE4D5] dark:hover:bg-[#252E40] transition-colors"
            >
              <option value="ALL">All Exit Types</option>
              <option value="TP">TP</option>
              <option value="SL">SL</option>
              <option value="BE">BE</option>
              <option value="Manual">Manual</option>
            </select>
            <Crosshair className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8] absolute left-2.5 top-2.5 pointer-events-none" />
            <ChevronDown className="w-3 h-3 text-[#786F66] dark:text-[#94A3B8] absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Reset button */}
        <button
          onClick={handleResetFilters}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-2xs ml-auto ${
            hasActiveFilters
              ? 'bg-[#10B981] text-white font-bold hover:bg-[#059669] shadow-xs cursor-pointer'
              : 'bg-[#F2ECE0] dark:bg-[#1C2331] hover:bg-[#ECE4D5] dark:hover:bg-[#252E40] text-[#786F66] dark:text-[#94A3B8] hover:text-[#1F1A16] dark:hover:text-[#F0F4F8] border border-[#DFD5C6] dark:border-[#2E384D] cursor-pointer'
          }`}
          title="Reset all filters to default"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-[#1F1A16] text-[#FAF6EE] text-[9px] flex items-center justify-center font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* 4. Detailed Trades Table */}
      <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl overflow-hidden shadow-2xs transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
            <thead>
              <tr className="bg-[#F2ECE0] dark:bg-[#1A2230] border-b border-[#E7E0D6] dark:border-[#242D3D] text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider">
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
            <tbody className="divide-y divide-[#E7E0D6]/60 dark:divide-[#242D3D]">
              {paginatedTrades.length === 0 ? (
                <tr>
                  <td colSpan={19} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#FAF2E6] dark:bg-[#1C2331] text-[#10B981] flex items-center justify-center shadow-xs">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                          {trades.length === 0 ? 'No Trades In Journal' : 'No Trades Match Your Filters'}
                        </h4>
                        <p className="text-xs text-[#786F66] dark:text-[#94A3B8] max-w-sm mt-0.5">
                          {trades.length === 0
                            ? 'Your journal is clean. Click "+ Add Trade" or press N to record your first trade into Supabase cloud.'
                            : 'Try adjusting your filter settings or reset filters to see your recorded trades.'}
                        </p>
                      </div>
                      {trades.length === 0 && onOpenQuickTrade && (
                        <button
                          type="button"
                          onClick={onOpenQuickTrade}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                        >
                          + Add Trade
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTrades.map((t, idx) => {
                const isWin = t.r.startsWith('+');
                const isLoss = t.r.startsWith('-');

                return (
                  <tr
                    key={t.id}
                    className="hover:bg-[#F2ECE0]/70 dark:hover:bg-[#1A2230]/70 transition-colors text-[11px] text-[#1F1A16] dark:text-[#F0F4F8]"
                  >
                    {/* # Index */}
                    <td className="py-2.5 px-3 text-center font-bold text-[#9E958C] dark:text-[#64748B]">
                      {t.num || startIndex + idx + 1}
                    </td>

                    {/* Date & Time */}
                    <td className="py-2.5 px-3 font-medium text-[#1F1A16] dark:text-[#F0F4F8]">
                      {t.dateTime}
                    </td>

                    {/* Pair */}
                    <td className="py-2.5 px-3 font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                      {t.pair}
                    </td>

                    {/* Lot */}
                    <td className="py-2.5 px-2 font-mono text-[#786F66] dark:text-[#94A3B8]">
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
              }))}
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

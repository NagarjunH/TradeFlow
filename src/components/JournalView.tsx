import React, { useState, useEffect } from 'react';
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
  Trash2,
  Edit3,
  MessageSquare,
  Check,
  ZoomIn,
  Clock,
  Tag,
  Trophy,
  PieChart,
  Bookmark,
  HelpCircle,
  GitFork,
  Link2,
  LogIn,
  Paperclip,
  FileText
} from 'lucide-react';
import type { Trade, AppSettings } from '../db/db';
import type { TabType } from './Navbar';

export interface TradeRow {
  id: number;
  num: number;
  dateFormatted: string; // e.g. "October 9, 2026"
  rawDate: string;
  time: string;
  session: string; // "Tokyo", "London", "New York", "London/NY Overlap"
  pair: string;
  lot: string;
  order: 'BUY' | 'SELL';
  pnl: string;
  pnlNum: number;
  riskReward: string; // "1:1"
  pips: number; // PIP CAPTURED
  emotion: string; // "FOCUSED", "CALM", etc.
  tradeSuccessRate: string; // "Exit Before Target", "Target Hit", etc.
  exitReason: string;
  setupType: string;
  htfContext: string;
  entryReason: string;
  chart?: string;
  rawTrade?: Trade;
}

interface JournalViewProps {
  trades: Trade[];
  settings: AppSettings;
  onEditTrade: (trade: Trade) => void;
  onDeleteTrade?: (trade: Trade) => void | Promise<void>;
  onUpdateTrade?: (uuid: string, updates: Partial<Trade>) => void | Promise<void>;
  onOpenQuickTrade: () => void;
  onViewImage: (url: string, title?: string) => void;
  selectedDateFilter?: string;
  onClearDateFilter?: () => void;
  onTabChange?: (tab: TabType) => void;
}

export const JournalView: React.FC<JournalViewProps> = ({
  trades,
  settings,
  onEditTrade,
  onDeleteTrade,
  onUpdateTrade,
  onOpenQuickTrade,
  onViewImage,
  selectedDateFilter,
  onClearDateFilter,
  onTabChange,
}) => {
  const currSymbol = settings?.currency === 'USD' ? '$' : '₹';

  // Filter States
  const [filterDateRange, setFilterDateRange] = useState<string>('ALL');
  const [filterSession, setFilterSession] = useState<string>('ALL');
  const [filterPair, setFilterPair] = useState<string>('ALL');
  const [filterEmotion, setFilterEmotion] = useState<string>('ALL');
  const [filterSuccessRate, setFilterSuccessRate] = useState<string>('ALL');
  const [filterSetup, setFilterSetup] = useState<string>('ALL');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Sorting State: 1 to 3 ascending by default
  const [sortAscending, setSortAscending] = useState<boolean>(true);

  // Row Action Menu (3 dots) & Delete Confirmation
  const [activeMenuId, setActiveMenuId] = useState<number | string | null>(null);
  const [tradeToDelete, setTradeToDelete] = useState<Trade | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Quick Note / Reason Editor Modal
  const [noteModalTrade, setNoteModalTrade] = useState<Trade | null>(null);
  const [noteText, setNoteText] = useState<string>('');
  const [exitReasonText, setExitReasonText] = useState<string>('');
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);

  // Dismiss dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null);
    if (activeMenuId !== null) {
      window.addEventListener('click', handleOutsideClick);
      return () => window.removeEventListener('click', handleOutsideClick);
    }
  }, [activeMenuId]);

  // Format date like Notion screenshot: "October 9, 2026"
  const formatNotionDate = (dateStr?: string) => {
    if (!dateStr) return 'October 9, 2026';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const monthIdx = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return `${monthNames[monthIdx] || parts[1]} ${day}, ${year}`;
      }
    } catch (_) {}
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

  // Convert db trades into user's exact Notion journal points
  const dbMappedTrades: TradeRow[] = trades.map((t, idx) => {
    const rawPnl = Number(t.pnl) || 0;
    const rMult = t.rMultiple != null ? Number(t.rMultiple) : 0;
    const rDisplay = t.riskReward || (rMult !== 0 ? `1:${Math.abs(rMult)}` : '1:1');
    const pipsVal = t.pips != null ? Number(t.pips) : Math.round(Math.abs(rawPnl) * 100);

    let successRate = t.tradeSuccessRate;
    if (!successRate) {
      if (t.exitType === 'TARGET') successRate = 'Target Hit';
      else if (t.exitType === 'STOP_LOSS') successRate = 'Stop Loss Hit';
      else if (t.exitType === 'BREAKEVEN') successRate = 'Breakeven';
      else successRate = 'Exit Before Target';
    }

    let sess = t.session || 'Tokyo';
    if (sess === 'Asian') sess = 'Tokyo';

    const pnlFormatted = rawPnl >= 0 ? `$${rawPnl.toFixed(2)}` : `-$${Math.abs(rawPnl).toFixed(2)}`;

    return {
      id: t.id || idx + 1,
      num: t.tradeNumber || idx + 1,
      dateFormatted: formatNotionDate(t.date),
      rawDate: t.date || '2026-10-09',
      time: t.time || '10:00',
      session: sess,
      pair: t.pair ? (t.pair.includes('/') ? t.pair : `${t.pair.slice(0, 3)}/${t.pair.slice(3)}`) : 'XAU/USD',
      lot: t.lotSize ? t.lotSize.toFixed(2) : '0.01',
      order: (t.order || 'BUY') as 'BUY' | 'SELL',
      pnl: pnlFormatted,
      pnlNum: rawPnl,
      riskReward: rDisplay,
      pips: pipsVal,
      emotion: (t.emotion || 'FOCUSED').toUpperCase(),
      tradeSuccessRate: successRate,
      exitReason: t.exitReason || t.notes || '',
      setupType: t.setupType || '',
      htfContext: t.htfContext || '1. Bearish on 1H, 4H 2. Bullish on 15m, 5m',
      entryReason: t.entryReason || 'On Support and Pullback of HTF Support',
      chart: t.chartScreenshot || '',
      rawTrade: t,
    };
  });

  // Active pool of trades
  let poolOfTrades: TradeRow[] = dbMappedTrades;
  if (selectedDateFilter) {
    poolOfTrades = poolOfTrades.filter((t) => t.rawDate === selectedDateFilter);
  }

  // Filter application
  const filteredList = poolOfTrades.filter((t) => {
    if (filterDateRange === 'OCT_2026' && !t.rawDate.startsWith('2026-10')) return false;
    if (filterDateRange === 'DEC_2025' && !t.rawDate.startsWith('2025-12')) return false;
    if (filterSession !== 'ALL' && t.session.toLowerCase() !== filterSession.toLowerCase()) return false;
    if (filterPair !== 'ALL' && t.pair.replace('/', '') !== filterPair.replace('/', '')) return false;
    if (filterEmotion !== 'ALL' && t.emotion.toLowerCase() !== filterEmotion.toLowerCase()) return false;
    if (filterSuccessRate !== 'ALL' && t.tradeSuccessRate.toLowerCase() !== filterSuccessRate.toLowerCase()) return false;
    if (filterSetup !== 'ALL' && !t.setupType.toLowerCase().includes(filterSetup.toLowerCase())) return false;
    return true;
  });

  // Sort trades: strictly 1 to 3 ascending by default
  const sortedList = [...filteredList].sort((a, b) => {
    const numA = Number(a.num) || 0;
    const numB = Number(b.num) || 0;
    if (numA !== numB) {
      return sortAscending ? numA - numB : numB - numA;
    }
    return sortAscending
      ? (a.rawDate + a.time).localeCompare(b.rawDate + b.time)
      : (b.rawDate + b.time).localeCompare(a.rawDate + a.time);
  });

  const totalTradesCount = sortedList.length;
  const totalPages = Math.max(1, Math.ceil(totalTradesCount / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedTrades = sortedList.slice(startIndex, startIndex + pageSize);

  // Column sums matching Notion (e.g. SUM $10.71)
  const totalPnlSum = sortedList.reduce((sum, t) => sum + t.pnlNum, 0);
  const totalPipsSum = sortedList.reduce((sum, t) => sum + t.pips, 0);

  const hasActiveFilters = 
    filterDateRange !== 'ALL' ||
    filterSession !== 'ALL' ||
    filterPair !== 'ALL' ||
    filterEmotion !== 'ALL' ||
    filterSuccessRate !== 'ALL' ||
    filterSetup !== 'ALL' ||
    Boolean(selectedDateFilter);

  const activeFilterCount = 
    (filterDateRange !== 'ALL' ? 1 : 0) +
    (filterSession !== 'ALL' ? 1 : 0) +
    (filterPair !== 'ALL' ? 1 : 0) +
    (filterEmotion !== 'ALL' ? 1 : 0) +
    (filterSuccessRate !== 'ALL' ? 1 : 0) +
    (filterSetup !== 'ALL' ? 1 : 0) +
    (selectedDateFilter ? 1 : 0);

  const handleResetFilters = () => {
    setFilterDateRange('ALL');
    setFilterSession('ALL');
    setFilterPair('ALL');
    setFilterEmotion('ALL');
    setFilterSuccessRate('ALL');
    setFilterSetup('ALL');
    setCurrentPage(1);
    onClearDateFilter?.();
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12 text-[#1F1A16] dark:text-[#F0F4F8] font-sans selection:bg-[#DB9F35]/30">
      {/* 1. Page Header matching Notion: "Forex Trading Journal / TradeFlow" */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 pb-1">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center shadow-2xs">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1F1A16] dark:text-[#F0F4F8]">
                TradeFlow
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-md bg-[#FAF2E6] dark:bg-[#1C2331] text-[#9B671B] dark:text-[#F3D784] font-semibold border border-[#E7E0D6] dark:border-[#242D3D]">
                Forex Trading Journal
              </span>
            </div>
            <p className="text-xs text-[#786F66] dark:text-[#94A3B8] font-medium tracking-tight mt-0.5">
              Clean Notion-style trading points with Tokyo &amp; major sessions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenQuickTrade}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#2383E2] hover:bg-[#1B6FBF] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <span className="text-sm leading-none font-bold">+</span>
            <span>New Trade</span>
          </button>
        </div>
      </div>

      {/* 2. Top 6 KPI Metric Cards */}
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
              <span className="text-[10px] font-bold text-[#10B981]">Live</span>
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
              <div className={`text-2xl font-black leading-none ${perf.netPnl >= 0 ? 'text-[#10B981]' : 'text-[#DC2626]'}`}>
                {perf.netPnl >= 0 ? '+' : '-'}{currSymbol}{Math.abs(perf.netPnl).toFixed(2)}
              </div>
              <div className={`text-[10px] font-bold mt-1 ${perf.netR >= 0 ? 'text-[#10B981]' : 'text-[#DC2626]'}`}>
                {perf.netR >= 0 ? '+' : ''}{perf.netR.toFixed(1)}R
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

          {/* Session filter (Tokyo, London, New York, etc.) */}
          <div className="relative">
            <select
              value={filterSession}
              onChange={(e) => {
                setFilterSession(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none pl-7 pr-7 py-1.5 bg-[#F2ECE0] dark:bg-[#1C2331] border border-[#DFD5C6] dark:border-[#2E384D] rounded-xl text-xs font-semibold text-[#1F1A16] dark:text-[#F0F4F8] outline-none cursor-pointer hover:bg-[#ECE4D5] dark:hover:bg-[#252E40] transition-colors"
            >
              <option value="ALL">All Sessions</option>
              <optgroup label="Major Sessions">
                <option value="Tokyo">Tokyo (Asian)</option>
                <option value="London">London (European)</option>
                <option value="New York">New York (US)</option>
                <option value="Sydney">Sydney (Pacific)</option>
              </optgroup>
              <optgroup label="Session Overlaps">
                <option value="London/NY Overlap">London / NY Overlap</option>
                <option value="Asian/London Overlap">Asian / London Overlap</option>
                <option value="Sydney/Tokyo Overlap">Sydney / Tokyo Overlap</option>
                <option value="NY/Asian Overlap">NY / Asian Overlap</option>
              </optgroup>
            </select>
            <Clock className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8] absolute left-2.5 top-2.5 pointer-events-none" />
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
              <option value="XAUUSD">XAU/USD</option>
              <option value="EURUSD">EUR/USD</option>
              <option value="GBPUSD">GBP/USD</option>
              <option value="BTCUSD">BTC/USD</option>
            </select>
            <Filter className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8] absolute left-2.5 top-2.5 pointer-events-none" />
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
              <option value="FOCUSED">Focused</option>
              <option value="CALM">Calm</option>
              <option value="FOMO">FOMO</option>
              <option value="REVENGE">Revenge</option>
              <option value="GREED">Greed</option>
              <option value="HESITANT">Hesitant</option>
            </select>
            <Smile className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8] absolute left-2.5 top-2.5 pointer-events-none" />
            <ChevronDown className="w-3 h-3 text-[#786F66] dark:text-[#94A3B8] absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Success Rate filter */}
          <div className="relative">
            <select
              value={filterSuccessRate}
              onChange={(e) => {
                setFilterSuccessRate(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none pl-7 pr-7 py-1.5 bg-[#F2ECE0] dark:bg-[#1C2331] border border-[#DFD5C6] dark:border-[#2E384D] rounded-xl text-xs font-medium text-[#1F1A16] dark:text-[#F0F4F8] outline-none cursor-pointer hover:bg-[#ECE4D5] dark:hover:bg-[#252E40] transition-colors"
            >
              <option value="ALL">All Trade Outcomes</option>
              <option value="Scalping Trade">Scalping Trade</option>
              <option value="Exit Before Target">Exit Before Target</option>
              <option value="Exit Before SL">Exit Before SL</option>
              <option value="Stop Loss">Stop Loss</option>
              <option value="TARGET">TARGET</option>
              <option value="MANUAL EXIT">MANUAL EXIT</option>
              <option value="Target Hit">Target Hit (Legacy)</option>
              <option value="Stop Loss Hit">Stop Loss Hit (Legacy)</option>
              <option value="Breakeven">Breakeven (Legacy)</option>
            </select>
            <Target className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8] absolute left-2.5 top-2.5 pointer-events-none" />
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

      {/* 4. Notion Table: Exact Columns Requested + Session */}
      <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl overflow-hidden shadow-2xs transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
            <thead>
              <tr className="bg-[#F2ECE0] dark:bg-[#1A2230] border-b border-[#E7E0D6] dark:border-[#242D3D] text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider">
                {/* 1. Date */}
                <th className="py-3 px-3 font-bold">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8]" />
                    <span>Date</span>
                  </div>
                </th>

                {/* 2. SR. NO. */}
                <th 
                  onClick={() => setSortAscending((prev) => !prev)}
                  className="py-3 px-3 text-center cursor-pointer hover:bg-[#ECE4D5] dark:hover:bg-[#252E40] transition-colors select-none group"
                  title="Click to toggle sort sequence (1→3 / 3→1)"
                >
                  <div className="flex items-center justify-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8]" />
                    <span>SR. NO.</span>
                    <span className="text-[9px] font-mono text-[#DB9F35] font-bold">{sortAscending ? '1→3' : '3→1'}</span>
                  </div>
                </th>

                {/* 3. Session */}
                <th className="py-3 px-3 font-bold text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8]" />
                    <span>Session</span>
                  </div>
                </th>

                {/* 4. Pairs */}
                <th className="py-3 px-3 font-bold">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8]" />
                    <span>Pairs</span>
                  </div>
                </th>

                {/* 5. LOT SIZE */}
                <th className="py-3 px-2 font-bold">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8]" />
                    <span>LOT SIZE</span>
                  </div>
                </th>

                {/* 6. ORDER */}
                <th className="py-3 px-3 font-bold">
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8]" />
                    <span>ORDER</span>
                  </div>
                </th>

                {/* 7. P/L */}
                <th className="py-3 px-3 font-bold text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8]" />
                    <span>P/L</span>
                  </div>
                </th>

                {/* 8. Risk:Reward */}
                <th className="py-3 px-3 font-bold text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <PieChart className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8]" />
                    <span>Risk:Reward</span>
                  </div>
                </th>

                {/* 9. PIP CAPTURED */}
                <th className="py-3 px-3 font-bold text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Bookmark className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8]" />
                    <span>PIP CAPTURED</span>
                  </div>
                </th>

                {/* 10. Emotions */}
                <th className="py-3 px-3 font-bold text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Smile className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8]" />
                    <span>Emotions</span>
                  </div>
                </th>

                {/* 11. TRADE SUCCESS RATE */}
                <th className="py-3 px-3 font-bold text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8]" />
                    <span>TRADE SUCCESS RATE</span>
                  </div>
                </th>

                {/* 12. Exit Reason */}
                <th className="py-3 px-3 font-bold">
                  <div className="flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8]" />
                    <span>Exit Reason</span>
                  </div>
                </th>

                {/* 13. Setup Type */}
                <th className="py-3 px-3 font-bold">
                  <div className="flex items-center gap-1.5">
                    <GitFork className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8]" />
                    <span>Setup Type</span>
                  </div>
                </th>

                {/* 14. HTF Context */}
                <th className="py-3 px-3 font-bold">
                  <div className="flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8]" />
                    <span>HTF Context</span>
                  </div>
                </th>

                {/* 15. Entry Reason */}
                <th className="py-3 px-3 font-bold">
                  <div className="flex items-center gap-1.5">
                    <LogIn className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8]" />
                    <span>Entry Reason</span>
                  </div>
                </th>

                {/* 16. Vantage P/L Images */}
                <th className="py-3 px-3 font-bold text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8]" />
                    <span>Vantage P/L Images</span>
                  </div>
                </th>

                {/* 17. Menu Actions */}
                <th className="py-3 px-2 text-center">···</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E7E0D6]/60 dark:divide-[#242D3D]">
              {paginatedTrades.length === 0 ? (
                <tr>
                  <td colSpan={17} className="py-16 text-center">
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
                            ? 'Your journal is clean. Click "+ New page" to record your first trade.'
                            : 'Try adjusting your filter settings or reset filters to see your recorded trades.'}
                        </p>
                      </div>
                      {trades.length === 0 && onOpenQuickTrade && (
                        <button
                          type="button"
                          onClick={onOpenQuickTrade}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2383E2] hover:bg-[#1B6FBF] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                        >
                          + New Trade
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTrades.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-[#F2ECE0]/60 dark:hover:bg-[#1A2230]/60 transition-colors text-[11px] text-[#1F1A16] dark:text-[#F0F4F8]"
                  >
                    {/* 1. Date */}
                    <td className="py-2.5 px-3 font-medium text-[#1F1A16] dark:text-[#F0F4F8]">
                      {t.dateFormatted}
                    </td>

                    {/* 2. SR. NO. */}
                    <td className="py-2.5 px-3 text-center font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold">
                        <FileText className="w-3.5 h-3.5 text-[#9E958C]" />
                        <span>{t.num}</span>
                      </div>
                    </td>

                    {/* 3. Session */}
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                          t.session === 'Tokyo' || t.session === 'Asian'
                            ? 'bg-[#F5EBFC] dark:bg-[#341F48] text-[#8427C6] dark:text-[#D8B4FE]'
                            : t.session === 'London'
                            ? 'bg-[#E1EFFE] dark:bg-[#182C47] text-[#1E429F] dark:text-[#93C5FD]'
                            : t.session === 'New York'
                            ? 'bg-[#FEE2E2] dark:bg-[#431B1B] text-[#991B1B] dark:text-[#FCA5A5]'
                            : 'bg-[#FEF3C7] dark:bg-[#3E2E16] text-[#92400E] dark:text-[#FCD34D]'
                        }`}
                      >
                        {t.session}
                      </span>
                    </td>

                    {/* 4. Pairs */}
                    <td className="py-2.5 px-3">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FBF2DC] dark:bg-[#3D331A] text-[#8F6B12] dark:text-[#F3D784]">
                        {t.pair}
                      </span>
                    </td>

                    {/* 5. LOT SIZE */}
                    <td className="py-2.5 px-2">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-[#E6F4EA] dark:bg-[#1E3326] text-[#1E7E34] dark:text-[#6EE7B7]">
                        {t.lot}
                      </span>
                    </td>

                    {/* 6. ORDER */}
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                          t.order === 'BUY'
                            ? 'bg-[#E2F5E9] dark:bg-[#193B26] text-[#137333] dark:text-[#4ADE80]'
                            : 'bg-[#FCE8E6] dark:bg-[#3D1D1D] text-[#C5221F] dark:text-[#F87171]'
                        }`}
                      >
                        {t.order}
                      </span>
                    </td>

                    {/* 7. P/L */}
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5 font-mono font-bold text-xs">
                        <span className={t.pnlNum >= 0 ? 'text-[#1F1A16] dark:text-[#F0F4F8]' : 'text-[#DC2626] dark:text-[#F87171]'}>
                          {t.pnl}
                        </span>
                        {t.pnlNum > 0 ? (
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-[#10B981] inline-block shrink-0" title="Win" />
                        ) : t.pnlNum < 0 ? (
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-[#EF4444] inline-block shrink-0" title="Loss" />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-[#9CA3AF] inline-block shrink-0" title="Breakeven" />
                        )}
                      </div>
                    </td>

                    {/* 8. Risk:Reward */}
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-[#E6F4EA] dark:bg-[#1E3326] text-[#137333] dark:text-[#86EFAC]">
                        {t.riskReward}
                      </span>
                    </td>

                    {/* 9. PIP CAPTURED */}
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-xs text-[#1F1A16] dark:text-[#F0F4F8]">
                      {t.pips}
                    </td>

                    {/* 10. Emotions */}
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-[#E0EFFE] dark:bg-[#1A3152] text-[#1D4ED8] dark:text-[#93C5FD]">
                        {t.emotion}
                      </span>
                    </td>

                    {/* 11. TRADE SUCCESS RATE */}
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-semibold ${
                          t.tradeSuccessRate === 'TARGET' || t.tradeSuccessRate === 'Target Hit'
                            ? 'bg-[#DCFCE7] dark:bg-[#143823] text-[#15803D] dark:text-[#4ADE80]'
                            : t.tradeSuccessRate === 'Stop Loss' || t.tradeSuccessRate === 'Stop Loss Hit'
                            ? 'bg-[#FEE2E2] dark:bg-[#3D1D1D] text-[#B91C1C] dark:text-[#F87171]'
                            : t.tradeSuccessRate === 'Exit Before SL'
                            ? 'bg-[#FEF3C7] dark:bg-[#3E2E16] text-[#92400E] dark:text-[#FCD34D]'
                            : t.tradeSuccessRate === 'Scalping Trade'
                            ? 'bg-[#FCE7F3] dark:bg-[#3D1429] text-[#BE185D] dark:text-[#F472B6]'
                            : t.tradeSuccessRate === 'MANUAL EXIT'
                            ? 'bg-[#DBEAFE] dark:bg-[#172E54] text-[#1D4ED8] dark:text-[#93C5FD]'
                            : t.tradeSuccessRate === 'Breakeven'
                            ? 'bg-[#FEF3C7] dark:bg-[#3E2E16] text-[#92400E] dark:text-[#FCD34D]'
                            : 'bg-[#F3F4F6] dark:bg-[#1F2937] text-[#374151] dark:text-[#D1D5DB]'
                        }`}
                      >
                        {t.tradeSuccessRate}
                      </span>
                    </td>

                    {/* 12. Exit Reason */}
                    <td 
                      className="py-2.5 px-3 max-w-xs truncate text-[11px] text-[#4B5563] dark:text-[#D1D5DB] cursor-pointer hover:text-[#DB9F35] transition-colors"
                      title={t.exitReason || 'Click to edit exit reason'}
                      onClick={() => {
                        if (t.rawTrade) {
                          setNoteModalTrade(t.rawTrade);
                          setExitReasonText(t.rawTrade.exitReason || t.rawTrade.notes || '');
                          setNoteText(t.rawTrade.entryReason || '');
                        }
                      }}
                    >
                      {t.exitReason ? (
                        <span>{t.exitReason}</span>
                      ) : (
                        <span className="text-[10px] text-[#9E958C] italic">+ Reason</span>
                      )}
                    </td>

                    {/* 13. Setup Type */}
                    <td className="py-2.5 px-3 text-[11px] font-medium text-[#1F1A16] dark:text-[#F0F4F8]">
                      {t.setupType || '-'}
                    </td>

                    {/* 14. HTF Context */}
                    <td className="py-2.5 px-3 max-w-xs truncate text-[11px] text-[#4B5563] dark:text-[#D1D5DB]" title={t.htfContext}>
                      {t.htfContext}
                    </td>

                    {/* 15. Entry Reason */}
                    <td className="py-2.5 px-3 max-w-xs truncate text-[11px] text-[#4B5563] dark:text-[#D1D5DB]" title={t.entryReason}>
                      {t.entryReason}
                    </td>

                    {/* 16. Vantage P/L Images */}
                    <td className="py-2.5 px-3 text-center">
                      {t.chart ? (
                        <div
                          onClick={() => onViewImage(t.chart!, `Trade #${t.num} Vantage P/L Screenshot`)}
                          className="relative group w-10 h-7 rounded-md border border-[#DFD5C6] dark:border-[#2E384D] overflow-hidden mx-auto cursor-pointer hover:border-[#DB9F35] shadow-2xs hover:scale-105 transition-all bg-[#121214]"
                          title="Click to view Vantage P/L Screenshot"
                        >
                          <img
                            src={t.chart}
                            alt={`Trade #${t.num} Vantage P/L`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <ZoomIn className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (t.rawTrade) onEditTrade(t.rawTrade);
                          }}
                          className="px-2 py-0.5 rounded-md text-[10px] font-medium text-[#9E958C] hover:text-[#DB9F35] border border-dashed border-[#DFD5C6] dark:border-[#2E384D] transition-colors cursor-pointer inline-flex items-center gap-1"
                          title="No Vantage image. Click to attach."
                        >
                          <Paperclip className="w-3 h-3" />
                          <span>+ Image</span>
                        </button>
                      )}
                    </td>

                    {/* 17. Row Action Menu (···) */}
                    <td className="py-2.5 px-2 text-center relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === t.id ? null : t.id);
                        }}
                        className="p-1 rounded-md text-[#9E958C] hover:text-[#1F1A16] dark:hover:text-[#F0F4F8] hover:bg-[#F2ECE0] dark:hover:bg-[#1C2331] transition-colors cursor-pointer"
                        title="Trade actions"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {/* Dropdown Menu */}
                      {activeMenuId === t.id && (
                        <div
                          className="absolute right-2 top-8 z-30 w-36 bg-white dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-xl shadow-lg py-1 text-left animate-fade-in"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              if (t.rawTrade) onEditTrade(t.rawTrade);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#1F1A16] dark:text-[#F0F4F8] hover:bg-[#FAF6EE] dark:hover:bg-[#1C2331] transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-[#DB9F35]" />
                            <span>Edit Trade</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              if (t.rawTrade) {
                                setNoteModalTrade(t.rawTrade);
                                setExitReasonText(t.rawTrade.exitReason || t.rawTrade.notes || '');
                                setNoteText(t.rawTrade.entryReason || '');
                              }
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#1F1A16] dark:text-[#F0F4F8] hover:bg-[#FAF6EE] dark:hover:bg-[#1C2331] transition-colors cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-[#10B981]" />
                            <span>Edit Reason</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              if (t.rawTrade) setTradeToDelete(t.rawTrade);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#DC2626] hover:bg-[#FEECEB] dark:hover:bg-[#2A1616] transition-colors cursor-pointer border-t border-[#E7E0D6]/50 dark:border-[#242D3D]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Trade</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}

              {/* Notion "+ New page" Row */}
              <tr className="hover:bg-[#F2ECE0]/40 dark:hover:bg-[#1A2230]/40 transition-colors border-t border-[#E7E0D6] dark:border-[#242D3D]">
                <td colSpan={17} className="py-2 px-3">
                  <button
                    type="button"
                    onClick={onOpenQuickTrade}
                    className="inline-flex items-center gap-1.5 text-xs text-[#786F66] dark:text-[#94A3B8] hover:text-[#1F1A16] dark:hover:text-[#F0F4F8] font-medium transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-[#EAE4D7] dark:hover:bg-[#252E40]"
                  >
                    <span className="text-base leading-none font-bold">+</span>
                    <span>New page</span>
                  </button>
                </td>
              </tr>

              {/* Notion Table Summary Footer Row (e.g. SUM $10.71) */}
              <tr className="bg-[#F2ECE0]/80 dark:bg-[#1A2230]/80 font-mono text-[11px] font-bold text-[#786F66] dark:text-[#94A3B8] border-t border-[#E7E0D6] dark:border-[#242D3D]">
                <td className="py-2.5 px-3"></td>
                <td className="py-2.5 px-3 text-center">
                  COUNT {sortedList.length}
                </td>
                <td className="py-2.5 px-3"></td>
                <td className="py-2.5 px-3"></td>
                <td className="py-2.5 px-2"></td>
                <td className="py-2.5 px-3"></td>
                {/* P/L Column Sum */}
                <td className="py-2.5 px-3 text-right">
                  <span className="font-mono text-xs font-black text-[#1F1A16] dark:text-[#F0F4F8]">
                    SUM ${totalPnlSum.toFixed(2)}
                  </span>
                </td>
                <td className="py-2.5 px-3"></td>
                {/* PIP CAPTURED Column Sum */}
                <td className="py-2.5 px-3 text-center">
                  <span className="font-mono text-xs font-black text-[#1F1A16] dark:text-[#F0F4F8]">
                    SUM {totalPipsSum.toLocaleString()}
                  </span>
                </td>
                <td colSpan={8} className="py-2.5 px-3"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 5. Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[#E7E0D6] dark:border-[#242D3D] bg-[#F2ECE0] dark:bg-[#1A2230] text-xs text-[#786F66] dark:text-[#94A3B8]">
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-lg px-2 py-1 text-xs font-semibold text-[#1F1A16] dark:text-[#F0F4F8] outline-none cursor-pointer shadow-2xs"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>of {totalTradesCount} trades</span>
          </div>

          <div className="flex items-center gap-1 font-semibold text-xs">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validCurrentPage === 1}
              className="w-6 h-6 rounded-md flex items-center justify-center text-[#786F66] hover:bg-[#F0E8DC] dark:hover:bg-[#252E40] disabled:opacity-40"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-6 h-6 rounded-md flex items-center justify-center text-xs transition-all ${
                  validCurrentPage === pageNum
                    ? 'bg-[#F0E5D3] dark:bg-[#2E384D] text-[#9B671B] dark:text-[#F3D784] font-bold border border-[#E2D1B8] dark:border-[#3E4A62] shadow-2xs'
                    : 'text-[#786F66] hover:bg-[#F0E8DC] dark:hover:bg-[#252E40] hover:text-[#1F1A16] dark:hover:text-[#F0F4F8]'
                }`}
              >
                {pageNum}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validCurrentPage === totalPages}
              className="w-6 h-6 rounded-md flex items-center justify-center text-[#786F66] hover:bg-[#F0E8DC] dark:hover:bg-[#252E40] disabled:opacity-40"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* 6. Bottom Insights Bar */}
      <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-3.5 shadow-2xs flex flex-col xl:flex-row xl:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center shrink-0 shadow-2xs">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8] block">Quick Insights</span>
            <p className="text-[11px] text-[#786F66] dark:text-[#94A3B8] mt-0.5">
              Net captured: <span className="font-bold text-[#15803D] dark:text-[#4ADE80]">+{totalPnlSum.toFixed(2)} USD</span> across {totalTradesCount} logged setups.
            </p>
          </div>
        </div>

        <div className="h-8 w-px bg-[#E7E0D6] dark:bg-[#242D3D] hidden xl:block shrink-0" />

        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-[#786F66] dark:text-[#94A3B8] block leading-none">Total Pips</span>
              <span className="text-xs font-black text-[#15803D] font-mono mt-0.5 block">+{totalPipsSum}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#FEECEB] dark:bg-[#2A1616] text-[#DC2626] flex items-center justify-center shrink-0">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-[#786F66] dark:text-[#94A3B8] block leading-none">Win Ratio</span>
              <span className="text-xs font-black text-[#1F1A16] dark:text-[#F0F4F8] font-mono mt-0.5 block">{perf.winRate.toFixed(0)}%</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#E0F2FE] dark:bg-[#1A2E46] text-[#0284C7] flex items-center justify-center shrink-0">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-[#786F66] dark:text-[#94A3B8] block leading-none">Primary Emotion</span>
              <span className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8] mt-0.5 block">FOCUSED</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => onTabChange?.('analytics')}
          className="px-4 py-2 rounded-xl bg-[#DB9F35] hover:bg-[#C98E2A] text-[#1F1A16] font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all hover:scale-102 shrink-0 cursor-pointer"
        >
          <span>View Analytics</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 7. Delete Trade Confirmation Dialog */}
      {tradeToDelete && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => !isDeleting && setTradeToDelete(null)}
        >
          <div 
            className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FEECEB] dark:bg-[#2A1616] text-[#DC2626] flex items-center justify-center shrink-0 shadow-xs">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                  Delete Trade #{tradeToDelete.tradeNumber || tradeToDelete.id}?
                </h3>
                <p className="text-xs text-[#786F66] dark:text-[#94A3B8] mt-1 leading-relaxed">
                  Permanently delete this <strong className="text-[#1F1A16] dark:text-white">{tradeToDelete.pair} {tradeToDelete.order}</strong> trade (${tradeToDelete.pnl.toFixed(2)}) from your journal?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E7E0D6] dark:border-[#242D3D]">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setTradeToDelete(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#786F66] hover:text-[#1F1A16] dark:text-[#94A3B8] dark:hover:text-white bg-[#F2ECE0] dark:bg-[#1C2331] hover:bg-[#ECE4D5] dark:hover:bg-[#252E40] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await onDeleteTrade?.(tradeToDelete);
                  } finally {
                    setIsDeleting(false);
                    setTradeToDelete(null);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Yes, Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Quick Exit Reason & Notes Editor Modal */}
      {noteModalTrade && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => !isSavingNote && setNoteModalTrade(null)}
        >
          <div 
            className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#E7E0D6] dark:border-[#242D3D]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                    Trade #{noteModalTrade.tradeNumber || noteModalTrade.id} Reasons
                  </h3>
                  <p className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">
                    {noteModalTrade.pair} • {noteModalTrade.order} • {noteModalTrade.date}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNoteModalTrade(null)}
                className="text-xs text-[#786F66] hover:text-[#1F1A16] dark:hover:text-white p-1 rounded-lg hover:bg-[#F2ECE0] dark:hover:bg-[#1C2331] transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8] mb-1">
                  Exit Reason
                </label>
                <input
                  type="text"
                  value={exitReasonText}
                  onChange={(e) => setExitReasonText(e.target.value)}
                  placeholder="e.g. Strong Resistance was there and Candle closed weak"
                  className="w-full px-3 py-2 bg-white dark:bg-[#0B0E14] border border-[#E7E0D6] dark:border-[#242D3D] rounded-xl text-xs text-[#1F1A16] dark:text-[#F0F4F8] focus:border-[#DB9F35] outline-none transition-colors placeholder:text-[#9E958C]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8] mb-1">
                  Entry Reason
                </label>
                <textarea
                  rows={2}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="e.g. On Support and Pullback of HTF Support, or Entry on Liquidity Sweep"
                  className="w-full px-3 py-2 bg-white dark:bg-[#0B0E14] border border-[#E7E0D6] dark:border-[#242D3D] rounded-xl text-xs text-[#1F1A16] dark:text-[#F0F4F8] focus:border-[#DB9F35] outline-none transition-colors resize-y placeholder:text-[#9E958C]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E7E0D6] dark:border-[#242D3D]">
              <button
                type="button"
                disabled={isSavingNote}
                onClick={() => setNoteModalTrade(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#786F66] hover:text-[#1F1A16] dark:text-[#94A3B8] dark:hover:text-white bg-[#F2ECE0] dark:bg-[#1C2331] hover:bg-[#ECE4D5] dark:hover:bg-[#252E40] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingNote}
                onClick={async () => {
                  setIsSavingNote(true);
                  try {
                    const exitTrim = exitReasonText.trim();
                    const entryTrim = noteText.trim();
                    const uuid = (noteModalTrade as any)._uuid || String(noteModalTrade.id);
                    await onUpdateTrade?.(uuid, { 
                      exitReason: exitTrim, 
                      notes: exitTrim, 
                      entryReason: entryTrim 
                    });
                  } finally {
                    setIsSavingNote(false);
                    setNoteModalTrade(null);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#10B981] hover:bg-[#059669] transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSavingNote ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

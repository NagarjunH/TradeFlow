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
  GitFork,
  Link2,
  LogIn,
  FileText,
  Zap,
  Search,
  Camera,
  Upload,
  X,
  ArrowUpDown
} from 'lucide-react';
import type { Trade, AppSettings, EmotionType } from '../db/db';
import type { TabType } from './Navbar';
import { calculatePricePips } from '../utils/vantageParser';
import { storageApi } from '../lib/api/storageApi';
import { supabase } from '../lib/supabase';

export interface TradeRow {
  id: number | string;
  num: number;
  dateFormatted: string; // e.g. "Nov 12, 2026"
  rawDate: string;
  time: string;
  session: string; // "Tokyo", "London", "New York", "London/NY Overlap"
  pair: string;
  lot: string;
  lotNum: number;
  order: 'BUY' | 'SELL';
  entryPrice?: number;
  exitPrice?: number;
  slPrice?: number;
  tpPrice?: number;
  chargesSwap?: string;
  openTimeRaw?: string;
  closeTimeRaw?: string;
  brokerSource?: string;
  brokerTicketId?: string;
  pnl: string;
  pnlNum: number;
  riskReward: string; // "1:1"
  pips: number; // signed pips captured
  emotion: string; // "FOCUSED", "CALM", etc.
  tradeSuccessRate: string; // "Exit Before Target", "TARGET", etc.
  exitReason: string;
  setupType: string;
  htfContext: string;
  entryReason: string;
  chart?: string;
  needsReview: boolean;
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
  onOpenVantageSync?: () => void;
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
  onOpenVantageSync,
}) => {
  const currSymbol = settings?.currency === 'USD' ? '$' : '₹';

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterSource, setFilterSource] = useState<string>('ALL');
  const [filterDateRange, setFilterDateRange] = useState<string>('ALL');
  const [filterSession, setFilterSession] = useState<string>('ALL');
  const [filterPair, setFilterPair] = useState<string>('ALL');
  const [filterEmotion, setFilterEmotion] = useState<string>('ALL');
  const [filterSuccessRate, setFilterSuccessRate] = useState<string>('ALL');
  const [filterSetup, setFilterSetup] = useState<string>('ALL');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Sorting State: Newest trades taken first by default
  const [sortAscending, setSortAscending] = useState<boolean>(false);

  // Row Action Menu (3 dots) & Delete Confirmation
  const [activeMenuId, setActiveMenuId] = useState<number | string | null>(null);
  const [tradeToDelete, setTradeToDelete] = useState<Trade | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Quick Review & Reason Editor Modal
  const [noteModalTrade, setNoteModalTrade] = useState<Trade | null>(null);
  const [noteText, setNoteText] = useState<string>('');
  const [exitReasonText, setExitReasonText] = useState<string>('');
  const [setupTypeText, setSetupTypeText] = useState<string>('');
  const [htfContextText, setHtfContextText] = useState<string>('');
  const [reviewEmotion, setReviewEmotion] = useState<EmotionType>('FOCUSED');
  const [reviewOutcome, setReviewOutcome] = useState<string>('TARGET');
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);

  // Quick Screenshot Paste / Upload Modal
  const [screenshotModalTrade, setScreenshotModalTrade] = useState<Trade | null>(null);
  const [pendingScreenshot, setPendingScreenshot] = useState<string>('');
  const [isSavingScreenshot, setIsSavingScreenshot] = useState<boolean>(false);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const screenshotInputRef = React.useRef<HTMLInputElement>(null);

  // Dismiss dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null);
    if (activeMenuId !== null) {
      window.addEventListener('click', handleOutsideClick);
      return () => window.removeEventListener('click', handleOutsideClick);
    }
  }, [activeMenuId]);

  // Format date cleanly: "Nov 12, 2026"
  const formatNotionDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const monthIdx = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const monthNames = [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
        return `${monthNames[monthIdx] || parts[1]} ${day}, ${year}`;
      }
    } catch (_) {}
    return dateStr;
  };

  const openQuickReviewModal = (trade: Trade) => {
    setNoteModalTrade(trade);
    setExitReasonText(trade.exitReason || trade.notes || '');
    setNoteText(trade.entryReason || '');
    setSetupTypeText(trade.setupType || '');
    setHtfContextText(trade.htfContext || '');
    setReviewEmotion((trade.emotion || 'FOCUSED') as EmotionType);
    setReviewOutcome(
      trade.tradeSuccessRate ||
        (trade.exitType === 'TARGET'
          ? 'TARGET'
          : trade.exitType === 'STOP_LOSS'
          ? 'Stop Loss'
          : trade.exitType === 'BREAKEVEN'
          ? 'Breakeven'
          : 'MANUAL EXIT')
    );
  };

  const compressScreenshotFile = (file: File | Blob) => {
    if (!file.type.startsWith('image/')) return;
    setScreenshotError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rawData = ev.target?.result as string;
      if (!rawData) return;
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1280;
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = Math.round((h * maxWidth) / w);
          w = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          setPendingScreenshot(canvas.toDataURL('image/jpeg', 0.78));
        } else {
          setPendingScreenshot(rawData);
        }
      };
      img.onerror = () => setPendingScreenshot(rawData);
      img.src = rawData;
    };
    reader.readAsDataURL(file);
  };

  // Global Ctrl+V listener while screenshot modal is open
  useEffect(() => {
    if (!screenshotModalTrade) return;
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) {
            e.preventDefault();
            compressScreenshotFile(blob);
            return;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [screenshotModalTrade]);

  // Convert db trades into structured journal rows reflecting actual trades taken
  const dbMappedTrades: TradeRow[] = trades.map((t, idx) => {
    const rawPnl = Number(t.pnl) || 0;
    let rMult = t.rMultiple != null ? Number(t.rMultiple) : 0;
    if (rawPnl < -0.001 && rMult > 0) rMult = -rMult;
    else if (rawPnl > 0.001 && rMult < 0) rMult = Math.abs(rMult);
    else if (Math.abs(rawPnl) <= 0.001) rMult = 0;

    const rDisplay = t.riskReward || (rMult !== 0 ? `1:${Math.abs(rMult).toFixed(rMult % 1 === 0 ? 0 : 1)}` : '1:1');
    const pairNorm = t.pair ? (t.pair.includes('/') ? t.pair : `${t.pair.slice(0, 3)}/${t.pair.slice(3)}`) : 'XAU/USD';
    const orderSide = (t.order || 'BUY') as 'BUY' | 'SELL';

    const computedPips = calculatePricePips(pairNorm, orderSide, t.entryPrice, t.exitPrice);
    const pipsVal = t.pips != null ? Number(t.pips) : computedPips ?? 0;

    let successRate = t.tradeSuccessRate;
    if (!successRate) {
      if (t.exitType === 'TARGET') successRate = 'TARGET';
      else if (t.exitType === 'STOP_LOSS') successRate = 'Stop Loss';
      else if (t.exitType === 'BREAKEVEN') successRate = 'Breakeven';
      else successRate = 'MANUAL EXIT';
    }

    let sess = t.session || 'Tokyo';
    if (sess === 'Asian') sess = 'Tokyo';

    const pnlFormatted = rawPnl >= 0 ? `${currSymbol}${rawPnl.toFixed(2)}` : `-${currSymbol}${Math.abs(rawPnl).toFixed(2)}`;
    const setupClean = (t.setupType || '').trim();
    const htfClean = (t.htfContext || '').trim();
    const entryReasonClean = (t.entryReason || '').trim();
    const exitReasonClean = (t.exitReason || t.notes || '').trim();
    const hasReviewNotes = Boolean(entryReasonClean || exitReasonClean);
    const needsReview = !setupClean || !hasReviewNotes || !t.chartScreenshot;

    return {
      id: (t as Trade & { _uuid?: string })._uuid || t.id || idx + 1,
      num: t.tradeNumber || idx + 1,
      dateFormatted: formatNotionDate(t.date),
      rawDate: t.date || '',
      time: t.time || '--:--',
      session: sess,
      pair: pairNorm,
      lot: (Number(t.lotSize) || 0.01).toFixed(2),
      lotNum: Number(t.lotSize) || 0.01,
      order: orderSide,
      entryPrice: t.entryPrice,
      exitPrice: t.exitPrice,
      slPrice: t.slPrice,
      tpPrice: t.tpPrice,
      chargesSwap: t.chargesSwap,
      openTimeRaw: t.openTimeRaw,
      closeTimeRaw: t.closeTimeRaw,
      brokerSource: t.brokerSource,
      brokerTicketId: t.brokerTicketId,
      pnl: pnlFormatted,
      pnlNum: rawPnl,
      riskReward: rDisplay,
      pips: pipsVal,
      emotion: (t.emotion || 'FOCUSED').toUpperCase(),
      tradeSuccessRate: successRate,
      exitReason: exitReasonClean,
      setupType: setupClean,
      htfContext: htfClean,
      entryReason: entryReasonClean,
      chart: t.chartScreenshot || '',
      needsReview,
      rawTrade: { ...t, rMultiple: rMult },
    };
  });

  // Dynamic filter options built from actual trades taken
  const availablePairs = React.useMemo(() => {
    const set = new Set<string>();
    dbMappedTrades.forEach((t) => {
      if (t.pair) set.add(t.pair);
    });
    return Array.from(set).sort();
  }, [dbMappedTrades]);

  const availableMonths = React.useMemo(() => {
    const set = new Set<string>();
    dbMappedTrades.forEach((t) => {
      if (t.rawDate && t.rawDate.length >= 7) {
        set.add(t.rawDate.slice(0, 7));
      }
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [dbMappedTrades]);

  const sourceCounts = React.useMemo(() => {
    const vantage = dbMappedTrades.filter((t) => Boolean(t.brokerSource || t.brokerTicketId)).length;
    const manual = dbMappedTrades.length - vantage;
    const pendingReview = dbMappedTrades.filter((t) => t.needsReview).length;
    const withChart = dbMappedTrades.filter((t) => Boolean(t.chart)).length;
    return { vantage, manual, pendingReview, withChart };
  }, [dbMappedTrades]);

  // Active pool of trades
  let poolOfTrades: TradeRow[] = dbMappedTrades;
  if (selectedDateFilter) {
    poolOfTrades = poolOfTrades.filter((t) => t.rawDate === selectedDateFilter);
  }

  // Filter application
  const todayStr = new Date().toISOString().split('T')[0];
  const sevenDaysAgoStr = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];
  const thisMonthPrefix = todayStr.slice(0, 7);
  const prevMonthDt = new Date();
  prevMonthDt.setMonth(prevMonthDt.getMonth() - 1);
  const lastMonthPrefix = `${prevMonthDt.getFullYear()}-${String(prevMonthDt.getMonth() + 1).padStart(2, '0')}`;

  const filteredList = poolOfTrades.filter((t) => {
    if (filterSource === 'VANTAGE' && !t.brokerSource && !t.brokerTicketId) return false;
    if (filterSource === 'MANUAL' && (t.brokerSource || t.brokerTicketId)) return false;
    if (filterSource === 'NEEDS_REVIEW' && !t.needsReview) return false;
    if (filterSource === 'WITH_CHART' && !t.chart) return false;

    if (filterDateRange === 'TODAY' && t.rawDate !== todayStr) return false;
    if (filterDateRange === 'LAST_7' && t.rawDate < sevenDaysAgoStr) return false;
    if (filterDateRange === 'THIS_MONTH' && !t.rawDate.startsWith(thisMonthPrefix)) return false;
    if (filterDateRange === 'LAST_MONTH' && !t.rawDate.startsWith(lastMonthPrefix)) return false;
    if (filterDateRange.startsWith('MONTH:') && !t.rawDate.startsWith(filterDateRange.slice(6))) return false;

    if (filterSession !== 'ALL' && t.session.toLowerCase() !== filterSession.toLowerCase()) return false;
    if (filterPair !== 'ALL' && t.pair.replace('/', '') !== filterPair.replace('/', '')) return false;
    if (filterEmotion !== 'ALL' && t.emotion.toLowerCase() !== filterEmotion.toLowerCase()) return false;
    if (filterSuccessRate !== 'ALL' && t.tradeSuccessRate.toLowerCase() !== filterSuccessRate.toLowerCase()) return false;
    if (filterSetup !== 'ALL' && !t.setupType.toLowerCase().includes(filterSetup.toLowerCase())) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const hay = `${t.pair} ${t.order} ${t.setupType} ${t.htfContext} ${t.entryReason} ${t.exitReason} ${t.brokerTicketId || ''} ${t.session}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }

    return true;
  });

  // Sort trades: Newest First by default (by execution timestamp + tradeNumber), toggleable to Oldest First
  const sortedList = [...filteredList].sort((a, b) => {
    const dtA = `${a.rawDate} ${a.time}`;
    const dtB = `${b.rawDate} ${b.time}`;
    if (dtA !== dtB) {
      return sortAscending ? dtA.localeCompare(dtB) : dtB.localeCompare(dtA);
    }
    const numA = Number(a.num) || 0;
    const numB = Number(b.num) || 0;
    return sortAscending ? numA - numB : numB - numA;
  });

  const totalTradesCount = sortedList.length;
  const totalPages = Math.max(1, Math.ceil(totalTradesCount / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedTrades = sortedList.slice(startIndex, startIndex + pageSize);

  // Column sums
  const totalPnlSum = sortedList.reduce((sum, t) => sum + t.pnlNum, 0);
  const totalPipsSum = Number(sortedList.reduce((sum, t) => sum + t.pips, 0).toFixed(1));
  const totalLotsSum = sortedList.reduce((sum, t) => sum + t.lotNum, 0);

  // Real primary emotion across active trades
  const primaryEmotion = React.useMemo(() => {
    if (sortedList.length === 0) return 'NONE';
    const counts: Record<string, number> = {};
    for (const r of sortedList) {
      const em = r.emotion || 'FOCUSED';
      counts[em] = (counts[em] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'FOCUSED';
  }, [sortedList]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    filterSource !== 'ALL' ||
    filterDateRange !== 'ALL' ||
    filterSession !== 'ALL' ||
    filterPair !== 'ALL' ||
    filterEmotion !== 'ALL' ||
    filterSuccessRate !== 'ALL' ||
    filterSetup !== 'ALL' ||
    Boolean(selectedDateFilter);

  // Dynamic KPI calculation from active trades
  const perf = React.useMemo(() => {
    const activeTrades = hasActiveFilters
      ? (filteredList.map((r) => r.rawTrade).filter(Boolean) as Trade[])
      : trades;

    const total = activeTrades.length;

    const getEffectiveR = (t: Trade): number => {
      const pnl = Number(t.pnl) || 0;
      let r = Number(t.rMultiple) || 0;
      if (pnl < -0.001) return r < 0 ? r : -(Math.abs(r) || 1.0);
      if (pnl > 0.001) return r > 0 ? r : (Math.abs(r) || 1.0);
      return 0;
    };

    // Classify based on true financial PnL
    const wins = activeTrades.filter((t) => (Number(t.pnl) || 0) > 0.001 || (Number(t.pnl) === 0 && getEffectiveR(t) > 0));
    const losses = activeTrades.filter((t) => (Number(t.pnl) || 0) < -0.001 || (Number(t.pnl) === 0 && getEffectiveR(t) < 0));
    const bes = activeTrades.filter((t) => Math.abs(Number(t.pnl) || 0) <= 0.001 && Math.abs(getEffectiveR(t)) <= 0.001);

    const winRate = total > 0 ? (wins.length / total) * 100 : 0;
    const netPnl = activeTrades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
    const netR = activeTrades.reduce((sum, t) => sum + getEffectiveR(t), 0);

    // Standard Gross Profit & Gross Loss
    const grossProfit = wins.reduce((sum, t) => sum + Math.max(0, Number(t.pnl) || 0), 0);
    const grossLoss = losses.reduce((sum, t) => sum + Math.abs(Math.min(0, Number(t.pnl) || 0)), 0);

    let profitFactor = 0;
    if (grossLoss > 0.001) {
      profitFactor = Number((grossProfit / grossLoss).toFixed(2));
    } else if (grossProfit > 0.001) {
      profitFactor = grossProfit > 100 ? 99.9 : Number(grossProfit.toFixed(2));
    } else {
      profitFactor = 0;
    }

    const totalWinR = wins.reduce((sum, t) => sum + Math.abs(getEffectiveR(t)), 0);
    const totalLossR = losses.reduce((sum, t) => sum + Math.abs(getEffectiveR(t)), 0);
    const avgWinR = wins.length > 0 ? totalWinR / wins.length : 0;
    const avgLossR = losses.length > 0 ? totalLossR / losses.length : 0;
    const avgWinUsd = wins.length > 0 ? grossProfit / wins.length : 0;
    const avgLossUsd = losses.length > 0 ? grossLoss / losses.length : 0;

    const cleanTrades = activeTrades.filter((t) => {
      const exec = (t.execution || '').toUpperCase();
      const qual = (t.tradeQuality || '').toUpperCase();
      const em = (t.emotion || '').toUpperCase();
      const viol = t.violationReason;

      const isViolation = 
        exec === 'VIOLATION' || 
        qual === 'VIOLATION' || 
        (Boolean(viol) && viol !== 'None') || 
        em === 'FOMO' || 
        em === 'REVENGE';

      return !isViolation && (exec === 'CLEAN' || qual === 'CLEAN' || (!exec && !qual));
    }).length;

    const disciplineScore = total > 0 ? Math.round((cleanTrades / total) * 100) : 100;

    return {
      total,
      wins: wins.length,
      losses: losses.length,
      bes: bes.length,
      winRate,
      netPnl,
      netR,
      grossProfit,
      grossLoss,
      profitFactor,
      avgWinR,
      avgLossR,
      avgWinUsd,
      avgLossUsd,
      cleanTrades,
      disciplineScore,
    };
  }, [trades, filteredList, hasActiveFilters]);

  const activeFilterCount =
    (searchQuery.trim() !== '' ? 1 : 0) +
    (filterSource !== 'ALL' ? 1 : 0) +
    (filterDateRange !== 'ALL' ? 1 : 0) +
    (filterSession !== 'ALL' ? 1 : 0) +
    (filterPair !== 'ALL' ? 1 : 0) +
    (filterEmotion !== 'ALL' ? 1 : 0) +
    (filterSuccessRate !== 'ALL' ? 1 : 0) +
    (filterSetup !== 'ALL' ? 1 : 0) +
    (selectedDateFilter ? 1 : 0);

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterSource('ALL');
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
      {/* 1. Page Header matching live trades taken */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 pb-1">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center shadow-2xs">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1F1A16] dark:text-[#F0F4F8]">
                TradeFlow
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-md bg-[#FAF2E6] dark:bg-[#1C2331] text-[#9B671B] dark:text-[#F3D784] font-semibold border border-[#E7E0D6] dark:border-[#242D3D]">
                Live Execution Journal
              </span>
              {sourceCounts.vantage > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#E8F8EE] dark:bg-[#132A1C] text-[#15803D] dark:text-[#34D399] font-bold border border-[#10B981]/25">
                  ⚡ {sourceCounts.vantage} Vantage Synced
                </span>
              )}
            </div>
            <p className="text-xs text-[#786F66] dark:text-[#94A3B8] font-medium tracking-tight mt-0.5">
              {dbMappedTrades.length} trade{dbMappedTrades.length === 1 ? '' : 's'} taken •{' '}
              {sourceCounts.withChart} with chart screenshot •{' '}
              {sourceCounts.pendingReview > 0 ? `${sourceCounts.pendingReview} pending setup/review` : 'All trades reviewed'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenVantageSync && (
            <button
              type="button"
              onClick={onOpenVantageSync}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#E8F8EE] dark:bg-[#132A1C] hover:bg-[#D1F2DD] dark:hover:bg-[#193B27] text-[#15803D] dark:text-[#34D399] border border-[#10B981]/30 text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Vantage Sync</span>
            </button>
          )}
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
          <div className="mt-2">
            <div className="text-base font-black font-mono leading-none flex items-center gap-1">
              <span className="text-[#10B981]">+{perf.avgWinR.toFixed(1)}R</span>
              <span className="text-[#786F66] dark:text-[#64748B]">/</span>
              <span className="text-[#DC2626]">-{perf.avgLossR.toFixed(1)}R</span>
            </div>
            <div className="text-[10px] font-mono text-[#786F66] dark:text-[#94A3B8] mt-1.5 flex items-center gap-1">
              <span className="text-[#10B981]">+{currSymbol}{perf.avgWinUsd.toFixed(2)}</span>
              <span>/</span>
              <span className="text-[#DC2626]">-{currSymbol}{perf.avgLossUsd.toFixed(2)}</span>
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
            <div className="text-[10px] text-[#786F66] dark:text-[#94A3B8] mt-1 flex items-center justify-between font-mono">
              <span>Ratio</span>
              <span>{currSymbol}{perf.grossProfit.toFixed(1)} / {currSymbol}{perf.grossLoss.toFixed(1)}</span>
            </div>
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
            <div className="text-[10px] font-bold text-[#10B981] mt-1 flex items-center justify-between">
              <span>{perf.cleanTrades}/{perf.total} Clean</span>
              {perf.total - perf.cleanTrades > 0 && (
                <span className="text-[#DC2626] font-normal text-[9px]">{perf.total - perf.cleanTrades} Violations</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filter & Source Toolbar Strip */}
      <div className="flex flex-col gap-2 bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] p-2.5 rounded-2xl shadow-2xs transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Source / Review Quick Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: `All (${dbMappedTrades.length})` },
              { id: 'VANTAGE', label: `⚡ Vantage (${sourceCounts.vantage})` },
              { id: 'MANUAL', label: `Manual (${sourceCounts.manual})` },
              { id: 'NEEDS_REVIEW', label: `Needs Review (${sourceCounts.pendingReview})` },
              { id: 'WITH_CHART', label: `📸 With Chart (${sourceCounts.withChart})` },
            ].map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => {
                  setFilterSource(pill.id);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  filterSource === pill.id
                    ? 'bg-[#DB9F35] text-[#1F1A16] shadow-2xs'
                    : 'bg-[#F2ECE0] dark:bg-[#1C2331] text-[#786F66] dark:text-[#94A3B8] hover:text-[#1F1A16] dark:hover:text-[#F0F4F8]'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Search box + Sort Direction */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8] absolute left-2.5 top-2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search pair, setup, notes..."
                className="pl-8 pr-3 py-1.5 w-44 sm:w-52 bg-[#F2ECE0] dark:bg-[#1C2331] border border-[#DFD5C6] dark:border-[#2E384D] rounded-xl text-xs text-[#1F1A16] dark:text-[#F0F4F8] placeholder:text-[#9E958C] outline-none focus:border-[#DB9F35]"
              />
            </div>

            <button
              type="button"
              onClick={() => setSortAscending((prev) => !prev)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#F2ECE0] dark:bg-[#1C2331] border border-[#DFD5C6] dark:border-[#2E384D] text-[11px] font-bold text-[#1F1A16] dark:text-[#F0F4F8] hover:border-[#DB9F35] cursor-pointer"
              title="Toggle trade sort order"
            >
              <ArrowUpDown className="w-3 h-3 text-[#DB9F35]" />
              <span>{sortAscending ? 'Oldest First' : 'Newest First'}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Dynamic Date range filter */}
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
                <option value="TODAY">Today</option>
                <option value="LAST_7">Last 7 Days</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="LAST_MONTH">Last Month</option>
                {availableMonths.length > 0 && (
                  <optgroup label="Recorded Months">
                    {availableMonths.map((ym) => (
                      <option key={ym} value={`MONTH:${ym}`}>
                        {ym}
                      </option>
                    ))}
                  </optgroup>
                )}
                {selectedDateFilter && (
                  <option value="CUSTOM">Custom Date: {selectedDateFilter}</option>
                )}
              </select>
              <Calendar className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8] absolute left-2.5 top-2.5 pointer-events-none" />
              <ChevronDown className="w-3 h-3 text-[#786F66] dark:text-[#94A3B8] absolute right-2.5 top-2.5 pointer-events-none" />
            </div>

            {/* Session filter */}
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

            {/* Dynamic Pair filter from actual trades taken */}
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
                {availablePairs.map((pairName) => (
                  <option key={pairName} value={pairName.replace('/', '')}>
                    {pairName}
                  </option>
                ))}
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
                <option value="BOREDOM">Boredom</option>
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
                <option value="ALL">All Outcomes</option>
                <option value="TARGET">TARGET</option>
                <option value="Stop Loss">Stop Loss</option>
                <option value="Breakeven">Breakeven</option>
                <option value="MANUAL EXIT">MANUAL EXIT</option>
                <option value="Scalping Trade">Scalping Trade</option>
                <option value="Exit Before Target">Exit Before Target</option>
                <option value="Exit Before SL">Exit Before SL</option>
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
      </div>

      {/* 4. Trade Execution & Journal Table */}
      <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl overflow-hidden shadow-2xs transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
            <thead>
              <tr className="bg-[#F2ECE0] dark:bg-[#1A2230] border-b border-[#E7E0D6] dark:border-[#242D3D] text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider">
                {/* 1. Date & Time / Source */}
                <th className="py-3 px-3 font-bold">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8]" />
                    <span>Date &amp; Time</span>
                  </div>
                </th>

                {/* 2. SR. NO. */}
                <th
                  onClick={() => setSortAscending((prev) => !prev)}
                  className="py-3 px-3 text-center cursor-pointer hover:bg-[#ECE4D5] dark:hover:bg-[#252E40] transition-colors select-none group"
                  title="Click to toggle Newest / Oldest"
                >
                  <div className="flex items-center justify-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8]" />
                    <span>#</span>
                    <span className="text-[9px] font-mono text-[#DB9F35] font-bold">{sortAscending ? '↑' : '↓'}</span>
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
                    <span>Pair</span>
                  </div>
                </th>

                {/* 5. LOT SIZE */}
                <th className="py-3 px-2 font-bold">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8]" />
                    <span>Lots</span>
                  </div>
                </th>

                {/* 6. ORDER */}
                <th className="py-3 px-3 font-bold">
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8]" />
                    <span>Side</span>
                  </div>
                </th>

                {/* 7. Entry -> Exit Execution */}
                <th className="py-3 px-3 font-bold">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8]" />
                    <span>Entry → Exit</span>
                  </div>
                </th>

                {/* 8. Net P/L */}
                <th className="py-3 px-3 font-bold text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8]" />
                    <span>Net P/L</span>
                  </div>
                </th>

                {/* 9. Risk:Reward */}
                <th className="py-3 px-3 font-bold text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <PieChart className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8]" />
                    <span>R:R</span>
                  </div>
                </th>

                {/* 10. PIP CAPTURED */}
                <th className="py-3 px-3 font-bold text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Bookmark className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8]" />
                    <span>Pips</span>
                  </div>
                </th>

                {/* 11. Emotions */}
                <th className="py-3 px-3 font-bold text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Smile className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8]" />
                    <span>Emotion</span>
                  </div>
                </th>

                {/* 12. Outcome */}
                <th className="py-3 px-3 font-bold text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8]" />
                    <span>Outcome</span>
                  </div>
                </th>

                {/* 13. Setup Type */}
                <th className="py-3 px-3 font-bold">
                  <div className="flex items-center gap-1.5">
                    <GitFork className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8]" />
                    <span>Setup</span>
                  </div>
                </th>

                {/* 14. HTF Context */}
                <th className="py-3 px-3 font-bold">
                  <div className="flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8]" />
                    <span>HTF Context</span>
                  </div>
                </th>

                {/* 15. Entry & Exit Review */}
                <th className="py-3 px-3 font-bold">
                  <div className="flex items-center gap-1.5">
                    <LogIn className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8]" />
                    <span>Entry / Exit Reason</span>
                  </div>
                </th>

                {/* 16. Chart Screenshot */}
                <th className="py-3 px-3 font-bold text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8]" />
                    <span>Chart Snap</span>
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
                    {/* 1. Date & Time + Broker Badge */}
                    <td
                      className="py-2.5 px-3 font-medium text-[#1F1A16] dark:text-[#F0F4F8]"
                      title={
                        t.openTimeRaw && t.closeTimeRaw
                          ? `Open: ${t.openTimeRaw} → Close: ${t.closeTimeRaw} (Broker Clock)`
                          : `${t.rawDate} ${t.time}`
                      }
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{t.dateFormatted}</span>
                        <span className="text-[10px] font-mono text-[#786F66] dark:text-[#94A3B8]">{t.time}</span>
                        {(t.brokerSource || t.brokerTicketId) && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#E8F8EE] dark:bg-[#132A1C] text-[#15803D] dark:text-[#34D399] text-[9px] font-bold border border-[#10B981]/25"
                            title={t.brokerTicketId ? `Ticket: ${t.brokerTicketId}` : 'Vantage Web-Trade Synced'}
                          >
                            ⚡ Vantage
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 2. SR. NO. */}
                    <td className="py-2.5 px-3 text-center font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                      <div className="inline-flex items-center gap-1 text-xs font-semibold">
                        <FileText className="w-3 h-3 text-[#9E958C]" />
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

                    {/* 7. Entry -> Exit */}
                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      {t.entryPrice != null && t.exitPrice != null ? (
                        <div className="flex items-center gap-1 text-[#1F1A16] dark:text-[#E2E8F0]">
                          <span>{t.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 5 })}</span>
                          <span className="text-[#9E958C]">→</span>
                          <span className="font-semibold">{t.exitPrice.toLocaleString(undefined, { maximumFractionDigits: 5 })}</span>
                        </div>
                      ) : t.entryPrice != null ? (
                        <div className="text-[#4B5563] dark:text-[#CBD5E1]">
                          <span>@{t.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 5 })}</span>
                          {(t.slPrice != null || t.tpPrice != null) && (
                            <span className="text-[10px] text-[#9E958C] ml-1.5">
                              {t.slPrice != null ? `SL ${t.slPrice}` : ''}
                              {t.slPrice != null && t.tpPrice != null ? ' · ' : ''}
                              {t.tpPrice != null ? `TP ${t.tpPrice}` : ''}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#9E958C]">—</span>
                      )}
                    </td>

                    {/* 8. Net P/L */}
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex flex-col items-end">
                        <div className="inline-flex items-center justify-end gap-1.5 font-mono font-bold text-xs">
                          <span className={t.pnlNum >= 0 ? 'text-[#15803D] dark:text-[#4ADE80]' : 'text-[#DC2626] dark:text-[#F87171]'}>
                            {t.pnlNum > 0 ? `+${t.pnl}` : t.pnl}
                          </span>
                          {t.pnlNum > 0 ? (
                            <span className="w-3 h-3 rounded-full border-2 border-[#10B981] inline-block shrink-0" title="Win" />
                          ) : t.pnlNum < 0 ? (
                            <span className="w-3 h-3 rounded-full border-2 border-[#EF4444] inline-block shrink-0" title="Loss" />
                          ) : (
                            <span className="w-3 h-3 rounded-full border-2 border-[#9CA3AF] inline-block shrink-0" title="Breakeven" />
                          )}
                        </div>
                        {t.chargesSwap && t.chargesSwap !== '0.00/0.00' && (
                          <span className="text-[9px] font-mono text-[#786F66] dark:text-[#94A3B8]">
                            Chg/Swp: {t.chargesSwap}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 9. Risk:Reward */}
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-[#E6F4EA] dark:bg-[#1E3326] text-[#137333] dark:text-[#86EFAC]">
                        {t.riskReward}
                      </span>
                    </td>

                    {/* 10. PIP CAPTURED */}
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-xs">
                      <span className={t.pips > 0 ? 'text-[#15803D] dark:text-[#4ADE80]' : t.pips < 0 ? 'text-[#DC2626] dark:text-[#F87171]' : 'text-[#786F66] dark:text-[#94A3B8]'}>
                        {t.pips > 0 ? `+${t.pips}` : t.pips}
                      </span>
                    </td>

                    {/* 11. Emotions */}
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-[#E0EFFE] dark:bg-[#1A3152] text-[#1D4ED8] dark:text-[#93C5FD]">
                        {t.emotion}
                      </span>
                    </td>

                    {/* 12. Outcome */}
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

                    {/* 13. Setup Type */}
                    <td
                      className="py-2.5 px-3 text-[11px] font-medium cursor-pointer hover:text-[#DB9F35]"
                      onClick={() => t.rawTrade && openQuickReviewModal(t.rawTrade)}
                      title="Click to tag setup & review trade"
                    >
                      {t.setupType ? (
                        <span className="text-[#1F1A16] dark:text-[#F0F4F8]">{t.setupType}</span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded bg-[#FAF2E6] dark:bg-[#1C2331] text-[#9B671B] dark:text-[#F3D784] text-[10px] font-semibold border border-dashed border-[#DB9F35]/40">
                          + Tag Setup
                        </span>
                      )}
                    </td>

                    {/* 14. HTF Context */}
                    <td
                      className="py-2.5 px-3 max-w-[180px] truncate text-[11px] text-[#4B5563] dark:text-[#D1D5DB] cursor-pointer hover:text-[#DB9F35]"
                      title={t.htfContext || 'Click to set HTF context'}
                      onClick={() => t.rawTrade && openQuickReviewModal(t.rawTrade)}
                    >
                      {t.htfContext || <span className="text-[#9E958C]">—</span>}
                    </td>

                    {/* 15. Entry & Exit Reason */}
                    <td
                      className="py-2.5 px-3 max-w-[230px] truncate text-[11px] text-[#4B5563] dark:text-[#D1D5DB] cursor-pointer hover:text-[#DB9F35] transition-colors"
                      title={
                        [t.entryReason ? `Entry: ${t.entryReason}` : '', t.exitReason ? `Exit: ${t.exitReason}` : '']
                          .filter(Boolean)
                          .join(' | ') || 'Click to add entry & exit review'
                      }
                      onClick={() => t.rawTrade && openQuickReviewModal(t.rawTrade)}
                    >
                      {t.entryReason || t.exitReason ? (
                        <span>
                          {t.entryReason && t.exitReason
                            ? `${t.entryReason} → ${t.exitReason}`
                            : t.exitReason || t.entryReason}
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#9E958C] italic">+ Add review</span>
                      )}
                    </td>

                    {/* 16. Chart Screenshot */}
                    <td className="py-2.5 px-3 text-center">
                      {t.chart ? (
                        <div
                          onClick={() => onViewImage(t.chart!, `Trade #${t.num} (${t.pair}) Screenshot`)}
                          className="relative group w-11 h-7 rounded-md border border-[#DFD5C6] dark:border-[#2E384D] overflow-hidden mx-auto cursor-pointer hover:border-[#DB9F35] shadow-2xs hover:scale-105 transition-all bg-[#121214]"
                          title="Click to zoom chart screenshot"
                        >
                          <img
                            src={t.chart}
                            alt={`Trade #${t.num} chart`}
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
                            if (t.rawTrade) {
                              setScreenshotModalTrade(t.rawTrade);
                              setPendingScreenshot('');
                              setScreenshotError(null);
                            }
                          }}
                          className="px-2 py-0.5 rounded-md text-[10px] font-medium text-[#9E958C] hover:text-[#DB9F35] border border-dashed border-[#DFD5C6] dark:border-[#2E384D] transition-colors cursor-pointer inline-flex items-center gap-1"
                          title="Paste (Ctrl+V) or upload chart screenshot"
                        >
                          <Camera className="w-3 h-3" />
                          <span>+ Snap</span>
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
                          className="absolute right-2 top-8 z-30 w-44 bg-white dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-xl shadow-lg py-1 text-left animate-fade-in"
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
                            <span>Edit Full Trade</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              if (t.rawTrade) openQuickReviewModal(t.rawTrade);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#1F1A16] dark:text-[#F0F4F8] hover:bg-[#FAF6EE] dark:hover:bg-[#1C2331] transition-colors cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-[#10B981]" />
                            <span>Quick Review / Setup</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              if (t.rawTrade) {
                                setScreenshotModalTrade(t.rawTrade);
                                setPendingScreenshot(t.rawTrade.chartScreenshot || '');
                                setScreenshotError(null);
                              }
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#1F1A16] dark:text-[#F0F4F8] hover:bg-[#FAF6EE] dark:hover:bg-[#1C2331] transition-colors cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5 text-[#0284C7]" />
                            <span>{t.chart ? 'Replace Screenshot' : 'Attach Screenshot'}</span>
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

              {/* Table Summary Footer Row */}
              <tr className="bg-[#F2ECE0]/80 dark:bg-[#1A2230]/80 font-mono text-[11px] font-bold text-[#786F66] dark:text-[#94A3B8] border-t border-[#E7E0D6] dark:border-[#242D3D]">
                <td className="py-2.5 px-3">TOTALS</td>
                <td className="py-2.5 px-3 text-center">
                  {sortedList.length}
                </td>
                <td className="py-2.5 px-3"></td>
                <td className="py-2.5 px-3"></td>
                <td className="py-2.5 px-2 text-[#1F1A16] dark:text-[#F0F4F8]">
                  {totalLotsSum.toFixed(2)}
                </td>
                <td className="py-2.5 px-3"></td>
                <td className="py-2.5 px-3"></td>
                {/* P/L Column Sum */}
                <td className="py-2.5 px-3 text-right">
                  <span className={`font-mono text-xs font-black ${totalPnlSum >= 0 ? 'text-[#15803D] dark:text-[#4ADE80]' : 'text-[#DC2626] dark:text-[#F87171]'}`}>
                    {totalPnlSum >= 0 ? `+${currSymbol}${totalPnlSum.toFixed(2)}` : `-${currSymbol}${Math.abs(totalPnlSum).toFixed(2)}`}
                  </span>
                </td>
                <td className="py-2.5 px-3"></td>
                {/* PIP CAPTURED Column Sum */}
                <td className="py-2.5 px-3 text-center">
                  <span className={`font-mono text-xs font-black ${totalPipsSum >= 0 ? 'text-[#15803D] dark:text-[#4ADE80]' : 'text-[#DC2626] dark:text-[#F87171]'}`}>
                    {totalPipsSum > 0 ? `+${totalPipsSum.toLocaleString()}` : totalPipsSum.toLocaleString()}
                  </span>
                </td>
                <td colSpan={7} className="py-2.5 px-3"></td>
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
              Net captured:{' '}
              <span className={`font-bold ${totalPnlSum >= 0 ? 'text-[#15803D] dark:text-[#4ADE80]' : 'text-[#DC2626] dark:text-[#F87171]'}`}>
                {totalPnlSum >= 0 ? `+${currSymbol}${totalPnlSum.toFixed(2)}` : `-${currSymbol}${Math.abs(totalPnlSum).toFixed(2)}`}
              </span>{' '}
              across {totalTradesCount} trade{totalTradesCount === 1 ? '' : 's'} ({totalLotsSum.toFixed(2)} lots).
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
              <span className={`text-xs font-black font-mono mt-0.5 block ${totalPipsSum >= 0 ? 'text-[#15803D] dark:text-[#4ADE80]' : 'text-[#DC2626] dark:text-[#F87171]'}`}>
                {totalPipsSum > 0 ? `+${totalPipsSum}` : totalPipsSum}
              </span>
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
              <span className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8] mt-0.5 block">{primaryEmotion}</span>
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
                  Permanently delete this <strong className="text-[#1F1A16] dark:text-white">{tradeToDelete.pair} {tradeToDelete.order}</strong> trade ({tradeToDelete.pnl >= 0 ? `+${currSymbol}` : `-${currSymbol}`}{Math.abs(tradeToDelete.pnl).toFixed(2)}) from your journal?
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

      {/* 8. Quick Review, Setup & Reasons Editor Modal */}
      {noteModalTrade && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => !isSavingNote && setNoteModalTrade(null)}
        >
          <div
            className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#E7E0D6] dark:border-[#242D3D]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                    Review Trade #{noteModalTrade.tradeNumber || noteModalTrade.id}
                  </h3>
                  <p className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">
                    {noteModalTrade.pair} • {noteModalTrade.order} • {noteModalTrade.date} {noteModalTrade.time}
                    {noteModalTrade.entryPrice != null && noteModalTrade.exitPrice != null
                      ? ` • ${noteModalTrade.entryPrice} → ${noteModalTrade.exitPrice}`
                      : ''}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8] mb-1">
                    Setup Type
                  </label>
                  <input
                    type="text"
                    value={setupTypeText}
                    onChange={(e) => setSetupTypeText(e.target.value)}
                    placeholder="e.g. Liquidity Sweep, MSS + FVG"
                    className="w-full px-3 py-2 bg-white dark:bg-[#0B0E14] border border-[#E7E0D6] dark:border-[#242D3D] rounded-xl text-xs text-[#1F1A16] dark:text-[#F0F4F8] focus:border-[#DB9F35] outline-none transition-colors placeholder:text-[#9E958C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8] mb-1">
                    Emotion
                  </label>
                  <select
                    value={reviewEmotion}
                    onChange={(e) => setReviewEmotion(e.target.value as EmotionType)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#0B0E14] border border-[#E7E0D6] dark:border-[#242D3D] rounded-xl text-xs text-[#1F1A16] dark:text-[#F0F4F8] focus:border-[#DB9F35] outline-none transition-colors"
                  >
                    <option value="FOCUSED">FOCUSED</option>
                    <option value="CALM">CALM</option>
                    <option value="FOMO">FOMO</option>
                    <option value="REVENGE">REVENGE</option>
                    <option value="GREED">GREED</option>
                    <option value="HESITANT">HESITANT</option>
                    <option value="BOREDOM">BOREDOM</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8] mb-1">
                    HTF Context
                  </label>
                  <input
                    type="text"
                    value={htfContextText}
                    onChange={(e) => setHtfContextText(e.target.value)}
                    placeholder="e.g. Bearish 4H, 15m Pullback"
                    className="w-full px-3 py-2 bg-white dark:bg-[#0B0E14] border border-[#E7E0D6] dark:border-[#242D3D] rounded-xl text-xs text-[#1F1A16] dark:text-[#F0F4F8] focus:border-[#DB9F35] outline-none transition-colors placeholder:text-[#9E958C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8] mb-1">
                    Trade Outcome
                  </label>
                  <select
                    value={reviewOutcome}
                    onChange={(e) => setReviewOutcome(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#0B0E14] border border-[#E7E0D6] dark:border-[#242D3D] rounded-xl text-xs text-[#1F1A16] dark:text-[#F0F4F8] focus:border-[#DB9F35] outline-none transition-colors"
                  >
                    <option value="TARGET">TARGET</option>
                    <option value="Stop Loss">Stop Loss</option>
                    <option value="Breakeven">Breakeven</option>
                    <option value="MANUAL EXIT">MANUAL EXIT</option>
                    <option value="Scalping Trade">Scalping Trade</option>
                    <option value="Exit Before Target">Exit Before Target</option>
                    <option value="Exit Before SL">Exit Before SL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8] mb-1">
                  Entry Reason
                </label>
                <textarea
                  rows={2}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="e.g. Entry on London session liquidity sweep + 5m MSS"
                  className="w-full px-3 py-2 bg-white dark:bg-[#0B0E14] border border-[#E7E0D6] dark:border-[#242D3D] rounded-xl text-xs text-[#1F1A16] dark:text-[#F0F4F8] focus:border-[#DB9F35] outline-none transition-colors resize-y placeholder:text-[#9E958C]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8] mb-1">
                  Exit Reason / Lesson
                </label>
                <input
                  type="text"
                  value={exitReasonText}
                  onChange={(e) => setExitReasonText(e.target.value)}
                  placeholder="e.g. Closed at HTF resistance / SL hit cleanly"
                  className="w-full px-3 py-2 bg-white dark:bg-[#0B0E14] border border-[#E7E0D6] dark:border-[#242D3D] rounded-xl text-xs text-[#1F1A16] dark:text-[#F0F4F8] focus:border-[#DB9F35] outline-none transition-colors placeholder:text-[#9E958C]"
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
                    const setupTrim = setupTypeText.trim();
                    const htfTrim = htfContextText.trim();
                    const isViolationEmotion = reviewEmotion === 'FOMO' || reviewEmotion === 'REVENGE';
                    const uuid = (noteModalTrade as Trade & { _uuid?: string })._uuid || String(noteModalTrade.id);
                    await onUpdateTrade?.(uuid, {
                      setupType: setupTrim,
                      htfContext: htfTrim,
                      emotion: reviewEmotion,
                      execution: isViolationEmotion ? 'VIOLATION' : noteModalTrade.execution,
                      tradeSuccessRate: reviewOutcome,
                      exitReason: exitTrim,
                      notes: exitTrim,
                      entryReason: entryTrim,
                    });
                  } finally {
                    setIsSavingNote(false);
                    setNoteModalTrade(null);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#10B981] hover:bg-[#059669] transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSavingNote ? 'Saving...' : 'Save Review'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Quick Chart Screenshot Paste / Upload Modal */}
      {screenshotModalTrade && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => !isSavingScreenshot && setScreenshotModalTrade(null)}
        >
          <div
            className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#E7E0D6] dark:border-[#242D3D]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#E0F2FE] dark:bg-[#1A2E46] text-[#0284C7] flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                    Attach Chart Screenshot — Trade #{screenshotModalTrade.tradeNumber || screenshotModalTrade.id}
                  </h3>
                  <p className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">
                    {screenshotModalTrade.pair} • {screenshotModalTrade.order} • Press{' '}
                    <kbd className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono">Ctrl+V</kbd> to paste directly
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isSavingScreenshot}
                onClick={() => setScreenshotModalTrade(null)}
                className="p-1 rounded-lg text-[#786F66] hover:text-[#1F1A16] dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              ref={screenshotInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) compressScreenshotFile(file);
              }}
            />

            {pendingScreenshot ? (
              <div className="relative rounded-xl overflow-hidden border border-[#E7E0D6] dark:border-[#242D3D] bg-[#0B0E14]">
                <img
                  src={pendingScreenshot}
                  alt="Preview chart screenshot"
                  className="max-h-72 w-full object-contain mx-auto"
                />
                <button
                  type="button"
                  onClick={() => setPendingScreenshot('')}
                  className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-black/75 text-white text-[11px] font-semibold hover:bg-black cursor-pointer"
                >
                  Change Image
                </button>
              </div>
            ) : (
              <div
                onClick={() => screenshotInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) compressScreenshotFile(file);
                }}
                className="border-2 border-dashed border-[#DFD5C6] dark:border-[#2E384D] hover:border-[#DB9F35] rounded-2xl p-8 text-center cursor-pointer transition-colors bg-[#F2ECE0]/40 dark:bg-[#0F141D]"
              >
                <Upload className="w-8 h-8 text-[#DB9F35] mx-auto mb-2" />
                <p className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                  Press <span className="text-[#DB9F35]">Ctrl + V</span> to paste chart, or click to browse
                </p>
                <p className="text-[11px] text-[#786F66] dark:text-[#94A3B8] mt-1">
                  Supports PNG, JPG, WebP (or use Chrome Extension "Snap Chart" directly on Vantage)
                </p>
              </div>
            )}

            {screenshotError && (
              <p className="text-xs text-[#DC2626] font-medium">{screenshotError}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E7E0D6] dark:border-[#242D3D]">
              <button
                type="button"
                disabled={isSavingScreenshot}
                onClick={() => setScreenshotModalTrade(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#786F66] hover:text-[#1F1A16] dark:text-[#94A3B8] dark:hover:text-white bg-[#F2ECE0] dark:bg-[#1C2331] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!pendingScreenshot || isSavingScreenshot}
                onClick={async () => {
                  if (!pendingScreenshot || !screenshotModalTrade) return;
                  setIsSavingScreenshot(true);
                  setScreenshotError(null);
                  try {
                    const uuid = (screenshotModalTrade as Trade & { _uuid?: string })._uuid || String(screenshotModalTrade.id);
                    let finalUrl = pendingScreenshot;
                    if (pendingScreenshot.startsWith('data:')) {
                      try {
                        const { data: sessData } = await supabase.auth.getSession();
                        const uid = sessData?.session?.user?.id;
                        if (uid) {
                          finalUrl = await storageApi.uploadScreenshot(uid, `manual_${uuid}_${Date.now()}`, pendingScreenshot);
                        }
                      } catch (_) {
                        // Graceful fallback to compressed data URL
                      }
                    }
                    await onUpdateTrade?.(uuid, { chartScreenshot: finalUrl });
                    setScreenshotModalTrade(null);
                  } catch (err: unknown) {
                    setScreenshotError(err instanceof Error ? err.message : 'Failed to save screenshot');
                  } finally {
                    setIsSavingScreenshot(false);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#10B981] hover:bg-[#059669] transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSavingScreenshot ? 'Saving...' : 'Save Screenshot'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

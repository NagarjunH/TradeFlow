import React, { useState, useMemo } from 'react';
import { 
  Quote, 
  Lock, 
  RotateCcw, 
  X, 
  Calendar as CalendarIcon, 
  Check, 
  Plus,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import type { Trade, DayRecord, AppSettings } from '../db/db';
import { calculatePerformance, calculateDiscipline } from '../utils/TradingEngine';
import { dailyApi } from '../lib/api/dailyApi';

interface NHCycleViewProps {
  trades: Trade[];
  days: DayRecord[];
  settings: AppSettings;
  onSelectDayForJournal: (dateStr: string) => void;
  userId?: string;
  onDaysChange?: (updatedDays: DayRecord[]) => void;
  onOpenQuickTradeForDate?: (dateStr: string) => void;
}

export const NHCycleView: React.FC<NHCycleViewProps> = ({
  trades,
  days,
  settings,
  onSelectDayForJournal,
  userId,
  onDaysChange,
  onOpenQuickTradeForDate,
}) => {
  const [cycleYear, setCycleYear] = useState<number>(() => {
    if (trades.length > 0) {
      const dates = trades.map(t => t.date).sort();
      return new Date(dates[dates.length - 1]).getFullYear();
    }
    return 2026;
  });

  const [cycleMonth, setCycleMonth] = useState<number>(() => {
    if (trades.length > 0) {
      const dates = trades.map(t => t.date).sort();
      return new Date(dates[dates.length - 1]).getMonth() + 1;
    }
    return 10;
  });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Selected day for the action dialog / modal
  const [selectedDayModal, setSelectedDayModal] = useState<{
    dateStr: string;
    dayNum: number;
    dayOfWeekName: string;
    isWeekend: boolean;
    isNoTrade: boolean;
    currentReason?: string;
  } | null>(null);

  const [modalReason, setModalReason] = useState<DayRecord['noTradeReason']>('No Setup');

  const currSymbol = settings.currency === 'USD' ? '$' : '₹';
  const initialCap = settings.initialCapital > 0 ? settings.initialCapital : 1000;

  // Filter trades for the selected cycle month & year
  const currentMonthStr = `${cycleYear}-${String(cycleMonth).padStart(2, '0')}`;
  const daysInSelectedMonth = new Date(cycleYear, cycleMonth, 0).getDate();

  const cycleTrades = useMemo(() => {
    return trades.filter((t) => {
      const [y, m] = t.date.split('-').map(Number);
      return y === cycleYear && m === cycleMonth;
    });
  }, [trades, cycleYear, cycleMonth]);

  const perf = calculatePerformance(cycleTrades, settings);
  const disc = calculateDiscipline(cycleTrades);

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (cycleMonth === 1) {
      setCycleMonth(12);
      setCycleYear(prev => prev - 1);
    } else {
      setCycleMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (cycleMonth === 12) {
      setCycleMonth(1);
      setCycleYear(prev => prev + 1);
    } else {
      setCycleMonth(prev => prev + 1);
    }
  };

  const handleGoToToday = () => {
    const now = new Date();
    setCycleYear(now.getFullYear());
    setCycleMonth(now.getMonth() + 1);
  };

  // Toggle or set a day as No Trade Day / Skipped
  const handleToggleSkipDay = async (dateStr: string, reason: DayRecord['noTradeReason'] = 'No Setup', targetState?: boolean) => {
    const existing = days.find((d) => d.date === dateStr);
    const dayNum = parseInt(dateStr.split('-')[2], 10);
    const newIsNoTrade = targetState !== undefined ? targetState : !existing?.isNoTradeDay;

    const updatedRecord: DayRecord = {
      date: dateStr,
      cycleDay: dayNum,
      isNoTradeDay: newIsNoTrade,
      noTradeReason: newIsNoTrade ? reason : undefined,
      rules: existing?.rules || {
        riskManagement: true,
        dailyLossLimit: true,
        slPredefined: true,
        noAveragingDown: true,
        htfContextClear: true,
        smcSequenceFollowed: true,
        noEmotionalTrade: true,
        newsChecked: true,
      },
      isDayClosed: newIsNoTrade,
      updatedAt: new Date().toISOString(),
    };

    const updatedDays = days.some((d) => d.date === dateStr)
      ? days.map((d) => (d.date === dateStr ? updatedRecord : d))
      : [...days, updatedRecord];

    onDaysChange?.(updatedDays);

    if (userId) {
      try {
        await dailyApi.upsert(updatedRecord, userId);
      } catch (err) {
        console.error('Failed to sync skip day:', err);
      }
    }
  };

  // Institutional Monthly Trading Calendar with Weekly P&L Data
  const calendarWeeksData = useMemo(() => {
    // Sunday is 0, matching standard TradeZella / TraderSync calendars
    const firstDayOfWeek = new Date(cycleYear, cycleMonth - 1, 1).getDay();
    const offset = firstDayOfWeek; // 0 = Sun, 1 = Mon...

    interface DaySlot {
      day?: number;
      dateStr?: string;
      isWeekend?: boolean;
      dayTrades?: Trade[];
      dayPnl?: number;
      dayR?: number;
      hasTrades?: boolean;
      isWin?: boolean;
      isLoss?: boolean;
      isBE?: boolean;
      isNoTrade?: boolean;
      dayRecord?: DayRecord;
      allClean?: boolean;
      hasViolation?: boolean;
      statusBadge?: string;
      dayOfWeekName?: string;
    }

    const daysList: DaySlot[] = [];

    // Pad prefix empty slots
    for (let i = 0; i < offset; i++) {
      daysList.push({});
    }

    for (let d = 1; d <= daysInSelectedMonth; d++) {
      const dateStr = `${currentMonthStr}-${String(d).padStart(2, '0')}`;
      const dayTrades = trades.filter((t) => t.date === dateStr);
      const dayRecord = days.find((dr) => dr.date === dateStr);

      const dateObj = new Date(cycleYear, cycleMonth - 1, d);
      const dayOfWeekIndex = dateObj.getDay();
      const isWeekend = dayOfWeekIndex === 0 || dayOfWeekIndex === 6;
      const dayOfWeekName = dateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();

      let dayPnl = 0;
      let dayR = 0;
      let allClean = true;
      let hasViolation = false;

      dayTrades.forEach((t) => {
        dayPnl += (t.pnl || 0);
        dayR += (t.rMultiple || 0);
        if (t.execution === 'VIOLATION') {
          hasViolation = true;
          allClean = false;
        }
      });

      const hasTrades = dayTrades.length > 0;
      const isNoTrade = !hasTrades && !isWeekend && Boolean(dayRecord?.isNoTradeDay);
      const isWin = hasTrades && dayPnl > 0.001;
      const isLoss = hasTrades && dayPnl < -0.001;
      const isBE = hasTrades && Math.abs(dayPnl) <= 0.001;

      let statusBadge = '';
      if (hasTrades) {
        if (dayR > 0.05 && allClean) statusBadge = '🟢 CLEAN';
        else if (dayR < -0.05 && hasViolation) statusBadge = '🔴 VIOLATION';
        else if (dayR < -0.05 && allClean) statusBadge = '🔵 CLEAN LOSS';
        else statusBadge = '🟡 BE';
      } else if (isWeekend) {
        statusBadge = '🔒 BLOCKED';
      } else if (isNoTrade) {
        statusBadge = '⚪ NO TRADE';
      }

      daysList.push({
        day: d,
        dateStr,
        isWeekend,
        dayTrades,
        dayPnl,
        dayR,
        hasTrades,
        isWin,
        isLoss,
        isBE,
        isNoTrade,
        dayRecord,
        allClean,
        hasViolation,
        statusBadge,
        dayOfWeekName,
      });
    }

    // Pad end of list to complete the last week row
    while (daysList.length % 7 !== 0) {
      daysList.push({});
    }

    // Group days into 7-day calendar weeks
    const weeks: {
      weekIndex: number;
      days: DaySlot[];
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

      weekDays.forEach((d) => {
        if (d.hasTrades && d.dayTrades) {
          pnl += d.dayPnl || 0;
          tradeCount += d.dayTrades.length;
          d.dayTrades.forEach((t) => {
            if ((t.pnl || 0) > 0.001) wins += 1;
            else if ((t.pnl || 0) < -0.001) losses += 1;
            else be += 1;
          });
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

    const maxWeeklyAbsPnl = Math.max(1, ...weeks.map((w) => Math.abs(w.pnl)));

    // Calculate current winning streak for the month
    let streak = 0;
    const sortedTradingDays = daysList
      .filter((d) => d.hasTrades)
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
    const monthTradesCount = cycleTrades.length;
    const monthPnl = cycleTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const monthReturnPct = initialCap > 0 ? (monthPnl / initialCap) * 100 : 0;
    const monthWins = cycleTrades.filter((t) => (t.pnl || 0) > 0.001).length;
    const monthLosses = cycleTrades.filter((t) => (t.pnl || 0) < -0.001).length;
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
  }, [cycleYear, cycleMonth, currentMonthStr, daysInSelectedMonth, trades, days, cycleTrades, initialCap]);

  // Summary counts for this cycle
  const tradingDaysCount = Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).filter((dayNum) => {
    const dStr = `${currentMonthStr}-${String(dayNum).padStart(2, '0')}`;
    return trades.some((t) => t.date === dStr);
  }).length;

  const noTradeDaysCount = Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).filter((dayNum) => {
    const dStr = `${currentMonthStr}-${String(dayNum).padStart(2, '0')}`;
    const dRec = days.find((d) => d.date === dStr);
    const dObj = new Date(cycleYear, cycleMonth - 1, dayNum);
    const isWk = dObj.getDay() === 0 || dObj.getDay() === 6;
    return !trades.some((t) => t.date === dStr) && !isWk && dRec?.isNoTradeDay;
  }).length;

  const weekendDaysCount = Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).filter((dayNum) => {
    const dObj = new Date(cycleYear, cycleMonth - 1, dayNum);
    return dObj.getDay() === 0 || dObj.getDay() === 6;
  }).length;

  return (
    <div className="space-y-6 animate-fade-in pb-16 text-[#1F1A16] dark:text-[#F0F4F8]">
      {/* 1. Main Institutional Calendar Container (TradeZella Style matching Image 2 & 4) */}
      <div className="w-full bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xs transition-colors space-y-4">
        
        {/* Top Header: Title, Navigation (< Today >), and Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center shadow-2xs shrink-0">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-[#1F1A16] dark:text-[#F0F4F8] leading-tight tracking-tight">
                31-Day Trading Cycle
              </h2>
              <p className="text-xs text-[#786F66] dark:text-[#94A3B8] mt-0.5">
                Overview of your daily trades, discipline cycle, and journal entries.
              </p>
            </div>
          </div>

          {/* Month & Year Navigation Controls */}
          <div className="flex items-center flex-wrap gap-2">
            <div className="flex items-center bg-white dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] rounded-xl p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg text-[#786F66] hover:text-[#1F1A16] dark:text-[#94A3B8] dark:hover:text-white hover:bg-[#F2ECE0] dark:hover:bg-[#242D3D] transition-colors cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleGoToToday}
                className="px-2.5 py-1 text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8] hover:text-[#DB9F35] transition-colors cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg text-[#786F66] hover:text-[#1F1A16] dark:text-[#94A3B8] dark:hover:text-white hover:bg-[#F2ECE0] dark:hover:bg-[#242D3D] transition-colors cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Month Dropdown */}
            <select
              value={cycleMonth}
              onChange={(e) => setCycleMonth(Number(e.target.value))}
              className="bg-white dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] rounded-xl px-3 py-1.5 text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8] focus:border-[#DB9F35] outline-none cursor-pointer shadow-2xs transition-colors"
            >
              {monthNames.map((name, i) => (
                <option key={name} value={i + 1} className="bg-white dark:bg-[#1A2230] text-[#1F1A16] dark:text-[#F0F4F8]">
                  {name}
                </option>
              ))}
            </select>

            {/* Year Dropdown */}
            <select
              value={cycleYear}
              onChange={(e) => setCycleYear(Number(e.target.value))}
              className="bg-white dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] rounded-xl px-3 py-1.5 text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8] focus:border-[#DB9F35] outline-none cursor-pointer shadow-2xs transition-colors"
            >
              {[2024, 2025, 2026, 2027].map((yr) => (
                <option key={yr} value={yr} className="bg-white dark:bg-[#1A2230] text-[#1F1A16] dark:text-[#F0F4F8]">
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Winning Streak Indicator Strip & Month Summary Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3 sm:px-4 py-2.5 rounded-xl bg-[#FAF2E6]/60 dark:bg-[#1A2230]/70 border border-[#E8DCC8] dark:border-[#242D3D] text-xs">
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
            {monthNames[cycleMonth - 1]} {cycleYear} • {calendarWeeksData.monthTradesCount} trades • {currSymbol}{calendarWeeksData.monthPnl.toFixed(2)} • ↗ {calendarWeeksData.monthReturnPct >= 0 ? '+' : ''}{calendarWeeksData.monthReturnPct.toFixed(1)}% • {calendarWeeksData.monthWR}% WR
          </div>
        </div>

        {/* 2-Column Institutional Calendar Grid: Calendar (Left) + Weekly PNL (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 pt-1">
          {/* Left Column: 7 Days Columns */}
          <div className="lg:col-span-9 xl:col-span-10 flex flex-col justify-between">
            {/* 7-Col Days Header: SUN, MON, TUE, WED, THU, FRI, SAT */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center pb-2 text-[10px] sm:text-xs font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider border-b border-[#E7E0D6]/40 dark:border-[#242D3D]">
              <div>SUN</div>
              <div>MON</div>
              <div>TUE</div>
              <div>WED</div>
              <div>THU</div>
              <div>FRI</div>
              <div>SAT</div>
            </div>

            {/* Weeks Container */}
            <div className="space-y-1 sm:space-y-2 pt-2">
              {calendarWeeksData.weeks.map((week, wIdx) => (
                <div key={`wrow-${wIdx}`} className="grid grid-cols-7 gap-1 sm:gap-2">
                  {week.days.map((c, dIdx) => {
                    if (!c.day) {
                      return (
                        <div
                          key={`empty-${wIdx}-${dIdx}`}
                          className="min-h-[58px] sm:min-h-[92px] rounded-lg sm:rounded-xl bg-transparent border border-dashed border-[#E7E0D6]/40 dark:border-[#1E2533]/40 opacity-30"
                        />
                      );
                    }

                    const hasTrades = Boolean(c.hasTrades);
                    const isWeekend = Boolean(c.isWeekend);
                    const isNoTrade = Boolean(c.isNoTrade);
                    const isWin = Boolean(c.isWin);
                    const isLoss = Boolean(c.isLoss);
                    const dayTrades = c.dayTrades || [];

                    // Theme-aligned styling
                    let tileBg = 'bg-white dark:bg-[#151C28]/60 border-[#E7E0D6] dark:border-[#242D3D] text-[#786F66] dark:text-[#94A3B8]';
                    let pnlColor = 'text-[#786F66] dark:text-[#94A3B8]';
                    let dayNumColor = 'text-[#786F66] dark:text-[#94A3B8]';
                    let tradesColor = 'text-[#786F66] dark:text-[#94A3B8]';

                    if (hasTrades) {
                      if (isWin) {
                        tileBg = 'bg-[#E8F8EE] dark:bg-[#0D281E] border-[#B7ECC8] dark:border-[#10B981]/40 shadow-2xs hover:border-[#10B981]';
                        pnlColor = 'text-[#15803D] dark:text-[#34D399]';
                        dayNumColor = 'text-[#15803D] dark:text-white/80';
                        tradesColor = 'text-[#15803D]/80 dark:text-[#94A3B8]';
                      } else if (isLoss) {
                        tileBg = 'bg-[#FEECEB] dark:bg-[#2A1316] border-[#FBC5C2] dark:border-[#EF4444]/40 shadow-2xs hover:border-[#EF4444]';
                        pnlColor = 'text-[#DC2626] dark:text-[#F87171]';
                        dayNumColor = 'text-[#DC2626] dark:text-white/80';
                        tradesColor = 'text-[#DC2626]/80 dark:text-[#94A3B8]';
                      } else {
                        tileBg = 'bg-[#FFFBEB] dark:bg-[#252013] border-[#FDE68A] dark:border-[#F59E0B]/40 shadow-2xs hover:border-[#F59E0B]';
                        pnlColor = 'text-[#D97706] dark:text-[#FBBF24]';
                        dayNumColor = 'text-[#D97706] dark:text-white/80';
                        tradesColor = 'text-[#D97706]/80 dark:text-[#94A3B8]';
                      }
                    } else if (isWeekend) {
                      tileBg = 'bg-[#F2ECE1]/60 dark:bg-[#0D121B] border-[#DFD5C6] dark:border-[#1F2738] opacity-75';
                    } else if (isNoTrade) {
                      tileBg = 'bg-[#F3F4F6] dark:bg-[#151C28] border-[#D1D5DB] dark:border-[#2E384D]';
                    }

                    return (
                      <div
                        key={`day-${c.day}`}
                        onClick={() => {
                          if (hasTrades && c.dateStr) {
                            onSelectDayForJournal(c.dateStr);
                          } else if (!isWeekend && c.dateStr) {
                            setSelectedDayModal({
                              dateStr: c.dateStr,
                              dayNum: c.day!,
                              dayOfWeekName: c.dayOfWeekName || '',
                              isWeekend: false,
                              isNoTrade,
                              currentReason: c.dayRecord?.noTradeReason,
                            });
                            setModalReason(c.dayRecord?.noTradeReason || 'No Setup');
                          }
                        }}
                        className={`relative rounded-lg sm:rounded-xl border p-1 sm:p-2.5 flex flex-col justify-between min-h-[58px] sm:min-h-[92px] transition-all group ${
                          hasTrades || !isWeekend ? 'cursor-pointer hover:scale-[1.02] hover:shadow-md' : 'cursor-default'
                        } ${tileBg}`}
                      >
                        {/* Day Number (Top Left) & Flame/Badges (Top Right) */}
                        <div className="flex items-center justify-between leading-none">
                          <span className={`text-[11px] sm:text-xs font-mono font-bold ${dayNumColor}`}>
                            {c.day}
                          </span>
                          {isLoss && (
                            <span className="text-xs" title="Loss day">
                              🔥
                            </span>
                          )}
                          {isWeekend && (
                            <Lock className="w-2.5 h-2.5 text-[#786F66] dark:text-[#64748B]" />
                          )}
                          {isNoTrade && (
                            <span className="text-[10px]" title="Skipped Day">
                              ⚪
                            </span>
                          )}
                        </div>

                        {/* Center P&L / Label */}
                        <div className="my-auto py-1 text-center">
                          {hasTrades ? (
                            <div>
                              <div className={`text-xs sm:text-sm md:text-base font-black font-mono tracking-tight leading-tight ${pnlColor}`}>
                                {(c.dayPnl || 0) >= 0 ? '+' : '-'}{currSymbol}{Math.abs(c.dayPnl || 0).toFixed(0)}
                              </div>
                              <div className={`text-[9px] sm:text-[10px] font-mono mt-0.5 ${tradesColor}`}>
                                {dayTrades.length} trade{dayTrades.length === 1 ? '' : 's'}
                              </div>
                            </div>
                          ) : isWeekend ? (
                            <div className="text-[9px] sm:text-[10px] font-medium text-[#786F66] dark:text-[#64748B]">
                              Weekend Off
                            </div>
                          ) : isNoTrade ? (
                            <div className="text-[9px] sm:text-[10px] font-medium text-[#6B7280] dark:text-[#94A3B8] truncate">
                              No Trade
                            </div>
                          ) : (
                            <div className="text-[9px] font-mono text-[#786F66]/60 dark:text-[#94A3B8]/60">
                              --
                            </div>
                          )}
                        </div>

                        {/* Bottom Tag / Badge */}
                        <div className="text-center pt-0.5 border-t border-black/5 dark:border-white/5">
                          {hasTrades ? (
                            <span className="text-[9px] font-mono font-bold text-[#786F66] dark:text-[#94A3B8]">
                              {(c.dayR || 0) >= 0 ? `+${(c.dayR || 0).toFixed(1)}R` : `${(c.dayR || 0).toFixed(1)}R`}
                            </span>
                          ) : isNoTrade ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (c.dateStr) handleToggleSkipDay(c.dateStr, 'No Setup', false);
                              }}
                              className="text-[8px] sm:text-[9px] text-[#DB9F35] hover:underline font-bold"
                            >
                              Re-open
                            </button>
                          ) : !isWeekend ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (c.dateStr) handleToggleSkipDay(c.dateStr, 'No Setup', true);
                              }}
                              className="text-[8px] sm:text-[9px] text-[#786F66] hover:text-[#DB9F35] dark:text-[#94A3B8] dark:hover:text-[#FBBF24] font-medium"
                            >
                              Skip
                            </button>
                          ) : (
                            <span className="text-[8px] sm:text-[9px] text-[#786F66] dark:text-[#64748B]">
                              Closed
                            </span>
                          )}
                        </div>
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
                    className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] shadow-2xs flex flex-col justify-between min-h-[72px] sm:min-h-[92px]"
                  >
                    <div>
                      <div className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase">
                        Week {week.weekIndex}
                      </div>

                      {/* Mini Horizontal Progress Bar */}
                      <div className="w-full h-1.5 rounded-full bg-[#E7E0D6] dark:bg-[#242D3D] overflow-hidden my-1.5">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isPositive ? 'bg-[#10B981]' : 'bg-[#EF4444]'
                          }`}
                          style={{ width: `${week.pnl === 0 ? 0 : barWidthPct}%` }}
                        />
                      </div>

                      {/* Net Weekly P&L */}
                      <div className={`text-xs sm:text-sm font-black font-mono leading-tight ${
                        week.pnl > 0.001 ? 'text-[#10B981]' : week.pnl < -0.001 ? 'text-[#DC2626]' : 'text-[#786F66] dark:text-[#94A3B8]'
                      }`}>
                        {week.pnl >= 0 ? '+' : '-'}{currSymbol}{Math.abs(week.pnl).toFixed(0)}
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="text-[9px] font-mono text-[#786F66] dark:text-[#94A3B8] pt-1 border-t border-[#E7E0D6]/50 dark:border-[#242D3D] flex items-center justify-between">
                      <span>{week.wins}W {week.be > 0 ? `${week.be}BE ` : ''}{week.losses}L</span>
                      <span className="font-bold">{week.winRate}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. Quote Callout */}
        <div className="mt-8 p-4 sm:p-5 rounded-2xl bg-[#F0E5D3]/60 dark:bg-[#1A2230] border border-[#E2D1B8] dark:border-[#283244] flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors">
          <div className="flex items-center gap-3">
            <Quote className="w-7 h-7 text-[#DB9F35] shrink-0" />
            <div>
              <p className="text-sm sm:text-base font-black text-[#1F1A16] dark:text-[#F0F4F8] uppercase tracking-wide">
                "Discipline today, profits tomorrow."
              </p>
              <p className="text-xs text-[#786F66] dark:text-[#94A3B8]">
                Small Steps | Consistent Action | Big Results
              </p>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <span className="text-xs font-mono font-bold text-[#DB9F35] uppercase tracking-wider block">
              Trade Better, Be Better
            </span>
            <span className="text-[11px] text-[#786F66] dark:text-[#94A3B8]">TradeFlow Official Methodology</span>
          </div>
        </div>

        {/* 4. NET RESULT Footer Bar */}
        <div className="mt-6 bg-[#1F1A16] dark:bg-[#0E121B] text-white rounded-2xl p-5 shadow-xs border border-[#2D2620] dark:border-[#242D3D] transition-colors">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold text-[#DB9F35] uppercase tracking-widest block">
                MONTHLY CYCLE NET RESULT
              </span>
              <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-1">
                {perf.netPnl >= 0 ? `+${currSymbol}${perf.netPnl.toFixed(2)}` : `-${currSymbol}${Math.abs(perf.netPnl).toFixed(2)}`}
                <span className="text-lg font-normal text-[#10B981] dark:text-[#34D399] ml-2">
                  ({perf.averageR >= 0 ? `+${perf.averageR.toFixed(1)}R` : `${perf.averageR.toFixed(1)}R`})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 font-mono text-xs">
              <div className="p-2.5 rounded-xl bg-white/10 dark:bg-[#161D2B] border border-white/10 dark:border-[#242D3D]">
                <span className="text-[#C4B7A6] dark:text-[#94A3B8] block text-[10px]">TOTAL TRADES</span>
                <span className="text-sm font-bold text-white">{perf.totalTrades}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/10 dark:bg-[#161D2B] border border-white/10 dark:border-[#242D3D]">
                <span className="text-[#C4B7A6] dark:text-[#94A3B8] block text-[10px]">WIN RATE</span>
                <span className="text-sm font-bold text-[#10B981] dark:text-[#34D399]">{perf.winRate.toFixed(1)}%</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/10 dark:bg-[#161D2B] border border-white/10 dark:border-[#242D3D]">
                <span className="text-[#C4B7A6] dark:text-[#94A3B8] block text-[10px]">TRADING DAYS</span>
                <span className="text-sm font-bold text-[#10B981] dark:text-[#34D399]">{tradingDaysCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/10 dark:bg-[#161D2B] border border-white/10 dark:border-[#242D3D]">
                <span className="text-[#C4B7A6] dark:text-[#94A3B8] block text-[10px]">SKIPPED DAYS</span>
                <span className="text-sm font-bold text-[#60A5FA]">{noTradeDaysCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/10 dark:bg-[#161D2B] border border-white/10 dark:border-[#242D3D]">
                <span className="text-[#C4B7A6] dark:text-[#94A3B8] block text-[10px]">WEEKENDS</span>
                <span className="text-sm font-bold text-[#94A3B8]">{weekendDaysCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/10 dark:bg-[#161D2B] border border-white/10 dark:border-[#242D3D]">
                <span className="text-[#C4B7A6] dark:text-[#94A3B8] block text-[10px]">DISCIPLINE</span>
                <span className="text-sm font-bold text-[#DB9F35]">{disc.disciplineScore}%</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 5. Day Action Modal for Skipping or Logging Trade */}
      {selectedDayModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setSelectedDayModal(null)}
        >
          <div 
            className="max-w-md w-full bg-white dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl overflow-hidden shadow-2xl text-[#1F1A16] dark:text-[#F0F4F8] transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E0D6] dark:border-[#242D3D] bg-[#FAF7F2] dark:bg-[#1A2230]">
              <div className="flex items-center gap-2.5">
                <CalendarIcon className="w-5 h-5 text-[#DB9F35]" />
                <div>
                  <h3 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8] flex items-center gap-2">
                    DAY {String(selectedDayModal.dayNum).padStart(2, '0')} • {selectedDayModal.dayOfWeekName}, {selectedDayModal.dayNum} {monthNames[cycleMonth - 1]}
                  </h3>
                  <span className="text-[11px] text-[#786F66] dark:text-[#94A3B8] font-mono">
                    {selectedDayModal.dateStr}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedDayModal(null)}
                className="p-1.5 rounded-lg text-[#786F66] hover:text-[#1F1A16] dark:text-[#94A3B8] dark:hover:text-white hover:bg-[#F3EDE2] dark:hover:bg-[#252E40] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {selectedDayModal.isNoTrade ? (
                /* Already Skipped state */
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[#F3F4F6] dark:bg-[#1A2230] border border-[#D1D5DB] dark:border-[#2E384D] space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                      <span className="text-sm">⚪</span>
                      <span>Currently Marked as No Trading Day</span>
                    </div>
                    <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
                      Reason:{' '}
                      <span className="font-semibold text-[#1F1A16] dark:text-[#F0F4F8]">
                        {selectedDayModal.currentReason || 'No Setup'}
                      </span>
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleToggleSkipDay(selectedDayModal.dateStr, 'No Setup', false);
                        setSelectedDayModal(null);
                      }}
                      className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-[#FAF7F2] dark:bg-[#1A2230] hover:bg-[#FEECEB] dark:hover:bg-[#3D1D1D] text-[#786F66] hover:text-[#DC2626] dark:text-[#94A3B8] dark:hover:text-[#F87171] border border-[#E7E0D6] dark:border-[#2E384D] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Re-open Day</span>
                    </button>
                    {onOpenQuickTradeForDate && (
                      <button
                        type="button"
                        onClick={() => {
                          const targetDate = selectedDayModal.dateStr;
                          setSelectedDayModal(null);
                          onOpenQuickTradeForDate(targetDate);
                        }}
                        className="flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold bg-[#DB9F35] hover:bg-[#CCA030] text-[#1F1A16] transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Log Trade</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Open State */
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider">
                      Select No-Trading Reason (Skip)
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { id: 'No Setup', label: '🎯 No Valid Setup (Patience & Discipline)', desc: 'Followed trading plan, no edge present' },
                        { id: 'Planned Rest', label: '🧘 Planned Discipline Rest / Holiday', desc: 'Pre-planned day off to recharge' },
                        { id: 'Market Conditions', label: '⚠️ Market Conditions / News Risk', desc: 'Choppy market, bank holiday or NFP/CPI risk' },
                        { id: 'Personal', label: '💼 Personal / Other Priorities', desc: 'Busy with personal work, charts closed' },
                      ].map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setModalReason(r.id as DayRecord['noTradeReason'])}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                            modalReason === r.id
                              ? 'bg-[#FAF6EE] dark:bg-[#20293A] border-[#DB9F35] shadow-2xs'
                              : 'bg-[#FAF7F2] dark:bg-[#1A2230] border-[#E7E0D6] dark:border-[#283244] hover:border-[#DFD5C6]'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                            modalReason === r.id
                              ? 'border-[#DB9F35] bg-[#DB9F35] text-[#1F1A16]'
                              : 'border-[#DFD5C6] dark:border-[#374151]'
                          }`}>
                            {modalReason === r.id && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8] block">
                              {r.label}
                            </span>
                            <span className="text-[11px] text-[#786F66] dark:text-[#94A3B8]">
                              {r.desc}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleToggleSkipDay(selectedDayModal.dateStr, modalReason, true);
                        setSelectedDayModal(null);
                      }}
                      className="flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold bg-[#DB9F35] hover:bg-[#CCA030] text-[#1F1A16] transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <span>⏭️ Mark as Skipped Day</span>
                    </button>
                    {onOpenQuickTradeForDate && (
                      <button
                        type="button"
                        onClick={() => {
                          const targetDate = selectedDayModal.dateStr;
                          setSelectedDayModal(null);
                          onOpenQuickTradeForDate(targetDate);
                        }}
                        className="py-2.5 px-4 rounded-xl text-xs font-bold bg-[#FAF7F2] dark:bg-[#1A2230] hover:bg-[#F3EDE2] dark:hover:bg-[#252E40] text-[#786F66] hover:text-[#1F1A16] dark:text-[#94A3B8] dark:hover:text-white border border-[#E7E0D6] dark:border-[#2E384D] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Log Trade</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

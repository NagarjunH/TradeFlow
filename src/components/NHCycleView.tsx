import React, { useState } from 'react';
import { 
  Quote, 
  Lock, 
  RotateCcw, 
  X, 
  Calendar as CalendarIcon, 
  Check, 
  Plus
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
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];

  const [challengeMode, setChallengeMode] = useState<'21_DAY' | '31_DAY'>('31_DAY');
  const daysInCycle = challengeMode === '21_DAY' ? 21 : 31;

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

  const cycleTrades = trades.filter((t) => {
    const [y, m] = t.date.split('-').map(Number);
    return y === cycleYear && m === cycleMonth;
  });

  const perf = calculatePerformance(cycleTrades, settings);
  const disc = calculateDiscipline(cycleTrades);
  const currSymbol = settings.currency === 'USD' ? '$' : '₹';

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

  // Summary counts for this cycle
  const tradingDaysCount = Array.from({ length: daysInCycle }, (_, i) => i + 1).filter((dayNum) => {
    const dStr = `${cycleYear}-${String(cycleMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    return trades.some((t) => t.date === dStr);
  }).length;

  const noTradeDaysCount = Array.from({ length: daysInCycle }, (_, i) => i + 1).filter((dayNum) => {
    const dStr = `${cycleYear}-${String(cycleMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const dRec = days.find((d) => d.date === dStr);
    const dObj = new Date(cycleYear, cycleMonth - 1, dayNum);
    const isWk = dObj.getDay() === 0 || dObj.getDay() === 6;
    return !trades.some((t) => t.date === dStr) && !isWk && dRec?.isNoTradeDay;
  }).length;

  const weekendDaysCount = Array.from({ length: daysInCycle }, (_, i) => i + 1).filter((dayNum) => {
    const dObj = new Date(cycleYear, cycleMonth - 1, dayNum);
    return dObj.getDay() === 0 || dObj.getDay() === 6;
  }).length;

  return (
    <div className="space-y-6 animate-fade-in pb-16 text-[#1F1A16] dark:text-[#F0F4F8]">
      {/* 1. Cycle Poster Header */}
      <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-2xs transition-colors">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[#E7E0D6] dark:border-[#242D3D] pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono tracking-widest text-[#15803D] dark:text-[#34D399] uppercase font-bold">
                PLAN • EXECUTE • IMPROVE
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-[#1F1A16] dark:text-[#F0F4F8] uppercase">
              TRADE<span className="text-[#DB9F35]">FLOW</span>{' '}
              <span className="text-[#9B671B] dark:text-[#F59E0B]">
                {challengeMode === '21_DAY' ? '21-DAY CHALLENGE' : `${monthNames[cycleMonth - 1]} ${cycleYear}`}
              </span>
            </h1>
            <div className="flex items-center gap-2 text-xs text-[#786F66] dark:text-[#94A3B8] font-medium tracking-wide">
              <span>{challengeMode === '21_DAY' ? 'DISCIPLINE CHALLENGE' : 'MONTHLY TRADING CYCLE'}</span>
              <span>|</span>
              <span className="text-[#1F1A16] dark:text-[#F0F4F8] font-bold">DISCIPLINE TODAY • PROFITS TOMORROW</span>
            </div>
          </div>

          {/* Mode Selector & Month Selector */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 21-Day Challenge vs 31-Day Cycle Mode Toggle */}
            <div className="flex items-center bg-[#F2ECE0] dark:bg-[#1A2230] border border-[#DFD5C6] dark:border-[#283244] p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setChallengeMode('21_DAY')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  challengeMode === '21_DAY'
                    ? 'bg-[#DB9F35] text-[#1F1A16] font-black shadow-2xs'
                    : 'text-[#786F66] dark:text-[#94A3B8] hover:text-[#1F1A16]'
                }`}
              >
                🔥 21-Day Challenge
              </button>
              <button
                type="button"
                onClick={() => setChallengeMode('31_DAY')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  challengeMode === '31_DAY'
                    ? 'bg-[#DB9F35] text-[#1F1A16] font-black shadow-2xs'
                    : 'text-[#786F66] dark:text-[#94A3B8] hover:text-[#1F1A16]'
                }`}
              >
                📅 31-Day Cycle
              </button>
            </div>

            <select
              value={cycleMonth}
              onChange={(e) => setCycleMonth(Number(e.target.value))}
              className="bg-[#FAF7F2] dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] rounded-xl px-3 py-2 text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8] focus:border-[#DB9F35] outline-none cursor-pointer transition-colors"
            >
              {monthNames.map((name, i) => (
                <option key={name} value={i + 1} className="bg-white dark:bg-[#1A2230] text-[#1F1A16] dark:text-[#F0F4F8]">
                  {name}
                </option>
              ))}
            </select>
            <select
              value={cycleYear}
              onChange={(e) => setCycleYear(Number(e.target.value))}
              className="bg-[#FAF7F2] dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] rounded-xl px-3 py-2 text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8] focus:border-[#DB9F35] outline-none cursor-pointer transition-colors"
            >
              {[2025, 2026, 2027].map((yr) => (
                <option key={yr} value={yr} className="bg-white dark:bg-[#1A2230] text-[#1F1A16] dark:text-[#F0F4F8]">
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 2. 31-Day Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-6">
          {Array.from({ length: daysInCycle }, (_, i) => i + 1).map((dayNum) => {
            const dateStr = `${cycleYear}-${String(cycleMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const dayTrades = trades.filter((t) => t.date === dateStr);
            const dayRecord = days.find((d) => d.date === dateStr);

            // Calculate weekday & weekend status
            const dateObj = new Date(cycleYear, cycleMonth - 1, dayNum);
            const dayOfWeekIndex = dateObj.getDay(); // 0 = Sun, 6 = Sat
            const isWeekend = dayOfWeekIndex === 0 || dayOfWeekIndex === 6;
            const isSaturday = dayOfWeekIndex === 6;
            const dayOfWeekName = dateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();

            let dayPnl = 0;
            let dayR = 0;
            let allClean = true;
            let hasViolation = false;

            dayTrades.forEach((t) => {
              dayPnl += t.pnl;
              dayR += t.rMultiple;
              if (t.execution === 'VIOLATION') {
                hasViolation = true;
                allClean = false;
              }
            });

            const hasTrades = dayTrades.length > 0;
            const isNoTrade = !hasTrades && !isWeekend && Boolean(dayRecord?.isNoTradeDay);

            // Styling variables
            let statusBadge = '';
            let cardBorder = 'border-[#E7E0D6] dark:border-[#242D3D]';
            let cardBg = 'bg-[#FAF7F2] dark:bg-[#161D2B]';
            let badgeStyle = 'bg-white dark:bg-[#1F2839] border-[#E7E0D6] dark:border-[#2E3A4E] text-[#1F1A16] dark:text-[#F0F4F8]';

            if (hasTrades) {
              if (dayR > 0.05 && allClean) {
                cardBorder = 'border-[#B7ECC8] dark:border-[#10B981]/40';
                cardBg = 'bg-[#E8F8EE] dark:bg-[#0D281E]';
                badgeStyle = 'bg-white/90 dark:bg-[#10B981]/25 border-[#B7ECC8] dark:border-[#10B981]/40 text-[#15803D] dark:text-[#34D399]';
                statusBadge = '🟢 CLEAN';
              } else if (dayR < -0.05 && hasViolation) {
                cardBorder = 'border-[#FBC5C2] dark:border-[#EF4444]/40';
                cardBg = 'bg-[#FEECEB] dark:bg-[#2A1316]';
                badgeStyle = 'bg-white/90 dark:bg-[#EF4444]/25 border-[#FBC5C2] dark:border-[#EF4444]/40 text-[#DC2626] dark:text-[#F87171]';
                statusBadge = '🔴 VIOLATION';
              } else if (dayR < -0.05 && allClean) {
                cardBorder = 'border-[#E2D1B8] dark:border-[#D97706]/40';
                cardBg = 'bg-[#F0E5D3]/50 dark:bg-[#261C14]';
                badgeStyle = 'bg-white/90 dark:bg-[#D97706]/25 border-[#E2D1B8] dark:border-[#D97706]/40 text-[#B45309] dark:text-[#FBBF24]';
                statusBadge = '🔵 CLEAN LOSS';
              } else {
                cardBorder = 'border-[#FDE68A] dark:border-[#F59E0B]/40';
                cardBg = 'bg-[#FFFBEB] dark:bg-[#252013]';
                badgeStyle = 'bg-white/90 dark:bg-[#F59E0B]/25 border-[#FDE68A] dark:border-[#F59E0B]/40 text-[#92400E] dark:text-[#FCD34D]';
                statusBadge = '🟡 BE / MIXED';
              }
            } else if (isWeekend) {
              // BLOCKED WEEKEND (Saturday & Sunday)
              cardBorder = 'border-[#DFD5C6] dark:border-[#1F2738]';
              cardBg = 'bg-[#F2ECE1]/60 dark:bg-[#0D121B] opacity-80 dark:opacity-65';
              badgeStyle = 'bg-[#E5DBCB] dark:bg-[#18202F] border-[#D6CABE] dark:border-[#263147] text-[#786F66] dark:text-[#64748B]';
              statusBadge = '🔒 BLOCKED';
            } else if (isNoTrade) {
              // NO TRADE / SKIPPED DAY
              cardBorder = 'border-[#D1D5DB] dark:border-[#2E384D]';
              cardBg = 'bg-[#F3F4F6] dark:bg-[#151C28]';
              badgeStyle = 'bg-white dark:bg-[#1C2433] border-[#D1D5DB] dark:border-[#2E384D] text-[#4B5563] dark:text-[#94A3B8]';
              statusBadge = '⚪ NO TRADE';
            }

            return (
              <div
                key={dayNum}
                onClick={() => {
                  if (hasTrades) {
                    onSelectDayForJournal(dateStr);
                  } else if (!isWeekend) {
                    setSelectedDayModal({
                      dateStr,
                      dayNum,
                      dayOfWeekName,
                      isWeekend: false,
                      isNoTrade,
                      currentReason: dayRecord?.noTradeReason,
                    });
                    setModalReason(dayRecord?.noTradeReason || 'No Setup');
                  }
                }}
                className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between min-h-[110px] group ${
                  hasTrades || (!isWeekend) ? 'cursor-pointer hover:scale-[1.02] hover:shadow-xs' : 'cursor-not-allowed'
                } ${cardBg} ${cardBorder}`}
              >
                {/* Header Row: DAY + Date with Weekday */}
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold ${badgeStyle}`}>
                    DAY {String(dayNum).padStart(2, '0')}
                  </span>
                  <span className={`text-[10px] font-mono font-bold tracking-tight ${
                    isWeekend ? 'text-[#8C8276] dark:text-[#64748B]' : 'text-[#786F66] dark:text-[#94A3B8]'
                  }`}>
                    {dayOfWeekName} • {dayNum} {monthNames[cycleMonth - 1].slice(0, 3)}
                  </span>
                </div>

                {/* Middle Content */}
                <div className="my-2">
                  {hasTrades ? (
                    <div>
                      <div className={`text-base font-black font-mono tracking-tight ${dayPnl >= 0 ? 'text-[#15803D] dark:text-[#34D399]' : 'text-[#DC2626] dark:text-[#F87171]'}`}>
                        {dayPnl >= 0 ? `+${currSymbol}${dayPnl.toFixed(2)}` : `-${currSymbol}${Math.abs(dayPnl).toFixed(2)}`}
                      </div>
                      <div className={`text-[11px] font-mono font-semibold mt-0.5 ${dayR >= 0 ? 'text-[#059669] dark:text-[#6EE7B7]' : 'text-[#DC2626] dark:text-[#F87171]'}`}>
                        {dayR >= 0 ? `+${dayR.toFixed(1)}R` : `${dayR.toFixed(1)}R`}
                        {isWeekend && <span className="ml-1 text-[9px] text-[#DB9F35] font-normal">(Wknd)</span>}
                      </div>
                    </div>
                  ) : isWeekend ? (
                    /* Blocked Weekend Content */
                    <div className="py-0.5 space-y-0.5">
                      <div className="text-[11px] font-bold text-[#8C8276] dark:text-[#64748B] flex items-center gap-1">
                        <Lock className="w-3 h-3 text-[#9E958C] dark:text-[#64748B] shrink-0" />
                        <span>Market Closed</span>
                      </div>
                      <div className="text-[10px] text-[#A69C90] dark:text-[#4B5565] font-mono">
                        Weekend Off
                      </div>
                    </div>
                  ) : isNoTrade ? (
                    /* Skipped / No-Trade Day Content */
                    <div className="py-0.5 space-y-0.5">
                      <div className="text-xs font-bold text-[#4B5563] dark:text-[#CBD5E1] flex items-center gap-1">
                        <span className="text-[10px]">⚪</span>
                        <span>No Trading Day</span>
                      </div>
                      <div className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] font-medium truncate" title={dayRecord?.noTradeReason || 'No Setup / Rest'}>
                        {dayRecord?.noTradeReason || 'No Setup / Skipped'}
                      </div>
                    </div>
                  ) : (
                    /* Regular Open Day Content */
                    <div className="py-0.5 space-y-0.5">
                      <div className="text-xs text-[#9E958C] dark:text-[#64748B] font-mono">
                        P&L: ------
                      </div>
                      <div className="text-[10px] text-[#B0A79C] dark:text-[#4B5565] font-mono">
                        No trades logged
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Bar: Status & Actions */}
                <div className="pt-2 border-t border-[#E7E0D6]/80 dark:border-[#242D3D] flex items-center justify-between text-[10px] font-semibold">
                  {hasTrades ? (
                    <>
                      <span>{statusBadge}</span>
                      <span className="font-mono text-[#786F66] dark:text-[#94A3B8] group-hover:text-[#DB9F35] dark:group-hover:text-[#F59E0B]">
                        {dayTrades.length}T →
                      </span>
                    </>
                  ) : isWeekend ? (
                    <>
                      <span className="text-[#8C8276] dark:text-[#64748B] flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5 shrink-0" />
                        BLOCKED
                      </span>
                      <span className="text-[9px] font-mono text-[#9E958C] dark:text-[#525D73] uppercase">
                        {isSaturday ? 'Saturday' : 'Sunday'}
                      </span>
                    </>
                  ) : isNoTrade ? (
                    <>
                      <span className="text-[#6B7280] dark:text-[#94A3B8] flex items-center gap-1 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF]"></span>
                        SKIPPED
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSkipDay(dateStr, 'No Setup', false);
                        }}
                        className="px-2 py-0.5 rounded-md text-[10px] bg-white dark:bg-[#1E2636] hover:bg-[#FEECEB] dark:hover:bg-[#3D1D1D] text-[#6B7280] hover:text-[#DC2626] dark:text-[#94A3B8] dark:hover:text-[#F87171] border border-[#D1D5DB] dark:border-[#2E384D] transition-colors cursor-pointer flex items-center gap-1 font-bold shadow-2xs"
                        title="Remove skip / Re-open day"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>Re-open</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-[#9E958C] dark:text-[#64748B] opacity-60">Open</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSkipDay(dateStr, 'No Setup', true);
                        }}
                        className="px-2 py-0.5 rounded-md text-[10px] bg-[#FAF7F2] dark:bg-[#1A2230] hover:bg-[#DB9F35]/15 text-[#786F66] hover:text-[#DB9F35] dark:text-[#94A3B8] dark:hover:text-[#FBBF24] border border-[#E7E0D6] dark:border-[#2E384D] transition-colors cursor-pointer flex items-center gap-1 font-bold shadow-2xs"
                        title="Mark as Skipped / No Trading Day"
                      >
                        <span>⏭️</span>
                        <span>Skip Day</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 3. Quote Callout */}
        <div className="mt-8 p-5 rounded-xl bg-[#F0E5D3]/60 dark:bg-[#1A2230] border border-[#E2D1B8] dark:border-[#283244] flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors">
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
        <div className="mt-6 bg-[#1F1A16] dark:bg-[#0E121B] text-white rounded-xl p-5 shadow-xs border border-[#2D2620] dark:border-[#242D3D] transition-colors">
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
              <div className="p-2.5 rounded-lg bg-white/10 dark:bg-[#161D2B] border border-white/10 dark:border-[#242D3D]">
                <span className="text-[#C4B7A6] dark:text-[#94A3B8] block text-[10px]">TOTAL TRADES</span>
                <span className="text-sm font-bold text-white">{perf.totalTrades}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white/10 dark:bg-[#161D2B] border border-white/10 dark:border-[#242D3D]">
                <span className="text-[#C4B7A6] dark:text-[#94A3B8] block text-[10px]">WIN RATE</span>
                <span className="text-sm font-bold text-[#10B981] dark:text-[#34D399]">{perf.winRate.toFixed(1)}%</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white/10 dark:bg-[#161D2B] border border-white/10 dark:border-[#242D3D]">
                <span className="text-[#C4B7A6] dark:text-[#94A3B8] block text-[10px]">TRADING DAYS</span>
                <span className="text-sm font-bold text-[#10B981] dark:text-[#34D399]">{tradingDaysCount}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white/10 dark:bg-[#161D2B] border border-white/10 dark:border-[#242D3D]">
                <span className="text-[#C4B7A6] dark:text-[#94A3B8] block text-[10px]">SKIPPED DAYS</span>
                <span className="text-sm font-bold text-[#60A5FA]">{noTradeDaysCount}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white/10 dark:bg-[#161D2B] border border-white/10 dark:border-[#242D3D]">
                <span className="text-[#C4B7A6] dark:text-[#94A3B8] block text-[10px]">WEEKENDS</span>
                <span className="text-sm font-bold text-[#94A3B8]">{weekendDaysCount}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white/10 dark:bg-[#161D2B] border border-white/10 dark:border-[#242D3D]">
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

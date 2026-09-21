import React, { useState } from 'react';
import { 
  Quote
} from 'lucide-react';
import type { Trade, DayRecord, AppSettings } from '../db/db';
import { calculatePerformance, calculateDiscipline } from '../utils/TradingEngine';

interface NHCycleViewProps {
  trades: Trade[];
  days: DayRecord[];
  settings: AppSettings;
  onSelectDayForJournal: (dateStr: string) => void;
}

export const NHCycleView: React.FC<NHCycleViewProps> = ({
  trades,
  days,
  settings,
  onSelectDayForJournal,
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
    return 12;
  });

  const monthNames = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];

  const [challengeMode, setChallengeMode] = useState<'21_DAY' | '31_DAY'>('31_DAY');
  const daysInCycle = challengeMode === '21_DAY' ? 21 : 31;

  const cycleTrades = trades.filter((t) => {
    const [y, m] = t.date.split('-').map(Number);
    return y === cycleYear && m === cycleMonth;
  });

  const perf = calculatePerformance(cycleTrades, settings);
  const disc = calculateDiscipline(cycleTrades);

  const currSymbol = settings.currency === 'USD' ? '$' : '₹';

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
              NH <span className="text-[#DB9F35]">TRADERS</span>{' '}
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
              className="bg-[#FAF7F2] border border-[#E7E0D6] rounded-xl px-3 py-2 text-xs font-bold text-[#1F1A16] focus:border-[#DB9F35] outline-none"
            >
              {monthNames.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
            <select
              value={cycleYear}
              onChange={(e) => setCycleYear(Number(e.target.value))}
              className="bg-[#FAF7F2] border border-[#E7E0D6] rounded-xl px-3 py-2 text-xs font-bold text-[#1F1A16] focus:border-[#DB9F35] outline-none"
            >
              {[2025, 2026, 2027].map((yr) => (
                <option key={yr} value={yr}>
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
            const isNoTrade = dayRecord?.isNoTradeDay;

            let statusBadge = '';
            let cardBorder = 'border-[#E7E0D6]';
            let cardBg = 'bg-[#FAF7F2]';

            if (hasTrades) {
              if (dayR > 0.05 && allClean) {
                cardBorder = 'border-[#B7ECC8]';
                cardBg = 'bg-[#E8F8EE]';
                statusBadge = '🟢 CLEAN';
              } else if (dayR < -0.05 && hasViolation) {
                cardBorder = 'border-[#FBC5C2]';
                cardBg = 'bg-[#FEECEB]';
                statusBadge = '🔴 VIOLATION';
              } else if (dayR < -0.05 && allClean) {
                cardBorder = 'border-[#E2D1B8]';
                cardBg = 'bg-[#F0E5D3]/50';
                statusBadge = '🔵 CLEAN LOSS';
              } else {
                cardBorder = 'border-[#FDE68A]';
                cardBg = 'bg-[#FFFBEB]';
                statusBadge = '🟡 BE / MIXED';
              }
            } else if (isNoTrade) {
              cardBorder = 'border-[#E7E0D6]';
              cardBg = 'bg-[#FAF7F2]';
              statusBadge = '⚪ NO TRADE';
            }

            return (
              <div
                key={dayNum}
                onClick={() => {
                  if (hasTrades) {
                    onSelectDayForJournal(dateStr);
                  }
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between min-h-[105px] group hover:scale-[1.02] hover:shadow-xs ${cardBg} ${cardBorder}`}
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md bg-white border border-[#E7E0D6] text-[10px] font-mono font-bold text-[#1F1A16]">
                    DAY {String(dayNum).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] text-[#786F66] font-mono">
                    {dayNum} {monthNames[cycleMonth - 1].slice(0, 3)}
                  </span>
                </div>

                <div className="my-2">
                  {hasTrades ? (
                    <div>
                      <div className={`text-base font-black font-mono ${dayR >= 0 ? 'text-[#15803D]' : hasViolation ? 'text-[#DC2626]' : 'text-[#9B671B]'}`}>
                        {dayR >= 0 ? `+${dayR.toFixed(1)}R` : `${dayR.toFixed(1)}R`}
                      </div>
                      <div className="text-[11px] font-mono text-[#786F66]">
                        {dayPnl >= 0 ? `+${currSymbol}${dayPnl.toFixed(2)}` : `${currSymbol}${dayPnl.toFixed(2)}`}
                      </div>
                    </div>
                  ) : isNoTrade ? (
                    <div className="text-[11px] text-[#786F66] italic font-medium">
                      No Trade Day
                    </div>
                  ) : (
                    <div className="text-xs text-[#9E958C] font-mono">
                      P&L: ______
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-[#E7E0D6]/80 flex items-center justify-between text-[10px] font-semibold">
                  {statusBadge ? (
                    <span>{statusBadge}</span>
                  ) : (
                    <span className="text-[#9E958C] opacity-60">Open</span>
                  )}
                  {hasTrades && (
                    <span className="font-mono text-[#786F66] group-hover:text-[#DB9F35]">
                      {dayTrades.length}T →
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 3. Quote Callout */}
        <div className="mt-8 p-5 rounded-xl bg-[#F0E5D3]/60 border border-[#E2D1B8] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Quote className="w-7 h-7 text-[#DB9F35] shrink-0" />
            <div>
              <p className="text-sm sm:text-base font-black text-[#1F1A16] uppercase tracking-wide">
                "Discipline today, profits tomorrow."
              </p>
              <p className="text-xs text-[#786F66]">
                Small Steps | Consistent Action | Big Results
              </p>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <span className="text-xs font-mono font-bold text-[#DB9F35] uppercase tracking-wider block">
              Trade Better, Be Better
            </span>
            <span className="text-[11px] text-[#786F66]">NH Traders Official Methodology</span>
          </div>
        </div>

        {/* 4. NET RESULT Footer Bar */}
        <div className="mt-6 bg-[#1F1A16] text-white rounded-xl p-5 shadow-xs border border-[#2D2620]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold text-[#DB9F35] uppercase tracking-widest block">
                MONTHLY CYCLE NET RESULT
              </span>
              <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-1">
                {perf.netPnl >= 0 ? `+${currSymbol}${perf.netPnl.toFixed(2)}` : `-${currSymbol}${Math.abs(perf.netPnl).toFixed(2)}`}
                <span className="text-lg font-normal text-[#16A34A] ml-2">
                  ({perf.averageR >= 0 ? `+${perf.netPnl.toFixed(1)}` : ''})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="p-2.5 rounded-lg bg-white/10 border border-white/10">
                <span className="text-[#C4B7A6] block text-[10px]">TOTAL TRADES</span>
                <span className="text-sm font-bold text-white">{perf.totalTrades}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white/10 border border-white/10">
                <span className="text-[#C4B7A6] block text-[10px]">WIN RATE</span>
                <span className="text-sm font-bold text-[#16A34A]">{perf.winRate.toFixed(1)}%</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white/10 border border-white/10">
                <span className="text-[#C4B7A6] block text-[10px]">DISCIPLINE SCORE</span>
                <span className="text-sm font-bold text-[#DB9F35]">{disc.disciplineScore}%</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white/10 border border-white/10">
                <span className="text-[#C4B7A6] block text-[10px]">CLEAN TRADES</span>
                <span className="text-sm font-bold text-[#16A34A]">{disc.cleanTradesCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

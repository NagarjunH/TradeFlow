import React, { useState, useEffect, useMemo } from 'react';
import {
  Flame,
  CheckCircle2,
  AlertTriangle,
  CircleDot,
  Check,
  X as XIcon,
  Calendar as CalendarIcon,
  CalendarCheck,
  Info,
  Quote,
  RotateCcw,
  Target,
  ExternalLink
} from 'lucide-react';
import type { Trade, DayRecord, AppSettings } from '../db/db';
import type { TabType } from './Navbar';

interface Challenge21ViewProps {
  trades?: Trade[];
  days?: DayRecord[];
  settings?: AppSettings;
  onSelectDate?: (dateStr: string) => void;
  onTabChange?: (tab: TabType) => void;
}

export type DayChallengeStatus = 'CLEAN' | 'MINOR_VIOLATION' | 'FAILED' | 'NO_TRADE' | 'TODAY' | 'PENDING';

interface ChallengeDayItem {
  dayNum: number;
  dateStr: string; // e.g. "1 Oct"
  fullDate: string; // "YYYY-MM-DD"
  dayOfWeek: string; // "Mon", "Tue", etc.
  status: DayChallengeStatus;
  dayTrades: Trade[];
  netR: number;
  netPnl: number;
}

const CHECKLIST_DEFAULT = [
  { id: 'rules', label: 'Followed my trading rules', checked: false },
  { id: 'setups', label: 'Took only valid setups', checked: false },
  { id: 'risk', label: 'Risk stayed within limit', checked: false },
  { id: 'no_fomo', label: 'No revenge / FOMO trade', checked: false },
  { id: 'no_widen_sl', label: 'Did not widen SL', checked: false },
  { id: 'journal', label: 'Completed my journal', checked: false },
  { id: 'review', label: "Reviewed today's trades", checked: false },
];

const STORAGE_SETTINGS_KEY = 'nh_traders_21day_challenge_config_v4';
const STORAGE_OVERRIDES_KEY = 'nh_traders_21day_challenge_overrides_v4';
const STORAGE_CHECKLISTS_KEY = 'nh_traders_21day_challenge_checklists_v4';

export const Challenge21View: React.FC<Challenge21ViewProps> = ({
  trades = [],
  days = [],
  settings,
  onSelectDate,
  onTabChange,
}) => {
  const currSymbol = settings?.currency === 'USD' ? '$' : '₹';

  // Clean up any legacy test keys once on mount
  useEffect(() => {
    try {
      [
        'nh_traders_21day_challenge_state_v1',
        'nh_traders_21day_challenge_overrides_v2',
        'nh_traders_21day_challenge_overrides_v3',
        'nh_traders_21day_challenge_checklists_v2',
        'nh_traders_21day_challenge_checklists_v3',
        'nh_21day_challenge_state'
      ].forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }
  }, []);

  // Current system / actual date
  const todayStr = useMemo(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }, []);

  // Challenge Start Date & Mode
  const [startDate, setStartDate] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.startDate) return parsed.startDate;
      }
    } catch {
      // ignore
    }
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const [tradingDaysOnly, setTradingDaysOnly] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.tradingDaysOnly === 'boolean') return parsed.tradingDaysOnly;
      }
    } catch {
      // ignore
    }
    return true; // Trading days (Mon-Fri)
  });

  // Status overrides for specific dates - completely empty by default for new users!
  const [statusOverrides, setStatusOverrides] = useState<Record<string, DayChallengeStatus>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_OVERRIDES_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });

  // Checklist storage per date
  const [dailyChecklists, setDailyChecklists] = useState<Record<string, typeof CHECKLIST_DEFAULT>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CHECKLISTS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });

  // Persist config and overrides
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_SETTINGS_KEY,
        JSON.stringify({ startDate, tradingDaysOnly })
      );
    } catch {
      // ignore
    }
  }, [startDate, tradingDaysOnly]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_OVERRIDES_KEY, JSON.stringify(statusOverrides));
    } catch {
      // ignore
    }
  }, [statusOverrides]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CHECKLISTS_KEY, JSON.stringify(dailyChecklists));
    } catch {
      // ignore
    }
  }, [dailyChecklists]);

  // Generate 21 Dynamic Challenge Days
  const challengeDays: ChallengeDayItem[] = useMemo(() => {
    const list: ChallengeDayItem[] = [];
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    const cursor = new Date(startYear, startMonth - 1, startDay);

    const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    let count = 0;
    while (count < 21) {
      const dayOfWeekNum = cursor.getDay();
      const isWeekend = dayOfWeekNum === 0 || dayOfWeekNum === 6;

      if (!tradingDaysOnly || !isWeekend) {
        count++;
        const y = cursor.getFullYear();
        const m = String(cursor.getMonth() + 1).padStart(2, '0');
        const d = String(cursor.getDate()).padStart(2, '0');
        const fullDate = `${y}-${m}-${d}`;
        const dateStr = `${cursor.getDate()} ${monthNamesShort[cursor.getMonth()]}`;
        const dayOfWeek = weekdayNames[dayOfWeekNum];

        // Find live trades on this date
        const dayTrades = trades.filter((t) => t.date === fullDate);
        const netR = dayTrades.reduce((acc, t) => acc + (t.rMultiple || 0), 0);
        const netPnl = dayTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);

        // Find live DayRecord
        const dayRecord = days.find((dr) => dr.date === fullDate);

        // Determine status: UNCHECKED / PENDING by default unless explicitly completed
        let status: DayChallengeStatus = 'PENDING';
        if (statusOverrides[fullDate]) {
          status = statusOverrides[fullDate];
        } else if (fullDate === todayStr) {
          // Current day is active in progress: ALWAYS 'TODAY' (gold ring, never auto-failed cross!)
          status = 'TODAY';
        } else if (dayRecord?.isDayClosed && dayTrades.length > 0) {
          const hasViolation = dayTrades.some(
            (t) => t.execution === 'VIOLATION' || t.tradeQuality === 'VIOLATION'
          );
          status = hasViolation ? 'FAILED' : 'CLEAN';
        } else if (dayRecord?.isNoTradeDay) {
          status = 'NO_TRADE';
        } else {
          status = 'PENDING';
        }

        list.push({
          dayNum: count,
          dateStr,
          fullDate,
          dayOfWeek,
          status,
          dayTrades,
          netR,
          netPnl,
        });
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    // If no day is marked as TODAY or completed yet, Day 1 is TODAY
    const hasActiveOrCompleted = list.some(
      (d) => d.status === 'TODAY' || d.status === 'CLEAN' || d.status === 'FAILED' || d.status === 'NO_TRADE'
    );
    if (!hasActiveOrCompleted && list.length > 0) {
      list[0].status = 'TODAY';
    }

    return list;
  }, [startDate, tradingDaysOnly, trades, days, statusOverrides, todayStr]);

  // Selected Day for interaction (default to Day 1)
  const [selectedDayNum, setSelectedDayNum] = useState<number>(1);

  const selectedDay = useMemo(() => {
    return challengeDays.find((d) => d.dayNum === selectedDayNum) || challengeDays[0];
  }, [challengeDays, selectedDayNum]);

  // Selected day checklist items
  const currentChecklist = useMemo(() => {
    if (selectedDay && dailyChecklists[selectedDay.fullDate]) {
      return dailyChecklists[selectedDay.fullDate];
    }
    return CHECKLIST_DEFAULT;
  }, [selectedDay, dailyChecklists]);

  // Derived Summary Metrics - 0 for new users with no data!
  const cleanDaysCount = useMemo(() => {
    return challengeDays.filter((d) => d.status === 'CLEAN').length;
  }, [challengeDays]);

  const violationDaysCount = useMemo(() => {
    return challengeDays.filter((d) => d.status === 'FAILED' || d.status === 'MINOR_VIOLATION').length;
  }, [challengeDays]);

  const noTradeDaysCount = useMemo(() => {
    return challengeDays.filter((d) => d.status === 'NO_TRADE').length;
  }, [challengeDays]);

  const completedDaysCount = useMemo(() => {
    return cleanDaysCount + violationDaysCount + noTradeDaysCount;
  }, [cleanDaysCount, violationDaysCount, noTradeDaysCount]);

  // Current active day (day matching today or next pending day)
  const currentActiveDay = useMemo(() => {
    const todayMatch = challengeDays.find((d) => d.status === 'TODAY');
    if (todayMatch) return todayMatch.dayNum;
    const firstPending = challengeDays.find((d) => d.status === 'PENDING');
    if (firstPending) return firstPending.dayNum;
    return 1;
  }, [challengeDays]);

  const progressPercent = Math.min(100, Math.round((completedDaysCount / 21) * 100));
  const daysLeft = Math.max(0, 21 - completedDaysCount);

  // Consecutive clean/no-trade streak
  const currentStreak = useMemo(() => {
    let streak = 0;
    for (const d of challengeDays) {
      if (d.status === 'CLEAN' || d.status === 'NO_TRADE') {
        streak++;
      } else if (d.status === 'FAILED' || d.status === 'MINOR_VIOLATION') {
        streak = 0;
      } else {
        break;
      }
    }
    return streak;
  }, [challengeDays]);

  // Rule adherence rate
  const ruleAdherence = useMemo(() => {
    const evaluated = cleanDaysCount + violationDaysCount;
    if (evaluated === 0) return 100;
    return Math.round((cleanDaysCount / evaluated) * 100);
  }, [cleanDaysCount, violationDaysCount]);

  // Average R of clean days
  const avgCleanR = useMemo(() => {
    const cleanTradingDays = challengeDays.filter(
      (d) => d.status === 'CLEAN' && d.dayTrades.length > 0
    );
    if (cleanTradingDays.length === 0) return 0.00;
    const totalR = cleanTradingDays.reduce((acc, d) => acc + d.netR, 0);
    return Number((totalR / cleanTradingDays.length).toFixed(2));
  }, [challengeDays]);



  // Actions
  const toggleChecklist = (id: string) => {
    if (!selectedDay) return;
    const updated = currentChecklist.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setDailyChecklists((prev) => ({
      ...prev,
      [selectedDay.fullDate]: updated,
    }));
  };

  const handleCompleteDay = () => {
    if (!selectedDay) return;
    const allChecked = currentChecklist.every((c) => c.checked);
    const hasTradeViolation = selectedDay.dayTrades.some(
      (t) => t.execution === 'VIOLATION' || t.tradeQuality === 'VIOLATION'
    );
    const newStatus: DayChallengeStatus = allChecked && !hasTradeViolation ? 'CLEAN' : 'FAILED';

    setStatusOverrides((prev) => ({
      ...prev,
      [selectedDay.fullDate]: newStatus,
    }));

    // Advance to next day if available
    if (selectedDayNum < 21) {
      setSelectedDayNum(selectedDayNum + 1);
    }
  };

  const handleSkipDay = () => {
    if (!selectedDay) return;
    setStatusOverrides((prev) => ({
      ...prev,
      [selectedDay.fullDate]: 'NO_TRADE',
    }));

    if (selectedDayNum < 21) {
      setSelectedDayNum(selectedDayNum + 1);
    }
  };

  const handleResetChallenge = () => {
    if (window.confirm('Reset all 21-Day Challenge progress and start fresh? All days will be unchecked.')) {
      setStatusOverrides({});
      setDailyChecklists({});
      setSelectedDayNum(1);
      try {
        localStorage.removeItem(STORAGE_OVERRIDES_KEY);
        localStorage.removeItem(STORAGE_CHECKLISTS_KEY);
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="space-y-5 animate-fade-in pb-16 text-[#1F1A16] dark:text-[#F0F4F8]">
      {/* 1. Header Banner with Panoramic Mountain Sunset Background */}
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-[#E7E0D6] dark:border-[#242D3D] shadow-xs min-h-[220px] sm:min-h-[250px] bg-[#F7F2EA] dark:bg-[#131822] flex items-center transition-colors">
        {/* Background Image: Panoramic Mountain Header */}
        <img
          src="/challenge-header-bg.png"
          alt="21 Days Challenge Summit"
          className="absolute inset-0 w-full h-full object-cover object-right pointer-events-none select-none"
        />

        {/* Soft Left Light/Dark Gradient to ensure crystal clear text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#FAF6EE] via-[#FAF6EE]/92 via-45% to-transparent dark:from-[#121722] dark:via-[#121722]/88 dark:via-50% dark:to-transparent pointer-events-none" />

        {/* Content Container */}
        <div className="relative z-10 p-6 sm:p-8 lg:p-10 w-full flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl space-y-2">
            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#F2ECE0]/90 dark:bg-[#1F293D] border border-[#DFD5C6] dark:border-[#2B3850] shadow-2xs">
              <span className="text-[10px] font-mono tracking-widest text-[#9B671B] dark:text-[#F59E0B] uppercase font-black">
                DISCIPLINE CHALLENGE
              </span>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#1F1A16] dark:text-[#F0F4F8]">
              21 Days Challenge
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base font-bold text-[#42382E] dark:text-[#CBD5E1]">
              Build discipline. Master your execution.
            </p>

            {/* Description Paragraph */}
            <p className="text-xs sm:text-sm text-[#786F66] dark:text-[#94A3B8] leading-relaxed max-w-lg">
              Follow your trading rules for 21 consecutive trading days. This challenge is not about profits — it's about becoming a better trader.
            </p>
          </div>

          {/* Right Artistic Calligraphy PNG (Small Steps Big Results) */}
          <div className="hidden lg:flex items-center self-center pr-6 select-none">
            <img
              src="/small-steps-big-results.png"
              alt="Small Steps Big Results"
              className="h-20 sm:h-24 md:h-28 w-auto object-contain pointer-events-none select-none drop-shadow-md"
            />
          </div>
        </div>
      </div>

      {/* 2. Middle Row: Progress Card (8 cols) + Quote Box (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Your Progress */}
        <div className="lg:col-span-8 bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 shadow-2xs flex flex-col justify-between transition-colors">
          <div>
            {/* Header: Title + Day X of 21 + % */}
            <div className="flex items-center justify-between pb-3">
              <h2 className="text-base font-black text-[#1F1A16] dark:text-[#F0F4F8]">
                Your Progress
              </h2>
              <div className="flex items-baseline gap-2">
                <span className="text-xs sm:text-sm font-bold text-[#786F66] dark:text-[#94A3B8]">
                  Day {currentActiveDay} of 21
                </span>
                <span className="text-xl sm:text-2xl font-black text-[#1F1A16] dark:text-[#F0F4F8]">
                  {progressPercent}%
                </span>
              </div>
            </div>

            {/* Solid Orange/Gold Progress Bar */}
            <div className="w-full h-3 sm:h-3.5 bg-[#EAE2D5] dark:bg-[#1E2738] rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-[#D97706] to-[#E08A2B] rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.min(100, Math.max(5, progressPercent))}%` }}
              />
            </div>
          </div>

          {/* 4 Stat Cards Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
            {/* 1. Day Streak */}
            <div className="bg-[#FAF2E6] dark:bg-[#1A2230] border border-[#EBE1D2] dark:border-[#253044] rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#FEEED8] dark:bg-[#2C1F14] text-[#E08A2B] flex items-center justify-center shrink-0">
                <Flame className="w-5 h-5 fill-current" />
              </div>
              <div>
                <div className="text-xl font-black text-[#1F1A16] dark:text-[#F0F4F8] leading-none">
                  {currentStreak}
                </div>
                <div className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] mt-0.5">
                  Day Streak
                </div>
              </div>
            </div>

            {/* 2. Clean Days */}
            <div className="bg-[#FAF2E6] dark:bg-[#1A2230] border border-[#EBE1D2] dark:border-[#253044] rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#E6F9F0] dark:bg-[#132A22] text-[#10B981] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-black text-[#1F1A16] dark:text-[#F0F4F8] leading-none">
                  {cleanDaysCount}
                </div>
                <div className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] mt-0.5">
                  Clean Days
                </div>
              </div>
            </div>

            {/* 3. Violation */}
            <div className="bg-[#FAF2E6] dark:bg-[#1A2230] border border-[#EBE1D2] dark:border-[#253044] rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#FEECEB] dark:bg-[#2D1616] text-[#DC2626] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-black text-[#1F1A16] dark:text-[#F0F4F8] leading-none">
                  {violationDaysCount}
                </div>
                <div className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] mt-0.5">
                  Violation
                </div>
              </div>
            </div>

            {/* 4. No-Trade Day */}
            <div className="bg-[#FAF2E6] dark:bg-[#1A2230] border border-[#EBE1D2] dark:border-[#253044] rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#ECE8DF] dark:bg-[#1E293B] text-[#64748B] flex items-center justify-center shrink-0">
                <CircleDot className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-black text-[#1F1A16] dark:text-[#F0F4F8] leading-none">
                  {noTradeDaysCount}
                </div>
                <div className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] mt-0.5">
                  No-Trade Day
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Quote Box */}
        <div className="lg:col-span-4 bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 shadow-2xs relative overflow-hidden flex flex-col justify-between transition-colors">
          <div className="relative z-10">
            <Quote className="w-7 h-7 text-[#D97706] dark:text-[#F59E0B] mb-2 fill-current opacity-75" />
            <p className="text-sm sm:text-base font-serif italic text-[#1F1A16] dark:text-[#F0F4F8] leading-relaxed">
              “Discipline is choosing between what you want now and what you want most.”
            </p>
          </div>
          <div className="relative z-10 mt-4 flex items-center justify-between">
            <span className="text-xs text-[#786F66] dark:text-[#94A3B8] font-medium">
              — Unknown
            </span>
            <button
              type="button"
              onClick={handleResetChallenge}
              className="text-[10px] text-[#9E958C] hover:text-[#DC2626] transition-colors flex items-center gap-1 cursor-pointer font-semibold"
              title="Reset challenge"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>

          {/* Subtle Pine Tree Watermark */}
          <div className="absolute right-2 bottom-1 text-[#E7E0D6]/40 dark:text-[#242D3D]/30 pointer-events-none select-none text-4xl">
            🌲
          </div>
        </div>
      </div>

      {/* 3. Main Grid Row: Challenge Calendar & Today's Checklist & Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Challenge Calendar + Bottom Split (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Card: Challenge Calendar */}
          <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 shadow-2xs transition-colors">
            {/* Header + Start Date Controller + Legend */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-black text-[#1F1A16] dark:text-[#F0F4F8]">
                  Challenge Calendar
                </h2>

                {/* Start Date Control */}
                <div className="flex items-center gap-1.5 bg-[#FAF2E6] dark:bg-[#1C2433] px-2.5 py-1 rounded-xl border border-[#DFD5C6] dark:border-[#2F3A4F] text-xs">
                  <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8]">Start:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-transparent text-xs font-mono font-bold text-[#1F1A16] dark:text-[#F0F4F8] outline-none cursor-pointer"
                  />
                </div>

                {/* Trading Days Toggle */}
                <button
                  type="button"
                  onClick={() => setTradingDaysOnly(!tradingDaysOnly)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all cursor-pointer ${
                    tradingDaysOnly
                      ? 'bg-[#D97706]/15 text-[#D97706] border border-[#D97706]/30'
                      : 'bg-[#ECE8DF] dark:bg-[#1E293B] text-[#786F66] dark:text-[#94A3B8]'
                  }`}
                  title="Toggle trading days (Mon-Fri) vs calendar days"
                >
                  {tradingDaysOnly ? 'Trading Days (M-F)' : 'All Days'}
                </button>
              </div>

              {/* Legend matching mockup */}
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-[#786F66] dark:text-[#94A3B8]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] inline-block" />
                  <span>Clean</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[8px] border-b-[#F59E0B] inline-block" />
                  <span>Minor Violation</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] inline-block" />
                  <span>Failed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#64748B] inline-block" />
                  <span>No Trade</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full border-2 border-[#D97706] inline-block" />
                  <span>Today</span>
                </div>
              </div>
            </div>

            {/* 3 Rows of 7 Days Grid */}
            <div className="grid grid-cols-7 gap-2 sm:gap-2.5 pt-4">
              {challengeDays.map((item) => {
                const isSelected = selectedDayNum === item.dayNum;
                const isToday = item.status === 'TODAY' || item.fullDate === todayStr;
                const isClean = item.status === 'CLEAN';
                const isFailed = item.status === 'FAILED' || item.status === 'MINOR_VIOLATION';
                const isNoTrade = item.status === 'NO_TRADE';

                return (
                  <button
                    key={item.dayNum}
                    type="button"
                    onClick={() => setSelectedDayNum(item.dayNum)}
                    className={`flex flex-col items-center justify-between p-2 rounded-xl border transition-all cursor-pointer min-h-[76px] sm:min-h-[86px] text-center ${
                      isSelected
                        ? 'border-[#D97706] bg-[#FAF2E6] dark:bg-[#1E2638] ring-1 ring-[#D97706] shadow-xs'
                        : isToday
                        ? 'border-[#D97706]/70 bg-[#FFFBF5] dark:bg-[#201A12]'
                        : 'border-[#E7E0D6] dark:border-[#242D3D] bg-[#FFFFFF] dark:bg-[#171E2C] hover:border-[#D1C7BA]'
                    }`}
                  >
                    <div>
                      <div className="text-[10px] sm:text-[11px] font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                        Day {item.dayNum}
                      </div>
                      <div className="text-[9px] font-mono text-[#786F66] dark:text-[#94A3B8]">
                        {item.dateStr}
                      </div>
                    </div>

                    {/* Live Trade Outcome badge if trades occurred */}
                    {item.dayTrades.length > 0 && (
                      <span
                        className={`text-[8px] font-mono font-bold px-1 rounded ${
                          item.netR >= 0
                            ? 'text-[#10B981] bg-[#10B981]/10'
                            : 'text-[#EF4444] bg-[#EF4444]/10'
                        }`}
                      >
                        {item.netR >= 0 ? '+' : ''}{item.netR.toFixed(1)}R
                      </span>
                    )}

                    {/* Status Icon */}
                    <div className="mt-1 flex items-center justify-center">
                      {isClean && (
                        <div className="w-5 h-5 rounded-full bg-[#10B981] text-white flex items-center justify-center shadow-2xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                      {isFailed && (
                        <div className="w-5 h-5 rounded-full bg-[#EF4444] text-white flex items-center justify-center shadow-2xs">
                          <XIcon className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                      {isNoTrade && (
                        <div className="w-5 h-5 rounded-full bg-[#64748B] text-white flex items-center justify-center shadow-2xs">
                          <CircleDot className="w-3 h-3" />
                        </div>
                      )}
                      {item.status === 'TODAY' && (
                        <div className="w-5 h-5 rounded-full border-2 border-[#D97706] bg-transparent flex items-center justify-center" />
                      )}
                      {item.status === 'PENDING' && (
                        <div className="w-4 h-4 rounded-full border border-[#D1C7BA] dark:border-[#374151] bg-transparent" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Row under Calendar: Selected Day's Checklist + Challenge Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Today's Checklist */}
            <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 shadow-2xs flex flex-col justify-between transition-colors">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-[#D97706]" />
                    <h3 className="text-sm font-black text-[#1F1A16] dark:text-[#F0F4F8]">
                      Day {selectedDay?.dayNum} Checklist
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-[#786F66] dark:text-[#94A3B8]">
                    {selectedDay?.fullDate} ({selectedDay?.dayOfWeek})
                  </span>
                </div>

                {/* Day Trades Mini-Summary if any exist on this date */}
                {selectedDay && selectedDay.dayTrades.length > 0 && (
                  <div className="py-2.5 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-[#786F66] dark:text-[#94A3B8]">
                        Trades Logged ({selectedDay.dayTrades.length}):
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectDate?.(selectedDay.fullDate);
                          onTabChange?.('journal');
                        }}
                        className="text-[10px] font-bold text-[#D97706] hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        View in Journal <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      {selectedDay.dayTrades.map((t, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-[11px] bg-white dark:bg-[#171E2C] px-2 py-1 rounded-lg border border-[#E7E0D6] dark:border-[#242D3D]"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#1F1A16] dark:text-[#F0F4F8]">{t.pair}</span>
                            <span className={t.order === 'BUY' ? 'text-[#10B981] font-bold' : 'text-[#EF4444] font-bold'}>
                              {t.order}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 font-mono">
                            <span className={t.rMultiple >= 0 ? 'text-[#10B981] font-bold' : 'text-[#EF4444] font-bold'}>
                              {t.rMultiple >= 0 ? '+' : ''}{t.rMultiple}R
                            </span>
                            <span className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">
                              ({currSymbol}{t.pnl.toFixed(2)})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 7 Checklist Checkboxes */}
                <div className="space-y-2 py-3">
                  {currentChecklist.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-2.5 text-xs text-[#1F1A16] dark:text-[#F0F4F8] cursor-pointer group select-none hover:text-[#D97706] transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => toggleChecklist(item.id)}
                        className="w-4 h-4 rounded border-[#D1C7BA] dark:border-[#374151] text-[#D97706] focus:ring-[#D97706] cursor-pointer"
                      />
                      <span className={item.checked ? 'line-through text-[#9E958C]' : 'font-medium'}>
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-[#E7E0D6]/60 dark:border-[#242D3D]">
                <button
                  type="button"
                  onClick={handleCompleteDay}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  Complete Day
                </button>
                <button
                  type="button"
                  onClick={handleSkipDay}
                  className="w-full py-2 px-4 rounded-xl bg-[#FAF2E6] dark:bg-[#1C2433] hover:bg-[#F2ECE0] dark:hover:bg-[#253044] border border-[#DFD5C6] dark:border-[#2F3A4F] text-[#786F66] dark:text-[#CBD5E1] font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Skip Day (No Trade)
                </button>
              </div>
            </div>

            {/* Card 2: Challenge Stats */}
            <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 shadow-2xs flex flex-col justify-between transition-colors">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#D97706]" />
                    <h3 className="text-sm font-black text-[#1F1A16] dark:text-[#F0F4F8]">
                      Challenge Stats
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => onTabChange?.('analytics')}
                    className="text-[11px] font-bold text-[#D97706] hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    View Details →
                  </button>
                </div>

                {/* 2x3 Metric Grid */}
                <div className="grid grid-cols-3 gap-2.5 py-3">
                  <div className="bg-white dark:bg-[#171E2C] border border-[#E7E0D6] dark:border-[#242D3D] rounded-xl p-2.5 text-center">
                    <div className="text-xl font-black text-[#10B981] leading-none">
                      {cleanDaysCount}
                    </div>
                    <div className="text-[9px] font-bold text-[#786F66] dark:text-[#94A3B8] mt-1 truncate">
                      Clean Days
                    </div>
                  </div>

                  <div className="bg-white dark:bg-[#171E2C] border border-[#E7E0D6] dark:border-[#242D3D] rounded-xl p-2.5 text-center">
                    <div className="text-xl font-black text-[#EF4444] leading-none">
                      {violationDaysCount}
                    </div>
                    <div className="text-[9px] font-bold text-[#786F66] dark:text-[#94A3B8] mt-1 truncate">
                      Violation Day
                    </div>
                  </div>

                  <div className="bg-white dark:bg-[#171E2C] border border-[#E7E0D6] dark:border-[#242D3D] rounded-xl p-2.5 text-center">
                    <div className="text-xl font-black text-[#64748B] leading-none">
                      {noTradeDaysCount}
                    </div>
                    <div className="text-[9px] font-bold text-[#786F66] dark:text-[#94A3B8] mt-1 truncate">
                      No-Trade Day
                    </div>
                  </div>

                  <div className="bg-white dark:bg-[#171E2C] border border-[#E7E0D6] dark:border-[#242D3D] rounded-xl p-2.5 text-center">
                    <div className="text-xl font-black text-[#4F46E5] leading-none">
                      {currentStreak}
                    </div>
                    <div className="text-[9px] font-bold text-[#786F66] dark:text-[#94A3B8] mt-1 truncate">
                      Longest Streak
                    </div>
                  </div>

                  <div className="bg-white dark:bg-[#171E2C] border border-[#E7E0D6] dark:border-[#242D3D] rounded-xl p-2.5 text-center">
                    <div className="text-xl font-black text-[#10B981] leading-none">
                      {ruleAdherence}%
                    </div>
                    <div className="text-[9px] font-bold text-[#786F66] dark:text-[#94A3B8] mt-1 truncate">
                      Rule Adherence
                    </div>
                  </div>

                  <div className="bg-white dark:bg-[#171E2C] border border-[#E7E0D6] dark:border-[#242D3D] rounded-xl p-2.5 text-center">
                    <div className="text-xl font-black text-[#0284C7] leading-none">
                      {avgCleanR}
                    </div>
                    <div className="text-[9px] font-bold text-[#786F66] dark:text-[#94A3B8] mt-1 truncate">
                      Avg. R (Clean)
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Habit Callout Banner with Leaf Branch Graphic */}
              <div className="mt-2 bg-[#FAF2E6] dark:bg-[#1E2638] border border-[#DFD5C6] dark:border-[#2B3850] rounded-xl p-3 flex items-center justify-between relative overflow-hidden">
                <div className="flex items-start gap-2.5 relative z-10">
                  <div className="w-7 h-7 rounded-lg bg-[#FEEED8] dark:bg-[#2C1F14] text-[#D97706] flex items-center justify-center shrink-0">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-[#1F1A16] dark:text-[#F0F4F8]">
                      Small habits. Big results.
                    </h4>
                    <p className="text-[10px] text-[#786F66] dark:text-[#94A3B8] mt-0.5 leading-snug max-w-[210px]">
                      You don't rise to the level of your goals, you fall to the level of your systems.
                    </p>
                  </div>
                </div>
                <div className="text-3xl opacity-40 select-none pointer-events-none pr-1">
                  🌿
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Challenge Rules (Card 1) + Days Remaining (Card 2) (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card 1: Challenge Rules */}
          <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 shadow-2xs transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[#D97706]" />
                <h3 className="text-sm font-black text-[#1F1A16] dark:text-[#F0F4F8]">
                  Challenge Rules
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold text-[#D97706] bg-[#D97706]/10 px-2 py-0.5 rounded-md">
                8 Core Rules
              </span>
            </div>

            {/* List of 8 Rules */}
            <div className="py-3 space-y-2.5">
              {[
                'Take only valid setups',
                'Follow your trading rules',
                'Risk within limit',
                'No revenge trading',
                'No FOMO / chasing',
                'Do not widen SL',
                'Complete daily journal',
                'No Trade is NOT a failed day',
              ].map((rule, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-xs text-[#1F1A16] dark:text-[#F0F4F8]">
                  <div className="w-4 h-4 rounded-full bg-[#10B981] text-white flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span className="font-medium">{rule}</span>
                </div>
              ))}
            </div>

            {/* Callout box */}
            <div className="mt-2 bg-[#FAF2E6] dark:bg-[#1E2638] border border-[#DFD5C6] dark:border-[#2B3850] rounded-xl p-2.5 flex items-center gap-2 text-[11px] text-[#786F66] dark:text-[#94A3B8]">
              <Info className="w-4 h-4 text-[#D97706] shrink-0" />
              <span>Consistency compounds. Stay honest with yourself.</span>
            </div>
          </div>

          {/* Card 2: Days Remaining with Circular Donut */}
          <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 shadow-2xs transition-colors">
            <div className="flex items-center gap-2 pb-3 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
              <CalendarIcon className="w-4 h-4 text-[#D97706]" />
              <h3 className="text-sm font-black text-[#1F1A16] dark:text-[#F0F4F8]">
                Days Remaining
              </h3>
            </div>

            <div className="flex items-center justify-between gap-4 pt-4">
              {/* Circular Donut Gauge: X Days Left */}
              <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  {/* Background ring */}
                  <path
                    className="text-[#E7E0D6] dark:text-[#242D3D]"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Active orange ring */}
                  <path
                    className="text-[#D97706]"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeDasharray={`${progressPercent}, 100`}
                    strokeLinecap="round"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black text-[#1F1A16] dark:text-[#F0F4F8] leading-none">
                    {daysLeft}
                  </span>
                  <span className="text-[9px] font-bold text-[#786F66] dark:text-[#94A3B8] mt-0.5">
                    Days Left
                  </span>
                </div>
              </div>

              {/* Motivation Callout with golden brush underline */}
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-serif italic text-[#1F1A16] dark:text-[#F0F4F8] leading-snug">
                  “Keep going! Discipline will take you further than motivation.”
                </p>
                <div className="w-16 h-1 bg-[#D97706] rounded-full mt-1.5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

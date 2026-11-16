import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Check,
  RotateCcw,
  Sparkles
} from 'lucide-react';

interface DatePickerDropdownProps {
  currentDate: string; // 'YYYY-MM-DD'
  onSelectDate: (newDate: string, isLive?: boolean) => void;
  isOpen: boolean;
  onClose: () => void;
  align?: 'left' | 'right';
  isLiveDate?: boolean;
}

export const getLocalDateIso = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const DatePickerDropdown: React.FC<DatePickerDropdownProps> = ({
  currentDate,
  onSelectDate,
  isOpen,
  onClose,
  align = 'right',
  isLiveDate = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current date
  const parseDate = (isoStr: string) => {
    try {
      const parts = isoStr.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0])) {
        return { year: parts[0], month: parts[1] - 1, day: parts[2] };
      }
    } catch {
      // fallback
    }
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
  };

  const parsed = parseDate(currentDate);
  const [viewYear, setViewYear] = useState(parsed.year);
  const [viewMonth, setViewMonth] = useState(parsed.month);

  useEffect(() => {
    const p = parseDate(currentDate);
    setViewYear(p.year);
    setViewMonth(p.month);
  }, [currentDate, isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const monthName = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Days calculation
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  // Monday start (0=Mon, 6=Sun)
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const padArray = Array.from({ length: startOffset }, (_, i) => i);

  const realTodayIso = getLocalDateIso();

  // Dynamic relative presets
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayIso = getLocalDateIso(yesterday);

  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const twoDaysAgoIso = getLocalDateIso(twoDaysAgo);

  // Start of this week (Monday)
  const monday = new Date();
  const dayOfWeek = monday.getDay();
  const diffToMon = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
  monday.setDate(monday.getDate() + diffToMon);
  const mondayIso = getLocalDateIso(monday);

  // Start of this month
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartIso = getLocalDateIso(monthStart);

  const presets = [
    { label: 'Today (Live Date)', date: realTodayIso, isLive: true },
    { label: 'Yesterday', date: yesterdayIso, isLive: false },
    { label: '2 Days Ago', date: twoDaysAgoIso, isLive: false },
    { label: 'Start of Week', date: mondayIso, isLive: false },
    { label: 'Start of Month', date: monthStartIso, isLive: false },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs z-40 sm:hidden" onClick={onClose} />

      <div
        ref={containerRef}
        className={`fixed inset-x-3 top-16 sm:absolute sm:top-full sm:mt-2 sm:inset-x-auto sm:w-80 bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl shadow-2xl p-4 z-50 animate-fade-in select-none text-[#1F1A16] dark:text-[#F0F4F8] transition-colors ${
          align === 'left' ? 'sm:left-0' : 'sm:right-0'
        }`}
      >
        {/* Live Tracking Header Button */}
        <div className="pb-3 border-b border-[#E7E0D6]/70 dark:border-[#242D3D]">
          <button
            type="button"
            onClick={() => {
              onSelectDate(realTodayIso, true);
              onClose();
            }}
            className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
              isLiveDate && currentDate === realTodayIso
                ? 'bg-[#E8F8EE] dark:bg-[#132A1C] border border-[#10B981] text-[#15803D] dark:text-[#10B981] shadow-2xs'
                : 'bg-white dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] text-[#1F1A16] dark:text-[#F0F4F8] hover:border-[#10B981]'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]" />
              </span>
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#10B981]" />
                <span>Follow Current Time (Live Mode)</span>
              </span>
            </div>
            {isLiveDate && currentDate === realTodayIso ? (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#10B981] text-white">
                ACTIVE
              </span>
            ) : (
              <RotateCcw className="w-3.5 h-3.5 text-[#786F66] dark:text-[#94A3B8]" />
            )}
          </button>
        </div>

        {/* Month Selector Bar */}
        <div className="flex items-center justify-between py-2.5 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="w-7 h-7 rounded-lg bg-white dark:bg-[#1A2230] hover:bg-[#F2ECE0] dark:hover:bg-[#222C3E] border border-[#E7E0D6] dark:border-[#283244] flex items-center justify-center text-[#5A5043] dark:text-[#94A3B8] transition-colors cursor-pointer"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8] tracking-tight">
            {monthName}
          </span>

          <button
            type="button"
            onClick={handleNextMonth}
            className="w-7 h-7 rounded-lg bg-white dark:bg-[#1A2230] hover:bg-[#F2ECE0] dark:hover:bg-[#222C3E] border border-[#E7E0D6] dark:border-[#283244] flex items-center justify-center text-[#5A5043] dark:text-[#94A3B8] transition-colors cursor-pointer"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 text-center py-2 text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8]">
          <span>Mo</span>
          <span>Tu</span>
          <span>We</span>
          <span>Th</span>
          <span>Fr</span>
          <span>Sa</span>
          <span>Su</span>
        </div>

        {/* Day Cells Grid */}
        <div className="grid grid-cols-7 gap-1 text-center pb-3">
          {padArray.map((i) => (
            <div key={`pad-${i}`} className="w-8 h-8" />
          ))}

          {daysArray.map((d) => {
            const mStr = String(viewMonth + 1).padStart(2, '0');
            const dStr = String(d).padStart(2, '0');
            const dateStr = `${viewYear}-${mStr}-${dStr}`;
            const isSelected = dateStr === currentDate;
            const isToday = dateStr === realTodayIso;

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => {
                  onSelectDate(dateStr, dateStr === realTodayIso);
                  onClose();
                }}
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all flex items-center justify-center relative cursor-pointer ${
                  isSelected
                    ? 'bg-[#10B981] text-white font-bold shadow-xs scale-105'
                    : 'hover:bg-[#E8F8EE] dark:hover:bg-[#1A2230] hover:text-[#10B981] text-[#1F1A16] dark:text-[#F0F4F8]'
                }`}
              >
                <span>{d}</span>
                {isToday && !isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] absolute bottom-1" />
                )}
              </button>
            );
          })}
        </div>

        {/* Native HTML5 Calendar Picker Row */}
        <div className="pt-2.5 border-t border-[#E7E0D6]/60 dark:border-[#242D3D] space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider flex items-center gap-1">
              <CalendarIcon className="w-3 h-3 text-[#10B981]" />
              <span>Custom Date</span>
            </span>
            <input
              type="date"
              value={currentDate}
              onChange={(e) => {
                if (e.target.value) {
                  onSelectDate(e.target.value, e.target.value === realTodayIso);
                  onClose();
                }
              }}
              className="px-2 py-1 bg-white dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] rounded-lg text-xs font-mono font-bold text-[#1F1A16] dark:text-[#F0F4F8] focus:border-[#10B981] outline-none cursor-pointer shadow-2xs"
            />
          </div>

          {/* Quick Session Jumps */}
          <div className="space-y-1 pt-1">
            <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider block">
              Quick Presets
            </span>
            <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-0.5">
              {presets.map((item) => {
                const isSel = currentDate === item.date;
                return (
                  <button
                    key={item.date}
                    type="button"
                    onClick={() => {
                      onSelectDate(item.date, item.isLive);
                      onClose();
                    }}
                    className={`text-left px-2 py-1 rounded-lg text-[10px] font-semibold transition-all flex items-center justify-between cursor-pointer ${
                      isSel
                        ? 'bg-[#E8F8EE] dark:bg-[#132A1C] text-[#15803D] dark:text-[#10B981] border border-[#B7ECC8] dark:border-[#10B981]/40'
                        : 'bg-white dark:bg-[#1A2230] hover:bg-[#F2ECE0] dark:hover:bg-[#222C3E] text-[#5A5043] dark:text-[#94A3B8] border border-[#E7E0D6] dark:border-[#283244]'
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
                    {isSel && <Check className="w-3 h-3 text-[#10B981] shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Check 
} from 'lucide-react';

interface DatePickerDropdownProps {
  currentDate: string; // 'YYYY-MM-DD'
  onSelectDate: (newDate: string) => void;
  isOpen: boolean;
  onClose: () => void;
  align?: 'left' | 'right';
}

export const DatePickerDropdown: React.FC<DatePickerDropdownProps> = ({
  currentDate,
  onSelectDate,
  isOpen,
  onClose,
  align = 'right',
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

  const realTodayIso = new Date().toISOString().split('T')[0];

  const presets = [
    { label: '05 Oct 2026 (Mon • Active)', date: '2026-10-05' },
    { label: '04 Oct 2026 (Sun)', date: '2026-10-04' },
    { label: '03 Oct 2026 (Sat)', date: '2026-10-03' },
    { label: '02 Oct 2026 (Fri)', date: '2026-10-02' },
    { label: '01 Oct 2026 (Thu)', date: '2026-10-01' },
    { label: 'Today (Live Date)', date: realTodayIso },
  ];

  return (
    <div
      ref={containerRef}
      className={`absolute top-full mt-2 w-80 bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl shadow-2xl p-4 z-50 animate-fade-in select-none text-[#1F1A16] ${
        align === 'left' ? 'left-0' : 'right-0'
      }`}
    >
      {/* Month Selector Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="w-7 h-7 rounded-lg bg-white hover:bg-[#F2ECE0] border border-[#E7E0D6] flex items-center justify-center text-[#5A5043] transition-colors"
          title="Previous Month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="text-xs font-bold text-[#1F1A16] tracking-tight">
          {monthName}
        </span>

        <button
          type="button"
          onClick={handleNextMonth}
          className="w-7 h-7 rounded-lg bg-white hover:bg-[#F2ECE0] border border-[#E7E0D6] flex items-center justify-center text-[#5A5043] transition-colors"
          title="Next Month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 text-center py-2 text-[10px] font-bold text-[#9E958C]">
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
                onSelectDate(dateStr);
                onClose();
              }}
              className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all flex items-center justify-center relative ${
                isSelected
                  ? 'bg-[#DB9F35] text-white font-bold shadow-xs scale-105'
                  : 'hover:bg-[#F0E5D3] hover:text-[#7A4B10] text-[#1F1A16]'
              }`}
            >
              <span>{d}</span>
              {isToday && !isSelected && (
                <span className="w-1 h-1 rounded-full bg-[#DB9F35] absolute bottom-1" />
              )}
            </button>
          );
        })}
      </div>

      {/* Native HTML5 Calendar Picker Row */}
      <div className="pt-2.5 border-t border-[#E7E0D6] space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[10px] font-bold text-[#786F66] uppercase tracking-wider flex items-center gap-1">
            <CalendarIcon className="w-3 h-3 text-[#DB9F35]" />
            <span>Custom Date</span>
          </span>
          <input
            type="date"
            value={currentDate}
            onChange={(e) => {
              if (e.target.value) {
                onSelectDate(e.target.value);
                onClose();
              }
            }}
            className="px-2 py-1 bg-white border border-[#E7E0D6] rounded-lg text-xs font-mono font-bold text-[#1F1A16] focus:border-[#DB9F35] outline-none cursor-pointer shadow-2xs"
          />
        </div>

        {/* Quick Session Jumps */}
        <div className="space-y-1 pt-1">
          <span className="text-[10px] font-bold text-[#786F66] uppercase tracking-wider block">
            Session Jump
          </span>
          <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-0.5">
            {presets.map((item) => {
              const isSel = currentDate === item.date;
              return (
                <button
                  key={item.date}
                  type="button"
                  onClick={() => {
                    onSelectDate(item.date);
                    onClose();
                  }}
                  className={`text-left px-2 py-1 rounded-lg text-[10px] font-semibold transition-all flex items-center justify-between ${
                    isSel
                      ? 'bg-[#F0E5D3] text-[#7A4B10] border border-[#E2D1B8]'
                      : 'bg-white hover:bg-[#F2ECE0] text-[#5A5043] border border-[#E7E0D6]'
                  }`}
                >
                  <span className="truncate">{item.label}</span>
                  {isSel && <Check className="w-3 h-3 text-[#DB9F35] shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

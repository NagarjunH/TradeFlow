import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Trade, DayRecord } from '../db/db';

interface CalendarViewProps {
  trades: Trade[];
  days: DayRecord[];
  onSelectDate?: (dateStr: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  trades,
  days,
  onSelectDate,
}) => {
  const [currentDate, setCurrentDate] = useState(() => {
    if (trades.length > 0) {
      const dates = trades.map(t => t.date).sort();
      return new Date(dates[dates.length - 1]);
    }
    return new Date();
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const setToday = () => {
    setCurrentDate(new Date());
  };

  const firstDayIndex = new Date(year, month, 1).getDay();
  const adjustedFirstDay = (firstDayIndex + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const tradesByDate: Record<string, Trade[]> = {};
  trades.forEach((t) => {
    if (!tradesByDate[t.date]) tradesByDate[t.date] = [];
    tradesByDate[t.date].push(t);
  });

  const daysByDate: Record<string, DayRecord> = {};
  days.forEach((d) => {
    daysByDate[d.date] = d;
  });

  const weekHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="bg-white border border-[#E7E0D6] rounded-2xl p-5 shadow-xs flex flex-col justify-between h-full">
      {/* Header matching mockup */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E7E0D6]/60">
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-1 rounded-md hover:bg-[#FAF7F2] text-[#786F66] hover:text-[#1F1A16] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs sm:text-sm font-extrabold text-[#1F1A16]">
            {monthNames[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-1 rounded-md hover:bg-[#FAF7F2] text-[#786F66] hover:text-[#1F1A16] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={setToday}
            className="px-2.5 py-1 rounded-lg bg-[#FAF7F2] border border-[#E7E0D6] text-[11px] font-bold text-[#1F1A16] hover:bg-[#F3EDE2] transition-colors shadow-2xs"
          >
            Today
          </button>

          {/* Legend matching mockup */}
          <div className="hidden sm:flex items-center gap-2 text-[10px] text-[#786F66]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#16A34A]" /> Profit
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#DC2626]" /> Loss
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#9E958C]" /> No Trade
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#EAB308]" /> BE
            </span>
          </div>
        </div>
      </div>

      {/* Grid of Days */}
      <div className="grid grid-cols-7 gap-1 pt-2">
        {weekHeaders.map((d) => (
          <div key={d} className="text-center text-[10px] font-bold text-[#9E958C] py-1">
            {d}
          </div>
        ))}

        {Array.from({ length: adjustedFirstDay }).map((_, idx) => (
          <div key={`blank-${idx}`} className="h-12 rounded-lg bg-transparent" />
        ))}

        {daysArray.map((dayNum) => {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          const dayTrades = tradesByDate[dateStr] || [];
          const dayRecord = daysByDate[dateStr];
          const hasTrades = dayTrades.length > 0;
          const isNoTradeDay = dayRecord?.isNoTradeDay;

          let dayR = 0;

          dayTrades.forEach((t) => {
            dayR += t.rMultiple;
          });

          let pillBg = '';
          let pillText = '';

          if (hasTrades) {
            if (dayR > 0.05) {
              pillBg = 'bg-[#E8F8EE] border-[#B7ECC8] text-[#15803D]';
              pillText = `+${dayR.toFixed(1)}R`;
            } else if (dayR < -0.05) {
              pillBg = 'bg-[#FEECEB] border-[#FBC5C2] text-[#B91C1C]';
              pillText = `${dayR.toFixed(1)}R`;
            } else {
              pillBg = 'bg-[#FEFCE8] border-[#FEF08A] text-[#A16207]';
              pillText = 'BE';
            }
          } else if (isNoTradeDay) {
            pillBg = 'bg-[#FAF7F2] border-[#E7E0D6] text-[#786F66]';
            pillText = '—';
          }

          const isToday = new Date().toISOString().split('T')[0] === dateStr;

          return (
            <div
              key={dayNum}
              onClick={() => onSelectDate && onSelectDate(dateStr)}
              className={`h-13 p-1 rounded-lg border transition-all cursor-pointer flex flex-col justify-between items-center text-center ${
                isToday 
                  ? 'border-[#DB9F35] bg-[#F0E5D3]/30 shadow-xs' 
                  : 'border-transparent hover:border-[#E7E0D6] hover:bg-[#FAF7F2]'
              }`}
            >
              <span className={`text-[10px] font-mono font-medium ${isToday ? 'font-black text-[#DB9F35]' : 'text-[#786F66]'}`}>
                {dayNum}
              </span>

              {pillText ? (
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border ${pillBg} leading-tight`}>
                  {pillText}
                </span>
              ) : (
                <span className="text-[9px] text-[#D8CEBF] font-mono leading-tight">—</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

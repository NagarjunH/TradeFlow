import React, { useState } from 'react';
import { Flame, Clock, ChevronDown, X, CheckCircle2 } from 'lucide-react';
import { getEventsForDate, type EconomicEvent } from '../services/economicCalendarService';

interface HighImpactMarqueeProps {
  currentDate?: string;
}

export const HighImpactMarquee: React.FC<HighImpactMarqueeProps> = ({ currentDate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const events: EconomicEvent[] = getEventsForDate(currentDate);

  const highImpactCount = events.filter((e) => e.impact === 'HIGH').length;

  return (
    <div className="relative flex-1 min-w-0 max-w-xl">
      {/* Marquee Pill Strip */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] hover:border-[#DC2626]/50 shadow-2xs transition-all cursor-pointer group overflow-hidden"
        title="Click to view full economic calendar for today (IST)"
      >
        {/* Red Icon / Volatility Indicator */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                highImpactCount > 0 ? 'bg-[#DC2626]' : 'bg-[#10B981]'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                highImpactCount > 0 ? 'bg-[#DC2626]' : 'bg-[#10B981]'
              }`}
            />
          </span>
          <span className="text-[10px] font-black uppercase tracking-wider text-[#DC2626] flex items-center gap-1">
            <Flame className="w-3 h-3 text-[#DC2626]" />
            <span className="hidden sm:inline">HIGH IMPACT (IST)</span>
          </span>
          <span className="text-[#9E958C] text-[10px]">|</span>
        </div>

        {/* Marquee Scrolling Content */}
        <div className="flex-1 overflow-hidden relative whitespace-nowrap">
          {events.length === 0 ? (
            <div className="flex items-center gap-1.5 text-xs text-[#10B981] font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Clean Market Session · No High-Impact Events Today</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-6 animate-marquee group-hover:[animation-play-state:paused]">
              {[...events, ...events].map((ev, i) => (
                <div key={`${ev.id}_${i}`} className="inline-flex items-center gap-2 text-xs shrink-0">
                  <span className="px-1.5 py-0.2 rounded font-mono text-[10px] font-bold bg-[#FAF2E6] dark:bg-[#1C2331] text-[#786F66] dark:text-[#94A3B8] border border-[#E8DCC8] dark:border-[#2E384D]">
                    {ev.timeIst}
                  </span>
                  <span className="font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                    [{ev.currency}] {ev.event}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                      ev.impact === 'HIGH'
                        ? 'bg-[#FEECEB] dark:bg-[#321B1B] text-[#DC2626]'
                        : 'bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35]'
                    }`}
                  >
                    {ev.impact}
                  </span>
                  <span className="text-[#CBD5E1] dark:text-[#334155]">•</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details Dropdown Indicator */}
        <div className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] group-hover:text-[#1F1A16] dark:group-hover:text-white">
          <span className="hidden md:inline">{events.length} Events</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Popover: Full Day Economic Calendar Modal/Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full mt-2 w-full max-w-lg bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xl z-50 animate-fade-in text-[#1F1A16] dark:text-[#F0F4F8]">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#FEECEB] dark:bg-[#321B1B] text-[#DC2626] flex items-center justify-center">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                    High-Impact Economic Calendar (IST)
                  </h4>
                  <p className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">
                    Indian Standard Time (UTC+5:30) · Major market catalysts
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-[#E7E0D6] dark:hover:bg-[#242D3D] text-[#786F66] dark:text-[#94A3B8]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-[#E7E0D6]/50 dark:divide-[#242D3D] mt-2 max-h-64 overflow-y-auto">
              {events.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#786F66] dark:text-[#94A3B8]">
                  No major economic releases scheduled for this date.
                </div>
              ) : (
                events.map((ev) => (
                  <div key={ev.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-[11px] font-bold text-[#DC2626] bg-[#FEECEB] dark:bg-[#321B1B] px-2 py-0.5 rounded-md shrink-0">
                        {ev.timeIst}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] font-mono border border-[#E8DCC8] dark:border-[#2E384D]">
                            {ev.currency}
                          </span>
                          <span>{ev.event}</span>
                        </div>
                        {(ev.forecast || ev.previous) && (
                          <div className="text-[10px] text-[#786F66] dark:text-[#94A3B8] font-mono mt-0.5">
                            Forecast: <b className="text-[#1F1A16] dark:text-white">{ev.forecast || '--'}</b> · Prior:{' '}
                            <b>{ev.previous || '--'}</b>
                          </div>
                        )}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        ev.impact === 'HIGH'
                          ? 'bg-[#DC2626] text-white'
                          : 'bg-[#DB9F35] text-white'
                      }`}
                    >
                      {ev.impact}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2.5 mt-2 border-t border-[#E7E0D6]/60 dark:border-[#242D3D] flex items-center justify-between text-[10px] text-[#786F66] dark:text-[#94A3B8]">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#10B981]" /> All times displayed in Indian Standard Time (IST)
              </span>
              <span className="text-[#DC2626] font-semibold">Avoid entering 10 mins before High Impact</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { Flame, Clock, ChevronDown, X, CheckCircle2, Zap, AlertTriangle } from 'lucide-react';
import { getEventsForDate, type EconomicEvent } from '../services/economicCalendarService';

interface HighImpactMarqueeProps {
  currentDate?: string;
  isMobile?: boolean;
}

export const HighImpactMarquee: React.FC<HighImpactMarqueeProps> = ({ currentDate, isMobile = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [impactFilter, setImpactFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM'>('ALL');
  const [currencyFilter, setCurrencyFilter] = useState<string>('ALL');

  const allEvents: EconomicEvent[] = useMemo(() => getEventsForDate(currentDate), [currentDate]);

  const highCount = useMemo(() => allEvents.filter((e) => e.impact === 'HIGH').length, [allEvents]);
  const mediumCount = useMemo(() => allEvents.filter((e) => e.impact === 'MEDIUM').length, [allEvents]);

  // Extract unique available currencies for filtering
  const availableCurrencies = useMemo(() => {
    return Array.from(new Set(allEvents.map((e) => e.currency)));
  }, [allEvents]);

  // Filtered list for the modal popover
  const filteredEvents = useMemo(() => {
    return allEvents.filter((ev) => {
      const matchImpact = impactFilter === 'ALL' || ev.impact === impactFilter;
      const matchCurrency = currencyFilter === 'ALL' || ev.currency === currencyFilter;
      return matchImpact && matchCurrency;
    });
  }, [allEvents, impactFilter, currencyFilter]);

  return (
    <div className={`relative min-w-0 ${isMobile ? 'w-full' : 'flex-1 max-w-xl'}`}>
      {/* Marquee Pill Strip */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] hover:border-[#DC2626]/50 shadow-2xs transition-all cursor-pointer group overflow-hidden w-full"
        title="Click to view full High & Medium impact economic releases for today (IST)"
      >
        {/* Volatility Indicator Icon */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                highCount > 0 
                  ? 'bg-[#DC2626]' 
                  : mediumCount > 0 
                    ? 'bg-[#D97706]' 
                    : 'bg-[#10B981]'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                highCount > 0 
                  ? 'bg-[#DC2626]' 
                  : mediumCount > 0 
                    ? 'bg-[#D97706]' 
                    : 'bg-[#10B981]'
              }`}
            />
          </span>
          <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
            highCount > 0 
              ? 'text-[#DC2626]' 
              : mediumCount > 0 
                ? 'text-[#D97706]' 
                : 'text-[#10B981]'
          }`}>
            {highCount > 0 ? (
              <Flame className="w-3 h-3 text-[#DC2626]" />
            ) : mediumCount > 0 ? (
              <Zap className="w-3 h-3 text-[#D97706]" />
            ) : (
              <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
            )}
            <span className="text-[9px] sm:text-[10px] whitespace-nowrap">
              {highCount > 0 
                ? (isMobile ? 'HIGH & MED' : 'HIGH & MED (IST)')
                : mediumCount > 0 
                  ? (isMobile ? 'MED IMPACT' : 'MED IMPACT (IST)')
                  : (isMobile ? 'CLEAN' : 'CLEAN SESSION')}
            </span>
          </span>
          <span className="text-[#9E958C] text-[10px]">|</span>
        </div>

        {/* Marquee Scrolling Content */}
        <div className="flex-1 overflow-hidden relative whitespace-nowrap min-w-0">
          {allEvents.length === 0 ? (
            <div className="flex items-center gap-1.5 text-xs text-[#10B981] font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Clean Market Session · No High or Medium Events Today</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-5 sm:gap-6 animate-marquee group-hover:[animation-play-state:paused]">
              {[...allEvents, ...allEvents].map((ev, i) => (
                <div key={`${ev.id}_${i}`} className="inline-flex items-center gap-2 text-xs shrink-0">
                  <span className="px-1.5 py-0.2 rounded font-mono text-[9px] sm:text-[10px] font-bold bg-[#FAF2E6] dark:bg-[#1C2331] text-[#786F66] dark:text-[#94A3B8] border border-[#E8DCC8] dark:border-[#2E384D]">
                    {ev.timeIst}
                  </span>
                  <span className="font-bold text-[#1F1A16] dark:text-[#F0F4F8] text-[11px] sm:text-xs">
                    [{ev.currency}] {ev.event}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[8px] sm:text-[9px] font-black uppercase ${
                      ev.impact === 'HIGH'
                        ? 'bg-[#DC2626] text-white shadow-2xs'
                        : 'bg-[#D97706] text-white shadow-2xs'
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
          <span className="hidden sm:inline">
            {highCount > 0 && <span className="text-[#DC2626]">🔥 {highCount}</span>}
            {highCount > 0 && mediumCount > 0 && <span className="mx-1">·</span>}
            {mediumCount > 0 && <span className="text-[#D97706]">⚡ {mediumCount}</span>}
            {highCount === 0 && mediumCount === 0 && <span>0 Events</span>}
          </span>
          <span className="sm:hidden">{allEvents.length}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Popover: Full Day Economic Calendar Modal/Dropdown (Responsive for mobile & desktop) */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-2xs cursor-default" onClick={() => setIsOpen(false)} />
          <div className="fixed inset-x-3 top-20 sm:absolute sm:top-full sm:mt-2 sm:inset-x-auto sm:left-0 w-auto sm:w-[520px] sm:max-w-lg bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 sm:p-5 shadow-2xl z-50 animate-fade-in text-[#1F1A16] dark:text-[#F0F4F8] max-h-[85vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/70 dark:border-[#242D3D] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  highCount > 0 
                    ? 'bg-[#FEECEB] dark:bg-[#321B1B] text-[#DC2626]' 
                    : 'bg-[#FEF3C7] dark:bg-[#2D2311] text-[#D97706]'
                }`}>
                  {highCount > 0 ? <Flame className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                    Economic Calendar (IST)
                  </h4>
                  <p className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">
                    Verified High (🔴) &amp; Medium (🟠) volatility news releases
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[#E7E0D6] dark:hover:bg-[#242D3D] text-[#786F66] dark:text-[#94A3B8] cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Tabs: Impact Level + Currencies */}
            <div className="py-2.5 border-b border-[#E7E0D6]/60 dark:border-[#242D3D] space-y-2 shrink-0">
              {/* Impact Level Pills */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setImpactFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    impactFilter === 'ALL'
                      ? 'bg-[#1F1A16] dark:bg-white text-white dark:text-[#1F1A16] shadow-2xs'
                      : 'bg-white dark:bg-[#1A2230] text-[#786F66] dark:text-[#94A3B8] hover:bg-[#E7E0D6] dark:hover:bg-[#232B3A]'
                  }`}
                >
                  All ({allEvents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setImpactFilter('HIGH')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    impactFilter === 'HIGH'
                      ? 'bg-[#DC2626] text-white shadow-2xs'
                      : 'bg-white dark:bg-[#1A2230] text-[#DC2626] hover:bg-[#FEECEB] dark:hover:bg-[#321B1B]'
                  }`}
                >
                  <Flame className="w-2.5 h-2.5" />
                  High ({highCount})
                </button>
                <button
                  type="button"
                  onClick={() => setImpactFilter('MEDIUM')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    impactFilter === 'MEDIUM'
                      ? 'bg-[#D97706] text-white shadow-2xs'
                      : 'bg-white dark:bg-[#1A2230] text-[#D97706] hover:bg-[#FEF3C7] dark:hover:bg-[#2D2311]'
                  }`}
                >
                  <Zap className="w-2.5 h-2.5" />
                  Medium ({mediumCount})
                </button>
              </div>

              {/* Currency Filter Chips */}
              {availableCurrencies.length > 1 && (
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none text-[10px]">
                  <span className="text-[#9E958C] text-[9px] uppercase font-bold shrink-0 mr-1">Pairs:</span>
                  <button
                    type="button"
                    onClick={() => setCurrencyFilter('ALL')}
                    className={`px-2 py-0.5 rounded-md font-mono font-bold transition-colors cursor-pointer shrink-0 ${
                      currencyFilter === 'ALL'
                        ? 'bg-[#10B981] text-white'
                        : 'bg-[#E7E0D6]/60 dark:bg-[#1C2331] text-[#786F66] dark:text-[#94A3B8]'
                    }`}
                  >
                    ALL
                  </button>
                  {availableCurrencies.map((curr) => (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => setCurrencyFilter(curr)}
                      className={`px-2 py-0.5 rounded-md font-mono font-bold transition-colors cursor-pointer shrink-0 ${
                        currencyFilter === curr
                          ? 'bg-[#10B981] text-white'
                          : 'bg-[#E7E0D6]/60 dark:bg-[#1C2331] text-[#786F66] dark:text-[#94A3B8] hover:bg-[#E7E0D6]'
                      }`}
                    >
                      {curr}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Events List */}
            <div className="divide-y divide-[#E7E0D6]/50 dark:divide-[#242D3D] mt-1 overflow-y-auto flex-1 pr-1">
              {filteredEvents.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#786F66] dark:text-[#94A3B8]">
                  No matching economic releases found for this filter.
                </div>
              ) : (
                filteredEvents.map((ev) => (
                  <div key={ev.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Time Badge */}
                      <span className={`font-mono text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                        ev.impact === 'HIGH'
                          ? 'text-[#DC2626] bg-[#FEECEB] dark:bg-[#321B1B]'
                          : 'text-[#D97706] bg-[#FEF3C7] dark:bg-[#2D2311]'
                      }`}>
                        {ev.timeIst}
                      </span>

                      {/* Event Details */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-bold truncate">
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#FAF2E6] dark:bg-[#1C2331] text-[#1F1A16] dark:text-[#F0F4F8] font-mono border border-[#E8DCC8] dark:border-[#2E384D] shrink-0">
                            {ev.currency}
                          </span>
                          <span className="truncate text-[11px] sm:text-xs text-[#1F1A16] dark:text-[#F0F4F8]">
                            {ev.event}
                          </span>
                        </div>
                        {(ev.forecast || ev.previous) && (
                          <div className="text-[10px] text-[#786F66] dark:text-[#94A3B8] font-mono mt-0.5 truncate">
                            Forecast: <b className="text-[#1F1A16] dark:text-white">{ev.forecast || '--'}</b> · Prior:{' '}
                            <b>{ev.previous || '--'}</b>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Impact Tag Badge */}
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-black shrink-0 ${
                        ev.impact === 'HIGH'
                          ? 'bg-[#DC2626] text-white shadow-2xs'
                          : 'bg-[#D97706] text-white shadow-2xs'
                      }`}
                    >
                      {ev.impact}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Footer Risk Advisory */}
            <div className="pt-3 mt-2 border-t border-[#E7E0D6]/70 dark:border-[#242D3D] space-y-1.5 text-[10px] text-[#786F66] dark:text-[#94A3B8] shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#10B981]" /> All times displayed in Indian Standard Time (IST)
                </span>
                <span className="text-[#DC2626] font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Red: 10m freeze · Orange: 5m freeze
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

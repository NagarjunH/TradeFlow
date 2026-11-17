import React, { useState, useMemo } from 'react';
import { 
  Globe, 
  Calendar as CalendarIcon, 
  Flame, 
  Zap, 
  Clock, 
  TrendingDown, 
  TrendingUp, 
  Activity, 
  ShieldAlert, 
  Search, 
  ChevronRight, 
  ChevronLeft,
  Sparkles,
  Info,
  CheckCircle2
} from 'lucide-react';
import { 
  getEventSummary, 
  getFeaturedHistoricalSessions
} from '../services/economicCalendarService';
import { DatePickerDropdown, getLocalDateIso } from './DatePickerDropdown';

interface EconomicCalendarViewProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
}

export const EconomicCalendarView: React.FC<EconomicCalendarViewProps> = ({
  selectedDate,
  onSelectDate,
}) => {
  const [impactFilter, setImpactFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM'>('ALL');
  const [currencyFilter, setCurrencyFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [goldOnly, setGoldOnly] = useState<boolean>(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Get summary and all events for the current active date
  const summary = useMemo(() => getEventSummary(selectedDate), [selectedDate]);
  const featuredSessions = useMemo(() => getFeaturedHistoricalSessions(), []);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return summary.events.filter((ev) => {
      // 1. Impact filter
      if (impactFilter !== 'ALL' && ev.impact !== impactFilter) return false;
      // 2. Currency filter
      if (currencyFilter !== 'ALL' && ev.currency !== currencyFilter) return false;
      // 3. Gold only filter
      if (goldOnly && !ev.goldImpact) return false;
      // 4. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = ev.event.toLowerCase().includes(q);
        const matchesCurr = ev.currency.toLowerCase().includes(q);
        const matchesSummary = ev.goldImpact?.summary.toLowerCase().includes(q);
        if (!matchesName && !matchesCurr && !matchesSummary) return false;
      }
      return true;
    });
  }, [summary.events, impactFilter, currencyFilter, goldOnly, searchQuery]);

  // Format ISO date into human-friendly string (e.g. "Tuesday, 17 November 2026")
  const formattedDate = useMemo(() => {
    try {
      const parts = selectedDate.split('-');
      if (parts.length === 3) {
        const dt = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return dt.toLocaleDateString('en-US', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      }
    } catch {}
    return selectedDate;
  }, [selectedDate]);

  const todayIso = getLocalDateIso();
  const isToday = selectedDate === todayIso;

  // Step dates (prev / next day)
  const handleStepDay = (delta: number) => {
    try {
      const parts = selectedDate.split('-').map(Number);
      const dt = new Date(parts[0], parts[1] - 1, parts[2]);
      dt.setDate(dt.getDate() + delta);
      onSelectDate(getLocalDateIso(dt));
    } catch {}
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16 text-[#1F1A16] dark:text-[#F0F4F8] font-sans transition-colors">
      
      {/* 1. Header Banner & Date Selector */}
      <div className="bg-white dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 sm:p-6 shadow-2xs transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#FAF7F2] dark:bg-[#1C2331] border border-[#E7E0D6] dark:border-[#283244] text-[#10B981] shrink-0">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black uppercase tracking-wide">
                  Economic Calendar
                </h1>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] border border-[#E8DCC8] dark:border-[#2E384D]">
                  IST (UTC+5:30)
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#FEF3C7] dark:bg-[#2D2311] text-[#B45309] dark:text-[#FBBF24] border border-[#FDE68A] dark:border-[#78350F] flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> Gold (XAU/USD) Impact Tracked
                </span>
              </div>
              <p className="text-xs text-[#786F66] dark:text-[#94A3B8] mt-1">
                Verified macroeconomic release results and factual candlestick price movement in Gold
              </p>
            </div>
          </div>

          {/* Interactive Date Navigation Bar */}
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => handleStepDay(-1)}
              className="p-2 rounded-xl bg-[#FAF7F2] dark:bg-[#1A2230] hover:bg-[#F2ECE0] dark:hover:bg-[#232B3A] border border-[#E7E0D6] dark:border-[#283244] text-[#786F66] dark:text-[#94A3B8] transition-colors cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Date Picker Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                className="px-3.5 py-2 rounded-xl bg-[#FAF7F2] dark:bg-[#1A2230] hover:bg-[#F2ECE0] dark:hover:bg-[#232B3A] border border-[#E7E0D6] dark:border-[#283244] hover:border-[#10B981] text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
              >
                <CalendarIcon className="w-3.5 h-3.5 text-[#10B981]" />
                <span>{formattedDate}</span>
                {isToday && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" title="Today (Live)" />
                )}
              </button>

              <DatePickerDropdown
                currentDate={selectedDate}
                onSelectDate={(newDate) => {
                  onSelectDate(newDate);
                  setIsDatePickerOpen(false);
                }}
                isOpen={isDatePickerOpen}
                onClose={() => setIsDatePickerOpen(false)}
                align="right"
              />
            </div>

            <button
              type="button"
              onClick={() => handleStepDay(1)}
              className="p-2 rounded-xl bg-[#FAF7F2] dark:bg-[#1A2230] hover:bg-[#F2ECE0] dark:hover:bg-[#232B3A] border border-[#E7E0D6] dark:border-[#283244] text-[#786F66] dark:text-[#94A3B8] transition-colors cursor-pointer"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {!isToday && (
              <button
                type="button"
                onClick={() => onSelectDate(todayIso)}
                className="px-2.5 py-2 rounded-xl bg-[#E8F8EE] dark:bg-[#132A1C] border border-[#10B981] text-[#15803D] dark:text-[#34D399] text-xs font-bold transition-all cursor-pointer shadow-2xs hover:scale-102"
                title="Jump to Today"
              >
                Today
              </button>
            )}
          </div>
        </div>

        {/* Quick KPI Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 mt-5 border-t border-[#E7E0D6]/70 dark:border-[#242D3D]">
          <div className="p-3 rounded-xl bg-[#FAF7F2] dark:bg-[#161D2B] border border-[#E7E0D6]/60 dark:border-[#242D3D]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#786F66] dark:text-[#94A3B8]">
              Total Releases
            </p>
            <p className="text-lg font-black mt-0.5 font-mono">
              {summary.totalCount} Events
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#FEECEB] dark:bg-[#2A1616] border border-[#FCA5A5]/40 dark:border-[#7F1D1D]/40">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#DC2626] dark:text-[#F87171] flex items-center gap-1">
              <Flame className="w-3 h-3" /> High Impact (Red)
            </p>
            <p className="text-lg font-black mt-0.5 font-mono text-[#DC2626] dark:text-[#F87171]">
              {summary.highCount} Catalysts
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#FEF3C7] dark:bg-[#2D2311] border border-[#FDE68A]/40 dark:border-[#78350F]/40">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#D97706] dark:text-[#FBBF24] flex items-center gap-1">
              <Zap className="w-3 h-3" /> Medium Impact
            </p>
            <p className="text-lg font-black mt-0.5 font-mono text-[#D97706] dark:text-[#FBBF24]">
              {summary.mediumCount} Events
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#E8F8EE] dark:bg-[#132A1C] border border-[#86EFAC]/40 dark:border-[#065F46]/40">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#15803D] dark:text-[#34D399] flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Gold Moves Tracked
            </p>
            <p className="text-lg font-black mt-0.5 font-mono text-[#15803D] dark:text-[#34D399]">
              {summary.goldEventsCount} Price Actions
            </p>
          </div>
        </div>
      </div>

      {/* 2. Featured Historical Volatility Days (Quick Jump Bar) */}
      <div className="bg-white dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-[#DB9F35]" />
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#1F1A16] dark:text-[#F0F4F8]">
            Key Macro Sessions Archive (Quick Jump)
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {featuredSessions.map((s) => {
            const isSelected = selectedDate === s.date;
            return (
              <button
                key={s.date}
                type="button"
                onClick={() => onSelectDate(s.date)}
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#E8F8EE] dark:bg-[#132A1C] border-[#10B981] shadow-2xs'
                    : 'bg-[#FAF7F2] dark:bg-[#1A2230] border-[#E7E0D6]/70 dark:border-[#283244] hover:border-[#10B981]'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>{s.label}</span>
                  <span className="text-[10px] font-mono text-[#786F66] dark:text-[#94A3B8]">{s.date}</span>
                </div>
                <p className="text-[11px] text-[#786F66] dark:text-[#94A3B8] mt-1 font-mono leading-relaxed truncate">
                  {s.highlight}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Interactive Filtering Bar */}
      <div className="bg-white dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Impact Filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setImpactFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                impactFilter === 'ALL'
                  ? 'bg-[#1F1A16] dark:bg-white text-white dark:text-[#1F1A16] shadow-2xs'
                  : 'bg-[#FAF7F2] dark:bg-[#1A2230] text-[#786F66] dark:text-[#94A3B8] hover:bg-[#E7E0D6]'
              }`}
            >
              All Events ({summary.totalCount})
            </button>
            <button
              type="button"
              onClick={() => setImpactFilter('HIGH')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                impactFilter === 'HIGH'
                  ? 'bg-[#DC2626] text-white shadow-2xs'
                  : 'bg-[#FAF7F2] dark:bg-[#1A2230] text-[#DC2626] hover:bg-[#FEECEB] dark:hover:bg-[#321B1B]'
              }`}
            >
              <Flame className="w-3.5 h-3.5" /> High Impact ({summary.highCount})
            </button>
            <button
              type="button"
              onClick={() => setImpactFilter('MEDIUM')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                impactFilter === 'MEDIUM'
                  ? 'bg-[#D97706] text-white shadow-2xs'
                  : 'bg-[#FAF7F2] dark:bg-[#1A2230] text-[#D97706] hover:bg-[#FEF3C7] dark:hover:bg-[#2D2311]'
              }`}
            >
              <Zap className="w-3.5 h-3.5" /> Medium Impact ({summary.mediumCount})
            </button>
            <button
              type="button"
              onClick={() => setGoldOnly(!goldOnly)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                goldOnly
                  ? 'bg-[#FEF3C7] dark:bg-[#2D2311] border-[#B45309] text-[#B45309] dark:text-[#FBBF24] shadow-2xs'
                  : 'bg-[#FAF7F2] dark:bg-[#1A2230] border-[#E7E0D6] dark:border-[#283244] text-[#786F66] dark:text-[#94A3B8]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Gold Moves Only ({summary.goldEventsCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[200px] sm:min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#786F66] dark:text-[#94A3B8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search release (e.g. CPI, NFP, Retail)..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-[#FAF7F2] dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] focus:outline-none focus:border-[#10B981] transition-colors"
            />
          </div>
        </div>

        {/* Currency Filter Chips */}
        {summary.majorCurrencies.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs border-t border-[#E7E0D6]/60 dark:border-[#242D3D] pt-2.5">
            <span className="text-[10px] uppercase font-bold text-[#786F66] dark:text-[#94A3B8] shrink-0 mr-1">
              Currencies:
            </span>
            <button
              type="button"
              onClick={() => setCurrencyFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition-colors cursor-pointer shrink-0 ${
                currencyFilter === 'ALL'
                  ? 'bg-[#10B981] text-white shadow-2xs'
                  : 'bg-[#FAF7F2] dark:bg-[#1A2230] text-[#786F66] dark:text-[#94A3B8] hover:bg-[#E7E0D6]'
              }`}
            >
              ALL
            </button>
            {summary.majorCurrencies.map((curr) => (
              <button
                key={curr}
                type="button"
                onClick={() => setCurrencyFilter(curr)}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition-colors cursor-pointer shrink-0 ${
                  currencyFilter === curr
                    ? 'bg-[#10B981] text-white shadow-2xs'
                    : 'bg-[#FAF7F2] dark:bg-[#1A2230] text-[#786F66] dark:text-[#94A3B8] hover:bg-[#E7E0D6]'
                }`}
              >
                {curr}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. Main Event Cards with Real Gold (XAU/USD) Impact Breakdown */}
      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="bg-white dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-12 text-center shadow-2xs">
            <CheckCircle2 className="w-10 h-10 text-[#10B981] mx-auto mb-3 opacity-80" />
            <h3 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
              Clean Economic Session
            </h3>
            <p className="text-xs text-[#786F66] dark:text-[#94A3B8] mt-1 max-w-md mx-auto">
              No matching macroeconomic releases found for {formattedDate}. Market movement is primarily driven by technical structure.
            </p>
          </div>
        ) : (
          filteredEvents.map((ev) => {
            const hasGold = Boolean(ev.goldImpact);
            const gold = ev.goldImpact;

            return (
              <div
                key={ev.id}
                className="bg-white dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all space-y-4"
              >
                {/* Event Header Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[#E7E0D6]/60 dark:border-[#242D3D] pb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-[#FAF7F2] dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] text-[#1F1A16] dark:text-[#F0F4F8] shrink-0">
                      {ev.timeIst}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] border border-[#E8DCC8] dark:border-[#2E384D] shrink-0">
                      {ev.currency}
                    </span>
                    <h3 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8] truncate">
                      {ev.event}
                    </h3>
                  </div>

                  {/* Impact Tag Badge */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 ${
                        ev.impact === 'HIGH'
                          ? 'bg-[#DC2626] text-white shadow-2xs'
                          : 'bg-[#D97706] text-white shadow-2xs'
                      }`}
                    >
                      {ev.impact === 'HIGH' ? <Flame className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                      {ev.impact} IMPACT
                    </span>
                  </div>
                </div>

                {/* Macro Release Results Comparison (Actual vs Forecast vs Prior) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#FAF7F2] dark:bg-[#0E131C] p-3.5 rounded-xl border border-[#E7E0D6]/60 dark:border-[#242D3D] text-xs font-mono">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#786F66] dark:text-[#94A3B8]">
                      Actual (Result):
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-sm font-black text-[#1F1A16] dark:text-[#F0F4F8]">
                        {ev.actual || '--'}
                      </span>
                      {ev.outcome === 'BEAT' && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#E8F8EE] dark:bg-[#132A1C] text-[#15803D] dark:text-[#34D399]">
                          BEAT
                        </span>
                      )}
                      {ev.outcome === 'MISSED' && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#FEECEB] dark:bg-[#321B1B] text-[#DC2626] dark:text-[#F87171]">
                          MISSED
                        </span>
                      )}
                      {ev.outcome === 'IN_LINE' && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35]">
                          IN-LINE
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#786F66] dark:text-[#94A3B8]">
                      Forecast:
                    </span>
                    <p className="text-sm font-bold mt-0.5 text-[#5A5043] dark:text-[#CBD5E1]">
                      {ev.forecast || '--'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#786F66] dark:text-[#94A3B8]">
                      Previous (Prior):
                    </span>
                    <p className="text-sm font-bold mt-0.5 text-[#786F66] dark:text-[#94A3B8]">
                      {ev.previous || '--'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#786F66] dark:text-[#94A3B8]">
                      Status:
                    </span>
                    <p className="text-xs font-bold mt-1 text-[#10B981] flex items-center gap-1">
                      {ev.actual ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" /> Released
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 text-[#DB9F35]" /> Scheduled
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* 5. What Happened in Gold (XAU/USD Reaction Card) */}
                {hasGold && gold ? (
                  <div className="p-4 rounded-xl border transition-all bg-[#FFFDF5] dark:bg-[#1A1810] border-[#FDE68A] dark:border-[#78350F]/60">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#FDE68A]/60 dark:border-[#78350F]/40 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🪙</span>
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-wider text-[#B45309] dark:text-[#FBBF24]">
                            What Happened in Gold (XAU/USD)
                          </h4>
                          <p className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">
                            Verified 15-minute post-news candlestick reaction
                          </p>
                        </div>
                      </div>

                      {/* Direction & Pips Badge */}
                      <div className="flex items-center gap-2 shrink-0">
                        {gold.direction === 'BULLISH' && (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-[#E8F8EE] dark:bg-[#132A1C] text-[#15803D] dark:text-[#34D399] flex items-center gap-1 border border-[#86EFAC]/40">
                            <TrendingUp className="w-3.5 h-3.5" /> Bullish Spike (+{gold.pips} Pips)
                          </span>
                        )}
                        {gold.direction === 'BEARISH' && (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-[#FEECEB] dark:bg-[#321B1B] text-[#DC2626] dark:text-[#F87171] flex items-center gap-1 border border-[#FCA5A5]/40">
                            <TrendingDown className="w-3.5 h-3.5" /> Bearish Drop ({gold.pips} Pips)
                          </span>
                        )}
                        {gold.direction === 'WHIPSAW' && (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-[#FEF3C7] dark:bg-[#2D2311] text-[#B45309] dark:text-[#FBBF24] flex items-center gap-1 border border-[#FDE68A]/40">
                            <Activity className="w-3.5 h-3.5" /> Whipsaw Trap ({gold.pips > 0 ? `+${gold.pips}` : gold.pips} Pips)
                          </span>
                        )}
                        {gold.direction === 'NEUTRAL' && (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-[#FAF7F2] dark:bg-[#1C2331] text-[#786F66] dark:text-[#94A3B8] border border-[#E7E0D6]">
                            Rangebound / Neutral
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Pre vs Post Price Points (if recorded) */}
                    {(gold.preNewsPrice || gold.postNewsPrice) && (
                      <div className="flex items-center gap-4 text-xs font-mono pt-2.5 text-[#5A5043] dark:text-[#CBD5E1]">
                        {gold.preNewsPrice && (
                          <div>
                            <span className="text-[10px] uppercase text-[#786F66] dark:text-[#94A3B8]">Pre-News:</span>{' '}
                            <b>{gold.preNewsPrice}</b>
                          </div>
                        )}
                        <span className="text-[#9E958C]">➔</span>
                        {gold.postNewsPrice && (
                          <div>
                            <span className="text-[10px] uppercase text-[#786F66] dark:text-[#94A3B8]">Post-News:</span>{' '}
                            <b>{gold.postNewsPrice}</b>
                          </div>
                        )}
                        {gold.dollarMove != null && (
                          <span className={`font-bold ${gold.dollarMove >= 0 ? 'text-[#15803D] dark:text-[#34D399]' : 'text-[#DC2626] dark:text-[#F87171]'}`}>
                            ({gold.dollarMove >= 0 ? '+' : ''}${gold.dollarMove.toFixed(2)})
                          </span>
                        )}
                      </div>
                    )}

                    {/* Candlestick Summary Recap */}
                    <p className="text-xs text-[#1F1A16] dark:text-[#F0F4F8] leading-relaxed mt-2 pt-2 border-t border-[#FDE68A]/40 dark:border-[#78350F]/30 font-medium">
                      {gold.summary}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-[#FAF7F2]/80 dark:bg-[#141A26] border border-[#E7E0D6]/60 dark:border-[#242D3D] text-[11px] text-[#786F66] dark:text-[#94A3B8] flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-[#DB9F35]" />
                      <b>Pre-Release Playbook:</b> If actual beats forecast, look for USD strength &amp; Gold pullback. If actual misses, look for Gold bid.
                    </span>
                    <span className="font-mono text-[10px] uppercase text-[#9E958C]">Awaiting Post-Market Audit</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 6. Professional Trader News Execution Rules Banner */}
      <div className="bg-[#FAF7F2] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 shadow-2xs space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#DC2626] flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4" /> Professional News Execution Discipline Rules
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-[#786F66] dark:text-[#94A3B8] pt-1">
          <div className="p-2.5 rounded-xl bg-white dark:bg-[#1A2230] border border-[#E7E0D6]/60 dark:border-[#283244]">
            <b className="text-[#1F1A16] dark:text-[#F0F4F8] block mb-0.5">1. The 10-Minute Freeze</b>
            Never place new market orders 10 minutes before and 10 minutes after High-Impact red releases. Let spreads normalize.
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-[#1A2230] border border-[#E7E0D6]/60 dark:border-[#283244]">
            <b className="text-[#1F1A16] dark:text-[#F0F4F8] block mb-0.5">2. Slippage &amp; Spread Expansion</b>
            During NFP &amp; CPI, broker spreads on XAU/USD widen up to 30–60 points. Guaranteed stop-losses and limit orders must be respected.
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-[#1A2230] border border-[#E7E0D6]/60 dark:border-[#283244]">
            <b className="text-[#1F1A16] dark:text-[#F0F4F8] block mb-0.5">3. Trade the Aftermath (15m Candle)</b>
            Wait for the initial whipsaw candle to close. The second 15-minute candle reveals real institutional directional intention.
          </div>
        </div>
      </div>

    </div>
  );
};

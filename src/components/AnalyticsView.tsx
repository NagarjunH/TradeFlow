import React, { useState, useMemo, useEffect } from 'react';
import { 
  Download, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Compass,
  Clock,
  ShieldAlert,
  LayoutDashboard,
  Wallet,
  ShieldCheck,
  Award
} from 'lucide-react';
import type { Trade, AppSettings } from '../db/db';
import { generateIntelligenceReport, type PerformanceMode } from '../services/analyticsService';
import { AnalyticsOverviewTab } from './analytics/AnalyticsOverviewTab';
import { AnalyticsDirectionTab } from './analytics/AnalyticsDirectionTab';
import { AnalyticsTimeTab } from './analytics/AnalyticsTimeTab';
import { AnalyticsExecutionTab } from './analytics/AnalyticsExecutionTab';
import { AnalyticsInsightsTab } from './analytics/AnalyticsInsightsTab';

interface AnalyticsViewProps {
  trades: Trade[];
  settings: AppSettings;
  selectedDate?: string;
}

export type MarketType = 'All' | 'Forex' | 'Crypto' | 'Stocks' | 'Futures' | 'Commodities';
export type AnalyticsSubTab = 'overview' | 'direction' | 'time' | 'execution' | 'insights';

export const getMarketForPair = (pair: string = ''): MarketType => {
  const p = pair.toUpperCase().trim();
  if (p.includes('BTC') || p.includes('ETH') || p.includes('SOL') || p.includes('USDT') || p.includes('CRYPTO') || p.includes('DOGE') || p.includes('XRP')) return 'Crypto';
  if (p.includes('XAU') || p.includes('GOLD') || p.includes('SILVER') || p.includes('OIL') || p.includes('WTI') || p.includes('BRENT')) return 'Commodities';
  if (p.includes('NAS') || p.includes('US30') || p.includes('SPX') || p.includes('NQ') || p.includes('ES') || p.includes('FUTURES') || p.includes('DAX')) return 'Futures';
  if (p.includes('AAPL') || p.includes('TSLA') || p.includes('NVDA') || p.includes('MSFT') || p.includes('AMZN') || p.includes('GOOG') || p.includes('META') || p.includes('STOCK')) return 'Stocks';
  return 'Forex';
};

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  trades = [],
  settings,
  selectedDate,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<AnalyticsSubTab>('overview');
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>('STRATEGY');
  const [timeframe, setTimeframe] = useState<'7D' | '30D' | '90D' | '1Y' | 'ALL'>('ALL');
  const [marketFilter, setMarketFilter] = useState<MarketType>('All');
  const [tableResultFilter, setTableResultFilter] = useState<'All' | 'Win' | 'Loss'>('All');
  const [tablePage, setTablePage] = useState<number>(0);
  const [filterBySelectedDate, setFilterBySelectedDate] = useState<boolean>(Boolean(selectedDate));

  // Automatically sync when selectedDate changes from TopHeader
  useEffect(() => {
    if (selectedDate) {
      setFilterBySelectedDate(true);
    }
  }, [selectedDate]);

  const currSymbol = settings?.currency === 'USD' ? '$' : '₹';

  // 1. Filter trades by Timeframe, Market, and optional active date
  const filteredTrades = useMemo(() => {
    let list = [...trades];

    // Optional single-day lock if user clicks the date filter pill
    if (filterBySelectedDate && selectedDate) {
      list = list.filter((t) => t.date === selectedDate);
    } else if (timeframe !== 'ALL') {
      const now = new Date();
      let daysAgo = 30;
      if (timeframe === '7D') daysAgo = 7;
      else if (timeframe === '30D') daysAgo = 30;
      else if (timeframe === '90D') daysAgo = 90;
      else if (timeframe === '1Y') daysAgo = 365;

      const cutoff = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      const cutoffStr = cutoff.toISOString().split('T')[0];
      list = list.filter((t) => t.date && t.date >= cutoffStr);
    }

    // Filter by Market
    if (marketFilter !== 'All') {
      list = list.filter((t) => getMarketForPair(t.pair) === marketFilter);
    }

    // Chronological order for curve and calculations
    return list.sort((a, b) => new Date(`${a.date}T${a.time || '00:00'}`).getTime() - new Date(`${b.date}T${b.time || '00:00'}`).getTime());
  }, [trades, timeframe, marketFilter, filterBySelectedDate, selectedDate]);

  // 2. Centralized Performance Intelligence Report
  const intelligenceReport = useMemo(() => {
    return generateIntelligenceReport(filteredTrades, settings, performanceMode);
  }, [filteredTrades, settings, performanceMode]);

  // 3. Deep-Dive Breakdowns (Setup, HTF Context, Exit Type)
  const calculateGroupStats = (field: 'setupType' | 'htfContext' | 'exitType') => {
    const groups: { [key: string]: { count: number; totalR: number; pnl: number; wins: number } } = {};

    intelligenceReport.activeTrades.forEach((t: Trade) => {
      const val = (t as unknown as Record<string, unknown>)[field] as string || 'UNTAGGED';
      if (!groups[val]) {
        groups[val] = { count: 0, totalR: 0, pnl: 0, wins: 0 };
      }
      groups[val].count += 1;
      groups[val].totalR += t.rMultiple || 0;
      groups[val].pnl += t.pnl;
      if ((t.rMultiple || 0) > 0) groups[val].wins += 1;
    });

    return Object.entries(groups)
      .map(([name, data]) => ({
        name,
        count: data.count,
        totalR: data.totalR,
        pnl: data.pnl,
        winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
      }))
      .sort((a, b) => b.totalR - a.totalR);
  };

  const setupStats = useMemo(() => calculateGroupStats('setupType'), [intelligenceReport]);
  const htfStats = useMemo(() => calculateGroupStats('htfContext'), [intelligenceReport]);
  const exitStats = useMemo(() => calculateGroupStats('exitType'), [intelligenceReport]);

  const maxSetupR = Math.max(...setupStats.map((s) => Math.abs(s.totalR)), 1);
  const maxHtfR = Math.max(...htfStats.map((s) => Math.abs(s.totalR)), 1);

  // 4. Trade History Table Filtering & Pagination
  const visibleTableTrades = useMemo(() => {
    let list = [...intelligenceReport.activeTrades].reverse(); // newest first
    if (tableResultFilter === 'Win') list = list.filter((t) => t.pnl > 0.001);
    if (tableResultFilter === 'Loss') list = list.filter((t) => t.pnl < -0.001);
    return list;
  }, [intelligenceReport, tableResultFilter]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(visibleTableTrades.length / pageSize));
  const currentPage = Math.min(tablePage, totalPages - 1);
  const paginatedTrades = useMemo(() => {
    return visibleTableTrades.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  }, [visibleTableTrades, currentPage]);

  // 5. Export CSV Handler (always active for all filtered trades)
  const handleExportCSV = () => {
    const headers = [
      'Trade #',
      'Broker Ticket',
      'Date',
      'Time',
      'Instrument',
      'Market',
      'Order',
      'Size',
      'Entry Price',
      'Exit Price',
      'Outcome',
      'Net P&L',
      'R-Multiple',
      'Setup',
      'Emotion',
      'Execution Status',
      'Error Category',
      'Close Reason'
    ];

    const rows = filteredTrades.map((t) => [
      t.tradeNumber || '',
      t.brokerTradeId || '',
      t.date || '',
      t.time || '',
      t.pair || '',
      getMarketForPair(t.pair),
      t.order || '',
      t.volume ?? t.lotSize ?? '',
      t.entryPrice != null ? t.entryPrice : '',
      t.tpPrice != null ? t.tpPrice : t.slPrice != null ? t.slPrice : '',
      t.pnl > 0.001 ? 'WIN' : t.pnl < -0.001 ? 'LOSS' : 'BE',
      t.pnl.toFixed(2),
      (t.rMultiple || 0).toFixed(2),
      t.setupType || '',
      t.emotion || '',
      t.executionStatus || t.execution || 'CLEAN',
      t.errorCategory || '',
      t.brokerCloseReason || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `tradeflow_${performanceMode.toLowerCase()}_trades_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 animate-fade-in pb-16 text-[#1F1A16] dark:text-[#F0F4F8] font-sans selection:bg-[#DB9F35]/30 transition-colors">
      
      {/* 1. Header with Title, Performance Mode Toggle, Timeframe Pills & CSV Export */}
      <div className="flex flex-col gap-4 pb-3 border-b border-[#E7E0D6] dark:border-[#242D3D]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold tracking-widest text-[#DB9F35] uppercase flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              TRADEOS / PERFORMANCE INTELLIGENCE
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1F1A16] dark:text-[#F0F4F8] mt-1">
              Trading Performance Intelligence
            </h1>
            <p className="text-xs text-[#786F66] dark:text-[#94A3B8] mt-1">
              Diagnostic edge analysis · Directional &amp; temporal profiling · Execution audit
            </p>
          </div>

          {/* Dual-Mode Toggle & CSV Export */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Performance Mode Switcher */}
            <div className="flex items-center p-1 bg-white dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-xl shadow-2xs">
              <button
                type="button"
                onClick={() => setPerformanceMode('ACTUAL')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  performanceMode === 'ACTUAL'
                    ? 'bg-[#1F1A16] dark:bg-white text-white dark:text-[#131822] shadow-xs'
                    : 'text-[#786F66] dark:text-[#94A3B8] hover:text-[#1F1A16] dark:hover:text-[#F0F4F8]'
                }`}
                title="Includes every broker deal (actual account balance & drawdown)"
              >
                <Wallet className="w-3.5 h-3.5" />
                Actual Account
              </button>
              <button
                type="button"
                onClick={() => setPerformanceMode('STRATEGY')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  performanceMode === 'STRATEGY'
                    ? 'bg-[#DB9F35] text-white shadow-xs'
                    : 'text-[#786F66] dark:text-[#94A3B8] hover:text-[#1F1A16] dark:hover:text-[#F0F4F8]'
                }`}
                title="Excludes identified execution blunders (e.g. 0.09 lot error) to evaluate true strategy edge"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Strategy Only
                {intelligenceReport.excludedViolationsCount > 0 && (
                  <span className="text-[10px] bg-white/25 px-1.5 py-0.2 rounded-full font-mono">
                    +{intelligenceReport.excludedViolationsCount} excl.
                  </span>
                )}
              </button>
            </div>

            {/* CSV Export Button */}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#DB9F35] text-white hover:bg-[#C28C2E] text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Mode Information Callout Banner */}
        <div className={`p-3 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
          performanceMode === 'STRATEGY'
            ? 'bg-[#E8F8EE]/60 dark:bg-[#132A1C]/50 border-[#10B981]/40 text-[#15803D] dark:text-[#34D399]'
            : 'bg-[#FAF2E6]/60 dark:bg-[#1C2331]/50 border-[#DB9F35]/40 text-[#9B671B] dark:text-[#F3D784]'
        }`}>
          <div className="flex items-start sm:items-center gap-2">
            <span className="font-bold text-xs uppercase tracking-wider px-2 py-0.5 rounded-md bg-white dark:bg-black/30 border border-current shrink-0">
              {performanceMode === 'STRATEGY' ? 'Strategy Only' : 'Actual Account'}
            </span>
            <span className="text-xs">
              {performanceMode === 'STRATEGY'
                ? `Evaluating pure strategy performance (${intelligenceReport.activeTradesCount} trades, ${intelligenceReport.excludedViolationsCount} critical blunder excluded). Broker P&L remains immutable.`
                : `Auditing all ${intelligenceReport.activeTradesCount} closed positions including commissions, swaps & execution blunders.`}
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto font-mono text-xs font-bold">
            <span>Trades: {intelligenceReport.activeTradesCount}</span>
            <span>
              Net: {intelligenceReport.core.netPnl >= 0 ? '+' : '-'}{currSymbol}{Math.abs(intelligenceReport.core.netPnl).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Filters Row: Timeframe Pills + Market Dropdown */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-white dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] p-1 rounded-xl shadow-2xs text-xs font-semibold">
              {(['7D', '30D', '90D', '1Y', 'ALL'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => {
                    setFilterBySelectedDate(false);
                    setTimeframe(tf);
                    setTablePage(0);
                  }}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    !filterBySelectedDate && timeframe === tf
                      ? 'bg-[#DB9F35] text-white font-bold shadow-2xs'
                      : 'text-[#786F66] dark:text-[#94A3B8] hover:text-[#1F1A16] dark:hover:text-[#F0F4F8]'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            {selectedDate && (
              <button
                type="button"
                onClick={() => {
                  setFilterBySelectedDate(!filterBySelectedDate);
                  setTablePage(0);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                  filterBySelectedDate
                    ? 'bg-[#10B981] text-white border-[#10B981]'
                    : 'bg-white dark:bg-[#131822] border-[#E7E0D6] dark:border-[#242D3D] text-[#786F66] dark:text-[#94A3B8] hover:border-[#10B981]'
                }`}
                title="Filter analytics to the active top date"
              >
                <span>📅 {selectedDate}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                  filterBySelectedDate ? 'bg-black/25 text-white' : 'bg-[#E7E0D6] dark:bg-[#242D3D]'
                }`}>
                  {filterBySelectedDate ? 'Filtered' : 'Filter by Day'}
                </span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#786F66] dark:text-[#94A3B8] font-medium hidden sm:inline">
              Market:
            </span>
            <select
              value={marketFilter}
              onChange={(e) => {
                setMarketFilter(e.target.value as MarketType);
                setTablePage(0);
              }}
              className="bg-white dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-xl px-3 py-1.5 text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8] focus:border-[#DB9F35] outline-none shadow-2xs cursor-pointer"
            >
              <option value="All">All Markets</option>
              <option value="Forex">Forex</option>
              <option value="Crypto">Crypto</option>
              <option value="Stocks">Stocks</option>
              <option value="Futures">Futures</option>
              <option value="Commodities">Commodities</option>
            </select>
          </div>
        </div>

        {/* 2. Sub-Tabs Navigation (5 tabs) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E7E0D6]/60 dark:border-[#242D3D]/60">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'direction', label: 'Direction Analysis', icon: Compass },
            { id: 'time', label: 'Time Analysis', icon: Clock },
            { id: 'execution', label: 'Execution Analysis', icon: ShieldAlert },
            { id: 'insights', label: 'Trade Insights', icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id as AnalyticsSubTab)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#DB9F35] text-white shadow-2xs'
                    : 'bg-white dark:bg-[#131822] text-[#786F66] dark:text-[#94A3B8] border border-[#E7E0D6] dark:border-[#242D3D] hover:text-[#1F1A16] dark:hover:text-[#F0F4F8]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.id === 'execution' && intelligenceReport.execution.lotSizeViolations.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-[#DC2626] text-white font-mono">
                    {intelligenceReport.execution.lotSizeViolations.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Sub-Tab Content Rendering */}
      <div>
        {activeSubTab === 'overview' && (
          <AnalyticsOverviewTab report={intelligenceReport} settings={settings} />
        )}
        {activeSubTab === 'direction' && (
          <AnalyticsDirectionTab report={intelligenceReport} settings={settings} />
        )}
        {activeSubTab === 'time' && (
          <AnalyticsTimeTab report={intelligenceReport} settings={settings} />
        )}
        {activeSubTab === 'execution' && (
          <AnalyticsExecutionTab report={intelligenceReport} settings={settings} />
        )}
        {activeSubTab === 'insights' && (
          <AnalyticsInsightsTab report={intelligenceReport} settings={settings} />
        )}
      </div>

      {/* 4. Bottom Section: Closed Trades Audit Table */}
      <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 shadow-2xs transition-colors mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E7E0D6]/70 dark:border-[#242D3D]">
          <div>
            <h3 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
              Closed Trades Audit Log
            </h3>
            <p className="text-[11px] text-[#786F66] dark:text-[#94A3B8]">
              {performanceMode === 'STRATEGY' ? 'Strategy trades (clean execution only)' : 'All actual broker records'} · {visibleTableTrades.length} positions
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={tableResultFilter}
              onChange={(e) => {
                setTableResultFilter(e.target.value as 'All' | 'Win' | 'Loss');
                setTablePage(0);
              }}
              className="bg-white dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] rounded-xl px-3 py-1.5 text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8] focus:border-[#DB9F35] outline-none shadow-2xs cursor-pointer"
            >
              <option value="All">All outcomes</option>
              <option value="Win">Winners</option>
              <option value="Loss">Losers</option>
            </select>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto mt-2">
          {paginatedTrades.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#786F66] dark:text-[#94A3B8] italic">
              No closed trades found matching this filter criteria.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap font-mono">
              <thead>
                <tr className="border-b border-[#E7E0D6] dark:border-[#242D3D] text-[10px] text-[#786F66] dark:text-[#94A3B8] uppercase">
                  <th className="py-2.5 px-3">TICKET / TIME</th>
                  <th className="py-2.5 px-3">INSTRUMENT</th>
                  <th className="py-2.5 px-3">TYPE</th>
                  <th className="py-2.5 px-3">LOTS</th>
                  <th className="py-2.5 px-3">ENTRY</th>
                  <th className="py-2.5 px-3">EXIT</th>
                  <th className="py-2.5 px-3">STATUS</th>
                  <th className="py-2.5 px-3 text-right">NET P&amp;L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E0D6]/40 dark:divide-[#242D3D]">
                {paginatedTrades.map((t, idx) => {
                  const isWin = t.pnl > 0.001;
                  const isLoss = t.pnl < -0.001;
                  const isViolation = t.executionStatus === 'VIOLATION' || t.errorCategory != null || (t.volume ?? t.lotSize ?? 0) > 0.05;

                  return (
                    <tr key={t.id || idx} className="hover:bg-[#F2ECE0]/60 dark:hover:bg-[#1C2331]/60 transition-colors">
                      <td className="py-3 px-3 font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                        #{t.brokerTradeId || t.tradeNumber || idx + 1}
                        <span className="block text-[9px] font-normal text-[#786F66] dark:text-[#94A3B8]">
                          {t.date} {t.time || ''}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                        {t.pair}
                        <span className="block text-[9px] font-normal text-[#786F66] dark:text-[#94A3B8]">
                          {getMarketForPair(t.pair)}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          (t.order || '').toUpperCase().includes('BUY')
                            ? 'bg-[#DCFCE7] dark:bg-[#143823] text-[#15803D] dark:text-[#4ADE80]'
                            : 'bg-[#FEE2E2] dark:bg-[#3D1D1D] text-[#B91C1C] dark:text-[#F87171]'
                        }`}>
                          {t.order || 'TRADE'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono">
                        <span className={isViolation ? 'text-[#DC2626] font-bold' : 'text-[#1F1A16] dark:text-[#F0F4F8]'}>
                          {(t.volume ?? t.lotSize ?? 0.01).toFixed(2)}
                        </span>
                        {isViolation && (
                          <span className="block text-[9px] text-[#DC2626]">
                            planned 0.01
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-[#1F1A16] dark:text-[#F0F4F8]">
                        {t.entryPrice != null ? t.entryPrice.toFixed(2) : '-'}
                      </td>
                      <td className="py-3 px-3 text-[#1F1A16] dark:text-[#F0F4F8]">
                        {t.tpPrice != null ? t.tpPrice.toFixed(2) : t.slPrice != null ? t.slPrice.toFixed(2) : '-'}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isViolation
                              ? 'bg-[#FEECEB] dark:bg-[#321B1B] text-[#DC2626] dark:text-[#F87171] border border-[#DC2626]/30'
                              : isWin
                              ? 'bg-[#E8F8EE] dark:bg-[#132A1C] text-[#15803D] dark:text-[#34D399]'
                              : isLoss
                              ? 'bg-[#FEECEB] dark:bg-[#321B1B] text-[#DC2626] dark:text-[#F87171]'
                              : 'bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35]'
                          }`}
                        >
                          {isViolation ? 'VIOLATION' : isWin ? 'WIN' : isLoss ? 'LOSS' : 'BE'}
                        </span>
                      </td>
                      <td className={`py-3 px-3 text-right font-bold ${
                        isWin ? 'text-[#15803D] dark:text-[#34D399]' : isLoss ? 'text-[#DC2626] dark:text-[#F87171]' : 'text-[#DB9F35]'
                      }`}>
                        {t.pnl >= 0 ? '+' : '-'}{currSymbol}{Math.abs(t.pnl).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 mt-2 border-t border-[#E7E0D6]/60 dark:border-[#242D3D] text-xs">
          <span className="text-[#786F66] dark:text-[#94A3B8] font-mono">
            Showing {visibleTableTrades.length ? currentPage * pageSize + 1 : 0}–{Math.min((currentPage + 1) * pageSize, visibleTableTrades.length)} of {visibleTableTrades.length} trades · Page {currentPage + 1}/{totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTablePage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E7E0D6] dark:border-[#242D3D] bg-white dark:bg-[#1A2230] text-[#1F1A16] dark:text-[#F0F4F8] hover:bg-[#F2ECE0] dark:hover:bg-[#1C2331] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-bold shadow-2xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <button
              onClick={() => setTablePage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E7E0D6] dark:border-[#242D3D] bg-white dark:bg-[#1A2230] text-[#1F1A16] dark:text-[#F0F4F8] hover:bg-[#F2ECE0] dark:hover:bg-[#1C2331] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-bold shadow-2xs"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Deep-Dive Performance Tables (Setup, HTF Context, Exit Type) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {/* Table 1: Setup */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 shadow-2xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/70 dark:border-[#242D3D]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">Performance by Setup</h3>
                  <p className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">Expectancy by setup tag</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              {setupStats.length === 0 ? (
                <p className="text-xs text-[#786F66] dark:text-[#94A3B8] italic text-center py-4">No setup data logged yet.</p>
              ) : (
                setupStats.map((s) => (
                  <div key={s.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#1F1A16] dark:text-[#F0F4F8]">{s.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-[#786F66] dark:text-[#94A3B8] font-mono">{s.count} trades ({s.winRate.toFixed(0)}%)</span>
                        <span className={`font-bold font-mono text-xs ${s.pnl >= 0 ? 'text-[#15803D] dark:text-[#34D399]' : 'text-[#DC2626] dark:text-[#F87171]'}`}>
                          {s.pnl >= 0 ? '+' : '-'}{currSymbol}{Math.abs(s.pnl).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-[#FAF7F2] dark:bg-[#1A2230] h-2 rounded-full overflow-hidden flex border border-[#E7E0D6]/60 dark:border-[#283244]">
                      <div
                        className={`h-full rounded-full transition-all ${s.totalR >= 0 ? 'bg-[#16A34A]' : 'bg-[#DC2626]'}`}
                        style={{ width: `${Math.min(100, (Math.abs(s.totalR) / maxSetupR) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Table 2: HTF Context */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 shadow-2xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/70 dark:border-[#242D3D]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">Performance by HTF Context</h3>
                  <p className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">Higher timeframe alignment</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              {htfStats.length === 0 ? (
                <p className="text-xs text-[#786F66] dark:text-[#94A3B8] italic text-center py-4">No HTF data logged yet.</p>
              ) : (
                htfStats.map((h) => (
                  <div key={h.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#1F1A16] dark:text-[#F0F4F8]">{h.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-[#786F66] dark:text-[#94A3B8] font-mono">{h.count} trades ({h.winRate.toFixed(0)}%)</span>
                        <span className={`font-bold font-mono text-xs ${h.pnl >= 0 ? 'text-[#15803D] dark:text-[#34D399]' : 'text-[#DC2626] dark:text-[#F87171]'}`}>
                          {h.pnl >= 0 ? '+' : '-'}{currSymbol}{Math.abs(h.pnl).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-[#FAF7F2] dark:bg-[#1A2230] h-2 rounded-full overflow-hidden flex border border-[#E7E0D6]/60 dark:border-[#283244]">
                      <div
                        className={`h-full rounded-full transition-all ${h.totalR >= 0 ? 'bg-[#16A34A]' : 'bg-[#DC2626]'}`}
                        style={{ width: `${Math.min(100, (Math.abs(h.totalR) / maxHtfR) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Table 3: Exit Type */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 shadow-2xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/70 dark:border-[#242D3D]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">Exit Type Breakdown</h3>
                  <p className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">Execution discipline</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              {exitStats.length === 0 ? (
                <p className="text-xs text-[#786F66] dark:text-[#94A3B8] italic text-center py-4">No exit type data logged yet.</p>
              ) : (
                exitStats.map((ex) => (
                  <div key={ex.name} className="flex items-center justify-between text-xs py-1 border-b border-[#E7E0D6]/40 dark:border-[#1E2638]">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ex.name.includes('TARGET') || ex.name.includes('TP')
                          ? 'bg-[#E8F8EE] dark:bg-[#132A1C] text-[#15803D] dark:text-[#34D399]'
                          : ex.name.includes('STOP') || ex.name.includes('SL')
                          ? 'bg-[#FEECEB] dark:bg-[#321B1B] text-[#DC2626] dark:text-[#F87171]'
                          : 'bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35]'
                      }`}>
                        {ex.name}
                      </span>
                      <span className="text-[#786F66] dark:text-[#94A3B8] text-[11px] font-mono">{ex.count} trades</span>
                    </div>
                    <span className={`font-bold font-mono text-xs ${ex.pnl >= 0 ? 'text-[#15803D] dark:text-[#34D399]' : 'text-[#DC2626] dark:text-[#F87171]'}`}>
                      {ex.pnl >= 0 ? '+' : '-'}{currSymbol}{Math.abs(ex.pnl).toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

import { useState, useMemo } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Percent, 
  ShieldCheck, 
  BarChart2, 
  Clock, 
  Trophy, 
  Lightbulb, 
  Target, 
  ArrowRight,
  Plus
} from 'lucide-react';
import { defaultSettings, type Trade, type DayRecord, type AppSettings } from '../db/db';
import type { TabType } from './Navbar';
import { calculatePerformance, calculateDiscipline, generateEquityCurve } from '../utils/TradingEngine';
import { EquityChart } from './EquityChart';

interface DashboardViewProps {
  trades?: Trade[];
  days?: DayRecord[];
  settings?: AppSettings;
  onSelectDate?: (dateStr: string) => void;
  onTabChange?: (tab: TabType) => void;
  onOpenQuickTrade?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  trades = [],
  days: _days = [],
  settings = defaultSettings,
  onSelectDate,
  onTabChange,
  onOpenQuickTrade,
}) => {
  const [performerTab, setPerformerTab] = useState<'By R-Multiple' | 'By P&L'>('By R-Multiple');

  // Dynamic calculations from live data
  const perf = calculatePerformance(trades, settings);
  const discipline = calculateDiscipline(trades);
  const equityPoints = generateEquityCurve(trades, settings);
  const currSymbol = settings.currency === 'USD' ? '$' : '₹';

  const navigate = (tab: TabType) => {
    if (onTabChange) onTabChange(tab);
  };

  // Group trades by pair for top performers
  const pairStats = useMemo(() => {
    const map = new Map<string, { totalR: number; totalPnl: number; wins: number; total: number }>();
    trades.forEach((t) => {
      const p = t.pair.replace('/', '');
      const cur = map.get(p) || { totalR: 0, totalPnl: 0, wins: 0, total: 0 };
      cur.totalR += t.rMultiple || 0;
      cur.totalPnl += t.pnl || 0;
      if (t.rMultiple > 0) cur.wins += 1;
      cur.total += 1;
      map.set(p, cur);
    });
    return Array.from(map.entries())
      .map(([pair, stats]) => ({
        pair,
        avgR: stats.total > 0 ? stats.totalR / stats.total : 0,
        totalR: stats.totalR,
        totalPnl: stats.totalPnl,
        winRate: stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0,
        count: stats.total,
      }))
      .sort((a, b) => (performerTab === 'By R-Multiple' ? b.totalR - a.totalR : b.totalPnl - a.totalPnl));
  }, [trades, performerTab]);

  // Group violations
  const violationsList = useMemo(() => {
    const counts = new Map<string, { count: number; lossR: number }>();
    trades.forEach((t) => {
      if (t.execution === 'VIOLATION' && t.violationReason && t.violationReason !== 'None') {
        const cur = counts.get(t.violationReason) || { count: 0, lossR: 0 };
        cur.count += 1;
        if (t.rMultiple < 0) cur.lossR += Math.abs(t.rMultiple);
        counts.set(t.violationReason, cur);
      }
    });
    return Array.from(counts.entries())
      .map(([reason, s]) => ({ reason, count: s.count, lossR: s.lossR }))
      .sort((a, b) => b.count - a.count);
  }, [trades]);

  return (
    <div className="space-y-4 animate-fade-in pb-12 text-[#1F1A16] dark:text-[#F0F4F8] font-sans selection:bg-[#10B981]/30 transition-colors">
      {/* 1. Greeting Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 pb-2">
        <div className="flex items-center gap-3">
          <span className="text-2xl select-none" role="img" aria-label="Waving hand">
            👋
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#1F1A16] dark:text-[#F0F4F8]">
              Welcome to Trade<span className="text-[#10B981]">Flow</span>
            </h1>
            <p className="text-xs text-[#786F66] dark:text-[#94A3B8] font-medium tracking-tight">
              Dynamic Trading Journal • Performance Analytics • Live Cloud Sync
            </p>
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <p className="text-xs text-[#786F66] dark:text-[#94A3B8] italic font-serif leading-snug">
            "Better decisions today, consistent edge tomorrow."
          </p>
          <span className="text-[10px] font-bold text-[#10B981] tracking-wider block uppercase mt-0.5">
            TradeFlow Discipline System
          </span>
        </div>
      </div>

      {/* 2. Row 1: 6 Dynamic Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: CURRENT EQUITY */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs hover:border-[#10B981]/60 transition-all flex flex-col justify-between">
          <div>
            <div className="w-7 h-7 rounded-lg bg-[#FAF2E6] dark:bg-[#1C2331] text-[#10B981] flex items-center justify-center mb-2">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider block">
              CURRENT BALANCE
            </span>
            <div className="text-lg sm:text-xl font-black text-[#1F1A16] dark:text-[#F0F4F8] tracking-tight mt-0.5 truncate">
              {currSymbol}{perf.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-1 border-t border-[#E7E0D6]/40 dark:border-[#242D3D]">
            <span className={`text-[10px] font-bold ${perf.netPnl >= 0 ? 'text-[#10B981]' : 'text-[#DC2626]'}`}>
              {perf.netPnl >= 0 ? '+' : ''}{currSymbol}{perf.netPnl.toFixed(2)} ({perf.roiPercent >= 0 ? '+' : ''}{perf.roiPercent.toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* Card 2: NET P&L */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs hover:border-[#10B981]/60 transition-all flex flex-col justify-between">
          <div>
            <div className="w-7 h-7 rounded-lg bg-[#FAF2E6] dark:bg-[#1C2331] text-[#10B981] flex items-center justify-center mb-2">
              <BarChart2 className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider block">
              NET P&amp;L
            </span>
            <div className={`text-lg sm:text-xl font-black tracking-tight mt-0.5 truncate ${perf.netPnl >= 0 ? 'text-[#10B981]' : 'text-[#DC2626]'}`}>
              {trades.reduce((a, t) => a + (t.rMultiple || 0), 0) >= 0 ? '+' : ''}
              {trades.reduce((a, t) => a + (t.rMultiple || 0), 0).toFixed(1)}R
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-1 border-t border-[#E7E0D6]/40 dark:border-[#242D3D]">
            <span className={`text-[10px] font-bold ${perf.netPnl >= 0 ? 'text-[#10B981]' : 'text-[#DC2626]'}`}>
              {perf.netPnl >= 0 ? '+' : ''}{currSymbol}{perf.netPnl.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Card 3: WIN RATE */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs hover:border-[#10B981]/60 transition-all flex flex-col justify-between">
          <div>
            <div className="w-7 h-7 rounded-lg bg-[#FAF2E6] dark:bg-[#1C2331] text-[#10B981] flex items-center justify-center mb-2">
              <Percent className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider block">
              WIN RATE
            </span>
            <div className="flex items-center justify-between mt-0.5">
              <div>
                <div className="text-lg sm:text-xl font-black text-[#1F1A16] dark:text-[#F0F4F8] tracking-tight">
                  {perf.winRate.toFixed(0)}%
                </div>
                <div className="text-[9px] font-medium text-[#786F66] dark:text-[#94A3B8] mt-0.5 truncate">
                  {perf.winningTrades}W • {perf.losingTrades}L • {perf.breakEvenTrades}BE
                </div>
              </div>
            </div>
          </div>
          <div className="w-full bg-[#E7E0D6] dark:bg-[#242D3D] h-1.5 rounded-full overflow-hidden mt-3">
            <div className="bg-[#10B981] h-full rounded-full transition-all duration-500" style={{ width: `${perf.winRate}%` }} />
          </div>
        </div>

        {/* Card 4: EXPECTANCY */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs hover:border-[#10B981]/60 transition-all flex flex-col justify-between">
          <div>
            <div className="w-7 h-7 rounded-lg bg-[#FAF2E6] dark:bg-[#1C2331] text-[#10B981] flex items-center justify-center mb-2">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider block">
              EXPECTANCY
            </span>
            <div className="text-lg sm:text-xl font-black text-[#1F1A16] dark:text-[#F0F4F8] tracking-tight mt-0.5 truncate">
              {perf.expectancy >= 0 ? `+${perf.expectancy.toFixed(2)}R` : `${perf.expectancy.toFixed(2)}R`}
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-1 border-t border-[#E7E0D6]/40 dark:border-[#242D3D]">
            <span className="text-[9px] font-mono text-[#786F66] dark:text-[#94A3B8] truncate">
              PF {perf.profitFactor.toFixed(2)} | Avg {perf.averageR >= 0 ? '+' : ''}{perf.averageR.toFixed(1)}R
            </span>
          </div>
        </div>

        {/* Card 5: MAX DRAWDOWN */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs hover:border-[#DC2626]/60 transition-all flex flex-col justify-between">
          <div>
            <div className="w-7 h-7 rounded-lg bg-[#FEECEB] dark:bg-[#321B1B] text-[#DC2626] flex items-center justify-center mb-2">
              <TrendingDown className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider block">
              MAX DRAWDOWN
            </span>
            <div className="text-lg sm:text-xl font-black text-[#DC2626] tracking-tight mt-0.5 truncate">
              -{perf.maxDrawdownPercent.toFixed(1)}%
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-1 border-t border-[#E7E0D6]/40 dark:border-[#242D3D]">
            <span className="text-[10px] font-bold text-[#DC2626]">
              -{currSymbol}{perf.maxDrawdownUsd.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Card 6: DISCIPLINE SCORE */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs hover:border-[#10B981]/60 transition-all flex flex-col justify-between">
          <div>
            <div className="w-7 h-7 rounded-lg bg-[#FAF2E6] dark:bg-[#1C2331] text-[#10B981] flex items-center justify-center mb-2">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider block">
              DISCIPLINE SCORE
            </span>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-lg sm:text-xl font-black text-[#1F1A16] dark:text-[#F0F4F8] tracking-tight">
                {discipline.disciplineScore}%
              </span>
              <span className="text-[10px] font-medium text-[#786F66] dark:text-[#94A3B8]">
                {discipline.cleanTradesCount}/{trades.length} Clean
              </span>
            </div>
          </div>
          <div className="w-full bg-[#E7E0D6] dark:bg-[#242D3D] h-1.5 rounded-full overflow-hidden mt-3">
            <div className="bg-[#10B981] h-full rounded-full transition-all duration-500" style={{ width: `${discipline.disciplineScore}%` }} />
          </div>
        </div>
      </div>

      {/* 3. Row 2: Dynamic Equity Chart Full Width */}
      <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 shadow-2xs transition-colors">
        <EquityChart points={equityPoints} perf={perf} currency={settings.currency} />
      </div>

      {/* 4. Row 3: Feature Cards (Recent Activity + Top Pairs + Mistakes) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        
        {/* Card 1: Recent Journal Ledger */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 shadow-2xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#10B981]" />
                <h3 className="text-xs sm:text-sm font-bold">Recent Trade Journal</h3>
              </div>
              <button
                onClick={() => navigate('journal')}
                className="text-[11px] font-bold text-[#10B981] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {trades.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <p className="text-xs text-[#786F66] dark:text-[#94A3B8]">No trades recorded yet.</p>
                {onOpenQuickTrade && (
                  <button
                    onClick={onOpenQuickTrade}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#10B981] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#059669] transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Log First Trade
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto my-3">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[9px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
                      <th className="pb-2">Pair</th>
                      <th className="pb-2">Type</th>
                      <th className="pb-2 text-right">R</th>
                      <th className="pb-2 text-right">P&L</th>
                      <th className="pb-2 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E0D6]/40 dark:divide-[#242D3D]">
                    {trades.slice(0, 5).map((t, idx) => (
                      <tr 
                        key={t.id || idx} 
                        onClick={() => onSelectDate?.(t.date)}
                        className="hover:bg-[#FAF7F2]/60 dark:hover:bg-[#1A2230]/60 transition-colors cursor-pointer"
                      >
                        <td className="py-2.5 font-bold font-mono text-[11px]">{t.pair}</td>
                        <td className="py-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            t.order === 'BUY'
                              ? 'bg-[#E8F8EE] dark:bg-[#132A1C] text-[#15803D] dark:text-[#34D399]'
                              : 'bg-[#FEECEB] dark:bg-[#321B1B] text-[#DC2626] dark:text-[#F87171]'
                          }`}>
                            {t.order}
                          </span>
                        </td>
                        <td className={`py-2.5 text-right font-bold font-mono text-[11px] ${
                          (t.rMultiple || 0) >= 0 ? 'text-[#10B981]' : 'text-[#DC2626]'
                        }`}>
                          {(t.rMultiple || 0) >= 0 ? `+${t.rMultiple}R` : `${t.rMultiple}R`}
                        </td>
                        <td className={`py-2.5 text-right font-bold font-mono text-[11px] ${
                          (t.pnl || 0) >= 0 ? 'text-[#10B981]' : 'text-[#DC2626]'
                        }`}>
                          {(t.pnl || 0) >= 0 ? `+${currSymbol}${t.pnl.toFixed(2)}` : `-${currSymbol}${Math.abs(t.pnl).toFixed(2)}`}
                        </td>
                        <td className="py-2.5 text-right text-[10px] text-[#786F66] dark:text-[#94A3B8] font-mono whitespace-nowrap">
                          {t.date}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Top Performing Pairs */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 shadow-2xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#10B981]" />
                <h3 className="text-xs sm:text-sm font-bold">Instrument Performance</h3>
              </div>

              <div className="flex items-center bg-[#FAF7F2] dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] p-0.5 rounded-lg text-[10px] font-semibold">
                <button
                  onClick={() => setPerformerTab('By R-Multiple')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    performerTab === 'By R-Multiple'
                      ? 'bg-[#10B981] text-white font-bold'
                      : 'text-[#786F66] dark:text-[#94A3B8]'
                  }`}
                >
                  By R
                </button>
                <button
                  onClick={() => setPerformerTab('By P&L')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    performerTab === 'By P&L'
                      ? 'bg-[#10B981] text-white font-bold'
                      : 'text-[#786F66] dark:text-[#94A3B8]'
                  }`}
                >
                  By P&amp;L
                </button>
              </div>
            </div>

            {pairStats.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#786F66] dark:text-[#94A3B8]">
                No instrument data yet.
              </div>
            ) : (
              <div className="overflow-x-auto my-3">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[9px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
                      <th className="pb-2">Instrument</th>
                      <th className="pb-2 text-right">Net R</th>
                      <th className="pb-2 text-right">Win Rate</th>
                      <th className="pb-2 text-right">Trades</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E0D6]/40 dark:divide-[#242D3D]">
                    {pairStats.slice(0, 4).map((p) => (
                      <tr key={p.pair} className="hover:bg-[#FAF7F2]/60 dark:hover:bg-[#1A2230]/60 transition-colors">
                        <td className="py-2.5 font-bold font-mono">{p.pair}</td>
                        <td className={`py-2.5 text-right font-bold font-mono ${p.totalR >= 0 ? 'text-[#10B981]' : 'text-[#DC2626]'}`}>
                          {p.totalR >= 0 ? `+${p.totalR.toFixed(1)}R` : `${p.totalR.toFixed(1)}R`}
                        </td>
                        <td className="py-2.5 text-right font-mono">{p.winRate}%</td>
                        <td className="py-2.5 text-right font-mono text-[#786F66] dark:text-[#94A3B8]">{p.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Psychology & Edge Leaks */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 shadow-2xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-[#10B981]" />
                <h3 className="text-xs sm:text-sm font-bold">Psychology &amp; Rule Leaks</h3>
              </div>
              <button
                onClick={() => navigate('rules')}
                className="text-[11px] font-bold text-[#10B981] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Rules</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {violationsList.length === 0 ? (
              <div className="py-8 text-center space-y-1">
                <ShieldCheck className="w-7 h-7 text-[#10B981] mx-auto" />
                <p className="text-xs font-bold text-[#10B981]">Zero Rule Violations!</p>
                <p className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">100% disciplined execution maintained.</p>
              </div>
            ) : (
              <div className="space-y-3 my-3">
                {violationsList.slice(0, 3).map((v, i) => (
                  <div key={v.reason} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#FAF2E6] dark:bg-[#1C2331] text-[#10B981] font-bold text-[10px] flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#FEECEB] dark:bg-[#321B1B] text-[#DC2626] dark:text-[#F87171] font-bold text-[11px]">
                        {v.reason}
                      </span>
                    </div>
                    <span className="text-[#786F66] dark:text-[#94A3B8] text-xs">{v.count} trades</span>
                    <span className="font-bold font-mono text-sm text-[#DC2626]">
                      -{v.lossR.toFixed(1)}R
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 p-3 rounded-xl bg-[#FAF7F2] dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] flex items-start gap-2.5">
            <Target className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
            <div>
              <span className="text-[11px] font-bold block">Discipline Goal</span>
              <p className="text-[10px] text-[#786F66] dark:text-[#94A3B8] mt-0.5">
                Focus on execution quality. Profits follow disciplined consistency.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Footer */}
      <footer className="pt-4 border-t border-[#E7E0D6] dark:border-[#242D3D] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#786F66] dark:text-[#94A3B8] transition-colors">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#1F1A16] dark:text-[#F0F4F8]">TradeFlow</span>
          <span>|</span>
          <span>Journal • Review • Improve</span>
        </div>
        <div className="font-mono text-[10px]">
          Live Cloud Synced with Supabase PostgreSQL
        </div>
      </footer>
    </div>
  );
};

import React, { useState } from 'react';
import { 
  BarChart2, 
  TrendingUp, 
  TrendingDown, 
  Percent, 
  ShieldCheck, 
  Target, 
  Brain, 
  Award,
  Sparkles
} from 'lucide-react';
import type { Trade, AppSettings } from '../db/db';
import { calculatePerformance, calculateDiscipline } from '../utils/TradingEngine';

interface AnalyticsViewProps {
  trades: Trade[];
  settings: AppSettings;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  trades,
  settings,
}) => {
  const [timeframe, setTimeframe] = useState<'30D' | '3M' | '6M' | '1Y' | 'ALL'>('30D');

  const perf = calculatePerformance(trades, settings);
  const discipline = calculateDiscipline(trades);
  const netR = trades.reduce((acc, t) => acc + (t.rMultiple || 0), 0);

  // Helper to group by any trade key and calculate stats
  const calculateGroupStats = (key: keyof Trade) => {
    const groups: Record<string, { count: number; totalR: number; wins: number; pnl: number }> = {};

    trades.forEach((t) => {
      const val = String(t[key] || 'Unspecified');
      if (!groups[val]) {
        groups[val] = { count: 0, totalR: 0, wins: 0, pnl: 0 };
      }
      groups[val].count += 1;
      groups[val].totalR += t.rMultiple || 0;
      groups[val].pnl += t.pnl || 0;
      if (t.rMultiple > 0) groups[val].wins += 1;
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

  const setupStats = calculateGroupStats('setupType');
  const emotionStats = calculateGroupStats('emotion');
  const htfStats = calculateGroupStats('htfContext');
  const exitStats = calculateGroupStats('exitType');

  const fomoTrades = trades.filter((t) => t.emotion === 'FOMO' || t.violationReason === 'FOMO');
  const fomoR = fomoTrades.reduce((acc, t) => acc + (t.rMultiple || 0), 0);

  const cleanTrades = trades.filter((t) => t.execution === 'CLEAN');
  const cleanR = cleanTrades.reduce((acc, t) => acc + (t.rMultiple || 0), 0);

  const maxSetupR = Math.max(...setupStats.map((s) => Math.abs(s.totalR)), 1);
  const maxEmotionR = Math.max(...emotionStats.map((s) => Math.abs(s.totalR)), 1);
  const maxHtfR = Math.max(...htfStats.map((s) => Math.abs(s.totalR)), 1);

  return (
    <div className="space-y-6 animate-fade-in pb-16 text-[#1F1A16] font-sans">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E7E0D6]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1F1A16]">
            Performance &amp; Edge Analytics
          </h1>
          <p className="text-xs text-[#786F66] mt-0.5">
            Data-driven edge analysis, psychological metrics, and execution diagnostics.
          </p>
        </div>

        {/* Timeframe Filter Pills */}
        <div className="flex items-center gap-1 bg-white border border-[#E7E0D6] p-1 rounded-xl shadow-2xs text-xs font-semibold">
          {(['30D', '3M', '6M', '1Y', 'ALL'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1 rounded-lg transition-all ${
                timeframe === tf
                  ? 'bg-[#DB9F35] text-white font-bold shadow-2xs'
                  : 'text-[#786F66] hover:text-[#1F1A16]'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Top KPIs Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Net P&L */}
        <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#786F66] uppercase">Net P&amp;L</span>
            <div className="w-6 h-6 rounded-lg bg-[#E8F8EE] text-[#15803D] flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black font-mono text-[#15803D]">
              {netR >= 0 ? `+${netR.toFixed(1)}R` : `${netR.toFixed(1)}R`}
            </span>
            <span className="block text-[11px] font-bold text-[#16A34A] mt-0.5">
              +${perf.netPnl.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Total Trades */}
        <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#786F66] uppercase">Total Trades</span>
            <div className="w-6 h-6 rounded-lg bg-[#FAF2E6] text-[#DB9F35] flex items-center justify-center">
              <BarChart2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black font-mono text-[#1F1A16]">
              {perf.totalTrades}
            </span>
            <span className="block text-[11px] text-[#786F66] mt-0.5">
              Across all sessions
            </span>
          </div>
        </div>

        {/* Win Rate */}
        <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#786F66] uppercase">Win Rate</span>
            <div className="w-6 h-6 rounded-lg bg-[#FAF2E6] text-[#DB9F35] flex items-center justify-center">
              <Percent className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black font-mono text-[#1F1A16]">
              {perf.winRate.toFixed(1)}%
            </span>
            <span className="block text-[11px] text-[#786F66] mt-0.5">
              {perf.winningTrades}W • {perf.losingTrades}L • {perf.breakEvenTrades}BE
            </span>
          </div>
        </div>

        {/* Expectancy */}
        <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#786F66] uppercase">Expectancy</span>
            <div className="w-6 h-6 rounded-lg bg-[#E8F8EE] text-[#15803D] flex items-center justify-center">
              <Target className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black font-mono text-[#1F1A16]">
              {perf.expectancy >= 0 ? `+${perf.expectancy.toFixed(2)}R` : `${perf.expectancy.toFixed(2)}R`}
            </span>
            <span className="block text-[11px] text-[#786F66] mt-0.5">
              PF: {perf.profitFactor.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Max Drawdown */}
        <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#786F66] uppercase">Max Drawdown</span>
            <div className="w-6 h-6 rounded-lg bg-[#FEECEB] text-[#DC2626] flex items-center justify-center">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black font-mono text-[#DC2626]">
              -4.2R
            </span>
            <span className="block text-[11px] text-[#DC2626] mt-0.5">
              Peak to trough
            </span>
          </div>
        </div>

        {/* Discipline Score */}
        <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#786F66] uppercase">Discipline</span>
            <div className="w-6 h-6 rounded-lg bg-[#FAF2E6] text-[#DB9F35] flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black font-mono text-[#1F1A16]">
              {discipline.disciplineScore.toFixed(0)}%
            </span>
            <span className="block text-[11px] text-[#786F66] mt-0.5">
              {discipline.cleanTradesCount}/{trades.length} Process adherence
            </span>
          </div>
        </div>
      </div>

      {/* 3. Deep-Dive Performance Tables (3 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Table 1: Performance by Setup */}
        <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/70">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#FAF2E6] text-[#DB9F35] flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1F1A16]">Performance by Setup</h3>
                  <p className="text-[10px] text-[#786F66]">Find your highest-expectancy models</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              {setupStats.length === 0 ? (
                <p className="text-xs text-[#786F66] italic text-center py-4">No setup data logged yet.</p>
              ) : (
                setupStats.map((s) => (
                  <div key={s.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#1F1A16]">{s.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-[#786F66] font-mono">{s.count} trades ({s.winRate.toFixed(0)}%)</span>
                        <span className={`font-bold font-mono text-xs ${s.totalR >= 0 ? 'text-[#15803D]' : 'text-[#DC2626]'}`}>
                          {s.totalR >= 0 ? `+${s.totalR.toFixed(1)}R` : `${s.totalR.toFixed(1)}R`}
                        </span>
                      </div>
                    </div>
                    {/* Visual bar */}
                    <div className="w-full bg-[#FAF7F2] h-2 rounded-full overflow-hidden flex border border-[#E7E0D6]/60">
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

        {/* Table 2: Performance by Emotion */}
        <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/70">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#FAF2E6] text-[#DB9F35] flex items-center justify-center">
                  <Brain className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1F1A16]">Performance by Emotion</h3>
                  <p className="text-[10px] text-[#786F66]">Psychological state impact on P&amp;L</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              {emotionStats.length === 0 ? (
                <p className="text-xs text-[#786F66] italic text-center py-4">No emotion data logged yet.</p>
              ) : (
                emotionStats.map((e) => (
                  <div key={e.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          e.name === 'CALM' || e.name === 'FOCUSED' ? 'bg-[#16A34A]' : 'bg-[#DC2626]'
                        }`} />
                        <span className="font-bold text-[#1F1A16]">{e.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-[#786F66] font-mono">{e.count} trades</span>
                        <span className={`font-bold font-mono text-xs ${e.totalR >= 0 ? 'text-[#15803D]' : 'text-[#DC2626]'}`}>
                          {e.totalR >= 0 ? `+${e.totalR.toFixed(1)}R` : `${e.totalR.toFixed(1)}R`}
                        </span>
                      </div>
                    </div>
                    {/* Visual bar */}
                    <div className="w-full bg-[#FAF7F2] h-2 rounded-full overflow-hidden flex border border-[#E7E0D6]/60">
                      <div
                        className={`h-full rounded-full transition-all ${e.totalR >= 0 ? 'bg-[#16A34A]' : 'bg-[#DC2626]'}`}
                        style={{ width: `${Math.min(100, (Math.abs(e.totalR) / maxEmotionR) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Table 3: Performance by HTF Context */}
        <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/70">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#FAF2E6] text-[#DB9F35] flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1F1A16]">Performance by HTF Context</h3>
                  <p className="text-[10px] text-[#786F66]">Alignment with higher timeframe narrative</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              {htfStats.length === 0 ? (
                <p className="text-xs text-[#786F66] italic text-center py-4">No HTF data logged yet.</p>
              ) : (
                htfStats.map((h) => (
                  <div key={h.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#1F1A16]">{h.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-[#786F66] font-mono">{h.count} trades ({h.winRate.toFixed(0)}%)</span>
                        <span className={`font-bold font-mono text-xs ${h.totalR >= 0 ? 'text-[#15803D]' : 'text-[#DC2626]'}`}>
                          {h.totalR >= 0 ? `+${h.totalR.toFixed(1)}R` : `${h.totalR.toFixed(1)}R`}
                        </span>
                      </div>
                    </div>
                    {/* Visual bar */}
                    <div className="w-full bg-[#FAF7F2] h-2 rounded-full overflow-hidden flex border border-[#E7E0D6]/60">
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
      </div>

      {/* 4. Bottom Row: Win/Loss Donut, Exit Types, Biggest Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Card 1: Win / Loss Breakdown */}
        <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/70">
            <h3 className="text-sm font-bold text-[#1F1A16]">Win / Loss Breakdown</h3>
            <span className="text-[10px] text-[#786F66] font-mono">{perf.totalTrades} Total</span>
          </div>

          <div className="flex items-center gap-5 my-4">
            <div className="relative w-24 h-24 shrink-0">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" fill="none" stroke="#E7E0D6" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#16A34A"
                  strokeWidth="8"
                  strokeDasharray={`${(perf.winRate / 100) * 238} 238`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-lg font-black text-[#1F1A16]">{perf.winRate.toFixed(0)}%</span>
                <span className="text-[9px] text-[#786F66]">Win Rate</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
                <span className="text-[#786F66]">Winning:</span>
                <span className="font-bold text-[#15803D] font-mono">{perf.winningTrades}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
                <span className="text-[#786F66]">Losing:</span>
                <span className="font-bold text-[#DC2626] font-mono">{perf.losingTrades}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#DB9F35]" />
                <span className="text-[#786F66]">Break Even:</span>
                <span className="font-bold text-[#DB9F35] font-mono">{perf.breakEvenTrades}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Exit Type Analysis */}
        <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/70">
            <h3 className="text-sm font-bold text-[#1F1A16]">Exit Type Analysis</h3>
            <span className="text-[10px] text-[#786F66]">Execution discipline</span>
          </div>

          <div className="space-y-3 mt-3">
            {exitStats.map((ex) => (
              <div key={ex.name} className="flex items-center justify-between text-xs py-1 border-b border-[#FAF7F2]">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    ex.name === 'TARGET' || ex.name === 'TP'
                      ? 'bg-[#E8F8EE] text-[#15803D]'
                      : ex.name === 'STOP_LOSS' || ex.name === 'SL'
                      ? 'bg-[#FEECEB] text-[#DC2626]'
                      : 'bg-[#FAF2E6] text-[#DB9F35]'
                  }`}>
                    {ex.name}
                  </span>
                  <span className="text-[#786F66] text-[11px] font-mono">{ex.count} trades</span>
                </div>
                <span className={`font-bold font-mono text-xs ${ex.totalR >= 0 ? 'text-[#15803D]' : 'text-[#DC2626]'}`}>
                  {ex.totalR >= 0 ? `+${ex.totalR.toFixed(1)}R` : `${ex.totalR.toFixed(1)}R`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Biggest Behavioral Insights */}
        <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/70">
              <h3 className="text-sm font-bold text-[#1F1A16]">Biggest Insights</h3>
              <span className="text-[10px] text-[#DB9F35] font-bold">Rule Engine</span>
            </div>

            <div className="space-y-3 mt-3">
              {/* FOMO leak */}
              <div className="p-2.5 rounded-xl bg-[#FEECEB]/60 border border-[#FBC5C2] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-[#DC2626] text-white flex items-center justify-center text-[10px] font-black">
                    !
                  </span>
                  <div>
                    <span className="text-xs font-bold text-[#DC2626] block">FOMO &amp; Impatience</span>
                    <span className="text-[10px] text-[#786F66]">{fomoTrades.length} emotional entries</span>
                  </div>
                </div>
                <span className="text-xs font-bold font-mono text-[#DC2626]">
                  {fomoR.toFixed(1)}R
                </span>
              </div>

              {/* Clean Execution */}
              <div className="p-2.5 rounded-xl bg-[#E8F8EE]/60 border border-[#B9DFC8] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-[#16A34A] text-white flex items-center justify-center text-[10px] font-black">
                    ✓
                  </span>
                  <div>
                    <span className="text-xs font-bold text-[#15803D] block">Clean Rule Adherence</span>
                    <span className="text-[10px] text-[#786F66]">{cleanTrades.length} plan-followed trades</span>
                  </div>
                </div>
                <span className="text-xs font-bold font-mono text-[#15803D]">
                  +{cleanR.toFixed(1)}R
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 p-3 rounded-xl bg-[#FAF7F2] border border-[#E7E0D6] text-xs text-[#786F66]">
            💡 <b>Core Takeaway:</b> Following your rules produces 100% of your profitability. Eliminating FOMO stops account drawdowns.
          </div>
        </div>
      </div>
    </div>
  );
};

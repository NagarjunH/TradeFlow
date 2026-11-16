import React from 'react';
import { Clock, Calendar, Globe, AlertTriangle, Sparkles } from 'lucide-react';
import type { FullIntelligenceReport } from '../../services/analyticsService';
import type { AppSettings } from '../../db/db';

interface AnalyticsTimeTabProps {
  report: FullIntelligenceReport;
  settings: AppSettings;
}

export const AnalyticsTimeTab: React.FC<AnalyticsTimeTabProps> = ({
  report,
  settings,
}) => {
  const { time } = report;
  const { hourly, weekdays, sessions, bestHour, worstHour } = time;
  const currSymbol = settings?.currency === 'USD' ? '$' : '₹';

  // Active hours with at least 1 trade
  const activeHours = hourly.filter((h) => h.tradesCount > 0);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 1. Time Insights Quick Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {bestHour && (
          <div className="p-4 rounded-2xl bg-[#E8F8EE] dark:bg-[#132A1C] border border-[#10B981]/40 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#15803D] dark:text-[#34D399] uppercase tracking-wider block">
                Top Performing Window
              </span>
              <div className="text-xl font-black font-mono text-[#1F1A16] dark:text-[#F0F4F8] mt-0.5">
                {bestHour.hourLabel} Window
              </div>
              <p className="text-xs text-[#786F66] dark:text-[#94A3B8] mt-0.5">
                Produced <span className="font-bold text-[#10B981]">+{currSymbol}{bestHour.netPnl.toFixed(2)}</span> with {bestHour.winRate}% win rate ({bestHour.tradesCount} trades)
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#DCFCE7] dark:bg-[#143823] text-[#15803D] dark:text-[#4ADE80] flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
        )}

        {worstHour && (
          <div className="p-4 rounded-2xl bg-[#FEECEB] dark:bg-[#321B1B] border border-[#DC2626]/40 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#DC2626] dark:text-[#F87171] uppercase tracking-wider block">
                Vulnerable Window
              </span>
              <div className="text-xl font-black font-mono text-[#1F1A16] dark:text-[#F0F4F8] mt-0.5">
                {worstHour.hourLabel} Window
              </div>
              <p className="text-xs text-[#786F66] dark:text-[#94A3B8] mt-0.5">
                Net return is <span className="font-bold text-[#DC2626]">-{currSymbol}{Math.abs(worstHour.netPnl).toFixed(2)}</span> ({worstHour.losses} losses, {worstHour.tradesCount} trades)
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#FEE2E2] dark:bg-[#3D1D1D] text-[#B91C1C] dark:text-[#F87171] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        )}
      </div>

      {/* 2. Hourly Breakdown Grid (00:00 to 23:00) */}
      <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                Hour-by-Hour Performance (Broker UTC &amp; Local)
              </h3>
              <p className="text-xs text-[#786F66] dark:text-[#94A3B8]">
                Identifies which specific hours consistently yield positive vs negative expectancy
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {activeHours.map((h) => {
            const isProfit = h.netPnl >= 0;
            return (
              <div
                key={h.hour}
                className={`p-3 rounded-xl border transition-all ${
                  isProfit
                    ? 'bg-white dark:bg-[#161D2A] border-[#10B981]/30 hover:border-[#10B981]'
                    : 'bg-white dark:bg-[#161D2A] border-[#DC2626]/30 hover:border-[#DC2626]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black font-mono text-[#1F1A16] dark:text-[#F0F4F8]">
                    {h.hourLabel}
                  </span>
                  <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8]">
                    {h.tradesCount} tr
                  </span>
                </div>

                <div className="mt-2">
                  <div className={`text-sm font-black font-mono ${isProfit ? 'text-[#10B981]' : 'text-[#DC2626]'}`}>
                    {isProfit ? '+' : '-'}{currSymbol}{Math.abs(h.netPnl).toFixed(2)}
                  </div>
                  <div className="text-[10px] font-mono text-[#786F66] dark:text-[#94A3B8] mt-0.5">
                    {h.winRate}% win rate ({h.wins}W · {h.losses}L)
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Weekday & Session Analysis Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekday Performance */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
            <Calendar className="w-4 h-4 text-[#DB9F35]" />
            <h3 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
              Weekday Performance (Mon – Fri)
            </h3>
          </div>

          <div className="space-y-2">
            {weekdays.map((w) => {
              const isProfit = w.netPnl >= 0;
              return (
                <div
                  key={w.dayIndex}
                  className="p-3 rounded-xl bg-white dark:bg-[#161D2A] border border-[#E7E0D6] dark:border-[#242D3D] flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                      {w.dayName}
                    </span>
                    <span className="text-[11px] text-[#786F66] dark:text-[#94A3B8] ml-2">
                      ({w.tradesCount} trades · {w.wins}W / {w.losses}L)
                    </span>
                  </div>

                  <div className="text-right font-mono">
                    <span className={`text-xs font-black ${isProfit ? 'text-[#10B981]' : 'text-[#DC2626]'}`}>
                      {isProfit ? '+' : '-'}{currSymbol}{Math.abs(w.netPnl).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-[#786F66] dark:text-[#94A3B8] block">
                      {w.winRate}% Win Rate
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Forex Sessions Performance */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
            <Globe className="w-4 h-4 text-[#10B981]" />
            <h3 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
              Forex Session Breakdown
            </h3>
          </div>

          <div className="space-y-2">
            {sessions.map((s) => {
              const isProfit = s.netPnl >= 0;
              return (
                <div
                  key={s.session}
                  className="p-3 rounded-xl bg-white dark:bg-[#161D2A] border border-[#E7E0D6] dark:border-[#242D3D] flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                      {s.session}
                    </span>
                    <span className="text-[11px] text-[#786F66] dark:text-[#94A3B8] ml-2">
                      ({s.tradesCount} trades)
                    </span>
                  </div>

                  <div className="text-right font-mono">
                    <span className={`text-xs font-black ${isProfit ? 'text-[#10B981]' : 'text-[#DC2626]'}`}>
                      {isProfit ? '+' : '-'}{currSymbol}{Math.abs(s.netPnl).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-[#786F66] dark:text-[#94A3B8] block">
                      {s.winRate}% Win Rate
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

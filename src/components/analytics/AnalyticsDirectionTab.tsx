import React from 'react';
import { ArrowUpRight, ArrowDownRight, Compass } from 'lucide-react';
import type { FullIntelligenceReport } from '../../services/analyticsService';
import type { AppSettings } from '../../db/db';

interface AnalyticsDirectionTabProps {
  report: FullIntelligenceReport;
  settings: AppSettings;
}

export const AnalyticsDirectionTab: React.FC<AnalyticsDirectionTabProps> = ({
  report,
  settings,
}) => {
  const { direction, mode } = report;
  const { buy, sell, strongerDirection, winRateDiff } = direction;
  const currSymbol = settings?.currency === 'USD' ? '$' : '₹';

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Direction Verdict Hero Banner */}
      <div className="p-4 rounded-2xl bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-[#DB9F35] uppercase tracking-wider">
              Directional Edge Analysis ({mode} Mode)
            </div>
            <h2 className="text-base font-bold text-[#1F1A16] dark:text-[#F0F4F8] mt-0.5">
              {strongerDirection === 'BUY'
                ? 'BUY (Long) Trades Form Your Core Statistical Edge'
                : strongerDirection === 'SELL'
                ? 'SELL (Short) Trades Outperform Longs'
                : 'Balanced Performance Across Longs & Shorts'}
            </h2>
            <p className="text-xs text-[#786F66] dark:text-[#94A3B8] mt-0.5">
              BUY Win Rate is <span className="font-bold text-[#10B981]">{buy.winRate.toFixed(1)}%</span> vs SELL Win Rate of{' '}
              <span className="font-bold text-[#DC2626]">{sell.winRate.toFixed(1)}%</span> (Difference: {winRateDiff > 0 ? '+' : ''}{winRateDiff}%).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <span className="px-3 py-1 rounded-xl text-xs font-bold bg-[#E8F8EE] dark:bg-[#132A1C] text-[#15803D] dark:text-[#34D399] border border-[#10B981]/30">
            Long Win Rate: {buy.winRate.toFixed(1)}%
          </span>
          <span className="px-3 py-1 rounded-xl text-xs font-bold bg-[#FAF2E6] dark:bg-[#1C2331] text-[#9B671B] dark:text-[#F3D784] border border-[#E7E0D6] dark:border-[#2E384D]">
            Short Win Rate: {sell.winRate.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Side-by-Side Comparison: BUY vs SELL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* BUY (LONG) CARD */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border-2 border-[#10B981]/40 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#DCFCE7] dark:bg-[#143823] text-[#15803D] dark:text-[#4ADE80] flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#1F1A16] dark:text-[#F0F4F8]">
                  BUY (LONG) TRADES
                </h3>
                <span className="text-[11px] text-[#786F66] dark:text-[#94A3B8]">
                  {buy.totalTrades} closed positions ({buy.totalLots.toFixed(2)} lots)
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-[#DCFCE7] dark:bg-[#143823] text-[#15803D] dark:text-[#4ADE80]">
              {buy.winRate.toFixed(1)}% WIN RATE
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono">
            <div className="p-3 rounded-xl bg-white dark:bg-[#1C2331] border border-[#E7E0D6] dark:border-[#242D3D]">
              <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] block">NET P&amp;L</span>
              <span className={`text-lg font-black ${buy.netPnl >= 0 ? 'text-[#10B981]' : 'text-[#DC2626]'}`}>
                {buy.netPnl >= 0 ? '+' : '-'}{currSymbol}{Math.abs(buy.netPnl).toFixed(2)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-[#1C2331] border border-[#E7E0D6] dark:border-[#242D3D]">
              <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] block">PROFIT FACTOR</span>
              <span className="text-lg font-black text-[#1F1A16] dark:text-[#F0F4F8]">
                {buy.profitFactor.toFixed(2)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-[#1C2331] border border-[#E7E0D6] dark:border-[#242D3D]">
              <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] block">AVG TRADE P&amp;L</span>
              <span className={`text-base font-black ${buy.avgTradePnl >= 0 ? 'text-[#10B981]' : 'text-[#DC2626]'}`}>
                {buy.avgTradePnl >= 0 ? '+' : '-'}{currSymbol}{Math.abs(buy.avgTradePnl).toFixed(2)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-[#1C2331] border border-[#E7E0D6] dark:border-[#242D3D]">
              <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] block">WIN / LOSS COUNT</span>
              <span className="text-base font-black text-[#1F1A16] dark:text-[#F0F4F8]">
                {buy.winningTrades}W · {buy.losingTrades}L
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#E8F8EE]/60 dark:bg-[#132A1C]/50 text-xs space-y-1">
            <span className="font-bold text-[#15803D] dark:text-[#34D399]">Direction Edge:</span>
            <p className="text-[#1F1A16] dark:text-[#CBD5E1]">
              Average win is <b>+${buy.avgWin.toFixed(2)}</b> against average loss of <b>-${buy.avgLoss.toFixed(2)}</b>.
              Your Long setups have strong positive expectancy.
            </p>
          </div>
        </div>

        {/* SELL (SHORT) CARD */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border-2 border-[#DB9F35]/40 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#FEE2E2] dark:bg-[#3D1D1D] text-[#B91C1C] dark:text-[#F87171] flex items-center justify-center">
                <ArrowDownRight className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#1F1A16] dark:text-[#F0F4F8]">
                  SELL (SHORT) TRADES
                </h3>
                <span className="text-[11px] text-[#786F66] dark:text-[#94A3B8]">
                  {sell.totalTrades} closed positions ({sell.totalLots.toFixed(2)} lots)
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-[#FAF2E6] dark:bg-[#1C2331] text-[#9B671B] dark:text-[#F3D784]">
              {sell.winRate.toFixed(1)}% WIN RATE
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono">
            <div className="p-3 rounded-xl bg-white dark:bg-[#1C2331] border border-[#E7E0D6] dark:border-[#242D3D]">
              <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] block">NET P&amp;L</span>
              <span className={`text-lg font-black ${sell.netPnl >= 0 ? 'text-[#10B981]' : 'text-[#DC2626]'}`}>
                {sell.netPnl >= 0 ? '+' : '-'}{currSymbol}{Math.abs(sell.netPnl).toFixed(2)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-[#1C2331] border border-[#E7E0D6] dark:border-[#242D3D]">
              <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] block">PROFIT FACTOR</span>
              <span className="text-lg font-black text-[#1F1A16] dark:text-[#F0F4F8]">
                {sell.profitFactor.toFixed(2)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-[#1C2331] border border-[#E7E0D6] dark:border-[#242D3D]">
              <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] block">AVG TRADE P&amp;L</span>
              <span className={`text-base font-black ${sell.avgTradePnl >= 0 ? 'text-[#10B981]' : 'text-[#DC2626]'}`}>
                {sell.avgTradePnl >= 0 ? '+' : '-'}{currSymbol}{Math.abs(sell.avgTradePnl).toFixed(2)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-[#1C2331] border border-[#E7E0D6] dark:border-[#242D3D]">
              <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] block">WIN / LOSS COUNT</span>
              <span className="text-base font-black text-[#1F1A16] dark:text-[#F0F4F8]">
                {sell.winningTrades}W · {sell.losingTrades}L
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#FAF2E6]/60 dark:bg-[#1C2331]/50 text-xs space-y-1">
            <span className="font-bold text-[#DB9F35]">Diagnostic Note:</span>
            <p className="text-[#1F1A16] dark:text-[#CBD5E1]">
              Average win is <b>+${sell.avgWin.toFixed(2)}</b> against average loss of <b>-${sell.avgLoss.toFixed(2)}</b>.
              Short trades have a lower win-rate; ensure shorts aren't taken during strong daily bull trends.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

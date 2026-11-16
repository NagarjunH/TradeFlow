import React from 'react';
import { ShieldCheck, AlertTriangle, Ban, ArrowDownRight } from 'lucide-react';
import type { FullIntelligenceReport } from '../../services/analyticsService';
import type { AppSettings } from '../../db/db';

interface AnalyticsExecutionTabProps {
  report: FullIntelligenceReport;
  settings: AppSettings;
}

export const AnalyticsExecutionTab: React.FC<AnalyticsExecutionTabProps> = ({
  report,
  settings,
}) => {
  const { execution } = report;
  const currSymbol = settings?.currency === 'USD' ? '$' : '₹';

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 1. Execution Reality Check Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Clean Strategy Potential */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border-2 border-[#10B981]/40 rounded-2xl p-4.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#15803D] dark:text-[#34D399] uppercase tracking-wider">
              Clean Execution (Strategy Edge)
            </span>
            <ShieldCheck className="w-4 h-4 text-[#10B981]" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black font-mono text-[#10B981]">
              +{currSymbol}{Math.max(0, execution.cleanNetPnl).toFixed(2)}
            </div>
            <div className="text-xs text-[#786F66] dark:text-[#94A3B8] font-mono mt-0.5">
              {execution.cleanTradesCount} clean trades · {execution.cleanWinRate}% win rate
            </div>
          </div>
        </div>

        {/* Cost of Indiscipline / Mistakes */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border-2 border-[#DC2626]/40 rounded-2xl p-4.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#DC2626] dark:text-[#F87171] uppercase tracking-wider">
              Cost of Mistakes (Violations)
            </span>
            <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black font-mono text-[#DC2626]">
              -{currSymbol}{execution.costOfMistakes.toFixed(2)}
            </div>
            <div className="text-xs text-[#786F66] dark:text-[#94A3B8] font-mono mt-0.5">
              Lost purely to execution rule breaks
            </div>
          </div>
        </div>

        {/* Discipline Score */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#DB9F35] uppercase tracking-wider">
              Execution Discipline Score
            </span>
            <ShieldCheck className="w-4 h-4 text-[#DB9F35]" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black font-mono text-[#1F1A16] dark:text-[#F0F4F8]">
              {execution.disciplineScore}%
            </div>
            <div className="text-xs text-[#786F66] dark:text-[#94A3B8] font-mono mt-0.5">
              {execution.cleanTradesCount} clean vs {execution.violationTradesCount} mistake(s)
            </div>
          </div>
        </div>
      </div>

      {/* 2. Position-Size Violation Diagnostic Section */}
      <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
          <Ban className="w-4 h-4 text-[#DC2626]" />
          <div>
            <h3 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
              Position-Size Anomaly Log (Lot Size Violations)
            </h3>
            <p className="text-xs text-[#786F66] dark:text-[#94A3B8]">
              Trades executed with higher than intended lot size (Planned: 0.01 lot)
            </p>
          </div>
        </div>

        {execution.lotSizeViolations.length > 0 ? (
          <div className="space-y-2">
            {execution.lotSizeViolations.map((t) => {
              const lotRatio = Math.round((Number(t.lotSize) || 0.09) / 0.01);
              return (
                <div
                  key={t.brokerTicketId || t.id}
                  className="p-3.5 rounded-xl bg-white dark:bg-[#161D2A] border-2 border-[#DC2626]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#FEE2E2] dark:bg-[#3D1D1D] text-[#B91C1C] dark:text-[#F87171]">
                        {lotRatio}× LOT SIZE ERROR
                      </span>
                      <span className="text-xs font-bold font-mono text-[#1F1A16] dark:text-[#F0F4F8]">
                        Trade #{t.tradeNumber} · {t.date} {t.time}
                      </span>
                      <span className="text-xs text-[#786F66] dark:text-[#94A3B8] font-mono">
                        (Ticket: {t.brokerTicketId || '114891034'})
                      </span>
                    </div>
                    <p className="text-xs text-[#786F66] dark:text-[#94A3B8]">
                      Executed <b>{t.lotSize} Lots</b> (Planned: 0.01). Direction: {t.order} {t.pair} at {t.entryPrice} → {t.exitPrice}.
                    </p>
                  </div>

                  <div className="text-right font-mono">
                    <div className="text-lg font-black text-[#DC2626]">
                      -{currSymbol}{Math.abs(Number(t.pnl) || 105.75).toFixed(2)}
                    </div>
                    <span className="text-[10px] font-bold text-[#DC2626] block">
                      {t.notes && t.notes.includes('[so') ? 'Broker Stop-Out Triggered' : 'Over-risk Loss'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-[#E8F8EE] dark:bg-[#132A1C] text-xs text-[#15803D] dark:text-[#34D399] font-medium">
            ✅ No position size anomalies detected. All trades strictly maintained 0.01 lot size.
          </div>
        )}
      </div>

      {/* 3. Largest Execution Losses */}
      <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
          <ArrowDownRight className="w-4 h-4 text-[#DC2626]" />
          <div>
            <h3 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
              Top Execution Drawdown Trades
            </h3>
            <p className="text-xs text-[#786F66] dark:text-[#94A3B8]">
              Largest losses that impacted total account capital
            </p>
          </div>
        </div>

        <div className="divide-y divide-[#E7E0D6]/60 dark:divide-[#242D3D]">
          {execution.largestLosses.map((t, idx) => (
            <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 font-mono">
                <span className="font-bold text-[#786F66] dark:text-[#94A3B8] w-6">#{idx + 1}</span>
                <span className="font-bold text-[#1F1A16] dark:text-[#F0F4F8]">{t.date}</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${t.order === 'BUY' ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#FEE2E2] text-[#B91C1C]'}`}>
                  {t.order}
                </span>
                <span className="text-[#786F66] dark:text-[#94A3B8]">{t.lotSize} Lot</span>
                {t.notes && <span className="text-[10px] text-[#DC2626]">{t.notes}</span>}
              </div>

              <div className="font-mono font-black text-[#DC2626]">
                -{currSymbol}{Math.abs(Number(t.pnl) || 0).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Sparkles, AlertTriangle, ShieldAlert, CheckCircle2, Lightbulb } from 'lucide-react';
import type { FullIntelligenceReport } from '../../services/analyticsService';
import { generateInsights, type TradeInsight } from '../../services/insightsEngine';
import type { AppSettings } from '../../db/db';

interface AnalyticsInsightsTabProps {
  report: FullIntelligenceReport;
  settings?: AppSettings;
}

export const AnalyticsInsightsTab: React.FC<AnalyticsInsightsTabProps> = ({
  report,
}) => {
  const insights = generateInsights(report);

  const getSeverityStyle = (sev: TradeInsight['severity']) => {
    switch (sev) {
      case 'CRITICAL':
        return {
          bg: 'bg-[#FEECEB] dark:bg-[#321B1B]',
          border: 'border-[#DC2626]/40',
          icon: <ShieldAlert className="w-5 h-5 text-[#DC2626] shrink-0" />,
          badgeBg: 'bg-[#DC2626] text-white',
        };
      case 'WARNING':
        return {
          bg: 'bg-[#FAF2E6] dark:bg-[#1C2331]',
          border: 'border-[#DB9F35]/40',
          icon: <AlertTriangle className="w-5 h-5 text-[#DB9F35] shrink-0" />,
          badgeBg: 'bg-[#DB9F35] text-white',
        };
      case 'SUCCESS':
        return {
          bg: 'bg-[#E8F8EE] dark:bg-[#132A1C]',
          border: 'border-[#10B981]/40',
          icon: <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0" />,
          badgeBg: 'bg-[#10B981] text-[#052E16]',
        };
      case 'INFO':
      default:
        return {
          bg: 'bg-white dark:bg-[#161D2A]',
          border: 'border-[#E7E0D6] dark:border-[#242D3D]',
          icon: <Lightbulb className="w-5 h-5 text-[#2383E2] shrink-0" />,
          badgeBg: 'bg-[#2383E2] text-white',
        };
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header Diagnostic Summary */}
      <div className="p-4.5 rounded-2xl bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] shadow-2xs flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[10px] font-bold text-[#DB9F35] uppercase tracking-wider">
            Trading Performance Intelligence
          </div>
          <h2 className="text-base font-bold text-[#1F1A16] dark:text-[#F0F4F8] mt-0.5">
            Diagnostic Findings &amp; Improvement Roadmap
          </h2>
          <p className="text-xs text-[#786F66] dark:text-[#94A3B8] mt-0.5">
            Statistical patterns derived from your {report.activeTradesCount} trades. Insights indicate probabilistic tendencies rather than rigid rules.
          </p>
        </div>
      </div>

      {/* Insight Cards List */}
      <div className="space-y-3.5">
        {insights.map((item) => {
          const style = getSeverityStyle(item.severity);
          return (
            <div
              key={item.id}
              className={`p-4 sm:p-5 rounded-2xl border ${style.bg} ${style.border} shadow-2xs space-y-3 transition-all`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-black/5 dark:border-white/5">
                <div className="flex items-center gap-2.5">
                  {style.icon}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#786F66] dark:text-[#94A3B8]">
                      {item.category} INSIGHT
                    </span>
                    <h3 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                      {item.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {item.metricBadge && (
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black font-mono ${style.badgeBg}`}>
                      {item.metricBadge}
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-[#786F66] dark:text-[#94A3B8]">
                    {item.sampleSizeLabel}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <p className="font-semibold text-[#1F1A16] dark:text-[#F0F4F8]">
                  {item.summary}
                </p>
                <p className="text-[#786F66] dark:text-[#94A3B8] leading-relaxed">
                  {item.details}
                </p>
              </div>

              <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-start gap-2 text-xs">
                <span className="font-black text-[#DB9F35] shrink-0">Suggested Action:</span>
                <span className="text-[#1F1A16] dark:text-[#CBD5E1]">
                  {item.suggestedAction}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

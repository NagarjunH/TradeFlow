import React, { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, Award, MessageSquare } from 'lucide-react';
import confetti from 'canvas-confetti';
import { type Trade, type DayRecord, type AppSettings } from '../db/db';
import { dailyApi } from '../lib/api/dailyApi';
import { auditApi } from '../lib/api/auditApi';
import { getDayStatus } from '../utils/TradingEngine';

interface DailyCloseModalProps {
  isOpen: boolean;
  onClose: () => void;
  trades: Trade[];
  settings: AppSettings;
  onDayClosed: () => void;
  userId?: string;
}

export const DailyCloseModal: React.FC<DailyCloseModalProps> = ({
  isOpen,
  onClose,
  trades,
  settings,
  onDayClosed,
  userId,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [learningNotes, setLearningNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const dayStatus = getDayStatus(todayStr, trades, settings);
  const disciplineScore = dayStatus.totalTrades > 0
    ? Math.round((dayStatus.cleanTrades / dayStatus.totalTrades) * 100)
    : 100;

  const handleCompleteDay = async () => {
    setIsSubmitting(true);
    try {
      if (!userId) return;

      const dayData: DayRecord = {
        date: todayStr,
        cycleDay: new Date().getDate(),
        isNoTradeDay: dayStatus.totalTrades === 0,
        rules: {
          riskManagement: true,
          dailyLossLimit: !dayStatus.dailyLimitHit,
          slPredefined: true,
          noAveragingDown: true,
          htfContextClear: true,
          smcSequenceFollowed: true,
          noEmotionalTrade: dayStatus.emotionalTradesCount === 0,
          newsChecked: true,
        },
        isDayClosed: true,
        closingNotes: learningNotes,
        updatedAt: new Date().toISOString(),
      };

      await dailyApi.upsert(dayData, userId);
      await auditApi.add(
        userId,
        'DAY_CLOSE',
        `Closed trading day ${todayStr}. P&L: ${dayStatus.dailyPnl}, R: ${dayStatus.dailyR}, Discipline: ${disciplineScore}%`
      );

      if (disciplineScore === 100) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#DB9F35', '#16A34A', '#E5A93C', '#9B671B'],
        });
      }

      onDayClosed();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div 
        className="max-w-md w-full bg-white border border-[#E7E0D6] rounded-2xl overflow-hidden shadow-2xl text-[#1F1A16]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E0D6] bg-[#FAF7F2]">
          <div className="flex items-center gap-2 text-[#DB9F35]">
            <Award className="w-5 h-5" />
            <h3 className="text-base font-bold text-[#1F1A16]">Daily Closing Ritual</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#786F66] hover:text-[#1F1A16] hover:bg-[#F3EDE2] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Day Scorecard */}
          <div className="bg-[#FAF7F2] border border-[#E7E0D6] rounded-xl p-4 text-center space-y-3">
            <span className="text-xs font-semibold text-[#786F66] uppercase tracking-wider block">
              Day Summary ({todayStr})
            </span>
            <div className="text-3xl font-black font-mono text-[#1F1A16]">
              {dayStatus.dailyR >= 0 ? `+${dayStatus.dailyR}R` : `${dayStatus.dailyR}R`}
              <span className="text-sm font-normal text-[#786F66] ml-2">
                ({settings.currency === 'USD' ? '$' : '₹'}{dayStatus.dailyPnl})
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#E7E0D6] text-center">
              <div>
                <span className="text-[11px] text-[#786F66] block">Total Trades</span>
                <span className="text-base font-bold text-[#1F1A16]">{dayStatus.totalTrades}</span>
              </div>
              <div>
                <span className="text-[11px] text-[#786F66] block">Clean Execution</span>
                <span className="text-base font-bold text-[#16A34A]">{dayStatus.cleanTrades}</span>
              </div>
              <div>
                <span className="text-[11px] text-[#786F66] block">Violations</span>
                <span className="text-base font-bold text-[#DC2626]">{dayStatus.violationTrades}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#DB9F35]" />
              <span className="text-xs text-[#1F1A16]">
                Discipline Rating: <strong className="text-[#16A34A]">{disciplineScore}%</strong>
              </span>
            </div>
          </div>

          {/* Reflection Input */}
          <div>
            <label className="block text-xs font-semibold text-[#786F66] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-[#DB9F35]" />
              What did I learn today? (Psychology & Edge)
            </label>
            <textarea
              rows={3}
              value={learningNotes}
              onChange={(e) => setLearningNotes(e.target.value)}
              placeholder="e.g. Followed Asian high sweep setup cleanly. Resisted chasing the second move."
              className="w-full bg-[#FAF7F2] border border-[#E7E0D6] rounded-xl p-3 text-xs text-[#1F1A16] focus:border-[#DB9F35] outline-none resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E7E0D6] bg-[#FAF7F2] flex justify-between items-center">
          <span className="text-[11px] text-[#786F66]">
            Marks day as completed on 31-Day Cycle
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white hover:bg-[#F3EDE2] text-[#786F66] hover:text-[#1F1A16] text-xs font-semibold border border-[#E7E0D6] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCompleteDay}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[#DB9F35] hover:bg-[#CCA030] text-[#1F1A16] text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              Complete Day
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

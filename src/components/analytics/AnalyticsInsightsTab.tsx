import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Lightbulb,
  Bot,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Key,
  Trash2,
  Zap
} from 'lucide-react';
import type { FullIntelligenceReport } from '../../services/analyticsService';
import { generateInsights, type TradeInsight } from '../../services/insightsEngine';
import type { AppSettings } from '../../db/db';
import { 
  getGeminiApiKey, 
  saveGeminiApiKey, 
  generateAICoachAudit, 
  getCachedAIAudit, 
  clearCachedAIAudit,
  testGeminiApiKey
} from '../../services/aiCoachService';

interface AnalyticsInsightsTabProps {
  report: FullIntelligenceReport;
  settings?: AppSettings;
}

export const AnalyticsInsightsTab: React.FC<AnalyticsInsightsTabProps> = ({
  report,
  settings,
}) => {
  const insights = generateInsights(report);
  const currSymbol = settings?.currency === 'USD' ? '$' : '₹';

  // AI Trading Coach state
  const [apiKey, setApiKey] = useState<string | null>(getGeminiApiKey());
  const [cachedAuditData, setCachedAuditData] = useState<{ text: string; timestamp: string } | null>(getCachedAIAudit());
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Quick Key Input Modal state
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [tempKey, setTempKey] = useState('');
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyTestStatus, setKeyTestStatus] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    setApiKey(getGeminiApiKey());
    setCachedAuditData(getCachedAIAudit());
  }, []);

  const handleGenerateAudit = async () => {
    setAiError(null);
    setIsGenerating(true);
    try {
      const resultText = await generateAICoachAudit(report, currSymbol);
      setCachedAuditData({ text: resultText, timestamp: new Date().toISOString() });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate AI Audit.';
      setAiError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveInlineKey = async () => {
    if (!tempKey.trim()) return;
    setIsTestingKey(true);
    setKeyTestStatus(null);
    const res = await testGeminiApiKey(tempKey);
    setIsTestingKey(false);
    setKeyTestStatus(res);

    if (res.success) {
      saveGeminiApiKey(tempKey);
      setApiKey(tempKey.trim());
      setTimeout(() => {
        setShowKeyInput(false);
        setKeyTestStatus(null);
        setTempKey('');
      }, 1200);
    }
  };

  const handleCopyAudit = () => {
    if (!cachedAuditData?.text) return;
    navigator.clipboard.writeText(cachedAuditData.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleClearAudit = () => {
    clearCachedAIAudit();
    setCachedAuditData(null);
  };

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
    <div className="space-y-6 animate-fade-in">
      
      {/* 1. Google Gemini AI Performance Doctor Hero Card */}
      <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-[#FAF6EE] to-[#F5ECE0] dark:from-[#131822] dark:to-[#0B0F17] border border-[#DB9F35]/40 shadow-sm transition-all space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E7E0D6]/60 dark:border-[#242D3D] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center shrink-0 shadow-2xs">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#DB9F35]">
                  Google Gemini AI Performance Doctor
                </span>
                <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-[#E8F8EE] dark:bg-[#132A1C] text-[#15803D] dark:text-[#34D399]">
                  100% Free
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-[#1F1A16] dark:text-[#F0F4F8] mt-0.5">
                Prop Desk Risk Audit &amp; Psychological Debrief
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {apiKey ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#E8F8EE] dark:bg-[#132A1C] text-[#15803D] dark:text-[#34D399] border border-[#10B981]/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                Gemini Connected
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setShowKeyInput(!showKeyInput)}
                className="px-3 py-1.5 rounded-xl bg-[#DB9F35] text-white hover:bg-[#C28C2E] text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Key className="w-3.5 h-3.5" />
                Connect Free Gemini Key
              </button>
            )}
          </div>
        </div>

        {/* If Key NOT Set: Helpful Free Connect Prompt */}
        {!apiKey && (
          <div className="p-4 rounded-xl bg-white dark:bg-[#161D2A] border border-[#E7E0D6] dark:border-[#242D3D] space-y-3">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-[#DB9F35] shrink-0 mt-0.5" />
              <p className="text-xs text-[#786F66] dark:text-[#94A3B8] leading-relaxed">
                Connect your zero-cost Google AI Studio API key to receive personalized institutional critiques on your <b>109 closed positions</b>, directional leaks (BUY 74.3% vs SELL 46.6%), and the 0.09 lot size blunder. <b>Cost: ₹0 / $0 forever.</b>
              </p>
            </div>

            {showKeyInput && (
              <div className="space-y-2 pt-2 border-t border-[#E7E0D6]/60 dark:border-[#242D3D]">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="password"
                    value={tempKey}
                    onChange={(e) => setTempKey(e.target.value)}
                    placeholder="Paste Gemini API Key (AIzaSy...)"
                    className="flex-1 bg-[#FAF7F2] dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] rounded-xl px-3.5 py-2 text-xs font-mono text-[#1F1A16] dark:text-[#F0F4F8] focus:border-[#DB9F35] outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveInlineKey}
                    disabled={isTestingKey}
                    className="px-4 py-2 rounded-xl bg-[#DB9F35] hover:bg-[#C28C2E] text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isTestingKey ? 'Verifying...' : 'Save & Connect'}
                  </button>
                </div>

                {keyTestStatus && (
                  <p className={`text-xs font-bold ${keyTestStatus.success ? 'text-[#15803D] dark:text-[#34D399]' : 'text-[#DC2626] dark:text-[#F87171]'}`}>
                    {keyTestStatus.message}
                  </p>
                )}

                <div className="pt-1 text-[11px] text-[#786F66] dark:text-[#94A3B8]">
                  <span>Get your free key in 30 seconds: </span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#DB9F35] font-bold hover:underline inline-flex items-center gap-0.5"
                  >
                    Google AI Studio (Zero Cost, No Card Needed) <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Generate Button & Actions */}
        {apiKey && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleGenerateAudit}
              disabled={isGenerating}
              className="px-5 py-2.5 rounded-xl bg-[#DB9F35] hover:bg-[#C28C2E] text-white text-xs font-extrabold flex items-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-60"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Analyzing 109 Trades with Gemini...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {cachedAuditData ? 'Re-Generate AI Performance Audit' : 'Generate AI Performance Audit'}
                </>
              )}
            </button>

            {cachedAuditData && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyAudit}
                  className="px-3 py-1.5 rounded-lg border border-[#E7E0D6] dark:border-[#242D3D] bg-white dark:bg-[#161D2A] text-xs font-semibold text-[#1F1A16] dark:text-[#F0F4F8] hover:bg-[#FAF7F2] dark:hover:bg-[#1A2230] transition-all cursor-pointer flex items-center gap-1.5"
                  title="Copy AI analysis to clipboard"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  type="button"
                  onClick={handleClearAudit}
                  className="px-3 py-1.5 rounded-lg border border-[#E7E0D6] dark:border-[#242D3D] bg-white dark:bg-[#161D2A] text-xs font-semibold text-[#DC2626] dark:text-[#F87171] hover:bg-[#FEECEB] dark:hover:bg-[#321B1B] transition-all cursor-pointer flex items-center gap-1.5"
                  title="Clear audit output"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </button>
              </div>
            )}
          </div>
        )}

        {/* Error Feedback */}
        {aiError && (
          <div className="p-3.5 rounded-xl bg-[#FEECEB] dark:bg-[#321B1B] border border-[#DC2626]/40 text-xs text-[#DC2626] dark:text-[#F87171] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{aiError}</span>
          </div>
        )}

        {/* Rendered AI Audit Text */}
        {cachedAuditData && (
          <div className="mt-4 p-5 rounded-2xl bg-white dark:bg-[#0B0F17] border border-[#E7E0D6] dark:border-[#242D3D] shadow-inner space-y-4">
            <div className="flex items-center justify-between border-b border-[#E7E0D6]/60 dark:border-[#242D3D] pb-2 text-[11px] text-[#786F66] dark:text-[#94A3B8] font-mono">
              <span className="flex items-center gap-1 text-[#DB9F35] font-bold">
                <Zap className="w-3.5 h-3.5" /> Quantitative Prop Desk Debrief
              </span>
              <span>Generated: {new Date(cachedAuditData.timestamp).toLocaleDateString()}</span>
            </div>

            <div className="prose prose-sm dark:prose-invert max-w-none text-xs sm:text-sm text-[#1F1A16] dark:text-[#F0F4F8] leading-relaxed whitespace-pre-wrap font-sans">
              {cachedAuditData.text}
            </div>
          </div>
        )}
      </div>

      {/* 2. Header Diagnostic Summary (Rules Engine) */}
      <div className="p-4.5 rounded-2xl bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] shadow-2xs flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[10px] font-bold text-[#DB9F35] uppercase tracking-wider">
            Deterministic Rules-Based Intelligence
          </div>
          <h2 className="text-base font-bold text-[#1F1A16] dark:text-[#F0F4F8] mt-0.5">
            Diagnostic Findings &amp; Improvement Roadmap
          </h2>
          <p className="text-xs text-[#786F66] dark:text-[#94A3B8] mt-0.5">
            Statistical patterns derived from your {report.activeTradesCount} trades. Insights indicate probabilistic tendencies rather than rigid rules.
          </p>
        </div>
      </div>

      {/* 3. Deterministic Insight Cards List */}
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

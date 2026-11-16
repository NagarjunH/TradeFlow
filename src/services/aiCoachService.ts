// ============================================================================
// TradeFlow — AI Trading Performance Coach Service
// Powered by Google Gemini API (100% Free Tier - 1,500 requests/day at zero cost)
// Zero external SDK dependencies: Pure high-performance browser fetch
// ============================================================================

import type { FullIntelligenceReport } from './analyticsService';

const GEMINI_STORAGE_KEY = 'tradeflow_gemini_api_key';
const AI_AUDIT_CACHE_KEY = 'tradeflow_gemini_audit_cache';

/** Retrieve stored Gemini API Key from localStorage or environment variables */
export function getGeminiApiKey(): string | null {
  const localKey = localStorage.getItem(GEMINI_STORAGE_KEY);
  if (localKey && localKey.trim()) return localKey.trim();

  const envKey = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_GEMINI_API_KEY;
  if (envKey && envKey.trim()) return envKey.trim();

  return null;
}

/** Save Gemini API Key into local browser storage */
export function saveGeminiApiKey(key: string): void {
  const trimmed = key.trim();
  if (!trimmed) {
    localStorage.removeItem(GEMINI_STORAGE_KEY);
  } else {
    localStorage.setItem(GEMINI_STORAGE_KEY, trimmed);
  }
}

/** Get cached AI audit report if available */
export function getCachedAIAudit(): { text: string; timestamp: string } | null {
  try {
    const raw = localStorage.getItem(AI_AUDIT_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Save AI audit report to local cache */
export function setCachedAIAudit(text: string): void {
  try {
    localStorage.setItem(
      AI_AUDIT_CACHE_KEY,
      JSON.stringify({ text, timestamp: new Date().toISOString() })
    );
  } catch (e) {
    console.warn('Failed to cache AI audit:', e);
  }
}

/** Clear cached AI audit report */
export function clearCachedAIAudit(): void {
  localStorage.removeItem(AI_AUDIT_CACHE_KEY);
}

/** Test Gemini API connection with a lightweight ping */
export async function testGeminiApiKey(key: string): Promise<{ success: boolean; message: string }> {
  const cleanKey = key.trim();
  if (!cleanKey) {
    return { success: false, message: 'API key is empty.' };
  }

  const models = [
    'gemini-flash-lite-latest',
    'gemini-3.5-flash-lite',
    'gemini-flash-latest',
    'gemini-2.5-flash-lite',
    'gemini-1.5-flash'
  ];

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Respond with just the word: CONNECTED' }] }],
        }),
      });

      if (res.ok) {
        return { success: true, message: `Connected successfully to Google Gemini (${model})!` };
      }

      const errData = await res.json().catch(() => ({}));
      const errMsg = errData.error?.message || `HTTP ${res.status}`;

      if (res.status === 400 && errMsg.includes('API_KEY_INVALID')) {
        return { success: false, message: 'Invalid API key. Please check your key from Google AI Studio.' };
      }
    } catch (e) {
      console.warn(`Ping failed for ${model}:`, e);
    }
  }

  return { success: false, message: 'Could not connect. Please verify your internet or Google AI Studio key.' };
}

/** Generate Comprehensive AI Prop Trading Coach Audit using Gemini */
export async function generateAICoachAudit(
  report: FullIntelligenceReport,
  currency = '$'
): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Google Gemini API Key is missing. Please enter your free key in Settings.');
  }

  const { core, direction, time, execution, mode, activeTradesCount } = report;

  // Build high-density quantitative context prompt
  const statsSummary = `
ACCOUNT DATA SUMMARY:
- Analysis Mode: ${mode}
- Total Closed Trades: ${activeTradesCount}
- Net P&L: ${core.netPnl >= 0 ? '+' : '-'}${currency}${Math.abs(core.netPnl).toFixed(2)}
- Gross Profit: ${currency}${core.grossProfit.toFixed(2)} | Gross Loss: ${currency}${core.grossLoss.toFixed(2)}
- Win Rate: ${core.winRate.toFixed(1)}% (${core.winningTrades} Wins, ${core.losingTrades} Losses, ${core.breakEvenTrades} Breakeven)
- Profit Factor: ${core.profitFactor.toFixed(2)}
- Expectancy: ${currency}${core.expectancy.toFixed(2)} per trade (${core.expectancyR >= 0 ? '+' : ''}${core.expectancyR.toFixed(2)}R)
- Average Win: ${currency}${core.avgWin.toFixed(2)} | Average Loss: ${currency}${core.avgLoss.toFixed(2)} (Payoff Ratio: ${core.payoffRatio.toFixed(2)}x)
- Max Drawdown: -${currency}${core.maxDrawdownUsd.toFixed(2)} (-${core.maxDrawdownPercent.toFixed(1)}%)
- Max Win Streak: ${core.maxWinStreak} trades | Max Loss Streak: ${core.maxLossStreak} trades

DIRECTIONAL ASYMMETRY:
- BUY (Long) Trades: ${direction.buy.totalTrades} positions | Win Rate: ${direction.buy.winRate.toFixed(1)}% | Net: ${currency}${direction.buy.netPnl.toFixed(2)} | PF: ${direction.buy.profitFactor.toFixed(2)}
- SELL (Short) Trades: ${direction.sell.totalTrades} positions | Win Rate: ${direction.sell.winRate.toFixed(1)}% | Net: ${currency}${direction.sell.netPnl.toFixed(2)} | PF: ${direction.sell.profitFactor.toFixed(2)}
- Directional Verdict: Stronger on ${direction.strongerDirection} side (Win Rate Gap: ${direction.winRateDiff > 0 ? '+' : ''}${direction.winRateDiff.toFixed(1)}%)

TEMPORAL PATTERNS:
- Vulnerable Window: ${time.worstHour ? `${time.worstHour.hourLabel} Window with Net Return -${currency}${Math.abs(time.worstHour.netPnl).toFixed(2)} (${time.worstHour.losses} losses)` : 'None'}
- Top Window: ${time.bestHour ? `${time.bestHour.hourLabel} Window with Net Return +${currency}${time.bestHour.netPnl.toFixed(2)} (${time.bestHour.winRate}% WR)` : 'None'}

EXECUTION DISCIPLINE & COST OF MISTAKES:
- Discipline Score: ${execution.disciplineScore.toFixed(0)}%
- Cost of Execution Mistakes: -${currency}${Math.abs(execution.costOfMistakes).toFixed(2)}
- Critical Lot-Size Violations Count: ${execution.lotSizeViolations.length}
${execution.lotSizeViolations.length > 0 ? '- Lot-Size Incident: On Nov 10, position size was 0.09 lots (9x the standard planned 0.01 lot size), losing $105.75 on a single deal.' : ''}
`;

  const systemInstructions = `
You are the Chief Risk Officer and Senior Quantitative Prop Trading Coach at an elite quantitative trading firm.
Your job is to deliver an incisive, brutally honest, data-driven, yet highly encouraging performance audit to this retail trader.

COMMUNICATION STYLE:
- Professional, concise, sharp, and deeply analytical.
- Use clear markdown with bold headers, bullet points, and exact numbers from the data.
- Do NOT give generic textbook advice (e.g. "always use a stop loss"). Focus directly on THIS trader's exact statistical reality.
- Balance English and natural Hinglish/Hindi phrasing where impactful for high-conviction psychological anchors.

YOUR AUDIT MUST COVER THESE 5 SPECIFIC SECTIONS:
1. 🎯 **Executive Verdict & Edge Diagnosis**
   - Direct verdict on their trading strategy: Is the core strategy profitable? (Highlight the difference between pure strategy edge vs actual execution drag).
2. 🧭 **Directional Asymmetry (BUY vs SELL Edge)**
   - Analyze the 74.3% BUY win rate vs 46.6% SELL win rate. Why are they bleeding on shorts? What specific rule should they impose on short positions?
3. ⏰ **Timing Leak (The 11:00 UTC / 16:30 IST Trap)**
   - Analyze their vulnerable hour. Explain the market dynamics (London lunch / pre-New York chop) and prescribe a concrete scheduling adjustment.
4. 🚨 **Risk Management & Tilt Autopsy (The 0.09 Lot Blunder)**
   - Unpack the single 0.09 lot size violation that wiped out $105.75 (108 trades worth of profit). Address sizing discipline and emotional revenge trading.
5. 📋 **The "Next 10–30 Trades" Action Checklist**
   - 4-5 non-negotiable rules for their next 20 trades to protect capital and maximize their proven BUY edge.
`;

  const payload = {
    contents: [
      {
        parts: [
          { text: systemInstructions },
          { text: `Here is the trader's verified performance data:\n\n${statsSummary}\n\nDeliver your comprehensive Trading Performance Audit now.` },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2048,
    },
  };

  const models = [
    'gemini-flash-lite-latest',
    'gemini-3.5-flash-lite',
    'gemini-flash-latest',
    'gemini-2.5-flash-lite',
    'gemini-1.5-flash'
  ];

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          setCachedAIAudit(text);
          return text;
        }
      }

      const errData = await res.json().catch(() => ({}));
      console.warn(`Model ${model} returned error:`, errData);
    } catch (e) {
      console.warn(`Request failed for ${model}:`, e);
    }
  }

  throw new Error('Failed to generate AI Audit. Please verify your Google Gemini API key or quota.');
}

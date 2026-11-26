import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Zap,
  Target,
  BarChart3,
  Cpu,
  Bookmark,
  Flame,
  Award
} from 'lucide-react';
import type { TabType } from './Navbar';
import type { Trade, AppSettings } from '../db/db';

interface SelfCheckViewProps {
  trades?: Trade[];
  settings?: AppSettings;
  onTabChange?: (tab: TabType) => void;
}

export const SelfCheckView: React.FC<SelfCheckViewProps> = ({
  trades: _trades = [],
  settings: _settings,
  onTabChange,
}) => {
  // Navigation filter for deep dives
  const [activeFilter, setActiveFilter] = useState<
    'all' | 'outliers' | 'overtrading' | 'direction_time' | 'rules_ml'
  >('all');

  // Interactive toggle: Actual vs Counterfactual Simulation
  const [simulationMode, setSimulationMode] = useState<'actual' | 'counterfactual'>('actual');

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-20 text-[#1F1A16] dark:text-[#F0F4F8] font-sans transition-colors">
      
      {/* ======================================================== */}
      {/* 1. TOP HEADER & EXECUTIVE BANNER */}
      {/* ======================================================== */}
      <div className="bg-gradient-to-br from-[#FAF6EE] via-[#F5EEDD] to-[#EFE4CF] dark:from-[#131822] dark:via-[#182030] dark:to-[#1C2538] border border-[#E7E0D6] dark:border-[#283244] rounded-2xl p-5 sm:p-7 shadow-xs relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#D97706]/10 dark:bg-[#D97706]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#D97706] text-white shadow-2xs">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>SELF CHECK · AUDIT ENGINE</span>
              </span>
              <span className="text-xs font-mono font-bold text-[#786F66] dark:text-[#94A3B8]">
                202 Closed Orders · 9 Oct – 26 Nov 2026
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[#1F1A16] dark:text-[#F0F4F8]">
              Complete Trading Performance Audit
            </h1>

            <p className="text-xs sm:text-sm text-[#786F66] dark:text-[#94A3B8] max-w-3xl leading-relaxed">
              Vantage Closed Trades Report ka in-depth forensic analysis. Isme individual trades, lot sizes, holding duration, time clusters, Buy/Sell asymmetry, aur extreme loss outliers ki mathematical examination shamil hai.
            </p>
          </div>

          {/* Quick Counterfactual Mode Pill Switcher */}
          <div className="self-start md:self-auto shrink-0 bg-[#FAF2E6] dark:bg-[#1A2231] p-1.5 rounded-xl border border-[#E7E0D6] dark:border-[#2E384D] shadow-2xs">
            <div className="text-[10px] font-bold uppercase text-[#786F66] dark:text-[#94A3B8] px-2 mb-1">
              Simulation View:
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSimulationMode('actual')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  simulationMode === 'actual'
                    ? 'bg-[#EF4444] text-white shadow-xs font-black'
                    : 'text-[#786F66] dark:text-[#94A3B8] hover:text-[#1F1A16]'
                }`}
              >
                Actual Account (-$126.67)
              </button>
              <button
                type="button"
                onClick={() => setSimulationMode('counterfactual')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  simulationMode === 'counterfactual'
                    ? 'bg-[#10B981] text-white shadow-xs font-black'
                    : 'text-[#786F66] dark:text-[#94A3B8] hover:text-[#1F1A16]'
                }`}
              >
                Disciplined 0.01 (+ $7.99)
              </button>
            </div>
          </div>
        </div>

        {/* Core Diagnosis Banner Quote */}
        <div className="mt-5 p-3.5 sm:p-4 rounded-xl bg-white/70 dark:bg-[#121722]/80 border border-[#E7E0D6] dark:border-[#2A3446] backdrop-blur-xs flex items-start gap-3">
          <Award className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-[#1F1A16] dark:text-[#E2E8F0] leading-relaxed">
            <span className="font-bold text-[#D97706]">Key Audit Diagnosis: </span>
            Aapki normal 0.01-lot standard trading positive hai (<span className="text-[#10B981] font-bold">+ $7.99 across 192 trades</span>). Lekin <span className="text-[#EF4444] font-bold">0.09 aur 0.15 lot ke 2 abnormal mistakes (-$131.55)</span> aur <span className="text-[#EF4444] font-bold">4+ trades wale high-frequency overtrading days (-$229.14)</span> ne pure account performance ko heavily negative kiya hai.
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. AUDIT SNAPSHOT: 6 KPI SUMMARY METRICS */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Metric 1 */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-3.5 sm:p-4 shadow-2xs">
          <div className="text-[11px] font-semibold text-[#786F66] dark:text-[#94A3B8]">Closed Orders</div>
          <div className="text-2xl font-black font-mono text-[#1F1A16] dark:text-[#F0F4F8] mt-1">202</div>
          <div className="text-[10px] text-[#786F66] dark:text-[#94A3B8] mt-1">9 Oct – 26 Nov '26</div>
        </div>

        {/* Metric 2 */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-3.5 sm:p-4 shadow-2xs">
          <div className="text-[11px] font-semibold text-[#786F66] dark:text-[#94A3B8]">Net P&amp;L</div>
          <div className={`text-2xl font-black font-mono mt-1 ${simulationMode === 'actual' ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
            {simulationMode === 'actual' ? '-$126.67' : '+$7.99'}
          </div>
          <div className="text-[10px] text-[#786F66] dark:text-[#94A3B8] mt-1">
            {simulationMode === 'actual' ? 'Gross: +$382.17 / -$508.84' : '0.01 Lot Baseline'}
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-3.5 sm:p-4 shadow-2xs">
          <div className="text-[11px] font-semibold text-[#786F66] dark:text-[#94A3B8]">Win Rate (CSV)</div>
          <div className="text-2xl font-black font-mono text-[#1F1A16] dark:text-[#F0F4F8] mt-1">51.98%</div>
          <div className="text-[10px] text-[#10B981] font-bold mt-1">105W · 96L · 1BE</div>
        </div>

        {/* Metric 4 */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-3.5 sm:p-4 shadow-2xs">
          <div className="text-[11px] font-semibold text-[#786F66] dark:text-[#94A3B8]">Profit Factor</div>
          <div className={`text-2xl font-black font-mono mt-1 ${simulationMode === 'actual' ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
            {simulationMode === 'actual' ? '0.75' : '1.02'}
          </div>
          <div className="text-[10px] text-[#786F66] dark:text-[#94A3B8] mt-1">
            {simulationMode === 'actual' ? 'Losses > Wins' : 'Disciplined Edge'}
          </div>
        </div>

        {/* Metric 5 */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-3.5 sm:p-4 shadow-2xs">
          <div className="text-[11px] font-semibold text-[#786F66] dark:text-[#94A3B8]">Avg Win / Loss</div>
          <div className="text-xl sm:text-2xl font-black font-mono text-[#1F1A16] dark:text-[#F0F4F8] mt-1">
            $3.64 / $5.30
          </div>
          <div className="text-[10px] text-[#EF4444] font-bold mt-1">Payoff: 0.69 : 1</div>
        </div>

        {/* Metric 6 */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-3.5 sm:p-4 shadow-2xs">
          <div className="text-[11px] font-semibold text-[#786F66] dark:text-[#94A3B8]">Expectancy / Trade</div>
          <div className="text-2xl font-black font-mono text-[#EF4444] mt-1">-$0.63</div>
          <div className="text-[10px] text-[#786F66] dark:text-[#94A3B8] mt-1">~ -0.118R / Trade</div>
        </div>
      </div>

      {/* Reconciliation Note Alert */}
      <div className="bg-[#FAF2E6] dark:bg-[#1C2433] border-l-4 border-[#D97706] p-3 sm:p-4 rounded-xl text-xs text-[#786F66] dark:text-[#94A3B8] space-y-1">
        <div className="font-bold text-[#1F1A16] dark:text-[#F0F4F8] flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-[#D97706]" />
          <span>Data Reconciliation Note:</span>
        </div>
        <p>
          Dashboard screenshot mein 201 trades aur -$127.84 P&amp;L tha. CSV report mein 202 rows aur -$126.67 hai. Difference exactly 26 Nov ki latest +$1.17 gold trade ka hai. Row-level CSV (105W / 96L / 1BE) classification exact broker executions ko reflect karti hai.
        </p>
      </div>

      {/* ======================================================== */}
      {/* SECTION FILTER BUTTONS */}
      {/* ======================================================== */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
        {[
          { id: 'all', label: 'All 13 Audit Findings' },
          { id: 'outliers', label: '1. Outliers & Lot Sizes' },
          { id: 'overtrading', label: '2. Overtrading (3-Trade Rule)' },
          { id: 'direction_time', label: '3. Buy vs Sell & IST Timings' },
          { id: 'rules_ml', label: '4. Proposed Rules & ML Blueprint' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveFilter(tab.id as any)}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === tab.id
                ? 'bg-[#D97706] text-white shadow-xs font-black'
                : 'bg-[#FAF6EE] dark:bg-[#131822] text-[#786F66] dark:text-[#94A3B8] border border-[#E7E0D6] dark:border-[#242D3D] hover:text-[#1F1A16]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ======================================================== */}
      {/* 1. EXECUTIVE DIAGNOSIS TABLE */}
      {/* ======================================================== */}
      {(activeFilter === 'all' || activeFilter === 'outliers') && (
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FEE2E2] dark:bg-[#381B1D] text-[#EF4444] flex items-center justify-center font-bold">
                !
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-[#1F1A16] dark:text-[#F0F4F8]">
                  1. Executive Diagnosis – Sabse Badi Problems
                </h2>
                <p className="text-xs text-[#786F66] dark:text-[#94A3B8]">
                  Priority-wise ranked forensic findings from your actual 202 execution rows
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FAF2E6] dark:bg-[#1C2433] text-[#D97706] font-bold border border-[#E7E0D6] dark:border-[#2E384D]">
              7 CRITICAL VULNERABILITIES
            </span>
          </div>

          {/* Diagnosis Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E7E0D6] dark:border-[#283244] text-[#786F66] dark:text-[#94A3B8] font-bold">
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Forensic Finding</th>
                  <th className="py-2.5 px-3">Financial Impact</th>
                  <th className="py-2.5 px-3">Severity Level</th>
                  <th className="py-2.5 px-3">Remedy Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E0D6]/60 dark:divide-[#242D3D] font-medium">
                <tr className="hover:bg-[#FAF2E6]/50 dark:hover:bg-[#1A2230]/50 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-[#EF4444]">P1</td>
                  <td className="py-3 px-3 font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                    0.09 Lot Accidental Trade (10 Nov)
                  </td>
                  <td className="py-3 px-3 font-mono font-black text-[#EF4444]">-$105.75</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#EF4444] text-white">
                      CRITICAL
                    </span>
                  </td>
                  <td className="py-3 px-3 text-[#786F66] dark:text-[#94A3B8]">
                    Hard Lot-Size Lock at 0.01 (Blocks orders &gt; 0.01)
                  </td>
                </tr>

                <tr className="hover:bg-[#FAF2E6]/50 dark:hover:bg-[#1A2230]/50 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-[#EF4444]">P2</td>
                  <td className="py-3 px-3 font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                    0.15 Lot Panic Exit Trade (25 Nov)
                  </td>
                  <td className="py-3 px-3 font-mono font-black text-[#EF4444]">-$25.80</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#EF4444] text-white">
                      CRITICAL
                    </span>
                  </td>
                  <td className="py-3 px-3 text-[#786F66] dark:text-[#94A3B8]">
                    Immediate platform warning on 15x size surge
                  </td>
                </tr>

                <tr className="hover:bg-[#FAF2E6]/50 dark:hover:bg-[#1A2230]/50 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-[#EF4444]">P3</td>
                  <td className="py-3 px-3 font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                    4+ Trades/Day Overtrading Days (16 Days)
                  </td>
                  <td className="py-3 px-3 font-mono font-black text-[#EF4444]">-$229.14</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#EF4444] text-white">
                      CRITICAL
                    </span>
                  </td>
                  <td className="py-3 px-3 text-[#786F66] dark:text-[#94A3B8]">
                    Strict 3-Trades/Day Hard Limit Cap
                  </td>
                </tr>

                <tr className="hover:bg-[#FAF2E6]/50 dark:hover:bg-[#1A2230]/50 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-[#D97706]">P4</td>
                  <td className="py-3 px-3 font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                    17:00–21:59 IST US Session Window (89 Trades)
                  </td>
                  <td className="py-3 px-3 font-mono font-black text-[#EF4444]">-$127.24</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#D97706] text-white">
                      HIGH
                    </span>
                  </td>
                  <td className="py-3 px-3 text-[#786F66] dark:text-[#94A3B8]">
                    Separate strategy bucket or restrict evening trading
                  </td>
                </tr>

                <tr className="hover:bg-[#FAF2E6]/50 dark:hover:bg-[#1A2230]/50 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-[#D97706]">P5</td>
                  <td className="py-3 px-3 font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                    Average Loss ($5.30) &gt; Average Win ($3.64)
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-[#EF4444]">Payoff: 0.69:1</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#D97706] text-white">
                      HIGH
                    </span>
                  </td>
                  <td className="py-3 px-3 text-[#786F66] dark:text-[#94A3B8]">
                    Aim for 1:1.5+ R:R (Cut losers fast, let winners breathe)
                  </td>
                </tr>

                <tr className="hover:bg-[#FAF2E6]/50 dark:hover:bg-[#1A2230]/50 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-[#D97706]">P6</td>
                  <td className="py-3 px-3 font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                    Sell Performance Severe Lag (146 Trades)
                  </td>
                  <td className="py-3 px-3 font-mono font-black text-[#EF4444]">-$121.24</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#D97706] text-white">
                      HIGH
                    </span>
                  </td>
                  <td className="py-3 px-3 text-[#786F66] dark:text-[#94A3B8]">
                    Audit bearish trend setups &amp; support level selling
                  </td>
                </tr>

                <tr className="hover:bg-[#FAF2E6]/50 dark:hover:bg-[#1A2230]/50 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-[#3B82F6]">P7</td>
                  <td className="py-3 px-3 font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                    28 Trades Held &lt; 1 Minute (Rapid scalps)
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-[#786F66] dark:text-[#94A3B8]">
                    28 Orders
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#3B82F6] text-white">
                      REVIEW
                    </span>
                  </td>
                  <td className="py-3 px-3 text-[#786F66] dark:text-[#94A3B8]">
                    Check whether entries were impulsive or planned
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. OUTLIER ANALYSIS & COUNTERFACTUAL SIMULATION (DIAGRAM) */}
      {/* ======================================================== */}
      {(activeFilter === 'all' || activeFilter === 'outliers') && (
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FEF3C7] dark:bg-[#2D2415] text-[#D97706] flex items-center justify-center font-bold">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-[#1F1A16] dark:text-[#F0F4F8]">
                  2. Outlier Analysis – The Golden Discovery
                </h2>
                <p className="text-xs text-[#786F66] dark:text-[#94A3B8]">
                  IQR Outlier Threshold: -$13.04 · Counterfactual Position Sizing Comparison
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-[#10B981] bg-[#E8F8EE] dark:bg-[#132A1C] px-2.5 py-1 rounded-full border border-[#10B981]/30">
              DISCIPLINE = PROFITABLE
            </span>
          </div>

          {/* DIAGRAM 1: Visual Counterfactual Simulation Bar Chart */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#161D2A] border border-[#E7E0D6] dark:border-[#2A3446] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                📊 Financial Impact of Lot-Size Discipline (Simulation Waterfall)
              </span>
              <span className="text-[10px] font-mono text-[#786F66] dark:text-[#94A3B8]">
                Net P&amp;L Across Exclusion Buckets
              </span>
            </div>

            {/* SVG Visual Waterfall Bar Chart */}
            <div className="w-full h-48 sm:h-56 relative flex items-center justify-center">
              <svg viewBox="0 0 500 180" className="w-full h-full overflow-visible">
                {/* Zero baseline */}
                <line x1="20" y1="120" x2="480" y2="120" stroke="#786F66" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
                <text x="485" y="124" fill="#786F66" fontSize="9" fontFamily="monospace">$0</text>

                {/* Bar 1: All 202 Trades (-$126.67) */}
                <rect x="50" y="120" width="60" height="48" rx="4" fill="#EF4444" />
                <text x="80" y="112" textAnchor="middle" fill="#EF4444" fontSize="11" fontWeight="bold" fontFamily="monospace">-$126.67</text>
                <text x="80" y="178" textAnchor="middle" fill="#786F66" fontSize="9" fontWeight="bold">All 202</text>
                <text x="80" y="188" textAnchor="middle" fill="#786F66" fontSize="8" fontFamily="monospace">PF 0.75</text>

                {/* Bar 2: Exclude 0.09 & 0.15 (+$4.88) */}
                <rect x="160" y="104" width="60" height="16" rx="4" fill="#10B981" />
                <text x="190" y="96" textAnchor="middle" fill="#10B981" fontSize="11" fontWeight="bold" fontFamily="monospace">+$4.88</text>
                <text x="190" y="178" textAnchor="middle" fill="#786F66" fontSize="9" fontWeight="bold">No 0.09/0.15</text>
                <text x="190" y="188" textAnchor="middle" fill="#786F66" fontSize="8" fontFamily="monospace">PF 1.01</text>

                {/* Bar 3: Exclude All > 0.01 (+$7.99) */}
                <rect x="270" y="94" width="60" height="26" rx="4" fill="#10B981" />
                <text x="300" y="86" textAnchor="middle" fill="#10B981" fontSize="11" fontWeight="bold" fontFamily="monospace">+$7.99</text>
                <text x="300" y="178" textAnchor="middle" fill="#786F66" fontSize="9" fontWeight="bold">0.01 Only (192)</text>
                <text x="300" y="188" textAnchor="middle" fill="#786F66" fontSize="8" fontFamily="monospace">PF 1.02</text>

                {/* Bar 4: 0.01 + 0.02 Only (+$18.77) */}
                <rect x="380" y="60" width="60" height="60" rx="4" fill="#D97706" />
                <text x="410" y="52" textAnchor="middle" fill="#D97706" fontSize="11" fontWeight="bold" fontFamily="monospace">+$18.77</text>
                <text x="410" y="178" textAnchor="middle" fill="#786F66" fontSize="9" fontWeight="bold">0.01 + 0.02</text>
                <text x="410" y="188" textAnchor="middle" fill="#786F66" fontSize="8" fontFamily="monospace">PF 1.05</text>
              </svg>
            </div>

            <div className="pt-2 border-t border-[#E7E0D6]/60 dark:border-[#283244] text-[11px] text-[#786F66] dark:text-[#94A3B8] flex items-center justify-between">
              <span>*Counterfactual analysis based on exact historical closed orders without lot-size surges.</span>
              <span className="font-bold text-[#D97706]">Peak Counterfactual: +$18.77</span>
            </div>
          </div>

          {/* Cards for The 2 Fatal Outliers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Outlier 1 Card */}
            <div className="bg-[#FAF2E6] dark:bg-[#1A2231] border border-[#EF4444]/30 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#EF4444] text-white">
                  FATAL OUTLIER #1
                </span>
                <span className="text-xs font-mono font-bold text-[#EF4444]">20.8% OF GROSS LOSS</span>
              </div>
              <div className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                10 November 2026 · Order #114891034
              </div>
              <div className="text-2xl font-black font-mono text-[#EF4444]">-$105.75</div>
              <div className="text-xs text-[#786F66] dark:text-[#94A3B8] space-y-0.5 font-mono">
                <div>Direction: SELL · Lot: <span className="font-bold text-[#EF4444]">0.09</span> (9x Standard Size!)</div>
                <div>Holding Time: 14 min 53 sec · Stop-Out Triggered</div>
                <div>Remark: [so 19.67%/23.84/121.21]</div>
              </div>
            </div>

            {/* Outlier 2 Card */}
            <div className="bg-[#FAF2E6] dark:bg-[#1A2231] border border-[#EF4444]/30 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#EF4444] text-white">
                  FATAL OUTLIER #2
                </span>
                <span className="text-xs font-mono font-bold text-[#EF4444]">15x SIZE SURGE</span>
              </div>
              <div className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                25 November 2026 · Order #120991593
              </div>
              <div className="text-2xl font-black font-mono text-[#EF4444]">-$25.80</div>
              <div className="text-xs text-[#786F66] dark:text-[#94A3B8] space-y-0.5 font-mono">
                <div>Direction: SELL · Lot: <span className="font-bold text-[#EF4444]">0.15</span> (15x Standard Size!)</div>
                <div>Holding Time: Just <span className="font-bold text-[#EF4444]">10 Seconds</span> (Panic Close)</div>
                <div>Plus 2 × 0.03 lots on same day (-$13.89 cluster)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. RISK-REWARD & EXPECTANCY ANALYSIS (DIAGRAM) */}
      {/* ======================================================== */}
      {(activeFilter === 'all' || activeFilter === 'rules_ml') && (
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#E8F8EE] dark:bg-[#132A1C] text-[#10B981] flex items-center justify-center font-bold">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-[#1F1A16] dark:text-[#F0F4F8]">
                  3. Risk–Reward &amp; Expectancy Mathematics
                </h2>
                <p className="text-xs text-[#786F66] dark:text-[#94A3B8]">
                  Realized Payoff Ratio vs Break-Even Win Rate Required
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FAF2E6] dark:bg-[#1C2433] text-[#D97706] font-bold border border-[#E7E0D6] dark:border-[#2E384D]">
              PAYOFF DEFICIT
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Visual Gauge: Actual WR vs Required WR */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#161D2A] border border-[#E7E0D6] dark:border-[#2A3446] flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                  Win Rate vs Break-Even Threshold
                </span>
                <span className="text-[10px] font-mono font-bold text-[#EF4444]">
                  Gap: -7.32%
                </span>
              </div>

              {/* SVG Speedometer/Comparison Gauge */}
              <div className="relative w-full h-36 flex items-center justify-center">
                <svg viewBox="0 0 200 110" className="w-full max-w-[260px] h-full overflow-visible">
                  {/* Background Arc */}
                  <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#E7E0D6" strokeWidth="14" strokeLinecap="round" className="dark:stroke-[#283244]" />
                  
                  {/* Break-Even Required Arc (59.3%) */}
                  <path
                    d="M 20 100 A 80 80 0 0 1 180 100"
                    fill="none"
                    stroke="#D97706"
                    strokeWidth="14"
                    strokeLinecap="round"
                    strokeDasharray="149 251"
                    opacity="0.3"
                  />

                  {/* Actual Win Rate Arc (51.98%) */}
                  <path
                    d="M 20 100 A 80 80 0 0 1 180 100"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="14"
                    strokeLinecap="round"
                    strokeDasharray="130.6 251"
                  />

                  {/* Needle for Actual WR */}
                  <circle cx="100" cy="100" r="6" fill="#1F1A16" className="dark:fill-white" />
                  <line x1="100" y1="100" x2="80" y2="40" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />

                  {/* Needle for Required WR */}
                  <line x1="100" y1="100" x2="115" y2="35" stroke="#D97706" strokeWidth="2.5" strokeDasharray="3 3" />
                </svg>

                <div className="absolute bottom-1 text-center">
                  <div className="text-xl font-black font-mono text-[#10B981]">51.98%</div>
                  <div className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">Actual Win Rate</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E7E0D6]/60 dark:border-[#283244] text-[11px] font-mono">
                <div>
                  <span className="text-[#786F66] dark:text-[#94A3B8]">Actual Win Rate: </span>
                  <span className="font-bold text-[#10B981]">51.98%</span>
                </div>
                <div className="text-right">
                  <span className="text-[#786F66] dark:text-[#94A3B8]">Required for BE: </span>
                  <span className="font-bold text-[#D97706]">59.30%</span>
                </div>
              </div>
            </div>

            {/* Payoff Mathematical Proof Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#161D2A] border border-[#E7E0D6] dark:border-[#2A3446] space-y-3 flex flex-col justify-between">
              <span className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                📐 Mathematical Proof of Payoff Deficit
              </span>

              <div className="space-y-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-[#FAF7F2] dark:bg-[#121722] border border-[#E7E0D6]/60 dark:border-[#242D3D]">
                  <div className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">Realized Payoff Ratio:</div>
                  <div className="font-bold text-sm text-[#1F1A16] dark:text-[#F0F4F8]">
                    $3.64 (Avg Win) ÷ $5.30 (Avg Loss) = <span className="text-[#EF4444]">0.69 : 1</span>
                  </div>
                  <div className="text-[10px] text-[#786F66] dark:text-[#94A3B8] mt-0.5">
                    Har $1 loss ke muqable aap sirf $0.69 win capture kar rahe hain.
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[#FAF7F2] dark:bg-[#121722] border border-[#E7E0D6]/60 dark:border-[#242D3D]">
                  <div className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">Break-Even Win Rate Formula:</div>
                  <div className="font-bold text-sm text-[#D97706]">
                    5.30 ÷ (3.64 + 5.30) × 100 = <span className="underline">59.3%</span>
                  </div>
                  <div className="text-[10px] text-[#786F66] dark:text-[#94A3B8] mt-0.5">
                    Jab tak R:R improve nahi hota, profitable hone ke liye 59.3% win rate chahiye.
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-[#1F1A16] dark:text-[#F0F4F8] font-bold bg-[#FAF2E6] dark:bg-[#1C2433] p-2 rounded-lg border border-[#E7E0D6] dark:border-[#2E384D]">
                💡 Key Verdict: Win rate theek hai (52%), lekin average winner chhota aur average loser bada hone ki wajah se account bleed ho raha hai.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. OVERTRADING VS RULE-BASED TRADING (DIAGRAM) */}
      {/* ======================================================== */}
      {(activeFilter === 'all' || activeFilter === 'overtrading') && (
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FEE2E2] dark:bg-[#381B1D] text-[#EF4444] flex items-center justify-center font-bold">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-[#1F1A16] dark:text-[#F0F4F8]">
                  4. Overtrading vs Rule-Based Days (3-Trades Limit)
                </h2>
                <p className="text-xs text-[#786F66] dark:text-[#94A3B8]">
                  88.1% of all trades occurred on 4+ trades days, causing 100% of the account losses
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold bg-[#EF4444] text-white px-2.5 py-1 rounded-full">
              SHOCKING DIVIDE
            </span>
          </div>

          {/* DIAGRAM 3: Side-by-Side Comparison Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Disciplined Days Box */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#161D2A] border-2 border-[#10B981] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-[#10B981] text-white">
                  RULE-BASED (≤ 3 TRADES/DAY)
                </span>
                <span className="text-xs font-mono font-bold text-[#10B981]">16 TRADING DAYS</span>
              </div>

              <div className="text-3xl font-black font-mono text-[#10B981]">+$102.47</div>
              <div className="text-xs text-[#786F66] dark:text-[#94A3B8]">Net Combined Profit</div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#E7E0D6]/60 dark:border-[#242D3D] text-xs font-mono">
                <div>
                  <div className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">Win Rate</div>
                  <div className="font-bold text-[#10B981] text-sm">83.3%</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">Profit Factor</div>
                  <div className="font-bold text-[#10B981] text-sm">9.55</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">Expectancy</div>
                  <div className="font-bold text-[#10B981] text-sm">+$4.27</div>
                </div>
              </div>
            </div>

            {/* Overtrading Days Box */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#161D2A] border-2 border-[#EF4444] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-[#EF4444] text-white">
                  OVERTRADING (4+ TRADES/DAY)
                </span>
                <span className="text-xs font-mono font-bold text-[#EF4444]">16 TRADING DAYS</span>
              </div>

              <div className="text-3xl font-black font-mono text-[#EF4444]">-$229.14</div>
              <div className="text-xs text-[#786F66] dark:text-[#94A3B8]">Net Combined Loss (178 Orders)</div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#E7E0D6]/60 dark:border-[#242D3D] text-xs font-mono">
                <div>
                  <div className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">Win Rate</div>
                  <div className="font-bold text-[#EF4444] text-sm">47.8%</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">Profit Factor</div>
                  <div className="font-bold text-[#EF4444] text-sm">0.54</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">Expectancy</div>
                  <div className="font-bold text-[#EF4444] text-sm">-$1.29</div>
                </div>
              </div>
            </div>
          </div>

          {/* Worst Damaging Days Horizontal Bar Chart */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#161D2A] border border-[#E7E0D6] dark:border-[#2A3446] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                📉 Top Most Damaging Days (Ranked by Loss)
              </span>
              <span className="text-[10px] font-mono text-[#786F66] dark:text-[#94A3B8]">
                Order Count &amp; Loss Magnitude
              </span>
            </div>

            <div className="space-y-3">
              {[
                { date: '10 Nov', trades: 5, pnl: -88.74, label: '0.09 lot stop-out day' },
                { date: '24 Nov', trades: 44, pnl: -53.76, label: '44 trades rampage (14:45–15:20 & 19:00–20:10)' },
                { date: '23 Nov', trades: 15, pnl: -50.91, label: '12 losses in 15 trades (Revenge trading)' },
                { date: '26 Oct', trades: 19, pnl: -29.81, label: '19 trades rapid cluster' },
                { date: '12 Nov', trades: 8, pnl: -18.21, label: '8 trades over-trading' },
                { date: '25 Nov', trades: 17, pnl: -18.02, label: '0.15 lot panic + 0.03 lot cluster' },
              ].map((item, idx) => {
                const maxLoss = 88.74;
                const widthPct = (Math.abs(item.pnl) / maxLoss) * 100;

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                        {item.date} ({item.trades} trades) - <span className="text-[#786F66] dark:text-[#94A3B8] font-normal">{item.label}</span>
                      </span>
                      <span className="font-black text-[#EF4444]">${item.pnl.toFixed(2)}</span>
                    </div>

                    <div className="w-full bg-[#FAF2E6] dark:bg-[#1C2433] h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#EF4444] h-full rounded-full transition-all duration-500"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 rounded-xl bg-[#FAF7F2] dark:bg-[#121722] border border-[#E7E0D6]/60 dark:border-[#242D3D] text-xs text-[#786F66] dark:text-[#94A3B8]">
              <span className="font-bold text-[#D97706]">24 November Case Study: </span>
              Ek hi din mein 44 closed orders liye gaye. 19 winners ke bawajood 24 losses ne -$53.76 ka direct hit diya. Ye sabse clear proof hai ki jab trades ki tadad badhti hai, discipline aur execution quality collapse ho jati hai.
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. BUY VS SELL ASYMMETRY (DIAGRAM) */}
      {/* ======================================================== */}
      {(activeFilter === 'all' || activeFilter === 'direction_time') && (
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FEF3C7] dark:bg-[#2D2415] text-[#D97706] flex items-center justify-center font-bold">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-[#1F1A16] dark:text-[#F0F4F8]">
                  5. Buy vs Sell Performance Asymmetry
                </h2>
                <p className="text-xs text-[#786F66] dark:text-[#94A3B8]">
                  Sell trades contributed -$121.24 (95.7% of total loss), while Buy trades were near-breakeven
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FAF2E6] dark:bg-[#1C2433] text-[#D97706] font-bold border border-[#E7E0D6] dark:border-[#2E384D]">
              DIRECTIONAL BIAS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* BUY Trades Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#161D2A] border border-[#E7E0D6] dark:border-[#2A3446] space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-[#10B981] text-white">
                  🟢 BUY (56 TRADES)
                </span>
                <span className="text-xs font-mono font-bold text-[#10B981]">55.4% WIN RATE</span>
              </div>

              <div className="text-2xl font-black font-mono text-[#786F66] dark:text-[#94A3B8]">
                -$5.43 <span className="text-xs font-normal font-sans">(Almost Breakeven)</span>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-[#E7E0D6]/60 dark:border-[#242D3D] text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-[#786F66] dark:text-[#94A3B8]">Gross Profit:</span>
                  <span className="text-[#10B981] font-bold">+$96.52</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#786F66] dark:text-[#94A3B8]">Gross Loss:</span>
                  <span className="text-[#EF4444] font-bold">-$101.95</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#786F66] dark:text-[#94A3B8]">Profit Factor:</span>
                  <span className="font-bold text-[#1F1A16] dark:text-[#F0F4F8]">0.95</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#786F66] dark:text-[#94A3B8]">Avg Win / Loss:</span>
                  <span className="font-bold">$3.11 / $4.08</span>
                </div>
              </div>
            </div>

            {/* SELL Trades Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#161D2A] border border-[#EF4444]/40 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-[#EF4444] text-white">
                  🔴 SELL (146 TRADES)
                </span>
                <span className="text-xs font-mono font-bold text-[#EF4444]">50.7% WIN RATE</span>
              </div>

              <div className="text-2xl font-black font-mono text-[#EF4444]">
                -$121.24 <span className="text-xs font-normal font-sans">(Major Loss Engine)</span>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-[#E7E0D6]/60 dark:border-[#242D3D] text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-[#786F66] dark:text-[#94A3B8]">Gross Profit:</span>
                  <span className="text-[#10B981] font-bold">+$285.65</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#786F66] dark:text-[#94A3B8]">Gross Loss:</span>
                  <span className="text-[#EF4444] font-bold">-$406.89</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#786F66] dark:text-[#94A3B8]">Profit Factor:</span>
                  <span className="font-bold text-[#EF4444]">0.70</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#786F66] dark:text-[#94A3B8]">Avg Win / Loss:</span>
                  <span className="font-bold text-[#EF4444]">$3.86 / $5.73</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Self-Audit Questions for Sell Strategy */}
          <div className="p-4 rounded-xl bg-[#FAF2E6] dark:bg-[#1A2231] border border-[#E7E0D6] dark:border-[#2E384D] space-y-2">
            <span className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8] block">
              ❓ 4 Self-Audit Questions for your Sell Strategy:
            </span>
            <ul className="text-xs text-[#786F66] dark:text-[#94A3B8] space-y-1 list-disc pl-4 leading-relaxed">
              <li>Kya aap Gold ke strong bullish trend ke against aggressive top-picking sell karte hain?</li>
              <li>Kya major daily/4H support levels ke theek upar Sell entries trigger ho rahi hain?</li>
              <li>Liquidity sweep ke baad rejection confirmation ka intezar karte hain ya pehle hi short kar dete hain?</li>
              <li>Losing sell trade ke turant baad FOMO revenge re-entry karte hain?</li>
            </ul>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. TIME-OF-DAY IST SESSION ANALYSIS (DIAGRAM) */}
      {/* ======================================================== */}
      {(activeFilter === 'all' || activeFilter === 'direction_time') && (
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FEF3C7] dark:bg-[#2D2415] text-[#D97706] flex items-center justify-center font-bold">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-[#1F1A16] dark:text-[#F0F4F8]">
                  6. Time-of-Day (IST Session) Performance
                </h2>
                <p className="text-xs text-[#786F66] dark:text-[#94A3B8]">
                  UTC+2 converted to Indian Standard Time (IST +3h30m). Morning is green, Evening is red.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold bg-[#EF4444] text-white px-2.5 py-1 rounded-full">
              DANGER: 17:00–23:59 IST
            </span>
          </div>

          {/* 4 Sessions Visual Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Session 1 */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#161D2A] border-2 border-[#10B981] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#10B981]">00:00 – 11:59 IST</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#E8F8EE] dark:bg-[#132A1C] text-[#10B981]">
                  BEST SESSION
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-[#10B981]">+$48.21</div>
              <div className="text-xs font-mono text-[#786F66] dark:text-[#94A3B8]">
                25 Trades · PF: <span className="font-bold text-[#10B981]">2.24</span>
              </div>
            </div>

            {/* Session 2 */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#161D2A] border border-[#10B981]/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#10B981]">12:00 – 16:59 IST</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#E8F8EE] dark:bg-[#132A1C] text-[#10B981]">
                  PROFITABLE
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-[#10B981]">+$14.46</div>
              <div className="text-xs font-mono text-[#786F66] dark:text-[#94A3B8]">
                67 Trades · PF: <span className="font-bold text-[#10B981]">1.12</span>
              </div>
            </div>

            {/* Session 3 */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#161D2A] border-2 border-[#EF4444] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#EF4444]">17:00 – 21:59 IST</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#FEE2E2] dark:bg-[#381B1D] text-[#EF4444]">
                  CRITICAL LOSS
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-[#EF4444]">-$127.24</div>
              <div className="text-xs font-mono text-[#786F66] dark:text-[#94A3B8]">
                89 Trades · PF: <span className="font-bold text-[#EF4444]">0.53</span>
              </div>
            </div>

            {/* Session 4 */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#161D2A] border border-[#EF4444]/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#EF4444]">22:00 – 23:59 IST</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#FEE2E2] dark:bg-[#381B1D] text-[#EF4444]">
                  WORST PF
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-[#EF4444]">-$62.10</div>
              <div className="text-xs font-mono text-[#786F66] dark:text-[#94A3B8]">
                21 Trades · PF: <span className="font-bold text-[#EF4444]">0.19</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF2E6] dark:bg-[#1A2231] border border-[#D97706]/40 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
            <div className="text-xs text-[#1F1A16] dark:text-[#E2E8F0] leading-relaxed">
              <span className="font-bold text-[#D97706]">Key Finding: </span>
              Aapki trading 00:00 se 16:59 IST tak <span className="text-[#10B981] font-bold">+$62.67 profit</span> mein rehti hai! Lekin sham 17:00 se lekar raat 23:59 IST ke darmiyan <span className="text-[#EF4444] font-bold">-$189.34 ka huge loss (PF 0.39)</span> lagta hai. US Market Open ke waqt high volatility aur overtrading sabse zyada damage karti hai.
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. HOLDING DURATION & SCALPING PROFILE (DIAGRAM) */}
      {/* ======================================================== */}
      {(activeFilter === 'all' || activeFilter === 'direction_time') && (
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center font-bold">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-[#1F1A16] dark:text-[#F0F4F8]">
                  7. Holding Duration &amp; Scalping Behaviour
                </h2>
                <p className="text-xs text-[#786F66] dark:text-[#94A3B8]">
                  Median Holding Time: 4.84 Minutes · 68.8% of trades closed under 10 minutes
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FAF2E6] dark:bg-[#1C2433] text-[#D97706] font-bold border border-[#E7E0D6] dark:border-[#2E384D]">
              SCALPING PROFILE
            </span>
          </div>

          {/* Histogram Bar Visualization */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3.5 rounded-xl bg-white dark:bg-[#161D2A] border border-[#E7E0D6] dark:border-[#2A3446]">
              <div className="text-2xl font-black font-mono text-[#D97706]">28</div>
              <div className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8] mt-1">&lt; 1 Minute</div>
              <div className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">13.9% of all trades</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-[#161D2A] border border-[#E7E0D6] dark:border-[#2A3446]">
              <div className="text-2xl font-black font-mono text-[#D97706]">78</div>
              <div className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8] mt-1">1 – 5 Minutes</div>
              <div className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">38.6% of all trades</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-[#161D2A] border border-[#E7E0D6] dark:border-[#2A3446]">
              <div className="text-2xl font-black font-mono text-[#D97706]">33</div>
              <div className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8] mt-1">5 – 10 Minutes</div>
              <div className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">16.3% of all trades</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-[#161D2A] border border-[#E7E0D6] dark:border-[#2A3446]">
              <div className="text-2xl font-black font-mono text-[#D97706]">63</div>
              <div className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8] mt-1">&gt; 10 Minutes</div>
              <div className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">31.2% of all trades</div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8, 9 & 10: REMARKS AUDIT, DRAWDOWN & ML ANOMALY ENGINE */}
      {/* ======================================================== */}
      {(activeFilter === 'all' || activeFilter === 'rules_ml') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Remarks & Drawdown Card */}
          <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
            <h2 className="text-base font-black tracking-tight text-[#1F1A16] dark:text-[#F0F4F8] flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-[#D97706]" />
              <span>8. Remarks &amp; Exit Type Audit</span>
            </h2>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between p-2 rounded-lg bg-white dark:bg-[#161D2A] border border-[#E7E0D6]/60 dark:border-[#242D3D]">
                <span>Explicit SL Tagged [sl ...]</span>
                <span className="font-bold text-[#EF4444]">33 orders (-$142.65)</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-white dark:bg-[#161D2A] border border-[#E7E0D6]/60 dark:border-[#242D3D]">
                <span>Explicit TP Tagged [tp ...]</span>
                <span className="font-bold text-[#10B981]">6 orders (+$31.05)</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-white dark:bg-[#161D2A] border border-[#E7E0D6]/60 dark:border-[#242D3D]">
                <span>Stop-Out Tagged [so ...]</span>
                <span className="font-bold text-[#EF4444]">1 order (-$105.75)</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-white dark:bg-[#161D2A] border border-[#E7E0D6]/60 dark:border-[#242D3D]">
                <span>Manual / BatchClose / Other</span>
                <span className="font-bold text-[#786F66]">162 orders (Mixed)</span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#E7E0D6]/60 dark:border-[#242D3D] space-y-1 text-xs">
              <div className="font-bold text-[#1F1A16] dark:text-[#F0F4F8]">9. Drawdown Analysis:</div>
              <p className="text-[#786F66] dark:text-[#94A3B8] text-[11px]">
                Peak Cumulative P&amp;L: <span className="font-mono text-[#10B981]">+$34.14</span> ➔ Subsequent Trough: <span className="font-mono text-[#EF4444]">-$127.84</span> ➔ Maximum Peak-to-Trough Decline: <span className="font-mono font-bold text-[#EF4444]">-$161.98</span>.
              </p>
            </div>
          </div>

          {/* Machine Learning Anomaly Detection Blueprint */}
          <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
            <h2 className="text-base font-black tracking-tight text-[#1F1A16] dark:text-[#F0F4F8] flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#D97706]" />
              <span>10. Machine Learning Anomaly Blueprint</span>
            </h2>

            <div className="p-3.5 rounded-xl bg-white dark:bg-[#161D2A] border border-[#E7E0D6] dark:border-[#2A3446] space-y-2 text-xs">
              <span className="font-bold text-[#D97706] block">Isolation Forest Architecture:</span>
              <p className="text-[#786F66] dark:text-[#94A3B8] text-[11px]">
                202 trades par complex predictive models overfitting karenge. Lekin **Isolation Forest Anomaly Detection** execution errors ko real-time pakadne ke liye ideal hai.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-2 text-[10px] font-mono">
                <div className="p-2 rounded bg-[#FAF7F2] dark:bg-[#121722]">
                  <span className="font-bold text-[#1F1A16] dark:text-[#F0F4F8] block">Inputs Monitored:</span>
                  <ul className="list-disc pl-3 mt-1 text-[#786F66] dark:text-[#94A3B8] space-y-0.5">
                    <li>Lot Size surge (&gt;0.01)</li>
                    <li>Entry time delta (&lt;60s)</li>
                    <li>Daily trade frequency</li>
                    <li>Session P&amp;L delta</li>
                  </ul>
                </div>
                <div className="p-2 rounded bg-[#FAF7F2] dark:bg-[#121722]">
                  <span className="font-bold text-[#1F1A16] dark:text-[#F0F4F8] block">Anomaly Flag Output:</span>
                  <ul className="list-disc pl-3 mt-1 text-[#786F66] dark:text-[#94A3B8] space-y-0.5">
                    <li>Unusual Position Size</li>
                    <li>Rapid Revenge Cluster</li>
                    <li>Hard-Limit Violation</li>
                    <li>Excessive Holding Decay</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 11 & 12: PROPOSED TRADING RULES & ACTION PLAN */}
      {/* ======================================================== */}
      {(activeFilter === 'all' || activeFilter === 'rules_ml') && (
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#E8F8EE] dark:bg-[#132A1C] text-[#10B981] flex items-center justify-center font-bold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-[#1F1A16] dark:text-[#F0F4F8]">
                  11. TradeFlow Proposed Risk &amp; Execution Rules
                </h2>
                <p className="text-xs text-[#786F66] dark:text-[#94A3B8]">
                  7 concrete rules derived directly from your historical audit data
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#10B981] text-white font-bold">
              30-DAY CHALLENGE
            </span>
          </div>

          {/* 7 Rules Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {[
              { title: 'Maximum 3 Trades Per Day', desc: '4th trade par terminal lockout / warning. 3 trades ke baad screen sirf view mode mein.', tag: 'RULE 1' },
              { title: 'Strict 0.01 Fixed Lot Size', desc: 'Never increase lot size during recovery. Single 0.09 lot caused -$105.75 damage.', tag: 'RULE 2' },
              { title: 'Pause After 2 Consecutive Losses', desc: 'Losing streak par 2 hours mandatory break taaki revenge trading cycle break ho sake.', tag: 'RULE 3' },
              { title: 'Predefined Daily Max Loss Limit', desc: 'Din ka maximum acceptable risk fixed karo (e.g. $10). Reach hote hi day close.', tag: 'RULE 4' },
              { title: 'No Entry Without Hard Stop-Loss', desc: 'Market mein order place karte hi hard SL lagna chahiye, mental SL strictly prohibited.', tag: 'RULE 5' },
              { title: 'Minimum 1:1.5 Risk-to-Reward', desc: 'Current realized payoff 0.69 ko improve karne ke liye targets minimum 1.5R hone chahiye.', tag: 'RULE 6' },
              { title: 'US Session Evening Defense', desc: '17:00–23:59 IST ke darmiyan ya toh trades avoid karo ya half-risk par test karo.', tag: 'RULE 7' },
            ].map((rule, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-white dark:bg-[#161D2A] border border-[#E7E0D6] dark:border-[#2A3446] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded bg-[#FAF2E6] dark:bg-[#1C2433] text-[#D97706] border border-[#E7E0D6] dark:border-[#2E384D]">
                    {rule.tag}
                  </span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                </div>
                <div className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">{rule.title}</div>
                <p className="text-xs text-[#786F66] dark:text-[#94A3B8] leading-relaxed">{rule.desc}</p>
              </div>
            ))}
          </div>

          {/* Navigation Action Buttons */}
          <div className="pt-4 border-t border-[#E7E0D6]/60 dark:border-[#242D3D] flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-[#786F66] dark:text-[#94A3B8]">
              Ready to execute this protocol in your daily journal?
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onTabChange?.('cycle')}
                className="px-4 py-2 rounded-xl bg-[#FAF2E6] dark:bg-[#1C2433] text-[#1F1A16] dark:text-[#F0F4F8] border border-[#E7E0D6] dark:border-[#2E384D] text-xs font-bold hover:bg-[#F0E5D3] transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>Go to 31-Day Cycle</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onTabChange?.('dashboard')}
                className="px-4 py-2 rounded-xl bg-[#D97706] text-white text-xs font-bold shadow-xs hover:bg-[#B45309] transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>Back to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 13. FINAL VERDICT SCORECARD */}
      {/* ======================================================== */}
      <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
        <h2 className="text-lg font-black tracking-tight text-[#1F1A16] dark:text-[#F0F4F8] flex items-center gap-2">
          <Award className="w-5 h-5 text-[#D97706]" />
          <span>13. Final Audit Verdict &amp; Performance Scorecard</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3.5 rounded-xl bg-white dark:bg-[#161D2A] border border-[#E7E0D6] dark:border-[#2A3446]">
            <div className="text-xs text-[#786F66] dark:text-[#94A3B8]">0.01 Lot Discipline</div>
            <div className="text-base font-black text-[#10B981] mt-1">PROMISING</div>
            <div className="text-[10px] text-[#786F66] mt-0.5">+$7.99 across 192 trades</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-[#161D2A] border border-[#E7E0D6] dark:border-[#2A3446]">
            <div className="text-xs text-[#786F66] dark:text-[#94A3B8]">Position Sizing</div>
            <div className="text-base font-black text-[#EF4444] mt-1">CRITICAL ISSUE</div>
            <div className="text-[10px] text-[#786F66] mt-0.5">-$131.55 on 2 trades</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-[#161D2A] border border-[#E7E0D6] dark:border-[#2A3446]">
            <div className="text-xs text-[#786F66] dark:text-[#94A3B8]">Trade Frequency</div>
            <div className="text-base font-black text-[#EF4444] mt-1">WEAK</div>
            <div className="text-[10px] text-[#786F66] mt-0.5">88% trades on 4+ days</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-[#161D2A] border border-[#E7E0D6] dark:border-[#2A3446]">
            <div className="text-xs text-[#786F66] dark:text-[#94A3B8]">Payoff Asymmetry</div>
            <div className="text-base font-black text-[#D97706] mt-1">NEEDS REVIEW</div>
            <div className="text-[10px] text-[#786F66] mt-0.5">0.69 : 1 ratio</div>
          </div>
        </div>

        <p className="text-xs text-[#786F66] dark:text-[#94A3B8] leading-relaxed pt-2 border-t border-[#E7E0D6]/60 dark:border-[#242D3D]">
          <span className="font-bold text-[#1F1A16] dark:text-[#F0F4F8]">Summary Action: </span>
          Aapki strategy mein edge maujood hai, bas execution mistakes (lot sizing aur overtrading) usey drown kar rahi hain. Agle 30 trading days ke liye 0.01 lot aur max 3 trades/day ko strict follow karke dekhein.
        </p>
      </div>

    </div>
  );
};

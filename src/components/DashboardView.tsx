import React, { useState } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Percent, 
  ShieldCheck, 
  BarChart2, 
  Calendar as CalendarIcon, 
  Clock, 
  Trophy, 
  AlertOctagon, 
  Lightbulb, 
  Target, 
  Brain, 
  Check, 
  X, 
  ChevronDown, 
  ArrowRight,
  Briefcase,
  Sparkles
} from 'lucide-react';
import type { Trade, DayRecord, AppSettings } from '../db/db';
import type { TabType } from './Navbar';

interface DashboardViewProps {
  trades?: Trade[];
  days?: DayRecord[];
  settings?: AppSettings;
  onSelectDate?: (dateStr: string) => void;
  onTabChange?: (tab: TabType) => void;
  onOpenQuickTrade?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onTabChange,
}) => {
  const [curveMode, setCurveMode] = useState<'$ P&L' | 'R-Multiple' | '% Return'>('$ P&L');
  const [performerTab, setPerformerTab] = useState<'By R-Multiple' | 'By P&L'>('By R-Multiple');
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; date: string; r: string; pnl: string } | null>({
    x: 236,
    y: 154,
    date: '5 Oct 2026',
    r: '6.4R',
    pnl: '+$358 (+0.4%)',
  });

  const navigate = (tab: TabType) => {
    if (onTabChange) onTabChange(tab);
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12 text-[#1F1A16] font-sans selection:bg-[#DB9F35]/30">
      {/* 1. Greeting Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 pb-2">
        <div className="flex items-center gap-3">
          <span className="text-2xl select-none" role="img" aria-label="Waving hand">
            👋
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1F1A16]">
              Good Evening, Trader
            </h1>
            <p className="text-xs text-[#786F66] font-medium tracking-tight">
              Track. Analyze. Improve. Repeat.
            </p>
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <p className="text-xs text-[#786F66] italic font-serif leading-snug">
            "Better decisions today, stronger results tomorrow."
          </p>
          <span className="text-[11px] font-semibold text-[#9E958C] tracking-wide block uppercase mt-0.5">
            — NH TRADERS
          </span>
        </div>
      </div>

      {/* 2. Row 1: 6 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: CURRENT EQUITY */}
        <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-4 shadow-2xs hover:border-[#DB9F35]/60 transition-colors flex flex-col justify-between">
          <div>
            <div className="w-7 h-7 rounded-lg bg-[#FAF2E6] text-[#DB9F35] flex items-center justify-center mb-2">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-[#786F66] uppercase tracking-wider block">
              CURRENT EQUITY
            </span>
            <div className="text-xl sm:text-2xl font-black text-[#1F1A16] tracking-tight mt-0.5">
              $1,003.52
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-1">
            <span className="text-[10px] font-bold text-[#16A34A] flex items-center gap-0.5">
              <span>↑</span> +$3.52 (+0.4%)
            </span>
            {/* Smooth mini green sparkline */}
            <svg className="w-12 h-5 text-[#16A34A]" viewBox="0 0 48 20" fill="none">
              <path
                d="M 2 16 Q 14 14, 22 10 T 36 6 T 46 2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </div>
        </div>

        {/* Card 2: NET P&L */}
        <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-4 shadow-2xs hover:border-[#DB9F35]/60 transition-colors flex flex-col justify-between">
          <div>
            <div className="w-7 h-7 rounded-lg bg-[#FAF2E6] text-[#DB9F35] flex items-center justify-center mb-2">
              <BarChart2 className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-[#786F66] uppercase tracking-wider block">
              NET P&amp;L
            </span>
            <div className="text-xl sm:text-2xl font-black text-[#15803D] tracking-tight mt-0.5">
              +8.2R
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-1">
            <span className="text-[10px] font-bold text-[#15803D]">
              +$412.30
            </span>
            {/* Green wavy sparkline */}
            <svg className="w-12 h-5 text-[#16A34A]" viewBox="0 0 48 20" fill="none">
              <path
                d="M 2 17 Q 10 18, 16 12 T 30 11 T 46 3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </div>
        </div>

        {/* Card 3: WIN RATE */}
        <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-4 shadow-2xs hover:border-[#DB9F35]/60 transition-colors flex flex-col justify-between">
          <div>
            <div className="w-7 h-7 rounded-lg bg-[#FAF2E6] text-[#DB9F35] flex items-center justify-center mb-2">
              <Percent className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-[#786F66] uppercase tracking-wider block">
              WIN RATE
            </span>
            <div className="flex items-center justify-between mt-0.5">
              <div>
                <div className="text-xl sm:text-2xl font-black text-[#1F1A16] tracking-tight">
                  62%
                </div>
                <div className="text-[9px] font-medium text-[#786F66] mt-0.5">
                  26W • 14L • 2BE
                </div>
              </div>
              {/* Circular donut indicator */}
              <div className="relative w-9 h-9 shrink-0">
                <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-[#E7E0D6]"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#0D9488]"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeDasharray="62, 100"
                    strokeLinecap="round"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
              </div>
            </div>
          </div>
          <div className="h-1 mt-3" />
        </div>

        {/* Card 4: EXPECTANCY */}
        <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-4 shadow-2xs hover:border-[#DB9F35]/60 transition-colors flex flex-col justify-between">
          <div>
            <div className="w-7 h-7 rounded-lg bg-[#FAF2E6] text-[#DB9F35] flex items-center justify-center mb-2">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-[#786F66] uppercase tracking-wider block">
              EXPECTANCY
            </span>
            <div className="text-xl sm:text-2xl font-black text-[#1F1A16] tracking-tight mt-0.5">
              +0.12R
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-1">
            <span className="text-[9px] font-mono text-[#786F66]">
              PF 1.16 | Avg: +0.12R
            </span>
            <svg className="w-8 h-4 text-[#16A34A]" viewBox="0 0 32 16" fill="none">
              <path
                d="M 2 14 L 12 10 L 20 12 L 30 3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 5: MAX DRAWDOWN */}
        <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-4 shadow-2xs hover:border-[#DB9F35]/60 transition-colors flex flex-col justify-between">
          <div>
            <div className="w-7 h-7 rounded-lg bg-[#FEECEB] text-[#DC2626] flex items-center justify-center mb-2">
              <TrendingDown className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-[#786F66] uppercase tracking-wider block">
              MAX DRAWDOWN
            </span>
            <div className="text-xl sm:text-2xl font-black text-[#DC2626] tracking-tight mt-0.5">
              -4.2R
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-1">
            <span className="text-[10px] font-bold text-[#DC2626]">
              (-8.4%)
            </span>
            {/* Red downward sparkline */}
            <svg className="w-12 h-5 text-[#DC2626]" viewBox="0 0 48 20" fill="none">
              <path
                d="M 2 3 Q 12 4, 20 10 T 36 13 T 46 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </div>
        </div>

        {/* Card 6: DISCIPLINE SCORE */}
        <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-4 shadow-2xs hover:border-[#DB9F35]/60 transition-colors flex flex-col justify-between">
          <div>
            <div className="w-7 h-7 rounded-lg bg-[#FAF2E6] text-[#DB9F35] flex items-center justify-center mb-2">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-[#786F66] uppercase tracking-wider block">
              DISCIPLINE SCORE
            </span>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-xl sm:text-2xl font-black text-[#1F1A16] tracking-tight">
                87%
              </span>
              <span className="text-[10px] font-medium text-[#786F66]">
                36/42 Clean
              </span>
            </div>
          </div>
          <div className="w-full bg-[#E7E0D6] h-1.5 rounded-full overflow-hidden mt-3">
            <div className="bg-[#16A34A] h-full rounded-full w-[87%]" />
          </div>
        </div>
      </div>

      {/* 3. Row 2: Charts Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Equity Curve (8 Columns) */}
        <div className="lg:col-span-8 bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E7E0D6]/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#FAF2E6] text-[#DB9F35] flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1F1A16]">Equity Curve</h3>
                <p className="text-[11px] text-[#786F66]">Cumulative performance over time</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Pill toggles */}
              <div className="flex items-center bg-[#FAF7F2] border border-[#E7E0D6] p-0.5 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setCurveMode('$ P&L')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    curveMode === '$ P&L'
                      ? 'bg-[#DB9F35] text-white font-bold shadow-2xs'
                      : 'text-[#786F66] hover:text-[#1F1A16]'
                  }`}
                >
                  $ P&amp;L
                </button>
                <button
                  onClick={() => setCurveMode('R-Multiple')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    curveMode === 'R-Multiple'
                      ? 'bg-[#DB9F35] text-white font-bold shadow-2xs'
                      : 'text-[#786F66] hover:text-[#1F1A16]'
                  }`}
                >
                  R-Multiple
                </button>
                <button
                  onClick={() => setCurveMode('% Return')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    curveMode === '% Return'
                      ? 'bg-[#DB9F35] text-white font-bold shadow-2xs'
                      : 'text-[#786F66] hover:text-[#1F1A16]'
                  }`}
                >
                  % Return
                </button>
              </div>

              {/* Range dropdown button */}
              <button className="px-3 py-1 bg-white border border-[#E7E0D6] rounded-xl text-xs font-medium text-[#1F1A16] flex items-center gap-1.5 hover:bg-[#FAF7F2] transition-colors shadow-2xs">
                <span>This Month</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#786F66]" />
              </button>
            </div>
          </div>

          {/* SVG Canvas Area */}
          <div className="relative my-2 w-full select-none">
            <svg
              className="w-full h-56 sm:h-64"
              viewBox="0 0 700 240"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="equityWarmGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#DB9F35" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#DB9F35" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Y-Axis Labels & Dotted Gridlines */}
              {/* 1,050 */}
              <text x="38" y="32" textAnchor="end" className="fill-[#9E958C] text-[10px] font-mono">1,050</text>
              <line x1="45" y1="28" x2="685" y2="28" stroke="#E7E0D6" strokeDasharray="3 3" strokeWidth="1" />

              {/* 1,025 */}
              <text x="38" y="75" textAnchor="end" className="fill-[#9E958C] text-[10px] font-mono">1,025</text>
              <line x1="45" y1="71" x2="685" y2="71" stroke="#E7E0D6" strokeDasharray="3 3" strokeWidth="1" />

              {/* 1,000 */}
              <text x="38" y="118" textAnchor="end" className="fill-[#9E958C] text-[10px] font-mono">1,000</text>
              <line x1="45" y1="114" x2="685" y2="114" stroke="#E7E0D6" strokeDasharray="3 3" strokeWidth="1" />

              {/* 975 */}
              <text x="38" y="161" textAnchor="end" className="fill-[#9E958C] text-[10px] font-mono">975</text>
              <line x1="45" y1="157" x2="685" y2="157" stroke="#E7E0D6" strokeDasharray="3 3" strokeWidth="1" />

              {/* 950 */}
              <text x="38" y="204" textAnchor="end" className="fill-[#9E958C] text-[10px] font-mono">950</text>
              <line x1="45" y1="200" x2="685" y2="200" stroke="#E7E0D6" strokeDasharray="3 3" strokeWidth="1" />

              {/* X-Axis Labels */}
              <text x="55" y="224" textAnchor="middle" className="fill-[#9E958C] text-[10px] font-medium">1 Oct</text>
              <text x="145" y="224" textAnchor="middle" className="fill-[#9E958C] text-[10px] font-medium">5 Oct</text>
              <text x="235" y="224" textAnchor="middle" className="fill-[#9E958C] text-[10px] font-medium">9 Oct</text>
              <text x="325" y="224" textAnchor="middle" className="fill-[#9E958C] text-[10px] font-medium">13 Oct</text>
              <text x="415" y="224" textAnchor="middle" className="fill-[#9E958C] text-[10px] font-medium">17 Oct</text>
              <text x="505" y="224" textAnchor="middle" className="fill-[#9E958C] text-[10px] font-medium">21 Oct</text>
              <text x="595" y="224" textAnchor="middle" className="fill-[#9E958C] text-[10px] font-medium">25 Oct</text>
              <text x="665" y="224" textAnchor="middle" className="fill-[#9E958C] text-[10px] font-medium">29 Oct</text>

              {/* Area Gradient Under Curve */}
              <path
                d="M 55 194 
                   L 75 196 L 95 194 L 115 192 L 135 196 L 155 186 L 175 178 L 195 168 L 215 172 L 236 154 
                   L 260 162 L 285 150 L 310 142 L 335 158 L 360 148 L 385 152 L 410 144 L 435 136 
                   L 460 142 L 485 130 L 510 120 L 535 126 L 560 114 L 585 116 L 610 102 L 635 106 L 655 88 L 675 74
                   L 675 200 L 55 200 Z"
                fill="url(#equityWarmGradient)"
              />

              {/* Main Golden Curve Line */}
              <path
                d="M 55 194 
                   L 75 196 L 95 194 L 115 192 L 135 196 L 155 186 L 175 178 L 195 168 L 215 172 L 236 154 
                   L 260 162 L 285 150 L 310 142 L 335 158 L 360 148 L 385 152 L 410 144 L 435 136 
                   L 460 142 L 485 130 L 510 120 L 535 126 L 560 114 L 585 116 L 610 102 L 635 106 L 655 88 L 675 74"
                fill="none"
                stroke="#DB9F35"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {/* Trade Points (Green = Win, Red = Loss, Amber = BE) */}
              <circle cx="55" cy="194" r="3.5" fill="#DB9F35" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="75" cy="196" r="3.5" fill="#DC2626" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="95" cy="194" r="3.5" fill="#16A34A" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="115" cy="192" r="3.5" fill="#16A34A" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="135" cy="196" r="3.5" fill="#DC2626" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="155" cy="186" r="3.5" fill="#16A34A" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="175" cy="178" r="3.5" fill="#16A34A" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="195" cy="168" r="3.5" fill="#16A34A" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="215" cy="172" r="3.5" fill="#DC2626" stroke="#FFFFFF" strokeWidth="2" />
              
              {/* Highlight point on 5 Oct */}
              <circle 
                cx="236" 
                cy="154" 
                r="4.5" 
                fill="#16A34A" 
                stroke="#FFFFFF" 
                strokeWidth="2.5" 
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint({ x: 236, y: 154, date: '5 Oct 2026', r: '6.4R', pnl: '+$358 (+0.4%)' })}
              />

              <circle cx="260" cy="162" r="3.5" fill="#DC2626" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="285" cy="150" r="3.5" fill="#16A34A" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="310" cy="142" r="3.5" fill="#16A34A" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="335" cy="158" r="3.5" fill="#DC2626" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="360" cy="148" r="3.5" fill="#16A34A" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="385" cy="152" r="3.5" fill="#DB9F35" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="410" cy="144" r="3.5" fill="#16A34A" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="435" cy="136" r="3.5" fill="#16A34A" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="460" cy="142" r="3.5" fill="#DC2626" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="485" cy="130" r="3.5" fill="#16A34A" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="510" cy="120" r="3.5" fill="#16A34A" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="535" cy="126" r="3.5" fill="#DC2626" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="560" cy="114" r="3.5" fill="#16A34A" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="585" cy="116" r="3.5" fill="#DB9F35" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="610" cy="102" r="3.5" fill="#16A34A" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="635" cy="106" r="3.5" fill="#DC2626" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="655" cy="88" r="3.5" fill="#16A34A" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="675" cy="74" r="3.5" fill="#16A34A" stroke="#FFFFFF" strokeWidth="2" />

              {/* Floating Tooltip Card over 5 Oct (matching mockup) */}
              {hoveredPoint && (
                <g transform={`translate(${hoveredPoint.x - 41}, ${hoveredPoint.y - 72})`}>
                  <rect
                    x="0"
                    y="0"
                    width="82"
                    height="46"
                    rx="6"
                    ry="6"
                    fill="#1F1A16"
                    className="shadow-md"
                  />
                  {/* Pointer tip */}
                  <polygon points="41,46 36,52 46,52" fill="#1F1A16" />
                  <text x="10" y="14" fill="#A8A29E" fontSize="9" fontWeight="500">{hoveredPoint.date}</text>
                  <text x="10" y="28" fill="#FFFFFF" fontSize="12" fontWeight="700">{hoveredPoint.r}</text>
                  <text x="10" y="39" fill="#22C55E" fontSize="9" fontWeight="600">{hoveredPoint.pnl}</text>
                </g>
              )}
            </svg>
          </div>

          {/* Bottom Legend */}
          <div className="flex items-center justify-center gap-6 pt-2 border-t border-[#E7E0D6]/60 text-xs text-[#786F66]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
              <span>Winning Trade</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
              <span>Losing Trade</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#DB9F35]" />
              <span>Break Even</span>
            </div>
          </div>
        </div>

        {/* Right: Monthly Performance + Quick Stats (4 Columns) */}
        <div className="lg:col-span-4 bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          {/* Header */}
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FAF2E6] text-[#DB9F35] flex items-center justify-center">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1F1A16]">Monthly Performance</h3>
                  <p className="text-[11px] text-[#786F66]">Net R by day (October 2026)</p>
                </div>
              </div>

              <div className="px-2.5 py-1 rounded-lg bg-[#E8F8EE] text-[#15803D] font-bold text-xs flex items-center gap-1">
                <span>+8.2R</span>
                <span className="text-[10px] font-semibold text-[#16A34A]/80">Net result</span>
              </div>
            </div>

            {/* Daily R Bar Chart */}
            <div className="my-2 select-none">
              <svg className="w-full h-32" viewBox="0 0 320 120">
                {/* Y-Axis Grid */}
                <text x="22" y="16" textAnchor="end" className="fill-[#9E958C] text-[9px] font-mono">4R</text>
                <text x="22" y="42" textAnchor="end" className="fill-[#9E958C] text-[9px] font-mono">2R</text>
                <text x="22" y="68" textAnchor="end" className="fill-[#9E958C] text-[9px] font-mono">0R</text>
                <text x="22" y="94" textAnchor="end" className="fill-[#9E958C] text-[9px] font-mono">-2R</text>
                <text x="22" y="118" textAnchor="end" className="fill-[#9E958C] text-[9px] font-mono">-4R</text>

                {/* 0R Baseline */}
                <line x1="28" y1="65" x2="315" y2="65" stroke="#E7E0D6" strokeWidth="1" />

                {/* Daily Bars (Days 1 to 31) */}
                {/* Day 1: -1.0R */}
                <rect x="34" y="65" width="5" height="15" fill="#DC2626" rx="1" />
                {/* Day 2: -0.5R */}
                <rect x="43" y="65" width="5" height="8" fill="#DC2626" rx="1" />
                {/* Day 3 */}
                <rect x="52" y="65" width="5" height="10" fill="#DC2626" rx="1" />
                {/* Day 4: +1.2R */}
                <rect x="61" y="46" width="5" height="19" fill="#16A34A" rx="1" />
                {/* Day 5: -0.8R */}
                <rect x="70" y="65" width="5" height="12" fill="#DC2626" rx="1" />
                {/* Day 6 */}
                <rect x="79" y="65" width="5" height="10" fill="#DC2626" rx="1" />
                {/* Day 7: +2.5R */}
                <rect x="88" y="28" width="5" height="37" fill="#16A34A" rx="1" />
                {/* Day 8: +1.0R */}
                <rect x="97" y="50" width="5" height="15" fill="#16A34A" rx="1" />
                {/* Day 9: -1.2R */}
                <rect x="106" y="65" width="5" height="18" fill="#DC2626" rx="1" />
                {/* Day 10 */}
                <rect x="115" y="65" width="5" height="6" fill="#DC2626" rx="1" />
                {/* Day 11: +1.5R */}
                <rect x="124" y="42" width="5" height="23" fill="#16A34A" rx="1" />
                {/* Day 12 */}
                <rect x="133" y="65" width="5" height="10" fill="#DC2626" rx="1" />
                {/* Day 13: -1.8R */}
                <rect x="142" y="65" width="5" height="26" fill="#DC2626" rx="1" />
                {/* Day 14: +1.4R */}
                <rect x="151" y="44" width="5" height="21" fill="#16A34A" rx="1" />
                {/* Day 15 */}
                <rect x="160" y="65" width="5" height="14" fill="#DC2626" rx="1" />
                {/* Day 16: +2.8R */}
                <rect x="169" y="24" width="5" height="41" fill="#16A34A" rx="1" />
                {/* Day 17: +3.6R */}
                <rect x="178" y="14" width="5" height="51" fill="#16A34A" rx="1" />
                {/* Day 18: -1.0R */}
                <rect x="187" y="65" width="5" height="15" fill="#DC2626" rx="1" />
                {/* Day 19 */}
                <rect x="196" y="65" width="5" height="8" fill="#DC2626" rx="1" />
                {/* Day 20: -2.5R */}
                <rect x="205" y="65" width="5" height="36" fill="#DC2626" rx="1" />
                {/* Day 21: +1.2R */}
                <rect x="214" y="48" width="5" height="17" fill="#16A34A" rx="1" />
                {/* Day 22 */}
                <rect x="223" y="64" width="5" height="2" fill="#DB9F35" rx="1" />
                {/* Day 23: +3.0R */}
                <rect x="232" y="22" width="5" height="43" fill="#16A34A" rx="1" />
                {/* Day 24: +1.5R */}
                <rect x="241" y="44" width="5" height="21" fill="#16A34A" rx="1" />
                {/* Day 25: +1.8R */}
                <rect x="250" y="38" width="5" height="27" fill="#16A34A" rx="1" />
                {/* Day 26: -1.0R */}
                <rect x="259" y="65" width="5" height="15" fill="#DC2626" rx="1" />
                {/* Day 27 */}
                <rect x="268" y="64" width="5" height="2" fill="#DB9F35" rx="1" />
                {/* Day 28 */}
                <rect x="277" y="64" width="5" height="2" fill="#DB9F35" rx="1" />
                {/* Day 29 */}
                <rect x="286" y="64" width="5" height="2" fill="#DB9F35" rx="1" />
                {/* Day 30 */}
                <rect x="295" y="64" width="5" height="2" fill="#DB9F35" rx="1" />

                {/* X-Axis Numbers */}
                <text x="36" y="80" textAnchor="middle" className="fill-[#9E958C] text-[9px]">1</text>
                <text x="72" y="80" textAnchor="middle" className="fill-[#9E958C] text-[9px]">5</text>
                <text x="117" y="80" textAnchor="middle" className="fill-[#9E958C] text-[9px]">10</text>
                <text x="162" y="80" textAnchor="middle" className="fill-[#9E958C] text-[9px]">15</text>
                <text x="207" y="80" textAnchor="middle" className="fill-[#9E958C] text-[9px]">20</text>
                <text x="252" y="80" textAnchor="middle" className="fill-[#9E958C] text-[9px]">25</text>
                <text x="297" y="80" textAnchor="middle" className="fill-[#9E958C] text-[9px]">31</text>
              </svg>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="pt-2 border-t border-[#E7E0D6]/60">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-[#DB9F35]" />
              <span className="text-[11px] font-bold text-[#1F1A16]">Quick Stats</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Total Trades */}
              <div className="p-2 rounded-xl bg-[#FAF7F2] border border-[#E7E0D6]/70 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-white text-[#DB9F35] flex items-center justify-center shadow-2xs shrink-0">
                  <BarChart2 className="w-3 h-3" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] text-[#786F66] font-medium block truncate">Total Trades</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-black text-[#1F1A16]">42</span>
                    <span className="text-[9px] font-bold text-[#16A34A]">↑ 8%</span>
                  </div>
                </div>
              </div>

              {/* Win Rate */}
              <div className="p-2 rounded-xl bg-[#FAF7F2] border border-[#E7E0D6]/70 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-white text-[#DB9F35] flex items-center justify-center shadow-2xs shrink-0">
                  <Percent className="w-3 h-3" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] text-[#786F66] font-medium block truncate">Win Rate</span>
                  <span className="text-xs font-black text-[#1F1A16]">62%</span>
                </div>
              </div>

              {/* Avg R / Trade */}
              <div className="p-2 rounded-xl bg-[#FAF7F2] border border-[#E7E0D6]/70 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-white text-[#DB9F35] flex items-center justify-center shadow-2xs shrink-0">
                  <Target className="w-3 h-3" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] text-[#786F66] font-medium block truncate">Avg R / Trade</span>
                  <span className="text-xs font-black text-[#1F1A16]">+0.12R</span>
                </div>
              </div>

              {/* Avg Trade Time */}
              <div className="p-2 rounded-xl bg-[#FAF7F2] border border-[#E7E0D6]/70 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-white text-[#DB9F35] flex items-center justify-center shadow-2xs shrink-0">
                  <Clock className="w-3 h-3" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] text-[#786F66] font-medium block truncate">Avg Trade Time</span>
                  <span className="text-xs font-black text-[#1F1A16]">1h 42m</span>
                </div>
              </div>

              {/* Biggest Win */}
              <div className="p-2 rounded-xl bg-[#FAF7F2] border border-[#E7E0D6]/70 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-white text-[#16A34A] flex items-center justify-center shadow-2xs shrink-0">
                  <Trophy className="w-3 h-3" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] text-[#786F66] font-medium block truncate">Biggest Win</span>
                  <span className="text-xs font-black text-[#16A34A]">+4.8R</span>
                </div>
              </div>

              {/* Biggest Loss */}
              <div className="p-2 rounded-xl bg-[#FAF7F2] border border-[#E7E0D6]/70 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-white text-[#DC2626] flex items-center justify-center shadow-2xs shrink-0">
                  <AlertOctagon className="w-3 h-3" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] text-[#786F66] font-medium block truncate">Biggest Loss</span>
                  <span className="text-xs font-black text-[#DC2626]">-2.8R</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Row 3: 4 Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Monthly Cycle Progress */}
        <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/60">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-[#DB9F35]" />
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-[#1F1A16]">Monthly Cycle Progress</h3>
                <span className="text-[10px] text-[#786F66] block">October 2026</span>
              </div>
            </div>
            <button
              onClick={() => navigate('cycle')}
              className="text-[11px] font-bold text-[#DB9F35] hover:text-[#B67E20] flex items-center gap-1 transition-colors group"
            >
              <span>View Calendar</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <div className="flex items-center justify-center gap-5 my-4">
            {/* Donut Ring */}
            <div className="relative w-24 h-24 shrink-0">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#E7E0D6"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#0D9488"
                  strokeWidth="8"
                  strokeDasharray="174 238"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-black text-[#1F1A16]">73%</span>
                <span className="text-[9px] font-medium text-[#786F66]">22 / 30 Days</span>
              </div>
            </div>

            {/* List breakdown */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-[#786F66] text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
                  <span>Profitable Days</span>
                </div>
                <span className="font-bold text-[#15803D] font-mono text-xs">16</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-[#786F66] text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
                  <span>Losing Days</span>
                </div>
                <span className="font-bold text-[#DC2626] font-mono text-xs">5</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-[#786F66] text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-[#DB9F35]" />
                  <span>Break Even</span>
                </div>
                <span className="font-bold text-[#DB9F35] font-mono text-xs">1</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-[#786F66] text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-[#9E958C]" />
                  <span>No Trade Days</span>
                </div>
                <span className="font-bold text-[#786F66] font-mono text-xs">8</span>
              </div>
            </div>
          </div>
          <div className="h-1" />
        </div>

        {/* Card 2: Trading Rules */}
        <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/60">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#DB9F35]" />
              <h3 className="text-xs sm:text-sm font-bold text-[#1F1A16]">Trading Rules</h3>
            </div>
            <button
              onClick={() => navigate('rules')}
              className="text-[11px] font-bold text-[#DB9F35] hover:text-[#B67E20] flex items-center gap-1 transition-colors group"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <div className="space-y-2 my-2 text-xs">
            {/* Rule 1 */}
            <div className="flex items-center justify-between py-0.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-4 h-4 rounded-full bg-[#E8F8EE] text-[#16A34A] flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span className="text-[#1F1A16] truncate text-[11px]">Risk 0.5 – 1% per trade</span>
              </div>
              <span className="text-[#16A34A] text-xs font-bold">✓</span>
            </div>

            {/* Rule 2 */}
            <div className="flex items-center justify-between py-0.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-4 h-4 rounded-full bg-[#E8F8EE] text-[#16A34A] flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span className="text-[#1F1A16] truncate text-[11px]">Daily max loss limit respected</span>
              </div>
              <span className="text-[#16A34A] text-xs font-bold">✓</span>
            </div>

            {/* Rule 3 */}
            <div className="flex items-center justify-between py-0.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-4 h-4 rounded-full bg-[#E8F8EE] text-[#16A34A] flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span className="text-[#1F1A16] truncate text-[11px]">SL pre-defined &amp; never widened</span>
              </div>
              <span className="text-[#16A34A] text-xs font-bold">✓</span>
            </div>

            {/* Rule 4 */}
            <div className="flex items-center justify-between py-0.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-4 h-4 rounded-full bg-[#E8F8EE] text-[#16A34A] flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span className="text-[#1F1A16] truncate text-[11px]">No setup = No trade</span>
              </div>
              <span className="text-[#16A34A] text-xs font-bold">✓</span>
            </div>

            {/* Rule 5 */}
            <div className="flex items-center justify-between py-0.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-4 h-4 rounded-full bg-[#E8F8EE] text-[#16A34A] flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span className="text-[#1F1A16] truncate text-[11px]">SMC sequence (HTF → LTF → MSS → POI)</span>
              </div>
              <span className="text-[#16A34A] text-xs font-bold">✓</span>
            </div>

            {/* Rule 6 (VIOLATION in red) */}
            <div className="flex items-center justify-between py-0.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-4 h-4 rounded-full bg-[#FEECEB] text-[#DC2626] flex items-center justify-center shrink-0">
                  <X className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span className="text-[#DC2626] font-medium truncate text-[11px]">No FOMO / Revenge trading</span>
              </div>
              <span className="text-[#DC2626] text-xs font-bold">✕</span>
            </div>

            {/* Rule 7 */}
            <div className="flex items-center justify-between py-0.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-4 h-4 rounded-full bg-[#E8F8EE] text-[#16A34A] flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span className="text-[#1F1A16] truncate text-[11px]">Economic calendar checked</span>
              </div>
              <span className="text-[#16A34A] text-xs font-bold">✓</span>
            </div>
          </div>
          <div className="h-1" />
        </div>

        {/* Card 3: Recent Trades */}
        <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/60">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[#DB9F35]" />
              <h3 className="text-xs sm:text-sm font-bold text-[#1F1A16]">Recent Trades</h3>
            </div>
            <button
              onClick={() => navigate('journal')}
              className="text-[11px] font-bold text-[#DB9F35] hover:text-[#B67E20] flex items-center gap-1 transition-colors group"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <div className="overflow-x-auto my-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[9px] font-bold text-[#786F66] uppercase border-b border-[#E7E0D6]/60">
                  <th className="pb-1.5 font-bold">Pair</th>
                  <th className="pb-1.5 font-bold">Type</th>
                  <th className="pb-1.5 font-bold text-right">R</th>
                  <th className="pb-1.5 font-bold text-right">P&amp;L</th>
                  <th className="pb-1.5 font-bold text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E0D6]/40 text-[11px]">
                {/* Row 1 */}
                <tr className="hover:bg-[#FAF7F2]/50 transition-colors">
                  <td className="py-2 font-bold text-[#1F1A16] flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-[#FAF2E6] text-[#DB9F35] flex items-center justify-center text-[9px] font-black">
                      🪙
                    </span>
                    <span>XAUUSD</span>
                  </td>
                  <td className="py-2">
                    <span className="px-1.5 py-0.5 rounded bg-[#E8F8EE] text-[#15803D] font-extrabold text-[9px]">
                      BUY
                    </span>
                  </td>
                  <td className="py-2 text-right font-bold text-[#15803D] font-mono">+2.0R</td>
                  <td className="py-2 text-right font-bold text-[#15803D] font-mono">+$80.52</td>
                  <td className="py-2 text-right text-[#786F66] font-mono text-[10px]">14:32</td>
                </tr>

                {/* Row 2 */}
                <tr className="hover:bg-[#FAF7F2]/50 transition-colors">
                  <td className="py-2 font-bold text-[#1F1A16] flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-[#E0E7FF] text-[#4F46E5] flex items-center justify-center text-[9px] font-black">
                      ♦
                    </span>
                    <span>ETHUSD</span>
                  </td>
                  <td className="py-2">
                    <span className="px-1.5 py-0.5 rounded bg-[#FEECEB] text-[#DC2626] font-extrabold text-[9px]">
                      SELL
                    </span>
                  </td>
                  <td className="py-2 text-right font-bold text-[#DC2626] font-mono">-1.0R</td>
                  <td className="py-2 text-right font-bold text-[#DC2626] font-mono">-$42.30</td>
                  <td className="py-2 text-right text-[#786F66] font-mono text-[10px]">11:21</td>
                </tr>

                {/* Row 3 */}
                <tr className="hover:bg-[#FAF7F2]/50 transition-colors">
                  <td className="py-2 font-bold text-[#1F1A16] flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-[#FEF3C7] text-[#D97706] flex items-center justify-center text-[9px] font-black">
                      ₿
                    </span>
                    <span>BTCUSD</span>
                  </td>
                  <td className="py-2">
                    <span className="px-1.5 py-0.5 rounded bg-[#E8F8EE] text-[#15803D] font-extrabold text-[9px]">
                      BUY
                    </span>
                  </td>
                  <td className="py-2 text-right font-bold text-[#15803D] font-mono">+1.5R</td>
                  <td className="py-2 text-right font-bold text-[#15803D] font-mono">+$61.20</td>
                  <td className="py-2 text-right text-[#786F66] font-mono text-[10px]">09:48</td>
                </tr>

                {/* Row 4 */}
                <tr className="hover:bg-[#FAF7F2]/50 transition-colors">
                  <td className="py-2 font-bold text-[#1F1A16] flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center text-[9px] font-black">
                      £
                    </span>
                    <span>GBPUSD</span>
                  </td>
                  <td className="py-2">
                    <span className="px-1.5 py-0.5 rounded bg-[#FEECEB] text-[#DC2626] font-extrabold text-[9px]">
                      SELL
                    </span>
                  </td>
                  <td className="py-2 text-right font-bold text-[#DC2626] font-mono">-0.5R</td>
                  <td className="py-2 text-right font-bold text-[#DC2626] font-mono">-$20.15</td>
                  <td className="py-2 text-right text-[#786F66] font-mono text-[10px]">06:32</td>
                </tr>

                {/* Row 5 */}
                <tr className="hover:bg-[#FAF7F2]/50 transition-colors">
                  <td className="py-2 font-bold text-[#1F1A16] flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-[#FAF2E6] text-[#DB9F35] flex items-center justify-center text-[9px] font-black">
                      🪙
                    </span>
                    <span>XAUUSD</span>
                  </td>
                  <td className="py-2">
                    <span className="px-1.5 py-0.5 rounded bg-[#E8F8EE] text-[#15803D] font-extrabold text-[9px]">
                      BUY
                    </span>
                  </td>
                  <td className="py-2 text-right font-bold text-[#15803D] font-mono">+3.0R</td>
                  <td className="py-2 text-right font-bold text-[#15803D] font-mono">+$122.40</td>
                  <td className="py-2 text-right text-[#786F66] font-mono text-[10px]">03:17</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="h-1" />
        </div>

        {/* Card 4: Trading Calendar */}
        <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/60">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-[#DB9F35]" />
              <h3 className="text-xs sm:text-sm font-bold text-[#1F1A16]">Trading Calendar</h3>
            </div>
            <button
              onClick={() => navigate('calendar')}
              className="text-[11px] font-bold text-[#DB9F35] hover:text-[#B67E20] flex items-center gap-1 transition-colors group"
            >
              <span>View Full</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="my-2">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-[#786F66] mb-1.5">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>

            {/* Calendar Cells matching October 2026 */}
            <div className="grid grid-cols-7 gap-1 text-[10px]">
              {/* Day 1 */}
              <div className="bg-[#E8F8EE] border border-[#16A34A]/20 rounded-md p-1 text-center flex flex-col items-center">
                <span className="text-[#1F1A16] font-bold">1</span>
                <span className="text-[8px] font-bold text-[#15803D] leading-none">+2.1R</span>
              </div>

              {/* Day 2 */}
              <div className="bg-[#FEECEB] border border-[#DC2626]/20 rounded-md p-1 text-center flex flex-col items-center">
                <span className="text-[#1F1A16] font-bold">2</span>
                <span className="text-[8px] font-bold text-[#DC2626] leading-none">-1R</span>
              </div>

              {/* Day 3 */}
              <div className="bg-[#E8F8EE] border border-[#16A34A]/20 rounded-md p-1 text-center flex flex-col items-center">
                <span className="text-[#1F1A16] font-bold">3</span>
                <span className="text-[8px] font-bold text-[#15803D] leading-none">+1.5R</span>
              </div>

              {/* Day 4 */}
              <div className="bg-[#E8F8EE] border border-[#16A34A]/20 rounded-md p-1 text-center flex flex-col items-center">
                <span className="text-[#1F1A16] font-bold">4</span>
                <span className="text-[8px] font-bold text-[#15803D] leading-none">+0.8R</span>
              </div>

              {/* Day 5 */}
              <div className="bg-[#FEECEB] border border-[#DC2626]/20 rounded-md p-1 text-center flex flex-col items-center">
                <span className="text-[#1F1A16] font-bold">5</span>
                <span className="text-[8px] font-bold text-[#DC2626] leading-none">-0.5R</span>
              </div>

              {/* Day 6 (Sat) */}
              <div className="bg-[#FAF7F2] rounded-md p-1 text-center flex flex-col items-center opacity-60">
                <span className="text-[#9E958C]">6</span>
                <span className="text-[8px] text-[#9E958C]">-</span>
              </div>

              {/* Day 7 (Sun) */}
              <div className="bg-[#FAF7F2] rounded-md p-1 text-center flex flex-col items-center opacity-60">
                <span className="text-[#9E958C]">7</span>
                <span className="text-[8px] text-[#9E958C]">-</span>
              </div>

              {/* Day 8 */}
              <div className="bg-[#E8F8EE] border border-[#16A34A]/20 rounded-md p-1 text-center flex flex-col items-center">
                <span className="text-[#1F1A16] font-bold">8</span>
                <span className="text-[8px] font-bold text-[#15803D] leading-none">+0.8R</span>
              </div>

              {/* Day 9 */}
              <div className="bg-[#FEECEB] border border-[#DC2626]/20 rounded-md p-1 text-center flex flex-col items-center">
                <span className="text-[#1F1A16] font-bold">9</span>
                <span className="text-[8px] font-bold text-[#DC2626] leading-none">-1R</span>
              </div>

              {/* Day 10 */}
              <div className="bg-[#FEECEB] border border-[#DC2626]/20 rounded-md p-1 text-center flex flex-col items-center">
                <span className="text-[#1F1A16] font-bold">10</span>
                <span className="text-[8px] font-bold text-[#DC2626] leading-none">-1.2R</span>
              </div>

              {/* Day 11 */}
              <div className="bg-[#FEF3C7]/60 border border-[#D97706]/20 rounded-md p-1 text-center flex flex-col items-center">
                <span className="text-[#1F1A16] font-bold">11</span>
                <span className="text-[8px] font-bold text-[#D97706] leading-none">BE</span>
              </div>

              {/* Day 12 */}
              <div className="bg-[#E8F8EE] border border-[#16A34A]/20 rounded-md p-1 text-center flex flex-col items-center">
                <span className="text-[#1F1A16] font-bold">12</span>
                <span className="text-[8px] font-bold text-[#15803D] leading-none">+1R</span>
              </div>

              {/* Day 13 */}
              <div className="bg-[#FAF7F2] rounded-md p-1 text-center flex flex-col items-center opacity-60">
                <span className="text-[#9E958C]">13</span>
                <span className="text-[8px] text-[#9E958C]">-</span>
              </div>

              {/* Day 14 */}
              <div className="bg-[#FAF7F2] rounded-md p-1 text-center flex flex-col items-center opacity-60">
                <span className="text-[#9E958C]">14</span>
                <span className="text-[8px] text-[#9E958C]">-</span>
              </div>

              {/* Day 15 */}
              <div className="bg-[#E8F8EE] border border-[#16A34A]/20 rounded-md p-1 text-center flex flex-col items-center">
                <span className="text-[#1F1A16] font-bold">15</span>
                <span className="text-[8px] font-bold text-[#15803D] leading-none">+0.5R</span>
              </div>

              {/* Day 16 */}
              <div className="bg-[#FEF3C7]/60 border border-[#D97706]/20 rounded-md p-1 text-center flex flex-col items-center">
                <span className="text-[#1F1A16] font-bold">16</span>
                <span className="text-[8px] font-bold text-[#D97706] leading-none">BE</span>
              </div>

              {/* Day 17 */}
              <div className="bg-[#FEECEB] border border-[#DC2626]/20 rounded-md p-1 text-center flex flex-col items-center">
                <span className="text-[#1F1A16] font-bold">17</span>
                <span className="text-[8px] font-bold text-[#DC2626] leading-none">-1.5R</span>
              </div>

              {/* Day 18 */}
              <div className="bg-[#E8F8EE] border border-[#16A34A]/20 rounded-md p-1 text-center flex flex-col items-center">
                <span className="text-[#1F1A16] font-bold">18</span>
                <span className="text-[8px] font-bold text-[#15803D] leading-none">+3R</span>
              </div>

              {/* Day 19 */}
              <div className="bg-[#FAF7F2] rounded-md p-1 text-center flex flex-col items-center opacity-60">
                <span className="text-[#9E958C]">19</span>
                <span className="text-[8px] text-[#9E958C]">-</span>
              </div>

              {/* Day 20 */}
              <div className="bg-[#FAF7F2] rounded-md p-1 text-center flex flex-col items-center opacity-60">
                <span className="text-[#9E958C]">20</span>
                <span className="text-[8px] text-[#9E958C]">-</span>
              </div>

              {/* Day 21 */}
              <div className="bg-[#FAF7F2] rounded-md p-1 text-center flex flex-col items-center opacity-60">
                <span className="text-[#9E958C]">21</span>
                <span className="text-[8px] text-[#9E958C]">-</span>
              </div>
            </div>
          </div>
          <div className="h-1" />
        </div>
      </div>

      {/* 5. Row 4: Bottom 3 Insight Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Card 1: Top Performers (4 Columns) */}
        <div className="lg:col-span-4 bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FAF2E6] text-[#DB9F35] flex items-center justify-center">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1F1A16]">Top Performers</h3>
                  <p className="text-[10px] text-[#786F66]">Best performing pairs &amp; setups</p>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center bg-[#FAF7F2] border border-[#E7E0D6] p-0.5 rounded-lg text-[10px] font-semibold">
                <button
                  onClick={() => setPerformerTab('By R-Multiple')}
                  className={`px-2 py-0.5 rounded ${
                    performerTab === 'By R-Multiple'
                      ? 'bg-[#DB9F35] text-white font-bold'
                      : 'text-[#786F66] hover:text-[#1F1A16]'
                  }`}
                >
                  By R-Multiple
                </button>
                <button
                  onClick={() => setPerformerTab('By P&L')}
                  className={`px-2 py-0.5 rounded ${
                    performerTab === 'By P&L'
                      ? 'bg-[#DB9F35] text-white font-bold'
                      : 'text-[#786F66] hover:text-[#1F1A16]'
                  }`}
                >
                  By P&amp;L
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto my-3">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="text-[9px] font-bold text-[#786F66] uppercase border-b border-[#E7E0D6]/60">
                    <th className="pb-2 font-bold w-6">#</th>
                    <th className="pb-2 font-bold">Pair</th>
                    <th className="pb-2 font-bold text-right">Avg R</th>
                    <th className="pb-2 font-bold text-right">Win Rate</th>
                    <th className="pb-2 font-bold text-right">Trades</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E0D6]/40">
                  {/* Row 1 */}
                  <tr className="hover:bg-[#FAF7F2]/60 transition-colors">
                    <td className="py-2.5 font-bold text-[#9E958C]">1</td>
                    <td className="py-2.5 font-bold text-[#1F1A16] flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-[#FAF2E6] text-[#DB9F35] flex items-center justify-center text-[9px] font-black">
                        🪙
                      </span>
                      <span>XAUUSD</span>
                    </td>
                    <td className="py-2.5 text-right font-bold text-[#15803D] font-mono">+2.1R</td>
                    <td className="py-2.5 text-right font-mono font-medium text-[#1F1A16]">68%</td>
                    <td className="py-2.5 text-right font-mono font-medium text-[#786F66]">12</td>
                  </tr>

                  {/* Row 2 */}
                  <tr className="hover:bg-[#FAF7F2]/60 transition-colors">
                    <td className="py-2.5 font-bold text-[#9E958C]">2</td>
                    <td className="py-2.5 font-bold text-[#1F1A16] flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-[#FEF3C7] text-[#D97706] flex items-center justify-center text-[9px] font-black">
                        ₿
                      </span>
                      <span>BTCUSD</span>
                    </td>
                    <td className="py-2.5 text-right font-bold text-[#15803D] font-mono">+1.8R</td>
                    <td className="py-2.5 text-right font-mono font-medium text-[#1F1A16]">62%</td>
                    <td className="py-2.5 text-right font-mono font-medium text-[#786F66]">8</td>
                  </tr>

                  {/* Row 3 */}
                  <tr className="hover:bg-[#FAF7F2]/60 transition-colors">
                    <td className="py-2.5 font-bold text-[#9E958C]">3</td>
                    <td className="py-2.5 font-bold text-[#1F1A16] flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-[#E0E7FF] text-[#4F46E5] flex items-center justify-center text-[9px] font-black">
                        ♦
                      </span>
                      <span>ETHUSD</span>
                    </td>
                    <td className="py-2.5 text-right font-bold text-[#15803D] font-mono">+1.4R</td>
                    <td className="py-2.5 text-right font-mono font-medium text-[#1F1A16]">57%</td>
                    <td className="py-2.5 text-right font-mono font-medium text-[#786F66]">7</td>
                  </tr>

                  {/* Row 4 */}
                  <tr className="hover:bg-[#FAF7F2]/60 transition-colors">
                    <td className="py-2.5 font-bold text-[#9E958C]">4</td>
                    <td className="py-2.5 font-bold text-[#1F1A16] flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center text-[9px] font-black">
                        £
                      </span>
                      <span>GBPUSD</span>
                    </td>
                    <td className="py-2.5 text-right font-bold text-[#15803D] font-mono">+1.2R</td>
                    <td className="py-2.5 text-right font-mono font-medium text-[#1F1A16]">50%</td>
                    <td className="py-2.5 text-right font-mono font-medium text-[#786F66]">5</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="h-1" />
        </div>

        {/* Card 2: Mistakes & Insights (5 Columns) */}
        <div className="lg:col-span-5 bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FAF2E6] text-[#DB9F35] flex items-center justify-center">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#1F1A16]">Mistakes &amp; Insights</h3>
              </div>
              <button
                onClick={() => navigate('rules')}
                className="text-[11px] font-bold text-[#DB9F35] hover:text-[#B67E20] flex items-center gap-1 transition-colors group"
              >
                <span>View Details</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="mt-2.5">
              <span className="text-[10px] font-bold text-[#786F66] uppercase tracking-wider block mb-2">
                BIGGEST LEAKS
              </span>

              <div className="space-y-2.5">
                {/* Leak 1 */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#FAF2E6] text-[#DB9F35] font-bold text-[10px] flex items-center justify-center">
                      1
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#FEECEB] text-[#DC2626] font-bold text-[11px]">
                      FOMO
                    </span>
                  </div>
                  <span className="text-[#786F66] text-xs">4 occurrences</span>
                  <span className="font-bold font-mono text-sm text-[#DC2626]">-2.8R</span>
                </div>

                {/* Leak 2 */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#FAF2E6] text-[#DB9F35] font-bold text-[10px] flex items-center justify-center">
                      2
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#FEECEB] text-[#DC2626] font-bold text-[11px]">
                      Revenge Trading
                    </span>
                  </div>
                  <span className="text-[#786F66] text-xs">3 occurrences</span>
                  <span className="font-bold font-mono text-sm text-[#DC2626]">-1.9R</span>
                </div>

                {/* Leak 3 */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#FAF2E6] text-[#DB9F35] font-bold text-[10px] flex items-center justify-center">
                      3
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#FEECEB] text-[#DC2626] font-bold text-[11px]">
                      Poor SL Placement
                    </span>
                  </div>
                  <span className="text-[#786F66] text-xs">2 occurrences</span>
                  <span className="font-bold font-mono text-sm text-[#DC2626]">-1.2R</span>
                </div>
              </div>
            </div>
          </div>

          {/* Callout Box: Focus This Week */}
          <div className="mt-4 p-3 rounded-xl bg-[#FAF7F2] border border-[#E7E0D6] flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-[#FAF2E6] text-[#DB9F35] flex items-center justify-center shrink-0 mt-0.5">
              <Target className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-[#1F1A16] block">Focus This Week</span>
              <p className="text-[11px] text-[#786F66] mt-0.5">
                Avoid FOMO after strong moves. Wait for your setup.
              </p>
            </div>
          </div>
        </div>

        {/* Card 3: Discipline & Behavior (3 Columns) */}
        <div className="lg:col-span-3 bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FAF2E6] text-[#DB9F35] flex items-center justify-center">
                  <Brain className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#1F1A16]">Discipline &amp; Behavior</h3>
              </div>
              <button
                onClick={() => navigate('rules')}
                className="text-[11px] font-bold text-[#DB9F35] hover:text-[#B67E20] flex items-center gap-1 transition-colors group"
              >
                <span>View Details</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="flex items-center gap-4 my-4">
              {/* Left Donut */}
              <div className="relative w-20 h-20 shrink-0">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#E7E0D6"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#0D9488"
                    strokeWidth="8"
                    strokeDasharray="207 238"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-base font-black text-[#1F1A16]">87%</span>
                  <span className="text-[8px] font-medium text-[#786F66]">36/42 Clean</span>
                </div>
              </div>

              {/* Right Breakdown */}
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-[#786F66] uppercase block">
                  RULE VIOLATIONS
                </span>
                <div className="flex items-baseline gap-1 mt-0.5 mb-2">
                  <span className="text-2xl font-black text-[#1F1A16]">6</span>
                  <span className="text-[10px] text-[#786F66]">14% of total trades</span>
                </div>

                <div className="space-y-1 text-[11px]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[#786F66]">
                      <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
                      <span>FOMO</span>
                    </div>
                    <span className="font-bold text-[#1F1A16] font-mono">4</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[#786F66]">
                      <span className="w-2 h-2 rounded-full bg-[#0D9488]" />
                      <span>Revenge</span>
                    </div>
                    <span className="font-bold text-[#1F1A16] font-mono">1</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[#786F66]">
                      <span className="w-2 h-2 rounded-full bg-[#9E958C]" />
                      <span>Other</span>
                    </div>
                    <span className="font-bold text-[#1F1A16] font-mono">1</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="h-1" />
        </div>
      </div>

      {/* 6. Footer */}
      <footer className="pt-4 border-t border-[#E7E0D6] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#786F66]">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#1F1A16]">NH TRADERS</span>
          <span>|</span>
          <span>Trade Better. Be Better.</span>
        </div>
        <div className="font-mono text-[11px] text-[#9E958C]">
          Last updated: 05 Oct 2026, 07:18 PM
        </div>
      </footer>
    </div>
  );
};

import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Percent,
  ShieldCheck,
  Award,
  Zap,
  Target,
  ArrowRight,
  Flame,
  AlertTriangle,
} from 'lucide-react';
import type { FullIntelligenceReport } from '../../services/analyticsService';
import type { AppSettings } from '../../db/db';

interface AnalyticsOverviewTabProps {
  report: FullIntelligenceReport;
  settings: AppSettings;
}

export const AnalyticsOverviewTab: React.FC<AnalyticsOverviewTabProps> = ({
  report,
  settings,
}) => {
  const { core, equityCurve, mode, excludedViolationsCount } = report;
  const currSymbol = settings?.currency === 'USD' ? '$' : '₹';

  const [hoveredPoint, setHoveredPoint] = useState<{
    date: string;
    equity: number;
    pnl: number;
    tradeNumber: number;
    x: number;
    y: number;
  } | null>(null);

  // SVG dimensions for Equity Curve
  const svgW = 800;
  const svgH = 260;
  const padL = 60;
  const padR = 20;
  const padT = 20;
  const padB = 40;

  const pts = equityCurve;
  const minEq = pts.length > 0 ? Math.min(...pts.map((p) => p.equity)) : 1000;
  const maxEq = pts.length > 0 ? Math.max(...pts.map((p) => p.equity)) : 1000;
  const eqRange = Math.max(10, maxEq - minEq);

  const getY = (val: number) => {
    return padT + (svgH - padT - padB) * (1 - (val - minEq) / eqRange);
  };

  const getX = (idx: number) => {
    if (pts.length <= 1) return padL;
    return padL + ((svgW - padL - padR) * idx) / (pts.length - 1);
  };

  const pathD = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(p.equity).toFixed(1)}`)
    .join(' ');

  const areaD = pts.length > 0
    ? `${pathD} L ${getX(pts.length - 1).toFixed(1)} ${svgH - padB} L ${getX(0).toFixed(1)} ${svgH - padB} Z`
    : '';

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Strategy Mode Notification Banner */}
      {mode === 'STRATEGY' && (
        <div className="p-3.5 rounded-2xl bg-[#E8F8EE] dark:bg-[#132A1C] border border-[#10B981]/40 flex items-start justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-2.5">
            <Zap className="w-5 h-5 text-[#10B981] shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-[#15803D] dark:text-[#34D399]">
                Strategy Only Diagnostics Active:
              </span>{' '}
              <span className="text-[#1F1A16] dark:text-[#CBD5E1]">
                Excludes {excludedViolationsCount} execution mistake (0.09 lot size blunder on Nov 10) to evaluate pure strategy edge.
              </span>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#10B981] text-[#052E16] shrink-0">
            Strategy Mode: +{currSymbol}{core.netPnl.toFixed(2)}
          </span>
        </div>
      )}

      {/* 1. Core 6 KPI Hero Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* KPI 1: Net P&L */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider">
              {mode === 'STRATEGY' ? 'Strategy P&L' : 'Actual P&L'}
            </span>
            <div
              className={`w-6 h-6 rounded-lg ${
                core.netPnl >= 0
                  ? 'bg-[#E8F8EE] dark:bg-[#132A1C] text-[#15803D] dark:text-[#34D399]'
                  : 'bg-[#FEECEB] dark:bg-[#321B1B] text-[#DC2626] dark:text-[#F87171]'
              } flex items-center justify-center`}
            >
              {core.netPnl >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            </div>
          </div>
          <div className="mt-2.5">
            <div
              className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
                core.netPnl >= 0
                  ? 'text-[#15803D] dark:text-[#34D399]'
                  : 'text-[#DC2626] dark:text-[#F87171]'
              }`}
            >
              {core.netPnl >= 0 ? '+' : '-'}
              {currSymbol}
              {Math.abs(core.netPnl).toFixed(2)}
            </div>
            <div className="text-[11px] font-semibold text-[#786F66] dark:text-[#94A3B8] mt-1 font-mono">
              {core.totalTrades} closed trades
            </div>
          </div>
        </div>

        {/* KPI 2: Win Rate */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider">
              Win Rate
            </span>
            <div className="w-6 h-6 rounded-lg bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center">
              <Percent className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black font-mono text-[#1F1A16] dark:text-[#F0F4F8] tracking-tight">
              {core.winRate.toFixed(1)}%
            </div>
            <div className="text-[11px] font-semibold text-[#786F66] dark:text-[#94A3B8] mt-1 font-mono">
              {core.winningTrades}W · {core.losingTrades}L · {core.breakEvenTrades}BE
            </div>
          </div>
        </div>

        {/* KPI 3: Profit Factor */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider">
              Profit Factor
            </span>
            <div className="w-6 h-6 rounded-lg bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div
              className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
                core.profitFactor >= 1.2
                  ? 'text-[#15803D] dark:text-[#34D399]'
                  : core.profitFactor >= 1.0
                  ? 'text-[#DB9F35]'
                  : 'text-[#DC2626] dark:text-[#F87171]'
              }`}
            >
              {core.profitFactor.toFixed(2)}
            </div>
            <div className="text-[11px] font-semibold text-[#786F66] dark:text-[#94A3B8] mt-1 font-mono">
              +${core.grossProfit.toFixed(0)} / -${core.grossLoss.toFixed(0)}
            </div>
          </div>
        </div>

        {/* KPI 4: Expectancy */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider">
              Expectancy
            </span>
            <div className="w-6 h-6 rounded-lg bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center">
              <Target className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div
              className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
                core.expectancy >= 0
                  ? 'text-[#15803D] dark:text-[#34D399]'
                  : 'text-[#DC2626] dark:text-[#F87171]'
              }`}
            >
              {core.expectancy >= 0 ? '+' : '-'}
              {currSymbol}
              {Math.abs(core.expectancy).toFixed(2)}
            </div>
            <div className="text-[11px] font-semibold text-[#786F66] dark:text-[#94A3B8] mt-1 font-mono">
              Avg per trade ({core.expectancyR >= 0 ? '+' : ''}{core.expectancyR.toFixed(2)}R)
            </div>
          </div>
        </div>

        {/* KPI 5: Avg Win / Avg Loss */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider">
              Payoff Ratio
            </span>
            <div className="w-6 h-6 rounded-lg bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center">
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black font-mono text-[#1F1A16] dark:text-[#F0F4F8] tracking-tight">
              {core.payoffRatio.toFixed(2)}x
            </div>
            <div className="text-[11px] font-semibold text-[#786F66] dark:text-[#94A3B8] mt-1 font-mono">
              +${core.avgWin.toFixed(2)} / -${core.avgLoss.toFixed(2)}
            </div>
          </div>
        </div>

        {/* KPI 6: Max Drawdown */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider">
              Max Drawdown
            </span>
            <div className="w-6 h-6 rounded-lg bg-[#FEECEB] dark:bg-[#321B1B] text-[#DC2626] dark:text-[#F87171] flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black font-mono text-[#DC2626] dark:text-[#F87171] tracking-tight">
              -{currSymbol}{core.maxDrawdownUsd.toFixed(2)}
            </div>
            <div className="text-[11px] font-semibold text-[#786F66] dark:text-[#94A3B8] mt-1 font-mono">
              Peak decline ({core.maxDrawdownPercent.toFixed(1)}%)
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive SVG Equity Curve */}
      <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
          <div>
            <h3 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
              {mode === 'STRATEGY' ? 'Pure Strategy Performance Curve' : 'Actual Account Equity Curve'}
            </h3>
            <p className="text-xs text-[#786F66] dark:text-[#94A3B8]">
              Cumulative equity trajectory across {pts.length} closed trades
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-[#10B981] font-bold">
              Peak: {currSymbol}{Math.max(1000, maxEq).toFixed(2)}
            </span>
            <span className="text-[#786F66] dark:text-[#94A3B8]">·</span>
            <span className="text-[#DC2626] font-bold">
              Max DD: -{currSymbol}{core.maxDrawdownUsd.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="relative pt-4 pb-2 w-full overflow-x-auto">
          <svg
            className="w-full h-64 overflow-visible"
            viewBox={`0 0 ${svgW} ${svgH}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="eqOverviewGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.00" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
              const y = padT + (svgH - padT - padB) * pct;
              const val = maxEq - eqRange * pct;
              return (
                <g key={i}>
                  <line
                    x1={padL}
                    y1={y}
                    x2={svgW - padR}
                    y2={y}
                    stroke="currentColor"
                    className="text-[#E7E0D6]/60 dark:text-[#242D3D]/60"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padL - 8}
                    y={y + 3}
                    textAnchor="end"
                    className="text-[10px] font-mono fill-[#786F66] dark:fill-[#94A3B8]"
                  >
                    {currSymbol}
                    {Math.round(val)}
                  </text>
                </g>
              );
            })}

            {/* Fill Area */}
            {areaD && <path d={areaD} fill="url(#eqOverviewGrad)" />}

            {/* Line Curve */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke={core.netPnl >= 0 ? '#10B981' : '#DC2626'}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Interactive Circles */}
            {pts.map((p, i) => {
              const cx = getX(i);
              const cy = getY(p.equity);
              return (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r="3.5"
                  className={`cursor-pointer transition-all ${
                    p.isViolation ? 'fill-[#DC2626]' : p.pnl >= 0 ? 'fill-[#10B981]' : 'fill-[#E7E0D6] dark:fill-[#4B5563]'
                  }`}
                  onMouseEnter={() =>
                    setHoveredPoint({
                      date: p.date,
                      equity: p.equity,
                      pnl: p.pnl,
                      tradeNumber: p.tradeNumber,
                      x: cx,
                      y: cy,
                    })
                  }
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              );
            })}
          </svg>

          {/* Hover Tooltip */}
          {hoveredPoint && (
            <div
              className="absolute pointer-events-none z-20 px-3 py-2 rounded-xl bg-[#1F1A16] dark:bg-[#0B0F17] text-white text-[11px] font-mono shadow-xl border border-white/10"
              style={{
                left: `${(hoveredPoint.x / svgW) * 100}%`,
                top: `${(hoveredPoint.y / svgH) * 100 - 30}%`,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <div className="font-bold">Trade #{hoveredPoint.tradeNumber} · {hoveredPoint.date}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span>Equity: {currSymbol}{hoveredPoint.equity.toFixed(2)}</span>
                <span className={hoveredPoint.pnl >= 0 ? 'text-[#34D399]' : 'text-[#F87171]'}>
                  ({hoveredPoint.pnl >= 0 ? '+' : ''}{currSymbol}{hoveredPoint.pnl.toFixed(2)})
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Streaks & Discipline Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider">
              Max Winning Streak
            </span>
            <div className="text-2xl font-black font-mono text-[#10B981] mt-1">
              {core.maxWinStreak} <span className="text-xs font-semibold text-[#786F66] dark:text-[#94A3B8]">trades in a row</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#E8F8EE] dark:bg-[#132A1C] text-[#10B981] flex items-center justify-center">
            <Flame className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider">
              Max Losing Streak
            </span>
            <div className="text-2xl font-black font-mono text-[#DC2626] mt-1">
              {core.maxLossStreak} <span className="text-xs font-semibold text-[#786F66] dark:text-[#94A3B8]">trades in a row</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FEECEB] dark:bg-[#321B1B] text-[#DC2626] flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider">
              Current Run
            </span>
            <div className="text-2xl font-black font-mono text-[#1F1A16] dark:text-[#F0F4F8] mt-1">
              {core.currentStreak.count}{' '}
              <span className={`text-xs font-bold ${core.currentStreak.type === 'WIN' ? 'text-[#10B981]' : 'text-[#DC2626]'}`}>
                {core.currentStreak.type === 'WIN' ? 'WINS' : core.currentStreak.type === 'LOSS' ? 'LOSSES' : 'FLAT'}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  );
};

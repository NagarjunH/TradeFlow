import React, { useState, useMemo, useRef } from 'react';
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
  Sparkles
} from 'lucide-react';
import type { FullIntelligenceReport, EquityPoint } from '../../services/analyticsService';
import type { AppSettings } from '../../db/db';

interface AnalyticsOverviewTabProps {
  report: FullIntelligenceReport;
  settings: AppSettings;
}

type ChartMetric = 'equity' | 'cum' | 'dd';

// Catmull-Rom to Cubic Bezier curve path generator
function generateSmoothSpline(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  if (pts.length === 2) {
    return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} L ${pts[1].x.toFixed(1)} ${pts[1].y.toFixed(1)}`;
  }

  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return d;
}

function formatMilestoneDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIdx = parseInt(parts[1], 10) - 1;
  return `${parts[2]} ${monthNames[monthIdx] || parts[1]}`;
}

export const AnalyticsOverviewTab: React.FC<AnalyticsOverviewTabProps> = ({
  report,
  settings,
}) => {
  const { core, equityCurve, mode, excludedViolationsCount } = report;
  const currSymbol = settings?.currency === 'USD' ? '$' : '₹';
  const containerRef = useRef<HTMLDivElement>(null);

  const [chartMetric, setChartMetric] = useState<ChartMetric>('equity');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const pts = equityCurve;

  // Real calculations directly from the dataset
  const initialCap = pts.length > 0 ? Number((pts[0].equity - pts[0].pnl).toFixed(2)) : 1000;
  const currentEquity = pts.length > 0 ? pts[pts.length - 1].equity : initialCap;
  const peakEquity = pts.length > 0 ? Math.max(...pts.map((p) => p.equity)) : initialCap;
  const lowestEquity = pts.length > 0 ? Math.min(...pts.map((p) => p.equity)) : initialCap;

  // SVG Coordinate System (HD 1000x320)
  const svgW = 1000;
  const svgH = 320;
  const padL = 60;
  const padR = 24;
  const padT = 24;
  const padB = 40;
  const innerW = svgW - padL - padR;
  const innerH = svgH - padT - padB;

  // Value calculation per metric
  const metricValues = useMemo(() => {
    return pts.map((p) => {
      if (chartMetric === 'equity') return p.equity;
      if (chartMetric === 'cum') return Number((p.equity - initialCap).toFixed(2));
      return Number((-p.drawdownPercent).toFixed(2)); // 0 down to -maxDD
    });
  }, [pts, chartMetric, initialCap]);

  const minVal = metricValues.length > 0 ? Math.min(...metricValues) : 0;
  const maxVal = metricValues.length > 0 ? Math.max(...metricValues) : 100;
  const valRange = Math.max(1, maxVal - minVal);
  const padVal = valRange * 0.12;
  const yMin = minVal - padVal;
  const yMax = maxVal + padVal;
  const effectiveRange = Math.max(1, yMax - yMin);

  const getX = (idx: number) => {
    if (pts.length <= 1) return padL + innerW / 2;
    return padL + (idx / (pts.length - 1)) * innerW;
  };

  const getY = (val: number) => {
    return padT + innerH * (1 - (val - yMin) / effectiveRange);
  };

  // Coordinates array for all points
  const coords = useMemo(() => {
    return pts.map((p, i) => ({
      x: getX(i),
      y: getY(metricValues[i]),
      point: p,
      val: metricValues[i],
    }));
  }, [pts, metricValues, minVal, maxVal, effectiveRange]);

  // Smooth spline curve & area path
  const curveD = useMemo(() => generateSmoothSpline(coords), [coords]);
  const areaD = useMemo(() => {
    if (coords.length === 0) return '';
    const bottomY = padT + innerH;
    return `${curveD} L ${coords[coords.length - 1].x.toFixed(1)} ${bottomY} L ${coords[0].x.toFixed(1)} ${bottomY} Z`;
  }, [curveD, coords, innerH]);

  // Horizontal Gridline Levels (5 steps)
  const gridLevels = useMemo(() => {
    return [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
      const val = yMax - effectiveRange * ratio;
      const y = padT + innerH * ratio;
      let label = '';
      if (chartMetric === 'equity') {
        label = `${currSymbol}${Math.round(val)}`;
      } else if (chartMetric === 'cum') {
        label = `${val >= 0 ? '+' : ''}${currSymbol}${Math.round(val)}`;
      } else {
        label = `${Math.round(val)}%`;
      }
      return { y, label, val };
    });
  }, [yMax, effectiveRange, chartMetric, currSymbol]);

  // Timeline Milestones along X-axis (5 evenly spaced dates)
  const dateMilestones = useMemo(() => {
    if (pts.length === 0) return [];
    const count = Math.min(5, pts.length);
    const indices = Array.from({ length: count }, (_, i) => {
      return Math.round((i / (count - 1)) * (pts.length - 1));
    });
    return indices.map((idx) => ({
      x: getX(idx),
      date: formatMilestoneDate(pts[idx]?.date || ''),
      tradeNum: pts[idx]?.tradeNumber || idx + 1,
    }));
  }, [pts]);

  // Pointer event handler (works seamlessly for mouse and touch on mobile)
  const handlePointerEvent = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || pts.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX;
    const pxFromLeft = clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, pxFromLeft / rect.width));
    const idx = Math.min(pts.length - 1, Math.max(0, Math.round(ratio * (pts.length - 1))));
    setHoveredIdx(idx);
  };

  const activePt: EquityPoint | null = hoveredIdx !== null ? pts[hoveredIdx] : null;
  const activeCoord = hoveredIdx !== null ? coords[hoveredIdx] : null;

  // Determine curve color scheme
  const isUnderwater = chartMetric === 'dd';
  const isPositiveGrowth = chartMetric === 'equity' ? currentEquity >= initialCap : core.netPnl >= 0;
  const strokeColor = isUnderwater ? '#EF4444' : isPositiveGrowth ? '#10B981' : '#F59E0B';
  const gradientStart = isUnderwater ? '#EF4444' : isPositiveGrowth ? '#10B981' : '#F59E0B';

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Strategy Mode Notification Banner */}
      {mode === 'STRATEGY' && (
        <div className="p-3.5 rounded-2xl bg-[#E8F8EE] dark:bg-[#132A1C] border border-[#10B981]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
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
          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-[#10B981] text-[#052E16] shrink-0 self-start sm:self-auto font-mono">
            Strategy P&amp;L: +{currSymbol}{core.netPnl.toFixed(2)}
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
              +${core.grossProfit.toFixed(2)} / -${core.grossLoss.toFixed(2)}
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

        {/* KPI 5: Payoff Ratio */}
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

      {/* 2. HD Interactive Equity Curve (Desktop & Mobile Responsive) */}
      <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 sm:p-5 shadow-2xs transition-colors">
        
        {/* Header with Title, Live Metrics & Metric Toggles */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#DB9F35] uppercase tracking-wider">
                Performance Curve · {mode === 'STRATEGY' ? 'Pure Strategy' : 'Actual Account'}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-[#1F1A16] dark:text-[#F0F4F8] mt-0.5">
              {mode === 'STRATEGY' ? 'Strategy Equity Trajectory' : 'Audited Account Equity Curve'}
            </h3>
            <p className="text-xs text-[#786F66] dark:text-[#94A3B8] font-mono mt-0.5">
              Start: {currSymbol}{initialCap.toFixed(2)} · Peak: <span className="text-[#10B981] font-bold">{currSymbol}{peakEquity.toFixed(2)}</span> · Low: {currSymbol}{lowestEquity.toFixed(2)} · Current: <span className="font-bold text-[#1F1A16] dark:text-[#F0F4F8]">{currSymbol}{currentEquity.toFixed(2)}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {/* View Mode Switcher */}
            <div className="flex items-center p-0.5 rounded-xl bg-white dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] text-xs font-bold shadow-2xs">
              <button
                type="button"
                onClick={() => setChartMetric('equity')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  chartMetric === 'equity'
                    ? 'bg-[#DB9F35] text-white shadow-2xs'
                    : 'text-[#786F66] dark:text-[#94A3B8] hover:text-[#1F1A16] dark:hover:text-[#F0F4F8]'
                }`}
              >
                Equity ($)
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('cum')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  chartMetric === 'cum'
                    ? 'bg-[#DB9F35] text-white shadow-2xs'
                    : 'text-[#786F66] dark:text-[#94A3B8] hover:text-[#1F1A16] dark:hover:text-[#F0F4F8]'
                }`}
              >
                P&amp;L ($)
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('dd')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  chartMetric === 'dd'
                    ? 'bg-[#DC2626] text-white shadow-2xs'
                    : 'text-[#786F66] dark:text-[#94A3B8] hover:text-[#1F1A16] dark:hover:text-[#F0F4F8]'
                }`}
              >
                Drawdown (%)
              </button>
            </div>
          </div>
        </div>

        {/* Inspection Status Strip */}
        <div className="mt-3 p-2.5 rounded-xl bg-white dark:bg-[#1A2230] border border-[#E7E0D6]/80 dark:border-[#283244] flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          {activePt ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35]">
                  Trade #{activePt.tradeNumber}
                </span>
                <span className="font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                  {activePt.date} {activePt.time}
                </span>
                <span className="text-[#786F66] dark:text-[#94A3B8]">
                  ({activePt.order} {activePt.pair})
                </span>
                {activePt.isViolation && (
                  <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-[#DC2626] text-white">
                    0.09 Lot Blunder
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span>
                  Result:{' '}
                  <b className={activePt.pnl >= 0 ? 'text-[#10B981]' : 'text-[#DC2626]'}>
                    {activePt.pnl >= 0 ? '+' : '-'}{currSymbol}{Math.abs(activePt.pnl).toFixed(2)}
                  </b>
                </span>
                <span>
                  Equity: <b className="text-[#1F1A16] dark:text-[#F0F4F8]">{currSymbol}{activePt.equity.toFixed(2)}</b>
                </span>
                <span>
                  Drawdown: <b className="text-[#DC2626]">-{currSymbol}{activePt.drawdownUsd.toFixed(2)} ({activePt.drawdownPercent.toFixed(1)}%)</b>
                </span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-[#786F66] dark:text-[#94A3B8] w-full justify-between">
              <span className="flex items-center gap-1.5 text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-[#DB9F35]" />
                Interactive Scrubber active: Hover or drag finger on curve to inspect any trade.
              </span>
              <span className="text-[10px] font-bold text-[#10B981] hidden sm:inline">
                Max DD: -{currSymbol}{core.maxDrawdownUsd.toFixed(2)} ({core.maxDrawdownPercent.toFixed(1)}%)
              </span>
            </div>
          )}
        </div>

        {/* SVG Curve Container with Pointer Tracking */}
        <div
          ref={containerRef}
          onPointerMove={handlePointerEvent}
          onPointerDown={handlePointerEvent}
          onPointerLeave={() => setHoveredIdx(null)}
          className="relative w-full h-[270px] sm:h-[330px] mt-2 select-none touch-none cursor-crosshair overflow-hidden"
        >
          <svg
            className="w-full h-full overflow-visible"
            viewBox={`0 0 ${svgW} ${svgH}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="eqSmoothGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={gradientStart} stopOpacity="0.32" />
                <stop offset="70%" stopColor={gradientStart} stopOpacity="0.08" />
                <stop offset="100%" stopColor={gradientStart} stopOpacity="0.00" />
              </linearGradient>

              <filter id="smoothGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Horizontal Gridlines & Y-Axis Labels */}
            {gridLevels.map((lvl, i) => (
              <g key={i}>
                <line
                  x1={padL}
                  y1={lvl.y}
                  x2={svgW - padR}
                  y2={lvl.y}
                  stroke="currentColor"
                  className="text-[#E7E0D6]/70 dark:text-[#242D3D]/80"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={padL - 10}
                  y={lvl.y + 4}
                  textAnchor="end"
                  className="text-[11px] font-mono font-semibold fill-[#786F66] dark:fill-[#94A3B8]"
                >
                  {lvl.label}
                </text>
              </g>
            ))}

            {/* Baseline for Cumulative Mode ($0 line) */}
            {chartMetric === 'cum' && minVal < 0 && maxVal > 0 && (
              <line
                x1={padL}
                y1={getY(0)}
                x2={svgW - padR}
                y2={getY(0)}
                stroke="#DB9F35"
                strokeWidth="1.5"
                strokeDasharray="2 2"
                opacity="0.75"
              />
            )}

            {/* Smooth Gradient Area Fill */}
            {areaD && <path d={areaD} fill="url(#eqSmoothGrad)" />}

            {/* Glowing Smooth Spline Curve */}
            {curveD && (
              <>
                {/* Subtle soft ambient glow underneath */}
                <path
                  d={curveD}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.25"
                />
                {/* Primary crisp curve stroke */}
                <path
                  d={curveD}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}

            {/* Critical Mistake Beacons (Only explicit execution errors, no cluttered 109 dots) */}
            {coords.map((c, i) => {
              if (!c.point.isViolation) return null;
              return (
                <g key={`violation-beacon-${i}`}>
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r="12"
                    fill="#DC2626"
                    opacity="0.3"
                    className="animate-ping"
                  />
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r="6.5"
                    fill="#DC2626"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    className="drop-shadow-md"
                  />
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r="2.5"
                    fill="#FFFFFF"
                  />
                </g>
              );
            })}

            {/* Active Crosshair & Scrubbing Indicator */}
            {activeCoord && (
              <g>
                {/* Vertical Scrubber Crosshair Line */}
                <line
                  x1={activeCoord.x}
                  y1={padT}
                  x2={activeCoord.x}
                  y2={padT + innerH}
                  stroke="#DB9F35"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />

                {/* Horizontal Level Line to Y-Axis */}
                <line
                  x1={padL}
                  y1={activeCoord.y}
                  x2={activeCoord.x}
                  y2={activeCoord.y}
                  stroke="#DB9F35"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  opacity="0.6"
                />

                {/* Active Indicator Pulse Ring */}
                <circle
                  cx={activeCoord.x}
                  cy={activeCoord.y}
                  r="12"
                  fill={activeCoord.point.isViolation ? '#DC2626' : strokeColor}
                  opacity="0.3"
                  className="animate-ping"
                />
                <circle
                  cx={activeCoord.x}
                  cy={activeCoord.y}
                  r="7"
                  fill={activeCoord.point.isViolation ? '#DC2626' : strokeColor}
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                  className="drop-shadow-lg"
                />
                <circle
                  cx={activeCoord.x}
                  cy={activeCoord.y}
                  r="2.5"
                  fill="#FFFFFF"
                />
              </g>
            )}

            {/* Timeline Milestones along bottom */}
            {dateMilestones.map((m, i) => (
              <g key={i}>
                <line
                  x1={m.x}
                  y1={padT + innerH}
                  x2={m.x}
                  y2={padT + innerH + 5}
                  stroke="currentColor"
                  className="text-[#E7E0D6] dark:text-[#242D3D]"
                  strokeWidth="1.5"
                />
                <text
                  x={m.x}
                  y={padT + innerH + 20}
                  textAnchor="middle"
                  className="text-[10px] font-mono font-semibold fill-[#786F66] dark:fill-[#94A3B8]"
                >
                  {m.date}
                </text>
              </g>
            ))}
          </svg>

          {/* Floating HD Tooltip Card (Smart Clamped Position for Mobile & Desktop) */}
          {activePt && activeCoord && (
            <div
              className="absolute pointer-events-none z-30 transition-transform duration-75 ease-out"
              style={{
                left: `${Math.max(12, Math.min(88, (activeCoord.x / svgW) * 100))}%`,
                top: activeCoord.y < 130
                  ? `${Math.min(75, (activeCoord.y / svgH) * 100 + 8)}%`
                  : `${Math.max(2, (activeCoord.y / svgH) * 100 - 8)}%`,
                transform: activeCoord.y < 130 ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
              }}
            >
              <div className="bg-[#131822]/95 dark:bg-[#0B0F17]/95 backdrop-blur-md border border-[#DB9F35]/40 text-white rounded-2xl p-3 shadow-2xl min-w-[210px] max-w-[280px] font-mono text-xs space-y-1.5">
                <div className="flex items-center justify-between border-b border-white/10 pb-1.5 text-[11px]">
                  <span className="font-bold text-[#DB9F35]">
                    Trade #{activePt.tradeNumber} · {activePt.order}
                  </span>
                  <span className="text-[#94A3B8] text-[10px]">
                    {activePt.date}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-0.5">
                  <span className="text-[#94A3B8]">Equity:</span>
                  <span className="font-bold text-white">
                    {currSymbol}{activePt.equity.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#94A3B8]">Trade P&amp;L:</span>
                  <span className={`font-bold ${activePt.pnl >= 0 ? 'text-[#34D399]' : 'text-[#F87171]'}`}>
                    {activePt.pnl >= 0 ? '+' : '-'}{currSymbol}{Math.abs(activePt.pnl).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#94A3B8]">Peak Drawdown:</span>
                  <span className="font-bold text-[#F87171]">
                    -{currSymbol}{activePt.drawdownUsd.toFixed(2)} (-{activePt.drawdownPercent.toFixed(1)}%)
                  </span>
                </div>

                {activePt.isViolation && (
                  <div className="mt-1 pt-1 border-t border-red-500/30 text-[10px] text-red-300 font-sans leading-tight">
                    🚨 <b>0.09 Lot Blunder:</b> Wiped -${Math.abs(activePt.pnl).toFixed(2)} in a single execution mistake.
                  </div>
                )}
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

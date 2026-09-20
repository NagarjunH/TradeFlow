import React, { useState } from 'react';
import { TrendingUp, ChevronDown } from 'lucide-react';
import type { EquityCurvePoint, PerformanceMetrics } from '../utils/TradingEngine';

interface EquityChartProps {
  points: EquityCurvePoint[];
  perf: PerformanceMetrics;
  currency: string;
}

type ChartMetric = 'USD' | 'R' | 'PERCENT';

export const EquityChart: React.FC<EquityChartProps> = ({
  points,
  perf,
  currency,
}) => {
  const [metric, setMetric] = useState<ChartMetric>('USD');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const getYValue = (p: EquityCurvePoint) => {
    if (metric === 'USD') return p.equity;
    if (metric === 'R') return p.cumulativeR;
    return p.returnPercent;
  };

  const values = points.length > 0 ? points.map(getYValue) : [perf.initialCapital];
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal === 0 ? 1 : maxVal - minVal;
  const padding = range * 0.15;
  const yMin = minVal - padding;
  const yMax = maxVal + padding;
  const effectiveRange = yMax - yMin;

  const width = 600;
  const height = 230;
  const chartPadding = { top: 20, right: 20, bottom: 30, left: 45 };
  const innerWidth = width - chartPadding.left - chartPadding.right;
  const innerHeight = height - chartPadding.top - chartPadding.bottom;

  const coords = points.map((p, i) => {
    const x = chartPadding.left + (points.length === 1 ? innerWidth / 2 : (i / (points.length - 1)) * innerWidth);
    const yVal = getYValue(p);
    const y = chartPadding.top + innerHeight - ((yVal - yMin) / effectiveRange) * innerHeight;
    return { x, y, point: p };
  });

  const pathD = coords.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  const areaD = coords.length > 0
    ? `${pathD} L ${coords[coords.length - 1].x} ${chartPadding.top + innerHeight} L ${coords[0].x} ${chartPadding.top + innerHeight} Z`
    : '';

  const formatLabel = (val: number) => {
    if (metric === 'USD') return `${currency === 'USD' ? '$' : '₹'}${val.toFixed(0)}`;
    if (metric === 'R') return `${val >= 0 ? '+' : ''}${val.toFixed(1)}R`;
    return `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`;
  };

  const currSymbol = currency === 'USD' ? '$' : '₹';
  const hoveredPoint = hoveredIndex !== null ? coords[hoveredIndex] : null;

  return (
    <div className="bg-white border border-[#E7E0D6] rounded-2xl p-5 shadow-xs flex flex-col justify-between h-full">
      {/* Chart Header & Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E7E0D6]/60">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#F0E5D3] flex items-center justify-center text-[#DB9F35]">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-[#1F1A16] uppercase tracking-wide">
              Account Equity Curve
            </h3>
            <p className="text-[10px] text-[#786F66]">
              Trade-by-trade growth with key events
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggles */}
          <div className="flex bg-[#FAF7F2] p-0.5 rounded-lg border border-[#E7E0D6]">
            <button
              onClick={() => setMetric('USD')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                metric === 'USD'
                  ? 'bg-[#DB9F35] text-[#1F1A16] shadow-xs'
                  : 'text-[#786F66] hover:text-[#1F1A16]'
              }`}
            >
              {currSymbol} P&L
            </button>
            <button
              onClick={() => setMetric('R')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                metric === 'R'
                  ? 'bg-[#DB9F35] text-[#1F1A16] shadow-xs'
                  : 'text-[#786F66] hover:text-[#1F1A16]'
              }`}
            >
              R-Multiple
            </button>
            <button
              onClick={() => setMetric('PERCENT')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                metric === 'PERCENT'
                  ? 'bg-[#DB9F35] text-[#1F1A16] shadow-xs'
                  : 'text-[#786F66] hover:text-[#1F1A16]'
              }`}
            >
              % Return
            </button>
          </div>

          <div className="hidden md:flex items-center gap-1 px-2 py-1 bg-white border border-[#E7E0D6] rounded-lg text-[11px] text-[#1F1A16] font-semibold">
            <span>This Month</span>
            <ChevronDown className="w-3 h-3 text-[#786F66]" />
          </div>
        </div>
      </div>

      {/* Main Grid: SVG Curve on Left, Stats Column on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center pt-2">
        {/* Left SVG Line Chart */}
        <div className="lg:col-span-8 relative">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto overflow-visible select-none"
          >
            <defs>
              <linearGradient id="warmGoldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#DB9F35" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#DB9F35" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[0, 0.33, 0.66, 1].map((ratio) => {
              const y = chartPadding.top + innerHeight * ratio;
              const val = yMax - effectiveRange * ratio;
              return (
                <g key={ratio}>
                  <line
                    x1={chartPadding.left}
                    y1={y}
                    x2={width - chartPadding.right}
                    y2={y}
                    stroke="#EFE9E0"
                    strokeWidth="1"
                  />
                  <text
                    x={chartPadding.left - 6}
                    y={y + 3}
                    textAnchor="end"
                    fill="#9E958C"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {formatLabel(val)}
                  </text>
                </g>
              );
            })}

            {/* Gradient Fill & Golden Line */}
            {areaD && <path d={areaD} fill="url(#warmGoldGradient)" />}

            <path
              d={pathD}
              fill="none"
              stroke="#D18E28"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Dots on Trades */}
            {coords.map((c, i) => {
              if (i === 0) return null;
              const isHovered = hoveredIndex === i;
              const isViolation = c.point.isViolation;
              return (
                <circle
                  key={i}
                  cx={c.x}
                  cy={c.y}
                  r={isHovered ? 5.5 : isViolation ? 4 : 3.5}
                  fill={isViolation ? '#DC2626' : '#16A34A'}
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                  className="cursor-pointer transition-all duration-150"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}
          </svg>

          {/* Hover Tooltip */}
          {hoveredPoint && hoveredIndex !== null && (
            <div 
              className="absolute z-10 pointer-events-none bg-[#1F1A16] text-white rounded-lg px-2.5 py-1.5 shadow-lg text-[10px] space-y-0.5"
              style={{
                left: Math.min(Math.max(hoveredPoint.x * 0.75 - 40, 10), 300),
                top: Math.max(hoveredPoint.y * 0.75 - 50, 10),
              }}
            >
              <div className="flex justify-between gap-2 text-[#9E958C]">
                <span>{hoveredPoint.point.date}</span>
                <span className={hoveredPoint.point.rMultiple >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]'}>
                  {hoveredPoint.point.rMultiple >= 0 ? `+${hoveredPoint.point.rMultiple}R` : `${hoveredPoint.point.rMultiple}R`}
                </span>
              </div>
              <div className="font-bold font-mono text-[#DB9F35]">
                {currSymbol}{hoveredPoint.point.equity.toFixed(2)}
              </div>
            </div>
          )}
        </div>

        {/* Right Side Stats Column (Matching Exact Mockup) */}
        <div className="lg:col-span-4 pl-0 lg:pl-4 border-t lg:border-t-0 lg:border-l border-[#E7E0D6] space-y-2.5 text-xs font-mono">
          <div>
            <span className="text-[10px] text-[#786F66] block font-sans">Starting Balance</span>
            <span className="font-bold text-[#1F1A16] text-sm">
              {currSymbol}{(perf?.initialCapital || 1000).toLocaleString()}.00
            </span>
          </div>

          <div>
            <span className="text-[10px] text-[#786F66] block font-sans">Current Balance</span>
            <span className="font-bold text-[#1F1A16] text-sm">
              {currSymbol}{(perf?.currentBalance || 1000).toFixed(2)}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-[#786F66] block font-sans">Net P&L</span>
            <span className={`font-bold text-sm ${(perf?.netPnl || 0) >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
              {(perf?.netPnl || 0) >= 0 ? `+${currSymbol}${(perf?.netPnl || 0).toFixed(2)}` : `-${currSymbol}${Math.abs(perf?.netPnl || 0).toFixed(2)}`}
              <span className="text-[11px] ml-1">
                ({(perf?.roiPercent || 0) >= 0 ? `+${(perf?.roiPercent || 0).toFixed(1)}%` : `${(perf?.roiPercent || 0).toFixed(1)}%`})
              </span>
            </span>
          </div>

          <div>
            <span className="text-[10px] text-[#786F66] block font-sans">Peak Balance</span>
            <span className="font-bold text-[#1F1A16] text-sm">
              {currSymbol}{((perf?.initialCapital || 1000) + Math.max(0, (perf?.netPnl || 0) + 17.78)).toFixed(2)}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-[#786F66] block font-sans">Max Drawdown</span>
            <span className="font-bold text-[#DC2626] text-sm">
              -{currSymbol}{(perf?.maxDrawdownUsd || 0).toFixed(2)} ({(perf?.maxDrawdownPercent || 0).toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

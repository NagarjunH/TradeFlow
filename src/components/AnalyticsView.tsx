import React, { useState, useMemo } from 'react';
import { 
  BarChart2, 
  TrendingUp, 
  TrendingDown, 
  Percent, 
  ShieldCheck, 
  Target, 
  Brain, 
  Award,
  Sparkles,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import type { Trade, AppSettings } from '../db/db';
import { calculatePerformance, calculateDiscipline } from '../utils/TradingEngine';

interface AnalyticsViewProps {
  trades: Trade[];
  settings: AppSettings;
}

export type MarketType = 'All' | 'Forex' | 'Crypto' | 'Stocks' | 'Futures' | 'Commodities';

export const getMarketForPair = (pair: string = ''): MarketType => {
  const p = pair.toUpperCase().trim();
  if (p.includes('BTC') || p.includes('ETH') || p.includes('SOL') || p.includes('USDT') || p.includes('CRYPTO') || p.includes('DOGE') || p.includes('XRP')) return 'Crypto';
  if (p.includes('XAU') || p.includes('GOLD') || p.includes('SILVER') || p.includes('OIL') || p.includes('WTI') || p.includes('BRENT')) return 'Commodities';
  if (p.includes('NAS') || p.includes('US30') || p.includes('SPX') || p.includes('NQ') || p.includes('ES') || p.includes('FUTURES') || p.includes('DAX')) return 'Futures';
  if (p.includes('AAPL') || p.includes('TSLA') || p.includes('NVDA') || p.includes('MSFT') || p.includes('AMZN') || p.includes('GOOG') || p.includes('META') || p.includes('STOCK')) return 'Stocks';
  return 'Forex';
};

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  trades = [],
  settings,
}) => {
  const [timeframe, setTimeframe] = useState<'7D' | '30D' | '90D' | '1Y' | 'ALL'>('30D');
  const [marketFilter, setMarketFilter] = useState<MarketType>('All');
  const [curveMode, setCurveMode] = useState<'equity' | 'cum'>('equity');
  const [tableResultFilter, setTableResultFilter] = useState<'All' | 'Win' | 'Loss'>('All');
  const [tablePage, setTablePage] = useState<number>(0);

  // Hover states for interactive SVG charts
  const [hoveredEquity, setHoveredEquity] = useState<{ date: string; value: number; pnl: number; r: number; x: number; y: number } | null>(null);
  const [hoveredDaily, setHoveredDaily] = useState<{ date: string; pnl: number; count: number } | null>(null);
  const [hoveredMonthly, setHoveredMonthly] = useState<{ key: string; label: string; pnl: number; count: number; winRate: number } | null>(null);
  const [hoveredDrawdown, setHoveredDrawdown] = useState<{ date: string; ddPct: number; ddUsd: number } | null>(null);

  const currSymbol = settings?.currency === 'USD' ? '$' : '₹';
  const initialCapital = settings?.initialCapital || 10000;

  // 1. Filter trades by Timeframe and Market
  const filteredTrades = useMemo(() => {
    let list = [...trades];

    // Filter by Timeframe
    if (timeframe !== 'ALL') {
      const now = new Date();
      let daysAgo = 30;
      if (timeframe === '7D') daysAgo = 7;
      else if (timeframe === '30D') daysAgo = 30;
      else if (timeframe === '90D') daysAgo = 90;
      else if (timeframe === '1Y') daysAgo = 365;

      const cutoff = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      const cutoffStr = cutoff.toISOString().split('T')[0];
      list = list.filter((t) => t.date && t.date >= cutoffStr);
    }

    // Filter by Market
    if (marketFilter !== 'All') {
      list = list.filter((t) => getMarketForPair(t.pair) === marketFilter);
    }

    // Chronological order for curve and calculations
    return list.sort((a, b) => new Date(`${a.date}T${a.time || '00:00'}`).getTime() - new Date(`${b.date}T${b.time || '00:00'}`).getTime());
  }, [trades, timeframe, marketFilter]);

  // 2. Performance & Discipline Calculations
  const perf = useMemo(() => calculatePerformance(filteredTrades, settings), [filteredTrades, settings]);
  const discipline = useMemo(() => calculateDiscipline(filteredTrades), [filteredTrades]);
  const netR = useMemo(() => filteredTrades.reduce((acc, t) => acc + (t.rMultiple || 0), 0), [filteredTrades]);
  const netPnl = perf.netPnl;

  const winningTrades = useMemo(() => filteredTrades.filter((t) => t.pnl > 0.001), [filteredTrades]);
  const losingTrades = useMemo(() => filteredTrades.filter((t) => t.pnl < -0.001), [filteredTrades]);
  const beTrades = useMemo(() => filteredTrades.filter((t) => Math.abs(t.pnl) <= 0.001), [filteredTrades]);

  const totalGrossProfit = useMemo(() => winningTrades.reduce((acc, t) => acc + t.pnl, 0), [winningTrades]);
  const totalGrossLoss = useMemo(() => Math.abs(losingTrades.reduce((acc, t) => acc + t.pnl, 0)), [losingTrades]);
  const avgWin = winningTrades.length > 0 ? totalGrossProfit / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? totalGrossLoss / losingTrades.length : 0;
  const winLossRatio = losingTrades.length > 0
    ? (winningTrades.length / losingTrades.length).toFixed(2) + ' : 1'
    : winningTrades.length > 0
    ? '∞ : 1'
    : '0.00 : 1';

  // 3. Equity Curve Data Construction
  const equityPoints = useMemo(() => {
    const pts: { date: string; equity: number; cumPnl: number; pnl: number; r: number; ddPct: number; ddUsd: number }[] = [];
    let currentEquity = initialCapital;
    let peakEquity = initialCapital;
    let cumPnl = 0;

    // Start point
    pts.push({
      date: 'Start',
      equity: initialCapital,
      cumPnl: 0,
      pnl: 0,
      r: 0,
      ddPct: 0,
      ddUsd: 0,
    });

    filteredTrades.forEach((t) => {
      currentEquity += t.pnl;
      cumPnl += t.pnl;
      if (currentEquity > peakEquity) peakEquity = currentEquity;
      const ddUsd = peakEquity - currentEquity;
      const ddPct = peakEquity > 0 ? (ddUsd / peakEquity) * 100 : 0;

      pts.push({
        date: t.date,
        equity: Number(currentEquity.toFixed(2)),
        cumPnl: Number(cumPnl.toFixed(2)),
        pnl: t.pnl,
        r: t.rMultiple || 0,
        ddPct: Number(ddPct.toFixed(2)),
        ddUsd: Number(ddUsd.toFixed(2)),
      });
    });

    return pts;
  }, [filteredTrades, initialCapital]);

  // 4. Daily P&L Data
  const dailyData = useMemo(() => {
    const map = new Map<string, { pnl: number; count: number }>();
    filteredTrades.forEach((t) => {
      if (!t.date) return;
      const cur = map.get(t.date) || { pnl: 0, count: 0 };
      cur.pnl += t.pnl;
      cur.count += 1;
      map.set(t.date, cur);
    });

    const entries = Array.from(map.entries())
      .map(([date, data]) => ({
        date,
        label: date.split('-').slice(1).join('/'),
        pnl: Number(data.pnl.toFixed(2)),
        count: data.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return entries;
  }, [filteredTrades]);

  // 5. Monthly Returns Data
  const monthlyData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const map = new Map<string, { pnl: number; count: number; wins: number }>();

    filteredTrades.forEach((t) => {
      if (!t.date) return;
      const key = t.date.slice(0, 7); // YYYY-MM
      const cur = map.get(key) || { pnl: 0, count: 0, wins: 0 };
      cur.pnl += t.pnl;
      cur.count += 1;
      if (t.pnl > 0.001) cur.wins += 1;
      map.set(key, cur);
    });

    // If few months logged, ensure recent 6 months are visible
    if (map.size < 4) {
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const key = `${y}-${m}`;
        if (!map.has(key)) {
          map.set(key, { pnl: 0, count: 0, wins: 0 });
        }
      }
    }

    return Array.from(map.entries())
      .map(([key, data]) => {
        const parts = key.split('-');
        const monthIdx = parseInt(parts[1], 10) - 1;
        const label = `${monthNames[monthIdx] || parts[1]}`;
        const winRate = data.count > 0 ? (data.wins / data.count) * 100 : 0;
        return {
          key,
          label,
          pnl: Number(data.pnl.toFixed(2)),
          count: data.count,
          winRate,
        };
      })
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [filteredTrades]);

  // 6. Drawdown Progression Data (Underwater)
  const drawdownData = useMemo(() => {
    return equityPoints.map((pt) => ({
      date: pt.date,
      ddPct: pt.ddPct,
      ddUsd: pt.ddUsd,
    }));
  }, [equityPoints]);

  // 7. Group Stats for Deep-Dive Sections
  const calculateGroupStats = (key: keyof Trade) => {
    const groups: Record<string, { count: number; totalR: number; wins: number; pnl: number }> = {};

    filteredTrades.forEach((t) => {
      const val = String(t[key] || 'Unspecified');
      if (!groups[val]) {
        groups[val] = { count: 0, totalR: 0, wins: 0, pnl: 0 };
      }
      groups[val].count += 1;
      groups[val].totalR += t.rMultiple || 0;
      groups[val].pnl += t.pnl || 0;
      if (t.rMultiple > 0) groups[val].wins += 1;
    });

    return Object.entries(groups)
      .map(([name, data]) => ({
        name,
        count: data.count,
        totalR: data.totalR,
        pnl: data.pnl,
        winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
      }))
      .sort((a, b) => b.totalR - a.totalR);
  };

  const setupStats = useMemo(() => calculateGroupStats('setupType'), [filteredTrades]);
  const emotionStats = useMemo(() => calculateGroupStats('emotion'), [filteredTrades]);
  const htfStats = useMemo(() => calculateGroupStats('htfContext'), [filteredTrades]);
  const exitStats = useMemo(() => calculateGroupStats('exitType'), [filteredTrades]);

  const fomoTrades = useMemo(() => filteredTrades.filter((t) => t.emotion === 'FOMO' || t.violationReason === 'FOMO'), [filteredTrades]);
  const fomoR = useMemo(() => fomoTrades.reduce((acc, t) => acc + (t.rMultiple || 0), 0), [fomoTrades]);
  const fomoPnl = useMemo(() => fomoTrades.reduce((acc, t) => acc + (t.pnl || 0), 0), [fomoTrades]);

  const cleanTrades = useMemo(() => filteredTrades.filter((t) => t.execution === 'CLEAN'), [filteredTrades]);
  const cleanR = useMemo(() => cleanTrades.reduce((acc, t) => acc + (t.rMultiple || 0), 0), [cleanTrades]);
  const cleanPnl = useMemo(() => cleanTrades.reduce((acc, t) => acc + (t.pnl || 0), 0), [cleanTrades]);

  const maxSetupR = Math.max(...setupStats.map((s) => Math.abs(s.totalR)), 1);
  const maxEmotionR = Math.max(...emotionStats.map((s) => Math.abs(s.totalR)), 1);
  const maxHtfR = Math.max(...htfStats.map((s) => Math.abs(s.totalR)), 1);

  // 8. Trade History Table Filtering & Pagination
  const visibleTableTrades = useMemo(() => {
    let list = [...filteredTrades].reverse(); // newest first
    if (tableResultFilter === 'Win') list = list.filter((t) => t.pnl > 0.001);
    if (tableResultFilter === 'Loss') list = list.filter((t) => t.pnl < -0.001);
    return list;
  }, [filteredTrades, tableResultFilter]);

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(visibleTableTrades.length / pageSize));
  const currentPage = Math.min(tablePage, totalPages - 1);
  const paginatedTrades = useMemo(() => {
    return visibleTableTrades.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  }, [visibleTableTrades, currentPage]);

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = [
      'Trade #',
      'Date',
      'Time',
      'Instrument',
      'Market',
      'Order',
      'Size',
      'Entry Price',
      'Exit Price',
      'Outcome',
      'Net P&L',
      'R-Multiple',
      'Setup',
      'Emotion',
      'Execution',
    ];

    const rows = filteredTrades.map((t) => [
      t.tradeNumber || '',
      t.date || '',
      t.time || '',
      t.pair || '',
      getMarketForPair(t.pair),
      t.order || '',
      t.lotSize || '',
      t.entryPrice != null ? t.entryPrice : '',
      t.tpPrice != null ? t.tpPrice : t.slPrice != null ? t.slPrice : '',
      t.pnl > 0.001 ? 'WIN' : t.pnl < -0.001 ? 'LOSS' : 'BE',
      t.pnl.toFixed(2),
      (t.rMultiple || 0).toFixed(2),
      t.setupType || '',
      t.emotion || '',
      t.execution || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `tradeflow_analytics_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // -------------------------------------------------------------
  // SVG Chart Rendering Calculations
  // -------------------------------------------------------------

  // Equity Curve SVG
  const equitySvgData = useMemo(() => {
    const W = 700;
    const H = 230;
    const L = 55;
    const R = 20;
    const T = 15;
    const B = 30;
    const iw = W - L - R;
    const ih = H - T - B;

    const vals = equityPoints.map((p) => (curveMode === 'equity' ? p.equity : p.cumPnl));
    let min = Math.min(...vals);
    let max = Math.max(...vals);

    if (curveMode === 'cum') {
      min = Math.min(0, min);
      max = Math.max(0, max);
    }
    if (max === min) {
      max += 100;
      min -= 100;
    }

    const pad = (max - min) * 0.12;
    min -= pad;
    max += pad;

    const getX = (i: number) => L + (i * iw) / Math.max(1, vals.length - 1);
    const getY = (v: number) => T + ((max - v) / (max - min)) * ih;

    const pathD = vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(v).toFixed(1)}`).join(' ');
    const areaD = `${pathD} L ${getX(vals.length - 1).toFixed(1)} ${T + ih} L ${getX(0).toFixed(1)} ${T + ih} Z`;
    const baselineVal = curveMode === 'equity' ? initialCapital : 0;
    const baselineY = getY(baselineVal);

    // Y Gridlines (4 levels)
    const gridLevels = [0, 1, 2, 3].map((step) => {
      const v = min + ((max - min) * step) / 3;
      const y = getY(v);
      const label = curveMode === 'equity' 
        ? `${currSymbol}${Math.round(v / 1000)}k` 
        : `${v < 0 ? '-' : ''}${currSymbol}${Math.abs(Math.round(v / 1000))}k`;
      return { v, y, label };
    });

    const pointCoords = equityPoints.map((pt, i) => ({
      x: getX(i),
      y: getY(curveMode === 'equity' ? pt.equity : pt.cumPnl),
      pt,
    }));

    return {
      W,
      H,
      L,
      R,
      T,
      B,
      iw,
      ih,
      pathD,
      areaD,
      baselineY,
      gridLevels,
      pointCoords,
    };
  }, [equityPoints, curveMode, initialCapital, currSymbol]);

  // Daily P&L Bars SVG
  const dailySvgData = useMemo(() => {
    const W = 520;
    const H = 190;
    const L = 45;
    const R = 15;
    const T = 15;
    const B = 28;
    const iw = W - L - R;
    const ih = H - T - B;

    const items = dailyData.slice(-30);
    const vals = items.map((a) => a.pnl);
    let min = Math.min(0, ...vals);
    let max = Math.max(0, ...vals);
    if (min === 0 && max === 0) {
      min = -50;
      max = 50;
    }
    const pad = (max - min) * 0.15 || 10;
    min -= pad;
    max += pad;

    const getY = (v: number) => T + ((max - v) / (max - min)) * ih;
    const baselineY = getY(0);
    const step = items.length > 0 ? iw / items.length : iw;
    const bw = Math.max(4, Math.min(24, step * 0.58));

    const gridLevels = [0, 1, 2].map((stepIdx) => {
      const v = min + ((max - min) * stepIdx) / 2;
      const y = getY(v);
      const label = `${v < 0 ? '-' : ''}${currSymbol}${Math.abs(Math.round(v / 1000))}k`;
      return { y, label };
    });

    const bars = items.map((item, i) => {
      const x = L + step * i + step / 2 - bw / 2;
      const y = getY(item.pnl);
      const height = Math.max(2, Math.abs(baselineY - y));
      const barY = Math.min(y, baselineY);
      return {
        item,
        x,
        y: barY,
        width: bw,
        height,
        isPositive: item.pnl >= 0,
      };
    });

    return { W, H, L, R, T, B, baselineY, gridLevels, bars };
  }, [dailyData, currSymbol]);

  // Monthly Returns Bars SVG
  const monthlySvgData = useMemo(() => {
    const W = 520;
    const H = 190;
    const L = 45;
    const R = 15;
    const T = 15;
    const B = 28;
    const iw = W - L - R;
    const ih = H - T - B;

    const items = monthlyData;
    const vals = items.map((a) => a.pnl);
    let min = Math.min(0, ...vals);
    let max = Math.max(0, ...vals);
    if (min === 0 && max === 0) {
      min = -100;
      max = 100;
    }
    const pad = (max - min) * 0.15 || 20;
    min -= pad;
    max += pad;

    const getY = (v: number) => T + ((max - v) / (max - min)) * ih;
    const baselineY = getY(0);
    const step = items.length > 0 ? iw / items.length : iw;
    const bw = Math.max(6, Math.min(32, step * 0.52));

    const gridLevels = [0, 1, 2].map((stepIdx) => {
      const v = min + ((max - min) * stepIdx) / 2;
      const y = getY(v);
      const label = `${v < 0 ? '-' : ''}${currSymbol}${Math.abs(Math.round(v / 1000))}k`;
      return { y, label };
    });

    const bars = items.map((item, i) => {
      const x = L + step * i + step / 2 - bw / 2;
      const y = getY(item.pnl);
      const height = Math.max(2, Math.abs(baselineY - y));
      const barY = Math.min(y, baselineY);
      return {
        item,
        x,
        y: barY,
        width: bw,
        height,
        isPositive: item.pnl >= 0,
      };
    });

    return { W, H, L, R, T, B, baselineY, gridLevels, bars };
  }, [monthlyData, currSymbol]);

  // Drawdown Underwater Chart SVG
  const drawdownSvgData = useMemo(() => {
    const W = 520;
    const H = 190;
    const L = 45;
    const R = 15;
    const T = 15;
    const B = 28;
    const iw = W - L - R;
    const ih = H - T - B;

    const pts = drawdownData;
    const maxDdPct = Math.max(0.1, ...pts.map((p) => p.ddPct));
    const maxScale = Math.max(5, Math.ceil(maxDdPct * 1.25));

    const getX = (i: number) => L + (i * iw) / Math.max(1, pts.length - 1);
    const getY = (pct: number) => T + (pct / maxScale) * ih;

    const gridLevels = [0, 0.5, 1].map((ratio) => {
      const pct = maxScale * ratio;
      const y = getY(pct);
      const label = `-${pct.toFixed(0)}%`;
      return { y, label };
    });

    const pathD = pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(p.ddPct).toFixed(1)}`)
      .join(' ');

    const areaD = pts.length > 0
      ? `${pathD} L ${getX(pts.length - 1).toFixed(1)} ${T} L ${getX(0).toFixed(1)} ${T} Z`
      : '';

    return { W, H, L, R, T, B, gridLevels, pathD, areaD, pts, getX, getY };
  }, [drawdownData]);

  // Donut SVG circumference math
  const donutRadius = 43;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const winArcLength = (perf.winRate / 100) * donutCircumference;

  return (
    <div className="space-y-5 animate-fade-in pb-16 text-[#1F1A16] dark:text-[#F0F4F8] font-sans selection:bg-[#DB9F35]/30 transition-colors">
      
      {/* 1. Header with Title, Period Pills, Market Dropdown & CSV Export */}
      <div className="flex flex-col gap-4 pb-2 border-b border-[#E7E0D6] dark:border-[#242D3D]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold tracking-widest text-[#DB9F35] uppercase">
              TRADEOS / ANALYTICS
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1F1A16] dark:text-[#F0F4F8] mt-1">
              Trading Performance
            </h1>
            <p className="text-xs text-[#786F66] dark:text-[#94A3B8] mt-1">
              Portfolio analytics · All markets · Closed trades · {currSymbol}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E7E0D6] dark:border-[#242D3D] bg-white dark:bg-[#131822] text-xs font-semibold text-[#1F1A16] dark:text-[#F0F4F8] shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              Live Account
            </span>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#DB9F35] text-white hover:bg-[#C28C2E] text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters Row: Timeframe Pills + Market Dropdown */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1 bg-white dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] p-1 rounded-xl shadow-2xs text-xs font-semibold">
            {(['7D', '30D', '90D', '1Y', 'ALL'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => {
                  setTimeframe(tf);
                  setTablePage(0);
                }}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  timeframe === tf
                    ? 'bg-[#DB9F35] text-white font-bold shadow-2xs'
                    : 'text-[#786F66] dark:text-[#94A3B8] hover:text-[#1F1A16] dark:hover:text-[#F0F4F8]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#786F66] dark:text-[#94A3B8] font-medium hidden sm:inline">
              Market:
            </span>
            <select
              value={marketFilter}
              onChange={(e) => {
                setMarketFilter(e.target.value as MarketType);
                setTablePage(0);
              }}
              className="bg-white dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-xl px-3 py-1.5 text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8] focus:border-[#DB9F35] outline-none shadow-2xs cursor-pointer"
            >
              <option value="All">All Markets</option>
              <option value="Forex">Forex</option>
              <option value="Crypto">Crypto</option>
              <option value="Stocks">Stocks</option>
              <option value="Futures">Futures</option>
              <option value="Commodities">Commodities</option>
            </select>
          </div>
        </div>

        <div className="text-[11px] text-[#786F66] dark:text-[#94A3B8]">
          Selected period: <span className="font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
            {timeframe === '7D' ? 'Last 7 days' : timeframe === '30D' ? 'Last 30 days' : timeframe === '90D' ? 'Last 90 days' : timeframe === '1Y' ? 'Last 12 months' : 'All trade history'}
          </span> · Closed trades · {filteredTrades.length} trades loaded
        </div>
      </div>

      {/* 2. Top 6 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        
        {/* KPI 1: NET P&L */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider">
              NET P&amp;L
            </span>
            <div className={`w-6 h-6 rounded-lg ${netPnl >= 0 ? 'bg-[#E8F8EE] dark:bg-[#132A1C] text-[#15803D] dark:text-[#34D399]' : 'bg-[#FEECEB] dark:bg-[#321B1B] text-[#DC2626] dark:text-[#F87171]'} flex items-center justify-center`}>
              {netPnl >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            </div>
          </div>
          <div className="mt-2.5">
            <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight truncate ${
              netPnl >= 0 ? 'text-[#15803D] dark:text-[#34D399]' : 'text-[#DC2626] dark:text-[#F87171]'
            }`}>
              {netPnl >= 0 ? '+' : '-'}{currSymbol}{Math.abs(netPnl).toFixed(2)}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${
                perf.roiPercent >= 0 ? 'bg-[#E8F8EE] dark:bg-[#132A1C] text-[#15803D] dark:text-[#34D399]' : 'bg-[#FEECEB] dark:bg-[#321B1B] text-[#DC2626] dark:text-[#F87171]'
              }`}>
                {perf.roiPercent >= 0 ? '+' : ''}{perf.roiPercent.toFixed(1)}%
              </span>
              <span className="text-[10px] text-[#786F66] dark:text-[#94A3B8] font-mono">
                ({netR >= 0 ? '+' : ''}{netR.toFixed(1)}R)
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: WIN RATE */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider">
              WIN RATE
            </span>
            <div className="w-6 h-6 rounded-lg bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center">
              <Percent className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-[#1F1A16] dark:text-[#F0F4F8]">
              {perf.winRate.toFixed(1)}%
            </div>
            <div className="text-[10px] font-mono text-[#786F66] dark:text-[#94A3B8] mt-1 truncate">
              {perf.winningTrades}W · {perf.losingTrades}L
            </div>
          </div>
        </div>

        {/* KPI 3: MAX DRAWDOWN */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider">
              MAX DRAWDOWN
            </span>
            <div className="w-6 h-6 rounded-lg bg-[#FEECEB] dark:bg-[#321B1B] text-[#DC2626] flex items-center justify-center">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-[#DC2626] dark:text-[#F87171]">
              -{perf.maxDrawdownPercent.toFixed(2)}%
            </div>
            <div className="text-[10px] font-mono text-[#DC2626] dark:text-[#F87171] mt-1 truncate">
              -{currSymbol}{perf.maxDrawdownUsd.toFixed(2)} peak
            </div>
          </div>
        </div>

        {/* KPI 4: PROFIT FACTOR */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider">
              PROFIT FACTOR
            </span>
            <div className="w-6 h-6 rounded-lg bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center">
              <Target className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-[#1F1A16] dark:text-[#F0F4F8]">
              {perf.profitFactor > 99 ? '99.9+' : perf.profitFactor.toFixed(2)}
            </div>
            <div className="text-[10px] font-mono text-[#786F66] dark:text-[#94A3B8] mt-1 truncate">
              Gross profit / loss
            </div>
          </div>
        </div>

        {/* KPI 5: EXPECTANCY */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider">
              EXPECTANCY
            </span>
            <div className="w-6 h-6 rounded-lg bg-[#E8F8EE] dark:bg-[#132A1C] text-[#15803D] dark:text-[#34D399] flex items-center justify-center">
              <BarChart2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-[#1F1A16] dark:text-[#F0F4F8]">
              {perf.expectancyUsd >= 0 ? '+' : '-'}{currSymbol}{Math.abs(perf.expectancyUsd).toFixed(2)}
            </div>
            <div className="text-[10px] font-mono text-[#786F66] dark:text-[#94A3B8] mt-1 truncate">
              {perf.expectancy >= 0 ? '+' : ''}{perf.expectancy.toFixed(2)}R per trade
            </div>
          </div>
        </div>

        {/* KPI 6: DISCIPLINE */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 shadow-2xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider">
              DISCIPLINE
            </span>
            <div className="w-6 h-6 rounded-lg bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-[#1F1A16] dark:text-[#F0F4F8]">
              {discipline.disciplineScore.toFixed(0)}%
            </div>
            <div className="text-[10px] font-mono text-[#786F66] dark:text-[#94A3B8] mt-1 truncate">
              {discipline.cleanTradesCount}/{filteredTrades.length} plan followed
            </div>
          </div>
        </div>

      </div>

      {/* 3. Panel 1: Interactive Equity Curve Chart with Dual Mode Toggle */}
      <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 shadow-2xs transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-[#E7E0D6]/70 dark:border-[#242D3D]">
          <div>
            <h3 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
              Equity curve
            </h3>
            <p className="text-[11px] text-[#786F66] dark:text-[#94A3B8]">
              Account value over time
            </p>
          </div>

          <div className="sm:text-right">
            <div className="text-2xl font-black font-mono text-[#1F1A16] dark:text-[#F0F4F8]">
              {currSymbol}{(initialCapital + netPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={`text-xs font-mono font-bold mt-0.5 ${netPnl >= 0 ? 'text-[#15803D] dark:text-[#34D399]' : 'text-[#DC2626] dark:text-[#F87171]'}`}>
              {netPnl >= 0 ? '+' : '-'}{currSymbol}{Math.abs(netPnl).toFixed(2)} net return
            </div>
          </div>
        </div>

        {/* Mode Toggle Buttons: Equity vs Cumulative P&L */}
        <div className="flex items-center gap-1.5 mt-3">
          <button
            onClick={() => setCurveMode('equity')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              curveMode === 'equity'
                ? 'bg-[#DB9F35] text-white shadow-2xs'
                : 'bg-white dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] text-[#786F66] dark:text-[#94A3B8] hover:text-[#1F1A16]'
            }`}
          >
            Equity
          </button>
          <button
            onClick={() => setCurveMode('cum')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              curveMode === 'cum'
                ? 'bg-[#DB9F35] text-white shadow-2xs'
                : 'bg-white dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] text-[#786F66] dark:text-[#94A3B8] hover:text-[#1F1A16]'
            }`}
          >
            Cumulative P&amp;L
          </button>
        </div>

        {/* Equity Curve SVG Chart */}
        <div className="mt-3 relative">
          <svg className="w-full h-auto block" viewBox={`0 0 ${equitySvgData.W} ${equitySvgData.H}`} role="img" aria-label="Equity chart">
            <defs>
              <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Gridlines & Y-axis labels */}
            {equitySvgData.gridLevels.map((g, i) => (
              <g key={i}>
                <line
                  x1={equitySvgData.L}
                  y1={g.y}
                  x2={equitySvgData.W - equitySvgData.R}
                  y2={g.y}
                  stroke="#E7E0D6"
                  strokeDasharray="3 5"
                  className="dark:stroke-[#202C40]"
                />
                <text
                  x={equitySvgData.L - 8}
                  y={g.y + 3}
                  textAnchor="end"
                  className="fill-[#786F66] dark:fill-[#8290A8] text-[10px] font-mono"
                >
                  {g.label}
                </text>
              </g>
            ))}

            {/* Baseline Reference dashed line (Starting balance / $0) */}
            <line
              x1={equitySvgData.L}
              y1={equitySvgData.baselineY}
              x2={equitySvgData.W - equitySvgData.R}
              y2={equitySvgData.baselineY}
              stroke="#3B82F6"
              strokeDasharray="4 4"
              strokeWidth="1.5"
            />

            {/* Area Fill */}
            <path d={equitySvgData.areaD} fill="url(#equityGradient)" />

            {/* Path Line */}
            <path
              d={equitySvgData.pathD}
              fill="none"
              stroke={curveMode === 'equity' ? '#10B981' : '#3B82F6'}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />

            {/* Interactive Points */}
            {equitySvgData.pointCoords.map((pt, i) => (
              <circle
                key={i}
                cx={pt.x}
                cy={pt.y}
                r={hoveredEquity?.x === pt.x ? 5 : 3}
                fill={curveMode === 'equity' ? '#10B981' : '#3B82F6'}
                stroke="#FFFFFF"
                strokeWidth={hoveredEquity?.x === pt.x ? 2 : 1}
                className="cursor-pointer transition-all hover:r-5"
                onMouseEnter={() =>
                  setHoveredEquity({
                    date: pt.pt.date,
                    value: curveMode === 'equity' ? pt.pt.equity : pt.pt.cumPnl,
                    pnl: pt.pt.pnl,
                    r: pt.pt.r,
                    x: pt.x,
                    y: pt.y,
                  })
                }
                onMouseLeave={() => setHoveredEquity(null)}
              />
            ))}

            {/* X-axis labels */}
            <text x={equitySvgData.L} y={equitySvgData.H - 8} className="fill-[#786F66] dark:fill-[#8290A8] text-[10px] font-mono">
              Start
            </text>
            <text
              x={equitySvgData.W - equitySvgData.R}
              y={equitySvgData.H - 8}
              textAnchor="end"
              className="fill-[#786F66] dark:fill-[#8290A8] text-[10px] font-mono"
            >
              Now
            </text>
          </svg>

          {/* Interactive Hover Tooltip */}
          {hoveredEquity && (
            <div
              className="absolute bg-[#1F1A16] dark:bg-[#0B0F17] text-white px-3 py-1.5 rounded-xl text-[10px] font-mono shadow-xl border border-[#3A322A] dark:border-[#242D3D] pointer-events-none z-20 whitespace-nowrap"
              style={{
                left: `${Math.min(80, Math.max(15, (hoveredEquity.x / equitySvgData.W) * 100))}%`,
                top: `${Math.max(5, (hoveredEquity.y / equitySvgData.H) * 100 - 32)}%`,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <div className="font-bold">{hoveredEquity.date}</div>
              <div className="text-[#34D399]">
                {curveMode === 'equity' ? 'Equity: ' : 'Cum P&L: '}
                {currSymbol}{hoveredEquity.value.toFixed(2)}
              </div>
              {hoveredEquity.pnl !== 0 && (
                <div className="text-[#9E958C]">
                  Trade: {hoveredEquity.pnl >= 0 ? '+' : '-'}{currSymbol}{Math.abs(hoveredEquity.pnl).toFixed(2)} ({hoveredEquity.r >= 0 ? '+' : ''}{hoveredEquity.r.toFixed(1)}R)
                </div>
              )}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-[#786F66] dark:text-[#94A3B8] font-mono mt-3 pt-2 border-t border-[#E7E0D6]/50 dark:border-[#242D3D]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#10B981]" />
            Account equity
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#3B82F6]" />
            Starting balance
          </span>
        </div>
      </div>

      {/* 4. Row 2: Dual Charts (Daily P&L & Monthly Returns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Panel A: Daily P&L */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 shadow-2xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#E7E0D6]/70 dark:border-[#242D3D]">
              <div>
                <h3 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                  Daily P&amp;L
                </h3>
                <p className="text-[11px] text-[#786F66] dark:text-[#94A3B8]">
                  Closed trade results · {currSymbol}
                </p>
              </div>
              <div className="text-xs font-mono font-bold text-[#786F66] dark:text-[#94A3B8]">
                {dailyData.length} trading days
              </div>
            </div>

            <div className="mt-3 relative">
              <svg className="w-full h-auto block" viewBox={`0 0 ${dailySvgData.W} ${dailySvgData.H}`}>
                {/* Gridlines */}
                {dailySvgData.gridLevels.map((g, i) => (
                  <g key={i}>
                    <line
                      x1={dailySvgData.L}
                      y1={g.y}
                      x2={dailySvgData.W - dailySvgData.R}
                      y2={g.y}
                      stroke="#E7E0D6"
                      strokeDasharray="3 5"
                      className="dark:stroke-[#202C40]"
                    />
                    <text
                      x={dailySvgData.L - 6}
                      y={g.y + 3}
                      textAnchor="end"
                      className="fill-[#786F66] dark:fill-[#8290A8] text-[9px] font-mono"
                    >
                      {g.label}
                    </text>
                  </g>
                ))}

                {/* Baseline at y = 0 */}
                <line
                  x1={dailySvgData.L}
                  y1={dailySvgData.baselineY}
                  x2={dailySvgData.W - dailySvgData.R}
                  y2={dailySvgData.baselineY}
                  stroke="#786F66"
                  strokeWidth="1"
                  opacity="0.4"
                />

                {/* Bars */}
                {dailySvgData.bars.map((b, i) => (
                  <rect
                    key={i}
                    x={b.x}
                    y={b.y}
                    width={b.width}
                    height={b.height}
                    rx="2"
                    fill={b.isPositive ? '#10B981' : '#DC2626'}
                    className="cursor-pointer transition-all hover:opacity-80"
                    onMouseEnter={() => setHoveredDaily(b.item)}
                    onMouseLeave={() => setHoveredDaily(null)}
                  />
                ))}

                {/* X-axis labels */}
                {dailySvgData.bars
                  .filter((_, i) => dailySvgData.bars.length <= 8 || i % Math.ceil(dailySvgData.bars.length / 7) === 0)
                  .map((b, i) => (
                    <text
                      key={i}
                      x={b.x + b.width / 2}
                      y={dailySvgData.H - 8}
                      textAnchor="middle"
                      className="fill-[#786F66] dark:fill-[#8290A8] text-[9px] font-mono"
                    >
                      {b.item.label}
                    </text>
                  ))}
              </svg>

              {/* Tooltip */}
              {hoveredDaily && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-[#1F1A16] dark:bg-[#0B0F17] text-white px-2.5 py-1 rounded-lg text-[10px] font-mono shadow-lg border border-[#3A322A] dark:border-[#242D3D] pointer-events-none z-20 whitespace-nowrap">
                  <span>{hoveredDaily.date}: </span>
                  <span className={hoveredDaily.pnl >= 0 ? 'text-[#34D399] font-bold' : 'text-[#F87171] font-bold'}>
                    {hoveredDaily.pnl >= 0 ? '+' : '-'}{currSymbol}{Math.abs(hoveredDaily.pnl).toFixed(2)}
                  </span>
                  <span className="text-[#9E958C] ml-1.5">({hoveredDaily.count} trade{hoveredDaily.count === 1 ? '' : 's'})</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-[#786F66] dark:text-[#94A3B8] font-mono mt-3 pt-2 border-t border-[#E7E0D6]/50 dark:border-[#242D3D]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#10B981]" />
              Profit
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#DC2626]" />
              Loss
            </span>
          </div>
        </div>

        {/* Panel B: Monthly returns */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 shadow-2xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#E7E0D6]/70 dark:border-[#242D3D]">
              <div>
                <h3 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                  Monthly returns
                </h3>
                <p className="text-[11px] text-[#786F66] dark:text-[#94A3B8]">
                  Monthly net performance · {currSymbol}
                </p>
              </div>
            </div>

            <div className="mt-3 relative">
              <svg className="w-full h-auto block" viewBox={`0 0 ${monthlySvgData.W} ${monthlySvgData.H}`}>
                {/* Gridlines */}
                {monthlySvgData.gridLevels.map((g, i) => (
                  <g key={i}>
                    <line
                      x1={monthlySvgData.L}
                      y1={g.y}
                      x2={monthlySvgData.W - monthlySvgData.R}
                      y2={g.y}
                      stroke="#E7E0D6"
                      strokeDasharray="3 5"
                      className="dark:stroke-[#202C40]"
                    />
                    <text
                      x={monthlySvgData.L - 6}
                      y={g.y + 3}
                      textAnchor="end"
                      className="fill-[#786F66] dark:fill-[#8290A8] text-[9px] font-mono"
                    >
                      {g.label}
                    </text>
                  </g>
                ))}

                {/* Baseline at y = 0 */}
                <line
                  x1={monthlySvgData.L}
                  y1={monthlySvgData.baselineY}
                  x2={monthlySvgData.W - monthlySvgData.R}
                  y2={monthlySvgData.baselineY}
                  stroke="#786F66"
                  strokeWidth="1"
                  opacity="0.4"
                />

                {/* Bars */}
                {monthlySvgData.bars.map((b, i) => (
                  <rect
                    key={i}
                    x={b.x}
                    y={b.y}
                    width={b.width}
                    height={b.height}
                    rx="3"
                    fill={b.isPositive ? '#3B82F6' : '#DC2626'}
                    className="cursor-pointer transition-all hover:opacity-80"
                    onMouseEnter={() => setHoveredMonthly(b.item)}
                    onMouseLeave={() => setHoveredMonthly(null)}
                  />
                ))}

                {/* X-axis labels */}
                {monthlySvgData.bars.map((b, i) => (
                  <text
                    key={i}
                    x={b.x + b.width / 2}
                    y={monthlySvgData.H - 8}
                    textAnchor="middle"
                    className="fill-[#786F66] dark:fill-[#8290A8] text-[9px] font-mono"
                  >
                    {b.item.label}
                  </text>
                ))}
              </svg>

              {/* Tooltip */}
              {hoveredMonthly && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-[#1F1A16] dark:bg-[#0B0F17] text-white px-2.5 py-1 rounded-lg text-[10px] font-mono shadow-lg border border-[#3A322A] dark:border-[#242D3D] pointer-events-none z-20 whitespace-nowrap">
                  <span>{hoveredMonthly.label} ({hoveredMonthly.key}): </span>
                  <span className={hoveredMonthly.pnl >= 0 ? 'text-[#34D399] font-bold' : 'text-[#F87171] font-bold'}>
                    {hoveredMonthly.pnl >= 0 ? '+' : '-'}{currSymbol}{Math.abs(hoveredMonthly.pnl).toFixed(2)}
                  </span>
                  <span className="text-[#9E958C] ml-1.5">({hoveredMonthly.count} trades, {hoveredMonthly.winRate.toFixed(0)}% WR)</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-[#786F66] dark:text-[#94A3B8] font-mono mt-3 pt-2 border-t border-[#E7E0D6]/50 dark:border-[#242D3D]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#3B82F6]" />
              Monthly P&amp;L
            </span>
          </div>
        </div>

      </div>

      {/* 5. Row 3: Dual Panels (Drawdown Analysis & Performance Breakdown) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Panel A: Drawdown analysis */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 shadow-2xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#E7E0D6]/70 dark:border-[#242D3D]">
              <div>
                <h3 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                  Drawdown analysis
                </h3>
                <p className="text-[11px] text-[#786F66] dark:text-[#94A3B8]">
                  Decline from previous equity peak
                </p>
              </div>
            </div>

            <div className="mt-3 relative">
              <svg className="w-full h-auto block" viewBox={`0 0 ${drawdownSvgData.W} ${drawdownSvgData.H}`}>
                <defs>
                  <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#DC2626" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="#DC2626" stopOpacity="0.3" />
                  </linearGradient>
                </defs>

                {/* Gridlines */}
                {drawdownSvgData.gridLevels.map((g, i) => (
                  <g key={i}>
                    <line
                      x1={drawdownSvgData.L}
                      y1={g.y}
                      x2={drawdownSvgData.W - drawdownSvgData.R}
                      y2={g.y}
                      stroke="#E7E0D6"
                      strokeDasharray="3 5"
                      className="dark:stroke-[#202C40]"
                    />
                    <text
                      x={drawdownSvgData.L - 6}
                      y={g.y + 3}
                      textAnchor="end"
                      className="fill-[#786F66] dark:fill-[#8290A8] text-[9px] font-mono"
                    >
                      {g.label}
                    </text>
                  </g>
                ))}

                {/* Underwater Area */}
                {drawdownSvgData.areaD && (
                  <path d={drawdownSvgData.areaD} fill="url(#drawdownGradient)" />
                )}

                {/* Underwater Line */}
                <path
                  d={drawdownSvgData.pathD}
                  fill="none"
                  stroke="#DC2626"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />

                {/* Interactive Points */}
                {drawdownSvgData.pts.map((pt, i) => (
                  <circle
                    key={i}
                    cx={drawdownSvgData.getX(i)}
                    cy={drawdownSvgData.getY(pt.ddPct)}
                    r={hoveredDrawdown?.date === pt.date ? 4.5 : 2.5}
                    fill="#DC2626"
                    stroke="#FFFFFF"
                    strokeWidth="1"
                    className="cursor-pointer transition-all hover:r-4"
                    onMouseEnter={() => setHoveredDrawdown(pt)}
                    onMouseLeave={() => setHoveredDrawdown(null)}
                  />
                ))}

                {/* X labels */}
                <text x={drawdownSvgData.L} y={drawdownSvgData.H - 8} className="fill-[#786F66] dark:fill-[#8290A8] text-[9px] font-mono">
                  Peak Start
                </text>
                <text
                  x={drawdownSvgData.W - drawdownSvgData.R}
                  y={drawdownSvgData.H - 8}
                  textAnchor="end"
                  className="fill-[#786F66] dark:fill-[#8290A8] text-[9px] font-mono"
                >
                  Current
                </text>
              </svg>

              {/* Tooltip */}
              {hoveredDrawdown && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-[#1F1A16] dark:bg-[#0B0F17] text-white px-2.5 py-1 rounded-lg text-[10px] font-mono shadow-lg border border-[#3A322A] dark:border-[#242D3D] pointer-events-none z-20 whitespace-nowrap">
                  <span>{hoveredDrawdown.date}: </span>
                  <span className="text-[#F87171] font-bold">-{hoveredDrawdown.ddPct.toFixed(2)}%</span>
                  <span className="text-[#9E958C] ml-1.5">(-{currSymbol}{hoveredDrawdown.ddUsd.toFixed(2)})</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-3 mt-2 border-t border-[#E7E0D6]/50 dark:border-[#242D3D]">
            <span className="text-[#786F66] dark:text-[#94A3B8]">Maximum drawdown</span>
            <b className="text-[#DC2626] dark:text-[#F87171] font-mono">
              -{perf.maxDrawdownPercent.toFixed(2)}% (-{currSymbol}{perf.maxDrawdownUsd.toFixed(2)})
            </b>
          </div>
        </div>

        {/* Panel B: Performance breakdown */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 shadow-2xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#E7E0D6]/70 dark:border-[#242D3D]">
              <div>
                <h3 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                  Performance breakdown
                </h3>
                <p className="text-[11px] text-[#786F66] dark:text-[#94A3B8]">
                  Closed positions in selected market
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 my-4">
              {/* Donut SVG */}
              <div className="w-[124px] h-[124px] shrink-0 relative flex items-center justify-center">
                <svg viewBox="0 0 110 110" width="124" height="124">
                  {/* Base Track (Losses) */}
                  <circle
                    cx="55"
                    cy="55"
                    r={donutRadius}
                    fill="none"
                    stroke="#DC2626"
                    strokeWidth="12"
                    opacity="0.85"
                  />
                  {/* Win Arc */}
                  <circle
                    cx="55"
                    cy="55"
                    r={donutRadius}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="12"
                    strokeDasharray={`${winArcLength} ${donutCircumference - winArcLength}`}
                    transform="rotate(-90 55 55)"
                    strokeLinecap="round"
                  />
                  <text
                    x="55"
                    y="52"
                    fill="currentColor"
                    textAnchor="middle"
                    className="text-lg font-black fill-[#1F1A16] dark:fill-[#F0F4F8]"
                  >
                    {perf.winRate.toFixed(0)}%
                  </text>
                  <text
                    x="55"
                    y="67"
                    fill="#786F66"
                    textAnchor="middle"
                    className="text-[9px] font-bold fill-[#786F66] dark:fill-[#94A3B8]"
                  >
                    WIN RATE
                  </text>
                </svg>
              </div>

              {/* Stats next to Donut */}
              <div className="space-y-2">
                <div>
                  <div className="text-[11px] text-[#786F66] dark:text-[#94A3B8]">
                    Win / loss ratio
                  </div>
                  <div className="text-2xl font-black font-mono text-[#1F1A16] dark:text-[#F0F4F8]">
                    {winLossRatio}
                  </div>
                </div>

                <div className="text-xs space-y-1 font-mono text-[#786F66] dark:text-[#94A3B8]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                    <span>Winners: <b className="text-[#15803D] dark:text-[#34D399]">{winningTrades.length}</b></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
                    <span>Losers: <b className="text-[#DC2626] dark:text-[#F87171]">{losingTrades.length}</b></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#DB9F35]" />
                    <span>Breakeven: <b className="text-[#DB9F35]">{beTrades.length}</b></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-[#E7E0D6]/60 dark:border-[#242D3D] text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#786F66] dark:text-[#94A3B8]">Avg. win</span>
              <b className="text-[#15803D] dark:text-[#34D399] font-mono">
                +{currSymbol}{avgWin.toFixed(2)}
              </b>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#786F66] dark:text-[#94A3B8]">Avg. loss</span>
              <b className="text-[#DC2626] dark:text-[#F87171] font-mono">
                -{currSymbol}{avgLoss.toFixed(2)}
              </b>
            </div>
          </div>
        </div>

      </div>

      {/* 6. Panel 4: Trade History Table with Pagination & Filter */}
      <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 shadow-2xs transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E7E0D6]/70 dark:border-[#242D3D]">
          <div>
            <h3 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
              Trade history
            </h3>
            <p className="text-[11px] text-[#786F66] dark:text-[#94A3B8]">
              Closed positions in selected period &amp; market
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={tableResultFilter}
              onChange={(e) => {
                setTableResultFilter(e.target.value as 'All' | 'Win' | 'Loss');
                setTablePage(0);
              }}
              className="bg-white dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] rounded-xl px-3 py-1.5 text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8] focus:border-[#DB9F35] outline-none shadow-2xs cursor-pointer"
            >
              <option value="All">All outcomes</option>
              <option value="Win">Winners</option>
              <option value="Loss">Losers</option>
            </select>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto mt-2">
          {paginatedTrades.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#786F66] dark:text-[#94A3B8] italic">
              No closed trades found matching this filter criteria.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap font-mono">
              <thead>
                <tr className="border-b border-[#E7E0D6] dark:border-[#242D3D] text-[10px] text-[#786F66] dark:text-[#94A3B8] uppercase">
                  <th className="py-2.5 px-3">INSTRUMENT</th>
                  <th className="py-2.5 px-3">MARKET</th>
                  <th className="py-2.5 px-3">ENTRY</th>
                  <th className="py-2.5 px-3">EXIT</th>
                  <th className="py-2.5 px-3">SIZE</th>
                  <th className="py-2.5 px-3">RESULT</th>
                  <th className="py-2.5 px-3 text-right">NET P&amp;L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E0D6]/40 dark:divide-[#242D3D]">
                {paginatedTrades.map((t, idx) => {
                  const mkt = getMarketForPair(t.pair);
                  const isWin = t.pnl > 0.001;
                  const isLoss = t.pnl < -0.001;

                  return (
                    <tr key={idx} className="hover:bg-[#F2ECE0]/60 dark:hover:bg-[#1C2331]/60 transition-colors">
                      <td className="py-3 px-3 font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                        {t.pair}
                        <span className="block text-[9px] font-normal text-[#786F66] dark:text-[#94A3B8]">
                          {t.date} {t.time || ''}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E7E0D6]/60 dark:bg-[#1E293B] text-[#786F66] dark:text-[#94A3B8]">
                          {mkt}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#1F1A16] dark:text-[#F0F4F8]">
                        {t.entryPrice != null ? t.entryPrice.toFixed(2) : '-'}
                      </td>
                      <td className="py-3 px-3 text-[#1F1A16] dark:text-[#F0F4F8]">
                        {t.tpPrice != null ? t.tpPrice.toFixed(2) : t.slPrice != null ? t.slPrice.toFixed(2) : '-'}
                      </td>
                      <td className="py-3 px-3 text-[#786F66] dark:text-[#94A3B8]">
                        {t.lotSize || 1}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isWin
                              ? 'bg-[#E8F8EE] dark:bg-[#132A1C] text-[#15803D] dark:text-[#34D399]'
                              : isLoss
                              ? 'bg-[#FEECEB] dark:bg-[#321B1B] text-[#DC2626] dark:text-[#F87171]'
                              : 'bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35]'
                          }`}
                        >
                          {isWin ? 'WIN' : isLoss ? 'LOSS' : 'BE'}
                        </span>
                      </td>
                      <td className={`py-3 px-3 text-right font-bold ${
                        isWin ? 'text-[#15803D] dark:text-[#34D399]' : isLoss ? 'text-[#DC2626] dark:text-[#F87171]' : 'text-[#DB9F35]'
                      }`}>
                        {t.pnl >= 0 ? '+' : '-'}{currSymbol}{Math.abs(t.pnl).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 mt-2 border-t border-[#E7E0D6]/60 dark:border-[#242D3D] text-xs">
          <span className="text-[#786F66] dark:text-[#94A3B8] font-mono">
            Showing {visibleTableTrades.length ? currentPage * pageSize + 1 : 0}–{Math.min((currentPage + 1) * pageSize, visibleTableTrades.length)} of {visibleTableTrades.length} trades · Page {currentPage + 1}/{totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTablePage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E7E0D6] dark:border-[#242D3D] bg-white dark:bg-[#1A2230] text-[#1F1A16] dark:text-[#F0F4F8] hover:bg-[#F2ECE0] dark:hover:bg-[#1C2331] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-bold shadow-2xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <button
              onClick={() => setTablePage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E7E0D6] dark:border-[#242D3D] bg-white dark:bg-[#1A2230] text-[#1F1A16] dark:text-[#F0F4F8] hover:bg-[#F2ECE0] dark:hover:bg-[#1C2331] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-bold shadow-2xs"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 7. Deep-Dive Performance Tables (3 Columns: Setup, Emotion, HTF Context) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Table 1: Performance by Setup */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 shadow-2xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/70 dark:border-[#242D3D]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">Performance by Setup</h3>
                  <p className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">Find your highest-expectancy models</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              {setupStats.length === 0 ? (
                <p className="text-xs text-[#786F66] dark:text-[#94A3B8] italic text-center py-4">No setup data logged yet.</p>
              ) : (
                setupStats.map((s) => (
                  <div key={s.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#1F1A16] dark:text-[#F0F4F8]">{s.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-[#786F66] dark:text-[#94A3B8] font-mono">{s.count} trades ({s.winRate.toFixed(0)}%)</span>
                        <span className={`font-bold font-mono text-xs ${s.pnl >= 0 ? 'text-[#15803D] dark:text-[#34D399]' : 'text-[#DC2626] dark:text-[#F87171]'}`}>
                          {s.pnl >= 0 ? '+' : '-'}{currSymbol}{Math.abs(s.pnl).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    {/* Visual bar */}
                    <div className="w-full bg-[#FAF7F2] dark:bg-[#1A2230] h-2 rounded-full overflow-hidden flex border border-[#E7E0D6]/60 dark:border-[#283244]">
                      <div
                        className={`h-full rounded-full transition-all ${s.totalR >= 0 ? 'bg-[#16A34A]' : 'bg-[#DC2626]'}`}
                        style={{ width: `${Math.min(100, (Math.abs(s.totalR) / maxSetupR) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Table 2: Performance by Emotion */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 shadow-2xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/70 dark:border-[#242D3D]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center">
                  <Brain className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">Performance by Emotion</h3>
                  <p className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">Psychological state impact on P&amp;L</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              {emotionStats.length === 0 ? (
                <p className="text-xs text-[#786F66] dark:text-[#94A3B8] italic text-center py-4">No emotion data logged yet.</p>
              ) : (
                emotionStats.map((e) => (
                  <div key={e.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          e.name === 'CALM' || e.name === 'FOCUSED' ? 'bg-[#16A34A]' : 'bg-[#DC2626]'
                        }`} />
                        <span className="font-bold text-[#1F1A16] dark:text-[#F0F4F8]">{e.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-[#786F66] dark:text-[#94A3B8] font-mono">{e.count} trades</span>
                        <span className={`font-bold font-mono text-xs ${e.pnl >= 0 ? 'text-[#15803D] dark:text-[#34D399]' : 'text-[#DC2626] dark:text-[#F87171]'}`}>
                          {e.pnl >= 0 ? '+' : '-'}{currSymbol}{Math.abs(e.pnl).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    {/* Visual bar */}
                    <div className="w-full bg-[#FAF7F2] dark:bg-[#1A2230] h-2 rounded-full overflow-hidden flex border border-[#E7E0D6]/60 dark:border-[#283244]">
                      <div
                        className={`h-full rounded-full transition-all ${e.totalR >= 0 ? 'bg-[#16A34A]' : 'bg-[#DC2626]'}`}
                        style={{ width: `${Math.min(100, (Math.abs(e.totalR) / maxEmotionR) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Table 3: Performance by HTF Context */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 shadow-2xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/70 dark:border-[#242D3D]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35] flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">Performance by HTF Context</h3>
                  <p className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">Higher timeframe alignment</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              {htfStats.length === 0 ? (
                <p className="text-xs text-[#786F66] dark:text-[#94A3B8] italic text-center py-4">No HTF data logged yet.</p>
              ) : (
                htfStats.map((h) => (
                  <div key={h.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#1F1A16] dark:text-[#F0F4F8]">{h.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-[#786F66] dark:text-[#94A3B8] font-mono">{h.count} trades ({h.winRate.toFixed(0)}%)</span>
                        <span className={`font-bold font-mono text-xs ${h.pnl >= 0 ? 'text-[#15803D] dark:text-[#34D399]' : 'text-[#DC2626] dark:text-[#F87171]'}`}>
                          {h.pnl >= 0 ? '+' : '-'}{currSymbol}{Math.abs(h.pnl).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    {/* Visual bar */}
                    <div className="w-full bg-[#FAF7F2] dark:bg-[#1A2230] h-2 rounded-full overflow-hidden flex border border-[#E7E0D6]/60 dark:border-[#283244]">
                      <div
                        className={`h-full rounded-full transition-all ${h.totalR >= 0 ? 'bg-[#16A34A]' : 'bg-[#DC2626]'}`}
                        style={{ width: `${Math.min(100, (Math.abs(h.totalR) / maxHtfR) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* 8. Bottom Row: Exit Type Analysis & Behavioral Rule Engine Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Card 1: Exit Type Analysis */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 shadow-2xs transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/70 dark:border-[#242D3D]">
            <h3 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">Exit Type Analysis</h3>
            <span className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">Execution discipline</span>
          </div>

          <div className="space-y-3 mt-3">
            {exitStats.length === 0 ? (
              <p className="text-xs text-[#786F66] dark:text-[#94A3B8] italic text-center py-4">No exit type data logged yet.</p>
            ) : (
              exitStats.map((ex) => (
                <div key={ex.name} className="flex items-center justify-between text-xs py-1 border-b border-[#FAF7F2] dark:border-[#1E2638]">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      ex.name === 'TARGET' || ex.name === 'TP'
                        ? 'bg-[#E8F8EE] dark:bg-[#132A1C] text-[#15803D] dark:text-[#34D399]'
                        : ex.name === 'STOP_LOSS' || ex.name === 'SL'
                        ? 'bg-[#FEECEB] dark:bg-[#321B1B] text-[#DC2626] dark:text-[#F87171]'
                        : 'bg-[#FAF2E6] dark:bg-[#1C2331] text-[#DB9F35]'
                    }`}>
                      {ex.name}
                    </span>
                    <span className="text-[#786F66] dark:text-[#94A3B8] text-[11px] font-mono">{ex.count} trades</span>
                  </div>
                  <div className="text-right">
                    <span className={`font-bold font-mono text-xs ${ex.pnl >= 0 ? 'text-[#15803D] dark:text-[#34D399]' : 'text-[#DC2626] dark:text-[#F87171]'}`}>
                      {ex.pnl >= 0 ? '+' : '-'}{currSymbol}{Math.abs(ex.pnl).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-[#786F66] dark:text-[#94A3B8] font-mono ml-2">
                      ({ex.totalR >= 0 ? '+' : ''}{ex.totalR.toFixed(1)}R)
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card 2: Biggest Behavioral Insights */}
        <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 shadow-2xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]/70 dark:border-[#242D3D]">
              <h3 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">Biggest Insights</h3>
              <span className="text-[10px] text-[#DB9F35] font-bold">Rule Engine</span>
            </div>

            <div className="space-y-3 mt-3">
              {/* FOMO leak */}
              <div className="p-2.5 rounded-xl bg-[#FEECEB]/60 dark:bg-[#2D1616]/40 border border-[#FBC5C2] dark:border-[#4B1E1E] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-[#DC2626] text-white flex items-center justify-center text-[10px] font-black">
                    !
                  </span>
                  <div>
                    <span className="text-xs font-bold text-[#DC2626] dark:text-[#F87171] block">FOMO &amp; Impatience</span>
                    <span className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">{fomoTrades.length} emotional entries</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold font-mono text-[#DC2626] dark:text-[#F87171] block">
                    -{currSymbol}{Math.abs(fomoPnl).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-[#DC2626] dark:text-[#F87171] font-mono">
                    {fomoR.toFixed(1)}R
                  </span>
                </div>
              </div>

              {/* Clean Execution */}
              <div className="p-2.5 rounded-xl bg-[#E8F8EE]/60 dark:bg-[#132A1C]/40 border border-[#B9DFC8] dark:border-[#1E432A] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-[#16A34A] text-white flex items-center justify-center text-[10px] font-black">
                    ✓
                  </span>
                  <div>
                    <span className="text-xs font-bold text-[#15803D] dark:text-[#34D399] block">Clean Rule Adherence</span>
                    <span className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">{cleanTrades.length} plan-followed trades</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold font-mono text-[#15803D] dark:text-[#34D399] block">
                    +{currSymbol}{cleanPnl.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-[#15803D] dark:text-[#34D399] font-mono">
                    +{cleanR.toFixed(1)}R
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 p-3 rounded-xl bg-[#FAF7F2] dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] text-xs text-[#786F66] dark:text-[#94A3B8]">
            💡 <b>Core Takeaway:</b> Following your trading rules produces 100% of your profitability. Eliminating FOMO stops account drawdowns.
          </div>
        </div>

      </div>

    </div>
  );
};

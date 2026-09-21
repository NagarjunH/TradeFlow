import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Check, 
  Calculator, 
  Image as ImageIcon, 
  Trash2, 
  Lock, 
  ShieldAlert,
  Loader2,
  AlertCircle,
  Upload
} from 'lucide-react';
import { 
  type Trade, 
  type ExitType, 
  type TradeQuality, 
  type EmotionType, 
  type ViolationType, 
  type AppSettings 
} from '../db/db';
import { tradesApi } from '../lib/api/tradesApi';
import { auditApi } from '../lib/api/auditApi';
import { RiskCalculatorModal } from './RiskCalculatorModal';
import { getDayStatus } from '../utils/TradingEngine';

interface QuickTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  trades: Trade[];
  settings: AppSettings;
  onTradeSaved: () => void;
  editTrade?: Trade | null;
  userId?: string;
  onTradesChange?: React.Dispatch<React.SetStateAction<Trade[]>>;
}

export const QuickTradeModal: React.FC<QuickTradeModalProps> = ({
  isOpen,
  onClose,
  trades,
  settings,
  onTradeSaved,
  editTrade,
  userId,
  onTradesChange,
}) => {
  const [showRiskCalc, setShowRiskCalc] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(todayStr);
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [pair, setPair] = useState('XAU/USD');
  const [order, setOrder] = useState<'BUY' | 'SELL'>('BUY');
  const [lotSize, setLotSize] = useState<number>(settings.defaultLot || 0.01);
  const [entryPrice, setEntryPrice] = useState<string>('');
  const [slPrice, setSlPrice] = useState<string>('');
  const [tpPrice, setTpPrice] = useState<string>('');
  
  const [rMultiple, setRMultiple] = useState<number>(1.5);
  const [pnl, setPnl] = useState<string>('15.00');
  const [pips, setPips] = useState<string>('');

  const [exitType, setExitType] = useState<ExitType>('TARGET');
  const [execution, setExecution] = useState<'CLEAN' | 'VIOLATION'>('CLEAN');
  const [violationReason, setViolationReason] = useState<ViolationType>('None');
  const [emotion, setEmotion] = useState<EmotionType>('CALM');

  const [setupType, setSetupType] = useState<string>('MSS + FVG');
  const [htfContext, setHtfContext] = useState<'Bullish' | 'Bearish' | 'Neutral'>('Bullish');
  const [entryReason, setEntryReason] = useState<string>('');
  const [session, setSession] = useState<'London' | 'New York' | 'Asian' | 'London/NY Overlap'>('London/NY Overlap');

  const [chartScreenshot, setChartScreenshot] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const dropZoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dayStatus = getDayStatus(date, trades, settings);
  const isLockedOut = dayStatus.status === 'LOCKED' && !editTrade;
  const isHardLock = settings.protectionMode === 'HARD_LOCK';

  const processImageFile = (file: File | Blob) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawData = event.target?.result as string;
      if (rawData) {
        // Compress pasted/uploaded TradingView screenshot (max 1280px, quality 0.75 JPEG)
        const img = new Image();
        img.onload = () => {
          const maxWidth = 1280;
          let w = img.width;
          let h = img.height;
          if (w > maxWidth) {
            h = Math.round((h * maxWidth) / w);
            w = maxWidth;
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            setChartScreenshot(canvas.toDataURL('image/jpeg', 0.75));
          } else {
            setChartScreenshot(rawData);
          }
        };
        img.onerror = () => setChartScreenshot(rawData);
        img.src = rawData;
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (editTrade) {
      setDate(editTrade.date);
      setTime(editTrade.time || '12:00');
      setPair(editTrade.pair);
      setOrder(editTrade.order);
      setLotSize(editTrade.lotSize);
      setEntryPrice(editTrade.entryPrice?.toString() || '');
      setSlPrice(editTrade.slPrice?.toString() || '');
      setTpPrice(editTrade.tpPrice?.toString() || '');
      setRMultiple(editTrade.rMultiple);
      setPnl(editTrade.pnl.toString());
      setPips(editTrade.pips?.toString() || '');
      setExitType(editTrade.exitType);
      setExecution(editTrade.execution);
      setViolationReason(editTrade.violationReason || 'None');
      setEmotion(editTrade.emotion);
      setSetupType(editTrade.setupType || 'MSS + FVG');
      setHtfContext(editTrade.htfContext || 'Bullish');
      setEntryReason(editTrade.notes || editTrade.entryReason || '');
      setSession(editTrade.session || 'London/NY Overlap');
      setChartScreenshot(editTrade.chartScreenshot || '');
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setTime(new Date().toTimeString().slice(0, 5));
      setPair(settings.defaultPair || 'XAU/USD');
      setOrder('BUY');
      setLotSize(settings.defaultLot || 0.01);
      setRMultiple(1.5);
      setPnl('15.00');
      setExitType('TARGET');
      setExecution('CLEAN');
      setViolationReason('None');
      setEmotion('CALM');
      setEntryReason('');
      setChartScreenshot('');
    }
  }, [editTrade, isOpen, settings]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            processImageFile(blob);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleQuickR = (r: number) => {
    setRMultiple(r);
    const riskAmount = (settings.currentBalance * (settings.riskPerTradePercent || 1)) / 100;
    const estPnl = (r * riskAmount).toFixed(2);
    setPnl(estPnl);

    if (r <= -0.8) {
      setExitType('STOP_LOSS');
    } else if (r === 0) {
      setExitType('BREAKEVEN');
    } else if (r >= 1) {
      setExitType('TARGET');
    }
  };

  const handleApplyRiskCalc = (calculatedLot: number, entry: number, sl: number) => {
    setLotSize(calculatedLot);
    setEntryPrice(entry.toString());
    setSlPrice(sl.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      if (!userId) {
        throw new Error('Authentication required. Please refresh or sign in again.');
      }

      if (isLockedOut && isHardLock) {
        throw new Error('Daily Loss Limit is locked (-2R). Hard constraint active. Trade entry blocked.');
      }

      if (isLockedOut && !isHardLock && !overrideReason.trim()) {
        throw new Error('You must provide an override reason to log a trade while in daily loss lockout.');
      }

      const tradeQuality: TradeQuality = 
        execution === 'CLEAN' 
          ? 'CLEAN' 
          : (violationReason === 'Moved SL' || violationReason === 'Over-risk' || violationReason === 'Revenge')
            ? 'VIOLATION'
            : 'MANAGEABLE_MISTAKE';

      const numPnl = parseFloat(pnl) || 0;
      const validNumbers = trades
        .map((t) => Number(t.tradeNumber))
        .filter((n) => !isNaN(n) && isFinite(n));
      const nextTradeNumber = editTrade 
        ? editTrade.tradeNumber 
        : (validNumbers.length > 0 ? Math.max(...validNumbers) + 1 : 1);

      const tradeData: Omit<Trade, 'id'> = {
        tradeNumber: nextTradeNumber,
        date,
        time,
        pair: pair || 'XAU/USD',
        order,
        lotSize: Number(lotSize) || 0.01,
        entryPrice: entryPrice ? parseFloat(entryPrice) : undefined,
        slPrice: slPrice ? parseFloat(slPrice) : undefined,
        tpPrice: tpPrice ? parseFloat(tpPrice) : undefined,
        pnl: numPnl,
        rMultiple: Number(rMultiple) || 0,
        pips: pips ? parseFloat(pips) : undefined,
        exitType,
        tradeQuality,
        emotion,
        execution,
        violationReason: execution === 'VIOLATION' ? violationReason : 'None',
        setupType,
        htfContext,
        entryReason: entryReason.trim(),
        notes: entryReason.trim(),
        session,
        chartScreenshot: chartScreenshot || undefined,
        createdAt: editTrade ? editTrade.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editTrade && (editTrade as Trade & { _uuid?: string })._uuid) {
        const uuid = (editTrade as Trade & { _uuid?: string })._uuid!;
        await tradesApi.update(uuid, tradeData);
        onTradesChange?.((prev) => prev.map((t) => ((t as Trade & { _uuid?: string })._uuid === uuid || t.id === editTrade.id) ? { ...t, ...tradeData } : t));
        await auditApi.add(
          userId,
          'UPDATE',
          `Edited trade #${editTrade.tradeNumber}. New PnL: ${numPnl}, Quality: ${tradeQuality}`,
          uuid
        );
      } else {
        const created = await tradesApi.create(tradeData, userId);
        const createdUuid = (created as Trade & { _uuid?: string })._uuid;
        onTradesChange?.((prev) => [...prev.filter((t) => t.id !== created.id), created]);
        if (isLockedOut && overrideReason) {
          await auditApi.add(
            userId,
            'OVERRIDE_LOCK',
            `Logged trade beyond daily loss limit. Reason: "${overrideReason}"`,
            createdUuid
          );
        } else {
          await auditApi.add(
            userId,
            'CREATE',
            `Created trade #${nextTradeNumber} (${order} ${pair} ${rMultiple}R)`,
            createdUuid
          );
        }
      }

      onTradeSaved();
      onClose();
    } catch (err: unknown) {
      console.error('[QuickTradeModal] Submit error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to record trade. Please try again.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-fade-in">
        <div 
          className="relative max-w-2xl w-full bg-white dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl overflow-hidden shadow-2xl my-auto text-[#1F1A16] dark:text-[#F0F4F8] transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E0D6] dark:border-[#242D3D] bg-[#FAF7F2] dark:bg-[#1A2230]">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
              <h2 className="text-base font-bold text-[#1F1A16] dark:text-[#F0F4F8] tracking-wide flex items-center gap-2">
                {editTrade ? `Edit Trade #${editTrade.tradeNumber}` : '+ Quick Trade Entry'}
                <span className="text-xs px-2 py-0.5 rounded-md bg-[#10B981]/15 border border-[#10B981]/30 text-[#059669] dark:text-[#34D399] font-mono font-semibold">
                  Fast Logger
                </span>
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#786F66] hover:text-[#1F1A16] dark:text-[#94A3B8] dark:hover:text-white hover:bg-[#F3EDE2] dark:hover:bg-[#252E40] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Warning / Lock Banner */}
          {isLockedOut && (
            <div className={`px-6 py-3 border-b flex items-center gap-3 ${
              isHardLock ? 'bg-[#FEECEB] border-[#FBC5C2] text-[#B91C1C]' : 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
            }`}>
              <Lock className="w-5 h-5 text-[#DC2626] shrink-0" />
              <div className="text-xs flex-1">
                <span className="font-bold block text-sm">
                  {isHardLock ? '🛑 HARD LOCK ACTIVE: Daily Loss Limit Hit (-2R)' : '⚠️ SOFT WARNING: Daily Loss Limit Hit'}
                </span>
                <span>
                  {isHardLock 
                    ? 'Discipline rule forbids trading after hitting the daily stop. Close charts for today.'
                    : 'Trading beyond this point violates your plan. If overriding, state your reason below.'}
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {/* Row 1: Pair & BUY/SELL & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#786F66] uppercase tracking-wider mb-1.5">Pair</label>
                <div className="flex gap-1.5">
                  {['XAU/USD', 'EUR/USD', 'GBP/USD'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPair(p)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        pair === p
                          ? 'bg-[#DB9F35] text-[#1F1A16] border-[#DB9F35] shadow-xs'
                          : 'bg-[#FAF7F2] text-[#786F66] border-[#E7E0D6] hover:text-[#1F1A16]'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#786F66] uppercase tracking-wider mb-1.5">Direction</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOrder('BUY')}
                    className={`py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 ${
                      order === 'BUY'
                        ? 'bg-[#16A34A] text-white border-[#16A34A] shadow-xs'
                        : 'bg-[#E8F8EE] text-[#15803D] border-[#B7ECC8] hover:bg-[#D8F3E2]'
                    }`}
                  >
                    BUY 🟢
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrder('SELL')}
                    className={`py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 ${
                      order === 'SELL'
                        ? 'bg-[#DC2626] text-white border-[#DC2626] shadow-xs'
                        : 'bg-[#FEECEB] text-[#B91C1C] border-[#FBC5C2] hover:bg-[#FCD8D5]'
                    }`}
                  >
                    SELL 🔴
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#786F66] uppercase tracking-wider mb-1.5">Date & Time</label>
                <div className="flex gap-1.5">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="flex-1 bg-[#FAF7F2] border border-[#E7E0D6] rounded-xl px-2.5 py-1.5 text-xs text-[#1F1A16] focus:border-[#DB9F35] outline-none"
                  />
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-20 bg-[#FAF7F2] border border-[#E7E0D6] rounded-xl px-2 py-1.5 text-xs text-[#1F1A16] focus:border-[#DB9F35] outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Lot Size & Risk Calculator */}
            <div className="bg-[#FAF7F2] border border-[#E7E0D6] rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#786F66] uppercase tracking-wider">
                  Position Size (Lots)
                </span>
                <button
                  type="button"
                  onClick={() => setShowRiskCalc(true)}
                  className="text-xs text-[#9B671B] hover:text-[#1F1A16] font-semibold flex items-center gap-1 transition-colors"
                >
                  <Calculator className="w-3.5 h-3.5 text-[#DB9F35]" />
                  Auto-Calculate by SL
                </button>
              </div>

              <div className="flex items-center gap-2">
                {[0.01, 0.02, 0.05, 0.10, 0.20].map((lot) => (
                  <button
                    key={lot}
                    type="button"
                    onClick={() => setLotSize(lot)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all ${
                      lotSize === lot
                        ? 'bg-[#DB9F35] text-[#1F1A16] border-[#DB9F35]'
                        : 'bg-white text-[#786F66] border-[#E7E0D6] hover:text-[#1F1A16]'
                    }`}
                  >
                    {lot}
                  </button>
                ))}
                <input
                  type="number"
                  step="0.01"
                  value={lotSize}
                  onChange={(e) => setLotSize(parseFloat(e.target.value) || 0.01)}
                  className="w-16 px-2 py-1.5 bg-white border border-[#E7E0D6] rounded-xl text-xs font-mono text-center text-[#1F1A16] focus:border-[#DB9F35] outline-none"
                />
              </div>
            </div>

            {/* Row 3: Result (Quick R Pills) */}
            <div className="bg-[#FAF7F2] border border-[#E7E0D6] rounded-xl p-3.5 space-y-3">
              <label className="block text-xs font-semibold text-[#786F66] uppercase tracking-wider">
                Trade Result (1-Click R-Multiple)
              </label>

              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                {[-1.0, -0.5, 0, 1.0, 1.5, 2.0, 3.0].map((r) => {
                  const isNegative = r < 0;
                  const isZero = r === 0;
                  const isSelected = rMultiple === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleQuickR(r)}
                      className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                        isSelected
                          ? isNegative
                            ? 'bg-[#DC2626] text-white border-[#DC2626] shadow-xs'
                            : isZero
                            ? 'bg-[#786F66] text-white border-[#786F66]'
                            : 'bg-[#16A34A] text-white border-[#16A34A] shadow-xs'
                          : 'bg-white text-[#786F66] border-[#E7E0D6] hover:text-[#1F1A16]'
                      }`}
                    >
                      {r > 0 ? `+${r}R` : isZero ? 'BE (0R)' : `${r}R`}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E7E0D6]">
                <div>
                  <label className="block text-[11px] text-[#786F66] mb-1">
                    Net P&L ({settings.currency === 'USD' ? '$' : '₹'})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={pnl}
                    onChange={(e) => setPnl(e.target.value)}
                    className={`w-full px-3 py-1.5 bg-white border border-[#E7E0D6] rounded-xl text-xs font-mono font-bold focus:border-[#DB9F35] outline-none ${
                      parseFloat(pnl) >= 0 ? 'text-[#15803D]' : 'text-[#DC2626]'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#786F66] mb-1">Pips Captured (Optional)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={pips}
                    onChange={(e) => setPips(e.target.value)}
                    placeholder="+25.4"
                    className="w-full px-3 py-1.5 bg-white border border-[#E7E0D6] rounded-xl text-xs font-mono text-[#1F1A16] focus:border-[#DB9F35] outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Row 4: Exit Type & Emotion */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#786F66] uppercase tracking-wider mb-1.5">
                  Exit Type
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'TARGET', label: '🎯 TARGET' },
                    { id: 'STOP_LOSS', label: '🛑 STOP LOSS' },
                    { id: 'MANUAL_EXIT', label: '✋ MANUAL' },
                    { id: 'BREAKEVEN', label: '🔄 BREAKEVEN' },
                  ].map((ex) => (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => setExitType(ex.id as ExitType)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-medium border text-center transition-colors ${
                        exitType === ex.id
                          ? 'bg-[#E8F8EE] text-[#15803D] border-[#B7ECC8] font-bold'
                          : 'bg-[#FAF7F2] text-[#786F66] border-[#E7E0D6] hover:text-[#1F1A16]'
                      }`}
                    >
                      {ex.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#786F66] uppercase tracking-wider mb-1.5">
                  Emotion at Entry
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {['CALM', 'FOCUSED', 'FOMO', 'REVENGE', 'GREED', 'HESITANT'].map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => {
                        setEmotion(em as EmotionType);
                        if (em === 'FOMO' || em === 'REVENGE') {
                          setExecution('VIOLATION');
                          setViolationReason(em === 'FOMO' ? 'FOMO' : 'Revenge');
                        }
                      }}
                      className={`py-1.5 px-1.5 rounded-xl text-[11px] font-semibold border text-center transition-colors ${
                        emotion === em
                          ? em === 'CALM' || em === 'FOCUSED'
                            ? 'bg-[#E8F8EE] text-[#15803D] border-[#B7ECC8]'
                            : 'bg-[#FEECEB] text-[#B91C1C] border-[#FBC5C2]'
                          : 'bg-[#FAF7F2] text-[#786F66] border-[#E7E0D6] hover:text-[#1F1A16]'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 5: Clean vs Violation */}
            <div className={`p-4 rounded-xl border transition-all ${
              execution === 'CLEAN'
                ? 'bg-[#E8F8EE] border-[#B7ECC8]'
                : 'bg-[#FEECEB] border-[#FBC5C2]'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#1F1A16] flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-[#DB9F35]" />
                  Execution Discipline Audit
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setExecution('CLEAN');
                      setViolationReason('None');
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                      execution === 'CLEAN'
                        ? 'bg-[#16A34A] text-white border-[#16A34A]'
                        : 'bg-white text-[#786F66] border-[#E7E0D6]'
                    }`}
                  >
                    ✓ Clean Execution
                  </button>
                  <button
                    type="button"
                    onClick={() => setExecution('VIOLATION')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                      execution === 'VIOLATION'
                        ? 'bg-[#DC2626] text-white border-[#DC2626]'
                        : 'bg-white text-[#786F66] border-[#E7E0D6]'
                    }`}
                  >
                    ⚠ Rule Violation
                  </button>
                </div>
              </div>

              {execution === 'VIOLATION' && (
                <div className="mt-3 pt-3 border-t border-[#FBC5C2] space-y-2">
                  <span className="text-xs text-[#DC2626] font-semibold block">What rule was broken?</span>
                  <div className="flex flex-wrap gap-1.5">
                    {['FOMO', 'Moved SL', 'Revenge', 'No Setup', 'Over-risk', 'Chased Price', 'Impulsive Exit'].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setViolationReason(r as ViolationType)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                          violationReason === r
                            ? 'bg-[#DC2626] text-white border-[#DC2626]'
                            : 'bg-white text-[#DC2626] border-[#FBC5C2] hover:bg-[#FEECEB]'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Row 6: Setup & Context */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#786F66] uppercase mb-1">Setup Type</label>
                <select
                  value={setupType}
                  onChange={(e) => setSetupType(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#E7E0D6] rounded-xl px-2.5 py-1.5 text-xs text-[#1F1A16] focus:border-[#DB9F35] outline-none"
                >
                  <option value="MSS + FVG">MSS + FVG</option>
                  <option value="Liquidity Sweep">Liquidity Sweep</option>
                  <option value="Order Block Tap">Order Block Tap</option>
                  <option value="Turtle Soup">Turtle Soup</option>
                  <option value="Range Breakout">Range Breakout</option>
                  <option value="Chased Move">Chased Move (Invalid)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#786F66] uppercase mb-1">HTF Context</label>
                <select
                  value={htfContext}
                  onChange={(e) => setHtfContext(e.target.value as any)}
                  className="w-full bg-[#FAF7F2] border border-[#E7E0D6] rounded-xl px-2.5 py-1.5 text-xs text-[#1F1A16] focus:border-[#DB9F35] outline-none"
                >
                  <option value="Bullish">Bullish</option>
                  <option value="Bearish">Bearish</option>
                  <option value="Neutral">Neutral</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#786F66] uppercase mb-1">Session</label>
                <select
                  value={session}
                  onChange={(e) => setSession(e.target.value as any)}
                  className="w-full bg-[#FAF7F2] border border-[#E7E0D6] rounded-xl px-2.5 py-1.5 text-xs text-[#1F1A16] focus:border-[#DB9F35] outline-none"
                >
                  <option value="London/NY Overlap">London/NY Overlap</option>
                  <option value="London">London</option>
                  <option value="New York">New York</option>
                  <option value="Asian">Asian</option>
                </select>
              </div>
            </div>

            {/* Row 7: Manual Trade Notes */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8] uppercase tracking-wider">
                  Trade Notes (Manual Notes)
                </label>
                <span className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">Entry reasoning, plan execution or observations</span>
              </div>
              <textarea
                rows={2}
                value={entryReason}
                onChange={(e) => setEntryReason(e.target.value)}
                placeholder="Write your trade notes manually here (e.g. Clean 15m MSS retest on London open, followed plan, TP hit cleanly)..."
                className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-[#1C2331] border border-[#E7E0D6] dark:border-[#2E384D] rounded-xl text-xs text-[#1F1A16] dark:text-[#F0F4F8] focus:border-[#DB9F35] outline-none transition-colors resize-y placeholder:text-[#9E958C]"
              />
            </div>

            {/* Row 8: Chart Screenshot (Upload / Paste / Drop) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider">
                  Chart Screenshot (TradingView)
                </label>
                <span className="text-[10px] text-[#9E958C]">Ctrl+V paste, drag &amp; drop, or browse</span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) processImageFile(file);
                }}
              />

              <div 
                ref={dropZoneRef}
                onClick={() => !chartScreenshot && fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) processImageFile(file);
                }}
                className={`border-2 border-dashed rounded-xl p-3 text-center transition-all ${
                  chartScreenshot 
                    ? 'border-[#DB9F35] bg-[#F0E5D3]/40 dark:bg-[#1A2230]' 
                    : 'border-[#E7E0D6] dark:border-[#2E384D] bg-[#FAF7F2] dark:bg-[#131822] hover:border-[#DB9F35] cursor-pointer'
                }`}
              >
                {chartScreenshot ? (
                  <div className="relative inline-block group">
                    <img
                      src={chartScreenshot}
                      alt="Trade Chart"
                      className="max-h-36 rounded-xl border border-[#E7E0D6] dark:border-[#2E384D] mx-auto shadow-xs"
                    />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="p-1.5 bg-white dark:bg-[#1C2331] text-[#786F66] dark:text-[#94A3B8] hover:text-[#DB9F35] rounded-lg border border-[#E7E0D6] dark:border-[#2E384D] transition-colors shadow-xs cursor-pointer"
                        title="Replace Screenshot"
                      >
                        <Upload className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setChartScreenshot('');
                        }}
                        className="p-1.5 bg-white dark:bg-[#1C2331] text-[#DC2626] hover:bg-[#DC2626] hover:text-white rounded-lg border border-[#FBC5C2] dark:border-[#521C1C] transition-colors shadow-xs cursor-pointer"
                        title="Remove Screenshot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-2.5 space-y-1">
                    <div className="flex justify-center text-[#DB9F35]">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-[#1F1A16] dark:text-[#F0F4F8] font-medium">
                      Press <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-[#1C2331] border border-[#E7E0D6] dark:border-[#2E384D] text-[#DB9F35] font-mono shadow-2xs">Ctrl + V</kbd> to paste or <span className="text-[#DB9F35] underline font-bold">click to browse</span>
                    </p>
                    <p className="text-[11px] text-[#786F66] dark:text-[#94A3B8]">
                      Supports PNG, JPG, TradingView screenshots, and file drop
                    </p>
                  </div>
                )}
              </div>
            </div>

            {isLockedOut && !isHardLock && (
              <div className="p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl space-y-2">
                <label className="block text-xs font-bold text-[#92400E]">
                  Required: Override Reason (Logged in Audit Trail)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Why are you taking this trade after daily loss limit?"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-[#FDE68A] rounded-xl text-xs text-[#1F1A16] focus:border-[#DB9F35] outline-none"
                />
              </div>
            )}

            {submitError && (
              <div className="p-3 bg-[#FEECEB] dark:bg-[#2A1616] border border-[#FBC5C2] dark:border-[#521C1C] text-[#B91C1C] dark:text-[#F87171] rounded-xl text-xs flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="flex-1 font-medium">{submitError}</span>
              </div>
            )}

            <div className="pt-3 border-t border-[#E7E0D6] dark:border-[#242D3D] flex items-center justify-between">
              <span className="text-[11px] text-[#786F66] dark:text-[#94A3B8]">
                Target: 5–10s rapid journaling
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#FAF7F2] dark:bg-[#1A2230] hover:bg-[#F3EDE2] dark:hover:bg-[#252E40] text-[#786F66] hover:text-[#1F1A16] dark:text-[#94A3B8] dark:hover:text-white text-xs font-semibold border border-[#E7E0D6] dark:border-[#283244] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || (isLockedOut && isHardLock)}
                  className={`px-6 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                    isSubmitting || (isLockedOut && isHardLock)
                      ? 'bg-[#E7E0D6] dark:bg-[#242D3D] text-[#9E958C] dark:text-[#64748B] cursor-not-allowed'
                      : 'bg-[#DB9F35] hover:bg-[#CCA030] text-[#1F1A16] hover:scale-[1.02]'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editTrade ? 'Save Changes' : 'Record Trade'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <RiskCalculatorModal
        isOpen={showRiskCalc}
        onClose={() => setShowRiskCalc(false)}
        currentBalance={settings.currentBalance}
        currency={settings.currency}
        onApply={handleApplyRiskCalc}
      />
    </>
  );
};

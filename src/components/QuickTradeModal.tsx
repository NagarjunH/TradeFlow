import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Check, 
  Calculator, 
  Image as ImageIcon, 
  Trash2, 
  Lock, 
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
  initialDate?: string;
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
  initialDate,
}) => {
  const [showRiskCalc, setShowRiskCalc] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(initialDate || todayStr);
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [pair, setPair] = useState('XAU/USD');
  const [order, setOrder] = useState<'BUY' | 'SELL'>('BUY');
  const [lotSize, setLotSize] = useState<number>(settings.defaultLot || 0.01);
  const [entryPrice, setEntryPrice] = useState<string>('');
  const [slPrice, setSlPrice] = useState<string>('');
  const [tpPrice, setTpPrice] = useState<string>('');
  
  const [rMultiple, setRMultiple] = useState<number>(0);
  const [riskReward, setRiskReward] = useState<string>('');
  const [pnl, setPnl] = useState<string>('');

  const [exitType, setExitType] = useState<ExitType>('MANUAL_EXIT');
  const [tradeSuccessRate, setTradeSuccessRate] = useState<string>('');
  const [exitReason, setExitReason] = useState<string>('');
  const [execution, setExecution] = useState<'CLEAN' | 'VIOLATION'>('CLEAN');
  const [violationReason, setViolationReason] = useState<ViolationType>('None');
  const [emotion, setEmotion] = useState<EmotionType>('FOCUSED');

  const [setupType, setSetupType] = useState<string>('');
  const [htfContext, setHtfContext] = useState<string>('');
  const [entryReason, setEntryReason] = useState<string>('');
  const [session, setSession] = useState<'Tokyo' | 'London' | 'New York' | 'London/NY Overlap' | string>('Tokyo');

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
      setRMultiple(editTrade.rMultiple ?? 0);
      setRiskReward(editTrade.riskReward || (editTrade.rMultiple ? `1:${Math.abs(editTrade.rMultiple)}` : ''));
      setPnl(editTrade.pnl != null ? editTrade.pnl.toString() : '');
      setExitType(editTrade.exitType || 'MANUAL_EXIT');
      setTradeSuccessRate(editTrade.tradeSuccessRate || '');
      setExitReason(editTrade.exitReason || editTrade.notes || '');
      setExecution(editTrade.execution || 'CLEAN');
      setViolationReason(editTrade.violationReason || 'None');
      setEmotion(editTrade.emotion || 'FOCUSED');
      setSetupType(editTrade.setupType || '');
      setHtfContext(editTrade.htfContext || '');
      setEntryReason(editTrade.entryReason || '');
      setSession(editTrade.session === 'Asian' ? 'Tokyo' : (editTrade.session || 'Tokyo'));
      setChartScreenshot(editTrade.chartScreenshot || '');
    } else {
      setDate(initialDate || new Date().toISOString().split('T')[0]);
      setTime(new Date().toTimeString().slice(0, 5));
      setPair(settings.defaultPair || 'XAU/USD');
      setOrder('BUY');
      setLotSize(settings.defaultLot || 0.01);
      setRMultiple(0);
      setRiskReward('');
      setPnl('');
      setExitType('MANUAL_EXIT');
      setTradeSuccessRate('');
      setExitReason('');
      setExecution('CLEAN');
      setViolationReason('None');
      setEmotion('FOCUSED');
      setSetupType('');
      setHtfContext('');
      setEntryReason('');
      setSession('Tokyo');
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
      const effectiveUserId = userId || '00000000-0000-0000-0000-000000000000';

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

      let finalExitType: ExitType = exitType;
      if (tradeSuccessRate === 'TARGET' || tradeSuccessRate === 'Target Hit') finalExitType = 'TARGET';
      else if (tradeSuccessRate === 'Stop Loss' || tradeSuccessRate === 'Stop Loss Hit') finalExitType = 'STOP_LOSS';
      else if (tradeSuccessRate === 'Breakeven') finalExitType = 'BREAKEVEN';
      else if (tradeSuccessRate) finalExitType = 'MANUAL_EXIT';

      const tradeData: Omit<Trade, 'id'> = {
        tradeNumber: nextTradeNumber,
        date,
        time: time || new Date().toTimeString().slice(0, 5),
        pair: pair || 'XAU/USD',
        order,
        lotSize: Number(lotSize) || 0.01,
        entryPrice: entryPrice ? parseFloat(entryPrice) : undefined,
        slPrice: slPrice ? parseFloat(slPrice) : undefined,
        tpPrice: tpPrice ? parseFloat(tpPrice) : undefined,
        pnl: numPnl,
        rMultiple: Number(rMultiple) || 0,
        riskReward: riskReward.trim() || (rMultiple !== 0 ? `1:${Math.abs(rMultiple)}` : undefined),
        pips: undefined,
        exitType: finalExitType,
        tradeSuccessRate: tradeSuccessRate || undefined,
        exitReason: exitReason.trim() || undefined,
        tradeQuality,
        emotion,
        execution,
        violationReason: execution === 'VIOLATION' ? violationReason : 'None',
        setupType,
        htfContext,
        entryReason: entryReason.trim() || undefined,
        notes: exitReason.trim() || entryReason.trim() || undefined,
        session,
        chartScreenshot: chartScreenshot || undefined,
        createdAt: editTrade ? editTrade.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editTrade && (editTrade as Trade & { _uuid?: string })._uuid) {
        const uuid = (editTrade as Trade & { _uuid?: string })._uuid!;
        await tradesApi.update(uuid, tradeData);
        onTradesChange?.((prev) => prev.map((t) => ((t as Trade & { _uuid?: string })._uuid === uuid || t.id === editTrade.id) ? { ...t, ...tradeData } : t));
        if (userId) {
          await auditApi.add(
            userId,
            'UPDATE',
            `Edited trade #${editTrade.tradeNumber}. New PnL: ${numPnl}, Quality: ${tradeQuality}`,
            uuid
          );
        }
      } else {
        const created = await tradesApi.create(tradeData, effectiveUserId);
        const createdUuid = (created as Trade & { _uuid?: string })._uuid;
        onTradesChange?.((prev) => [...prev.filter((t) => t.id !== created.id), created]);
        if (userId) {
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
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-start">
              {/* Pair: 5 columns */}
              <div className="sm:col-span-5 min-w-0">
                <label className="block text-xs font-semibold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider mb-1.5">
                  Pair
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {['XAU/USD', 'EUR/USD', 'GBP/USD'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPair(p)}
                      className={`py-2 px-1 rounded-xl text-[11px] sm:text-xs font-bold border transition-all text-center truncate cursor-pointer ${
                        pair === p
                          ? 'bg-[#DB9F35] text-[#1F1A16] border-[#DB9F35] shadow-xs'
                          : 'bg-[#FAF7F2] dark:bg-[#1A2230] text-[#786F66] dark:text-[#94A3B8] border-[#E7E0D6] dark:border-[#2E384D] hover:text-[#1F1A16] dark:hover:text-[#F0F4F8]'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Direction: 3 columns */}
              <div className="sm:col-span-3 min-w-0">
                <label className="block text-xs font-semibold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider mb-1.5">
                  Direction
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setOrder('BUY')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      order === 'BUY'
                        ? 'bg-[#16A34A] text-white border-[#16A34A] shadow-xs'
                        : 'bg-[#E8F8EE] dark:bg-[#152E20] text-[#15803D] dark:text-[#4ADE80] border-[#B7ECC8] dark:border-[#1E4D30] hover:bg-[#D8F3E2] dark:hover:bg-[#1A3828]'
                    }`}
                  >
                    BUY 🟢
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrder('SELL')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      order === 'SELL'
                        ? 'bg-[#DC2626] text-white border-[#DC2626] shadow-xs'
                        : 'bg-[#FEECEB] dark:bg-[#331818] text-[#B91C1C] dark:text-[#F87171] border-[#FBC5C2] dark:border-[#522020] hover:bg-[#FCD8D5] dark:hover:bg-[#401E1E]'
                    }`}
                  >
                    SELL 🔴
                  </button>
                </div>
              </div>

              {/* Date: 4 columns */}
              <div className="sm:col-span-4 min-w-0">
                <label className="block text-xs font-semibold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[#FAF7F2] dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#2E384D] rounded-xl px-3 py-2 text-xs text-[#1F1A16] dark:text-[#F0F4F8] focus:border-[#DB9F35] outline-none [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>
            </div>

            {/* Row 2: Lot Size & Risk Calculator */}
            <div className="bg-[#FAF7F2] dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#2E384D] rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider">
                  Position Size (Lots)
                </span>
                <button
                  type="button"
                  onClick={() => setShowRiskCalc(true)}
                  className="text-xs text-[#9B671B] dark:text-[#E5A93C] hover:text-[#1F1A16] dark:hover:text-white font-semibold flex items-center gap-1 transition-colors cursor-pointer"
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
                    className={`flex-1 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                      lotSize === lot
                        ? 'bg-[#DB9F35] text-[#1F1A16] border-[#DB9F35]'
                        : 'bg-white dark:bg-[#131822] text-[#786F66] dark:text-[#94A3B8] border-[#E7E0D6] dark:border-[#2E384D] hover:text-[#1F1A16] dark:hover:text-[#F0F4F8]'
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
                  className="w-16 px-2 py-1.5 bg-white dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#2E384D] rounded-xl text-xs font-mono text-center text-[#1F1A16] dark:text-[#F0F4F8] focus:border-[#DB9F35] outline-none"
                />
              </div>
            </div>

            {/* Row 3: P/L & Risk:Reward */}
            <div className="bg-[#FAF7F2] dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#2E384D] rounded-xl p-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#786F66] dark:text-[#94A3B8] uppercase mb-1">
                    Net P&L ({settings.currency === 'USD' ? '$' : '₹'})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={pnl}
                    onChange={(e) => setPnl(e.target.value)}
                    placeholder="0.00"
                    className={`w-full px-3 py-2 bg-white dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#2E384D] rounded-xl text-xs font-mono font-bold focus:border-[#DB9F35] outline-none ${
                      !pnl 
                        ? 'text-[#1F1A16] dark:text-[#F0F4F8]' 
                        : parseFloat(pnl) >= 0 
                          ? 'text-[#15803D] dark:text-[#4ADE80]' 
                          : 'text-[#DC2626] dark:text-[#F87171]'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#786F66] dark:text-[#94A3B8] uppercase mb-1">
                    Risk:Reward
                  </label>
                  <input
                    type="text"
                    value={riskReward}
                    onChange={(e) => setRiskReward(e.target.value)}
                    placeholder="e.g. 1:2"
                    className="w-full px-3 py-2 bg-white dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#2E384D] rounded-xl text-xs font-mono text-[#1F1A16] dark:text-[#F0F4F8] focus:border-[#DB9F35] outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Row 4: Trade Success Rate & Emotions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider mb-1.5">
                  TRADE SUCCESS RATE (Outcome)
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { 
                      id: 'Scalping Trade', 
                      label: 'Scalping Trade', 
                      activeClass: 'bg-[#FCE7F3] dark:bg-[#3D1429] text-[#BE185D] dark:text-[#F472B6] border-[#F472B6] dark:border-[#831843] font-bold shadow-xs',
                      inactiveHover: 'hover:text-[#BE185D] dark:hover:text-[#F472B6]'
                    },
                    { 
                      id: 'Exit Before Target', 
                      label: 'Exit Before Target', 
                      activeClass: 'bg-[#F3F4F6] dark:bg-[#28303F] text-[#374151] dark:text-[#E5E7EB] border-[#9CA3AF] dark:border-[#4B5563] font-bold shadow-xs',
                      inactiveHover: 'hover:text-[#374151] dark:hover:text-[#E5E7EB]'
                    },
                    { 
                      id: 'Exit Before SL', 
                      label: 'Exit Before SL', 
                      activeClass: 'bg-[#FEF3C7] dark:bg-[#3E2E16] text-[#92400E] dark:text-[#FCD34D] border-[#F59E0B] dark:border-[#78350F] font-bold shadow-xs',
                      inactiveHover: 'hover:text-[#92400E] dark:hover:text-[#FCD34D]'
                    },
                    { 
                      id: 'Stop Loss', 
                      label: 'Stop Loss', 
                      activeClass: 'bg-[#FEE2E2] dark:bg-[#3D1D1D] text-[#B91C1C] dark:text-[#F87171] border-[#EF4444] dark:border-[#7F1D1D] font-bold shadow-xs',
                      inactiveHover: 'hover:text-[#B91C1C] dark:hover:text-[#F87171]'
                    },
                    { 
                      id: 'TARGET', 
                      label: 'TARGET', 
                      activeClass: 'bg-[#DCFCE7] dark:bg-[#143823] text-[#15803D] dark:text-[#4ADE80] border-[#22C55E] dark:border-[#14532D] font-bold shadow-xs',
                      inactiveHover: 'hover:text-[#15803D] dark:hover:text-[#4ADE80]'
                    },
                    { 
                      id: 'MANUAL EXIT', 
                      label: 'MANUAL EXIT', 
                      activeClass: 'bg-[#DBEAFE] dark:bg-[#172E54] text-[#1D4ED8] dark:text-[#93C5FD] border-[#3B82F6] dark:border-[#1E3A8A] font-bold shadow-xs',
                      inactiveHover: 'hover:text-[#1D4ED8] dark:hover:text-[#93C5FD]'
                    },
                  ].map((ex) => (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => {
                        setTradeSuccessRate(ex.id);
                        if (ex.id === 'TARGET') setExitType('TARGET');
                        else if (ex.id === 'Stop Loss') setExitType('STOP_LOSS');
                        else setExitType('MANUAL_EXIT');
                      }}
                      className={`py-2 px-2 rounded-xl text-[11px] font-semibold border text-center transition-all cursor-pointer truncate ${
                        tradeSuccessRate === ex.id
                          ? ex.activeClass
                          : `bg-[#FAF7F2] dark:bg-[#1A2230] text-[#786F66] dark:text-[#94A3B8] border-[#E7E0D6] dark:border-[#2E384D] ${ex.inactiveHover}`
                      }`}
                    >
                      {ex.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider mb-1.5">
                  Emotions
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {['FOCUSED', 'CALM', 'FOMO', 'REVENGE', 'GREED', 'HESITANT', 'BOREDOM'].map((em) => (
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
                      className={`py-1.5 px-1.5 rounded-xl text-[10px] font-semibold border text-center transition-colors uppercase ${
                        emotion === em
                          ? em === 'CALM' || em === 'FOCUSED'
                            ? 'bg-[#E0EFFE] dark:bg-[#1A3152] text-[#1D4ED8] dark:text-[#93C5FD] border-[#B9D9FE]'
                            : 'bg-[#FEECEB] dark:bg-[#3D1D1D] text-[#B91C1C] dark:text-[#F87171] border-[#FBC5C2]'
                          : 'bg-[#FAF7F2] dark:bg-[#1A2230] text-[#786F66] dark:text-[#94A3B8] border-[#E7E0D6] dark:border-[#2E384D] hover:text-[#1F1A16]'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 5: Exit Reason */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8] uppercase tracking-wider">
                  Exit Reason
                </label>
                <span className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">Why did you close or exit this trade?</span>
              </div>
              <input
                type="text"
                value={exitReason}
                onChange={(e) => setExitReason(e.target.value)}
                placeholder="e.g. Strong Resistance was there and Candle closed weak, or Exit mindset, Should wait"
                className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-[#1C2331] border border-[#E7E0D6] dark:border-[#2E384D] rounded-xl text-xs text-[#1F1A16] dark:text-[#F0F4F8] focus:border-[#DB9F35] outline-none transition-colors placeholder:text-[#9E958C]"
              />
            </div>

            {/* Row 6: Setup Type & Session */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#786F66] dark:text-[#94A3B8] uppercase mb-1">
                  Setup Type
                </label>
                <input
                  type="text"
                  value={setupType}
                  onChange={(e) => setSetupType(e.target.value)}
                  placeholder="Type your setup name (e.g. FVG Retest, MSS, Breakout...)"
                  className="w-full bg-[#FAF7F2] dark:bg-[#1C2331] border border-[#E7E0D6] dark:border-[#2E384D] rounded-xl px-2.5 py-1.5 text-xs text-[#1F1A16] dark:text-[#F0F4F8] focus:border-[#DB9F35] outline-none placeholder:text-[#9E958C]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#786F66] dark:text-[#94A3B8] uppercase mb-1">
                  Session
                </label>
                <select
                  value={session}
                  onChange={(e) => setSession(e.target.value)}
                  className="w-full bg-[#FAF7F2] dark:bg-[#1C2331] border border-[#E7E0D6] dark:border-[#2E384D] rounded-xl px-2.5 py-1.5 text-xs text-[#1F1A16] dark:text-[#F0F4F8] focus:border-[#DB9F35] outline-none font-semibold cursor-pointer"
                >
                  <optgroup label="Major Sessions">
                    <option value="Tokyo">Tokyo (Asian)</option>
                    <option value="London">London (European)</option>
                    <option value="New York">New York (US)</option>
                    <option value="Sydney">Sydney (Pacific)</option>
                  </optgroup>
                  <optgroup label="Session Overlaps">
                    <option value="London/NY Overlap">London / New York Overlap (High Volume)</option>
                    <option value="Asian/London Overlap">Asian / London Overlap (Tokyo / London)</option>
                    <option value="Sydney/Tokyo Overlap">Sydney / Tokyo Overlap (Pacific / Asian)</option>
                    <option value="NY/Asian Overlap">New York / Asian Overlap</option>
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Row 7: HTF Context */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8] uppercase tracking-wider">
                  HTF Context
                </label>
                <span className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">Higher Timeframe narrative</span>
              </div>
              <textarea
                rows={2}
                value={htfContext}
                onChange={(e) => setHtfContext(e.target.value)}
                placeholder="1. Bearish on 1H, 4H 2. Bullish on 15m, 5m"
                className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-[#1C2331] border border-[#E7E0D6] dark:border-[#2E384D] rounded-xl text-xs text-[#1F1A16] dark:text-[#F0F4F8] focus:border-[#DB9F35] outline-none transition-colors resize-y placeholder:text-[#9E958C]"
              />
            </div>

            {/* Row 8: Entry Reason */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8] uppercase tracking-wider">
                  Entry Reason
                </label>
                <span className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">Why was the trigger pulled?</span>
              </div>
              <textarea
                rows={2}
                value={entryReason}
                onChange={(e) => setEntryReason(e.target.value)}
                placeholder="e.g. On Support and Pullback of HTF Support, or Entry on Liquidity Sweep"
                className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-[#1C2331] border border-[#E7E0D6] dark:border-[#2E384D] rounded-xl text-xs text-[#1F1A16] dark:text-[#F0F4F8] focus:border-[#DB9F35] outline-none transition-colors resize-y placeholder:text-[#9E958C]"
              />
            </div>

            {/* Row 8: Chart Screenshot (Upload / Paste / Drop) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider">
                  Vantage P/L Images / Screenshot
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
              <div className="p-3 bg-[#FFFBEB] dark:bg-[#2A2315] border border-[#FDE68A] dark:border-[#4D3A18] rounded-xl space-y-2">
                <label className="block text-xs font-bold text-[#92400E] dark:text-[#FBBF24]">
                  Required: Override Reason (Logged in Audit Trail)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Why are you taking this trade after daily loss limit?"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-[#1C2331] border border-[#FDE68A] dark:border-[#4D3A18] rounded-xl text-xs text-[#1F1A16] dark:text-[#F0F4F8] focus:border-[#DB9F35] outline-none"
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

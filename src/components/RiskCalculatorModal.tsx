import React, { useState } from 'react';
import { Calculator, X, Check, ShieldAlert } from 'lucide-react';
import { calculateXauusdPositionSize } from '../utils/TradingEngine';

interface RiskCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  currency: string;
  onApply: (lotSize: number, entry: number, sl: number) => void;
}

export const RiskCalculatorModal: React.FC<RiskCalculatorModalProps> = ({
  isOpen,
  onClose,
  currentBalance,
  currency,
  onApply,
}) => {
  const [balance, setBalance] = useState<number>(currentBalance || 1000);
  const [riskPercent, setRiskPercent] = useState<number>(1.0);
  const [entryPrice, setEntryPrice] = useState<number>(2650.0);
  const [slPrice, setSlPrice] = useState<number>(2647.0);

  if (!isOpen) return null;

  const result = calculateXauusdPositionSize(balance, riskPercent, entryPrice, slPrice);

  const handleApply = () => {
    onApply(result.lotSize, entryPrice, slPrice);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div 
        className="max-w-md w-full bg-white border border-[#E7E0D6] rounded-2xl overflow-hidden shadow-2xl text-[#1F1A16]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E7E0D6] bg-[#FAF7F2]">
          <div className="flex items-center gap-2 text-[#DB9F35]">
            <Calculator className="w-5 h-5" />
            <h3 className="text-base font-bold text-[#1F1A16]">XAU/USD Risk & Lot Calculator</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#786F66] hover:text-[#1F1A16] hover:bg-[#F3EDE2] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inputs */}
        <div className="p-5 space-y-4 text-sm text-[#1F1A16]">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#786F66] mb-1">Account Balance</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-[#786F66]">{currency === 'USD' ? '$' : '₹'}</span>
                <input
                  type="number"
                  value={balance}
                  onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
                  className="w-full pl-7 pr-3 py-1.5 bg-[#FAF7F2] border border-[#E7E0D6] rounded-xl text-[#1F1A16] focus:border-[#DB9F35] outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#786F66] mb-1">Risk Per Trade</label>
              <div className="flex gap-1">
                {[0.5, 1.0, 1.5, 2.0].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setRiskPercent(pct)}
                    className={`flex-1 py-1.5 text-xs rounded-xl font-medium border transition-colors ${
                      riskPercent === pct
                        ? 'bg-[#DB9F35] text-[#1F1A16] border-[#DB9F35] font-bold'
                        : 'bg-[#FAF7F2] text-[#786F66] border-[#E7E0D6] hover:text-[#1F1A16]'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#786F66] mb-1">Entry Price</label>
              <input
                type="number"
                step="0.1"
                value={entryPrice}
                onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                placeholder="2650.00"
                className="w-full px-3 py-1.5 bg-[#FAF7F2] border border-[#E7E0D6] rounded-xl text-[#1F1A16] focus:border-[#DB9F35] outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#786F66] mb-1">Stop Loss (SL)</label>
              <input
                type="number"
                step="0.1"
                value={slPrice}
                onChange={(e) => setSlPrice(parseFloat(e.target.value) || 0)}
                placeholder="2647.00"
                className="w-full px-3 py-1.5 bg-[#FAF7F2] border border-[#E7E0D6] rounded-xl text-[#1F1A16] focus:border-[#DB9F35] outline-none font-mono"
              />
            </div>
          </div>

          {/* Results Box */}
          <div className="bg-[#FAF7F2] border border-[#E7E0D6] rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center text-xs text-[#786F66]">
              <span>Risk Amount ({riskPercent}%):</span>
              <span className="font-bold text-[#1F1A16]">
                {currency === 'USD' ? '$' : '₹'}{result.riskAmountUsd.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs text-[#786F66]">
              <span>SL Distance:</span>
              <span className="font-mono text-[#1F1A16]">{result.stopLossDistancePips} points (${Math.abs(entryPrice - slPrice).toFixed(2)})</span>
            </div>
            <div className="pt-2 border-t border-[#E7E0D6] flex justify-between items-center">
              <div>
                <span className="text-xs text-[#786F66] block">Calculated Position Size</span>
                <span className="text-2xl font-black text-[#16A34A]">{result.lotSize} <span className="text-xs font-normal text-[#786F66]">Lots</span></span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-[#786F66] block">Est. Comm & Slippage</span>
                <span className="text-xs text-[#786F66]">~${result.estimatedCommission}</span>
              </div>
            </div>
          </div>

          {riskPercent > 1.5 && (
            <div className="p-2.5 rounded-xl bg-[#FEECEB] border border-[#FBC5C2] flex items-center gap-2 text-xs text-[#DC2626]">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Rule Warning: Max recommended per-trade risk is 0.5% - 1.0%.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#E7E0D6] bg-[#FAF7F2] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white hover:bg-[#F3EDE2] text-[#786F66] hover:text-[#1F1A16] text-xs font-medium border border-[#E7E0D6] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-4 py-2 rounded-xl bg-[#DB9F35] hover:bg-[#CCA030] text-[#1F1A16] text-xs font-extrabold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Check className="w-4 h-4" />
            Apply Lot Size ({result.lotSize})
          </button>
        </div>
      </div>
    </div>
  );
};

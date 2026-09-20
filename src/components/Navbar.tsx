import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  BookOpen, 
  ShieldCheck, 
  CalendarDays, 
  Settings as SettingsIcon, 
  Plus, 
  Lock, 
  CheckCircle2, 
  AlertTriangle,
  Quote,
  Radio
} from 'lucide-react';
import type { DayStatus } from '../utils/TradingEngine';
import type { AppSettings } from '../db/db';

export type TabType = 'dashboard' | 'journal' | 'rules' | 'cycle' | 'analytics' | 'settings';

interface NavbarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  dayStatus: DayStatus;
  settings?: AppSettings;
  isDayClosedToday: boolean;
  onOpenQuickTrade: () => void;
  onOpenDailyClose: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  dayStatus,
  isDayClosedToday,
  onOpenQuickTrade,
  onOpenDailyClose,
}) => {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'dashboard' as TabType, label: 'Performance Dashboard', icon: BarChart3 },
    { id: 'journal' as TabType, label: 'Trading Journal & Ledger', icon: BookOpen },
    { id: 'rules' as TabType, label: 'Trading Rules & Engine', icon: ShieldCheck },
    { id: 'cycle' as TabType, label: '31-Day Trading Cycle', icon: CalendarDays },
    { id: 'settings' as TabType, label: 'Settings & Risk Config', icon: SettingsIcon },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#E5E7EB] shadow-xs transition-all">
      {/* 1. Main Top Header Bar (Matching NH QUANT Screenshot) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand */}
          <div 
            onClick={() => onTabChange('dashboard')}
            className="cursor-pointer flex items-center gap-3 shrink-0"
          >
            {/* NH TRADERS honey gold badge */}
            <div className="w-10 h-10 rounded-xl bg-[#F0E5D3] border border-[#E2D1B8] flex items-center justify-center font-mono font-black text-[#DB9F35] text-base tracking-tighter shadow-xs">
              NH
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-tight text-[#1F1A16]">
                  NH
                </span>
                <span className="text-lg font-black tracking-tight text-[#DB9F35]">
                  TRADERS
                </span>
                <span className="text-xs text-[#786F66] hidden lg:inline font-normal">
                  — Discipline Today • Profits Tomorrow
                </span>
                <span className="w-2 h-2 rounded-full bg-[#DB9F35] inline-block animate-pulse ml-1" />
              </div>
            </div>
          </div>

          {/* Center Quote Pill (Matching Jesse Livermore Quote in Screenshot) */}
          <div className="hidden xl:flex items-center gap-2 bg-[#F0E5D3]/60 border border-[#E2D1B8] px-3.5 py-1.5 rounded-full text-xs text-[#1F1A16]">
            <Quote className="w-3.5 h-3.5 text-[#DB9F35] shrink-0" />
            <span>
              "Cut your losses quickly and let your winners run." —{' '}
              <strong className="text-[#DB9F35]">Jesse Livermore</strong>
            </span>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Live Circuit Breaker Status */}
            {isDayClosedToday ? (
              <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#E8F8EE] border border-[#B7ECC8] text-[#15803D]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                Day Closed
              </span>
            ) : dayStatus.status === 'LOCKED' ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#FEECEB] border border-[#FBC5C2] text-[#B91C1C] animate-pulse">
                <Lock className="w-3.5 h-3.5" />
                🛑 Locked (-2R)
              </span>
            ) : dayStatus.status === 'WARNING' ? (
              <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFFBEB] border border-[#FDE68A] text-[#9B671B]">
                <AlertTriangle className="w-3.5 h-3.5" />
                Caution ({dayStatus.remainingR}R)
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#F0E5D3] border border-[#E2D1B8] text-[#9B671B]">
                <Radio className="w-3 h-3 text-[#DB9F35] animate-pulse" />
                Active ({dayStatus.remainingR}R Risk)
              </span>
            )}

            <button
              onClick={onOpenDailyClose}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#F3EDE2] text-[#1F1A16] text-xs font-medium border border-[#E7E0D6] transition-colors hidden sm:flex items-center gap-1.5 shadow-2xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>Close Day</span>
            </button>

            <button
              onClick={onOpenQuickTrade}
              className="px-4 py-1.5 rounded-xl bg-[#DB9F35] hover:bg-[#CCA030] text-[#1F1A16] text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-all hover:scale-102"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Quick Trade</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Secondary Nav Tab Strip */}
      <div className="border-t border-[#E7E0D6] bg-[#FAF7F2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-6 overflow-x-auto text-xs py-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-2 py-2.5 font-semibold transition-all border-b-2 whitespace-nowrap ${
                    isActive
                      ? 'border-[#DB9F35] text-[#1F1A16] font-bold'
                      : 'border-transparent text-[#786F66] hover:text-[#1F1A16] hover:border-[#E2D1B8]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#DB9F35]' : 'text-[#9E958C]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* 3. Ticker / Market Bar (Matching NH QUANT Lower Bar) */}
      <div className="border-t border-[#E5E7EB] bg-white py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs gap-4">
          <div className="flex items-center gap-3">
            {/* Session Pill */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]">
              <span className="w-2 h-2 rounded-full bg-[#D97706]" />
              SMC DISCIPLINE SYSTEM
            </span>
            <span className="font-mono text-[#6B7280] text-xs font-semibold hidden sm:inline">
              {timeStr}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
              SPOT BENCHMARK: XAU/USD
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

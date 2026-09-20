import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Calendar as CalendarIcon, 
  Sun, 
  Bell, 
  Plus, 
  ChevronDown,
  LogOut
} from 'lucide-react';
import type { DayStatus } from '../utils/TradingEngine';
import { DatePickerDropdown } from './DatePickerDropdown';

interface TopHeaderProps {
  currentDate?: string;
  onDateChange?: (newDate: string) => void;
  dayStatus?: DayStatus;
  isDayClosedToday?: boolean;
  onOpenQuickTrade: () => void;
  onOpenDailyClose?: () => void;
  userEmail?: string;
  onSignOut?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentDate = '2026-10-05',
  onDateChange,
  onOpenQuickTrade,
  userEmail,
  onSignOut,
}) => {
  const [timeStr, setTimeStr] = useState('07:18 PM');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Live time ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format YYYY-MM-DD into "Mon, 05 Oct 2026"
  const formatDateDisplay = (isoDate: string) => {
    try {
      const parts = isoDate.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const dt = new Date(y, m, d);
        return dt.toLocaleDateString('en-US', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      }
      return isoDate;
    } catch {
      return isoDate;
    }
  };

  const userInitial = userEmail ? userEmail[0].toUpperCase() : 'N';

  return (
    <div className="bg-[#FAF7F2] border-b border-[#E7E0D6] sticky top-0 z-30">
      {/* 1. Upper Header Bar */}
      <div className="px-6 py-3 flex items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#9E958C] absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search trades, pairs, notes, setups..."
            className="w-full pl-10 pr-12 py-1.5 bg-white border border-[#E7E0D6] rounded-xl text-xs text-[#1F1A16] placeholder-[#9E958C] focus:border-[#DB9F35] outline-none shadow-2xs"
          />
          <kbd className="absolute right-2.5 top-2 px-1.5 py-0.5 rounded bg-[#F6F1EA] border border-[#E7E0D6] text-[10px] font-mono text-[#786F66]">
            ⌘ K
          </kbd>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Interactive Date & Time Dropdown Badge */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsPickerOpen(!isPickerOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-[#FAF6EE] border border-[#E7E0D6] hover:border-[#DB9F35] rounded-xl text-xs text-[#1F1A16] font-medium shadow-2xs transition-all cursor-pointer group"
              title="Click to change active date"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-[#DB9F35] group-hover:scale-110 transition-transform" />
              <span className="font-semibold">{formatDateDisplay(currentDate)}</span>
              <span className="text-[#9E958C]">|</span>
              <span className="font-mono text-[#786F66]">{timeStr}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-[#9E958C] transition-transform ${isPickerOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Calendar Popover */}
            <DatePickerDropdown
              currentDate={currentDate}
              onSelectDate={(newDate) => {
                onDateChange?.(newDate);
              }}
              isOpen={isPickerOpen}
              onClose={() => setIsPickerOpen(false)}
              align="right"
            />
          </div>

          {/* Sun / Theme icon */}
          <button 
            className="w-8 h-8 rounded-xl bg-white border border-[#E7E0D6] flex items-center justify-center text-[#786F66] hover:text-[#1F1A16] shadow-2xs transition-colors"
            title="Theme: Light"
          >
            <Sun className="w-4 h-4" />
          </button>

          {/* Bell Icon with badge */}
          <div className="relative">
            <button 
              className="w-8 h-8 rounded-xl bg-white border border-[#E7E0D6] flex items-center justify-center text-[#786F66] hover:text-[#1F1A16] shadow-2xs transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#DC2626] text-white text-[9px] font-bold flex items-center justify-center border-2 border-[#FAF7F2]">
              1
            </span>
          </div>

          {/* Avatar + Logout dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-8 h-8 rounded-full bg-[#8C6036] text-white font-bold text-xs flex items-center justify-center shadow-xs hover:bg-[#7A5030] transition-colors"
              title={userEmail || 'NH Trader'}
            >
              {userInitial}
            </button>
            {showUserMenu && (
              <div className="absolute right-0 top-10 w-52 bg-white border border-[#E7E0D6] rounded-xl shadow-lg z-50 overflow-hidden">
                {userEmail && (
                  <div className="px-3 py-2.5 border-b border-[#E7E0D6]">
                    <p className="text-[10px] text-[#786F66]">Logged in as</p>
                    <p className="text-xs font-semibold text-[#1F1A16] truncate">{userEmail}</p>
                  </div>
                )}
                <button
                  onClick={() => { setShowUserMenu(false); onSignOut?.(); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-[#DC2626] hover:bg-[#FEECEB] transition-colors font-semibold"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            )}
          </div>

          {/* + Add Trade Honey Gold Button */}
          <button
            onClick={onOpenQuickTrade}
            className="px-4 py-2 rounded-xl bg-[#DB9F35] hover:bg-[#C98E2A] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all hover:scale-102"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Trade</span>
          </button>
        </div>
      </div>
    </div>
  );
};



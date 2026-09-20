import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Calendar as CalendarIcon, 
  Sun, 
  Moon,
  Bell, 
  Plus, 
  ChevronDown,
  LogOut,
  Menu
} from 'lucide-react';
import type { DayStatus } from '../utils/TradingEngine';
import { DatePickerDropdown } from './DatePickerDropdown';
import { useTheme } from '../contexts/ThemeContext';

interface TopHeaderProps {
  currentDate?: string;
  onDateChange?: (newDate: string) => void;
  dayStatus?: DayStatus;
  isDayClosedToday?: boolean;
  onOpenQuickTrade: () => void;
  onOpenDailyClose?: () => void;
  userEmail?: string;
  onSignOut?: () => void;
  onOpenMobileSidebar?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentDate = '2026-10-05',
  onDateChange,
  onOpenQuickTrade,
  userEmail,
  onSignOut,
  onOpenMobileSidebar,
}) => {
  const { theme, toggleTheme } = useTheme();
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

  const userInitial = userEmail ? userEmail[0].toUpperCase() : 'T';

  return (
    <div className="bg-[#FAF7F2] dark:bg-[#121722] border-b border-[#E7E0D6] dark:border-[#232B3A] sticky top-0 z-30 transition-colors">
      {/* Upper Header Bar */}
      <div className="px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Hamburger on mobile + Search Bar */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          {/* Mobile Hamburger Button */}
          <button
            onClick={onOpenMobileSidebar}
            className="p-2 rounded-xl bg-white dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] text-[#1F1A16] dark:text-[#F0F4F8] hover:bg-[#F3EDE2] dark:hover:bg-[#222C3E] md:hidden transition-colors shrink-0"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5 text-[#10B981]" />
          </button>

          {/* Search Bar */}
          <div className="relative flex-1 hidden sm:block">
            <Search className="w-3.5 h-3.5 text-[#9E958C] absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search trades, pairs, notes, setups..."
              className="w-full pl-9 pr-12 py-1.5 bg-white dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] rounded-xl text-xs text-[#1F1A16] dark:text-[#F0F4F8] placeholder-[#9E958C] dark:placeholder-[#64748B] focus:border-[#10B981] outline-none shadow-2xs transition-colors"
            />
            <kbd className="absolute right-2.5 top-2 px-1.5 py-0.5 rounded bg-[#F6F1EA] dark:bg-[#121722] border border-[#E7E0D6] dark:border-[#283244] text-[9px] font-mono text-[#786F66] dark:text-[#94A3B8]">
              ⌘ K
            </kbd>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Interactive Date & Time Dropdown Badge */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsPickerOpen(!isPickerOpen)}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 bg-white dark:bg-[#1A2230] hover:bg-[#FAF6EE] dark:hover:bg-[#222C3E] border border-[#E7E0D6] dark:border-[#283244] hover:border-[#10B981] rounded-xl text-xs text-[#1F1A16] dark:text-[#F0F4F8] font-medium shadow-2xs transition-all cursor-pointer group"
              title="Click to change active date"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-[#10B981] group-hover:scale-110 transition-transform" />
              <span className="font-semibold text-[11px] sm:text-xs">{formatDateDisplay(currentDate)}</span>
              <span className="text-[#9E958C] hidden sm:inline">|</span>
              <span className="font-mono text-[#786F66] dark:text-[#94A3B8] text-[11px] hidden sm:inline">{timeStr}</span>
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

          {/* Theme Toggle Button (Light/Dark) */}
          <button 
            onClick={toggleTheme}
            className="w-8 h-8 rounded-xl bg-white dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] flex items-center justify-center text-[#786F66] dark:text-[#F0F4F8] hover:text-[#10B981] shadow-2xs transition-colors cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-[#F59E0B] animate-spin-slow" />
            ) : (
              <Moon className="w-4 h-4 text-[#475569]" />
            )}
          </button>

          {/* Bell Notifications */}
          <div className="relative hidden sm:block">
            <button 
              className="w-8 h-8 rounded-xl bg-white dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] flex items-center justify-center text-[#786F66] dark:text-[#94A3B8] hover:text-[#1F1A16] dark:hover:text-[#F0F4F8] shadow-2xs transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#10B981] text-white text-[8px] font-bold flex items-center justify-center border-2 border-[#FAF7F2] dark:border-[#121722]">
              1
            </span>
          </div>

          {/* User Avatar + Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-[#10B981] to-[#059669] text-white font-black text-xs flex items-center justify-center shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
              title={userEmail || 'TradeFlow Trader'}
            >
              {userInitial}
            </button>
            {showUserMenu && (
              <div className="absolute right-0 top-10 w-52 bg-white dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
                {userEmail && (
                  <div className="px-3 py-2.5 border-b border-[#E7E0D6] dark:border-[#283244]">
                    <p className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">Logged in as</p>
                    <p className="text-xs font-semibold text-[#1F1A16] dark:text-[#F0F4F8] truncate">{userEmail}</p>
                  </div>
                )}
                <button
                  onClick={() => { setShowUserMenu(false); onSignOut?.(); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-[#DC2626] dark:text-[#F87171] hover:bg-[#FEECEB] dark:hover:bg-[#321B1B] transition-colors font-semibold cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            )}
          </div>

          {/* + Add Trade Button */}
          <button
            onClick={onOpenQuickTrade}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all hover:scale-102 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden xs:inline">Add Trade</span>
          </button>
        </div>
      </div>
    </div>
  );
};

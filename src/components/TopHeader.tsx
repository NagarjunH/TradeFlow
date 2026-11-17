import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  Sun, 
  Moon, 
  Bell, 
  Plus, 
  ChevronDown, 
  LogOut, 
  Menu, 
  Download, 
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Zap,
  X,
  CheckCheck
} from 'lucide-react';
import type { DayStatus } from '../utils/TradingEngine';
import { DatePickerDropdown, getLocalDateIso } from './DatePickerDropdown';
import { HighImpactMarquee } from './HighImpactMarquee';
import { useTheme } from '../contexts/ThemeContext';
import { onInstallAvailabilityChange, promptPWAInstall } from '../registerServiceWorker';
import { getEventsForDate } from '../services/economicCalendarService';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'danger' | 'warning' | 'success' | 'info';
  read: boolean;
}

const STORAGE_KEY_READ_NOTIFS = 'tradeflow_notifications_read_v1';
const STORAGE_KEY_DISMISSED_NOTIFS = 'tradeflow_notifications_dismissed_v1';

const getStoredIds = (key: string): string[] => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveStoredIds = (key: string, ids: string[]) => {
  try {
    const trimmed = Array.from(new Set(ids)).slice(-100);
    localStorage.setItem(key, JSON.stringify(trimmed));
  } catch {
    // Ignore storage errors
  }
};

// Self-contained ticking clock so TopHeader does NOT re-render every second
const LiveClock: React.FC = React.memo(() => {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
  );

  useEffect(() => {
    const updateTime = () => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
    };
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="font-mono text-[#786F66] dark:text-[#94A3B8] text-[10px] sm:text-[11px] whitespace-nowrap">
      {time}
    </span>
  );
});

interface TopHeaderProps {
  currentDate?: string;
  onDateChange?: (newDate: string, isLive?: boolean) => void;
  isLiveDate?: boolean;
  dayStatus?: DayStatus;
  isDayClosedToday?: boolean;
  onOpenQuickTrade: () => void;
  onOpenDailyClose?: () => void;
  userEmail?: string;
  onSignOut?: () => void;
  onOpenMobileSidebar?: () => void;
  isSyncing?: boolean;
}

export const TopHeader: React.FC<TopHeaderProps> = React.memo(({
  currentDate = getLocalDateIso(),
  onDateChange,
  isLiveDate = true,
  dayStatus,
  isDayClosedToday = false,
  onOpenQuickTrade,
  onOpenDailyClose,
  userEmail,
  onSignOut,
  onOpenMobileSidebar,
  isSyncing = false,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  // Notification State
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  // Subscribe to PWA install availability
  useEffect(() => {
    return onInstallAvailabilityChange((available) => {
      setCanInstall(available);
    });
  }, []);

  // Periodic day rollover check (every 10 seconds instead of every 1s)
  useEffect(() => {
    if (!isLiveDate || !onDateChange) return;

    const checkMidnightRollover = () => {
      const todayIso = getLocalDateIso(new Date());
      if (currentDate !== todayIso) {
        onDateChange(todayIso, true);
      }
    };

    const interval = setInterval(checkMidnightRollover, 10000);
    return () => clearInterval(interval);
  }, [isLiveDate, currentDate, onDateChange]);

  // Generate dynamic notifications based on real system state with persistence
  useEffect(() => {
    const todayEvents = getEventsForDate(currentDate);
    const highImpact = todayEvents.filter((e) => e.impact === 'HIGH');
    const readIds = getStoredIds(STORAGE_KEY_READ_NOTIFS);
    const dismissedIds = getStoredIds(STORAGE_KEY_DISMISSED_NOTIFS);

    const generated: NotificationItem[] = [
      // 1. Risk & Circuit Breaker Notification
      {
        id: `circuit-breaker-${currentDate}-${dayStatus?.status || 'NORMAL'}`,
        title: dayStatus?.status === 'LOCKED' 
          ? '🚨 Circuit Breaker Triggered' 
          : dayStatus?.status === 'WARNING' 
          ? '⚠️ Risk Limit Caution' 
          : '🛡️ Circuit Breaker Active',
        message: dayStatus?.status === 'LOCKED'
          ? 'Daily loss limit (-2R) reached. Trading locked to prevent revenge trading and protect capital.'
          : dayStatus?.status === 'WARNING'
          ? `Caution: Only ${dayStatus?.remainingR ?? 1}R risk buffer remaining under today's cap.`
          : 'Discipline rules active. Max 3 trades per day. Stick to your A+ execution checklist.',
        time: 'Live',
        type: dayStatus?.status === 'LOCKED' ? 'danger' : dayStatus?.status === 'WARNING' ? 'warning' : 'info',
        read: false,
      },
      // 2. High-Impact News Catalyst Notification
      {
        id: `economic-${currentDate}-${highImpact.length}`,
        title: highImpact.length > 0 ? `🔥 ${highImpact.length} High-Impact Release(s) Today` : '✅ Clean Economic Session',
        message: highImpact.length > 0
          ? `${highImpact.map((e) => `[${e.currency}] ${e.event} at ${e.timeIst}`).join(' · ')}. Avoid entries 10 minutes before news release.`
          : 'No high-impact economic news scheduled for this date in Indian Standard Time.',
        time: 'IST',
        type: highImpact.length > 0 ? 'warning' : 'success',
        read: false,
      },
      // 3. Daily Close Review Notification
      {
        id: `daily-close-${currentDate}-${isDayClosedToday ? 'closed' : 'pending'}`,
        title: isDayClosedToday ? '🎉 Day Closed & Audited' : '📝 Daily Close Reminder',
        message: isDayClosedToday
          ? 'Your trading session has been formally locked. Great job executing discipline today.'
          : 'Remember to complete your Daily Close in the Trading Journal before market exit.',
        time: isDayClosedToday ? 'Closed' : 'Pending',
        type: isDayClosedToday ? 'success' : 'info',
        read: false,
      },
      // 4. Vantage Terminal Sync Status
      {
        id: `vantage-bridge-${isSyncing ? 'syncing' : 'ready'}`,
        title: isSyncing ? '⚡ Vantage Bridge Syncing...' : '⚡ Vantage Terminal Bridge',
        message: isSyncing
          ? 'Importing latest closed orders and equity balance from your Vantage terminal...'
          : 'Extension bridge is connected. Live balance and trade history sync automatically.',
        time: 'Bridge',
        type: 'success',
        read: false,
      },
    ];

    // Filter out dismissed notifications, and mark as read if in stored readIds
    const activeNotifications = generated
      .filter((n) => !dismissedIds.includes(n.id))
      .map((n) => ({
        ...n,
        read: n.read || readIds.includes(n.id),
      }));

    setNotifications(activeNotifications);
  }, [currentDate, dayStatus?.status, dayStatus?.remainingR, isDayClosedToday, isSyncing]);

  // Click outside to close notifications popover
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    if (isNotifOpen) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isNotifOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      const readIds = getStoredIds(STORAGE_KEY_READ_NOTIFS);
      const newReadIds = Array.from(new Set([...readIds, ...updated.map((n) => n.id)]));
      saveStoredIds(STORAGE_KEY_READ_NOTIFS, newReadIds);
      return updated;
    });
  };

  const handleMarkSingleRead = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      const readIds = getStoredIds(STORAGE_KEY_READ_NOTIFS);
      saveStoredIds(STORAGE_KEY_READ_NOTIFS, [...readIds, id]);
      return updated;
    });
  };

  const handleDismissNotification = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      const dismissedIds = getStoredIds(STORAGE_KEY_DISMISSED_NOTIFS);
      saveStoredIds(STORAGE_KEY_DISMISSED_NOTIFS, [...dismissedIds, id]);
      return updated;
    });
  };

  // Format YYYY-MM-DD into "Tue, 17 Nov"
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
      {/* 1. Upper Header Bar */}
      <div className="px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left Side: Mobile Hamburger + Brand (Mobile) + Desktop Marquee */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Mobile Hamburger Button */}
          <button
            onClick={onOpenMobileSidebar}
            className="p-1.5 sm:p-2 rounded-xl bg-white dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] text-[#1F1A16] dark:text-[#F0F4F8] hover:bg-[#F3EDE2] dark:hover:bg-[#222C3E] md:hidden transition-colors shrink-0 cursor-pointer"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5 text-[#10B981]" />
          </button>

          {/* Mobile Mini Brand Tag */}
          <div className="flex items-center gap-1.5 md:hidden shrink-0">
            <span className="font-black text-sm text-[#1F1A16] dark:text-[#F0F4F8] tracking-tight">
              Trade<span className="text-[#DB9F35]">Flow</span>
            </span>
          </div>

          {/* High Impact Events Marquee (Desktop & Landscape >= 768px) */}
          <div className="hidden md:block flex-1 min-w-[240px] max-w-xl">
            <HighImpactMarquee currentDate={currentDate} isMobile={false} />
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Interactive Date & Live Time Dropdown Badge */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsPickerOpen(!isPickerOpen)}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 bg-white dark:bg-[#1A2230] hover:bg-[#FAF6EE] dark:hover:bg-[#222C3E] border border-[#E7E0D6] dark:border-[#283244] hover:border-[#10B981] rounded-xl text-xs text-[#1F1A16] dark:text-[#F0F4F8] font-medium shadow-2xs transition-all cursor-pointer group"
              title="Click to select date or follow live time"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-[#10B981] group-hover:scale-110 transition-transform shrink-0" />
              <span className="font-bold text-[11px] sm:text-xs whitespace-nowrap">
                {formatDateDisplay(currentDate)}
              </span>
              <span className="text-[#9E958C]">·</span>
              <LiveClock />
              {isLiveDate && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shrink-0 animate-pulse" title="Live Clock Sync Active" />
              )}
              <ChevronDown className={`w-3 h-3 text-[#9E958C] transition-transform ${isPickerOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Calendar Popover */}
            <DatePickerDropdown
              currentDate={currentDate}
              onSelectDate={(newDate, isLive) => {
                onDateChange?.(newDate, isLive);
              }}
              isOpen={isPickerOpen}
              onClose={() => setIsPickerOpen(false)}
              align="right"
              isLiveDate={isLiveDate}
            />
          </div>

          {/* PWA Install Button */}
          {canInstall && (
            <button
              onClick={() => promptPWAInstall()}
              className="hidden xs:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#FAF2E6] dark:bg-[#1C2331] border border-[#E8DCC8] dark:border-[#2E384D] text-[#DB9F35] text-xs font-bold shadow-2xs hover:bg-[#DB9F35] hover:text-[#1F1A16] transition-all cursor-pointer"
              title="Install TradeFlow as desktop or mobile app"
              aria-label="Install App"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Install</span>
            </button>
          )}

          {/* Theme Toggle Button (Light/Dark) */}
          <button 
            onClick={toggleTheme}
            className="w-8 h-8 rounded-xl bg-white dark:bg-[#1A2230] border border-[#E7E0D6] dark:border-[#283244] flex items-center justify-center text-[#786F66] dark:text-[#F0F4F8] hover:text-[#10B981] shadow-2xs transition-colors cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-[#F59E0B]" />
            ) : (
              <Moon className="w-4 h-4 text-[#475569]" />
            )}
          </button>

          {/* Dynamic Interactive Bell Notification Center (Now visible on mobile & desktop) */}
          <div className="relative" ref={notifRef}>
            <button 
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className={`w-8 h-8 rounded-xl bg-white dark:bg-[#1A2230] border transition-colors flex items-center justify-center cursor-pointer shadow-2xs ${
                isNotifOpen 
                  ? 'border-[#10B981] text-[#10B981]' 
                  : 'border-[#E7E0D6] dark:border-[#283244] text-[#786F66] dark:text-[#94A3B8] hover:text-[#1F1A16] dark:hover:text-[#F0F4F8]'
              }`}
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#10B981] text-white text-[9px] font-black font-mono flex items-center justify-center border-2 border-[#FAF7F2] dark:border-[#121722] shadow-xs animate-pulse">
                {unreadCount}
              </span>
            )}

            {/* Notification Dropdown Popover */}
            {isNotifOpen && (
              <div className="fixed inset-x-3 top-16 sm:absolute sm:top-10 sm:right-0 sm:inset-x-auto w-auto sm:w-96 bg-white dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in text-[#1F1A16] dark:text-[#F0F4F8]">
                {/* Header */}
                <div className="px-4 py-3 border-b border-[#E7E0D6]/60 dark:border-[#242D3D] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#10B981]" />
                    <h4 className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                      Notification Center
                    </h4>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-[#E8F8EE] dark:bg-[#10B981]/20 text-[#15803D] dark:text-[#10B981]">
                        {unreadCount} new
                      </span>
                    )}
                  </div>

                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-[10px] font-bold text-[#DB9F35] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCheck className="w-3 h-3" />
                      <span>Mark all read</span>
                    </button>
                  )}
                </div>

                {/* Notifications List */}
                <div className="divide-y divide-[#E7E0D6]/40 dark:divide-[#242D3D] max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#786F66] dark:text-[#94A3B8]">
                      No notifications at this moment
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <div 
                        key={item.id} 
                        onClick={() => handleMarkSingleRead(item.id)}
                        className={`p-3 transition-colors flex items-start gap-2.5 cursor-pointer hover:bg-[#FAF6EE] dark:hover:bg-[#1A2230] ${
                          item.read 
                            ? 'bg-transparent opacity-75' 
                            : 'bg-[#FAF6EE]/80 dark:bg-[#1A2230]/80'
                        }`}
                      >
                        {/* Icon */}
                        <div className="shrink-0 mt-0.5">
                          {item.type === 'danger' && (
                            <div className="w-6 h-6 rounded-lg bg-[#FEECEB] dark:bg-[#321B1B] text-[#DC2626] flex items-center justify-center">
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </div>
                          )}
                          {item.type === 'warning' && (
                            <div className="w-6 h-6 rounded-lg bg-[#FEF6E7] dark:bg-[#2A200F] text-[#DB9F35] flex items-center justify-center">
                              <Flame className="w-3.5 h-3.5" />
                            </div>
                          )}
                          {item.type === 'success' && (
                            <div className="w-6 h-6 rounded-lg bg-[#E8F8EE] dark:bg-[#132A1C] text-[#10B981] flex items-center justify-center">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                          )}
                          {item.type === 'info' && (
                            <div className="w-6 h-6 rounded-lg bg-[#FAF2E6] dark:bg-[#1C2331] text-[#786F66] dark:text-[#94A3B8] flex items-center justify-center">
                              <Zap className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8] truncate flex items-center gap-1.5">
                              {!item.read && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shrink-0" />
                              )}
                              <span>{item.title}</span>
                            </span>
                            <span className="text-[9px] font-mono text-[#786F66] dark:text-[#94A3B8] shrink-0">
                              {item.time}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#786F66] dark:text-[#94A3B8] mt-0.5 leading-snug">
                            {item.message}
                          </p>
                        </div>

                        {/* Dismiss */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDismissNotification(item.id);
                          }}
                          className="text-[#9E958C] hover:text-[#DC2626] p-0.5 rounded-sm transition-colors cursor-pointer shrink-0"
                          title="Dismiss"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer Quick Action */}
                <div className="p-2.5 bg-[#FAF7F2] dark:bg-[#0F141E] border-t border-[#E7E0D6]/60 dark:border-[#242D3D] flex items-center justify-between text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNotifOpen(false);
                      onOpenDailyClose?.();
                    }}
                    className="font-bold text-[#DB9F35] hover:underline cursor-pointer"
                  >
                    Open Daily Review Modal →
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsNotifOpen(false)}
                    className="text-[#786F66] dark:text-[#94A3B8] hover:text-[#1F1A16] dark:hover:text-white cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
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
                  onClick={() => {
                    setShowUserMenu(false);
                    promptPWAInstall();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-[#1F1A16] dark:text-[#F0F4F8] hover:bg-[#FAF7F2] dark:hover:bg-[#131822] transition-colors border-b border-[#E7E0D6]/60 dark:border-[#283244] font-medium cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5 text-[#DB9F35]" />
                  Install TradeFlow App
                </button>
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
            className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs sm:text-[13px] font-bold flex items-center gap-1 sm:gap-1.5 shadow-sm hover:shadow-md transition-all hover:scale-102 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
            <span className="hidden xs:inline">Add Trade</span>
          </button>
        </div>
      </div>

      {/* 2. Mobile-Only Dedicated High-Impact News Marquee Ticker Strip (< 768px) */}
      <div className="md:hidden px-3 py-1.5 border-t border-[#E7E0D6]/60 dark:border-[#232B3A] bg-[#F5EFE6]/40 dark:bg-[#0F141E]/40 w-full">
        <HighImpactMarquee currentDate={currentDate} isMobile={true} />
      </div>
    </div>
  );
});

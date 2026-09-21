import React from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  CalendarCheck,
  Trophy,
  BarChart2,
  Calendar,
  FileText,
  Settings as SettingsIcon,
  X
} from 'lucide-react';
import type { TabType } from './Navbar';

interface SidebarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  isOpen = false,
  onClose,
}) => {
  const navItems = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'journal' as TabType, label: 'Trading Journal', icon: BookOpen },
    { id: 'cycle' as TabType, label: '31-Day Cycle', icon: CalendarCheck },
    { id: 'challenge21' as TabType, label: '21 Days Challenge', icon: Trophy },
    { id: 'analytics' as TabType, label: 'Analytics', icon: BarChart2 },
    { id: 'calendar' as TabType, label: 'Calendar', icon: Calendar },
    { id: 'notes' as TabType, label: 'Notes', icon: FileText },
    { id: 'settings' as TabType, label: 'Settings', icon: SettingsIcon },
  ];

  const handleNavClick = (id: TabType) => {
    onTabChange(id);
    onClose?.();
  };

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full select-none overflow-hidden bg-[#FAF7F2] dark:bg-[#121722] border-r border-[#E7E0D6] dark:border-[#232B3A] transition-colors">
      {/* Top Logo & Header */}
      <div className="z-10 shrink-0">
        <div className="px-4 py-3 sm:py-3.5 border-b border-[#E7E0D6]/70 dark:border-[#232B3A] flex items-center justify-between">
          <div 
            onClick={() => handleNavClick('dashboard')}
            className="cursor-pointer flex items-center gap-2.5 group"
          >
            <img 
              src="/tradeflow-logo.jpg" 
              alt="TradeFlow Logo" 
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover shadow-xs group-hover:scale-105 transition-transform border border-[#E7E0D6] dark:border-[#2E384D]"
            />
            <div>
              <h1 className="text-sm sm:text-base font-black tracking-tight text-[#1F1A16] dark:text-[#F0F4F8] leading-none">
                Trade<span className="text-[#DB9F35]">Flow</span>
              </h1>
              <p className="text-[8px] text-[#786F66] dark:text-[#94A3B8] tracking-wider uppercase mt-1 font-semibold">
                Discipline Today | Profits Tomorrow
              </p>
            </div>
          </div>

          {/* Close button on mobile */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#786F66] hover:text-[#1F1A16] dark:text-[#94A3B8] dark:hover:text-white md:hidden transition-colors cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Nav Links */}
        <nav className="p-2.5 sm:p-3 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            const isChallenge = item.id === 'challenge21';

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`relative w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-[13px] font-semibold transition-all cursor-pointer text-left overflow-hidden ${
                  isActive
                    ? isChallenge
                      ? 'bg-[#FCEFD8] dark:bg-[#342416] text-[#6E3C12] dark:text-[#FBBF24] font-bold shadow-2xs'
                      : 'bg-[#F4ECE1] dark:bg-[#1E2638] text-[#1F1A16] dark:text-[#F0F4F8] font-bold shadow-2xs'
                    : 'text-[#624E3D] dark:text-[#94A3B8] hover:text-[#1F1A16] dark:hover:text-[#F0F4F8] hover:bg-[#F3EDE2]/70 dark:hover:bg-[#1A2230]'
                }`}
              >
                {/* Left orange accent bar indicator */}
                {isActive && (
                  <span
                    className={`absolute left-0 top-1 bottom-1 w-1 rounded-r-md ${
                      isChallenge ? 'bg-[#E08A2B]' : 'bg-[#10B981]'
                    }`}
                  />
                )}
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? isChallenge
                        ? 'text-[#C8681A] dark:text-[#F59E0B]'
                        : 'text-[#10B981]'
                      : 'text-[#6E5845] dark:text-[#78869E]'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Mountain Landscape & Motivation Panel */}
      <div className="relative flex-1 min-h-[180px] flex flex-col justify-end overflow-hidden mt-auto">
        {/* Soft top gradient blending from menu into mountain */}
        <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[#FAF7F2] dark:from-[#121722] via-[#FAF7F2]/60 dark:via-[#121722]/60 to-transparent z-10 pointer-events-none" />

        {/* Mountain Landscape Background Image - Centered on peak */}
        <img
          src="/mountain-sidebar.jpg"
          alt="TradeFlow Mountain Landscape"
          className="absolute inset-0 w-full h-full object-cover object-top block opacity-95 dark:opacity-40 pointer-events-none select-none"
        />

        {/* Bottom subtle gradient for text contrast over misty trees */}
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#FAF7F2]/95 dark:from-[#121722]/95 via-[#FAF7F2]/50 dark:via-[#121722]/60 to-transparent z-10 pointer-events-none" />

        {/* Typography Quote & TradeFlow Branding */}
        <div className="relative z-20 px-5 pb-5 sm:pb-6 select-none">
          {/* Quote Block with hanging quote mark */}
          <div className="relative pl-3.5">
            <span className="absolute left-0 -top-0.5 text-[#D97706] font-serif text-lg font-bold leading-none select-none pointer-events-none">
              “
            </span>
            <div className="text-[#1F1A16] dark:text-[#F0F4F8] font-serif font-bold italic text-[14.5px] sm:text-[15.5px] leading-[1.22] tracking-tight select-none">
              <div>Discipline</div>
              <div>turns goals</div>
              <div>into results.<span className="text-[#D97706] font-serif not-italic ml-0.5">”</span></div>
            </div>

            <p className="text-[10px] font-bold tracking-wider text-[#4A3E31] dark:text-[#CBD5E1] uppercase mt-2 select-none flex items-center gap-1.5">
              <span className="text-[#D97706] font-bold">—</span> TradeFlow
            </p>
          </div>

          {/* Footer Branding */}
          <div className="mt-6 sm:mt-7 pl-3.5 select-none">
            <div className="text-xs font-black text-[#1F1A16] dark:text-[#F0F4F8] tracking-tight leading-none">
              TradeFlow
            </div>
            <div className="text-[9.5px] font-mono text-[#786F66] dark:text-[#94A3B8] mt-1">
              v1.0.0
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Permanent) */}
      <aside className="hidden md:flex w-56 lg:w-60 shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Slide-over) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-fade-in">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          {/* Drawer Panel */}
          <div className="relative w-64 max-w-[80vw] h-full shadow-2xl z-10 transform transition-transform">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

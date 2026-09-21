import React from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  ShieldCheck, 
  CalendarDays, 
  BarChart2,
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
    { id: 'rules' as TabType, label: 'Trading Rules', icon: ShieldCheck },
    { id: 'cycle' as TabType, label: '21-Day Challenge', icon: CalendarDays },
    { id: 'analytics' as TabType, label: 'Analytics', icon: BarChart2 },
    { id: 'settings' as TabType, label: 'Settings', icon: SettingsIcon },
  ];

  const handleNavClick = (id: TabType) => {
    onTabChange(id);
    onClose?.();
  };

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full select-none overflow-hidden bg-[#FAF7F2] dark:bg-[#121722] border-r border-[#E7E0D6] dark:border-[#232B3A] transition-colors">
      {/* Top Logo & Header */}
      <div className="z-10">
        <div className="px-5 py-4 border-b border-[#E7E0D6]/70 dark:border-[#232B3A] flex items-center justify-between">
          <div 
            onClick={() => handleNavClick('dashboard')}
            className="cursor-pointer flex items-center gap-3 group"
          >
            <img 
              src="/tradeflow-logo.jpg" 
              alt="TradeFlow Logo" 
              className="w-9 h-9 rounded-xl object-cover shadow-sm group-hover:scale-105 transition-transform border border-[#E7E0D6] dark:border-[#2E384D]"
            />
            <div>
              <h1 className="text-base font-black tracking-tight text-[#1F1A16] dark:text-[#F0F4F8] leading-none">
                Trade<span className="text-[#10B981]">Flow</span>
              </h1>
              <p className="text-[8px] text-[#786F66] dark:text-[#94A3B8] tracking-wider uppercase mt-1 font-semibold">
                Journal • Review • Improve
              </p>
            </div>
          </div>

          {/* Close button on mobile */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#786F66] hover:text-[#1F1A16] dark:text-[#94A3B8] dark:hover:text-white md:hidden transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Nav Links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#10B981]/15 text-[#059669] dark:text-[#34D399] border border-[#10B981]/30 shadow-xs'
                    : 'text-[#786F66] dark:text-[#94A3B8] hover:text-[#1F1A16] dark:hover:text-[#F0F4F8] hover:bg-[#F3EDE2] dark:hover:bg-[#1A2230] border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#10B981]' : 'text-[#9E958C] dark:text-[#64748B]'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Quote & Motivation Panel */}
      <div className="relative mt-auto w-full min-h-[190px] overflow-hidden select-none flex flex-col justify-end">
        {/* Soft top gradient */}
        <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-[#FAF7F2] dark:from-[#121722] via-[#FAF7F2]/80 dark:via-[#121722]/80 to-transparent z-10 pointer-events-none" />
        
        {/* Mountain Landscape Background */}
        <img
          src="/mountain-sidebar.jpg"
          alt="TradeFlow Motivation"
          className="absolute inset-0 w-full h-full object-cover object-bottom block opacity-85 dark:opacity-40 pointer-events-none select-none"
        />

        {/* Crisp Typography Quote */}
        <div className="relative z-20 px-5 py-4 pb-5">
          <div className="relative pl-3">
            <span className="absolute -left-1 -top-1 text-[#10B981] font-serif text-2xl font-black leading-none select-none pointer-events-none">
              “
            </span>
            
            <div className="text-[#1F1A16] dark:text-[#F0F4F8] font-black text-[14px] sm:text-[15px] leading-[1.2] tracking-tight select-none">
              <div>“Discipline</div>
              <div>turns goals</div>
              <div className="flex items-baseline gap-0.5">
                <span>into results.”</span>
              </div>
            </div>

            <p className="text-[10px] font-bold tracking-wider text-[#5A5043] dark:text-[#CBD5E1] uppercase mt-2 select-none flex items-center gap-1.5">
              <span className="text-[#DB9F35] font-normal">—</span> NH TRADERS
            </p>
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

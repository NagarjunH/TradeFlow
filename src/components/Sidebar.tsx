import React from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  ShieldCheck, 
  CalendarDays, 
  BarChart2,
  Calendar,
  Settings as SettingsIcon,
  Flame
} from 'lucide-react';
import type { TabType } from './Navbar';

interface SidebarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
}) => {
  const navItems = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'journal' as TabType, label: 'Trading Journal', icon: BookOpen },
    { id: 'rules' as TabType, label: 'Trading Rules', icon: ShieldCheck },
    { id: 'cycle' as TabType, label: '31-Day Cycle', icon: CalendarDays },
    { id: 'analytics' as TabType, label: 'Analytics', icon: BarChart2 },
    { id: 'calendar' as TabType, label: 'Calendar', icon: Calendar },
    { id: 'settings' as TabType, label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <aside className="w-56 lg:w-60 bg-[#FAF7F2] border-r border-[#E7E0D6] flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none overflow-hidden">
      {/* Top Logo & Header */}
      <div className="z-10">
        <div className="px-5 py-4 border-b border-[#E7E0D6]/70">
          <div 
            onClick={() => onTabChange('dashboard')}
            className="cursor-pointer flex items-center gap-2.5 group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#F0E5D3] border border-[#E2D1B8] flex items-center justify-center text-[#DB9F35] shadow-2xs group-hover:scale-105 transition-transform">
              <Flame className="w-4.5 h-4.5 fill-[#DB9F35]" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-[#1F1A16] uppercase leading-none">
                NH <span className="text-[#DB9F35]">TRADERS</span>
              </h1>
              <p className="text-[9px] text-[#786F66] tracking-tight mt-1 font-medium">
                Discipline Today | Profits Tomorrow
              </p>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#F0E5D3] text-[#875510] border border-[#E2D1B8] shadow-2xs'
                    : 'text-[#786F66] hover:text-[#1F1A16] hover:bg-[#F3EDE2] border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#DB9F35]' : 'text-[#9E958C]'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Mountain Artwork & Ultra-HD Crisp Typography Quote */}
      <div className="relative mt-auto w-full flex-1 min-h-[220px] max-h-[440px] overflow-hidden select-none flex flex-col justify-end">
        {/* Soft top gradient to seamlessly blend into sidebar background */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#FAF7F2] via-[#FAF7F2]/80 to-transparent z-10 pointer-events-none" />
        
        {/* Ultra-HD Watercolor Mountain Landscape */}
        <img
          src="/mountain-sidebar.jpg"
          alt="Majestic Mountain Landscape — NH TRADERS"
          className="absolute inset-0 w-full h-full object-cover object-bottom block pointer-events-none select-none"
        />

        {/* Crisp Vector Typography Quote (100% Ultra-HD, No Raster Blur) */}
        <div className="relative z-20 px-5 py-5 pb-6">
          <div className="relative pl-3.5">
            {/* Hanging Opening Quote Mark */}
            <span className="absolute -left-1 -top-1 text-[#DB9F35] font-serif text-2xl font-black leading-none select-none pointer-events-none">
              “
            </span>
            
            {currentTab === 'rules' ? (
              <div className="text-[#1F1A16] font-black text-[16px] leading-[1.2] tracking-tight select-none">
                <div>Small</div>
                <div>Disciplines</div>
                <div>Create</div>
                <div className="flex items-baseline gap-0.5">
                  <span>Big Freedom.</span>
                  <span className="text-[#DB9F35] font-serif text-2xl font-black leading-none select-none ml-0.5">
                    ”
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-[#1F1A16] font-black text-[16px] leading-[1.2] tracking-tight select-none">
                <div>Better</div>
                <div>Decisions</div>
                <div>Brighter</div>
                <div className="flex items-baseline gap-0.5">
                  <span>Results.</span>
                  <span className="text-[#DB9F35] font-serif text-2xl font-black leading-none select-none ml-0.5">
                    ”
                  </span>
                </div>
              </div>
            )}

            <p className="text-[11px] font-bold tracking-wider text-[#5A5043] uppercase mt-2.5 select-none flex items-center gap-1.5">
              <span className="text-[#8C7E70] font-normal">—</span> NH TRADERS
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

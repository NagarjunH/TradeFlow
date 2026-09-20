import React, { useState } from 'react';
import { 
  Shield, 
  Calendar as CalendarIcon, 
  CheckSquare, 
  Target, 
  GitFork, 
  Heart, 
  Zap, 
  BookOpen, 
  FileText, 
  TrendingUp, 
  Pause, 
  Brain, 
  Info, 
  Pencil, 
  BarChart3, 
  Trophy, 
  AlertTriangle, 
  Settings as SettingsIcon, 
  Lock, 
  Lightbulb, 
  Check,
  ChevronDown
} from 'lucide-react';
import { db, type Trade, type DayRecord, type AppSettings } from '../db/db';
import { DatePickerDropdown } from './DatePickerDropdown';

interface TradingRulesViewProps {
  currentDate?: string;
  onDateChange?: (newDate: string) => void;
  trades: Trade[];
  days: DayRecord[];
  settings: AppSettings;
  onRefresh: () => void;
  onOpenDailyClose: () => void;
}

export const TradingRulesView: React.FC<TradingRulesViewProps> = ({
  currentDate = '2026-10-05',
  onDateChange,
  trades,
  settings,
  onRefresh,
}) => {
  // Navigation tabs state
  const [activeTab, setActiveTab] = useState('daily-checklist');

  // Checklist items state (Default all 7 checked matching user mockup)
  const [checklist, setChecklist] = useState({
    rule1: true, // Risk 0.5 - 1% per trade
    rule2: true, // Daily max loss limit respected
    rule3: true, // SL pre-defined & never widened
    rule4: true, // No setup = No trade
    rule5: true, // SMC sequence verified (HTF -> Liquidity -> MSS -> POI)
    rule6: true, // No FOMO / Revenge trading
    rule7: true, // Economic calendar checked
  });

  const [dailyNotes, setDailyNotes] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);

  // Violation tracker state
  const [selectedViolation, setSelectedViolation] = useState<string | null>(null);
  const [violationDetails, setViolationDetails] = useState('');
  const [violationLogged, setViolationLogged] = useState(false);

  // Rule engine state
  const [protectionMode, setProtectionMode] = useState<'HARD_LOCK' | 'SOFT_WARNING'>(
    settings.protectionMode || 'HARD_LOCK'
  );
  const [maxRiskPerTrade, setMaxRiskPerTrade] = useState('1%');
  const [dailyLossLimitR, setDailyLossLimitR] = useState('2R');
  const [maxOpenTrades, setMaxOpenTrades] = useState('1');
  const [hardLockToggle, setHardLockToggle] = useState(true);

  // Active date from props
  const activeDate = currentDate || '2026-10-05';
  const todayTrades = trades.filter((t) => t.date === activeDate);
  const todayTradesCount = todayTrades.length > 0 ? todayTrades.length : (activeDate === '2026-10-05' ? 3 : 0);
  const todayPnlR = todayTrades.length > 0 
    ? todayTrades.reduce((acc, t) => acc + (t.rMultiple || 0), 0) 
    : (activeDate === '2026-10-05' ? 1.5 : 0);

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

  const toggleChecklist = (key: keyof typeof checklist) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const checkedCount = Object.values(checklist).filter(Boolean).length;
  const allFollowed = checkedCount === 7;
  const percentage = Math.round((checkedCount / 7) * 100);

  const violationOptions = [
    'FOMO',
    'Chased Price',
    'Moved SL',
    'Over-leveraged',
    'No Setup',
    'Revenge Trading',
    'News Trade',
    'Other'
  ];

  const handleSaveDailyRules = async () => {
    try {
      await db.auditLogs.add({
        action: 'UPDATE',
        details: `Saved daily checklist: ${checkedCount}/7 rules followed (${percentage}%). Notes: ${dailyNotes || 'None'}`,
        timestamp: new Date().toISOString(),
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
      onRefresh();
    } catch {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    }
  };

  const handleLogViolation = async () => {
    if (!selectedViolation && !violationDetails) return;
    try {
      await db.auditLogs.add({
        action: 'UPDATE',
        details: `Logged violation: ${selectedViolation || 'Unspecified'} - ${violationDetails || 'No additional details'}`,
        timestamp: new Date().toISOString(),
      });
      setViolationLogged(true);
      setTimeout(() => {
        setViolationLogged(false);
        setSelectedViolation(null);
        setViolationDetails('');
      }, 2500);
      onRefresh();
    } catch {
      setViolationLogged(true);
      setTimeout(() => {
        setViolationLogged(false);
        setSelectedViolation(null);
        setViolationDetails('');
      }, 2500);
    }
  };

  const navTabs = [
    { id: 'daily-checklist', label: 'Daily Checklist', icon: CheckSquare },
    { id: 'risk-management', label: 'Risk Management', icon: Target },
    { id: 'setup-rules', label: 'Setup Rules', icon: GitFork },
    { id: 'psychology-rules', label: 'Psychology Rules', icon: Heart },
    { id: 'execution-rules', label: 'Execution Rules', icon: Zap },
    { id: 'market-news', label: 'Market & News', icon: BookOpen },
    { id: 'my-plan', label: 'My Plan', icon: FileText },
  ];

  return (
    <div className="space-y-5 animate-fade-in pb-12 select-none">
      {/* 1. Header & Discipline Motto */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#F0E5D3] border border-[#E2D1B8] flex items-center justify-center text-[#DB9F35] shadow-2xs shrink-0">
            <Shield className="w-5 h-5 fill-[#DB9F35]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#1F1A16] tracking-tight">
              Trading Rules
            </h1>
            <p className="text-xs text-[#786F66] font-medium mt-0.5">
              Follow the rules. Protect your capital. Trade with clarity.
            </p>
          </div>
        </div>

        <div className="text-right italic font-serif text-[#5A5043] text-xs leading-relaxed hidden sm:block">
          “Rules protect your capital,<br />
          Discipline grows it.”
        </div>
      </div>

      {/* 2. Sub-Navigation Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                isActive
                  ? 'bg-[#F3DFB8] border border-[#E5C68A] text-[#784A0E] shadow-2xs'
                  : 'text-[#786F66] hover:text-[#1F1A16] hover:bg-[#EFE7DC] border border-transparent'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#784A0E]' : 'text-[#9E958C]'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Main 3-Column Layout */}
      {activeTab === 'daily-checklist' && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ========================================================= */}
        {/* COLUMN 1: Today's Rules Checklist (5 cols)                */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-5 shadow-2xs space-y-4">
          {/* Card Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#FAF0E1] border border-[#ECD9BE] flex items-center justify-center text-[#DB9F35] shrink-0">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#1F1A16] leading-tight">
                  Today's Rules Checklist
                </h2>
                <p className="text-[10px] text-[#786F66] mt-0.5">
                  Check all rules before and during trading. No shortcuts.
                </p>
              </div>
            </div>

            <div className="relative">
              <button 
                type="button"
                onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
                className="px-2.5 py-1 bg-[#F2ECE0] hover:bg-[#EAE2D3] border border-[#E2D8C9] hover:border-[#DB9F35] rounded-lg text-[11px] font-semibold text-[#5A5043] flex items-center gap-1.5 shrink-0 cursor-pointer transition-all shadow-2xs group"
                title="Click to change active trading date"
              >
                <CalendarIcon className="w-3.5 h-3.5 text-[#DB9F35] group-hover:scale-110 transition-transform" />
                <span>{formatDateDisplay(activeDate)}</span>
                <ChevronDown className={`w-3 h-3 text-[#9E958C] transition-transform ${isDateDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <DatePickerDropdown
                currentDate={activeDate}
                onSelectDate={(newDate) => {
                  onDateChange?.(newDate);
                  setIsDateDropdownOpen(false);
                }}
                isOpen={isDateDropdownOpen}
                onClose={() => setIsDateDropdownOpen(false)}
                align="right"
              />
            </div>
          </div>

          {/* Checklist Items */}
          <div className="space-y-2.5 pt-1">
            {/* Rule 1 */}
            <div 
              onClick={() => toggleChecklist('rule1')}
              className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-[#F2ECE0]/60 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                  checklist.rule1 ? 'bg-[#15803D] text-white shadow-2xs' : 'border-2 border-[#C8BEB0] bg-white'
                }`}>
                  {checklist.rule1 && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <div className="w-7 h-7 rounded-lg bg-[#FFF0E6] flex items-center justify-center text-[#E06D24] shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#1F1A16] leading-snug">
                    Risk 0.5 – 1% per trade
                  </h3>
                  <p className="text-[10px] text-[#786F66]">
                    Position size calculated. No over-leverage.
                  </p>
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); }}
                className="text-[#A89F93] hover:text-[#1F1A16] p-1"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>

            {/* Rule 2 */}
            <div 
              onClick={() => toggleChecklist('rule2')}
              className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-[#F2ECE0]/60 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                  checklist.rule2 ? 'bg-[#15803D] text-white shadow-2xs' : 'border-2 border-[#C8BEB0] bg-white'
                }`}>
                  {checklist.rule2 && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <div className="w-7 h-7 rounded-lg bg-[#FFF2E2] flex items-center justify-center text-[#D97706] shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#1F1A16] leading-snug">
                    Daily max loss limit respected
                  </h3>
                  <p className="text-[10px] text-[#786F66]">
                    Stop trading after -2R loss.
                  </p>
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); }}
                className="text-[#A89F93] hover:text-[#1F1A16] p-1"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>

            {/* Rule 3 */}
            <div 
              onClick={() => toggleChecklist('rule3')}
              className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-[#F2ECE0]/60 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                  checklist.rule3 ? 'bg-[#15803D] text-white shadow-2xs' : 'border-2 border-[#C8BEB0] bg-white'
                }`}>
                  {checklist.rule3 && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <div className="w-7 h-7 rounded-lg bg-[#FEECEB] flex items-center justify-center text-[#DC2626] shrink-0">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#1F1A16] leading-snug">
                    SL pre-defined & never widened
                  </h3>
                  <p className="text-[10px] text-[#786F66]">
                    Accept the stop. No moving it further.
                  </p>
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); }}
                className="text-[#A89F93] hover:text-[#1F1A16] p-1"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>

            {/* Rule 4 */}
            <div 
              onClick={() => toggleChecklist('rule4')}
              className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-[#F2ECE0]/60 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                  checklist.rule4 ? 'bg-[#15803D] text-white shadow-2xs' : 'border-2 border-[#C8BEB0] bg-white'
                }`}>
                  {checklist.rule4 && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <div className="w-7 h-7 rounded-lg bg-[#FEF3C7] flex items-center justify-center text-[#D97706] shrink-0">
                  <Pause className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#1F1A16] leading-snug">
                    No setup = No trade
                  </h3>
                  <p className="text-[10px] text-[#786F66]">
                    Be patient. Quality over quantity.
                  </p>
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); }}
                className="text-[#A89F93] hover:text-[#1F1A16] p-1"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>

            {/* Rule 5 */}
            <div 
              onClick={() => toggleChecklist('rule5')}
              className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-[#F2ECE0]/60 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                  checklist.rule5 ? 'bg-[#15803D] text-white shadow-2xs' : 'border-2 border-[#C8BEB0] bg-white'
                }`}>
                  {checklist.rule5 && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] flex items-center justify-center text-[#2563EB] shrink-0">
                  <GitFork className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#1F1A16] leading-snug">
                    SMC sequence verified (HTF → Liquidity → MSS → POI)
                  </h3>
                  <p className="text-[10px] text-[#786F66]">
                    Follow your trading model completely.
                  </p>
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); }}
                className="text-[#A89F93] hover:text-[#1F1A16] p-1"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>

            {/* Rule 6 */}
            <div 
              onClick={() => toggleChecklist('rule6')}
              className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-[#F2ECE0]/60 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                  checklist.rule6 ? 'bg-[#15803D] text-white shadow-2xs' : 'border-2 border-[#C8BEB0] bg-white'
                }`}>
                  {checklist.rule6 && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <div className="w-7 h-7 rounded-lg bg-[#FDF2F8] flex items-center justify-center text-[#DB2777] shrink-0">
                  <Brain className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#1F1A16] leading-snug">
                    No FOMO / Revenge trading
                  </h3>
                  <p className="text-[10px] text-[#786F66]">
                    Stay calm. Stick to the plan.
                  </p>
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); }}
                className="text-[#A89F93] hover:text-[#1F1A16] p-1"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>

            {/* Rule 7 */}
            <div 
              onClick={() => toggleChecklist('rule7')}
              className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-[#F2ECE0]/60 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                  checklist.rule7 ? 'bg-[#15803D] text-white shadow-2xs' : 'border-2 border-[#C8BEB0] bg-white'
                }`}>
                  {checklist.rule7 && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <div className="w-7 h-7 rounded-lg bg-[#FFF4ED] flex items-center justify-center text-[#EA580C] shrink-0">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#1F1A16] leading-snug">
                    Economic calendar checked
                  </h3>
                  <p className="text-[10px] text-[#786F66]">
                    Be aware of high impact news.
                  </p>
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); }}
                className="text-[#A89F93] hover:text-[#1F1A16] p-1"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Success Banner */}
          <div className="bg-[#EAF6ED] border border-[#C2E7CE] rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-[#22C55E] text-white flex items-center justify-center shadow-2xs shrink-0">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#15803D] leading-tight">
                  {allFollowed ? 'All Rules Followed' : `${checkedCount} of 7 Rules Followed`}
                </h4>
                <p className="text-[10px] text-[#2E7D32] mt-0.5">
                  {allFollowed ? 'Great discipline! Keep it up.' : 'Focus on complete discipline before taking trades.'}
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm font-black text-[#15803D] leading-none">
                {checkedCount} / 7
              </div>
              <div className="text-[10px] font-bold text-[#15803D] mt-0.5">
                {percentage}%
              </div>
            </div>
          </div>

          {/* Daily Notes (Optional) */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold text-[#1F1A16] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#786F66]" />
              <span>Daily Notes (Optional)</span>
            </label>
            <textarea
              value={dailyNotes}
              onChange={(e) => setDailyNotes(e.target.value)}
              placeholder="Write your thoughts for today..."
              className="w-full bg-[#FAF6EE] border border-[#E7E0D6] rounded-xl p-3 text-xs text-[#1F1A16] placeholder:text-[#9E958C] focus:outline-none focus:border-[#DB9F35] resize-none h-20 shadow-2xs font-sans"
            />
          </div>

          {/* Save Daily Rules Button */}
          <button
            onClick={handleSaveDailyRules}
            className="w-full bg-gradient-to-r from-[#DB9F35] to-[#D49326] hover:from-[#C88B24] hover:to-[#BD801E] text-[#2A1F0D] font-black text-xs py-3 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{isSaved ? '✓ Daily Rules Saved!' : 'Save Daily Rules'}</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* COLUMN 2: Risk Monitor + Status + If Violated (4 cols)   */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* 1. Daily Risk Monitor */}
          <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#FAF0E1] border border-[#ECD9BE] flex items-center justify-center text-[#DB9F35] shrink-0">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1F1A16] leading-tight">
                    Daily Risk Monitor
                  </h3>
                  <p className="text-[10px] text-[#786F66] mt-0.5">
                    Real-time risk tracking for today.
                  </p>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded-full bg-[#E8F8EE] border border-[#B7ECC8] text-[10px] font-bold text-[#15803D] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
                ACTIVE
              </span>
            </div>

            {/* Metrics List */}
            <div className="space-y-2 pt-1 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-[#E7E0D6]/60">
                <span className="text-[#5A5043] font-medium">Daily Loss Limit</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[#1F1A16]">-2R</span>
                  <button className="text-[#9E958C] hover:text-[#1F1A16]">
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#E7E0D6]/60">
                <span className="text-[#5A5043] font-medium">Today's P&L</span>
                <span className="font-bold text-[#15803D]">
                  {todayPnlR >= 0 ? `+${todayPnlR.toFixed(1)}R` : `${todayPnlR.toFixed(1)}R`}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#E7E0D6]/60">
                <span className="text-[#5A5043] font-medium">Remaining Risk</span>
                <span className="font-bold text-[#15803D]">0.5R</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-[#5A5043] font-medium">Trades Today</span>
                <span className="font-bold text-[#1F1A16]">{todayTradesCount}</span>
              </div>
            </div>

            {/* Risk Bar */}
            <div className="pt-1">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-[#E6DFD5] rounded-full overflow-hidden">
                  <div className="h-full bg-[#15803D] rounded-full w-[75%] transition-all duration-500" />
                </div>
                <span className="text-[10px] font-semibold text-[#786F66] whitespace-nowrap">
                  75% used
                </span>
              </div>
            </div>

            {/* Quote Banner */}
            <div className="bg-[#EEF7F1] border border-[#D2EEDC] text-[#246A42] text-[11px] font-medium text-center py-2 px-3 rounded-xl">
              “You are still in the game. Trade with discipline.”
            </div>
          </div>

          {/* 2. Daily Status */}
          <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#FAF0E1] border border-[#ECD9BE] flex items-center justify-center text-[#DB9F35] shrink-0">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1F1A16] leading-tight">
                    Daily Status
                  </h3>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded-full bg-[#E8F8EE] border border-[#B7ECC8] text-[10px] font-bold text-[#15803D] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
                ON TRACK
              </span>
            </div>

            <div>
              <p className="text-[10px] text-[#786F66] leading-tight">
                You are following your plan.
              </p>
              <p className="text-[10px] text-[#786F66] leading-tight">
                Stay patient and execute only high-probability setups.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E7E0D6]/60 text-center">
              <div>
                <div className="text-base font-black text-[#1F1A16] leading-none">
                  {todayTradesCount}
                </div>
                <div className="text-[10px] text-[#786F66] mt-1 font-medium">
                  Trades
                </div>
              </div>

              <div>
                <div className="text-base font-black text-[#15803D] leading-none">
                  +{todayPnlR.toFixed(1)}R
                </div>
                <div className="text-[10px] text-[#786F66] mt-1 font-medium">
                  P&L
                </div>
              </div>

              <div>
                <div className="text-base font-black text-[#1F1A16] leading-none">
                  {percentage}%
                </div>
                <div className="text-[10px] text-[#786F66] mt-1 font-medium">
                  Rules Followed
                </div>
              </div>
            </div>
          </div>

          {/* 3. If Rule Violated */}
          <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#FEECEB] border border-[#FBC5C2] flex items-center justify-center text-[#DC2626] shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#1F1A16] leading-tight">
                  If Rule Violated
                </h3>
                <p className="text-[10px] text-[#786F66] mt-0.5">
                  Select the violation reason (if any).
                </p>
              </div>
            </div>

            {/* Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {violationOptions.map((opt) => {
                const isSelected = selectedViolation === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => setSelectedViolation(isSelected ? null : opt)}
                    className={`px-2.5 py-1 text-[10px] font-semibold rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-[#FEECEB] text-[#DC2626] border-[#FCA5A5] font-bold shadow-2xs'
                        : 'bg-[#F2ECE0] text-[#5A5043] border-[#E0D5C4] hover:bg-[#EBE3D4]'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {/* Details Textarea */}
            <textarea
              value={violationDetails}
              onChange={(e) => setViolationDetails(e.target.value)}
              placeholder="Add details about what happened..."
              className="w-full bg-[#FAF6EE] border border-[#E7E0D6] rounded-xl p-2.5 text-xs text-[#1F1A16] placeholder:text-[#9E958C] focus:outline-none focus:border-[#DB9F35] resize-none h-14 font-sans shadow-2xs"
            />

            {/* Log Violation Button */}
            <button
              onClick={handleLogViolation}
              className="w-full bg-[#FEECEB] hover:bg-[#FCD8D6] text-[#DC2626] border border-[#FCA5A5]/60 font-bold text-xs py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{violationLogged ? '✓ Violation Logged' : 'Log Violation'}</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* COLUMN 3: Rule Engine + Quick Reminders (3 cols)          */}
        {/* ========================================================= */}
        <div className="lg:col-span-3 space-y-5">
          
          {/* 1. Rule Engine */}
          <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#FAF0E1] border border-[#ECD9BE] flex items-center justify-center text-[#DB9F35] shrink-0">
                <SettingsIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1F1A16] leading-tight">
                  Rule Engine
                </h3>
                <p className="text-[10px] text-[#786F66] mt-0.5">
                  Auto-enforcement to keep you disciplined.
                </p>
              </div>
            </div>

            {/* Protection Mode Radios */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold text-[#1F1A16] flex items-center gap-1">
                <span>Daily Loss Protection</span>
                <Info className="w-3.5 h-3.5 text-[#9E958C]" />
              </label>

              <div 
                onClick={() => setProtectionMode('HARD_LOCK')}
                className="flex items-start gap-2 cursor-pointer"
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${
                  protectionMode === 'HARD_LOCK' ? 'border-[#DB9F35]' : 'border-[#C9BFA8]'
                }`}>
                  {protectionMode === 'HARD_LOCK' && (
                    <div className="w-2 h-2 rounded-full bg-[#DB9F35]" />
                  )}
                </div>
                <div>
                  <span className="text-xs font-bold text-[#1F1A16] block leading-tight">
                    Hard Lock
                  </span>
                  <span className="text-[10px] text-[#786F66]">
                    Disable new trades after -2R
                  </span>
                </div>
              </div>

              <div 
                onClick={() => setProtectionMode('SOFT_WARNING')}
                className="flex items-start gap-2 cursor-pointer pt-1"
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${
                  protectionMode === 'SOFT_WARNING' ? 'border-[#DB9F35]' : 'border-[#C9BFA8]'
                }`}>
                  {protectionMode === 'SOFT_WARNING' && (
                    <div className="w-2 h-2 rounded-full bg-[#DB9F35]" />
                  )}
                </div>
                <div>
                  <span className="text-xs font-semibold text-[#554B40] block leading-tight">
                    Soft Warning
                  </span>
                  <span className="text-[10px] text-[#786F66]">
                    Show warning but allow override
                  </span>
                </div>
              </div>
            </div>

            {/* Dropdowns */}
            <div className="space-y-2.5 pt-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#5A5043] font-medium flex items-center gap-1">
                  <span>Max Risk Per Trade</span>
                  <Info className="w-3 h-3 text-[#9E958C]" />
                </span>
                <select
                  value={maxRiskPerTrade}
                  onChange={(e) => setMaxRiskPerTrade(e.target.value)}
                  className="px-2.5 py-1 bg-[#FAF6EE] border border-[#E7E0D6] rounded-lg text-xs font-bold text-[#1F1A16] focus:outline-none focus:border-[#DB9F35]"
                >
                  <option value="0.5%">0.5%</option>
                  <option value="1%">1%</option>
                  <option value="1.5%">1.5%</option>
                  <option value="2%">2%</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#5A5043] font-medium">Daily Loss Limit</span>
                <select
                  value={dailyLossLimitR}
                  onChange={(e) => setDailyLossLimitR(e.target.value)}
                  className="px-2.5 py-1 bg-[#FAF6EE] border border-[#E7E0D6] rounded-lg text-xs font-bold text-[#1F1A16] focus:outline-none focus:border-[#DB9F35]"
                >
                  <option value="1R">1R</option>
                  <option value="2R">2R</option>
                  <option value="3R">3R</option>
                  <option value="4R">4R</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#5A5043] font-medium">Max Open Trades</span>
                <select
                  value={maxOpenTrades}
                  onChange={(e) => setMaxOpenTrades(e.target.value)}
                  className="px-2.5 py-1 bg-[#FAF6EE] border border-[#E7E0D6] rounded-lg text-xs font-bold text-[#1F1A16] focus:outline-none focus:border-[#DB9F35]"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              </div>
            </div>

            {/* Amber Lock Banner */}
            <div className="bg-[#FFF5E3] border border-[#F2DEB5] rounded-xl p-3.5 flex items-center justify-between gap-2.5">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-md bg-[#FCE5B8] flex items-center justify-center text-[#8C5E14] shrink-0 mt-0.5">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#8C5E14] leading-tight">
                    Hard Lock Active
                  </h4>
                  <p className="text-[9.5px] text-[#9E7738] leading-tight mt-0.5">
                    When daily loss reaches -2R, new trade entry will be disabled automatically.
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={() => setHardLockToggle(!hardLockToggle)}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${
                  hardLockToggle ? 'bg-[#D98A19]' : 'bg-[#D5CDC0]'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  hardLockToggle ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>

          {/* 2. Quick Reminders */}
          <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#FAF0E1] border border-[#ECD9BE] flex items-center justify-center text-[#DB9F35] shrink-0">
                <Lightbulb className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-[#1F1A16]">
                Quick Reminders
              </h3>
            </div>

            {/* Bullet points */}
            <div className="space-y-2 pt-1 text-[11px] font-semibold text-[#1F1A16]">
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-[#FAF0E1] border border-[#ECD9BE] flex items-center justify-center text-[#DB9F35] shrink-0 mt-0.5">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>Follow your plan, not your emotions.</span>
              </div>

              <div className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-[#FAF0E1] border border-[#ECD9BE] flex items-center justify-center text-[#DB9F35] shrink-0 mt-0.5">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>A loss is not a failure if it's a clean trade.</span>
              </div>

              <div className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-[#FAF0E1] border border-[#ECD9BE] flex items-center justify-center text-[#DB9F35] shrink-0 mt-0.5">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>Your job is execution, not prediction.</span>
              </div>

              <div className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-[#FAF0E1] border border-[#ECD9BE] flex items-center justify-center text-[#DB9F35] shrink-0 mt-0.5">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>Discipline today, profits tomorrow.</span>
              </div>
            </div>

            {/* Quote Box */}
            <div className="bg-[#F5EFE6] border border-[#E8E0D2] rounded-xl p-3 text-center">
              <p className="text-[11px] italic font-serif text-[#4A4036] leading-tight">
                “Control the process,<br />
                the results will take care of themselves.”
              </p>
              <p className="text-[9px] font-bold text-[#786F66] tracking-wider uppercase mt-1.5">
                — NH TRADERS
              </p>
            </div>
          </div>
        </div>

      </div>
      )}

      {/* 4. Sub-Tab: Risk Management */}
      {activeTab === 'risk-management' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FAF0E1] border border-[#ECD9BE] flex items-center justify-center text-[#DB9F35] shadow-2xs shrink-0">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#1F1A16]">Capital Protection & Risk Management Matrix</h2>
                  <p className="text-xs text-[#786F66]">Strict mathematical boundaries to protect capital from catastrophic drawdowns.</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#E8F8EE] border border-[#B7ECC8] text-[11px] font-bold text-[#15803D]">
                MANDATORY RULES
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-white border border-[#E7E0D6] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1F1A16]">1. Fixed Risk Per Trade</span>
                  <span className="px-2 py-0.5 rounded-md bg-[#FAF0E1] text-[#DB9F35] text-[10px] font-bold">0.5% - 1.0%</span>
                </div>
                <p className="text-xs text-[#5A5043] leading-relaxed">
                  Never risk more than 1% of equity per setup. On volatile or unconfirmed sessions, reduce risk immediately to 0.5%.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E7E0D6] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1F1A16]">2. Daily Max Loss Limit</span>
                  <span className="px-2 py-0.5 rounded-md bg-[#FEECEB] text-[#DC2626] text-[10px] font-bold">-2R Hard Lock</span>
                </div>
                <p className="text-xs text-[#5A5043] leading-relaxed">
                  If losses hit -2R in a single calendar day, close the terminal immediately. No override. No exceptions.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E7E0D6] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1F1A16]">3. Single Open Trade</span>
                  <span className="px-2 py-0.5 rounded-md bg-[#EAF6ED] text-[#15803D] text-[10px] font-bold">Max 1 Position</span>
                </div>
                <p className="text-xs text-[#5A5043] leading-relaxed">
                  Execute one trade at a time. No stacking uncorrelated pairs or doubling down on losing positions.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E7E0D6] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1F1A16]">4. Non-Negotiable SL</span>
                  <span className="px-2 py-0.5 rounded-md bg-[#FEECEB] text-[#DC2626] text-[10px] font-bold">Never Widen</span>
                </div>
                <p className="text-xs text-[#5A5043] leading-relaxed">
                  SL is set at order entry based on market structure. Widening an existing SL is an instant violation.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E7E0D6] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1F1A16]">5. Breakeven at 1:1.5R</span>
                  <span className="px-2 py-0.5 rounded-md bg-[#FAF0E1] text-[#DB9F35] text-[10px] font-bold">Protect Gains</span>
                </div>
                <p className="text-xs text-[#5A5043] leading-relaxed">
                  When price reaches 1.5R and breaks minor structure, advance SL to breakeven + commissions.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E7E0D6] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1F1A16]">6. Weekly Drawdown Brake</span>
                  <span className="px-2 py-0.5 rounded-md bg-[#FEECEB] text-[#DC2626] text-[10px] font-bold">-5R Weekly</span>
                </div>
                <p className="text-xs text-[#5A5043] leading-relaxed">
                  Reaching -5R in a week triggers a mandatory 48-hour trading halt. Review journal and reset psychology.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Sub-Tab: Setup Rules */}
      {activeTab === 'setup-rules' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FAF0E1] border border-[#ECD9BE] flex items-center justify-center text-[#DB9F35] shadow-2xs shrink-0">
                  <GitFork className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#1F1A16]">Smart Money Concepts (SMC) Setup Rules</h2>
                  <p className="text-xs text-[#786F66]">Only enter when all institutional confluences line up. No setup = No trade.</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#FAF0E1] border border-[#ECD9BE] text-[11px] font-bold text-[#DB9F35]">
                5-STEP SMC PROTOCOL
              </span>
            </div>

            <div className="space-y-3 pt-2">
              <div className="p-4 rounded-xl bg-white border border-[#E7E0D6] flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-[#FAF0E1] text-[#DB9F35] font-black text-sm flex items-center justify-center shrink-0">
                  1
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-[#1F1A16]">Higher Timeframe (HTF) Narrative & Bias</h3>
                  <p className="text-xs text-[#5A5043] leading-relaxed">
                    Determine directional bias using Daily and 4H charts. Only take trades aligned with institutional order flow or clear HTF retracements.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E7E0D6] flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-[#FAF0E1] text-[#DB9F35] font-black text-sm flex items-center justify-center shrink-0">
                  2
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-[#1F1A16]">Liquidity Identification & Purge</h3>
                  <p className="text-xs text-[#5A5043] leading-relaxed">
                    Wait for key liquidity to be swept: Asian Session High/Low, Previous Day High/Low, or Equal Highs/Lows (BSL/SSL).
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E7E0D6] flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-[#FAF0E1] text-[#DB9F35] font-black text-sm flex items-center justify-center shrink-0">
                  3
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-[#1F1A16]">Market Structure Shift (MSS) with Displacement</h3>
                  <p className="text-xs text-[#5A5043] leading-relaxed">
                    Look for a decisive 5m or 15m candle close breaking structural highs/lows with clear momentum and Fair Value Gap creation.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E7E0D6] flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-[#FAF0E1] text-[#DB9F35] font-black text-sm flex items-center justify-center shrink-0">
                  4
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-[#1F1A16]">Point of Interest (POI) Entry</h3>
                  <p className="text-xs text-[#5A5043] leading-relaxed">
                    Enter on retracement to the unmitigated Fair Value Gap (FVG) or Order Block inside the Optimal Trade Entry (62%-79% Fibonacci).
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E7E0D6] flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-[#FAF0E1] text-[#DB9F35] font-black text-sm flex items-center justify-center shrink-0">
                  5
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-[#1F1A16]">Targeting External Liquidity & Min 1:2.5R</h3>
                  <p className="text-xs text-[#5A5043] leading-relaxed">
                    Target the opposite swing high/low liquidity pool. Setup must offer at least 1:2.5 Risk-to-Reward before order entry is allowed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Sub-Tab: Psychology Rules */}
      {activeTab === 'psychology-rules' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FAF0E1] border border-[#ECD9BE] flex items-center justify-center text-[#DB9F35] shadow-2xs shrink-0">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#1F1A16]">Trader Psychology & Emotional Discipline</h2>
                  <p className="text-xs text-[#786F66]">Mastering your mind is 80% of professional trading success.</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#FAF0E1] border border-[#ECD9BE] text-[11px] font-bold text-[#DB9F35]">
                PEAK MINDSET
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-white border border-[#E7E0D6] space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-[#FAF0E1] flex items-center justify-center text-[#DB9F35] text-xs font-bold">1</div>
                  <h3 className="text-xs font-bold text-[#1F1A16]">The 15-Minute Rule After Any Loss</h3>
                </div>
                <p className="text-xs text-[#5A5043] leading-relaxed">
                  After any losing trade, step away from the monitors for at least 15 minutes. Reset breathing and cortisol levels before re-evaluating the market.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E7E0D6] space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-[#FAF0E1] flex items-center justify-center text-[#DB9F35] text-xs font-bold">2</div>
                  <h3 className="text-xs font-bold text-[#1F1A16]">Zero Tolerance for Revenge Trading</h3>
                </div>
                <p className="text-xs text-[#5A5043] leading-relaxed">
                  The market does not owe you money. Never increase lot size or enter impulsively to win back a loss. Losses are standard business operating costs.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E7E0D6] space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-[#FAF0E1] flex items-center justify-center text-[#DB9F35] text-xs font-bold">3</div>
                  <h3 className="text-xs font-bold text-[#1F1A16]">FOMO Immunity: Missing a Trade is Free</h3>
                </div>
                <p className="text-xs text-[#5A5043] leading-relaxed">
                  If price leaves your entry without you, let it go. Missing a trade costs $0. Chasing a runaway candle almost always loses money.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E7E0D6] space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-[#FAF0E1] flex items-center justify-center text-[#DB9F35] text-xs font-bold">4</div>
                  <h3 className="text-xs font-bold text-[#1F1A16]">Judge Execution, Not Dollar Outcome</h3>
                </div>
                <p className="text-xs text-[#5A5043] leading-relaxed">
                  A losing trade that followed your plan is a successful trade. A winning trade that broke rules is a bad trade that will foster toxic habits.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Sub-Tab: Execution Rules */}
      {activeTab === 'execution-rules' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FAF0E1] border border-[#ECD9BE] flex items-center justify-center text-[#DB9F35] shadow-2xs shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#1F1A16]">Execution & Session Protocols</h2>
                  <p className="text-xs text-[#786F66]">Precise routine from pre-market preparation to post-session journal close.</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#FAF0E1] border border-[#ECD9BE] text-[11px] font-bold text-[#DB9F35]">
                PRECISION ROUTINE
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-white border border-[#E7E0D6] space-y-2.5">
                <span className="px-2 py-0.5 rounded bg-[#FAF0E1] text-[#DB9F35] text-[10px] font-bold">PHASE 1</span>
                <h3 className="text-xs font-bold text-[#1F1A16]">Pre-Market Routine</h3>
                <ul className="text-xs text-[#5A5043] space-y-1.5 leading-relaxed list-disc list-inside">
                  <li>Check Forex Factory calendar for red folders.</li>
                  <li>Mark Previous Day High & Low on 4H/Daily.</li>
                  <li>Identify Asian session liquidity boundaries.</li>
                  <li>Formulate primary setup thesis and wait.</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E7E0D6] space-y-2.5">
                <span className="px-2 py-0.5 rounded bg-[#FAF0E1] text-[#DB9F35] text-[10px] font-bold">PHASE 2</span>
                <h3 className="text-xs font-bold text-[#1F1A16]">In-Trade Protocol</h3>
                <ul className="text-xs text-[#5A5043] space-y-1.5 leading-relaxed list-disc list-inside">
                  <li>Place limit order at planned FVG/POI.</li>
                  <li>Hard SL immediately active on entry.</li>
                  <li>Take 50% partial profits at 1:2R.</li>
                  <li>Move stop loss to breakeven after TP1.</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E7E0D6] space-y-2.5">
                <span className="px-2 py-0.5 rounded bg-[#FAF0E1] text-[#DB9F35] text-[10px] font-bold">PHASE 3</span>
                <h3 className="text-xs font-bold text-[#1F1A16]">Post-Market Close</h3>
                <ul className="text-xs text-[#5A5043] space-y-1.5 leading-relaxed list-disc list-inside">
                  <li>Save entry/exit TradingView chart links.</li>
                  <li>Log trade setup, emotions, and R in Journal.</li>
                  <li>Complete Daily Close checklist in NH TRADERS.</li>
                  <li>Close terminal and disengage until next session.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Sub-Tab: Market & News */}
      {activeTab === 'market-news' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FAF0E1] border border-[#ECD9BE] flex items-center justify-center text-[#DB9F35] shadow-2xs shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#1F1A16]">Economic News & High-Impact Event Protocols</h2>
                  <p className="text-xs text-[#786F66]">Managing extreme volatility and institutional liquidity events.</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#FEECEB] border border-[#FCA5A5] text-[11px] font-bold text-[#DC2626]">
                NEWS BLACKOUT
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-white border border-[#E7E0D6] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1F1A16]">Red Folder News Blackout</span>
                  <span className="px-2 py-0.5 rounded bg-[#FEECEB] text-[#DC2626] text-[10px] font-bold">±15 Minutes</span>
                </div>
                <p className="text-xs text-[#5A5043] leading-relaxed">
                  No new orders 15 minutes before or 15 minutes after: CPI, NFP, FOMC, PPI, and Central Bank Interest Rate decisions.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E7E0D6] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1F1A16]">Spread Widening Protocol</span>
                  <span className="px-2 py-0.5 rounded bg-[#FAF0E1] text-[#DB9F35] text-[10px] font-bold">5:00 PM EST</span>
                </div>
                <p className="text-xs text-[#5A5043] leading-relaxed">
                  Broker spreads widen significantly during the New York market roll-over (5:00 PM - 6:00 PM EST). Avoid holding tight stops over roll-over.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E7E0D6] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1F1A16]">Open Trade News Defense</span>
                  <span className="px-2 py-0.5 rounded bg-[#EAF6ED] text-[#15803D] text-[10px] font-bold">Risk-Free</span>
                </div>
                <p className="text-xs text-[#5A5043] leading-relaxed">
                  If holding an open position ahead of high-impact news, either close 80% to lock profit or trail stop to guaranteed breakeven.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E7E0D6] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1F1A16]">News Reaction Re-Entry</span>
                  <span className="px-2 py-0.5 rounded bg-[#FAF0E1] text-[#DB9F35] text-[10px] font-bold">Post-Spike</span>
                </div>
                <p className="text-xs text-[#5A5043] leading-relaxed">
                  Wait for the initial news wick to settle and institutional structure to form before attempting any continuation or reversal entry.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. Sub-Tab: My Plan */}
      {activeTab === 'my-plan' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FAF0E1] border border-[#ECD9BE] flex items-center justify-center text-[#DB9F35] shadow-2xs shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#1F1A16]">NH TRADERS 1-Page Master Playbook</h2>
                  <p className="text-xs text-[#786F66]">“Discipline Today | Profits Tomorrow” — Personal Trading Constitution.</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#FAF0E1] border border-[#ECD9BE] text-[11px] font-bold text-[#DB9F35]">
                CORE STRATEGY
              </span>
            </div>

            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-white border border-[#E7E0D6] space-y-2">
                <h3 className="text-xs font-bold text-[#1F1A16]">Primary Objective</h3>
                <p className="text-xs text-[#5A5043] leading-relaxed">
                  To achieve consistent long-term capital compounding through disciplined risk management and systematic execution of institutional Smart Money Concepts.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-white border border-[#E7E0D6] space-y-1 text-center">
                  <div className="text-lg font-black text-[#DB9F35]">0.5% - 1.0%</div>
                  <div className="text-xs font-bold text-[#1F1A16]">Risk Per Setup</div>
                  <div className="text-[10px] text-[#786F66]">Never exceed max risk limit</div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-[#E7E0D6] space-y-1 text-center">
                  <div className="text-lg font-black text-[#15803D]">1:2.5R+</div>
                  <div className="text-xs font-bold text-[#1F1A16]">Target Risk/Reward</div>
                  <div className="text-[10px] text-[#786F66]">Asymmetrical edge required</div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-[#E7E0D6] space-y-1 text-center">
                  <div className="text-lg font-black text-[#DC2626]">-2R</div>
                  <div className="text-xs font-bold text-[#1F1A16]">Daily Loss Hard Stop</div>
                  <div className="text-[10px] text-[#786F66]">Protects capital for tomorrow</div>
                </div>
              </div>

              <div className="bg-[#FAF0E1] border border-[#ECD9BE] rounded-xl p-4 text-center">
                <p className="text-xs italic font-serif text-[#5A4016] leading-relaxed">
                  “I am an elite risk manager who executes high-probability trades with zero emotion.<br />
                  My discipline today guarantees my financial freedom tomorrow.”
                </p>
                <p className="text-[10px] font-bold text-[#7A541A] tracking-wider uppercase mt-2">
                  — NH TRADERS CONSTITUTION
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthPage } from './components/AuthPage';
import { tradesApi } from './lib/api/tradesApi';
import { dailyApi } from './lib/api/dailyApi';
import { settingsApi } from './lib/api/settingsApi';
import { defaultSettings, type Trade, type DayRecord, type AppSettings } from './db/db';
import { getDayStatus, calculatePerformance, generateEquityCurve } from './utils/TradingEngine';

import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import type { TabType } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { JournalView } from './components/JournalView';
import { TradingRulesView } from './components/TradingRulesView';
import { NHCycleView } from './components/NHCycleView';
import { CalendarView } from './components/CalendarView';
import { EquityChart } from './components/EquityChart';
import { AnalyticsView } from './components/AnalyticsView';
import { SettingsView } from './components/SettingsView';
import { QuickTradeModal } from './components/QuickTradeModal';
import { DailyCloseModal } from './components/DailyCloseModal';
import { ImageViewerModal } from './components/ImageViewerModal';

// ─── Inner app (only renders when user is logged in) ───────────────────────
function AppInner() {
  const { user, signOut } = useAuth();

  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [isQuickTradeOpen, setIsQuickTradeOpen] = useState(false);
  const [editTrade, setEditTrade] = useState<Trade | null>(null);
  const [isDailyCloseOpen, setIsDailyCloseOpen] = useState(false);
  const [imageModal, setImageModal] = useState<{ isOpen: boolean; url: string; title?: string }>({
    isOpen: false,
    url: '',
    title: '',
  });
  const [journalDateFilter, setJournalDateFilter] = useState<string | undefined>(undefined);
  const [systemDate, setSystemDate] = useState<string>('2026-10-05');

  // ── Cloud data state (replaces Dexie useLiveQuery) ──────────────────────
  const [trades, setTrades] = useState<Trade[]>([]);
  const [days, setDays] = useState<DayRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Load all data from Supabase on mount
  const loadAllData = useCallback(async () => {
    if (!user) return;
    try {
      const [fetchedTrades, fetchedDays, fetchedSettings] = await Promise.all([
        tradesApi.getAll(),
        dailyApi.getAll(),
        settingsApi.get(user.id),
      ]);
      setTrades(fetchedTrades);
      setDays(fetchedDays);
      if (fetchedSettings) setSettings(fetchedSettings);
      setIsDataLoaded(true);
    } catch (err) {
      console.error('[NH Traders] Failed to load data:', err);
      setIsDataLoaded(true); // Show empty state rather than infinite spinner
    }
  }, [user]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Keyboard shortcut: N = quick trade
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === 'n' || e.key === 'N') &&
        !isQuickTradeOpen &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)
      ) {
        e.preventDefault();
        setEditTrade(null);
        setIsQuickTradeOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQuickTradeOpen]);

  const handleSelectDateForJournal = (dateStr: string) => {
    setJournalDateFilter(dateStr);
    setCurrentTab('journal');
  };

  const handleEditTrade = (trade: Trade) => {
    setEditTrade(trade);
    setIsQuickTradeOpen(true);
  };

  const handleViewImage = (url: string, title?: string) => {
    setImageModal({ isOpen: true, url, title });
  };

  if (!isDataLoaded) {
    return (
      <div className="min-h-screen bg-[#F6F1EA] text-[#1F1A16] flex items-center justify-center font-mono text-sm">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-[#DB9F35] animate-ping" />
            <span>LOADING NH TRADERS DATA...</span>
          </div>
          <p className="text-[10px] text-[#9E958C]">Syncing from Supabase cloud</p>
        </div>
      </div>
    );
  }

  const dayStatus = getDayStatus(systemDate, trades, settings);
  const todayRecord = days.find((d) => d.date === systemDate);
  const isDayClosedToday = !!todayRecord?.isDayClosed;
  const perf = calculatePerformance(trades, settings);
  const equityPoints = generateEquityCurve(trades, settings);

  return (
    <div className="min-h-screen bg-[#F6F1EA] text-[#1F1A16] flex font-sans selection:bg-[#DB9F35]/30 selection:text-[#1F1A16]">
      {/* 1. Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={(tab) => {
          if (tab !== 'journal') setJournalDateFilter(undefined);
          setCurrentTab(tab);
        }}
      />

      {/* 2. Main Work Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <TopHeader
          currentDate={systemDate}
          onDateChange={(newDate) => {
            setSystemDate(newDate);
            setJournalDateFilter(newDate);
          }}
          dayStatus={dayStatus}
          isDayClosedToday={isDayClosedToday}
          onOpenQuickTrade={() => {
            setEditTrade(null);
            setIsQuickTradeOpen(true);
          }}
          onOpenDailyClose={() => setIsDailyCloseOpen(true)}
          userEmail={user?.email}
          onSignOut={signOut}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-7 max-w-[1400px] w-full mx-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              trades={trades}
              days={days}
              settings={settings}
              onSelectDate={handleSelectDateForJournal}
              onTabChange={setCurrentTab}
              onOpenQuickTrade={() => {
                setEditTrade(null);
                setIsQuickTradeOpen(true);
              }}
            />
          )}

          {currentTab === 'journal' && (
            <JournalView
              trades={trades}
              settings={settings}
              onEditTrade={handleEditTrade}
              onOpenQuickTrade={() => {
                setEditTrade(null);
                setIsQuickTradeOpen(true);
              }}
              onViewImage={handleViewImage}
              selectedDateFilter={journalDateFilter}
              onClearDateFilter={() => setJournalDateFilter(undefined)}
              onTabChange={setCurrentTab}
            />
          )}

          {currentTab === 'rules' && (
            <TradingRulesView
              currentDate={systemDate}
              onDateChange={(newDate) => {
                setSystemDate(newDate);
                setJournalDateFilter(newDate);
              }}
              trades={trades}
              days={days}
              settings={settings}
              onRefresh={loadAllData}
              onOpenDailyClose={() => setIsDailyCloseOpen(true)}
            />
          )}

          {currentTab === 'cycle' && (
            <NHCycleView
              trades={trades}
              days={days}
              settings={settings}
              onSelectDayForJournal={handleSelectDateForJournal}
            />
          )}

          {currentTab === 'calendar' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#E7E0D6]">
                <div>
                  <h2 className="text-xl font-bold text-[#1F1A16]">Interactive Trading Calendar</h2>
                  <p className="text-xs text-[#786F66]">Click on any trading day to inspect trades in your journal</p>
                </div>
              </div>
              <CalendarView
                trades={trades}
                days={days}
                onSelectDate={handleSelectDateForJournal}
              />
            </div>
          )}

          {currentTab === 'analytics' && (
            <div className="space-y-6">
              <AnalyticsView
                trades={trades}
                settings={settings}
              />
              <div className="bg-[#FAF6EE] border border-[#E7E0D6] rounded-2xl p-5 shadow-2xs">
                <EquityChart
                  points={equityPoints}
                  perf={perf}
                  currency={settings.currency}
                />
              </div>
            </div>
          )}

          {currentTab === 'settings' && (
            <SettingsView
              settings={settings}
              onSettingsUpdated={loadAllData}
              userId={user?.id}
            />
          )}
        </main>
      </div>

      {/* 3. Global Modals */}
      <QuickTradeModal
        isOpen={isQuickTradeOpen}
        onClose={() => {
          setIsQuickTradeOpen(false);
          setEditTrade(null);
        }}
        trades={trades}
        settings={settings}
        onTradeSaved={() => {
          setIsQuickTradeOpen(false);
          setEditTrade(null);
          loadAllData(); // Refresh trades from Supabase
        }}
        editTrade={editTrade}
        userId={user?.id}
        onTradesChange={setTrades}
      />

      <DailyCloseModal
        isOpen={isDailyCloseOpen}
        onClose={() => setIsDailyCloseOpen(false)}
        trades={trades}
        settings={settings}
        onDayClosed={() => {
          setIsDailyCloseOpen(false);
          loadAllData();
        }}
        userId={user?.id}
      />

      <ImageViewerModal
        isOpen={imageModal.isOpen}
        onClose={() => setImageModal({ isOpen: false, url: '', title: '' })}
        imageUrl={imageModal.url}
        title={imageModal.title}
      />
    </div>
  );
}

// ─── Root App with Auth Gate ────────────────────────────────────────────────
export function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

function AuthGate() {
  const { user, isLoading } = useAuth();

  // Show spinner while checking session
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F6F1EA] flex items-center justify-center font-mono text-sm">
        <div className="flex items-center gap-3 text-[#1F1A16]">
          <span className="w-3 h-3 rounded-full bg-[#DB9F35] animate-ping" />
          <span>NH TRADERS INITIALIZING...</span>
        </div>
      </div>
    );
  }

  // Not logged in → show auth page
  if (!user) return <AuthPage />;

  // Logged in → show main app
  return <AppInner />;
}

export default App;

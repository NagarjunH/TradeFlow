import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
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

// ─── Code-Split Secondary Views & Modals (loaded on-demand) ─────────────────
const JournalView = lazy(() => import('./components/JournalView').then((m) => ({ default: m.JournalView })));
const NHCycleView = lazy(() => import('./components/NHCycleView').then((m) => ({ default: m.NHCycleView })));
const EquityChart = lazy(() => import('./components/EquityChart').then((m) => ({ default: m.EquityChart })));
const AnalyticsView = lazy(() => import('./components/AnalyticsView').then((m) => ({ default: m.AnalyticsView })));
const Challenge21View = lazy(() => import('./components/Challenge21View').then((m) => ({ default: m.Challenge21View })));
const NotesView = lazy(() => import('./components/NotesView').then((m) => ({ default: m.NotesView })));
const SettingsView = lazy(() => import('./components/SettingsView').then((m) => ({ default: m.SettingsView })));
const QuickTradeModal = lazy(() => import('./components/QuickTradeModal').then((m) => ({ default: m.QuickTradeModal })));
const DailyCloseModal = lazy(() => import('./components/DailyCloseModal').then((m) => ({ default: m.DailyCloseModal })));
const ImageViewerModal = lazy(() => import('./components/ImageViewerModal').then((m) => ({ default: m.ImageViewerModal })));

function TabSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl w-44" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="h-28 bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl" />
        <div className="h-28 bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl" />
        <div className="h-28 bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl" />
      </div>
      <div className="h-64 bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl" />
    </div>
  );
}

// ─── Inner app (only renders when user is logged in) ───────────────────────
function AppInner() {
  const { user, signOut } = useAuth();

  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isQuickTradeOpen, setIsQuickTradeOpen] = useState(false);
  const [editTrade, setEditTrade] = useState<Trade | null>(null);
  const [isDailyCloseOpen, setIsDailyCloseOpen] = useState(false);
  const [imageModal, setImageModal] = useState<{ isOpen: boolean; url: string; title?: string }>({
    isOpen: false,
    url: '',
    title: '',
  });
  const [journalDateFilter, setJournalDateFilter] = useState<string | undefined>(undefined);
  const [systemDate, setSystemDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // ── Cloud & Local data state (SWR reactive data) ──────────────────────
  const [trades, setTrades] = useState<Trade[]>([]);
  const [days, setDays] = useState<DayRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [_isDataLoaded, setIsDataLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load all data with Stale-While-Revalidate:
  // 1. Instant local read (<50ms)
  // 2. Silent cloud fetch in background
  const loadAllData = useCallback(async () => {
    if (!user) return;

    // Step 1: Fast local read
    try {
      const [localTrades, localDays, localSettings] = await Promise.all([
        tradesApi.getLocal(),
        dailyApi.getLocal(),
        settingsApi.getLocal(),
      ]);
      if (localTrades.length > 0) setTrades(localTrades);
      if (localDays.length > 0) setDays(localDays);
      setSettings(localSettings);
      setIsDataLoaded(true);
    } catch (localErr) {
      console.warn('[TradeFlow] Local cache load warning:', localErr);
    }

    // Step 2: Background cloud sync
    setIsSyncing(true);
    try {
      const [tradesRes, daysRes, settingsRes] = await Promise.allSettled([
        tradesApi.getAll(),
        dailyApi.getAll(),
        settingsApi.get(user.id),
      ]);

      if (tradesRes.status === 'fulfilled' && tradesRes.value) {
        setTrades(tradesRes.value);
      }
      if (daysRes.status === 'fulfilled' && daysRes.value) {
        setDays(daysRes.value);
      }
      if (settingsRes.status === 'fulfilled' && settingsRes.value) {
        setSettings(settingsRes.value);
      }
    } catch (err) {
      console.error('[TradeFlow] Cloud sync warning:', err);
    } finally {
      setIsDataLoaded(true);
      setIsSyncing(false);
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

  const handleDeleteTrade = async (trade: Trade) => {
    const tradeId = trade.id;
    const tradeUuid = (trade as any)._uuid;

    // Optimistically remove from state
    setTrades((prev) => prev.filter((t) => t.id !== tradeId && (!tradeUuid || (t as any)._uuid !== tradeUuid)));

    try {
      if (tradeUuid) {
        await tradesApi.delete(tradeUuid);
      } else if (tradeId) {
        await tradesApi.delete(String(tradeId));
      }
    } catch (err) {
      console.error('[TradeFlow] Failed to delete trade:', err);
    }
  };

  const handleUpdateTrade = async (uuid: string, updates: Partial<Trade>) => {
    // Optimistically update state
    setTrades((prev) =>
      prev.map((t) =>
        (t as any)._uuid === uuid || String(t.id) === uuid ? { ...t, ...updates } : t
      )
    );

    try {
      await tradesApi.update(uuid, updates);
    } catch (err) {
      console.error('[TradeFlow] Failed to update trade:', err);
    }
  };

  const handleViewImage = (url: string, title?: string) => {
    setImageModal({ isOpen: true, url, title });
  };

  // Performance computations
  const perf = calculatePerformance(trades, settings);
  const dayStatus = getDayStatus(systemDate, trades, settings);
  const equityPoints = generateEquityCurve(trades, settings);

  const isDayClosedToday = days.some((d) => d.date === systemDate && d.isDayClosed);

  return (
    <div className="flex h-screen bg-[#F6F1EA] dark:bg-[#0B0E14] text-[#1F1A16] dark:text-[#F0F4F8] transition-colors overflow-hidden">
      
      {/* 1. Permanent Desktop & Slide-out Mobile Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={(tab) => {
          if (tab !== 'journal') setJournalDateFilter(undefined);
          setCurrentTab(tab);
        }}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* 2. Main Work Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <TopHeader
          currentDate={systemDate}
          onDateChange={(newDate) => {
            setSystemDate(newDate);
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
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          isSyncing={isSyncing}
        />

        <main className="flex-1 p-3 sm:p-6 lg:p-7 max-w-[1400px] w-full mx-auto">
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

          <Suspense fallback={<TabSkeleton />}>
            {currentTab === 'journal' && (
              <JournalView
                trades={trades}
                settings={settings}
                onEditTrade={handleEditTrade}
                onDeleteTrade={handleDeleteTrade}
                onUpdateTrade={handleUpdateTrade}
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

            {currentTab === 'cycle' && (
              <NHCycleView
                trades={trades}
                days={days}
                settings={settings}
                onSelectDayForJournal={handleSelectDateForJournal}
              />
            )}

            {currentTab === 'challenge21' && (
              <Challenge21View
                trades={trades}
                days={days}
                settings={settings}
                onSelectDate={handleSelectDateForJournal}
                onTabChange={setCurrentTab}
              />
            )}

            {currentTab === 'calendar' && (
              <NHCycleView
                trades={trades}
                days={days}
                settings={settings}
                onSelectDayForJournal={handleSelectDateForJournal}
              />
            )}

            {currentTab === 'notes' && (
              <NotesView
                trades={trades}
                settings={settings}
                onSelectDateForJournal={handleSelectDateForJournal}
                onTabChange={setCurrentTab}
              />
            )}

            {currentTab === 'analytics' && (
              <div className="space-y-6">
                <AnalyticsView
                  trades={trades}
                  settings={settings}
                />
                <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-5 shadow-2xs transition-colors">
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
          </Suspense>
        </main>
      </div>

      {/* 3. Global Lazy Modals */}
      <Suspense fallback={null}>
        {isQuickTradeOpen && (
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
              loadAllData();
            }}
            editTrade={editTrade}
            userId={user?.id}
            onTradesChange={setTrades}
          />
        )}

        {isDailyCloseOpen && (
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
        )}

        {imageModal.isOpen && (
          <ImageViewerModal
            isOpen={imageModal.isOpen}
            onClose={() => setImageModal({ isOpen: false, url: '', title: '' })}
            imageUrl={imageModal.url}
            title={imageModal.title}
          />
        )}
      </Suspense>
    </div>
  );
}

// ─── Root App with ThemeProvider & Auth Gate ────────────────────────────────
export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </ThemeProvider>
  );
}

function AuthGate() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F6F1EA] dark:bg-[#0B0E14] flex items-center justify-center font-mono text-sm transition-colors">
        <div className="flex items-center gap-3 text-[#1F1A16] dark:text-[#F0F4F8]">
          <span className="w-3 h-3 rounded-full bg-[#10B981] animate-ping" />
          <span className="font-bold">TRADEFLOW INITIALIZING...</span>
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return <AppInner />;
}

export default App;

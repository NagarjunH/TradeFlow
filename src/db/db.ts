import Dexie, { type Table } from 'dexie';

export type ExitType = 'TARGET' | 'STOP_LOSS' | 'MANUAL_EXIT' | 'BREAKEVEN';
export type TradeQuality = 'CLEAN' | 'MANAGEABLE_MISTAKE' | 'VIOLATION';
export type EmotionType = 'CALM' | 'FOCUSED' | 'FOMO' | 'REVENGE' | 'GREED' | 'HESITANT' | 'BOREDOM';
export type ViolationType = 'FOMO' | 'Moved SL' | 'Revenge' | 'No Setup' | 'Over-risk' | 'Chased Price' | 'Impulsive Exit' | 'None';
export type ProtectionMode = 'HARD_LOCK' | 'SOFT_WARNING';

export interface Trade {
  id?: number;
  tradeNumber: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  pair: string;
  order: 'BUY' | 'SELL';
  lotSize: number;
  entryPrice?: number;
  slPrice?: number;
  tpPrice?: number;
  pnl: number;
  rMultiple: number;
  pips?: number;
  exitType: ExitType;
  tradeQuality: TradeQuality;
  emotion: EmotionType;
  execution: 'CLEAN' | 'VIOLATION';
  violationReason?: ViolationType;
  setupType?: string;
  htfContext?: 'Bullish' | 'Bearish' | 'Neutral';
  entryReason?: string;
  session?: 'London' | 'New York' | 'Asian' | 'London/NY Overlap';
  chartScreenshot?: string; // base64
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DayRecord {
  date: string; // YYYY-MM-DD (Primary Key)
  cycleDay?: number; // 1..31
  isNoTradeDay?: boolean;
  noTradeReason?: 'No Setup' | 'Daily Limit Hit' | 'Market Conditions' | 'Personal' | 'Planned Rest';
  rules: {
    riskManagement: boolean; // 0.5-1% max
    dailyLossLimit: boolean; // Daily limit respected
    slPredefined: boolean; // Predefined & never widened
    noAveragingDown: boolean;
    htfContextClear: boolean;
    smcSequenceFollowed: boolean; // Liquidity -> MSS -> POI
    noEmotionalTrade: boolean; // No FOMO/Revenge
    newsChecked: boolean;
  };
  isDayClosed?: boolean;
  closingNotes?: string;
  updatedAt: string;
}

export interface AppSettings {
  id: string; // 'settings'
  initialCapital: number;
  currentBalance: number;
  currency: 'USD' | 'INR';
  defaultPair: string;
  defaultLot: number;
  riskPerTradePercent: number;
  dailyLossLimitR: number;
  protectionMode: ProtectionMode;
  defaultSession: 'London' | 'New York' | 'Asian' | 'London/NY Overlap';
  theme: 'Dark';
}

export interface AuditLog {
  id?: number;
  tradeId?: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'OVERRIDE_LOCK' | 'DAY_CLOSE' | 'RESET';
  details: string;
  timestamp: string;
}

export class NHTradersDatabase extends Dexie {
  trades!: Table<Trade, number>;
  days!: Table<DayRecord, string>;
  settings!: Table<AppSettings, string>;
  auditLogs!: Table<AuditLog, number>;

  constructor() {
    super('NHTradersDB');
    this.version(1).stores({
      trades: '++id, tradeNumber, date, pair, order, execution, emotion, exitType, rMultiple',
      days: 'date, cycleDay, isNoTradeDay',
      settings: 'id',
      auditLogs: '++id, tradeId, action, timestamp',
    });
  }
}

export const db = new NHTradersDatabase();

export const defaultSettings: AppSettings = {
  id: 'settings',
  initialCapital: 1000,
  currentBalance: 1000,
  currency: 'USD',
  defaultPair: 'XAUUSD',
  defaultLot: 0.01,
  riskPerTradePercent: 1.0,
  dailyLossLimitR: 2.0,
  protectionMode: 'HARD_LOCK',
  defaultSession: 'London/NY Overlap',
  theme: 'Dark',
};

// Seed initial realistic data matching user's uploaded Notion screenshot
export async function seedInitialDataIfEmpty() {
  const count = await db.trades.count();
  if (count === 0) {
    // Initialize settings
    await db.settings.put(defaultSettings);

    const initialTrades: Omit<Trade, 'id'>[] = [
      {
        tradeNumber: 1,
        date: '2025-12-22',
        time: '14:30',
        pair: 'XAU/USD',
        order: 'SELL',
        lotSize: 0.01,
        entryPrice: 2654.5,
        slPrice: 2658.0,
        tpPrice: 2645.0,
        pnl: -3.56,
        rMultiple: -1.0,
        pips: -35.6,
        exitType: 'STOP_LOSS',
        tradeQuality: 'CLEAN',
        emotion: 'CALM',
        execution: 'CLEAN',
        violationReason: 'None',
        setupType: 'Liquidity Sweep + MSS',
        htfContext: 'Bearish',
        entryReason: 'Sweep of Asian high into 4H FVG',
        session: 'London',
        createdAt: '2025-12-22T14:30:00.000Z',
        updatedAt: '2025-12-22T15:10:00.000Z',
      },
      {
        tradeNumber: 2,
        date: '2025-12-22',
        time: '16:15',
        pair: 'XAU/USD',
        order: 'BUY',
        lotSize: 0.01,
        entryPrice: 2648.2,
        slPrice: 2644.0,
        tpPrice: 2660.0,
        pnl: 4.32,
        rMultiple: 1.2,
        pips: 43.2,
        exitType: 'MANUAL_EXIT',
        tradeQuality: 'CLEAN',
        emotion: 'CALM',
        execution: 'CLEAN',
        violationReason: 'None',
        setupType: 'FVG Retest',
        htfContext: 'Bullish',
        entryReason: 'NY open liquidity tap and 5m displacement',
        session: 'New York',
        createdAt: '2025-12-22T16:15:00.000Z',
        updatedAt: '2025-12-22T17:00:00.000Z',
      },
      {
        tradeNumber: 3,
        date: '2025-12-22',
        time: '18:40',
        pair: 'XAU/USD',
        order: 'SELL',
        lotSize: 0.01,
        entryPrice: 2652.1,
        slPrice: 2655.0,
        tpPrice: 2640.0,
        pnl: -0.34,
        rMultiple: -0.1,
        pips: -3.4,
        exitType: 'MANUAL_EXIT',
        tradeQuality: 'MANAGEABLE_MISTAKE',
        emotion: 'FOMO',
        execution: 'VIOLATION',
        violationReason: 'FOMO',
        setupType: 'Mid-range Entry',
        htfContext: 'Neutral',
        entryReason: 'Price moved fast so jumped in early without POI confirmation',
        session: 'New York',
        createdAt: '2025-12-22T18:40:00.000Z',
        updatedAt: '2025-12-22T18:55:00.000Z',
      },
      {
        tradeNumber: 5,
        date: '2025-12-22',
        time: '20:10',
        pair: 'XAU/USD',
        order: 'SELL',
        lotSize: 0.01,
        entryPrice: 2659.8,
        slPrice: 2663.0,
        tpPrice: 2650.0,
        pnl: 8.46,
        rMultiple: 2.6,
        pips: 84.6,
        exitType: 'TARGET',
        tradeQuality: 'CLEAN',
        emotion: 'FOCUSED',
        execution: 'CLEAN',
        violationReason: 'None',
        setupType: 'MSS + FVG',
        htfContext: 'Bearish',
        entryReason: 'Clean 15m MSS displacement and mitigation tap',
        session: 'London/NY Overlap',
        createdAt: '2025-12-22T20:10:00.000Z',
        updatedAt: '2025-12-22T21:20:00.000Z',
      },
      {
        tradeNumber: 6,
        date: '2025-12-24',
        time: '15:20',
        pair: 'XAU/USD',
        order: 'SELL',
        lotSize: 0.01,
        entryPrice: 2642.0,
        slPrice: 2645.5,
        tpPrice: 2632.0,
        pnl: -3.65,
        rMultiple: -1.0,
        pips: -36.5,
        exitType: 'STOP_LOSS',
        tradeQuality: 'CLEAN',
        emotion: 'CALM',
        execution: 'CLEAN',
        violationReason: 'None',
        setupType: 'Liquidity Sweep',
        htfContext: 'Bearish',
        entryReason: 'Valid plan, London high sweep. Price continued. Clean loss.',
        session: 'London',
        createdAt: '2025-12-24T15:20:00.000Z',
        updatedAt: '2025-12-24T15:50:00.000Z',
      },
      {
        tradeNumber: 7,
        date: '2025-12-24',
        time: '16:05',
        pair: 'XAU/USD',
        order: 'SELL',
        lotSize: 0.01,
        entryPrice: 2646.0,
        slPrice: 2649.5,
        tpPrice: 2635.0,
        pnl: -3.47,
        rMultiple: -1.0,
        pips: -34.7,
        exitType: 'STOP_LOSS',
        tradeQuality: 'VIOLATION',
        emotion: 'FOMO',
        execution: 'VIOLATION',
        violationReason: 'Revenge',
        setupType: 'Chased Move',
        htfContext: 'Bearish',
        entryReason: 'Re-entered immediately after SL hit to recover loss. Broke rule.',
        session: 'London',
        createdAt: '2025-12-24T16:05:00.000Z',
        updatedAt: '2025-12-24T16:30:00.000Z',
      },
    ];

    await db.trades.bulkAdd(initialTrades as Trade[]);

    // Seed Day records
    await db.days.put({
      date: '2025-12-22',
      cycleDay: 22,
      isNoTradeDay: false,
      rules: {
        riskManagement: true,
        dailyLossLimit: true,
        slPredefined: true,
        noAveragingDown: true,
        htfContextClear: true,
        smcSequenceFollowed: true,
        noEmotionalTrade: false,
        newsChecked: true,
      },
      isDayClosed: true,
      closingNotes: 'Solid day overall (+8.88), but trade #3 was unnecessary FOMO.',
      updatedAt: '2025-12-22T22:00:00.000Z',
    });

    await db.days.put({
      date: '2025-12-24',
      cycleDay: 24,
      isNoTradeDay: false,
      rules: {
        riskManagement: true,
        dailyLossLimit: false,
        slPredefined: true,
        noAveragingDown: true,
        htfContextClear: true,
        smcSequenceFollowed: false,
        noEmotionalTrade: false,
        newsChecked: true,
      },
      isDayClosed: true,
      closingNotes: 'Hit -2R daily limit. Trade #7 was revenge. Stopped trading.',
      updatedAt: '2025-12-24T17:00:00.000Z',
    });

    await db.days.put({
      date: '2025-12-23',
      cycleDay: 23,
      isNoTradeDay: true,
      noTradeReason: 'No Setup',
      rules: {
        riskManagement: true,
        dailyLossLimit: true,
        slPredefined: true,
        noAveragingDown: true,
        htfContextClear: true,
        smcSequenceFollowed: true,
        noEmotionalTrade: true,
        newsChecked: true,
      },
      isDayClosed: true,
      closingNotes: 'No clean POI mitigation. Market consolidated. Disciplined no-trade day.',
      updatedAt: '2025-12-23T20:00:00.000Z',
    });
  }

  // Seed October 2026 trades from nh-traders-spa if not present
  const octTradesCount = await db.trades.filter((t) => t.date.startsWith('2026-10')).count();
  if (octTradesCount === 0) {
    const octTrades: Omit<Trade, 'id'>[] = [
      {
        tradeNumber: 10,
        date: '2026-10-01',
        time: '11:22',
        pair: 'XAUUSD',
        order: 'BUY',
        lotSize: 0.01,
        entryPrice: 2638.2,
        slPrice: 2635.2,
        tpPrice: 2644.2,
        pnl: 165.1,
        rMultiple: 3.0,
        pips: 60,
        exitType: 'TARGET',
        tradeQuality: 'CLEAN',
        emotion: 'CALM',
        execution: 'CLEAN',
        violationReason: 'None',
        setupType: 'FVG Retest',
        htfContext: 'Bullish',
        entryReason: 'Textbook trade from 4H POI',
        session: 'London',
        createdAt: '2026-10-01T11:22:00.000Z',
        updatedAt: '2026-10-01T12:30:00.000Z',
      },
      {
        tradeNumber: 11,
        date: '2026-10-01',
        time: '14:10',
        pair: 'XAUUSD',
        order: 'SELL',
        lotSize: 0.01,
        entryPrice: 2642.0,
        slPrice: 2644.5,
        tpPrice: 2638.0,
        pnl: -82.4,
        rMultiple: -1.5,
        pips: -35,
        exitType: 'MANUAL_EXIT',
        tradeQuality: 'VIOLATION',
        emotion: 'FOMO',
        execution: 'VIOLATION',
        violationReason: 'No Setup',
        setupType: 'Chased Move',
        htfContext: 'Bearish',
        entryReason: 'Should have waited for mitigation tap',
        session: 'London',
        createdAt: '2026-10-01T14:10:00.000Z',
        updatedAt: '2026-10-01T14:45:00.000Z',
      },
      {
        tradeNumber: 12,
        date: '2026-10-02',
        time: '09:05',
        pair: 'XAUUSD',
        order: 'SELL',
        lotSize: 0.01,
        entryPrice: 2644.5,
        slPrice: 2646.5,
        tpPrice: 2640.5,
        pnl: 109.2,
        rMultiple: 2.0,
        pips: 40,
        exitType: 'TARGET',
        tradeQuality: 'CLEAN',
        emotion: 'FOCUSED',
        execution: 'CLEAN',
        violationReason: 'None',
        setupType: 'MSS + FVG',
        htfContext: 'Bearish',
        entryReason: 'Nice setup with clear displacement',
        session: 'London',
        createdAt: '2026-10-02T09:05:00.000Z',
        updatedAt: '2026-10-02T10:15:00.000Z',
      },
      {
        tradeNumber: 13,
        date: '2026-10-02',
        time: '15:18',
        pair: 'XAUUSD',
        order: 'BUY',
        lotSize: 0.01,
        entryPrice: 2646.8,
        slPrice: 2644.8,
        tpPrice: 2646.8,
        pnl: 0.0,
        rMultiple: 0.0,
        pips: 0,
        exitType: 'BREAKEVEN',
        tradeQuality: 'CLEAN',
        emotion: 'CALM',
        execution: 'CLEAN',
        violationReason: 'None',
        setupType: 'Order Block Tap',
        htfContext: 'Neutral',
        entryReason: 'Target partially hit, moved stop to BE',
        session: 'New York',
        createdAt: '2026-10-02T15:18:00.000Z',
        updatedAt: '2026-10-02T16:00:00.000Z',
      },
      {
        tradeNumber: 14,
        date: '2026-10-03',
        time: '10:22',
        pair: 'XAUUSD',
        order: 'BUY',
        lotSize: 0.02,
        entryPrice: 2648.2,
        slPrice: 2645.5,
        tpPrice: 2654.0,
        pnl: 162.3,
        rMultiple: 3.0,
        pips: 60,
        exitType: 'TARGET',
        tradeQuality: 'CLEAN',
        emotion: 'CALM',
        execution: 'CLEAN',
        violationReason: 'None',
        setupType: 'Liquidity Sweep + MSS',
        htfContext: 'Bullish',
        entryReason: 'Captured full move cleanly',
        session: 'London',
        createdAt: '2026-10-03T10:22:00.000Z',
        updatedAt: '2026-10-03T11:45:00.000Z',
      },
      {
        tradeNumber: 15,
        date: '2026-10-03',
        time: '13:40',
        pair: 'XAUUSD',
        order: 'SELL',
        lotSize: 0.01,
        entryPrice: 2652.1,
        slPrice: 2654.1,
        tpPrice: 2650.1,
        pnl: -110.6,
        rMultiple: -1.0,
        pips: -20,
        exitType: 'STOP_LOSS',
        tradeQuality: 'VIOLATION',
        emotion: 'REVENGE',
        execution: 'VIOLATION',
        violationReason: 'Revenge',
        setupType: 'Liquidity Sweep',
        htfContext: 'Bearish',
        entryReason: 'Revenge trade after minor pullback',
        session: 'London',
        createdAt: '2026-10-03T13:40:00.000Z',
        updatedAt: '2026-10-03T14:10:00.000Z',
      },
      {
        tradeNumber: 16,
        date: '2026-10-04',
        time: '14:28',
        pair: 'XAUUSD',
        order: 'SELL',
        lotSize: 0.01,
        entryPrice: 2654.0,
        slPrice: 2656.5,
        tpPrice: 2651.5,
        pnl: -55.1,
        rMultiple: -1.0,
        pips: -25,
        exitType: 'STOP_LOSS',
        tradeQuality: 'VIOLATION',
        emotion: 'FOMO',
        execution: 'VIOLATION',
        violationReason: 'FOMO',
        setupType: 'Chased Move',
        htfContext: 'Bearish',
        entryReason: 'Chased entry after fast market spike',
        session: 'New York',
        createdAt: '2026-10-04T14:28:00.000Z',
        updatedAt: '2026-10-04T14:50:00.000Z',
      },
      {
        tradeNumber: 17,
        date: '2026-10-04',
        time: '16:05',
        pair: 'XAUUSD',
        order: 'BUY',
        lotSize: 0.01,
        entryPrice: 2650.3,
        slPrice: 2648.3,
        tpPrice: 2652.5,
        pnl: 54.8,
        rMultiple: 1.0,
        pips: 20,
        exitType: 'TARGET',
        tradeQuality: 'CLEAN',
        emotion: 'FOCUSED',
        execution: 'CLEAN',
        violationReason: 'None',
        setupType: 'FVG Retest',
        htfContext: 'Bullish',
        entryReason: 'Good patience waiting for retest',
        session: 'New York',
        createdAt: '2026-10-04T16:05:00.000Z',
        updatedAt: '2026-10-04T16:45:00.000Z',
      },
      {
        tradeNumber: 18,
        date: '2026-10-05',
        time: '10:12',
        pair: 'XAUUSD',
        order: 'BUY',
        lotSize: 0.01,
        entryPrice: 2650.32,
        slPrice: 2646.1,
        tpPrice: 2658.8,
        pnl: 138.2,
        rMultiple: 2.5,
        pips: 85,
        exitType: 'TARGET',
        tradeQuality: 'CLEAN',
        emotion: 'CALM',
        execution: 'CLEAN',
        violationReason: 'None',
        setupType: 'MSS + FVG',
        htfContext: 'Bullish',
        entryReason: 'Perfect execution of morning session setup',
        session: 'London',
        createdAt: '2026-10-05T10:12:00.000Z',
        updatedAt: '2026-10-05T11:00:00.000Z',
      },
      {
        tradeNumber: 19,
        date: '2026-10-05',
        time: '11:03',
        pair: 'XAUUSD',
        order: 'SELL',
        lotSize: 0.01,
        entryPrice: 2658.1,
        slPrice: 2662.8,
        tpPrice: 2650.4,
        pnl: -55.4,
        rMultiple: -1.0,
        pips: -40,
        exitType: 'STOP_LOSS',
        tradeQuality: 'CLEAN',
        emotion: 'CALM',
        execution: 'CLEAN',
        violationReason: 'None',
        setupType: 'Liquidity Sweep',
        htfContext: 'Bearish',
        entryReason: 'SL hit as planned, controlled risk',
        session: 'London',
        createdAt: '2026-10-05T11:03:00.000Z',
        updatedAt: '2026-10-05T11:35:00.000Z',
      },
      {
        tradeNumber: 20,
        date: '2026-10-05',
        time: '14:32',
        pair: 'XAUUSD',
        order: 'BUY',
        lotSize: 0.01,
        entryPrice: 2651.0,
        slPrice: 2647.5,
        tpPrice: 2658.0,
        pnl: 80.52,
        rMultiple: 2.0,
        pips: 70,
        exitType: 'TARGET',
        tradeQuality: 'CLEAN',
        emotion: 'CALM',
        execution: 'CLEAN',
        violationReason: 'None',
        setupType: 'MSS + FVG',
        htfContext: 'Bullish',
        entryReason: 'Clean 15m MSS displacement and mitigation tap',
        session: 'New York',
        createdAt: '2026-10-05T14:32:00.000Z',
        updatedAt: '2026-10-05T15:20:00.000Z',
      },
    ];

    await db.trades.bulkAdd(octTrades as Trade[]);

    // Seed October Day records
    await db.days.bulkPut([
      {
        date: '2026-10-01',
        cycleDay: 1,
        isNoTradeDay: false,
        rules: {
          riskManagement: true,
          dailyLossLimit: true,
          slPredefined: true,
          noAveragingDown: true,
          htfContextClear: true,
          smcSequenceFollowed: true,
          noEmotionalTrade: false,
          newsChecked: true,
        },
        isDayClosed: true,
        closingNotes: 'First day of cycle: +1.5R net.',
        updatedAt: '2026-10-01T22:00:00.000Z',
      },
      {
        date: '2026-10-02',
        cycleDay: 2,
        isNoTradeDay: false,
        rules: {
          riskManagement: true,
          dailyLossLimit: true,
          slPredefined: true,
          noAveragingDown: true,
          htfContextClear: true,
          smcSequenceFollowed: true,
          noEmotionalTrade: true,
          newsChecked: true,
        },
        isDayClosed: true,
        closingNotes: 'Disciplined day: +2.0R win, 1 BE.',
        updatedAt: '2026-10-02T22:00:00.000Z',
      },
      {
        date: '2026-10-03',
        cycleDay: 3,
        isNoTradeDay: false,
        rules: {
          riskManagement: true,
          dailyLossLimit: true,
          slPredefined: true,
          noAveragingDown: true,
          htfContextClear: true,
          smcSequenceFollowed: true,
          noEmotionalTrade: false,
          newsChecked: true,
        },
        isDayClosed: true,
        closingNotes: 'Caught +3R move, but trade 2 had revenge tendency.',
        updatedAt: '2026-10-03T22:00:00.000Z',
      },
      {
        date: '2026-10-04',
        cycleDay: 4,
        isNoTradeDay: false,
        rules: {
          riskManagement: true,
          dailyLossLimit: true,
          slPredefined: true,
          noAveragingDown: true,
          htfContextClear: true,
          smcSequenceFollowed: true,
          noEmotionalTrade: false,
          newsChecked: true,
        },
        isDayClosed: true,
        closingNotes: 'BE day: -1R loss followed by +1R win.',
        updatedAt: '2026-10-04T22:00:00.000Z',
      },
      {
        date: '2026-10-05',
        cycleDay: 5,
        isNoTradeDay: false,
        rules: {
          riskManagement: true,
          dailyLossLimit: true,
          slPredefined: true,
          noAveragingDown: true,
          htfContextClear: true,
          smcSequenceFollowed: true,
          noEmotionalTrade: true,
          newsChecked: true,
        },
        isDayClosed: false,
        closingNotes: 'Current day in progress: +3.5R net.',
        updatedAt: '2026-10-05T18:00:00.000Z',
      },
    ]);
  }
}

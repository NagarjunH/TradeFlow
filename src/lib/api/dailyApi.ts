// ============================================================
// TradeFlow — Supabase Daily Records API
// ============================================================
import { supabase } from '../supabase';
import type { DayRecord } from '../../db/db';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToDayRecord(row: any): DayRecord {
  const rules = (row.rules_json as Record<string, boolean>) ?? {};
  return {
    date: row.record_date as string,
    cycleDay: row.cycle_day as number | undefined,
    isNoTradeDay: row.is_no_trade_day as boolean,
    noTradeReason: row.no_trade_reason as DayRecord['noTradeReason'],
    rules: {
      riskManagement: rules.riskManagement ?? false,
      dailyLossLimit: rules.dailyLossLimit ?? false,
      slPredefined: rules.slPredefined ?? false,
      noAveragingDown: rules.noAveragingDown ?? false,
      htfContextClear: rules.htfContextClear ?? false,
      smcSequenceFollowed: rules.smcSequenceFollowed ?? false,
      noEmotionalTrade: rules.noEmotionalTrade ?? false,
      newsChecked: rules.newsChecked ?? false,
    },
    isDayClosed: row.is_day_closed as boolean,
    closingNotes: row.closing_notes as string | undefined,
    updatedAt: row.updated_at as string,
    _uuid: row.id as string,
  } as DayRecord & { _uuid: string };
}

function dayRecordToRow(record: DayRecord, userId: string) {
  return {
    user_id: userId,
    record_date: record.date,
    cycle_day: record.cycleDay ?? null,
    is_no_trade_day: record.isNoTradeDay ?? false,
    no_trade_reason: record.noTradeReason ?? null,
    rules_json: record.rules,
    is_day_closed: record.isDayClosed ?? false,
    closing_notes: record.closingNotes ?? null,
    updated_at: record.updatedAt,
  };
}

export const dailyApi = {
  async getAll(): Promise<DayRecord[]> {
    const { data, error } = await supabase
      .from('daily_records')
      .select('*')
      .order('record_date', { ascending: false });

    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((data ?? []) as any[]).map(rowToDayRecord);
  },

  async upsert(record: DayRecord, userId: string): Promise<void> {
    const { error } = await supabase
      .from('daily_records')
      .upsert(dayRecordToRow(record, userId) as never, { onConflict: 'user_id,record_date' });

    if (error) throw error;
  },
};

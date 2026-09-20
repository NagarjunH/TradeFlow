// ============================================================
// NH Traders — Supabase Trade API
// Replaces: db.trades.add / update / toArray from Dexie
// ============================================================
import { supabase } from '../supabase';
import type { Trade } from '../../db/db';

// Map Supabase DB row → app-level Trade object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToTrade(row: any): Trade {
  return {
    id: row.id,
    tradeNumber: row.trade_number as number,
    date: row.trade_date as string,
    time: row.trade_time as string,
    pair: row.pair as string,
    order: row.direction as 'BUY' | 'SELL',
    lotSize: Number(row.lot_size),
    entryPrice: row.entry_price != null ? Number(row.entry_price) : undefined,
    slPrice: row.sl_price != null ? Number(row.sl_price) : undefined,
    tpPrice: row.tp_price != null ? Number(row.tp_price) : undefined,
    pnl: Number(row.pnl),
    rMultiple: Number(row.r_multiple),
    pips: row.pips != null ? Number(row.pips) : undefined,
    exitType: row.exit_type as Trade['exitType'],
    tradeQuality: row.trade_quality as Trade['tradeQuality'],
    emotion: row.emotion as Trade['emotion'],
    execution: row.execution as 'CLEAN' | 'VIOLATION',
    violationReason: row.violation_reason as Trade['violationReason'],
    setupType: row.setup_type as string | undefined,
    htfContext: row.htf_context as Trade['htfContext'],
    entryReason: row.entry_reason as string | undefined,
    session: row.session as Trade['session'],
    chartScreenshot: row.chart_url as string | undefined,
    notes: row.notes as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    _uuid: row.id as string,
  } as Trade & { _uuid: string };
}

// Map app Trade → Supabase insert/update shape
function tradeToRow(trade: Omit<Trade, 'id'>, userId: string) {
  return {
    user_id: userId,
    trade_number: trade.tradeNumber,
    trade_date: trade.date,
    trade_time: trade.time,
    pair: trade.pair,
    direction: trade.order,
    lot_size: trade.lotSize,
    entry_price: trade.entryPrice ?? null,
    sl_price: trade.slPrice ?? null,
    tp_price: trade.tpPrice ?? null,
    pnl: trade.pnl,
    r_multiple: trade.rMultiple,
    pips: trade.pips ?? null,
    exit_type: trade.exitType,
    trade_quality: trade.tradeQuality,
    emotion: trade.emotion,
    execution: trade.execution,
    violation_reason: trade.violationReason ?? null,
    setup_type: trade.setupType ?? null,
    htf_context: trade.htfContext ?? null,
    entry_reason: trade.entryReason ?? null,
    session: trade.session ?? null,
    notes: trade.notes ?? null,
    chart_url: trade.chartScreenshot ?? null,
    updated_at: new Date().toISOString(),
  };
}

export const tradesApi = {
  /** Fetch all trades for the current user */
  async getAll(): Promise<Trade[]> {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .order('trade_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((data ?? []) as any[]).map(rowToTrade);
  },

  /** Create a new trade, returns the created Trade with id */
  async create(trade: Omit<Trade, 'id'>, userId: string): Promise<Trade> {
    const { data, error } = await supabase
      .from('trades')
      .insert(tradeToRow(trade, userId) as never)
      .select()
      .single();

    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return rowToTrade(data as any);
  },

  /** Update an existing trade by UUID */
  async update(uuid: string, updates: Partial<Trade>): Promise<void> {
    const partial: Record<string, unknown> = {};
    if (updates.tradeNumber !== undefined) partial.trade_number = updates.tradeNumber;
    if (updates.date !== undefined) partial.trade_date = updates.date;
    if (updates.time !== undefined) partial.trade_time = updates.time;
    if (updates.pair !== undefined) partial.pair = updates.pair;
    if (updates.order !== undefined) partial.direction = updates.order;
    if (updates.lotSize !== undefined) partial.lot_size = updates.lotSize;
    if (updates.entryPrice !== undefined) partial.entry_price = updates.entryPrice;
    if (updates.slPrice !== undefined) partial.sl_price = updates.slPrice;
    if (updates.tpPrice !== undefined) partial.tp_price = updates.tpPrice;
    if (updates.pnl !== undefined) partial.pnl = updates.pnl;
    if (updates.rMultiple !== undefined) partial.r_multiple = updates.rMultiple;
    if (updates.pips !== undefined) partial.pips = updates.pips;
    if (updates.exitType !== undefined) partial.exit_type = updates.exitType;
    if (updates.tradeQuality !== undefined) partial.trade_quality = updates.tradeQuality;
    if (updates.emotion !== undefined) partial.emotion = updates.emotion;
    if (updates.execution !== undefined) partial.execution = updates.execution;
    if (updates.violationReason !== undefined) partial.violation_reason = updates.violationReason;
    if (updates.setupType !== undefined) partial.setup_type = updates.setupType;
    if (updates.htfContext !== undefined) partial.htf_context = updates.htfContext;
    if (updates.entryReason !== undefined) partial.entry_reason = updates.entryReason;
    if (updates.session !== undefined) partial.session = updates.session;
    if (updates.notes !== undefined) partial.notes = updates.notes;
    if (updates.chartScreenshot !== undefined) partial.chart_url = updates.chartScreenshot;
    partial.updated_at = new Date().toISOString();

    const { error } = await supabase.from('trades').update(partial as never).eq('id', uuid);
    if (error) throw error;
  },

  /** Delete a trade by UUID */
  async delete(uuid: string): Promise<void> {
    const { error } = await supabase.from('trades').delete().eq('id', uuid);
    if (error) throw error;
  },
};

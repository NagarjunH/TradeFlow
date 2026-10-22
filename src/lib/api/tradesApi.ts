// ============================================================
// TradeFlow — Supabase Trade API
// Replaces: db.trades.add / update / toArray from Dexie
// ============================================================
import { supabase } from '../supabase';
import { db, type Trade } from '../../db/db';

/** Extract custom HTF context, custom Session, and Outcome embedded in notes */
function parseMetadataFromNotes(notes?: string | null): { cleanNotes?: string; htfContext?: string; session?: string; outcome?: string } {
  if (!notes) return {};
  let clean = notes;
  let htfContext: string | undefined;
  let session: string | undefined;
  let outcome: string | undefined;

  const htfMatch = clean.match(/\n?\[HTF:\s*(.*?)\]/s);
  if (htfMatch) {
    htfContext = htfMatch[1].trim();
    clean = clean.replace(/\n?\[HTF:\s*(.*?)\]/s, '').trim();
  }

  const sessionMatch = clean.match(/\n?\[SESSION:\s*(.*?)\]/s);
  if (sessionMatch) {
    session = sessionMatch[1].trim();
    clean = clean.replace(/\n?\[SESSION:\s*(.*?)\]/s, '').trim();
  }

  const outcomeMatch = clean.match(/\n?\[OUTCOME:\s*(.*?)\]/s);
  if (outcomeMatch) {
    outcome = outcomeMatch[1].trim();
    clean = clean.replace(/\n?\[OUTCOME:\s*(.*?)\]/s, '').trim();
  }

  return {
    cleanNotes: clean.length > 0 ? clean : undefined,
    htfContext,
    session,
    outcome,
  };
}

/** Embed custom HTF, Session, and Outcome into notes string to avoid Supabase check constraints while preserving full text */
function formatNotesWithMetadata(
  notes?: string | null,
  customHtf?: string | null,
  customSession?: string | null,
  existingNotes?: string | null,
  customOutcome?: string | null
): string | null {
  let htfToSave = customHtf;
  let sessionToSave = customSession;
  let outcomeToSave = customOutcome;

  if (existingNotes) {
    const existingParsed = parseMetadataFromNotes(existingNotes);
    if (!htfToSave && existingParsed.htfContext) htfToSave = existingParsed.htfContext;
    if (!sessionToSave && existingParsed.session) sessionToSave = existingParsed.session;
    if (!outcomeToSave && existingParsed.outcome) outcomeToSave = existingParsed.outcome;
  }

  let clean = notes ? notes.replace(/\n?\[HTF:\s*(.*?)\]/s, '').replace(/\n?\[SESSION:\s*(.*?)\]/s, '').replace(/\n?\[OUTCOME:\s*(.*?)\]/s, '').trim() : '';

  const tags: string[] = [];
  if (htfToSave && !['Bullish', 'Bearish', 'Neutral'].includes(htfToSave.trim())) {
    tags.push(`[HTF: ${htfToSave.trim()}]`);
  }
  if (sessionToSave && !['London', 'New York', 'Asian', 'London/NY Overlap'].includes(sessionToSave.trim())) {
    tags.push(`[SESSION: ${sessionToSave.trim()}]`);
  }
  if (outcomeToSave) {
    tags.push(`[OUTCOME: ${outcomeToSave.trim()}]`);
  }

  if (tags.length > 0) {
    const tagString = tags.join('\n');
    return clean ? `${clean}\n${tagString}` : tagString;
  }
  return clean || null;
}

/** Map any custom HTF text into valid Supabase check enum ('Bullish' | 'Bearish' | 'Neutral') */
function mapHtfContextForDb(htf?: string | null): 'Bullish' | 'Bearish' | 'Neutral' | null {
  if (!htf) return null;
  const trimmed = htf.trim();
  if (trimmed === 'Bullish' || trimmed === 'Bearish' || trimmed === 'Neutral') {
    return trimmed;
  }
  const lower = trimmed.toLowerCase();
  if (lower.includes('bearish') && !lower.includes('bullish')) return 'Bearish';
  if (lower.includes('bullish') && !lower.includes('bearish')) return 'Bullish';
  if (lower.includes('bearish')) return 'Bearish';
  if (lower.includes('bullish')) return 'Bullish';
  return 'Neutral';
}

/** Map any session/overlap into valid Supabase check enum ('London' | 'New York' | 'Asian' | 'London/NY Overlap') */
function mapSessionForDb(session?: string | null): string {
  if (!session) return 'Asian';
  const trimmed = session.trim();
  if (trimmed === 'Tokyo') return 'Asian';
  if (['London', 'New York', 'Asian', 'London/NY Overlap'].includes(trimmed)) {
    return trimmed;
  }
  const lower = trimmed.toLowerCase();
  if (lower.includes('london') && (lower.includes('ny') || lower.includes('new york'))) return 'London/NY Overlap';
  if (lower.includes('london')) return 'London';
  if (lower.includes('new york') || lower.includes('ny')) return 'New York';
  return 'Asian';
}

// Map Supabase DB row → app-level Trade object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToTrade(row: any): Trade {
  const { cleanNotes, htfContext: parsedHtf, session: parsedSession, outcome: parsedOutcome } = parseMetadataFromNotes(row.notes);

  let tradeSuccessRate = parsedOutcome;
  if (!tradeSuccessRate) {
    if (row.exit_type === 'TARGET') tradeSuccessRate = 'TARGET';
    else if (row.exit_type === 'STOP_LOSS') tradeSuccessRate = 'Stop Loss';
    else if (row.exit_type === 'BREAKEVEN') tradeSuccessRate = 'Breakeven';
    else if (row.exit_type === 'MANUAL_EXIT') tradeSuccessRate = 'MANUAL EXIT';
    else tradeSuccessRate = 'MANUAL EXIT';
  }

  let session = parsedSession || (row.session as string) || 'Tokyo';
  if (session === 'Asian') session = 'Tokyo';

  const rawPnl = Number(row.pnl) || 0;
  let rMult = row.r_multiple != null ? Number(row.r_multiple) : 0;
  // Ensure financial consistency: negative PnL must have negative R-multiple
  if (rawPnl < -0.001) {
    rMult = rMult > 0 ? -rMult : (rMult < 0 ? rMult : -1.0);
  } else if (rawPnl > 0.001) {
    rMult = rMult < 0 ? Math.abs(rMult) : (rMult > 0 ? rMult : 1.0);
  } else {
    rMult = 0;
  }

  const riskReward = rMult !== 0 ? `1:${Math.abs(rMult).toFixed(rMult % 1 === 0 ? 0 : 1)}` : '1:1';

  const htfContext = parsedHtf || (row.htf_context as string | undefined) || '1. Bearish on 1H, 4H 2. Bullish on 15m, 5m';

  const rawExecution = (row.execution || '').toUpperCase();
  const rawQuality = (row.trade_quality || '').toUpperCase();
  const execution: 'CLEAN' | 'VIOLATION' = rawExecution === 'VIOLATION' || rawQuality === 'VIOLATION' ? 'VIOLATION' : 'CLEAN';

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
    pnl: rawPnl,
    rMultiple: rMult,
    riskReward,
    pips: row.pips != null ? Number(row.pips) : undefined,
    exitType: row.exit_type as Trade['exitType'],
    tradeQuality: (rawQuality === 'VIOLATION' ? 'VIOLATION' : rawQuality === 'MANAGEABLE_MISTAKE' ? 'MANAGEABLE_MISTAKE' : 'CLEAN') as Trade['tradeQuality'],
    emotion: (row.emotion || 'FOCUSED') as Trade['emotion'],
    execution,
    violationReason: row.violation_reason as Trade['violationReason'],
    setupType: row.setup_type as string | undefined,
    htfContext,
    entryReason: row.entry_reason as string | undefined,
    exitReason: cleanNotes,
    tradeSuccessRate,
    session,
    chartScreenshot: row.chart_url as string | undefined,
    notes: cleanNotes,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    _uuid: row.id as string,
  } as Trade & { _uuid: string };
}

// Map app Trade → Supabase insert/update shape
function tradeToRow(trade: Omit<Trade, 'id'>, userId: string) {
  const dbSession = mapSessionForDb(trade.session);

  let exitType = trade.exitType || 'MANUAL_EXIT';
  if (trade.tradeSuccessRate) {
    if (trade.tradeSuccessRate === 'TARGET' || trade.tradeSuccessRate === 'Target Hit') exitType = 'TARGET';
    else if (trade.tradeSuccessRate === 'Stop Loss' || trade.tradeSuccessRate === 'Stop Loss Hit') exitType = 'STOP_LOSS';
    else if (trade.tradeSuccessRate === 'Breakeven') exitType = 'BREAKEVEN';
    else exitType = 'MANUAL_EXIT';
  }

  const rawNotes = trade.exitReason || trade.notes || null;
  const notesWithMeta = formatNotesWithMetadata(rawNotes, trade.htfContext, trade.session, null, trade.tradeSuccessRate);
  const dbHtf = mapHtfContextForDb(trade.htfContext);

  const numPnl = Number(trade.pnl) || 0;
  let finalR = Number(trade.rMultiple) || 0;
  if (numPnl < -0.001) {
    finalR = finalR > 0 ? -finalR : (finalR < 0 ? finalR : -1.0);
  } else if (numPnl > 0.001) {
    finalR = finalR < 0 ? Math.abs(finalR) : (finalR > 0 ? finalR : 1.0);
  } else {
    finalR = 0;
  }

  const execution = (trade.execution || 'CLEAN').toUpperCase();
  const tradeQuality = (trade.tradeQuality || (execution === 'VIOLATION' ? 'VIOLATION' : 'CLEAN')).toUpperCase();

  return {
    user_id: userId,
    trade_number: trade.tradeNumber,
    trade_date: trade.date,
    trade_time: trade.time || '10:00',
    pair: trade.pair,
    direction: trade.order,
    lot_size: trade.lotSize,
    entry_price: trade.entryPrice ?? null,
    sl_price: trade.slPrice ?? null,
    tp_price: trade.tpPrice ?? null,
    pnl: numPnl,
    r_multiple: finalR,
    pips: trade.pips ?? null,
    exit_type: exitType,
    trade_quality: tradeQuality,
    emotion: trade.emotion || 'FOCUSED',
    execution: execution,
    violation_reason: trade.violationReason ?? null,
    setup_type: trade.setupType ?? null,
    htf_context: dbHtf,
    entry_reason: trade.entryReason ?? null,
    session: dbSession,
    notes: notesWithMeta,
    chart_url: trade.chartScreenshot && trade.chartScreenshot.trim() ? trade.chartScreenshot : null,
    updated_at: new Date().toISOString(),
  };
}

export const tradesApi = {
  /** Read immediately from local Dexie (<50ms) */
  async getLocal(): Promise<Trade[]> {
    try {
      return await db.trades.orderBy('tradeNumber').toArray();
    } catch {
      return [];
    }
  },

  /** Fetch all trades for the current user from cloud, syncing with local Dexie */
  async getAll(): Promise<Trade[]> {
    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .order('trade_number', { ascending: true })
        .order('trade_date', { ascending: true })
        .order('created_at', { ascending: true });

      if (!error && Array.isArray(data)) {
        const mapped = data.map(rowToTrade);
        try {
          // Preserve any unsynced local trades so they are never lost on cloud refresh
          const existingLocal = await db.trades.toArray().catch(() => []);
          const unsynced = existingLocal.filter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (local) => !(local as any)._uuid && !mapped.some((m) => m.tradeNumber === local.tradeNumber && m.date === local.date)
          );

          await db.trades.clear();
          if (mapped.length > 0) {
            await db.trades.bulkPut(mapped);
          }
          if (unsynced.length > 0) {
            await db.trades.bulkAdd(unsynced);
          }
          return [...mapped, ...unsynced];
        } catch (_) {
          return mapped;
        }
      }
    } catch (cloudErr) {
      console.warn('[tradesApi] Cloud getAll failed, falling back to local DB:', cloudErr);
    }

    // Fallback to local Dexie trades
    return await this.getLocal();
  },

  /** Create a new trade, returns the created Trade with id */
  async create(trade: Omit<Trade, 'id'>, userId: string): Promise<Trade> {
    // 1. Ensure user profile exists to satisfy foreign key constraint if valid user UUID
    if (userId && userId !== '00000000-0000-0000-0000-000000000000') {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle();

        if (!profile) {
          await supabase.from('profiles').upsert({
            id: userId,
            name: 'TradeFlow Trader',
            base_currency: 'USD',
            initial_capital: 10000,
            current_balance: 10000,
          } as never);
        }
      } catch (profErr) {
        console.warn('[tradesApi] Profile check warning:', profErr);
      }
    }

    const row = tradeToRow(trade, userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let createdRow: any = null;

    try {
      const { data, error } = await supabase
        .from('trades')
        .insert(row as never)
        .select();

      if (error) {
        console.warn('[tradesApi] Insert with select failed, trying plain insert:', error.message);
        const plainRes = await supabase.from('trades').insert(row as never);
        if (plainRes.error) {
          throw plainRes.error;
        }
        createdRow = row;
      } else if (Array.isArray(data) && data.length > 0) {
        createdRow = data[0];
      } else {
        createdRow = row;
      }
    } catch (cloudErr: unknown) {
      console.warn('[tradesApi] Supabase cloud insert failed, saving locally into IndexedDB fallback:', cloudErr);
      const localId = await db.trades.add({ ...trade } as Trade);
      return { ...trade, id: localId } as Trade;
    }

    const tradeObj = rowToTrade(createdRow || row);
    try { await db.trades.put(tradeObj); } catch (_) {}
    return tradeObj;
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
    if (updates.tradeSuccessRate !== undefined) {
      if (updates.tradeSuccessRate === 'TARGET' || updates.tradeSuccessRate === 'Target Hit') partial.exit_type = 'TARGET';
      else if (updates.tradeSuccessRate === 'Stop Loss' || updates.tradeSuccessRate === 'Stop Loss Hit') partial.exit_type = 'STOP_LOSS';
      else if (updates.tradeSuccessRate === 'Breakeven') partial.exit_type = 'BREAKEVEN';
      else partial.exit_type = 'MANUAL_EXIT';
    } else if (updates.exitType !== undefined) {
      partial.exit_type = updates.exitType;
    }
    if (updates.tradeQuality !== undefined) partial.trade_quality = updates.tradeQuality;
    if (updates.emotion !== undefined) partial.emotion = updates.emotion;
    if (updates.execution !== undefined) partial.execution = updates.execution;
    if (updates.violationReason !== undefined) partial.violation_reason = updates.violationReason;
    if (updates.setupType !== undefined) partial.setup_type = updates.setupType;
    if (updates.htfContext !== undefined) {
      partial.htf_context = mapHtfContextForDb(updates.htfContext);
    }
    if (updates.entryReason !== undefined) partial.entry_reason = updates.entryReason;
    if (updates.session !== undefined) {
      partial.session = mapSessionForDb(updates.session);
    }
    if (
      updates.exitReason !== undefined ||
      updates.notes !== undefined ||
      updates.htfContext !== undefined ||
      updates.session !== undefined ||
      updates.tradeSuccessRate !== undefined
    ) {
      const baseN = updates.exitReason ?? updates.notes;
      partial.notes = formatNotesWithMetadata(baseN, updates.htfContext, updates.session, null, updates.tradeSuccessRate);
    }
    if (updates.chartScreenshot !== undefined) {
      partial.chart_url = updates.chartScreenshot && updates.chartScreenshot.trim() ? updates.chartScreenshot : null;
    }
    partial.updated_at = new Date().toISOString();

    try {
      await supabase.from('trades').update(partial as never).eq('id', uuid);
    } catch (err) {
      console.warn('[tradesApi] Cloud update warning:', err);
    }

    try {
      const all = await db.trades.toArray();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const match = all.find((t: any) => t._uuid === uuid || String(t.id) === uuid);
      if (match?.id) {
        await db.trades.update(match.id, updates);
      }
    } catch (_) {}
  },

  /** Delete a trade by UUID */
  async delete(uuid: string): Promise<void> {
    try {
      await supabase.from('trades').delete().eq('id', uuid);
    } catch (err) {
      console.warn('[tradesApi] Cloud delete warning:', err);
    }

    try {
      const all = await db.trades.toArray();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const match = all.find((t: any) => t._uuid === uuid || String(t.id) === uuid);
      if (match?.id) {
        await db.trades.delete(match.id);
      }
    } catch (_) {}
  },
};

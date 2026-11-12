import type { Trade } from '../db/db';

export interface ParsedVantageTrade {
  brokerTicketId: string;
  brokerSource: string;
  symbolRaw: string;
  pair: string;
  order: 'BUY' | 'SELL';
  lotSize: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  netPnl: number;
  chargesSwap?: string;
  openTimeRaw: string;
  closeTimeRaw: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  session: string;
  rMultiple: number;
  tradeSuccessRate: string;
  exitType: Trade['exitType'];
}

/** Normalize raw symbol like XAUUSD -> XAU/USD */
export function normalizePairSymbol(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9/]/g, '').trim();
  if (clean.includes('/')) return clean;
  if (clean.length === 6) return `${clean.slice(0, 3)}/${clean.slice(3)}`;
  return clean || 'XAU/USD';
}

/** Determine forex session from UTC hour */
export function detectSessionFromUtcHour(utcHour: number): string {
  if (utcHour >= 12 && utcHour < 16) return 'London/NY Overlap';
  if (utcHour >= 7 && utcHour < 12) return 'London';
  if (utcHour >= 16 && utcHour < 21) return 'New York';
  return 'Tokyo';
}

/**
 * Parse DD/MM/YYYY HH:mm:ss (Vantage Web-Trade UTC+2 format) or YYYY-MM-DD HH:mm:ss
 * Optionally converts from brokerOffsetHours (default UTC+2) to local IST (+5.5)
 */
export function parseVantageTimestamp(
  rawTs: string,
  convertBrokerToLocal = true,
  brokerOffsetHours = 2
): { date: string; time: string; utcHour: number } {
  const trimmed = rawTs.trim();

  // Match DD/MM/YYYY HH:mm:ss or DD/MM/YYYY HH:mm
  let day = 1;
  let month = 1;
  let year = 2026;
  let hour = 0;
  let minute = 0;
  let second = 0;

  const dmyMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
  const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/);

  if (dmyMatch) {
    day = parseInt(dmyMatch[1], 10);
    month = parseInt(dmyMatch[2], 10);
    year = parseInt(dmyMatch[3], 10);
    hour = parseInt(dmyMatch[4], 10);
    minute = parseInt(dmyMatch[5], 10);
    second = parseInt(dmyMatch[6] || '0', 10);
  } else if (ymdMatch) {
    year = parseInt(ymdMatch[1], 10);
    month = parseInt(ymdMatch[2], 10);
    day = parseInt(ymdMatch[3], 10);
    hour = parseInt(ymdMatch[4], 10);
    minute = parseInt(ymdMatch[5], 10);
    second = parseInt(ymdMatch[6] || '0', 10);
  } else {
    const fallback = new Date(trimmed);
    if (!isNaN(fallback.getTime())) {
      return {
        date: fallback.toISOString().split('T')[0],
        time: fallback.toTimeString().slice(0, 5),
        utcHour: fallback.getUTCHours(),
      };
    }
    const now = new Date();
    return {
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().slice(0, 5),
      utcHour: now.getUTCHours(),
    };
  }

  // Construct UTC timestamp by subtracting broker UTC offset
  const utcMs = Date.UTC(year, month - 1, day, hour, minute, second) - brokerOffsetHours * 3600 * 1000;
  const utcDate = new Date(utcMs);
  const utcHour = utcDate.getUTCHours();

  if (convertBrokerToLocal) {
    // Convert to user's browser local timezone (e.g., IST UTC+5:30)
    const localYear = utcDate.getFullYear();
    const localMonth = String(utcDate.getMonth() + 1).padStart(2, '0');
    const localDay = String(utcDate.getDate()).padStart(2, '0');
    const localHour = String(utcDate.getHours()).padStart(2, '0');
    const localMin = String(utcDate.getMinutes()).padStart(2, '0');
    return {
      date: `${localYear}-${localMonth}-${localDay}`,
      time: `${localHour}:${localMin}`,
      utcHour,
    };
  }

  // Keep raw broker date/time
  return {
    date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    utcHour,
  };
}

/** Build deterministic ticket fingerprint matching Chrome Extension logic */
export function buildVantageTicketId(
  symbolRaw: string,
  order: 'BUY' | 'SELL',
  lotSize: number,
  entryPrice: number,
  openTimeRaw: string,
  closeTimeRaw: string,
  netPnl: number
): string {
  const cleanOpen = openTimeRaw.trim().replace(/\s+/g, '_');
  const cleanClose = closeTimeRaw.trim().replace(/\s+/g, '_');
  const sym = symbolRaw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `vnt_${sym}_${order}_${lotSize.toFixed(2)}_${entryPrice.toFixed(2)}_${cleanOpen}_${cleanClose}_${netPnl.toFixed(2)}`;
}

/** Clean numeric string like "4,045.21" or "+13.41" or "-105.75" */
function parsePriceOrPnl(raw: string): number {
  const cleaned = raw.replace(/,/g, '').replace(/[^0-9.+-]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

/**
 * Parse pasted text or CSV copied from Vantage Web-Trade Position History:
 * Columns: Symbol | Closed/Total Vol. (Lots) | Entry Price | Avg.Price | PnL | Net PnL | Charges/Swap | Open Time | Close Time
 */
export function parseVantageHistoryText(
  rawText: string,
  convertBrokerToLocal = true
): ParsedVantageTrade[] {
  if (!rawText || !rawText.trim()) return [];

  // Normalize multi-line DOM copy-paste where a single row may wrap across lines
  // Strategy: flatten extra whitespace and split right before each "Buy/Sell SYMBOL" or match chunks globally
  const normalized = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\t+/g, '  ')
    .replace(/\bDetails\b/gi, '');

  // Pattern tailored specifically to Vantage Web-Trade Position History rows:
  // (Buy|Sell) (SYMBOL) (0.01/0.01 or 0.01) (Entry) (Avg) (PnL) (NetPnL) (Charges/Swap optional) (OpenTime) (CloseTime)
  const rowRegex =
    /\b(Buy|Sell|BUY|SELL)\s+([A-Za-z0-9./_-]{3,14})\s+(\d+(?:\.\d+)?)(?:\s*\/\s*\d+(?:\.\d+)?)?\s+([+-]?[\d,]+\.\d+)\s+([+-]?[\d,]+\.\d+)\s+([+-]?[\d,]+\.\d+)\s+([+-]?[\d,]+\.\d+)(?:\s+([+-]?[\d,.]+\/[+-]?[\d,.]+))?\s+(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2}|\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2})\s+(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2}|\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2})/g;

  const results: ParsedVantageTrade[] = [];
  const seenTickets = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = rowRegex.exec(normalized)) !== null) {
    const dirRaw = match[1].toUpperCase();
    const order: 'BUY' | 'SELL' = dirRaw === 'SELL' ? 'SELL' : 'BUY';
    const symbolRaw = match[2].toUpperCase();
    const pair = normalizePairSymbol(symbolRaw);
    const lotSize = parseFloat(match[3]) || 0.01;
    const entryPrice = parsePriceOrPnl(match[4]);
    const exitPrice = parsePriceOrPnl(match[5]);
    const pnl = parsePriceOrPnl(match[6]);
    const netPnl = parsePriceOrPnl(match[7]);
    const chargesSwap = match[8] || '0.00/0.00';
    const openTimeRaw = match[9].trim();
    const closeTimeRaw = match[10].trim();

    const parsedClose = parseVantageTimestamp(closeTimeRaw, convertBrokerToLocal, 2);
    const session = detectSessionFromUtcHour(parsedClose.utcHour);
    const brokerTicketId = buildVantageTicketId(
      symbolRaw,
      order,
      lotSize,
      entryPrice,
      openTimeRaw,
      closeTimeRaw,
      netPnl
    );

    if (seenTickets.has(brokerTicketId)) continue;
    seenTickets.add(brokerTicketId);

    const isWin = netPnl > 0.001;
    const isLoss = netPnl < -0.001;
    const rMultiple = isWin ? 1.0 : isLoss ? -1.0 : 0;
    const exitType: Trade['exitType'] = isWin
      ? 'TARGET'
      : isLoss
      ? 'STOP_LOSS'
      : 'BREAKEVEN';
    const tradeSuccessRate = isWin
      ? 'TARGET'
      : isLoss
      ? 'Stop Loss'
      : 'Breakeven';

    results.push({
      brokerTicketId,
      brokerSource: 'Vantage Web-Trade',
      symbolRaw,
      pair,
      order,
      lotSize,
      entryPrice,
      exitPrice,
      pnl,
      netPnl,
      chargesSwap,
      openTimeRaw,
      closeTimeRaw,
      date: parsedClose.date,
      time: parsedClose.time,
      session,
      rMultiple,
      tradeSuccessRate,
      exitType,
    });
  }

  // Fallback CSV line-by-line parser if standard CSV format (comma-separated) was uploaded
  if (results.length === 0) {
    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (/symbol|ticket|open\s*time/i.test(line)) continue; // skip header
      const cols = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((c) => c.replace(/^"|"$/g, '').trim());
      if (cols.length < 7) continue;

      // Try detecting Buy/Sell + Symbol inside first 2 columns
      const col0 = cols[0];
      const bsMatch = col0.match(/^(Buy|Sell)\s+([A-Za-z0-9./_-]+)/i);
      if (!bsMatch) continue;

      const order: 'BUY' | 'SELL' = bsMatch[1].toUpperCase() === 'SELL' ? 'SELL' : 'BUY';
      const symbolRaw = bsMatch[2].toUpperCase();
      const pair = normalizePairSymbol(symbolRaw);
      const lotSize = parseFloat((cols[1] || '0.01').split('/')[0]) || 0.01;
      const entryPrice = parsePriceOrPnl(cols[2] || '0');
      const exitPrice = parsePriceOrPnl(cols[3] || '0');
      const pnl = parsePriceOrPnl(cols[4] || '0');
      const netPnl = parsePriceOrPnl(cols[5] || cols[4] || '0');
      const chargesSwap = cols[6] || '0.00/0.00';
      const openTimeRaw = cols[7] || '';
      const closeTimeRaw = cols[8] || cols[7] || '';
      if (!closeTimeRaw) continue;

      const parsedClose = parseVantageTimestamp(closeTimeRaw, convertBrokerToLocal, 2);
      const session = detectSessionFromUtcHour(parsedClose.utcHour);
      const brokerTicketId = buildVantageTicketId(
        symbolRaw,
        order,
        lotSize,
        entryPrice,
        openTimeRaw,
        closeTimeRaw,
        netPnl
      );

      if (seenTickets.has(brokerTicketId)) continue;
      seenTickets.add(brokerTicketId);

      const isWin = netPnl > 0.001;
      const isLoss = netPnl < -0.001;
      results.push({
        brokerTicketId,
        brokerSource: 'Vantage Web-Trade',
        symbolRaw,
        pair,
        order,
        lotSize,
        entryPrice,
        exitPrice,
        pnl,
        netPnl,
        chargesSwap,
        openTimeRaw,
        closeTimeRaw,
        date: parsedClose.date,
        time: parsedClose.time,
        session,
        rMultiple: isWin ? 1.0 : isLoss ? -1.0 : 0,
        tradeSuccessRate: isWin ? 'TARGET' : isLoss ? 'Stop Loss' : 'Breakeven',
        exitType: isWin ? 'TARGET' : isLoss ? 'STOP_LOSS' : 'BREAKEVEN',
      });
    }
  }

  return results;
}

/** Convert a ParsedVantageTrade into TradeFlow insert payload */
export function toTradeFlowPayload(parsed: ParsedVantageTrade): Omit<Trade, 'id' | 'tradeNumber'> {
  const now = new Date().toISOString();
  return {
    date: parsed.date,
    time: parsed.time,
    pair: parsed.pair,
    order: parsed.order,
    lotSize: parsed.lotSize,
    entryPrice: parsed.entryPrice,
    pnl: parsed.netPnl,
    rMultiple: parsed.rMultiple,
    riskReward: parsed.rMultiple !== 0 ? `1:${Math.abs(parsed.rMultiple)}` : '1:1',
    exitType: parsed.exitType,
    tradeSuccessRate: parsed.tradeSuccessRate,
    tradeQuality: 'CLEAN',
    emotion: 'FOCUSED',
    execution: 'CLEAN',
    violationReason: 'None',
    setupType: 'Vantage Web-Trade',
    htfContext: 'Neutral',
    entryReason: `Entry: ${parsed.entryPrice} → Exit: ${parsed.exitPrice}`,
    exitReason: `Synced from Vantage Web-Trade (${parsed.closeTimeRaw} UTC+2)`,
    session: parsed.session,
    notes: `Synced from Vantage Web-Trade (${parsed.closeTimeRaw} UTC+2)`,
    brokerTicketId: parsed.brokerTicketId,
    brokerSource: parsed.brokerSource,
    createdAt: now,
    updatedAt: now,
  };
}

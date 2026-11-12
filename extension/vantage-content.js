// ============================================================================
// TradeFlow Vantage Bridge — Content Script for secure.vantagemarkets.com/web-trade
// Reads "Position History" rows cleanly & auto-syncs to TradeFlow Supabase
// ============================================================================

(function () {
  if (window.__tradeflowVantageLoaded) return;
  window.__tradeflowVantageLoaded = true;

  let lastSentFingerprint = '';
  let syncTimer = null;
  let isSyncInFlight = false;

  /** Detect broker UTC offset from top-right terminal clock (e.g. "12:11:18 UTC+2") */
  function detectBrokerUtcOffset() {
    const bodyText = document.body?.innerText || '';
    const m = bodyText.match(/\bUTC\s*([+-]\d{1,2})(?::(\d{2}))?/i);
    if (m) {
      const hrs = parseInt(m[1], 10);
      const mins = parseInt(m[2] || '0', 10);
      if (!isNaN(hrs)) {
        return hrs + (hrs >= 0 ? mins / 60 : -mins / 60);
      }
    }
    return 2; // Default Vantage Web-Trade server offset (UTC+2)
  }

  /** Normalize pair like XAUUSD -> XAU/USD */
  function normalizePair(raw) {
    const clean = String(raw || '')
      .toUpperCase()
      .replace(/[^A-Z0-9/]/g, '')
      .trim();
    if (clean.includes('/')) return clean;
    if (clean.length === 6) return `${clean.slice(0, 3)}/${clean.slice(3)}`;
    return clean || 'XAU/USD';
  }

  /** Determine forex session from UTC hour */
  function detectSessionFromUtcHour(utcHour) {
    if (utcHour >= 12 && utcHour < 16) return 'London/NY Overlap';
    if (utcHour >= 7 && utcHour < 12) return 'London';
    if (utcHour >= 16 && utcHour < 21) return 'New York';
    return 'Tokyo';
  }

  /** Parse DD/MM/YYYY HH:mm:ss and convert from broker UTC offset to browser local time */
  function parseTimestamp(rawTs, brokerOffsetHours) {
    const trimmed = String(rawTs || '').trim();
    const dmy = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
    const ymd = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/);

    let day, month, year, hour, minute, second;
    if (dmy) {
      day = parseInt(dmy[1], 10);
      month = parseInt(dmy[2], 10);
      year = parseInt(dmy[3], 10);
      hour = parseInt(dmy[4], 10);
      minute = parseInt(dmy[5], 10);
      second = parseInt(dmy[6] || '0', 10);
    } else if (ymd) {
      year = parseInt(ymd[1], 10);
      month = parseInt(ymd[2], 10);
      day = parseInt(ymd[3], 10);
      hour = parseInt(ymd[4], 10);
      minute = parseInt(ymd[5], 10);
      second = parseInt(ymd[6] || '0', 10);
    } else {
      const now = new Date();
      return {
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().slice(0, 5),
        utcHour: now.getUTCHours(),
      };
    }

    const utcMs = Date.UTC(year, month - 1, day, hour, minute, second) - brokerOffsetHours * 3600 * 1000;
    const dt = new Date(utcMs);
    const utcHour = dt.getUTCHours();

    const localYear = dt.getFullYear();
    const localMonth = String(dt.getMonth() + 1).padStart(2, '0');
    const localDay = String(dt.getDate()).padStart(2, '0');
    const localHour = String(dt.getHours()).padStart(2, '0');
    const localMin = String(dt.getMinutes()).padStart(2, '0');

    return {
      date: `${localYear}-${localMonth}-${localDay}`,
      time: `${localHour}:${localMin}`,
      utcHour,
    };
  }

  function parseNumber(raw) {
    const n = parseFloat(String(raw || '').replace(/,/g, '').replace(/[^0-9.+-]/g, ''));
    return isNaN(n) ? 0 : n;
  }

  function calculatePips(pair, order, entryPrice, exitPrice) {
    if (!entryPrice || !exitPrice || !isFinite(entryPrice) || !isFinite(exitPrice)) return null;
    const diff = order === 'BUY' ? exitPrice - entryPrice : entryPrice - exitPrice;
    const sym = String(pair || '').replace('/', '').toUpperCase();
    if (sym.includes('XAU') || sym.includes('XAG')) return Number((diff / 0.1).toFixed(1));
    if (sym.includes('JPY')) return Number((diff / 0.01).toFixed(1));
    if (/BTC|ETH|SOL|US30|NAS100|NDX|SPX|USTEC|GER|UK100/.test(sym)) return Number(diff.toFixed(1));
    return Number((diff / 0.0001).toFixed(1));
  }

  function buildTicketId(symbolRaw, order, lotSize, entryPrice, openTimeRaw, closeTimeRaw, netPnl) {
    const cleanOpen = openTimeRaw.trim().replace(/\s+/g, '_');
    const cleanClose = closeTimeRaw.trim().replace(/\s+/g, '_');
    const sym = symbolRaw.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return `vnt_${sym}_${order}_${lotSize.toFixed(2)}_${entryPrice.toFixed(2)}_${cleanOpen}_${cleanClose}_${netPnl.toFixed(2)}`;
  }

  /** Extract closed trades from Vantage Position History DOM */
  function scrapeVantagePositionHistory() {
    const brokerOffset = detectBrokerUtcOffset();
    const trades = [];
    const seenTickets = new Set();

    // Regex tailored to Vantage Web-Trade Position History row text:
    // Sell XAUUSD 0.01/0.01 4,045.21 4,049.73 -4.52 -4.52 0.00/0.00 11/11/2026 05:55:07 11/11/2026 06:04:22
    const rowPattern =
      /\b(Buy|Sell|BUY|SELL)\s+([A-Za-z0-9./_-]{3,14})\s+(\d+(?:\.\d+)?)(?:\s*\/\s*\d+(?:\.\d+)?)?\s+([+-]?[\d,]+\.\d+)\s+([+-]?[\d,]+\.\d+)\s+([+-]?[\d,]+\.\d+)\s+([+-]?[\d,]+\.\d+)(?:\s+([+-]?[\d,.]+\/[+-]?[\d,.]+))?\s+(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2}|\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2})\s+(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2}|\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2})/g;

    // Strategy 1: Collect row containers (<tr>, [role="row"], or table row divs) to avoid cross-row regex bleed
    const candidateEls = Array.from(
      document.querySelectorAll('tbody tr, [role="row"], [class*="table-row"], [class*="TableRow"], [class*="row"]')
    );

    const chunks = [];
    if (candidateEls.length > 0) {
      for (const el of candidateEls) {
        const txt = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
        if (txt && /\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2}/.test(txt) && /\b(Buy|Sell)\b/i.test(txt)) {
          chunks.push(txt);
        }
      }
    }

    // Strategy 2 fallback: whole body text scan if custom virtualized layout
    if (chunks.length === 0 && document.body) {
      chunks.push((document.body.innerText || '').replace(/\s+/g, ' '));
    }

    for (const text of chunks) {
      const cleaned = text.replace(/\bDetails\b/gi, ' ');
      let match;
      rowPattern.lastIndex = 0;
      while ((match = rowPattern.exec(cleaned)) !== null) {
        const order = match[1].toUpperCase() === 'SELL' ? 'SELL' : 'BUY';
        const symbolRaw = match[2].toUpperCase();
        const pair = normalizePair(symbolRaw);
        const lotSize = parseFloat(match[3]) || 0.01;
        const entryPrice = parseNumber(match[4]);
        const exitPrice = parseNumber(match[5]);
        const pnl = parseNumber(match[6]);
        const netPnl = parseNumber(match[7]);
        const chargesSwap = match[8] || '0.00/0.00';
        const openTimeRaw = match[9].trim();
        const closeTimeRaw = match[10].trim();

        const ticketId = buildTicketId(symbolRaw, order, lotSize, entryPrice, openTimeRaw, closeTimeRaw, netPnl);
        if (seenTickets.has(ticketId)) continue;
        seenTickets.add(ticketId);

        const parsedClose = parseTimestamp(closeTimeRaw, brokerOffset);
        const session = detectSessionFromUtcHour(parsedClose.utcHour);

        const isWin = netPnl > 0.001;
        const isLoss = netPnl < -0.001;
        const pips = calculatePips(pair, order, entryPrice, exitPrice);

        trades.push({
          brokerTicketId: ticketId,
          brokerSource: 'Vantage Web-Trade',
          symbolRaw,
          pair,
          order,
          lotSize,
          entryPrice,
          exitPrice,
          pnl,
          netPnl,
          pips,
          chargesSwap,
          openTimeRaw,
          closeTimeRaw,
          date: parsedClose.date,
          time: parsedClose.time,
          session,
          tradeSuccessRate: isWin ? 'TARGET' : isLoss ? 'Stop Loss' : 'Breakeven',
          exitType: isWin ? 'TARGET' : isLoss ? 'STOP_LOSS' : 'BREAKEVEN',
          notes: '',
        });
      }
    }

    return trades;
  }

  /** Subtle toast shown only when NEW trades are synced */
  function showSyncToast(insertedCount, screenshotAttached = false) {
    if (!insertedCount || insertedCount <= 0) return;
    const id = 'tradeflow-sync-toast';
    const prev = document.getElementById(id);
    if (prev) prev.remove();

    const toast = document.createElement('div');
    toast.id = id;
    const snapText = screenshotAttached ? ' + 📸 Chart' : '';
    toast.textContent = `⚡ TradeFlow: Synced ${insertedCount} new Vantage trade${insertedCount > 1 ? 's' : ''}${snapText}!`;
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: '999999',
      background: '#0F172A',
      color: '#34D399',
      border: '1px solid #10B981',
      borderRadius: '12px',
      padding: '10px 16px',
      fontSize: '12px',
      fontWeight: '700',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      boxShadow: '0 10px 25px rgba(0,0,0,0.35)',
      transition: 'opacity 0.3s ease',
    });
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 350);
    }, 3800);
  }

  async function runSync(force = false, captureScreenshot = false) {
    if (isSyncInFlight) return { ok: false, error: 'Sync already in progress' };

    const trades = scrapeVantagePositionHistory();
    if (trades.length === 0) {
      return { ok: true, insertedCount: 0, skippedCount: 0, totalSeen: 0, note: 'No Position History rows visible yet.' };
    }

    const fingerprint = trades.map((t) => t.brokerTicketId).join('|');
    if (!force && fingerprint === lastSentFingerprint) {
      return { ok: true, insertedCount: 0, skippedCount: trades.length, totalSeen: trades.length };
    }

    isSyncInFlight = true;
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SYNC_TRADES',
        trades,
        captureScreenshot,
      });
      if (response?.ok) {
        lastSentFingerprint = fingerprint;
        if (response.insertedCount > 0) {
          showSyncToast(response.insertedCount, Boolean(response.screenshotAttached));
        }
      }
      return response;
    } finally {
      isSyncInFlight = false;
    }
  }

  // Schedule auto-sync when DOM updates in Position History
  function scheduleAutoSync() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(async () => {
      try {
        const state = await chrome.storage.local.get(['autoSync', 'session']);
        if (state.autoSync !== false && state.session?.access_token) {
          await runSync(false);
        }
      } catch (_) {}
    }, 2200);
  }

  const observer = new MutationObserver(() => {
    scheduleAutoSync();
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Periodic background poll while Vantage Web-Trade tab is open
  setInterval(async () => {
    try {
      const state = await chrome.storage.local.get(['autoSync', 'session']);
      if (state.autoSync !== false && state.session?.access_token) {
        await runSync(false);
      }
    } catch (_) {}
  }, 15000);

  // Listen to manual sync trigger from Popup
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'SCRAPE_AND_SYNC_NOW') {
      runSync(true, Boolean(msg.captureScreenshot))
        .then((res) => sendResponse(res))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'PREVIEW_VANTAGE_TRADES') {
      const trades = scrapeVantagePositionHistory();
      sendResponse({ ok: true, count: trades.length, trades: trades.slice(0, 5) });
      return true;
    }
  });
})();

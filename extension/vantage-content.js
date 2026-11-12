// ============================================================================
// TradeFlow Vantage Bridge — Content Script for secure.vantagemarkets.com/web-trade
// Reads "Position History" rows cleanly & auto-syncs to TradeFlow Supabase
// ============================================================================

(function () {
  if (typeof window.__tradeflowVantageCleanup === 'function') {
    try {
      window.__tradeflowVantageCleanup();
    } catch (_) {}
  }
  window.__tradeflowVantageLoaded = true;

  let lastSentFingerprint = '';
  let lastBalanceKey = '';
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

  /** Parse monetary amount like "$1,234.56 USD", "USD 0.00", or "0.00" */
  function extractMoneyValue(text) {
    if (!text) return null;
    const normalized = String(text)
      .replace(/\u00a0/g, ' ')
      .replace(/\(\s*(USD|INR|EUR|GBP|AUD|CAD|SGD)\s*\)/gi, ' $1 ')
      .trim();
    const m = normalized.match(
      /(USD|INR|EUR|GBP|AUD|CAD|SGD)?\s*([\$₹€£])?\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)\s*(USD|INR|EUR|GBP|AUD|CAD|SGD)?/i
    );
    if (!m || !m[3]) return null;
    const val = parseFloat(m[3].replace(/,/g, ''));
    if (isNaN(val) || !isFinite(val)) return null;
    const rawCurr = (m[1] || m[4] || '').toUpperCase();
    let currency = null;
    if (m[2] === '$' || rawCurr === 'USD') currency = 'USD';
    else if (m[2] === '₹' || rawCurr === 'INR') currency = 'INR';
    return { val, currency };
  }

  /** Scrape Deposit / Withdrawal rows when Funding History tab is open */
  function scrapeFundingHistoryNet() {
    const bodyText = document.body?.innerText || '';
    // Only calculate funding net when deposit/withdrawal rows are visibly rendered
    const rows = Array.from(
      document.querySelectorAll('tbody tr, [role="row"], [class*="table-row"], [class*="TableRow"], [class*="row"]')
    );

    let totalDeposited = 0;
    let totalWithdrawn = 0;
    let rowCount = 0;

    for (const el of rows) {
      const txt = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!txt || txt.length > 260) continue;
      if (!/\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2}/.test(txt)) continue;

      const isDeposit = /\b(deposit|transfer\s*in|top\s*up|credit\s*in)\b/i.test(txt);
      const isWithdraw = /\b(withdraw|withdrawal|transfer\s*out)\b/i.test(txt);
      if (!isDeposit && !isWithdraw) continue;

      const amtMatches = txt.match(/([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2})/g);
      if (!amtMatches || amtMatches.length === 0) continue;
      const amt = Math.abs(parseFloat(amtMatches[0].replace(/,/g, '')));
      if (!amt || isNaN(amt)) continue;

      if (isDeposit) totalDeposited += amt;
      else if (isWithdraw) totalWithdrawn += amt;
      rowCount++;
    }

    // Fallback check when body indicates Funding History with explicit single row text
    if (rowCount === 0 && /Funding History/i.test(bodyText)) {
      return null;
    }

    if (rowCount === 0) return null;
    const netFunded = Number((totalDeposited - totalWithdrawn).toFixed(2));
    return {
      totalDeposited: Number(totalDeposited.toFixed(2)),
      totalWithdrawn: Number(totalWithdrawn.toFixed(2)),
      // When account has been fully withdrawn, preserve totalDeposited as Started Capital
      netFunded: netFunded > 0 ? netFunded : Number(totalDeposited.toFixed(2)),
      rowCount,
    };
  }

  /** Query elements including open Shadow DOM roots */
  function queryAllDeep(selector, root = document, acc = []) {
    if (!root) return acc;
    try {
      const nodes = root.querySelectorAll(selector);
      for (let i = 0; i < nodes.length; i++) acc.push(nodes[i]);
      const all = root.querySelectorAll('*');
      for (let i = 0; i < all.length; i++) {
        if (all[i].shadowRoot) {
          queryAllDeep(selector, all[i].shadowRoot, acc);
        }
      }
    } catch (_) {}
    return acc;
  }

  /** Scrape live Current Balance, Equity, Currency, Position History Net PnL & Funding Net */
  function scrapeVantageAccountBalance() {
    let currentBalance = null;
    let equity = null;
    let currency = null;

    // Strategy 1: Scan all compact label nodes across DOM + Shadow DOM (header, top bar, or bottom account bar)
    const candidates = queryAllDeep('span, div, p, td, th, dt, dd, label, strong, b, button');

    const inspectLabel = (el, labelRegex) => {
      const txt = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!txt || txt.length > 80) return null;
      if (/\b(?:Balance\s+Sheet|Trial\s+Balance)\b/i.test(txt)) return null;
      if (!labelRegex.test(txt)) return null;

      // Inline "Balance: $0.00" or "Balance (USD) 0.00"
      const afterLabel = txt.replace(labelRegex, '').trim();
      if (afterLabel && /\d/.test(afterLabel)) {
        const inlineMoney = extractMoneyValue(afterLabel);
        if (inlineMoney && inlineMoney.val >= 0) return inlineMoney;
      }

      // Check siblings, parent's siblings, and compact parent (common flex/grid label+value layouts)
      const neighbors = [
        el.nextElementSibling,
        el.previousElementSibling,
        el.parentElement?.nextElementSibling,
        el.parentElement?.previousElementSibling,
        el.parentElement,
      ];
      for (const n of neighbors) {
        if (!n) continue;
        const nTxt = (n.innerText || n.textContent || '').replace(/\s+/g, ' ').trim();
        if (!nTxt || nTxt.length > 70 || !/\d/.test(nTxt)) continue;
        if (n === el.parentElement && /\b(equity|margin|leverage|credit|account\s*#)\b/i.test(nTxt)) continue;
        const cleaned = nTxt.replace(labelRegex, '').trim();
        if (!cleaned || !/\d/.test(cleaned)) continue;
        const m = extractMoneyValue(cleaned);
        if (m && m.val >= 0) return m;
      }
      return null;
    };

    const balanceLabelRx = /^(?:(?:Account|Available|Wallet|Cash|Total)\s+)?Balance(?:\s*\([A-Z]{3}\))?\s*:?/i;
    const equityLabelRx = /^(?:(?:Account|Net)\s+)?Equity(?:\s*\([A-Z]{3}\))?\s*:?/i;

    for (const el of candidates) {
      if (currentBalance == null) {
        const res = inspectLabel(el, balanceLabelRx);
        if (res) {
          currentBalance = res.val;
          if (!currency && res.currency) currency = res.currency;
        }
      }
      if (equity == null) {
        const res = inspectLabel(el, equityLabelRx);
        if (res) {
          equity = res.val;
          if (!currency && res.currency) currency = res.currency;
        }
      }
      if (currentBalance != null && equity != null) break;
    }

    // Strategy 2: Full body text regex fallback (handles multi-line labels & bottom account bars)
    const bodyText = document.body?.innerText || '';

    if (currentBalance == null) {
      const balMatch = bodyText.match(
        /(?:^|\s)(?:(?:Account|Available|Wallet|Cash|Total)\s+)?Balance(?:\s*\([A-Z]{3}\))?\s*[:\s]+((?:USD|INR|EUR|GBP|AUD|CAD|SGD)?\s*[\$₹€£]?\s*(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?(?:\s*(?:USD|INR|EUR|GBP|AUD|CAD|SGD))?)/i
      );
      if (balMatch) {
        const m = extractMoneyValue(balMatch[1]);
        if (m && m.val >= 0) {
          currentBalance = m.val;
          if (!currency && m.currency) currency = m.currency;
        }
      }
    }

    if (equity == null) {
      const eqMatch = bodyText.match(
        /(?:^|\s)(?:(?:Account|Net)\s+)?Equity(?:\s*\([A-Z]{3}\))?\s*[:\s]+((?:USD|INR|EUR|GBP|AUD|CAD|SGD)?\s*[\$₹€£]?\s*(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?(?:\s*(?:USD|INR|EUR|GBP|AUD|CAD|SGD))?)/i
      );
      if (eqMatch) {
        const m = extractMoneyValue(eqMatch[1]);
        if (m && m.val >= 0) {
          equity = m.val;
          if (!currency && m.currency) currency = m.currency;
        }
      }
    }

    // Position History summary bar: "Closed PnL: -87.74  Net PnL: -87.74"
    let visibleNetPnl = null;
    const netPnlMatch = bodyText.match(/Net\s*PnL\s*:\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2})/i);
    if (netPnlMatch) {
      const parsed = parseFloat(netPnlMatch[1].replace(/,/g, ''));
      if (!isNaN(parsed) && isFinite(parsed)) visibleNetPnl = parsed;
    }

    const funding = scrapeFundingHistoryNet();

    return {
      currentBalance,
      equity,
      currency,
      visibleNetPnl,
      fundingNet: funding?.netFunded ?? null,
      fundingRowCount: funding?.rowCount ?? 0,
      scrapedAt: new Date().toISOString(),
    };
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

  async function syncBalanceOnly(force = false, options = {}) {
    const account = scrapeVantageAccountBalance();
    if (account.currentBalance == null && account.fundingNet == null) {
      return { ok: false, note: 'Live Vantage Balance not visible on page yet.', account };
    }
    const balKey = `${account.currentBalance ?? 'none'}|${account.fundingNet ?? 'none'}`;
    if (!force && balKey === lastBalanceKey) {
      return { ok: true, skipped: true, account };
    }
    const res = await chrome.runtime.sendMessage({
      type: 'SYNC_ACCOUNT_BALANCE',
      account,
      ...options,
    });
    if (res?.ok) {
      lastBalanceKey = balKey;
    }
    return { ...res, account };
  }

  async function runSync(force = false, captureScreenshot = false) {
    if (isSyncInFlight) return { ok: false, error: 'Sync already in progress' };

    const trades = scrapeVantagePositionHistory();
    const account = scrapeVantageAccountBalance();
    if (trades.length === 0) {
      if (account.currentBalance != null || account.fundingNet != null) {
        await syncBalanceOnly(force).catch(() => {});
      }
      return { ok: true, insertedCount: 0, skippedCount: 0, totalSeen: 0, account, note: 'No Position History rows visible yet.' };
    }

    const fingerprint = trades.map((t) => t.brokerTicketId).join('|');
    if (!force && fingerprint === lastSentFingerprint) {
      await syncBalanceOnly(false).catch(() => {});
      return { ok: true, insertedCount: 0, skippedCount: trades.length, totalSeen: trades.length, account };
    }

    isSyncInFlight = true;
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SYNC_TRADES',
        trades,
        account,
        captureScreenshot,
      });
      if (response?.ok) {
        lastSentFingerprint = fingerprint;
        lastBalanceKey = `${account.currentBalance ?? 'none'}|${account.fundingNet ?? 'none'}`;
        if (response.insertedCount > 0) {
          showSyncToast(response.insertedCount, Boolean(response.screenshotAttached));
        }
      }
      return { ...response, account };
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
  const pollTimer = setInterval(async () => {
    try {
      const state = await chrome.storage.local.get(['autoSync', 'session']);
      if (state.autoSync !== false && state.session?.access_token) {
        await runSync(false);
      }
    } catch (_) {}
  }, 15000);

  // Listen to manual triggers from Popup (multi-frame safe for iframe-hosted terminals)
  const isChildFrame = window.top !== window.self;

  const onRuntimeMessage = (msg, _sender, sendResponse) => {
    if (msg.type === 'SCRAPE_AND_SYNC_NOW') {
      const hasContent =
        scrapeVantagePositionHistory().length > 0 ||
        (() => {
          const a = scrapeVantageAccountBalance();
          return a.currentBalance != null || a.fundingNet != null;
        })();

      if (isChildFrame && !hasContent) return false;

      const exec = () =>
        runSync(true, Boolean(msg.captureScreenshot))
          .then((res) => sendResponse(res))
          .catch((err) => sendResponse({ ok: false, error: err.message }));

      if (!isChildFrame && !hasContent && document.querySelector('iframe')) {
        setTimeout(exec, 90);
      } else {
        exec();
      }
      return true;
    }

    if (msg.type === 'SYNC_BALANCE_NOW') {
      const a = scrapeVantageAccountBalance();
      const hasBal = a.currentBalance != null || a.fundingNet != null;
      if (isChildFrame && !hasBal) return false;

      const exec = () =>
        syncBalanceOnly(true, {
          forceUpdateStarted: true,
          customStartedBalance: msg.customStartedBalance ?? null,
        })
          .then((res) => sendResponse(res))
          .catch((err) => sendResponse({ ok: false, error: err.message }));

      if (!isChildFrame && !hasBal && document.querySelector('iframe')) {
        setTimeout(exec, 90);
      } else {
        exec();
      }
      return true;
    }

    if (msg.type === 'PREVIEW_VANTAGE_TRADES') {
      const trades = scrapeVantagePositionHistory();
      const account = scrapeVantageAccountBalance();
      const hasContent = trades.length > 0 || account.currentBalance != null || account.fundingNet != null;

      if (isChildFrame && !hasContent) return false;

      if (!isChildFrame && !hasContent && document.querySelector('iframe')) {
        setTimeout(() => {
          sendResponse({ ok: true, count: trades.length, trades: trades.slice(0, 5), account });
        }, 90);
      } else {
        sendResponse({ ok: true, count: trades.length, trades: trades.slice(0, 5), account });
      }
      return true;
    }
  };

  chrome.runtime.onMessage.addListener(onRuntimeMessage);

  window.__tradeflowVantageCleanup = () => {
    clearTimeout(syncTimer);
    clearInterval(pollTimer);
    observer.disconnect();
    try {
      chrome.runtime.onMessage.removeListener(onRuntimeMessage);
    } catch (_) {}
  };
})();

// ============================================================================
// TradeFlow Vantage Bridge — Background Service Worker (MV3)
// Syncs closed Vantage Web-Trade positions directly to Supabase with RLS
// ============================================================================

const SUPABASE_URL = 'https://stmmeddkycvhelvxgone.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0bW1lZGRreWN2aGVsdnhnb25lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MTkyMTIsImV4cCI6MjEwNTQ5NTIxMn0.E0A6jzjg-HXyY-tRw1zKvaVsuNR3JfAHIaSZY2D6tf8';

async function reinjectExtensionScripts() {
  if (!chrome.scripting?.executeScript) return;
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue;
      if (tab.url.includes('vantagemarkets.com')) {
        chrome.scripting
          .executeScript({ target: { tabId: tab.id, allFrames: true }, files: ['vantage-content.js'] })
          .catch(() => {});
      } else if (
        tab.url.includes('localhost:5173') ||
        tab.url.includes('localhost:4173') ||
        tab.url.includes('vercel.app') ||
        tab.url.includes('netlify.app') ||
        tab.url.includes('github.io')
      ) {
        chrome.scripting
          .executeScript({ target: { tabId: tab.id }, files: ['tradeflow-bridge.js'] })
          .catch(() => {});
      }
    }
  } catch (_) {}
}

// Default storage state
chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(['autoSync', 'autoScreenshot', 'autoBalanceSync']);
  const updates = {};
  if (existing.autoSync === undefined) updates.autoSync = true;
  if (existing.autoScreenshot === undefined) updates.autoScreenshot = true;
  if (existing.autoBalanceSync === undefined) updates.autoBalanceSync = true;
  if (Object.keys(updates).length > 0) {
    await chrome.storage.local.set(updates);
  }
  updateBadge();
  reinjectExtensionScripts();
});

chrome.runtime.onStartup.addListener(() => {
  updateBadge();
  reinjectExtensionScripts();
});

async function updateBadge() {
  const state = await chrome.storage.local.get(['session', 'autoSync']);
  if (state.session?.access_token) {
    chrome.action.setBadgeText({ text: state.autoSync !== false ? 'ON' : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#10B981' });
  } else {
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#DB9F35' });
  }
}

/** Refresh Supabase JWT session using refresh_token */
async function ensureValidSession() {
  const { session } = await chrome.storage.local.get(['session']);
  if (!session || !session.access_token || !session.user?.id) {
    throw new Error('Not signed in to TradeFlow. Open extension popup to connect.');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const expiresAt = session.expires_at || 0;

  // Refresh if token expires within 2 minutes
  if (expiresAt && nowSec >= expiresAt - 120 && session.refresh_token) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });

    if (res.ok) {
      const fresh = await res.json();
      const updatedSession = {
        access_token: fresh.access_token,
        refresh_token: fresh.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + (fresh.expires_in || 3600),
        user: fresh.user || session.user,
      };
      await chrome.storage.local.set({ session: updatedSession });
      return updatedSession;
    }
  }

  return session;
}

/** Map friendly session name to Supabase schema check enum */
function mapSessionForDb(session) {
  if (!session) return 'Asian';
  const s = String(session).trim();
  if (s === 'Tokyo') return 'Asian';
  if (['London', 'New York', 'Asian', 'London/NY Overlap'].includes(s)) return s;
  const lower = s.toLowerCase();
  if (lower.includes('london') && (lower.includes('ny') || lower.includes('new york'))) {
    return 'London/NY Overlap';
  }
  if (lower.includes('london')) return 'London';
  if (lower.includes('new york') || lower.includes('ny')) return 'New York';
  return 'Asian';
}

/** Format notes with TradeFlow metadata tags so editing in app never drops ticket IDs or execution prices */
function buildNotesWithMeta(trade) {
  const tags = [];
  if (trade.session && !['London', 'New York', 'Asian', 'London/NY Overlap'].includes(trade.session)) {
    tags.push(`[SESSION: ${trade.session}]`);
  } else if (trade.session === 'Tokyo') {
    tags.push(`[SESSION: Tokyo]`);
  }
  if (trade.tradeSuccessRate) {
    tags.push(`[OUTCOME: ${trade.tradeSuccessRate}]`);
  }
  if (trade.brokerTicketId) {
    tags.push(`[TICKET: ${trade.brokerTicketId}]`);
  }
  if (trade.brokerSource) {
    tags.push(`[BROKER: ${trade.brokerSource}]`);
  }
  if (trade.exitPrice != null && isFinite(Number(trade.exitPrice))) {
    tags.push(`[EXIT: ${Number(trade.exitPrice)}]`);
  }
  if (trade.chargesSwap) {
    tags.push(`[CHARGES: ${trade.chargesSwap}]`);
  }
  if (trade.openTimeRaw) {
    tags.push(`[OPEN: ${trade.openTimeRaw}]`);
  }
  if (trade.closeTimeRaw) {
    tags.push(`[CLOSE: ${trade.closeTimeRaw}]`);
  }
  const base = (trade.notes || '').trim();
  if (tags.length > 0) {
    return base ? `${base}\n${tags.join('\n')}` : tags.join('\n');
  }
  return base || null;
}

/** Notify any open TradeFlow app tabs to refresh immediately */
function notifyTradeFlowTabs(insertedCount = 1, balanceSynced = false) {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (
        tab.id &&
        tab.url &&
        (tab.url.includes('localhost') ||
          tab.url.includes('vercel.app') ||
          tab.url.includes('netlify.app') ||
          tab.url.includes('github.io'))
      ) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'TRADEFLOW_SYNC_COMPLETED',
          insertedCount,
          balanceSynced: Boolean(balanceSynced),
        }).catch(() => {});
      }
    }
  });
}

/** Capture visible screenshot of the Vantage Web-Trade tab */
async function captureTabScreenshot(tabId, forceActivate = false) {
  if (!tabId) return null;
  try {
    let tab = await chrome.tabs.get(tabId);
    if (!tab) return null;

    if (!tab.active) {
      if (!forceActivate) return null;
      await chrome.tabs.update(tabId, { active: true });
      await chrome.windows.update(tab.windowId, { focused: true }).catch(() => {});
      await new Promise((r) => setTimeout(r, 250));
      tab = await chrome.tabs.get(tabId);
    }

    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'jpeg',
      quality: 75,
    });
    return dataUrl || null;
  } catch (err) {
    console.warn('[TradeFlow Bridge] Screenshot capture skipped:', err?.message || err);
    return null;
  }
}

/** Upload captured JPEG screenshot to Supabase Storage (falls back to dataUrl if bucket unavailable) */
async function uploadScreenshotToSupabase(session, fileKey, dataUrl) {
  if (!dataUrl) return null;
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const safeKey = String(fileKey || `snap_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    const objectPath = `${session.user.id}/${safeKey}.jpg`;

    const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/chart-screenshots/${objectPath}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
        'x-upsert': 'true',
        'Content-Type': 'image/jpeg',
      },
      body: blob,
    });

    if (uploadRes.ok) {
      const signRes = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/chart-screenshots/${objectPath}`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresIn: 315360000 }),
      });

      if (signRes.ok) {
        const signData = await signRes.json();
        if (signData?.signedURL) {
          const suffix = signData.signedURL.startsWith('/') ? signData.signedURL : `/${signData.signedURL}`;
          return `${SUPABASE_URL}/storage/v1${suffix}`;
        }
      }
    }
  } catch (err) {
    console.warn('[TradeFlow Bridge] Storage upload fallback to inline JPEG:', err?.message || err);
  }
  return dataUrl;
}

/** Sign in directly with TradeFlow email + password */
async function handleSignIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.msg || 'Invalid TradeFlow email or password');
  }

  const session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
    user: data.user,
  };

  await chrome.storage.local.set({ session });
  await updateBadge();
  return session;
}

/** Deduplicate & insert scraped Vantage trades into Supabase */
async function syncTradesToSupabase(incomingTrades, senderTab = null, options = {}) {
  if (!Array.isArray(incomingTrades) || incomingTrades.length === 0) {
    return { insertedCount: 0, skippedCount: 0, totalSeen: 0, screenshotAttached: false };
  }

  const session = await ensureValidSession();
  const userId = session.user.id;
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };

  // 1. Fetch existing trades for user to deduplicate & compute next trade_number
  const existingRes = await fetch(
    `${SUPABASE_URL}/rest/v1/trades?select=id,trade_number,trade_date,trade_time,pair,direction,lot_size,pnl,notes&user_id=eq.${encodeURIComponent(userId)}`,
    { headers }
  );

  if (!existingRes.ok) {
    if (existingRes.status === 401) {
      await chrome.storage.local.remove(['session']);
      await updateBadge();
      throw new Error('Session expired. Please reconnect in extension popup.');
    }
    throw new Error(`Supabase read error: ${existingRes.status}`);
  }

  const existingRows = await existingRes.json();
  const existingTickets = new Set();
  const existingSigs = new Set();
  let maxTradeNum = 0;

  for (const row of existingRows) {
    const num = Number(row.trade_number) || 0;
    if (num > maxTradeNum) maxTradeNum = num;

    if (row.notes) {
      const m = String(row.notes).match(/\[TICKET:\s*(.*?)\]/);
      if (m && m[1]) existingTickets.add(m[1].trim());
    }

    const cleanPair = String(row.pair || '').replace('/', '').toUpperCase();
    const sig = `${row.trade_date}_${row.trade_time}_${cleanPair}_${row.direction}_${Number(row.lot_size || 0).toFixed(2)}_${Number(row.pnl || 0).toFixed(2)}`;
    existingSigs.add(sig);
  }

  // Filter out trades already in TradeFlow
  const toInsert = [];
  let skippedCount = 0;

  // Sort oldest close time first so trade numbers increment chronologically
  const chronological = [...incomingTrades].sort((a, b) =>
    `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)
  );

  for (const t of chronological) {
    const cleanPair = String(t.pair || '').replace('/', '').toUpperCase();
    const sig = `${t.date}_${t.time}_${cleanPair}_${t.order}_${Number(t.lotSize || 0).toFixed(2)}_${Number(t.netPnl ?? t.pnl ?? 0).toFixed(2)}`;

    if ((t.brokerTicketId && existingTickets.has(t.brokerTicketId)) || existingSigs.has(sig)) {
      skippedCount++;
      continue;
    }

    maxTradeNum += 1;
    const pnlVal = Number(t.netPnl ?? t.pnl ?? 0);
    const rVal = pnlVal > 0.001 ? 1.0 : pnlVal < -0.001 ? -1.0 : 0;

    toInsert.push({
      user_id: userId,
      trade_number: maxTradeNum,
      trade_date: t.date,
      trade_time: t.time || '00:00',
      pair: t.pair || 'XAU/USD',
      direction: t.order === 'SELL' ? 'SELL' : 'BUY',
      lot_size: Number(t.lotSize) || 0.01,
      entry_price: t.entryPrice ?? null,
      sl_price: null,
      tp_price: null,
      pnl: pnlVal,
      r_multiple: rVal,
      pips: t.pips ?? null,
      exit_type: t.exitType || (pnlVal > 0.001 ? 'TARGET' : pnlVal < -0.001 ? 'STOP_LOSS' : 'BREAKEVEN'),
      trade_quality: 'CLEAN',
      emotion: 'FOCUSED',
      execution: 'CLEAN',
      violation_reason: null,
      setup_type: null,
      htf_context: null,
      entry_reason: null,
      session: mapSessionForDb(t.session),
      notes: buildNotesWithMeta(t),
      chart_url: null,
      updated_at: new Date().toISOString(),
    });

    if (t.brokerTicketId) existingTickets.add(t.brokerTicketId);
    existingSigs.add(sig);
  }

  let screenshotAttached = false;
  if (toInsert.length > 0) {
    const prefs = await chrome.storage.local.get(['autoScreenshot']);
    const wantAutoSnap = prefs.autoScreenshot !== false;
    const shouldCapture =
      Boolean(options.captureScreenshot) ||
      (wantAutoSnap && toInsert.length <= 2 && Boolean(senderTab?.id) && Boolean(senderTab?.active));

    if (shouldCapture && senderTab?.id) {
      const snapDataUrl = await captureTabScreenshot(senderTab.id, Boolean(options.captureScreenshot));
      if (snapDataUrl) {
        const latestRow = toInsert[toInsert.length - 1];
        const uploadedUrl = await uploadScreenshotToSupabase(
          session,
          `vantage_${latestRow.trade_date}_${latestRow.trade_number}_${Date.now()}`,
          snapDataUrl
        );
        if (uploadedUrl) {
          // Attach captured chart screenshot to newly closed trade(s) in this batch
          for (const row of toInsert) {
            row.chart_url = uploadedUrl;
          }
          screenshotAttached = true;
        }
      }
    }

    // Ensure profile exists before insert
    await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        ...headers,
        Prefer: 'resolution=ignore-duplicates',
      },
      body: JSON.stringify({
        id: userId,
        name: session.user?.user_metadata?.name || 'TradeFlow Trader',
        base_currency: 'USD',
        initial_capital: 10000,
        current_balance: 10000,
      }),
    }).catch(() => {});

    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/trades`, {
      method: 'POST',
      headers: {
        ...headers,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(toInsert),
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      throw new Error(`Trade insert failed: ${insertRes.status} ${errText}`);
    }
  }

  // Record sync telemetry
  const prev = await chrome.storage.local.get(['totalSynced', 'autoBalanceSync']);
  const totalSynced = (prev.totalSynced || 0) + toInsert.length;

  await chrome.storage.local.set({
    lastSyncAt: new Date().toISOString(),
    lastInsertedCount: toInsert.length,
    lastSkippedCount: skippedCount,
    totalSynced,
    lastTradesPreview: incomingTrades.slice(0, 5),
  });

  // Auto-sync live Vantage balance & started capital alongside trades
  let accountSync = null;
  if (prev.autoBalanceSync !== false && options.account && (options.account.currentBalance != null || options.account.fundingNet != null)) {
    accountSync = await syncAccountBalanceToSupabase(options.account, {
      silentNotify: toInsert.length > 0, // already notifying below if new trades inserted
    }).catch((e) => {
      console.warn('[TradeFlow Bridge] Account balance sync warning:', e?.message || e);
      return null;
    });
  }

  // Notify TradeFlow tabs if open
  if (toInsert.length > 0 || accountSync) {
    notifyTradeFlowTabs(toInsert.length, Boolean(accountSync));
  }

  return {
    insertedCount: toInsert.length,
    skippedCount,
    totalSeen: incomingTrades.length,
    screenshotAttached,
    accountSync,
  };
}

/** Sync live Vantage Current Balance & Started Balance (initial_capital) to Supabase profiles */
async function syncAccountBalanceToSupabase(accountInfo, options = {}) {
  const session = await ensureValidSession();
  const userId = session.user.id;
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };

  // Ensure profile exists
  await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      ...headers,
      Prefer: 'resolution=ignore-duplicates',
    },
    body: JSON.stringify({
      id: userId,
      name: session.user?.user_metadata?.name || 'TradeFlow Trader',
      base_currency: accountInfo?.currency === 'INR' ? 'INR' : 'USD',
      initial_capital: 1000,
      current_balance: 1000,
    }),
  }).catch(() => {});

  // Read existing profile & all user trades PnL
  const [profRes, tradesRes, stored] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/profiles?select=initial_capital,current_balance,base_currency&id=eq.${encodeURIComponent(userId)}`, { headers }),
    fetch(`${SUPABASE_URL}/rest/v1/trades?select=pnl&user_id=eq.${encodeURIComponent(userId)}`, { headers }),
    chrome.storage.local.get(['startedBalanceOverride', 'detectedFundingNet', 'lastAccountSync']),
  ]);

  const profRows = profRes.ok ? await profRes.json() : [];
  const profile = Array.isArray(profRows) && profRows.length > 0 ? profRows[0] : {};
  const tradeRows = tradesRes.ok ? await tradesRes.json() : [];

  const totalTradesPnl = Array.isArray(tradeRows)
    ? tradeRows.reduce((sum, r) => sum + (Number(r.pnl) || 0), 0)
    : 0;

  const existingInitial =
    profile.initial_capital != null && isFinite(Number(profile.initial_capital)) && Number(profile.initial_capital) > 0
      ? Number(profile.initial_capital)
      : 1000;
  const existingCurrent =
    profile.current_balance != null && isFinite(Number(profile.current_balance))
      ? Number(profile.current_balance)
      : existingInitial;

  const liveBalance =
    accountInfo?.currentBalance != null && isFinite(Number(accountInfo.currentBalance))
      ? Number(Number(accountInfo.currentBalance).toFixed(2))
      : existingCurrent;

  const netPnlOffset =
    Array.isArray(tradeRows) && tradeRows.length > 0
      ? totalTradesPnl
      : accountInfo?.visibleNetPnl != null && isFinite(Number(accountInfo.visibleNetPnl))
      ? Number(accountInfo.visibleNetPnl)
      : 0;

  const derivedStarted = Number((liveBalance - netPnlOffset).toFixed(2));

  let resolvedStarted = existingInitial;
  let startedSource = 'existing';

  const customOverride =
    options.customStartedBalance != null && Number(options.customStartedBalance) > 0
      ? Number(Number(options.customStartedBalance).toFixed(2))
      : null;

  if (customOverride != null) {
    resolvedStarted = customOverride;
    startedSource = 'manual';
    await chrome.storage.local.set({ startedBalanceOverride: customOverride });
  } else if (accountInfo?.fundingNet != null && Number(accountInfo.fundingNet) > 0) {
    resolvedStarted = Number(Number(accountInfo.fundingNet).toFixed(2));
    startedSource = 'funding_history';
    await chrome.storage.local.set({ detectedFundingNet: resolvedStarted });
  } else if (stored.startedBalanceOverride && Number(stored.startedBalanceOverride) > 0) {
    resolvedStarted = Number(stored.startedBalanceOverride);
    startedSource = 'manual';
  } else if (stored.detectedFundingNet && Number(stored.detectedFundingNet) > 0) {
    resolvedStarted = Number(stored.detectedFundingNet);
    startedSource = 'funding_history';
  } else if (derivedStarted > 0) {
    const isUntouchedDefault =
      Math.abs(existingInitial - 1000) < 0.01 || Math.abs(existingInitial - 10000) < 0.01;
    const prevAuto = stored.lastAccountSync?.startedSource === 'derived';
    if (options.forceUpdateStarted || isUntouchedDefault || prevAuto) {
      resolvedStarted = derivedStarted;
      startedSource = 'derived';
    }
  }

  const patchPayload = {
    current_balance: liveBalance,
    initial_capital: resolvedStarted,
  };
  if (accountInfo?.currency === 'USD' || accountInfo?.currency === 'INR') {
    patchPayload.base_currency = accountInfo.currency;
  }

  const changed =
    Math.abs(existingCurrent - liveBalance) > 0.009 ||
    Math.abs(existingInitial - resolvedStarted) > 0.009;

  if (changed || options.forceUpdateStarted) {
    const patchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`,
      {
        method: 'PATCH',
        headers: {
          ...headers,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(patchPayload),
      }
    );
    if (!patchRes.ok) {
      const errText = await patchRes.text();
      throw new Error(`Failed to update balance: ${patchRes.status} ${errText}`);
    }
  }

  const accountSync = {
    currentBalance: liveBalance,
    equity: accountInfo?.equity ?? null,
    startedBalance: resolvedStarted,
    derivedStarted: derivedStarted > 0 ? derivedStarted : null,
    startedSource,
    currency: accountInfo?.currency || profile.base_currency || 'USD',
    syncedAt: new Date().toISOString(),
  };

  await chrome.storage.local.set({ lastAccountSync: accountSync });

  if ((changed || options.forceUpdateStarted) && !options.silentNotify) {
    notifyTradeFlowTabs(1, true);
  }

  return accountSync;
}

/** Capture active Vantage chart & attach screenshot to the trader's latest trade in Supabase */
async function attachScreenshotToLatestTrade(targetTabId) {
  const session = await ensureValidSession();
  const userId = session.user.id;
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };

  let vTabId = targetTabId;
  if (!vTabId) {
    const tabs = await chrome.tabs.query({});
    const vTab = tabs.find(
      (t) =>
        t.url &&
        (t.url.includes('vantagemarkets.com/web-trade') || t.url.includes('secure.vantagemarkets.com'))
    );
    vTabId = vTab?.id;
  }
  if (!vTabId) {
    throw new Error('Vantage Web-Trade tab not found.');
  }

  const snapDataUrl = await captureTabScreenshot(vTabId, true);
  if (!snapDataUrl) {
    throw new Error('Unable to capture Vantage tab screenshot. Ensure the tab is open and visible.');
  }

  // Find latest trade for this user
  const latestRes = await fetch(
    `${SUPABASE_URL}/rest/v1/trades?select=id,trade_number,pair,trade_date,trade_time&user_id=eq.${encodeURIComponent(userId)}&order=trade_date.desc,trade_time.desc,trade_number.desc&limit=1`,
    { headers }
  );
  if (!latestRes.ok) {
    throw new Error(`Could not find latest trade: ${latestRes.status}`);
  }

  const latestRows = await latestRes.json();
  if (!Array.isArray(latestRows) || latestRows.length === 0) {
    throw new Error('No trades found in TradeFlow yet. Sync or add a trade first.');
  }

  const latest = latestRows[0];
  const uploadedUrl = await uploadScreenshotToSupabase(
    session,
    `vantage_trade_${latest.trade_number}_${Date.now()}`,
    snapDataUrl
  );

  const patchRes = await fetch(
    `${SUPABASE_URL}/rest/v1/trades?id=eq.${encodeURIComponent(latest.id)}&user_id=eq.${encodeURIComponent(userId)}`,
    {
      method: 'PATCH',
      headers: {
        ...headers,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        chart_url: uploadedUrl,
        updated_at: new Date().toISOString(),
      }),
    }
  );

  if (!patchRes.ok) {
    const errText = await patchRes.text();
    throw new Error(`Failed to attach screenshot: ${patchRes.status} ${errText}`);
  }

  notifyTradeFlowTabs(1);
  return {
    tradeNumber: latest.trade_number,
    pair: latest.pair,
    chartUrl: uploadedUrl,
  };
}

// Listen to messages from Popup & Content Scripts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'SIGN_IN') {
    handleSignIn(msg.email, msg.password)
      .then((session) => sendResponse({ ok: true, session }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === 'SAVE_SESSION_FROM_APP') {
    if (msg.session?.access_token && msg.session?.user?.id) {
      chrome.storage.local.set({ session: msg.session }).then(async () => {
        await updateBadge();
        sendResponse({ ok: true });
      });
    } else {
      sendResponse({ ok: false, error: 'Invalid session payload' });
    }
    return true;
  }

  if (msg.type === 'SIGN_OUT') {
    chrome.storage.local.remove(['session']).then(async () => {
      await updateBadge();
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type === 'SET_AUTO_SYNC') {
    chrome.storage.local.set({ autoSync: Boolean(msg.enabled) }).then(async () => {
      await updateBadge();
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type === 'SET_AUTO_SCREENSHOT') {
    chrome.storage.local.set({ autoScreenshot: Boolean(msg.enabled) }).then(() => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type === 'SET_AUTO_BALANCE_SYNC') {
    chrome.storage.local.set({ autoBalanceSync: Boolean(msg.enabled) }).then(() => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type === 'SYNC_ACCOUNT_BALANCE') {
    syncAccountBalanceToSupabase(msg.account || {}, {
      forceUpdateStarted: Boolean(msg.forceUpdateStarted),
      customStartedBalance: msg.customStartedBalance ?? null,
    })
      .then((accountSync) => sendResponse({ ok: true, accountSync }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === 'CLEAR_STARTED_OVERRIDE') {
    chrome.storage.local.remove(['startedBalanceOverride']).then(() => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type === 'SYNC_TRADES') {
    syncTradesToSupabase(msg.trades || [], sender?.tab || null, {
      captureScreenshot: Boolean(msg.captureScreenshot),
      account: msg.account || null,
    })
      .then((res) => sendResponse({ ok: true, ...res }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === 'CAPTURE_SCREENSHOT_TO_LATEST') {
    attachScreenshotToLatestTrade(msg.tabId || null)
      .then((res) => sendResponse({ ok: true, ...res }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === 'GET_STATE') {
    chrome.storage.local
      .get([
        'session',
        'autoSync',
        'autoScreenshot',
        'autoBalanceSync',
        'startedBalanceOverride',
        'detectedFundingNet',
        'lastAccountSync',
        'lastSyncAt',
        'lastInsertedCount',
        'lastSkippedCount',
        'totalSynced',
        'lastTradesPreview',
      ])
      .then((data) => sendResponse({ ok: true, data }));
    return true;
  }
});

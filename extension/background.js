// ============================================================================
// TradeFlow Vantage Bridge — Background Service Worker (MV3)
// Syncs closed Vantage Web-Trade positions directly to Supabase with RLS
// ============================================================================

const SUPABASE_URL = 'https://stmmeddkycvhelvxgone.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0bW1lZGRreWN2aGVsdnhnb25lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MTkyMTIsImV4cCI6MjEwNTQ5NTIxMn0.E0A6jzjg-HXyY-tRw1zKvaVsuNR3JfAHIaSZY2D6tf8';

// Default storage state
chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(['autoSync']);
  if (existing.autoSync === undefined) {
    await chrome.storage.local.set({ autoSync: true });
  }
  updateBadge();
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

/** Format notes with TradeFlow metadata tags so editing in app never drops ticket IDs */
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
  const base = trade.notes || `Synced from Vantage Web-Trade (${trade.closeTimeRaw || ''})`;
  return tags.length > 0 ? `${base}\n${tags.join('\n')}` : base;
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
async function syncTradesToSupabase(incomingTrades) {
  if (!Array.isArray(incomingTrades) || incomingTrades.length === 0) {
    return { insertedCount: 0, skippedCount: 0, totalSeen: 0 };
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
      pips: null,
      exit_type: t.exitType || (pnlVal > 0.001 ? 'TARGET' : pnlVal < -0.001 ? 'STOP_LOSS' : 'BREAKEVEN'),
      trade_quality: 'CLEAN',
      emotion: 'FOCUSED',
      execution: 'CLEAN',
      violation_reason: null,
      setup_type: 'Vantage Web-Trade',
      htf_context: 'Neutral',
      entry_reason: `Entry: ${t.entryPrice ?? '-'} → Exit: ${t.exitPrice ?? '-'}`,
      session: mapSessionForDb(t.session),
      notes: buildNotesWithMeta(t),
      chart_url: null,
      updated_at: new Date().toISOString(),
    });

    if (t.brokerTicketId) existingTickets.add(t.brokerTicketId);
    existingSigs.add(sig);
  }

  if (toInsert.length > 0) {
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
  const prev = await chrome.storage.local.get(['totalSynced']);
  const totalSynced = (prev.totalSynced || 0) + toInsert.length;

  await chrome.storage.local.set({
    lastSyncAt: new Date().toISOString(),
    lastInsertedCount: toInsert.length,
    lastSkippedCount: skippedCount,
    totalSynced,
    lastTradesPreview: incomingTrades.slice(0, 5),
  });

  // Notify TradeFlow tabs if open
  if (toInsert.length > 0) {
    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        if (
          tab.id &&
          tab.url &&
          (tab.url.includes('localhost') || tab.url.includes('vercel.app') || tab.url.includes('netlify.app'))
        ) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'TRADEFLOW_SYNC_COMPLETED',
            insertedCount: toInsert.length,
          }).catch(() => {});
        }
      }
    });
  }

  return {
    insertedCount: toInsert.length,
    skippedCount,
    totalSeen: incomingTrades.length,
  };
}

// Listen to messages from Popup & Content Scripts
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
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

  if (msg.type === 'SYNC_TRADES') {
    syncTradesToSupabase(msg.trades || [])
      .then((res) => sendResponse({ ok: true, ...res }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === 'GET_STATE') {
    chrome.storage.local
      .get(['session', 'autoSync', 'lastSyncAt', 'lastInsertedCount', 'lastSkippedCount', 'totalSynced', 'lastTradesPreview'])
      .then((data) => sendResponse({ ok: true, data }));
    return true;
  }
});

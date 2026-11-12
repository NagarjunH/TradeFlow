// ============================================================================
// TradeFlow App Bridge Content Script
// Shares active TradeFlow Supabase session with extension & notifies app on sync
// ============================================================================

(function () {
  function readSupabaseSessionFromLocalStorage() {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          const sessionObj = parsed?.currentSession || parsed;
          if (sessionObj?.access_token && sessionObj?.user?.id) {
            return {
              access_token: sessionObj.access_token,
              refresh_token: sessionObj.refresh_token,
              expires_at: sessionObj.expires_at,
              user: sessionObj.user,
            };
          }
        }
      }
    } catch (_) {}
    return null;
  }

  function pushSessionToExtension() {
    const session = readSupabaseSessionFromLocalStorage();
    if (session) {
      chrome.runtime.sendMessage({ type: 'SAVE_SESSION_FROM_APP', session }).catch(() => {});
    }
    return session;
  }

  // Push session immediately on load if TradeFlow is logged in
  pushSessionToExtension();

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'GRAB_SESSION_NOW') {
      const s = pushSessionToExtension();
      sendResponse({ ok: Boolean(s), session: s });
      return true;
    }

    if (msg.type === 'TRADEFLOW_SYNC_COMPLETED') {
      if (msg.balanceSynced) {
        try {
          localStorage.setItem('tradeflow_broker_balance_synced', '1');
        } catch (_) {}
      }
      window.dispatchEvent(
        new CustomEvent('tradeflow:broker-synced', {
          detail: { insertedCount: msg.insertedCount || 0, balanceSynced: Boolean(msg.balanceSynced) },
        })
      );
      sendResponse({ ok: true });
      return true;
    }
  });
})();

// ============================================================================
// TradeFlow Vantage Bridge — Extension Popup Controller
// ============================================================================

const connBadge = document.getElementById('connBadge');
const authSection = document.getElementById('authSection');
const syncSection = document.getElementById('syncSection');
const autoConnectBtn = document.getElementById('autoConnectBtn');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const signInBtn = document.getElementById('signInBtn');
const authMsg = document.getElementById('authMsg');
const userEmailLabel = document.getElementById('userEmailLabel');
const signOutBtn = document.getElementById('signOutBtn');
const vantageStatusText = document.getElementById('vantageStatusText');
const autoSyncToggle = document.getElementById('autoSyncToggle');
const autoScreenshotToggle = document.getElementById('autoScreenshotToggle');
const syncNowBtn = document.getElementById('syncNowBtn');
const snapChartBtn = document.getElementById('snapChartBtn');
const syncMsg = document.getElementById('syncMsg');
const lastSyncLabel = document.getElementById('lastSyncLabel');
const totalSyncedLabel = document.getElementById('totalSyncedLabel');

function showMsg(el, text, isErr = false) {
  el.textContent = text;
  el.className = `status-msg ${isErr ? 'err' : 'ok'}`;
}

function clearMsg(el) {
  el.className = 'status-msg';
  el.textContent = '';
}

async function findVantageTab() {
  const tabs = await chrome.tabs.query({});
  return tabs.find(
    (t) =>
      t.url &&
      (t.url.includes('vantagemarkets.com/web-trade') ||
        t.url.includes('secure.vantagemarkets.com'))
  );
}

async function findTradeFlowTab() {
  const tabs = await chrome.tabs.query({});
  return tabs.find(
    (t) =>
      t.url &&
      (t.url.includes('localhost:5173') ||
        t.url.includes('localhost:4173') ||
        t.url.includes('vercel.app') ||
        t.url.includes('netlify.app') ||
        t.url.includes('github.io'))
  );
}

async function refreshUI() {
  const res = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
  const data = res?.data || {};
  const session = data.session;

  if (session?.access_token && session?.user?.id) {
    connBadge.textContent = '● Connected';
    connBadge.className = 'badge badge-ok';
    authSection.classList.add('hidden');
    syncSection.classList.remove('hidden');

    userEmailLabel.textContent = session.user.email || session.user.id;
    autoSyncToggle.checked = data.autoSync !== false;
    if (autoScreenshotToggle) {
      autoScreenshotToggle.checked = data.autoScreenshot !== false;
    }

    if (data.lastSyncAt) {
      const dt = new Date(data.lastSyncAt);
      lastSyncLabel.textContent = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } else {
      lastSyncLabel.textContent = 'Never';
    }
    totalSyncedLabel.textContent = String(data.totalSynced || 0);

    // Check Vantage Web-Trade Tab
    const vTab = await findVantageTab();
    if (!vTab) {
      vantageStatusText.innerHTML =
        '<span style="color:#fbbf24;">⚠ Open <b>secure.vantagemarkets.com/web-trade</b> and click the <b>Position History</b> tab.</span>';
      syncNowBtn.disabled = true;
      if (snapChartBtn) snapChartBtn.disabled = true;
    } else {
      syncNowBtn.disabled = false;
      if (snapChartBtn) snapChartBtn.disabled = false;
      try {
        const preview = await chrome.tabs.sendMessage(vTab.id, { type: 'PREVIEW_VANTAGE_TRADES' });
        if (preview?.ok) {
          if (preview.count > 0) {
            vantageStatusText.innerHTML = `<span style="color:#34d399;">🟢 Detected <b>${preview.count}</b> closed trade(s) in Vantage Position History.</span>`;
          } else {
            vantageStatusText.innerHTML =
              '<span style="color:#94a3b8;">ℹ Vantage Terminal open. Click <b>Position History</b> tab to view closed orders.</span>';
          }
        }
      } catch (_) {
        vantageStatusText.innerHTML =
          '<span style="color:#fbbf24;">↻ Refresh the Vantage Web-Trade tab once so the sync script activates.</span>';
      }
    }
  } else {
    connBadge.textContent = '● Not Connected';
    connBadge.className = 'badge badge-off';
    authSection.classList.remove('hidden');
    syncSection.classList.add('hidden');
  }
}

autoConnectBtn.addEventListener('click', async () => {
  clearMsg(authMsg);
  const tfTab = await findTradeFlowTab();
  if (!tfTab) {
    showMsg(authMsg, 'Open TradeFlow in a browser tab first, or sign in with email below.', true);
    return;
  }
  try {
    const res = await chrome.tabs.sendMessage(tfTab.id, { type: 'GRAB_SESSION_NOW' });
    if (res?.ok) {
      showMsg(authMsg, 'Connected to TradeFlow!');
      await refreshUI();
    } else {
      showMsg(authMsg, 'Please log into TradeFlow in that tab first, then try again.', true);
    }
  } catch (err) {
    showMsg(authMsg, 'Refresh your TradeFlow tab once and try again.', true);
  }
});

signInBtn.addEventListener('click', async () => {
  clearMsg(authMsg);
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) {
    showMsg(authMsg, 'Enter your TradeFlow email and password.', true);
    return;
  }
  signInBtn.disabled = true;
  signInBtn.textContent = 'Connecting...';
  try {
    const res = await chrome.runtime.sendMessage({ type: 'SIGN_IN', email, password });
    if (res?.ok) {
      await refreshUI();
    } else {
      showMsg(authMsg, res?.error || 'Sign-in failed.', true);
    }
  } catch (err) {
    showMsg(authMsg, err.message || 'Connection error', true);
  } finally {
    signInBtn.disabled = false;
    signInBtn.textContent = 'Connect Account';
  }
});

signOutBtn.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'SIGN_OUT' });
  await refreshUI();
});

autoSyncToggle.addEventListener('change', async () => {
  await chrome.runtime.sendMessage({ type: 'SET_AUTO_SYNC', enabled: autoSyncToggle.checked });
});

if (autoScreenshotToggle) {
  autoScreenshotToggle.addEventListener('change', async () => {
    await chrome.runtime.sendMessage({
      type: 'SET_AUTO_SCREENSHOT',
      enabled: autoScreenshotToggle.checked,
    });
  });
}

syncNowBtn.addEventListener('click', async () => {
  clearMsg(syncMsg);
  const vTab = await findVantageTab();
  if (!vTab) {
    showMsg(syncMsg, 'Vantage Web-Trade tab not found.', true);
    return;
  }
  syncNowBtn.disabled = true;
  syncNowBtn.textContent = 'Syncing...';
  try {
    const res = await chrome.tabs.sendMessage(vTab.id, {
      type: 'SCRAPE_AND_SYNC_NOW',
      captureScreenshot: autoScreenshotToggle ? autoScreenshotToggle.checked : true,
    });
    if (res?.ok) {
      if (res.insertedCount > 0) {
        const snapNote = res.screenshotAttached ? ' + 📸 Chart saved!' : '';
        showMsg(
          syncMsg,
          `✅ Synced ${res.insertedCount} new trade(s)${snapNote} (${res.skippedCount || 0} duplicates skipped)`
        );
      } else if (res.totalSeen > 0) {
        showMsg(syncMsg, `All ${res.totalSeen} visible trade(s) are already synced in TradeFlow.`);
      } else {
        showMsg(syncMsg, 'No rows found. Make sure "Position History" tab is active on Vantage.', true);
      }
      await refreshUI();
    } else {
      showMsg(syncMsg, res?.error || 'Sync failed.', true);
    }
  } catch (err) {
    showMsg(syncMsg, 'Could not read Vantage tab. Refresh the Vantage tab once and try again.', true);
  } finally {
    syncNowBtn.disabled = false;
    syncNowBtn.textContent = '🔄 Sync Position History Now';
  }
});

if (snapChartBtn) {
  snapChartBtn.addEventListener('click', async () => {
    clearMsg(syncMsg);
    const vTab = await findVantageTab();
    if (!vTab) {
      showMsg(syncMsg, 'Open Vantage Web-Trade tab first to capture its chart.', true);
      return;
    }
    snapChartBtn.disabled = true;
    snapChartBtn.textContent = 'Capturing Chart...';
    try {
      const res = await chrome.runtime.sendMessage({
        type: 'CAPTURE_SCREENSHOT_TO_LATEST',
        tabId: vTab.id,
      });
      if (res?.ok) {
        showMsg(syncMsg, `📸 Chart attached to Trade #${res.tradeNumber} (${res.pair})!`);
        await refreshUI();
      } else {
        showMsg(syncMsg, res?.error || 'Failed to capture chart screenshot.', true);
      }
    } catch (err) {
      showMsg(syncMsg, err.message || 'Screenshot capture error', true);
    } finally {
      snapChartBtn.disabled = false;
      snapChartBtn.textContent = '📸 Snap Chart to Latest Trade';
    }
  });
}

refreshUI();

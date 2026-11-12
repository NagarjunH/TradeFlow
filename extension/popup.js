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
const autoBalanceSyncToggle = document.getElementById('autoBalanceSyncToggle');
const syncNowBtn = document.getElementById('syncNowBtn');
const snapChartBtn = document.getElementById('snapChartBtn');
const syncMsg = document.getElementById('syncMsg');
const liveBalanceLabel = document.getElementById('liveBalanceLabel');
const liveEquityLabel = document.getElementById('liveEquityLabel');
const startedSourceLabel = document.getElementById('startedSourceLabel');
const startedBalanceInput = document.getElementById('startedBalanceInput');
const resetStartedAutoBtn = document.getElementById('resetStartedAutoBtn');
const syncBalanceBtn = document.getElementById('syncBalanceBtn');
const balanceMsg = document.getElementById('balanceMsg');
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

/** Collect scraped trades + live account balance (via chrome.scripting if granted, else tabs.sendMessage) */
async function scrapeVantageAllFrames(tabId) {
  if (chrome.scripting?.executeScript) {
    let frameCalls;
    try {
      await chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        files: ['vantage-content.js'],
      });
      frameCalls = await chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        func: () => (typeof window.__tradeflowScrapeVantage === 'function' ? window.__tradeflowScrapeVantage() : null),
      });
    } catch (_) {
      await chrome.scripting.executeScript({
        target: { tabId, allFrames: false },
        files: ['vantage-content.js'],
      });
      frameCalls = await chrome.scripting.executeScript({
        target: { tabId, allFrames: false },
        func: () => (typeof window.__tradeflowScrapeVantage === 'function' ? window.__tradeflowScrapeVantage() : null),
      });
    }

    const results = (frameCalls || []).map((f) => f?.result).filter(Boolean);
    let bestTrades = [];
    let bestAccount = null;
    const debugParts = [];

    for (const r of results) {
      if (Array.isArray(r.trades) && r.trades.length > bestTrades.length) {
        bestTrades = r.trades;
      }
      if (r.account) {
        if (r.account.currentBalance != null) {
          bestAccount = r.account;
        } else if (!bestAccount && r.account.fundingNet != null) {
          bestAccount = r.account;
        }
        if (r.account.debugTopText) {
          debugParts.push(r.account.debugTopText);
        }
      }
    }

    if (!bestAccount) {
      bestAccount = results[0]?.account || { currentBalance: null, equity: null, fundingNet: null };
    }
    if (bestAccount.currentBalance == null && debugParts.length > 0) {
      bestAccount = { ...bestAccount, debugTopText: debugParts.join(' || ') };
    }

    return { count: bestTrades.length, trades: bestTrades, account: bestAccount };
  }

  // Fallback when chrome.scripting API is unavailable: use content-script messaging directly
  const preview = await chrome.tabs.sendMessage(tabId, { type: 'PREVIEW_VANTAGE_TRADES' });
  return {
    count: preview?.count || 0,
    trades: preview?.trades || [],
    account: preview?.account || { currentBalance: null, equity: null, fundingNet: null },
  };
}

/** Send message to Vantage tab, auto-injecting vantage-content.js when chrome.scripting is available */
async function sendToVantageTab(tabId, msg) {
  try {
    return await chrome.tabs.sendMessage(tabId, msg);
  } catch (err) {
    if (!chrome.scripting?.executeScript) {
      throw err;
    }
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: ['vantage-content.js'],
    });
    await new Promise((r) => setTimeout(r, 120));
    return await chrome.tabs.sendMessage(tabId, msg);
  }
}

async function sendToTradeFlowTab(tabId, msg) {
  try {
    return await chrome.tabs.sendMessage(tabId, msg);
  } catch (err) {
    if (!chrome.scripting?.executeScript) {
      throw err;
    }
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['tradeflow-bridge.js'],
    });
    await new Promise((r) => setTimeout(r, 100));
    return await chrome.tabs.sendMessage(tabId, msg);
  }
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
    if (autoBalanceSyncToggle) {
      autoBalanceSyncToggle.checked = data.autoBalanceSync !== false;
    }

    const lastAcct = data.lastAccountSync;
    const sym = lastAcct?.currency === 'INR' ? '₹' : '$';
    if (liveBalanceLabel && lastAcct?.currentBalance != null) {
      liveBalanceLabel.textContent = `${sym}${Number(lastAcct.currentBalance).toFixed(2)}`;
    }
    if (liveEquityLabel && lastAcct?.equity != null) {
      liveEquityLabel.textContent = `${sym}${Number(lastAcct.equity).toFixed(2)}`;
    }
    if (startedBalanceInput) {
      if (data.startedBalanceOverride > 0) {
        startedBalanceInput.value = String(data.startedBalanceOverride);
        if (startedSourceLabel) startedSourceLabel.textContent = 'Manual Override';
      } else if (lastAcct?.startedBalance != null) {
        startedBalanceInput.placeholder = `Auto: ${sym}${Number(lastAcct.startedBalance).toFixed(2)}`;
        if (startedSourceLabel) {
          startedSourceLabel.textContent =
            lastAcct.startedSource === 'funding_history'
              ? 'From Funding History'
              : lastAcct.startedSource === 'derived'
              ? 'Balance - Trades PnL'
              : 'Synced';
        }
      }
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
      if (syncBalanceBtn) syncBalanceBtn.disabled = true;
    } else {
      syncNowBtn.disabled = false;
      if (snapChartBtn) snapChartBtn.disabled = false;
      if (syncBalanceBtn) syncBalanceBtn.disabled = false;
      try {
        const preview = await scrapeVantageAllFrames(vTab.id);
        if (preview) {
          const pSym = preview.account?.currency === 'INR' ? '₹' : '$';
          if (liveBalanceLabel) {
            if (preview.account?.currentBalance != null) {
              liveBalanceLabel.textContent = `${pSym}${Number(preview.account.currentBalance).toFixed(2)}`;
            } else {
              liveBalanceLabel.textContent = 'Not detected on page';
            }
          }
          if (liveEquityLabel && preview.account?.equity != null) {
            liveEquityLabel.textContent = `${pSym}${Number(preview.account.equity).toFixed(2)}`;
          }
          if (preview.count > 0) {
            vantageStatusText.innerHTML = `<span style="color:#34d399;">🟢 Detected <b>${preview.count}</b> closed trade(s) in Vantage Position History.</span>`;
          } else {
            vantageStatusText.innerHTML =
              '<span style="color:#94a3b8;">ℹ Vantage Terminal open. Click <b>Position History</b> tab to view closed orders.</span>';
          }
        }
      } catch (err) {
        vantageStatusText.innerHTML =
          `<span style="color:#fbbf24;">↻ Refresh the Vantage Web-Trade tab once (${err?.message || 'waiting'}).</span>`;
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
    const res = await sendToTradeFlowTab(tfTab.id, { type: 'GRAB_SESSION_NOW' });
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

if (autoBalanceSyncToggle) {
  autoBalanceSyncToggle.addEventListener('change', async () => {
    await chrome.runtime.sendMessage({
      type: 'SET_AUTO_BALANCE_SYNC',
      enabled: autoBalanceSyncToggle.checked,
    });
  });
}

if (resetStartedAutoBtn) {
  resetStartedAutoBtn.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'CLEAR_STARTED_OVERRIDE' });
    if (startedBalanceInput) startedBalanceInput.value = '';
    if (startedSourceLabel) startedSourceLabel.textContent = 'Auto';
    showMsg(balanceMsg, 'Reset to auto-detect Started Balance on next sync.');
  });
}

if (syncBalanceBtn) {
  syncBalanceBtn.addEventListener('click', async () => {
    clearMsg(balanceMsg);
    const vTab = await findVantageTab();
    if (!vTab) {
      showMsg(balanceMsg, 'Vantage Web-Trade tab not found.', true);
      return;
    }
    const rawStarted = startedBalanceInput?.value?.trim();
    const customStarted = rawStarted ? parseFloat(rawStarted) : null;
    syncBalanceBtn.disabled = true;
    syncBalanceBtn.textContent = 'Syncing Balance...';
    try {
      const scraped = await scrapeVantageAllFrames(vTab.id);
      const acct = scraped?.account || {};
      if (acct.currentBalance == null && acct.fundingNet == null && !(customStarted > 0)) {
        const hint = acct.debugTopText ? ` Read: [${acct.debugTopText}]` : '';
        showMsg(balanceMsg, 'Live Vantage Balance not visible on page.' + hint, true);
      } else {
        const res = await chrome.runtime.sendMessage({
          type: 'SYNC_ACCOUNT_BALANCE',
          account: acct,
          forceUpdateStarted: true,
          customStartedBalance: customStarted && !isNaN(customStarted) && customStarted > 0 ? customStarted : null,
        });
        if (res?.ok && res.accountSync) {
          const sym = res.accountSync.currency === 'INR' ? '₹' : '$';
          showMsg(
            balanceMsg,
            `✅ Current: ${sym}${res.accountSync.currentBalance.toFixed(2)} | Started: ${sym}${res.accountSync.startedBalance.toFixed(2)}`
          );
          await refreshUI();
        } else {
          showMsg(balanceMsg, res?.error || 'Could not sync Balance to TradeFlow.', true);
        }
      }
    } catch (err) {
      showMsg(
        balanceMsg,
        `Could not read Vantage tab: ${err?.message || 'Refresh the Vantage tab once and try again.'}`,
        true
      );
    } finally {
      syncBalanceBtn.disabled = false;
      syncBalanceBtn.textContent = '💰 Sync Balance & Capital Now';
    }
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
    const res = await sendToVantageTab(vTab.id, {
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
    showMsg(
      syncMsg,
      `Could not read Vantage tab: ${err?.message || 'Refresh the Vantage tab once and try again.'}`,
      true
    );
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

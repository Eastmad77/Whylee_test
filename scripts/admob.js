// /scripts/admob.js — v9012 (safe postMessage, idempotent rewards, persisted caps)

/**
 * Native bridge helper
 */
const Native = {
  available() {
    return !!(window.AndroidAds?.postMessage || window.ReactNativeWebView?.postMessage);
  },
  post(msg) {
    const s = JSON.stringify(msg);
    if (window.AndroidAds?.postMessage) return window.AndroidAds.postMessage(s);
    if (window.ReactNativeWebView?.postMessage) return window.ReactNativeWebView.postMessage(s);
    console.warn("[AdMob] Native bridge not available.");
  }
};

/**
 * Frequency caps (persisted)
 */
const CAP_KEY = "wl_ad_caps_v1";
let caps = loadCaps();

function loadCaps() {
  try { return JSON.parse(localStorage.getItem(CAP_KEY) || "{}"); }
  catch { return {}; }
}
function saveCaps() {
  try { localStorage.setItem(CAP_KEY, JSON.stringify(caps)); } catch {}
}
function stamp(kind) { caps[kind] = Date.now(); saveCaps(); }
function canShow(kind, capMs) {
  const last = Number(caps[kind] || 0);
  return Date.now() - last > capMs;
}

/**
 * Reward handling
 */
let rewardResolve = null;     // active promise resolver
let rewardReject  = null;
let lastRewardKey = null;     // to dedupe identical rewards

function makeRewardKey(payload) {
  try {
    const { reward, adInstanceId, format } = payload || {};
    return JSON.stringify({ reward, adInstanceId, format });
  } catch { return ""; }
}

/**
 * Security: accept same-origin and (optionally) null (WebView/TWA)
 */
function allowedOrigin(origin) {
  return origin === window.location.origin || origin === "null";
}

/**
 * Global message listener — attach once
 */
if (!window.__whyleeAdmobListenerAttached) {
  window.__whyleeAdmobListenerAttached = true;
  window.addEventListener("message", (ev) => {
    // Validate sender
    if (!allowedOrigin(ev.origin)) {
      // In some Android WebViews the origin can be "null". We allow that above.
      console.warn("[AdMob] Ignored message from origin:", ev.origin);
      return;
    }
    // Parse payload
    let data = ev.data;
    if (typeof data === "string") {
      try { data = JSON.parse(data); } catch { return; }
    }
    if (!data || data.type !== "AD_EVENT") return;

    const { format, status } = data;

    // Handle rewarded outcomes
    if (format === "REWARDED") {
      const key = makeRewardKey(data);

      if (status === "REWARD_EARNED") {
        // Deduplicate identical events
        if (key && key === lastRewardKey) {
          console.info("[AdMob] duplicate reward ignored");
          return;
        }
        lastRewardKey = key;

        const reward = data.reward || { amount: 1, type: "coins" };
        if (rewardResolve) {
          try { rewardResolve({ ok: true, reward }); }
          finally { rewardResolve = rewardReject = null; }
        }
      }
      else if (status === "CLOSED" || status === "FAILED") {
        if (rewardReject) {
          try { rewardReject(new Error(status)); }
          finally { rewardResolve = rewardReject = null; }
        }
      }
    }
  });
}

/**
 * Public API
 */

export function showInterstitial({ placement = "menu_nav", capMs = 90_000 } = {}) {
  if (!Native.available()) return { ok: false, reason: "unavailable" };
  if (!canShow("interstitial", capMs)) return { ok: false, reason: "capped" };
  Native.post({ type: "AD_REQUEST", format: "INTERSTITIAL", placement });
  stamp("interstitial");
  return { ok: true };
}

/**
 * Show a rewarded ad.
 * Returns a promise that resolves with { ok:true, reward } when user earns the reward,
 * or rejects on FAIL/CLOSED/unavailable/capped.
 */
export function showRewarded({ placement = "bonus_xp", capMs = 180_000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!Native.available()) return reject(new Error("unavailable"));
    if (!canShow("rewarded", capMs)) return reject(new Error("capped"));

    // Clear any previous pending promise
    rewardResolve = resolve;
    rewardReject  = reject;
    lastRewardKey = null;

    Native.post({ type: "AD_REQUEST", format: "REWARDED", placement });
    stamp("rewarded");
  });
}

export function showBanner({ placement = "footer" } = {}) {
  if (!Native.available()) return { ok: false, reason: "unavailable" };
  Native.post({ type: "AD_REQUEST", format: "BANNER", placement });
  return { ok: true };
}

// Optional helper to clear caps (e.g., for QA menus)
export function resetAdCaps() {
  caps = {};
  saveCaps();
}

// /scripts/playBilling.js — v9012
// Bridge between the TWA/Android wrapper and the web app for Play Billing activation.

const FN_URL = "/.netlify/functions/linkPurchaseToken"; // Netlify Functions path
const PURCHASE_EVENT = "PLAY_PURCHASE";
const RESULT_EVENT   = "PLAY_PURCHASE_RESULT";

// Track in-flight tokens to prevent duplicate activation
const inflight = new Set();

/**
 * Start a Google Play purchase from the web app.
 * The Android container (TWA or RN WebView) should handle the message
 * and reply back via window.postMessage with { type: RESULT_EVENT, purchaseToken, uid, sku }.
 */
export function startPlayPurchase({ uid, sku = "pro" }) {
  const payload = JSON.stringify({ type: PURCHASE_EVENT, sku, uid });
  try {
    if (window.AndroidBilling?.postMessage) {
      // Android addJavascriptInterface shim
      window.AndroidBilling.postMessage(payload);
    } else if (window.ReactNativeWebView?.postMessage) {
      // React Native WebView bridge
      window.ReactNativeWebView.postMessage(payload);
    } else if (window.parent && window.parent !== window) {
      // Fallback: post to parent (TWA/custom container that proxies)
      window.parent.postMessage(payload, "*");
    } else {
      // Last resort UX
      alert("Play purchase is unavailable in this build/environment.");
    }
  } catch (e) {
    console.error("[playBilling] startPlayPurchase error:", e);
    alert("Could not initiate purchase.");
  }
}

/**
 * Initialise the listener that receives purchase results from the container.
 * Validates origin, debounces duplicate tokens, and calls the Netlify Function.
 */
export function initPlayBridge({ allowNullOrigin = true } = {}) {
  window.addEventListener("message", async (ev) => {
    // Safely parse data
    let data = ev.data;
    if (typeof data === "string") {
      try { data = JSON.parse(data); } catch { /* ignore non-JSON */ }
    }
    if (!data || data.type !== RESULT_EVENT) return;

    // Security: accept same-origin; optionally accept "null" in WebView/TWA
    const sameOrigin = ev.origin === window.location.origin;
    const nullOrigin = ev.origin === "null";
    if (!sameOrigin && !(allowNullOrigin && nullOrigin)) {
      console.warn("[playBilling] ignored message from unexpected origin:", ev.origin);
      return;
    }

    const { purchaseToken, uid, sku = "pro" } = data;
    if (!purchaseToken || !uid) {
      console.warn("[playBilling] missing purchaseToken/uid in result payload");
      return;
    }

    // Debounce duplicate submissions
    if (inflight.has(purchaseToken)) {
      console.info("[playBilling] token already processed/in-flight");
      return;
    }
    inflight.add(purchaseToken);

    try {
      // Small timeout wrapper to avoid hanging forever
      const res = await fetchWithTimeout(FN_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          // Add a simple idempotency key header for server-side protection
          "x-idempotency-key": purchaseToken
        },
        body: JSON.stringify({ purchaseToken, uid, sku })
      }, 12000);

      if (!res.ok) {
        const text = await safeText(res);
        console.error("[playBilling] activation failed:", res.status, text);
        alert("We couldn't activate Pro yet. Please try again.");
        return;
      }

      // Success UX
      toastOrAlert("Thanks! Your Pro will activate shortly.");

    } catch (e) {
      console.error("[playBilling] linkPurchaseToken error:", e);
      alert("Network issue while activating Pro. Please try again.");
    } finally {
      inflight.delete(purchaseToken);
    }
  });
}

// ---- helpers ----

async function fetchWithTimeout(url, opts, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function safeText(res) {
  try { return await res.text(); } catch { return ""; }
}

function toastOrAlert(msg) {
  // If you have a snackbar/toast, call it here; fallback to alert.
  const el = document.getElementById("toast");
  if (el) {
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2500);
  } else {
    alert(msg);
  }
}

// /scripts/play.js — v9012
// Unified purchase flow: Android Play Billing (via bridge) + Web Stripe fallback.
// Security: never grant Pro on the client. Server verifies and updates entitlements.

import { firebaseAuth } from "/scripts/firebase-bridge.mjs?v=9012";
import { startPlayPurchase as startPlayPurchaseBridge, initPlayBridge } from "/scripts/playBilling.js?v=9012";

// Optional Stripe fallback (if present in your bundle)
let stripeModule = null;
try {
  stripeModule = await import("/stripe.js?v=9012");
} catch {
  // no-op: running in Android/WebView or Stripe not bundled
}

const isAndroid = /Android/i.test(navigator.userAgent);

/**
 * Start a purchase. On Android/TWA uses Play Billing bridge; otherwise tries Stripe.
 * @param {string} sku - e.g. 'pro_monthly' or 'pro'
 * @returns {Promise<boolean>} resolved when flow kicked off (does not guarantee activation yet)
 */
export async function startPlayPurchase(sku = "pro") {
  const auth = await firebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    alert("Please sign in first.");
    return false;
  }

  if (isAndroid) {
    // Initialise bridge listener once
    initPlayBridge({ allowNullOrigin: true });
    try {
      // Post a message to the Android container; it will reply with purchaseToken
      startPlayPurchaseBridge({ uid: user.uid, sku });
      // Bridge is async; server will activate Pro after token verification.
      toast("Processing purchase…");
      return true;
    } catch (e) {
      console.error("[play] Android purchase bridge error:", e);
      alert("Could not start the Play purchase.");
      return false;
    }
  }

  // Web fallback: Stripe (if available)
  if (stripeModule?.startStripeCheckout) {
    try {
      await stripeModule.startStripeCheckout();
      // Stripe will redirect; on return, server/webhook updates entitlements.
      return true;
    } catch (e) {
      console.error("[play] Stripe checkout error:", e);
      alert("Could not start checkout.");
      return false;
    }
  }

  alert("Purchases are unavailable in this environment.");
  return false;
}

/**
 * Restore/verify Pro status (e.g., returning users or after reinstall).
 * Server checks existing purchases and updates entitlements if valid.
 */
export async function restorePlayPurchases() {
  try {
    const auth = await firebaseAuth();
    const user = auth.currentUser;
    if (!user) {
      alert("Please sign in first.");
      return false;
    }

    const res = await fetch("/.netlify/functions/playVerify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ uid: user.uid })
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn("[play] restore failed:", res.status, text);
      alert("Couldn’t restore purchases right now.");
      return false;
    }

    // Notify the app that entitlements may have changed
    window.dispatchEvent(new CustomEvent("whylee:pro-updated"));
    toast("Your Pro status has been refreshed.");
    return true;
  } catch (e) {
    console.error("[play] restore error:", e);
    alert("Network issue while restoring.");
    return false;
  }
}

// ---- tiny UX helper ----
function toast(msg) {
  const el = document.getElementById("toast");
  if (el) {
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2200);
  } else {
    console.info(msg);
  }
}

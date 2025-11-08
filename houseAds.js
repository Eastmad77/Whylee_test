// Whylee – House Ads visibility controller (v9.1)
// Hides elements with `.promo-if-free` when user is Pro.

import { auth } from "/scripts/firebase-bridge.js";
import { isPro } from "/scripts/entitlements.js";

async function applyHouseAdsVisibility() {
  try {
    // Wait for Firebase Auth to settle (important for CSP + SSR)
    const uid = await new Promise((resolve) => {
      if (auth.currentUser) return resolve(auth.currentUser.uid);
      const unsub = auth.onAuthStateChanged((user) => {
        unsub();
        resolve(user?.uid || null);
      });
    });

    const pro = uid ? await isPro(uid) : false;

    document.querySelectorAll(".promo-if-free").forEach((el) => {
      el.classList.toggle("promo-hide", !!pro);
    });
  } catch (e) {
    console.warn("[houseAds] visibility check failed:", e);
    // Fail-open: leave promos visible
  }
}

// Run once on load
applyHouseAdsVisibility();

// Optional: Re-run after Firebase auth changes (for SPA transitions)
auth.onAuthStateChanged(() => applyHouseAdsVisibility());

export { applyHouseAdsVisibility };

// /scripts/menu.js — v9012
// Displays PRO badge visibility in main menu after Auth init

import { isPro } from "/scripts/entitlements.js?v=9012";
import { firebaseAuth } from "/scripts/firebase-bridge.mjs?v=9012";

async function setupMenuProBadge() {
  // Wait for DOM to be ready
  if (document.readyState === "loading") {
    await new Promise((res) => document.addEventListener("DOMContentLoaded", res, { once: true }));
  }

  const proBadge = document.getElementById("menuProBadge");
  if (!proBadge) return;

  const auth = await firebaseAuth();

  // Helper to toggle badge
  const updateBadge = async (user) => {
    if (!user) {
      proBadge.hidden = true;
      return;
    }
    try {
      const pro = await isPro(user.uid);
      proBadge.hidden = !pro;
    } catch (e) {
      console.warn("[menu] isPro() check failed:", e);
      proBadge.hidden = true;
    }
  };

  // Initial state
  updateBadge(auth.currentUser);

  // Listen for sign-in/out events
  auth.onAuthStateChanged(updateBadge);
}

// Run automatically
setupMenuProBadge().catch((e) => console.error("[menu] setup error:", e));

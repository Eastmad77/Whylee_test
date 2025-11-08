// /scripts/entitlements.js — v9010
// Minimal client-side "isPro" check by reading /entitlements/{uid}

import {
  db, doc, getDoc
} from "/scripts/firebase-bridge.js?v=9010";

/** returns boolean */
export async function isPro(uid) {
  if (!uid) return false;
  try {
    const snap = await getDoc(doc(db, "entitlements", uid));
    return !!(snap.exists() && snap.data()?.pro === true);
  } catch (e) {
    console.warn("[entitlements] read failed:", e);
    return false;
  }
}

// Some pages previously imported { Entitlements } — provide a tiny shim for safety.
export const Entitlements = { isPro };

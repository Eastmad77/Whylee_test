// /scripts/firebase-bridge.mjs — Firebase initializer (v9012)
// Initializes Firebase using a runtime-provided config (no keys in repo).
// Exports common SDK handles safely (auth, db, storage, messaging if available).

import { resolveFirebaseConfig } from "/scripts/firebase-config.mjs?v=9012";

// Firebase SDK modular imports (gstatic host is allowed in your CSP)
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-storage.js";

// Messaging is optional — wrap to avoid errors if not configured
let getMessagingSafe = null;
try {
  const mod = await import("https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging.js");
  getMessagingSafe = mod.getMessaging;
} catch {
  // ignore if not available
}

let app, auth, db, storage, messaging;

async function ensureFirebase() {
  if (app) return app;

  const cfg = await resolveFirebaseConfig();
  if (!cfg) {
    console.warn("[Firebase] Skipping init: no config available.");
    return null;
  }

  app = getApps().length ? getApp() : initializeApp(cfg);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  messaging = getMessagingSafe ? getMessagingSafe(app) : null;

  // expose for debugging (non-secret)
  window.__firebase = { app, auth, db, storage, messaging };
  return app;
}

export async function firebaseApp() {
  return ensureFirebase();
}
export async function firebaseAuth() {
  await ensureFirebase(); return auth || null;
}
export async function firestoreDb() {
  await ensureFirebase(); return db || null;
}
export async function firebaseStorage() {
  await ensureFirebase(); return storage || null;
}
export async function firebaseMessaging() {
  await ensureFirebase(); return messaging || null;
}

// Eager init to reduce first-use latency (safe if config is present)
ensureFirebase();

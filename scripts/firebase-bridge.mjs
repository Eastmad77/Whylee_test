// /scripts/firebase-bridge.mjs — Firebase initializer (v9012)
// No secrets in source. Uses config from resolver above.

import { resolveFirebaseConfig } from "/scripts/firebase-config.mjs?v=9012";

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-storage.js";

// Optional messaging
let getMessagingSafe = null;
try {
  const mod = await import("https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging.js");
  getMessagingSafe = mod.getMessaging;
} catch {}

let app, auth, db, storage, messaging;

async function ensureFirebase() {
  if (app) return app;
  const cfg = await resolveFirebaseConfig();
  if (!cfg) { console.warn("[Firebase] Skipping init: no config."); return null; }
  app = getApps().length ? getApp() : initializeApp(cfg);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  messaging = getMessagingSafe ? getMessagingSafe(app) : null;
  window.__firebase = { app, auth, db, storage, messaging };
  return app;
}

export async function firebaseApp()       { return ensureFirebase(); }
export async function firebaseAuth()      { await ensureFirebase(); return auth || null; }
export async function firestoreDb()       { await ensureFirebase(); return db || null; }
export async function firebaseStorage()   { await ensureFirebase(); return storage || null; }
export async function firebaseMessaging() { await ensureFirebase(); return messaging || null; }

ensureFirebase();

// /scripts/firebase-config.mjs — runtime config resolver (v9012)
export async function resolveFirebaseConfig() {
  if (globalThis.window?.firebaseConfig && typeof window.firebaseConfig === "object") {
    return window.firebaseConfig;
  }
  const meta = globalThis.document?.querySelector('meta[name="firebase-config"]');
  if (meta && meta.content) {
    try {
      const cfg = JSON.parse(meta.content);
      window.firebaseConfig = cfg;
      return cfg;
    } catch (e) {
      console.error("[Firebase] invalid meta firebase-config JSON", e);
    }
  }
  // Optional remote fetch model (commented)
  // try {
  //   const r = await fetch("/config/firebase.json", { cache: "no-store" });
  //   if (r.ok) { const cfg = await r.json(); window.firebaseConfig = cfg; return cfg; }
  // } catch (e) { console.warn("[Firebase] fetch /config/firebase.json failed", e); }
  console.warn("[Firebase] No runtime firebaseConfig found.");
  return null;
}

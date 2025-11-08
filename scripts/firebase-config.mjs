// /scripts/firebase-config.mjs — runtime config loader (v9012)
// Zero secrets in source. Pulls config from (in order):
//  1) window.firebaseConfig (recommended: inject via Netlify Snippet or template)
//  2) <meta name="firebase-config" content='{"apiKey":"..."}'>
//  3) (optional) GET /config/firebase.json if you enable fetch below.

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

  // Optional: enable if you host a public config JSON
  // try {
  //   const r = await fetch("/config/firebase.json", { cache: "no-store" });
  //   if (r.ok) {
  //     const cfg = await r.json();
  //     window.firebaseConfig = cfg;
  //     return cfg;
  //   }
  // } catch (e) {
  //   console.warn("[Firebase] fetch /config/firebase.json failed", e);
  // }

  console.warn("[Firebase] No runtime firebaseConfig found.");
  return null;
}

// /firebase-config.js — sanitized (v9012)
// Purpose: avoid committing any "AIza..." keys so Netlify's secrets scanner passes.
// How it works:
//  - If window.firebaseConfig already exists (e.g., injected by <script> in Netlify),
//    we leave it alone.
//  - Else we look for <meta name="firebase-config" content='{"apiKey":"..."}'>.
//  - If still missing, we warn (your ESM bridge can optionally fetch /config/firebase.json).

(() => {
  if (window.firebaseConfig && typeof window.firebaseConfig === "object") {
    return; // already provided at runtime
  }

  const meta = document.querySelector('meta[name="firebase-config"]');
  if (meta && meta.content) {
    try {
      window.firebaseConfig = JSON.parse(meta.content);
      return;
    } catch (e) {
      console.error("[Firebase] Invalid JSON in <meta name='firebase-config'>", e);
    }
  }

  // Optional: you can uncomment this to lazy-load from a public JSON on your domain
  // fetch("/config/firebase.json", { cache: "no-store" })
  //   .then(r => (r.ok ? r.json() : null))
  //   .then(cfg => { if (cfg) window.firebaseConfig = cfg; });

  console.warn(
    "[Firebase] Missing window.firebaseConfig. " +
    "Provide it via inline <script> or <meta name='firebase-config'> before Firebase init."
  );
})();

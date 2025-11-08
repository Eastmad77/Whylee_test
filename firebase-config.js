// /firebase-config.js — sanitized (v9012)
// Purpose: keep repo free of API keys so Netlify secret scan passes.
// Reads runtime config from window.firebaseConfig or <meta name="firebase-config">.

(() => {
  if (window.firebaseConfig && typeof window.firebaseConfig === "object") return;

  const meta = document.querySelector('meta[name="firebase-config"]');
  if (meta && meta.content) {
    try {
      window.firebaseConfig = JSON.parse(meta.content);
      return;
    } catch (e) {
      console.error("[Firebase] Invalid JSON in <meta name='firebase-config'>", e);
    }
  }

  // Optional: enable if you host a public JSON at /config/firebase.json
  // fetch("/config/firebase.json", { cache: "no-store" })
  //   .then(r => (r.ok ? r.json() : null))
  //   .then(cfg => { if (cfg) window.firebaseConfig = cfg; });

  console.warn(
    "[Firebase] Missing window.firebaseConfig. Provide via inline <script> or meta tag before Firebase init."
  );
})();

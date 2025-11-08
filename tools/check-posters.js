// /tools/check-posters.js — v9012
// Quick dev checker: verifies all poster assets in manifest exist.
// Run in console or as <script type="module">.

(async () => {
  const log = console.log.bind(console);
  const warn = console.warn.bind(console);
  const version = window.WHYLEE_BUILD || 9012;
  const manifestURL = `/media/posters/manifest.json?v=${version}`;

  async function head(url) {
    try {
      const r = await fetch(url, { method: "HEAD", cache: "no-store" });
      return r.ok;
    } catch {
      return false;
    }
  }

  let manifest;
  try {
    const res = await fetch(manifestURL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    manifest = await res.json();
  } catch (e) {
    warn("❌ Failed to load manifest:", manifestURL, e);
    return;
  }

  const posters = manifest.items || manifest.posters || [];
  let missing = 0;

  for (const p of posters) {
    const fname = p.file || p.src || "";
    const key = p.key || fname;
    const url = `/media/posters/${fname}`;
    const ok = await head(url);
    log(ok ? "✅" : "❌", key, "→", fname);
    if (!ok) missing++;
  }

  if (missing === 0) {
    log("✔ All poster files present.");
  } else {
    warn(`⚠ Missing ${missing} poster(s). Check filenames and paths.`);
  }
})();

// csp-check.js — runs under strict CSP (no inline JS), v9012

const ul = document.querySelector('#status');
const out = document.querySelector('#console');

const log = (msg) => {
  if (!ul) return;
  const li = document.createElement('li');
  li.textContent = msg;
  ul.appendChild(li);
};

const clog = (...a) => {
  if (!out) return;
  out.textContent += a.join(' ') + '\n';
};

(async () => {
  try {
    // 1) firebaseConfig present?
    const hasCfg = !!window.firebaseConfig;
    log(`firebaseConfig present ... ${hasCfg ? '[OK]' : '[MISS]'}`);
    if (!hasCfg) {
      clog('firebaseConfig missing — ensure these are loaded in <head> BEFORE any Firebase usage:');
      clog('  <script type="module" src="/scripts/firebase-config.mjs?v=9012"></script>');
      clog('  <script type="module" src="/scripts/firebase-bridge.mjs?v=9012"></script>');
    }

    // 2) Load the bridge after config (ESM .mjs, v9012)
    try {
      await import('/scripts/firebase-bridge.mjs?v=9012');
      log('firebase-bridge loaded ... [OK]');
    } catch (e) {
      log('firebase-bridge loaded ... [FAIL]');
      clog('bridge import error:', e);
    }

    // 3) Network probes allowed by CSP (connect-src)
    try {
      await fetch('https://www.gstatic.com/generate_204', { mode: 'no-cors' });
      log('connect to www.gstatic.com ... [OK]');
    } catch {
      log('connect to www.gstatic.com ... [FAIL]');
    }

    try {
      await fetch('https://www.googleapis.com/generate_204', { mode: 'no-cors' });
      log('connect to www.googleapis.com ... [OK]');
    } catch {
      log('connect to www.googleapis.com ... [FAIL]');
    }

    // 4) Posters manifest & one image (repo-canonical path first, then fallback)
    let manifestOk = false;
    let manifest;
    for (const url of [
      '/media/posters/manifest.json?v=9012',
      '/posters.json?v=9012'
    ]) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) {
          manifest = await res.json();
          log(`load ${url} ... [OK]`);
          manifestOk = true;
          break;
        } else {
          log(`load ${url} ... [FAIL HTTP ${res.status}]`);
        }
      } catch (e) {
        log(`load ${url} ... [FAIL]`);
        clog(e);
      }
    }

    if (manifestOk) {
      const first = manifest.items?.[0];
      if (first?.src) {
        try {
          await fetch(first.src, { mode: 'no-cors' });
          log('load poster image ... [OK]');
        } catch {
          log('load poster image ... [FAIL]');
        }
      } else {
        log('load poster image ... [FAIL: no items]');
      }
    }
  } catch (e) {
    clog('fatal:', e);
  }
})();

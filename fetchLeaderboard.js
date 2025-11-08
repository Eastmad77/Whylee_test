// csp-check.js — runs under strict CSP (no inline JS), v9012

function ensureElt(id, tag, parent = document.body) {
  let el = document.querySelector(id);
  if (!el) {
    el = document.createElement(tag);
    // Create a simple container if needed
    if (id === '#status') { el.id = 'status'; el.style.listStyle = 'disc'; el.style.paddingLeft = '1.25rem'; }
    if (id === '#console') { el.id = 'console'; el.style.whiteSpace = 'pre-wrap'; el.style.fontFamily = 'monospace'; }
    parent.appendChild(el);
  }
  return el;
}

const ul  = ensureElt('#status', 'ul');
const out = ensureElt('#console', 'pre');

const log = (msg) => {
  const li = document.createElement('li');
  li.textContent = msg;
  ul.appendChild(li);
};

const clog = (...a) => {
  out.textContent += a.join(' ') + '\n';
};

function documentReady() {
  if (document.readyState === 'complete' || document.readyState === 'interactive') return Promise.resolve();
  return new Promise((res) => document.addEventListener('DOMContentLoaded', res, { once: true }));
}

(async () => {
  try {
    await documentReady(); // Avoid race if script is loaded early

    // 1) firebaseConfig present?
    const hasCfg = !!window.firebaseConfig;
    log(`firebaseConfig present ... ${hasCfg ? '[OK]' : '[MISS]'}`);
    if (!hasCfg) {
      clog('firebaseConfig missing — ensure these are loaded in <head> BEFORE any Firebase usage:');
      clog('  <script type="module" src="/scripts/firebase-config.mjs?v=9012"></script>');
      clog('  <script type="module" src="/scripts/firebase-bridge.mjs?v=9012"></script>');
    }

    // 2) Load the bridge after config (ESM .mjs)
    try {
      await import('/scripts/firebase-bridge.mjs?v=9012');
      log('firebase-bridge loaded ... [OK]');
    } catch (e) {
      log('firebase-bridge loaded ... [FAIL]');
      clog('bridge import error:', e && (e.stack || e.message || e));
    }

    // 3) Network probes allowed by CSP (connect-src)
    try {
      await fetch('https://www.gstatic.com/generate_204', { mode: 'no-cors' });
      log('connect to www.gstatic.com ... [OK]');
    } catch (e) {
      log('connect to www.gstatic.com ... [FAIL]');
      clog('gstatic probe failed:', e && (e.stack || e.message || e));
    }

    try {
      await fetch('https://www.googleapis.com/generate_204', { mode: 'no-cors' });
      log('connect to www.googleapis.com ... [OK]');
    } catch (e) {
      log('connect to www.googleapis.com ... [FAIL]');
      clog('googleapis probe failed:', e && (e.stack || e.message || e));
    }

    // 4) Posters manifest & one image (canonical path first, then fallback)
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
        clog('manifest fetch error:', e && (e.stack || e.message || e));
      }
    }

    if (manifestOk) {
      const first = manifest.items?.[0];
      if (first?.src) {
        try {
          const imgRes = await fetch(first.src, { mode: 'no-cors' });
          // In no-cors we can’t inspect status; assume success if no exception
          log('load poster image ... [OK]');
        } catch (e) {
          log('load poster image ... [FAIL]');
          clog('poster fetch error:', e && (e.stack || e.message || e));
        }
      } else {
        log('load poster image ... [FAIL: no items]');
      }
    }
  } catch (e) {
    clog('fatal:', e && (e.stack || e.message || e));
  }
})();

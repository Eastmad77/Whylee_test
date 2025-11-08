// test/csp-check.js â€” runs with strict CSP (no inline JS needed)
const ul = document.querySelector('#status');
const out = document.querySelector('#console');
const log = (msg) => {
  const li = document.createElement('li');
  li.textContent = msg;
  ul.appendChild(li);
};
const clog = (...a) => { out.textContent += a.join(' ') + '\n'; };

(async () => {
  try {
    // 1) firebaseConfig present?
    const hasCfg = !!window.firebaseConfig;
    log(`firebaseConfig present â€¦ ${hasCfg ? 'âœ…' : 'âŒ'}`);
    if (!hasCfg) clog('firebaseConfig missing â€” check /scripts/firebase-config.js order.');

    // 2) Load the bridge after config
    try {
      await import('/scripts/firebase-bridge.js?v=9010');
      log('firebase-bridge loaded â€¦ âœ…');
    } catch (e) {
      log('firebase-bridge loaded â€¦ âŒ');
      clog('bridge import error:', e);
    }

    // 3) Network probes allowed by CSP
    try { await fetch('https://www.gstatic.com/generate_204', { mode: 'no-cors' }); log('connect to www.gstatic.com â€¦ âœ…'); }
    catch { log('connect to www.gstatic.com â€¦ âŒ'); }

    try { await fetch('https://www.googleapis.com/generate_204', { mode: 'no-cors' }); log('connect to www.googleapis.com â€¦ âœ…'); }
    catch { log('connect to www.googleapis.com â€¦ âŒ'); }

    // 4) Posters manifest & one image
    try {
      const res = await fetch('/posters.json?v=9008', { cache: 'no-store' });
      log('load /posters.json â€¦ ' + (res.ok ? 'âœ…' : `âŒ (HTTP ${res.status})`));
      if (res.ok) {
        const data = await res.json();
        const first = data.items?.[0];
        if (first?.src) {
          try { await fetch(first.src, { mode: 'no-cors' }); log('load poster image â€¦ âœ…'); }
          catch { log('load poster image â€¦ âŒ'); }
        } else {
          log('load poster image â€¦ âŒ (no items)');
        }
      }
    } catch (e) {
      log('load /posters.json â€¦ âŒ'); clog(e);
    }
  } catch (e) {
    clog('fatal:', e);
  }
})();

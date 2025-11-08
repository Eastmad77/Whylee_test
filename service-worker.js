/* service-worker.js — v9010 */
const CACHE = "whylee-v9010";
const CORE = [
  "/", "/index.html",
  "/styles/brand.css?v=9010",
  "/styles/style.css?v=9010",
  "/styles/animations.css?v=9010",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
      // Tell the page there is a new version ready (for app.js to show the prompt)
      try {
        if ("BroadcastChannel" in self) {
          const ch = new BroadcastChannel("whylee-sw");
          ch.postMessage("NEW_VERSION");
          ch.close?.();
        } else {
          // Fallback: ping all clients
          const clientsList = await self.clients.matchAll({ includeUncontrolled: true });
          clientsList.forEach(c => c.postMessage?.({ type: "NEW_VERSION" }));
        }
      } catch (e) {
        // non-fatal
      }
    })()
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // ignore sourcemaps
  if (url.pathname.endsWith(".map")) return;

  // only same-origin
  if (url.origin !== location.origin) return;

  // navigation: network-first, fallback to index.html
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => caches.match("/index.html")));
    return;
  }

  // assets: cache-first
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

// /service-worker.js — update (v9012)
// Ensures new deploys activate immediately, avoids precaching heavy media, adds safe runtime caching.

const VERSION = "v9012";
const APP_SHELL = [
  "/", "/index.html",
  "/styles/whylee-bundle.css?v=9012",
  "/styles/whylee-ads-bundle.css?v=9012"
  // Do NOT list large media or many JS files here — they'll be fetched on demand.
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open("app-shell-" + VERSION);
    await cache.addAll(APP_SHELL);
  })());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(k => !k.endsWith(VERSION))
      .map(k => caches.delete(k)));
  })());
  self.clients.claim();
});

// Network-first for HTML; cache-first for static; runtime cache for /media/motion/
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Avoid caching Netlify previews or non-GET
  if (request.method !== "GET") return;

  // Heavy motion media: runtime cache
  if (url.pathname.startsWith("/media/motion/")) {
    event.respondWith((async () => {
      const cache = await caches.open("motion-" + VERSION);
      const cached = await cache.match(request);
      if (cached) return cached;
      const resp = await fetch(request);
      if (resp.ok) cache.put(request, resp.clone());
      return resp;
    })());
    return;
  }

  // HTML -> network-first
  if (request.destination === "document" || url.pathname.endsWith(".html")) {
    event.respondWith((async () => {
      try {
        const net = await fetch(request);
        const cache = await caches.open("html-" + VERSION);
        cache.put(request, net.clone());
        return net;
      } catch {
        const cache = await caches.open("html-" + VERSION);
        const cached = await cache.match(request) || await caches.match("/index.html");
        return cached || new Response("Offline", { status: 503 });
      }
    })());
    return;
  }

  // Others -> cache-first
  event.respondWith((async () => {
    const cache = await caches.open("assets-" + VERSION);
    const cached = await cache.match(request);
    if (cached) return cached;
    const net = await fetch(request);
    if (net.ok) cache.put(request, net.clone());
    return net;
  })());
});

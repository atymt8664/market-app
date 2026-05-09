/**
 * Souq Arab EU — minimal offline shell for PWA installability.
 * Drop into site root as /sw.js and register from the app shell (see INTEGRATION.md).
 * Does NOT replace API/network data — caches shell assets only when listed.
 */
const CACHE_VERSION = "souq-arab-eu-v1";
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  /* If you host the file as `manifest.json`, update this list and the link tag in `INTEGRATION.md`. */
  "/icons/pwa-icon-192.png",
  "/icons/pwa-icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

/** Network-first for navigation + APIs; cache fallback for same-origin GET documents only */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // API / dynamic: always network
  if (url.pathname.startsWith("/api")) {
    event.respondWith(fetch(req));
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && req.mode === "navigate") {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => hit || caches.match("/index.html")),
      ),
  );
});

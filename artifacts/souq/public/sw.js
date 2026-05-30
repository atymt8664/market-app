/**
 * Souq Arab EU — PWA shell + Web Push (P11).
 * P9 deploy stability: never precache or serve stale HTML/JS/CSS (prevents mixed bundles).
 */
const CACHE_VERSION = "souq-arab-eu-v3-deploy-shell";

/** Static install assets only — no index.html or hashed /assets/* bundles. */
const PRECACHE_URLS = [
  "/manifest.webmanifest",
  "/icons/pwa-icon-192.png",
  "/icons/pwa-icon-512.png",
];

function isHtmlNavigation(request) {
  if (request.mode === "navigate") return true;
  const accept = request.headers.get("accept");
  return Boolean(accept && accept.includes("text/html"));
}

function shouldBypassServiceWorker(pathname) {
  return (
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/fonts/") ||
    pathname === "/sw.js"
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

/** Purges v1/v2-push buckets that stored stale index.html — keeps only the current shell cache. */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api")) {
    event.respondWith(fetch(req));
    return;
  }

  /** Hashed bundles + SW script: browser/CDN immutable cache — do not intercept. */
  if (shouldBypassServiceWorker(url.pathname)) {
    return;
  }

  /** App shell HTML: network-only — never cache (avoids old index.html + new CSS/JS mix). */
  if (isHtmlNavigation(req)) {
    event.respondWith(fetch(req));
    return;
  }

  /** Precached PWA install assets (manifest/icons) — cache-first fallback. */
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req);
    }),
  );
});

function resolveNotificationUrl(data) {
  if (data && typeof data.url === "string" && data.url.startsWith("/")) {
    return data.url;
  }
  return "/notifications";
}

self.addEventListener("push", (event) => {
  let payload = { title: "Souq Arab EU", body: "", data: {} };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    /* ignore malformed payload */
  }

  const title = String(payload.title || "Souq Arab EU").slice(0, 120);
  const body = String(payload.body || "").slice(0, 240);
  const data = payload.data && typeof payload.data === "object" ? payload.data : {};

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, {
        body,
        data,
        icon: "/icons/pwa-icon-192.png",
        badge: "/icons/pwa-icon-192.png",
        tag: data.notificationId ? `n-${data.notificationId}` : undefined,
      });
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clients) {
        client.postMessage({ type: "souq:push-received", data });
      }
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetPath = resolveNotificationUrl(event.notification.data);
  const targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.postMessage({ type: "souq:push-navigate", url: targetPath });
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    }),
  );
});

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        client.postMessage({ type: "souq:push-resubscribe" });
      }
    }),
  );
});

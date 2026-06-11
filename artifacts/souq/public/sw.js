/**
 * Souq Arab EU — PWA shell + Web Push (P11 / P17-9-13).
 * P9 deploy stability: never precache or serve stale HTML/JS/CSS (prevents mixed bundles).
 */
const CACHE_VERSION = "souq-arab-eu-v7-p17-9-13-branding";

/** Android status bar: monochrome white silhouette. Drawer: brand large icon. */
const NOTIFICATION_BADGE = "/icons/notification-badge-96.png";
const NOTIFICATION_LARGE_ICON = "/icons/notification-large-192.png";
const NOTIFICATION_FALLBACK_ICON = "/icons/pwa-icon-192.png";
/** Heads-up friendly pattern (Android Web Push). */
const NOTIFICATION_VIBRATE = [120, 60, 120];

/** Static install assets only — no index.html or hashed /assets/* bundles. */
const PRECACHE_URLS = [
  "/manifest.webmanifest",
  "/icons/pwa-icon-192.png",
  "/icons/pwa-icon-512.png",
  NOTIFICATION_BADGE,
  NOTIFICATION_LARGE_ICON,
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

function assetUrl(path) {
  return new URL(path, self.location.origin).href;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

/** Purges stale buckets — keeps only the current shell cache. */
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

  if (shouldBypassServiceWorker(url.pathname)) {
    return;
  }

  if (isHtmlNavigation(req)) {
    event.respondWith(fetch(req));
    return;
  }

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

async function showOsNotification(title, body, data, tag) {
  const options = {
    body,
    data,
    icon: assetUrl(NOTIFICATION_LARGE_ICON),
    badge: assetUrl(NOTIFICATION_BADGE),
    tag,
    vibrate: NOTIFICATION_VIBRATE,
    renotify: true,
    silent: false,
    timestamp: Date.now(),
  };

  try {
    await self.registration.showNotification(title, options);
  } catch {
    await self.registration.showNotification(title, {
      ...options,
      icon: assetUrl(NOTIFICATION_FALLBACK_ICON),
      vibrate: NOTIFICATION_VIBRATE,
    });
  }
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

  const tag =
    typeof data.dedupKey === "string" && data.dedupKey.trim()
      ? `d:${String(data.dedupKey).trim()}`.slice(0, 128)
      : data.notificationId
        ? `n-${data.notificationId}`
        : undefined;

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const appVisible = clients.some((client) => client.visibilityState === "visible");

      for (const client of clients) {
        client.postMessage({ type: "souq:push-received", data });
      }

      /** OS tray when background / lock / killed — not when app is focused. */
      if (!appVisible) {
        await showOsNotification(title, body, data, tag);
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

import { scheduleAfterFirstPaint } from "@/lib/after-first-paint";

/**
 * P9/P11 — production service worker registration with deploy-safe activation.
 * Reloads once when a new SW takes control so clients never run mixed old/new bundles.
 */
export function registerProductionServiceWorker(baseUrl: string): void {
  if (!("serviceWorker" in navigator)) return;

  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  const swUrl = "/sw.js";
  const scope = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

  const register = () => {
    navigator.serviceWorker
      .register(swUrl, { scope, updateViaCache: "none" })
      .then((registration) => {
        /** P7-PR-9: defer update() — immediate update() caused PSI "Failed to update SW" noise. */
        scheduleAfterFirstPaint(() => {
          void registration.update().catch(() => {
            void registration.unregister().catch(() => undefined);
          });
        }, 12_000);
      })
      .catch(() => {
        void navigator.serviceWorker.getRegistrations().then((regs) => {
          for (const reg of regs) {
            void reg.unregister();
          }
        });
      });
  };

  if (document.readyState === "complete") {
    register();
  } else {
    window.addEventListener("load", register, { once: true });
  }
}

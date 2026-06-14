import { scheduleAfterFirstPaint } from "@/lib/after-first-paint";
import { waitForHomeColdStartReady } from "@/lib/home-cold-start";
import { isHomePathname } from "@/lib/p7-home-path";

/**
 * P9/P11 — production service worker registration with deploy-safe activation.
 * P9-3A — never hard-reload Home on controllerchange (iOS Safari/A2HS skeleton loop).
 */
export function registerProductionServiceWorker(baseUrl: string): void {
  if (!("serviceWorker" in navigator)) return;

  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    /** P9-3A: SW activate on Home must not reload — resets Edge shell → infinite loop on iOS. */
    if (isHomePathname()) return;
    refreshing = true;
    window.location.reload();
  });

  const swUrl = "/sw.js";
  const scope = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

  const register = () => {
    navigator.serviceWorker
      .register(swUrl, { scope, updateViaCache: "none" })
      .then((registration) => {
        const runUpdate = () => {
          void registration.update().catch(() => {
            void registration.unregister().catch(() => undefined);
          });
        };

        if (isHomePathname()) {
          void waitForHomeColdStartReady().then(() => {
            scheduleAfterFirstPaint(runUpdate, 5_000);
          });
          return;
        }

        scheduleAfterFirstPaint(runUpdate, 12_000);
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

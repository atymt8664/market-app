import { scheduleAfterFirstPaint } from "@/lib/after-first-paint";
import {
  isHomeColdStartBootLocked,
  onServiceWorkerControllerChange,
  waitForHomeColdStartReady,
} from "@/lib/home-cold-start";
import { isHomePathname } from "@/lib/p7-home-path";

/**
 * P9/P11 — production service worker registration with deploy-safe activation.
 * P9-3/P9-6 — no reload during Home boot/hydration; defer update until feed ready.
 */
export function registerProductionServiceWorker(baseUrl: string): void {
  if (!("serviceWorker" in navigator)) return;

  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    if (isHomeColdStartBootLocked()) {
      onServiceWorkerControllerChange();
      return;
    }
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

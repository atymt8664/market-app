/**
 * P7-PR-12: defer App chunk until Home LCP image paints (or timeout) — shell stays visible.
 */
import { isHomePathname } from "@/lib/p7-home-path";

const HOME_LCP_MAX_WAIT_MS = 2000;

function shouldDeferForHomeLcp(): boolean {
  return (
    typeof document !== "undefined" &&
    isHomePathname() &&
    Boolean(document.getElementById("p7-lcp-layer"))
  );
}

function waitForHomeLcpCandidate(): Promise<void> {
  return new Promise((resolve) => {
    const img = document.getElementById("p7-lcp-candidate") as HTMLImageElement | null;
    if (!img) {
      resolve();
      return;
    }

    const done = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    };

    if (img.complete && img.naturalWidth > 0) {
      done();
      return;
    }

    const timeoutId = window.setTimeout(done, HOME_LCP_MAX_WAIT_MS);
    const finish = () => {
      window.clearTimeout(timeoutId);
      done();
    };
    img.addEventListener("load", finish, { once: true });
    img.addEventListener("error", finish, { once: true });
  });
}

/** Mount React App after LCP layer paint window on Home; immediate on other entry paths. */
export function scheduleDeferredAppMount(mount: () => void): void {
  if (typeof window === "undefined") {
    mount();
    return;
  }

  if (!shouldDeferForHomeLcp()) {
    mount();
    return;
  }

  void waitForHomeLcpCandidate().then(mount);
}

/**
 * P7-PR-14: zero-React LCP phase — defer entire app graph until Edge shell LCP paints.
 */
import { isHomePathname } from "@/lib/p7-home-path";
import { stripHomeLcpShellIfNotHome } from "@/lib/home-lcp-handoff";

const HOME_LCP_MAX_WAIT_MS = 2000;

stripHomeLcpShellIfNotHome();

function waitForHomeShellLcp(): Promise<void> {
  return new Promise((resolve) => {
    const layer = document.getElementById("p7-lcp-layer");
    if (!layer) {
      resolve();
      return;
    }

    const img = document.getElementById("p7-lcp-candidate") as HTMLImageElement | null;
    if (!img) {
      resolve();
      return;
    }

    const done = () => {
      document.documentElement.classList.add("p7-lcp-stable");
      document.documentElement.setAttribute("data-p7-lcp-stable", "1");
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

async function bootApp(): Promise<void> {
  if (isHomePathname() && document.getElementById("p7-lcp-layer")) {
    await waitForHomeShellLcp();
  }
  await import("./main");
}

void bootApp();

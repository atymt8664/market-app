/**
 * P7-PR-14 / P9-C: zero-React LCP phase — defer app graph until Edge shell LCP paints.
 */
import { isHomePathname } from "@/lib/p7-home-path";
import { stripHomeLcpShellIfNotHome, waitForHomeShellLcp } from "@/lib/home-lcp-handoff";

stripHomeLcpShellIfNotHome();

async function bootApp(): Promise<void> {
  /** P9-E-3 Fix A/C: wait for shell paint — do not dismiss before React handoff (home.tsx). */
  if (isHomePathname() && document.getElementById("p7-lcp-layer")) {
    await waitForHomeShellLcp();
  }
  await import("./main");
}

void bootApp();

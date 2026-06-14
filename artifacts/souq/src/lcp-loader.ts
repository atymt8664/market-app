/**
 * P7-PR-14 / P9-C: zero-React LCP phase — defer app graph until Edge shell LCP paints.
 * P9-2: first-launch language gate — strip Home shell; never wait for LCP behind gate.
 */
import { hasSavedLocale } from "@/i18n";
import { isHomePathname } from "@/lib/p7-home-path";
import { stripHomeLcpShell, stripHomeLcpShellIfNotHome, waitForHomeShellLcp } from "@/lib/home-lcp-handoff";

stripHomeLcpShellIfNotHome();

async function bootApp(): Promise<void> {
  const firstLaunchGate = isHomePathname() && !hasSavedLocale();
  if (firstLaunchGate) {
    stripHomeLcpShell();
  } else if (isHomePathname() && document.getElementById("p7-lcp-layer")) {
    /** P9-E-3 Fix A/C: wait for shell paint — do not dismiss before React handoff (home.tsx). */
    await waitForHomeShellLcp();
  }
  await import("./main");
}

void bootApp();

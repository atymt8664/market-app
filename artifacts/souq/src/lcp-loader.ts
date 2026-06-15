/**
 * P7-PR-14 / P9-C: zero-React LCP phase — defer app graph until Edge shell LCP paints.
 * P9-2: first-launch language gate — strip Home shell; never wait for LCP behind gate.
 */
import { hasSavedLocale } from "@/i18n";
import { beginHomeColdStartBoot, markHomeColdStartReady } from "@/lib/home-cold-start";
import { startHomeLcpPrefetch, startHomeRecommendedPrefetch } from "@/lib/home-lcp-prefetch";
import { isHomePathname } from "@/lib/p7-home-path";
import { stripHomeLcpShell, stripHomeLcpShellIfNotHome, syncHomeFeedShellOffsetFromStaticHeader, waitForHomeShellLcp } from "@/lib/home-lcp-handoff";

stripHomeLcpShellIfNotHome();

/** P9-3D: start feed API prefetch before shell LCP wait — parallel cold-path fetch. */
if (isHomePathname() && hasSavedLocale()) {
  startHomeLcpPrefetch();
  startHomeRecommendedPrefetch();
}

async function bootApp(): Promise<void> {
  const firstLaunchGate = isHomePathname() && !hasSavedLocale();
  if (firstLaunchGate) {
    stripHomeLcpShell();
    beginHomeColdStartBoot();
  } else if (isHomePathname() && document.getElementById("p7-lcp-layer")) {
    beginHomeColdStartBoot();
    syncHomeFeedShellOffsetFromStaticHeader();
    /** P9-E-3 Fix A/C: wait for shell paint — do not dismiss before React handoff (home.tsx). */
    await waitForHomeShellLcp();
  } else if (!isHomePathname()) {
    markHomeColdStartReady();
  }
  await import("./main");
}

void bootApp();

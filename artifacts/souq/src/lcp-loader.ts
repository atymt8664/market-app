/**
 * P7-PR-14 / P9-C: zero-React LCP phase — defer app graph until Edge shell LCP paints.
 */
import { isHomePathname } from "@/lib/p7-home-path";
import {
  dismissHomeLcpLayer,
  HOME_LCP_MAX_WAIT_MS,
  stripHomeLcpShellIfNotHome,
  waitForHomeShellLcp,
} from "@/lib/home-lcp-handoff";

stripHomeLcpShellIfNotHome();

async function bootApp(): Promise<void> {
  if (isHomePathname() && document.getElementById("p7-lcp-layer")) {
    await Promise.race([
      waitForHomeShellLcp(),
      new Promise<void>((resolve) => window.setTimeout(resolve, HOME_LCP_MAX_WAIT_MS)),
    ]);
    dismissHomeLcpLayer();
  }
  await import("./main");
}

void bootApp();

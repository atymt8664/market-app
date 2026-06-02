/**
 * P7-PR-14 / P9-C: zero-React LCP phase — defer app graph until Edge shell LCP paints.
 */
import { isHomePathname } from "@/lib/p7-home-path";
import {
  dismissHomeLcpLayer,
  stripHomeLcpShellIfNotHome,
  waitForHomeShellLcp,
} from "@/lib/home-lcp-handoff";

stripHomeLcpShellIfNotHome();

async function bootApp(): Promise<void> {
  if (isHomePathname() && document.getElementById("p7-lcp-layer")) {
    await waitForHomeShellLcp();
    /** Dismiss shell before React paint — avoids refresh flash of a lone featured card. */
    dismissHomeLcpLayer();
  }
  await import("./main");
}

void bootApp();

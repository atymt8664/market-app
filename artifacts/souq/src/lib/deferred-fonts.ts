import { scheduleAfterFirstPaint } from "@/lib/after-first-paint";

let deferredFontsStarted = false;

/** Load non-critical @font-face rules after Gate/Home first paint (7A.6). */
export function scheduleDeferredFonts(): void {
  if (deferredFontsStarted || typeof window === "undefined") return;
  deferredFontsStarted = true;

  scheduleAfterFirstPaint(() => {
    void import("../fonts-deferred.css");
  });
}

import { scheduleAfterFirstPaint } from "@/lib/after-first-paint";

let deferredStylesStarted = false;

/** P7-PR-7: load full Tailwind bundle after Gate/Home first paint — not render-blocking. */
export function scheduleDeferredStyles(): void {
  if (deferredStylesStarted || typeof window === "undefined") return;
  deferredStylesStarted = true;

  scheduleAfterFirstPaint(() => {
    void import("../index.css");
  });
}

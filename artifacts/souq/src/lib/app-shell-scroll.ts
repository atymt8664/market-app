import {
  APP_SHELL_CONTENT_SCROLL_MARKER,
  APP_SHELL_CONTENT_SCROLL_VALUE,
} from "@/lib/app-shell-layout";

/** P9-3 L2 scroll owner — sole vertical scroll surface under App Shell chrome. */
export function getAppShellScrollElement(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector(
    `[${APP_SHELL_CONTENT_SCROLL_MARKER}="${APP_SHELL_CONTENT_SCROLL_VALUE}"]`,
  );
}

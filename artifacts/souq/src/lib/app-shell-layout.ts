/**
 * P9-3-IMPL Phase 1 — App Shell frame SSOT.
 * Authority: docs/architecture/P09-3-App-Shell-Contract.md
 *
 * Layers:
 *   L0 Safe Area Top  — CSS vars (--souq-safe-top), consumed by L1
 *   L1 Header Slot    — route chrome (home-search | tab-title); Phase 4+ centralizes mount
 *   L2 Content Slot   — sole progressive-load layer (skeleton · data · images)
 *   L3 Bottom Nav     — fixed portal nav (layout.tsx owner)
 *   L4 Safe Area Bottom — nav shell padding-bottom only
 */

/** DOM marker: App Shell root container. */
export const APP_SHELL_ROOT_MARKER = "data-app-shell";
export const APP_SHELL_ROOT_VALUE = "root";

/** DOM marker: shell layer id (L0–L4). */
export const APP_SHELL_LAYER_MARKER = "data-app-shell-layer";

export const APP_SHELL_LAYER = {
  L0_SAFE_TOP: "L0",
  L1_HEADER: "L1",
  L2_CONTENT: "L2",
  L3_BOTTOM_NAV: "L3",
  L4_SAFE_BOTTOM: "L4",
} as const;

export type AppShellLayerId = (typeof APP_SHELL_LAYER)[keyof typeof APP_SHELL_LAYER];

/** L0–L4 root — flex column filling #root main area. */
export const APP_SHELL_ROOT_CLASS =
  "relative flex w-full flex-1 flex-col min-h-0 bg-[#0A0A0A]";

/**
 * L2 Content Slot — Router outlet frame.
 * Pages render inside; headers may live in-page until AppChromeHeader (Phase 4+).
 */
export const APP_SHELL_CONTENT_SLOT_CLASS =
  "relative mx-auto flex w-full max-w-screen-2xl flex-1 flex-col min-h-0 overflow-x-hidden bg-[#0A0A0A]";

/**
 * L1 Header Slot plane — sticky/fixed headers mount with safe-top from tab-ios / home layouts.
 * Exported for contract tests; no wrapper until Phase 4 header centralization.
 */
export const APP_SHELL_HEADER_SLOT_ROLE = APP_SHELL_LAYER.L1_HEADER;

/** Tab routes that require L3 Bottom Nav under App Shell contract. */
export const APP_SHELL_TAB_ROUTES = [
  "/",
  "/favorites",
  "/new",
  "/create-ad",
  "/messages",
  "/profile",
] as const;

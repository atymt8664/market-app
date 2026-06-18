/**
 * P9-IOS-A2HS-REAL-DEVICE — Platform header safe-top SSOT.
 * Authority: P09-3-App-Shell-Contract.md §10–§11.
 *
 * Every enterable/back-nav header MUST use PLATFORM_HEADER_SAFE_TOP_CLASS and/or
 * platformHeaderDomProps() so index.html ios-a2hs critical CSS can apply frame-0
 * padding without waiting for deferred Tailwind.
 */

/** Safe-top padding — L0 var with env() fallback. */
export const PLATFORM_HEADER_SAFE_TOP_CLASS =
  "pt-[var(--souq-safe-top,env(safe-area-inset-top,0px))]";

/** DOM marker for critical CSS + inventory guards. */
export const PLATFORM_HEADER_MARKER = "data-platform-header";
export const PLATFORM_HEADER_MARKER_VALUE = "1";

/** Top action row marker (non-header surfaces: ad-detail hero, user profile). */
export const PLATFORM_TOP_ACTIONS_MARKER = "data-platform-top-actions";
export const PLATFORM_TOP_ACTIONS_VALUE = "1";

/** Spread on <header> elements — pairs with PLATFORM_*_HEADER_BAR classes. */
export function platformHeaderDomProps(): Record<string, string> {
  return { [PLATFORM_HEADER_MARKER]: PLATFORM_HEADER_MARKER_VALUE };
}

/** Spread on div rows that act as page top chrome (back/actions). */
export function platformTopActionsDomProps(): Record<string, string> {
  return { [PLATFORM_TOP_ACTIONS_MARKER]: PLATFORM_TOP_ACTIONS_VALUE };
}

/** @deprecated alias — use PLATFORM_HEADER_SAFE_TOP_CLASS */
export const TAB_IOS_STICKY_HEADER_SAFE_TOP_CLASS = PLATFORM_HEADER_SAFE_TOP_CLASS;

/** iOS A2HS-only document class — set by standalone-safe-area bootstrap. */
export const IOS_A2HS_DOCUMENT_CLASS = "ios-a2hs";

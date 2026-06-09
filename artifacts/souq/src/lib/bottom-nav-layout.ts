/** BottomNav chrome height — keep in sync with `layout.tsx` BottomNav slot sizing. */
export const BOTTOM_NAV_HEIGHT_MOBILE_PX = 50;
export const BOTTOM_NAV_HEIGHT_MD_PX = 56;

/** Fixed nav outer shell — solid baseline through home-indicator safe area. */
export const BOTTOM_NAV_FIXED_SHELL_CLASS =
  "pointer-events-none fixed inset-x-0 bottom-0 z-40 bg-[#0A0A0A] pb-[env(safe-area-inset-bottom,0px)]";

/** Layout frame — box-border keeps bottom padding inside 100svh (no scroll gap under nav). */
export const BOTTOM_NAV_LAYOUT_FRAME_CLASS =
  "relative mx-auto w-full max-w-screen-2xl min-h-[100svh] box-border overflow-x-hidden bg-[#0A0A0A]";

/** Layout content padding above fixed BottomNav */
export const BOTTOM_NAV_CONTENT_PADDING_CLASS =
  "pb-[calc(50px+env(safe-area-inset-bottom,0px))] md:pb-[calc(56px+env(safe-area-inset-bottom,0px))]";

/** Negative margin for full-bleed pages that restore scroll clearance via a spacer */
export const BOTTOM_NAV_SCROLL_OFFSET_CLASS =
  "-mb-[calc(50px+env(safe-area-inset-bottom,0px))] md:-mb-[calc(56px+env(safe-area-inset-bottom,0px))]";

/** Standard page shell — Home / Favorites / Profile parity; dark bg fills to viewport bottom */
export const BOTTOM_NAV_PAGE_SHELL_CLASS =
  "flex min-h-[100svh] w-full flex-col bg-[#0A0A0A]";

/**
 * In-content scroll-end spacer — last row clears fixed BottomNav.
 * Solid #0A0A0A avoids a visible seam above the nav on semi-transparent chrome.
 */
export const BOTTOM_NAV_SCROLL_END_SPACER_CLASS =
  "min-h-[calc(3.25rem+env(safe-area-inset-bottom,0px))] shrink-0 bg-[#0A0A0A] md:min-h-[calc(3.5rem+env(safe-area-inset-bottom,0px))]";

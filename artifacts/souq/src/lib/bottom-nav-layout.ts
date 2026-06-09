/** BottomNav chrome height — keep in sync with `layout.tsx` BottomNav slot sizing. */
export const BOTTOM_NAV_HEIGHT_MOBILE_PX = 50;
export const BOTTOM_NAV_HEIGHT_MD_PX = 56;

/** Fixed nav — flush to viewport bottom; safe-area fill is an explicit child (Android/TWA). */
export const BOTTOM_NAV_FIXED_SHELL_CLASS =
  "fixed inset-x-0 bottom-0 z-40 flex w-full flex-col bg-[#0A0A0A] [transform:translateZ(0)]";

/** Solid home-indicator / gesture-bar fill — extends #0A0A0A to physical screen bottom. */
export const BOTTOM_NAV_SAFE_AREA_FILL_CLASS =
  "w-full shrink-0 bg-[#0A0A0A] h-[env(safe-area-inset-bottom,0px)] min-h-0";

/** Layout frame — single flex child; no min-h 100vh here (prevents scroll gap under fixed nav). */
export const BOTTOM_NAV_LAYOUT_FRAME_CLASS =
  "relative mx-auto flex w-full max-w-screen-2xl flex-1 flex-col min-h-0 overflow-x-hidden bg-[#0A0A0A]";

/** @deprecated Layout no longer reserves bottom padding — use BOTTOM_NAV_SCROLL_END_SPACER_CLASS in pages. */
export const BOTTOM_NAV_CONTENT_PADDING_CLASS = "";

/** Negative margin for full-bleed pages that restore scroll clearance via a spacer */
export const BOTTOM_NAV_SCROLL_OFFSET_CLASS =
  "-mb-[50px] md:-mb-[56px]";

/** Standard page shell — flex-1 inside layout frame; never stack min-h 100dvh with layout padding. */
export const BOTTOM_NAV_PAGE_SHELL_CLASS =
  "flex w-full flex-1 flex-col min-h-0 bg-[#0A0A0A]";

/**
 * In-content scroll-end spacer — last row clears fixed BottomNav.
 * Solid #0A0A0A avoids a visible seam above the nav on semi-transparent chrome.
 */
export const BOTTOM_NAV_SCROLL_END_SPACER_CLASS =
  "min-h-[calc(3.125rem+env(safe-area-inset-bottom,0px))] shrink-0 bg-[#0A0A0A] md:min-h-[calc(3.5rem+env(safe-area-inset-bottom,0px))]";

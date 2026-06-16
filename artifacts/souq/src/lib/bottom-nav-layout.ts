import { APP_SHELL_CONTENT_SLOT_CLASS } from "@/lib/app-shell-layout";

/** BottomNav chrome height — keep in sync with `layout.tsx` BottomNav slot sizing. */
export const BOTTOM_NAV_HEIGHT_MOBILE_PX = 50;
export const BOTTOM_NAV_HEIGHT_MD_PX = 56;

/**
 * L3 Bottom Nav shell — fixed viewport chrome; L4 safe-bottom via padding-bottom only.
 * Owner: layout.tsx → BottomNav (P09-3-App-Shell-Contract.md §12).
 */
export const BOTTOM_NAV_FIXED_SHELL_CLASS =
  "fixed inset-x-0 bottom-0 z-40 flex w-full flex-col justify-end bg-[#0A0A0A] pb-[var(--souq-safe-bottom,env(safe-area-inset-bottom,0px))] [transform:translateZ(0)]";

/** Button row — icons sit directly above shell safe-area padding. */
export const BOTTOM_NAV_BUTTONS_ROW_CLASS =
  "relative mx-auto flex max-w-screen-2xl items-stretch gap-0.5 px-1 py-0.5 md:gap-1 md:px-2 md:py-1 md:pb-1 lg:px-8";

/** @deprecated Safe-area moved to BOTTOM_NAV_FIXED_SHELL_CLASS padding-bottom. */
export const BOTTOM_NAV_SAFE_AREA_FILL_CLASS = "hidden";

/** L2 Content Slot frame — alias of APP_SHELL_CONTENT_SLOT_CLASS (single SSOT). */
export const BOTTOM_NAV_LAYOUT_FRAME_CLASS = APP_SHELL_CONTENT_SLOT_CLASS;

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
  "min-h-[calc(3.125rem+var(--souq-safe-bottom,env(safe-area-inset-bottom,0px)))] shrink-0 bg-[#0A0A0A] md:min-h-[3.5rem]";

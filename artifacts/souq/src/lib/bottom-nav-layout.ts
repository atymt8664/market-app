import { APP_SHELL_CONTENT_SLOT_CLASS } from "@/lib/app-shell-layout";

/** BottomNav chrome height — keep in sync with `layout.tsx` BottomNav slot sizing. */
export const BOTTOM_NAV_HEIGHT_MOBILE_PX = 50;
export const BOTTOM_NAV_HEIGHT_MD_PX = 56;

/** Base L3 visual drop — Safari · Chrome · Android · desktop (P9-3 §12). 0 = flush anchor. */
export const BOTTOM_NAV_VISUAL_DROP_PX = 0;

/**
 * iPhone A2HS-only L4 trim — reduces excess padding-bottom on chrome panel (not shell translate).
 * Gate: isIosWebKit() && navigator.standalone === true via html.ios-a2hs critical CSS.
 * Applied on [data-bottom-nav-chrome] — the visible panel that owns L4 pb.
 */
export const BOTTOM_NAV_IOS_A2HS_L4_TRIM_PX = 14;

/** DOM marker for frame-0 L4 critical CSS + guards (visible chrome panel). */
export const BOTTOM_NAV_CHROME_MARKER = "data-bottom-nav-chrome";
export const BOTTOM_NAV_CHROME_MARKER_VALUE = "1";

export function bottomNavChromeDomProps(): Record<string, string> {
  return { [BOTTOM_NAV_CHROME_MARKER]: BOTTOM_NAV_CHROME_MARKER_VALUE };
}

/** @deprecated translate drop ineffective on real device — use L4 trim via critical CSS. */
export const BOTTOM_NAV_IOS_A2HS_VISUAL_DROP_PX = 0;

/** CSS vars consumed by scroll-end clearance (drop retired; defaults 0). */
export const SOUQ_BOTTOM_NAV_DROP_VAR = "--souq-bottom-nav-drop";

/**
 * L3 outer shell — positioning anchor only (fixed flush bottom-0).
 * Overrides index.html flex on [data-bottom-nav-shell] via block; no shell pb (avoids gap below card).
 * Visual chrome + L4 safe-bottom live on BOTTOM_NAV_CHROME_PANEL_CLASS (§12).
 */
export const BOTTOM_NAV_FIXED_SHELL_CLASS =
  "fixed inset-x-0 bottom-0 left-0 right-0 z-40 m-0 block w-full";

/**
 * Chrome panel — full card unit (border · shadow · glow · L4 safe-bottom); bottom edge = viewport bottom.
 */
export const BOTTOM_NAV_CHROME_PANEL_CLASS =
  "w-full border-t border-primary/25 bg-[#0A0A0A] pb-[var(--souq-safe-bottom,env(safe-area-inset-bottom,0px))] shadow-[0_-1px_0_rgba(163,230,53,0.06),0_-6px_20px_-14px_rgba(0,0,0,0.42)] md:bg-[#0A0A0A]/94 md:backdrop-blur-md md:shadow-[0_-1px_0_rgba(163,230,53,0.08),0_-12px_36px_-16px_rgba(0,0,0,0.65)]";

/** Button row — unchanged visual padding from production chrome. */
export const BOTTOM_NAV_BUTTONS_ROW_CLASS =
  "relative mx-auto flex max-w-screen-2xl items-stretch gap-0.5 px-1 py-0.5 md:gap-1 md:px-2 md:py-1 md:pb-1 lg:px-8";

/** @deprecated Safe-area moved to BOTTOM_NAV_CHROME_PANEL_CLASS padding-bottom. */
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
  "flex w-full flex-1 flex-col min-h-0 overflow-hidden bg-[#0A0A0A]";

/**
 * In-content scroll-end spacer — last row clears fixed BottomNav.
 * Solid #0A0A0A avoids a visible seam above the nav on semi-transparent chrome.
 * Button row height only — L4 safe-bottom lives on BOTTOM_NAV_CHROME_PANEL_CLASS (§12.2).
 */
export const BOTTOM_NAV_SCROLL_END_SPACER_CLASS =
  "min-h-[3.125rem] shrink-0 bg-[#0A0A0A] md:min-h-[3.5rem]";

/**
 * L2 scroll-end clearance — button row + L3 visual drop + breathing room (ad-detail · home feed).
 * Use when last scrollable cards must clear fixed BottomNav after drop=0 polish.
 */
export const BOTTOM_NAV_SCROLL_END_CLEARANCE_CLASS =
  "min-h-[calc(3.125rem+var(--souq-bottom-nav-drop,0px)+1rem)] shrink-0 bg-[#0A0A0A] md:min-h-[calc(3.5rem+var(--souq-bottom-nav-drop,0px)+1rem)]";

/** Fixed offset for inbox delete-undo snackbar — above BottomNav chrome + L4 safe area. */
export const INBOX_UNDO_SNACKBAR_BOTTOM_CLASS =
  "bottom-[calc(3.125rem+var(--souq-safe-bottom,env(safe-area-inset-bottom,0px))+var(--souq-bottom-nav-drop,0px)+0.5rem)] md:bottom-[calc(3.5rem+var(--souq-safe-bottom,env(safe-area-inset-bottom,0px))+var(--souq-bottom-nav-drop,0px)+0.5rem)]";

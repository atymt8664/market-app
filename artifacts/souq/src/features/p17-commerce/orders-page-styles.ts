/**
 * Orders pages — tokens copied from existing app patterns only.
 * Header/main: `create-ad.tsx` (lines ~74–95, ~1537–1562)
 * Cards/tabs: `profile.tsx` + `settings-shell.tsx`
 */
export {
  SETTINGS_CARD as ORDERS_CARD,
  SETTINGS_CARD_COMPACT as ORDERS_CARD_COMPACT,
  SETTINGS_CARD_TITLE as ORDERS_CARD_TITLE,
  SETTINGS_SECTION_TITLE as ORDERS_SECTION_LABEL,
  SETTINGS_OUTLINE_BUTTON as ORDERS_GHOST_BTN,
  SETTINGS_HEADER_BAR as ORDERS_HEADER_BAR,
  SETTINGS_HEADER_INNER as ORDERS_HEADER_INNER,
  SETTINGS_BACK_BUTTON as ORDERS_BACK_BTN,
  SETTINGS_PAGE_TITLE as ORDERS_PAGE_TITLE,
  SETTINGS_MAIN_COLUMN as ORDERS_MAIN,
  SETTINGS_PAGE_BG as ORDERS_PAGE_BG,
} from "@/components/settings-shell";

import { cn } from "@/lib/utils";
import {
  BOTTOM_NAV_PAGE_SHELL_CLASS,
  BOTTOM_NAV_SCROLL_END_SPACER_CLASS,
  BOTTOM_NAV_SCROLL_OFFSET_CLASS,
} from "@/lib/bottom-nav-layout";
import {
  TAB_PAGE_HEADER_BAR,
  TAB_PAGE_HEADER_HUB_INNER,
  TAB_PAGE_HEADER_ACTION_BTN_DARK,
  TAB_PAGE_TITLE_BADGE_COMPACT,
} from "@/lib/tab-page-header-styles";

export { profileStatTileShell as ORDERS_STAT_CARD } from "@/components/profile-stat-tiles";

/** Compact approved header bar + P9-3H-iOS safe-top */
export const CREATE_AD_HEADER_BAR = TAB_PAGE_HEADER_BAR;

/** Compact header inner row */
export const CREATE_AD_HEADER_INNER = TAB_PAGE_HEADER_HUB_INNER;

/** Compact circular back button */
export const CREATE_AD_BACK_BTN = TAB_PAGE_HEADER_ACTION_BTN_DARK;

/** Compact page title badge */
export const CREATE_AD_PAGE_TITLE_HEADING = TAB_PAGE_TITLE_BADGE_COMPACT;

/** Hub page title — compact badge */
export const ORDERS_BUYER_PAGE_TITLE_HEADING = TAB_PAGE_TITLE_BADGE_COMPACT;

/** @deprecated Checkout-only legacy — hub/detail use {@link ORDERS_PAGE_SHELL} instead */
export const ORDERS_PAGE_LAYOUT_BOTTOM_CANCEL = BOTTOM_NAV_SCROLL_OFFSET_CLASS;

/** Hub/detail page shell — matches Home / Favorites / Profile (no negative-margin seam) */
export const ORDERS_PAGE_SHELL = BOTTOM_NAV_PAGE_SHELL_CLASS;

/** End-of-scroll spacer — solid dark fill above fixed BottomNav */
export const ORDERS_SCROLL_END_SPACER = BOTTOM_NAV_SCROLL_END_SPACER_CLASS;

/** `create-ad.tsx` — form/main column (tighter hub/detail density) */
export const CREATE_AD_MAIN_COLUMN =
  "mx-auto flex w-full max-w-[900px] md:max-w-[760px] lg:max-w-[860px] px-4 md:px-6 py-2 flex flex-col gap-2 md:gap-2.5 md:py-2.5";

/** Three-up stat row for buyer/seller hub */
export const ORDERS_STAT_GRID = "grid grid-cols-3 gap-2";

/** `profile.tsx` — PROFILE_TAB_LIST shell */
export const ORDERS_TAB_LIST =
  "h-auto w-full gap-1 rounded-xl border border-primary/32 bg-[#0A0A0A]/78 p-1 shadow-[0_0_24px_-14px_hsl(var(--primary)/0.16)] ring-1 ring-primary/12 md:gap-1.5 md:p-1.5";

/** Mobile-first inbox tabs — horizontal scroll; grid on md+ (H6). */
export const ORDERS_TAB_LIST_LAYOUT =
  "flex overflow-x-auto overscroll-x-contain scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-4 md:overflow-visible";

/** `profile.tsx` — PROFILE_TAB_TRIGGER — premium touch targets on small screens (H6). */
export const ORDERS_TAB_TRIGGER =
  "min-h-10 min-w-[5.25rem] shrink-0 snap-start rounded-lg border border-transparent bg-transparent px-2 py-2 text-[10px] font-semibold leading-tight text-primary/55 transition-all sm:min-w-[5.75rem] sm:text-[11px] data-[state=active]:border-primary/55 data-[state=active]:bg-black/95 data-[state=active]:text-primary data-[state=active]:shadow-[0_0_28px_-10px_hsl(var(--primary)/0.38)] data-[state=active]:ring-1 data-[state=active]:ring-primary/32 hover:border-primary/22 hover:bg-[#0A0A0A]/85 hover:text-primary/85 md:min-h-0 md:min-w-0 md:flex-1 md:px-2 md:py-2.5 md:text-[11px]";

/** Hub list card — dense horizontal row (profile my-ads parity). */
export const ORDERS_LIST_CARD_INBOX =
  "w-full rounded-2xl border border-primary/40 bg-[#0A0A0A]/75 p-2.5 text-right shadow-[0_0_22px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10 md:p-3";

/** L1 hero card — product-centric summary (lighter chrome, B1) */
export const ORDERS_CARD_HERO =
  "rounded-2xl border border-primary/40 bg-[#0A0A0A]/88 p-2.5 text-right md:p-3";

/** L3 support card — secondary blocks (reduced glow, B1) */
export const ORDERS_CARD_SUPPORT =
  "rounded-2xl border border-primary/22 bg-[#0A0A0A]/65 p-2.5 text-right md:p-3";

/** Mobile sticky primary CTA bar (A5) */
export const ORDERS_STICKY_CTA_BAR =
  "sticky bottom-0 z-30 -mx-4 border-t border-primary/22 bg-[#0A0A0A]/96 px-4 py-2 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.65)] backdrop-blur-sm pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none";

/** Hub order list card — interactive shell (orders-account-card-grid parity) */
export const ORDERS_LIST_CARD =
  "w-full rounded-2xl border border-primary/35 bg-[#0A0A0A]/78 p-2.5 text-right shadow-[0_0_22px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10 md:p-3";

/** Hub order list card — hover / pressed / touch feedback */
export const ORDERS_LIST_CARD_INTERACTIVE =
  "cursor-pointer touch-manipulation transition-[border-color,background-color,box-shadow,transform,opacity] duration-150 hover:border-primary/48 hover:bg-[#0A0A0A]/95 hover:shadow-[0_0_28px_-10px_hsl(var(--primary)/0.28)] active:scale-[0.985] active:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]";

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

import { BOTTOM_NAV_SCROLL_OFFSET_CLASS } from "@/lib/bottom-nav-layout";

export { profileStatTileShell as ORDERS_STAT_CARD } from "@/components/profile-stat-tiles";

/** `create-ad.tsx` — sticky header bar */
export const CREATE_AD_HEADER_BAR =
  "sticky top-0 z-40 border-b border-primary/20 bg-[#0A0A0A]/95 shadow-[0_1px_14px_-6px_rgba(0,0,0,0.4)]";

/** `create-ad.tsx` — header inner row */
export const CREATE_AD_HEADER_INNER =
  "mx-auto flex w-full max-w-[900px] items-center justify-between gap-3 px-4 py-2 md:max-w-[760px] md:px-6 md:py-2.5 lg:max-w-[860px]";

/** `create-ad.tsx` — adHeaderBackBtn */
export const CREATE_AD_BACK_BTN =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/55 bg-black/55 text-primary shadow-[0_0_10px_-4px_hsl(var(--primary)/0.2)] transition-colors hover:border-primary/75 active:opacity-90";

/** `create-ad.tsx` — createAdSectionHeading base */
const CREATE_AD_SECTION_HEADING =
  "inline-flex max-w-full w-fit items-center rounded-2xl border border-primary/35 bg-card/80 px-2 py-px text-sm font-semibold leading-tight tracking-tight text-foreground shadow-[0_0_14px_-12px_hsl(var(--primary)/0.16)] ring-1 ring-primary/10 dark:bg-zinc-950/70 md:text-base";

/** `create-ad.tsx` — createAdPageTitleHeading */
export const CREATE_AD_PAGE_TITLE_HEADING = `${CREATE_AD_SECTION_HEADING} px-2.5 py-0.5 text-base font-semibold md:px-3 md:py-1 md:text-lg`;

/** Hub page title (buyer + seller) — balances h-11 back button (create-ad parity) */
export const ORDERS_BUYER_PAGE_TITLE_HEADING = `${CREATE_AD_SECTION_HEADING} px-2.5 py-0.5 text-xl font-semibold md:px-3 md:py-1 md:text-[1.375rem]`;

/** `create-ad.tsx` — cancels Layout bottom padding; scroll spacer restores clearance above BottomNav */
export const ORDERS_PAGE_LAYOUT_BOTTOM_CANCEL = BOTTOM_NAV_SCROLL_OFFSET_CLASS;

/** End-of-scroll spacer — matches create-ad clearance above BottomNav */
export const ORDERS_SCROLL_END_SPACER =
  "min-h-[calc(7rem+env(safe-area-inset-bottom,0px))] shrink-0 md:min-h-[calc(7.25rem+env(safe-area-inset-bottom,0px))]";

/** `create-ad.tsx` — form/main column */
export const CREATE_AD_MAIN_COLUMN =
  "mx-auto flex w-full max-w-[900px] md:max-w-[760px] lg:max-w-[860px] px-4 md:px-6 py-2.5 flex flex-col gap-2.5 md:gap-3 md:py-3";

/** `profile.tsx` — PROFILE_TAB_LIST */
export const ORDERS_TAB_LIST =
  "h-auto w-full gap-1.5 rounded-xl border border-primary/32 bg-zinc-950/78 p-1.5 shadow-[0_0_24px_-14px_hsl(var(--primary)/0.16)] ring-1 ring-primary/12";

/** `profile.tsx` — PROFILE_TAB_TRIGGER */
export const ORDERS_TAB_TRIGGER =
  "rounded-lg border border-transparent bg-transparent px-1.5 py-2.5 text-[10px] font-semibold leading-tight text-primary/55 transition-all sm:px-2 sm:text-xs data-[state=active]:border-primary/52 data-[state=active]:bg-zinc-900/95 data-[state=active]:text-primary data-[state=active]:shadow-[0_0_24px_-12px_hsl(var(--primary)/0.32)] data-[state=active]:ring-1 data-[state=active]:ring-primary/28 hover:border-primary/22 hover:bg-zinc-950/85 hover:text-primary/85";

/** Hub order list card — interactive shell (orders-account-card-grid parity) */
export const ORDERS_LIST_CARD =
  "w-full rounded-2xl border border-primary/35 bg-zinc-950/78 p-3 text-right shadow-[0_0_22px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10 md:p-3.5";

/** Hub order list card — hover / pressed / touch feedback */
export const ORDERS_LIST_CARD_INTERACTIVE =
  "cursor-pointer touch-manipulation transition-[border-color,background-color,box-shadow,transform,opacity] duration-150 hover:border-primary/48 hover:bg-zinc-950/95 hover:shadow-[0_0_28px_-10px_hsl(var(--primary)/0.28)] active:scale-[0.985] active:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]";

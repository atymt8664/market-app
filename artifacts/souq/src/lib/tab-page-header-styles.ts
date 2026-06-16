import { cn } from "@/lib/utils";
import { TAB_IOS_STICKY_HEADER_SAFE_TOP_CLASS } from "@/lib/tab-ios-layout";

/** L1 tab-title card badge — legacy full size (prefer COMPACT for new work). */
export const TAB_PAGE_TITLE_BADGE = cn(
  "inline-flex max-w-full w-fit items-center rounded-2xl border border-primary/35 bg-[#0A0A0A]/80 px-2.5 py-0.5",
  "text-lg font-bold leading-tight tracking-tight text-foreground md:px-3 md:py-1 md:text-xl",
  "shadow-[0_0_14px_-12px_hsl(var(--primary)/0.16)] ring-1 ring-primary/10 bg-[#0A0A0A]/70",
);

/** Approved compact badge — SSOT (Phase A/B profile header). */
export const TAB_PAGE_TITLE_BADGE_COMPACT = cn(
  TAB_PAGE_TITLE_BADGE,
  "text-base font-semibold md:text-lg",
);

/** Sticky header bar — L0 safe-top + backdrop (P9-3 §10–§11). */
export const TAB_PAGE_HEADER_BAR = cn(
  "sticky top-0 z-40 border-b border-primary/20 bg-[#0A0A0A]/95 shadow-[0_1px_14px_-6px_rgba(0,0,0,0.4)] backdrop-blur",
  TAB_IOS_STICKY_HEADER_SAFE_TOP_CLASS,
);

/** Outer header shell — inner row owns vertical padding. */
export const TAB_PAGE_HEADER_COMPACT_OUTER = "px-0 py-0 md:backdrop-blur";

export const TAB_PAGE_HEADER_INNER_ROW =
  "mx-auto flex w-full items-center justify-between gap-3";

/** Compact inner row padding — tab routes (profile/favorites/messages). */
export const TAB_PAGE_HEADER_COMPACT_PADDING = "px-3 py-1.5 md:px-6 md:py-2";

/** Compact inner row padding — wide form routes (create-ad). */
export const TAB_PAGE_HEADER_COMPACT_PADDING_WIDE = "px-4 py-1.5 md:px-6 md:py-2";

/** Settings/account/legal inner row — compact hub width. */
export const TAB_PAGE_HEADER_HUB_INNER = cn(
  TAB_PAGE_HEADER_INNER_ROW,
  "max-w-[900px] px-3 py-1.5 md:max-w-[760px] md:px-6 md:py-2 lg:max-w-[860px]",
);

/** Auth pages inner row — narrow column. */
export const TAB_PAGE_HEADER_AUTH_INNER = cn(
  TAB_PAGE_HEADER_INNER_ROW,
  "mx-auto w-full max-w-md px-3 py-1.5 md:px-5 md:py-2",
);

/** Trailing actions slot — clears top edge clip on circular header buttons. */
export const TAB_PAGE_HEADER_TRAILING_WRAP_COMPACT = "shrink-0 pt-0.5";

/** @deprecated alias — use COMPACT */
export const TAB_PAGE_HEADER_TRAILING_WRAP = TAB_PAGE_HEADER_TRAILING_WRAP_COMPACT;

/** Settings/account/legal h1 wrapper (RTL title row). */
export const TAB_PAGE_HEADER_SETTINGS_TITLE = "m-0 min-w-0 flex-1 text-right";

/** Profile-style circular action (share/settings). */
export const TAB_PAGE_HEADER_ACTION_BTN = cn(
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/55",
  "bg-[#0A0A0A]/90 text-primary shadow-[0_0_10px_-4px_hsl(var(--primary)/0.18)]",
  "transition-colors hover:border-primary/75 hover:bg-[#0A0A0A]/95 active:opacity-90",
  "disabled:pointer-events-none disabled:opacity-55 dark:bg-black/55",
);

/** Back button — dark fill variant. */
export const TAB_PAGE_HEADER_ACTION_BTN_DARK = cn(
  TAB_PAGE_HEADER_ACTION_BTN,
  "bg-black/55 hover:bg-black/90",
);

export const TAB_PAGE_HEADER_ACTION_ICON = "h-4 w-4";

export const TAB_PAGE_HEADER_ACTIONS_GAP = "gap-1.5";

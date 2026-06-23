/**
 * Settings subtree visuals — **copied from existing app patterns** (do not invent new tokens):
 * - Cards / glow: `create-ad.tsx` (`adCardShell`, `adCardShellCompact`) + `profile.tsx` (`AD_CARD_SHELL`)
 * - Page bg + sticky header: `create-ad.tsx` (lines ~1357–1372)
 * - Back button: `create-ad.tsx` (`adHeaderBackBtn`)
 * - Inputs: `create-ad.tsx` (`adInputClass`)
 * - Category-style rows: `create-ad.tsx` (Sheet list rows, e.g. `border-primary/25 bg-[#0A0A0A]/75`)
 *
 * P9-3: SETTINGS_PAGE_BG is the L2 scroll owner when App Shell locks document scroll.
 */

import {
  TAB_PAGE_HEADER_ACTION_BTN_DARK,
  TAB_PAGE_HEADER_ACTION_ICON,
  TAB_PAGE_HEADER_BAR,
  TAB_PAGE_HEADER_HUB_INNER,
  TAB_PAGE_HEADER_SETTINGS_TITLE,
  TAB_PAGE_HEADER_TRAILING_WRAP_COMPACT,
  TAB_PAGE_TITLE_BADGE_COMPACT,
} from "@/lib/tab-page-header-styles";

/** `profile.tsx` / `create-ad.tsx` — card without outer padding (tabs shell, section wrapper) */
export const SETTINGS_CARD_SHELL =
  "rounded-2xl border border-primary/40 bg-[#0A0A0A]/75 shadow-[0_0_22px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10";

/** `create-ad.tsx` `adCardShell` — full padded card */
export const SETTINGS_CARD =
  "rounded-2xl border border-primary/40 bg-[#0A0A0A]/75 p-4 shadow-[0_0_22px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10 md:p-5";

/** `create-ad.tsx` `adCardShellCompact` */
export const SETTINGS_CARD_COMPACT =
  "rounded-2xl border border-primary/35 bg-[#0A0A0A]/70 p-3 shadow-[0_0_18px_-12px_hsl(var(--primary)/0.14)] ring-1 ring-primary/10";

/**
 * Settings / legal / account immersive pages — L2 scroll owner (P9-3 App Shell).
 * Replaces min-h-[100svh] which clipped inside overflow-hidden L2 Content Slot.
 */
export const SETTINGS_PAGE_BG =
  "flex min-h-0 flex-1 w-full flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain bg-[#0A0A0A] [-webkit-overflow-scrolling:touch] souq-scrollbar-hidden";

/** Inner scroll slot below a fixed page header (notifications hub, etc.). */
export const SETTINGS_INNER_SCROLL_CLASS =
  "flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain bg-[#0A0A0A] [-webkit-overflow-scrolling:touch] souq-scrollbar-hidden";

/**
 * Bottom padding for settings / legal / account subtrees when the main BottomNav is hidden.
 * Respects safe-area so content clears the home indicator without reserving nav height.
 */
export const SETTINGS_IMMERSIVE_BOTTOM =
  "pb-[max(2rem,env(safe-area-inset-bottom,0px))]";

/** Settings subtree sticky header — compact approved shell (P9-3 §10–§11). */
export const SETTINGS_HEADER_BAR = TAB_PAGE_HEADER_BAR;

/** Compact header inner row — hub / account / legal pages. */
export const SETTINGS_HEADER_INNER = TAB_PAGE_HEADER_HUB_INNER;

/** Compact circular back button. */
export const SETTINGS_BACK_BUTTON = TAB_PAGE_HEADER_ACTION_BTN_DARK;

/** Lucide size for header action icons — pair with SETTINGS_BACK_BUTTON. */
export const SETTINGS_HEADER_ACTION_ICON = TAB_PAGE_HEADER_ACTION_ICON;

/** Card title badge — compact approved size. */
export const SETTINGS_PAGE_TITLE_BADGE = TAB_PAGE_TITLE_BADGE_COMPACT;

/** h1 wrapper — place {@link SETTINGS_PAGE_TITLE_BADGE} inside. */
export const SETTINGS_PAGE_TITLE = TAB_PAGE_HEADER_SETTINGS_TITLE;

/** Trailing header actions (back, menu). */
export const SETTINGS_HEADER_TRAILING = TAB_PAGE_HEADER_TRAILING_WRAP_COMPACT;

/** `create-ad.tsx` form outer: `mx-auto ... px-4 md:px-6 py-4 flex flex-col gap-4` */
export const SETTINGS_MAIN_COLUMN =
  "mx-auto w-full max-w-[900px] md:max-w-[760px] lg:max-w-[860px] px-4 md:px-6 py-4 flex flex-col gap-4";

/**
 * Settings hub — shared layout for `/settings` and account subtree pages.
 * Card gaps stay comfortable; inner list rows use SETTINGS_HUB_LIST_ROW_* tokens.
 */
export const SETTINGS_HUB_HEADER_INNER = TAB_PAGE_HEADER_HUB_INNER;

export const SETTINGS_HUB_MAIN =
  "mx-auto w-full max-w-[900px] md:max-w-[760px] lg:max-w-[860px] px-2.5 md:px-3.5 pt-2 pb-3 flex flex-col gap-2.5";

export const SETTINGS_HUB_SUBPAGE_MAIN =
  "mx-auto w-full max-w-[900px] md:max-w-[760px] lg:max-w-[860px] px-2.5 md:px-3.5 py-3 flex flex-col gap-3";

/** Section label above hub cards — white, bold, clear RTL heading */
export const SETTINGS_HUB_SECTION_TITLE =
  "mb-2.5 mt-1 px-0.5 text-right text-[15px] font-bold text-white md:text-base";

/** Compact tappable row inside hub cards (min 44px touch target) */
export const SETTINGS_HUB_LIST_ROW =
  "flex min-h-[2.75rem] w-full items-center gap-2.5 text-right transition-colors border-b border-primary/10 last:border-0 hover:bg-primary/[0.04] active:bg-primary/[0.07]";

export const SETTINGS_HUB_LIST_ROW_PAD = "px-3 py-2 md:px-4";

export const SETTINGS_HUB_LIST_ROW_LABEL =
  "text-[15px] font-semibold leading-tight text-foreground";

export const SETTINGS_HUB_LIST_ROW_HINT =
  "mt-0.5 text-[11px] leading-snug text-muted-foreground/90";

export const SETTINGS_HUB_TOGGLE_ROW =
  "flex min-h-[2.75rem] items-center justify-between gap-3 py-2";

export const SETTINGS_HUB_OPTION_ROW =
  "flex min-h-[2.75rem] w-full items-center justify-between gap-2 rounded-xl border border-primary/25 bg-[#0A0A0A]/75 px-3 py-2 text-right transition-colors hover:border-primary/45 hover:bg-black/85";

/** @deprecated alias — settings subtree section headings */
export const SETTINGS_SECTION_TITLE = SETTINGS_HUB_SECTION_TITLE;

/** In-card heading — matches create-ad section titles */
export const SETTINGS_CARD_TITLE =
  "text-right text-sm font-semibold text-foreground md:text-base";

/** Modal shell — dark + lime rim (category / sheet vibe) */
export const SETTINGS_DIALOG_CONTENT =
  "rounded-2xl border border-primary/35 bg-[#0A0A0A] p-6 text-foreground shadow-[0_0_40px_-12px_hsl(var(--primary)/0.35)] ring-1 ring-primary/25 sm:max-w-md";

/** Compact action area for dialogs (shorter than SETTINGS_ACTION_PANEL) */
export const SETTINGS_DIALOG_ACTION_PANEL =
  "rounded-xl border border-primary/35 bg-[#0A0A0A]/75 p-3 shadow-[0_0_22px_-14px_hsl(var(--primary)/0.2)] ring-1 ring-primary/14 md:p-3.5";

/** `create-ad.tsx` `adInputClass` + full-width field sizing */
export const SETTINGS_FIELD =
  "w-full rounded-xl border border-primary/30 bg-[#0A0A0A]/90 px-3 py-2.5 text-sm text-foreground placeholder:text-zinc-500 focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-0 focus-visible:ring-offset-[#0A0A0A]";

/** Same field geometry as category / city triggers on create-ad (`h-11`/`h-12` unified) */
export const SETTINGS_INPUT =
  `${SETTINGS_FIELD} min-h-[3rem] py-3`;

/** Form labels — create-ad small muted captions */
export const SETTINGS_LABEL =
  "text-right text-xs font-medium text-zinc-400 md:text-[13px]";

/** Suffix control inside inputs (e.g. visibility) — lime accent, aligned with header back */
export const SETTINGS_INPUT_ICON_BUTTON =
  "absolute left-3 top-1/2 z-[1] flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-primary transition hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 active:opacity-90";

/** Lucide icon inside SETTINGS_INPUT_ICON_BUTTON — unified size/stroke weight target */
export const SETTINGS_INPUT_ICON_CLASS = "h-[18px] w-[18px] text-primary";

/**
 * Panel wrapping primary CTAs — dark surface + lime rim + glow (`bg-[#0A0A0A]`-style zinc).
 * Place **inside** form cards so the action reads as part of the card system, not a lone pill.
 */
export const SETTINGS_ACTION_PANEL =
  "rounded-2xl border border-primary/35 bg-[#0A0A0A]/70 p-4 shadow-[0_0_28px_-14px_hsl(var(--primary)/0.22)] ring-1 ring-primary/12 md:p-5";

/**
 * Primary CTA — matches `create-ad.tsx` publish `Button` (zinc fill + primary text, not flat lime).
 * Use inside SETTINGS_ACTION_PANEL for integrated footer actions.
 */
export const SETTINGS_PRIMARY_BUTTON =
  "inline-flex h-12 w-full cursor-pointer select-none items-center justify-center rounded-full border border-primary/45 bg-[#0A0A0A]/80 text-base font-bold text-primary shadow-[0_0_16px_-12px_hsl(var(--primary)/0.35)] transition-colors hover:border-primary/60 hover:bg-black/90 active:opacity-90 disabled:pointer-events-none disabled:opacity-50";

/** Outline / secondary CTA — lime border on zinc (create-ad outline buttons) */
export const SETTINGS_OUTLINE_BUTTON =
  "inline-flex min-h-[3rem] w-full items-center justify-center rounded-xl border border-primary/45 bg-[#0A0A0A]/90 px-4 text-sm font-semibold text-primary shadow-[0_0_18px_-14px_hsl(var(--primary)/0.28)] ring-1 ring-primary/15 transition hover:border-primary/60 hover:bg-black/95 sm:w-auto sm:min-w-[200px]";

/** Trigger for custom selects / city-style pickers */
export const SETTINGS_DROPDOWN_TRIGGER =
  "flex min-h-[3rem] w-full items-center justify-between gap-2 rounded-xl border border-primary/35 bg-[#0A0A0A]/90 px-3 text-sm text-foreground shadow-[0_0_18px_-14px_hsl(var(--primary)/0.14)] ring-1 ring-primary/10 transition hover:border-primary/48 hover:bg-black/85";

/** Radix SelectTrigger — matches SETTINGS_FIELD visual weight */
export const SETTINGS_SELECT_TRIGGER =
  `${SETTINGS_DROPDOWN_TRIGGER} [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-primary`;

/** Radix SelectContent — dark sheet card (category modal vibe) */
export const SETTINGS_SELECT_CONTENT =
  "max-h-[min(280px,50vh)] overflow-y-auto rounded-xl border border-primary/35 bg-[#0A0A0A] p-1 text-popover-foreground shadow-[0_0_32px_-8px_hsl(var(--primary)/0.35)] ring-1 ring-primary/25";

/** Radix SelectItem */
export const SETTINGS_SELECT_ITEM =
  "relative cursor-pointer rounded-lg py-2.5 pl-3 pr-10 text-right text-sm text-foreground outline-none focus:bg-black/95 focus:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-black/95 data-[state=checked]:bg-primary/10";

/** Ticket list row */
export const SETTINGS_TICKET_ROW =
  "w-full rounded-xl border border-primary/30 bg-[#0A0A0A]/80 px-3 py-3 text-right shadow-[0_0_20px_-14px_hsl(var(--primary)/0.14)] ring-1 ring-primary/10 transition hover:border-primary/42 hover:bg-black/75";

export const SETTINGS_TICKET_ROW_SELECTED =
  "border-primary/48 bg-primary/[0.1] shadow-[0_0_26px_-12px_hsl(var(--primary)/0.32)] ring-primary/22";

/** Status pill base */
export const SETTINGS_STATUS_BADGE =
  "inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tabular-nums";

/** Ticket / chat message row */
export const SETTINGS_MESSAGE_BUBBLE =
  "rounded-xl border border-primary/28 bg-[#0A0A0A]/75 p-3 text-sm shadow-[0_0_18px_-14px_hsl(var(--primary)/0.12)] ring-1 ring-primary/10";

/** List / secondary action row — hub option row (language, links) */
export const SETTINGS_ROW_BUTTON = SETTINGS_HUB_OPTION_ROW;

/** Icon tile in settings rows — compact hub list icon */
export const SETTINGS_ICON_TILE =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/35 bg-[#0A0A0A]/80 text-primary [&_svg]:h-4 [&_svg]:w-4";

export const SETTINGS_ICON_TILE_DESTRUCTIVE =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-destructive/30 bg-destructive/10 text-destructive [&_svg]:h-4 [&_svg]:w-4";

/** Alias for hub list rows — use with SETTINGS_HUB_LIST_ROW_PAD */
export const SETTINGS_HUB_ICON_TILE = SETTINGS_ICON_TILE;

/** @deprecated use SETTINGS_MAIN_COLUMN — kept for minimal churn in files that only need horizontal wrap */
export const SETTINGS_MAX_CONTAINER =
  "mx-auto w-full max-w-[900px] md:max-w-[760px] lg:max-w-[860px] px-4 md:px-6";

/** @deprecated use SETTINGS_PAGE_TITLE */
export const SETTINGS_TITLE = SETTINGS_PAGE_TITLE;

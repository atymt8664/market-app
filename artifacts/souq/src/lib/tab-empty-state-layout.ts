import { cn } from "@/lib/utils";

/** Wrapper: full width, centered card, no vertical stretch inside flex-1 parents (/messages). */
export const TAB_EMPTY_WRAPPER_CLASS =
  "flex w-full shrink-0 justify-center items-start pt-0 pb-6 md:pt-1 md:pb-8";

export const TAB_EMPTY_CARD_SHELL =
  "rounded-2xl border border-primary/40 bg-[#0A0A0A]/75 p-6 shadow-[0_0_22px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10 md:p-8";

/** Unified card footprint — min-height matches taller inbox copy block; shrink-0 avoids flex stretch. */
export const TAB_EMPTY_CARD_BODY_CLASS =
  "flex w-full max-w-sm min-h-[17.75rem] shrink-0 flex-col items-center justify-center text-center sm:max-w-md md:min-h-[19.5rem]";

export const TAB_EMPTY_ICON_RING_CLASS =
  "mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-primary/35 bg-[#0A0A0A]/90 shadow-[0_0_18px_-8px_hsl(var(--primary)/0.22)] ring-1 ring-primary/12 md:h-[4.5rem] md:w-[4.5rem]";

export const TAB_EMPTY_TITLE_CLASS =
  "mb-1.5 text-lg font-bold text-foreground md:text-xl";

export const TAB_EMPTY_DESC_CLASS =
  "mb-5 max-w-xs text-sm leading-relaxed text-muted-foreground";

export const TAB_EMPTY_CTA_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-full border border-primary/40 bg-[#0A0A0A]/90 px-4 py-2.5 text-sm font-semibold text-primary shadow-[0_0_14px_-6px_hsl(var(--primary)/0.22)] ring-1 ring-primary/10 transition-colors hover:border-primary/55 hover:bg-black/95";

/** Match /favorites content slot top inset when tab list is empty. */
export const TAB_EMPTY_PAGE_TOP_CLASS = "pt-2 md:pt-3";

export function tabEmptyCardClass(...extra: (string | undefined)[]) {
  return cn(TAB_EMPTY_CARD_SHELL, TAB_EMPTY_CARD_BODY_CLASS, ...extra);
}

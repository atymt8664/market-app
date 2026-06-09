import { cn } from "@/lib/utils";

/** Same mini-card title pattern as favorites / create-ad — dark + lime glow */
const inboxCollectionSectionHeading = cn(
  "inline-flex max-w-full w-fit items-center rounded-2xl border border-primary/35 bg-[#0A0A0A]",
  "font-semibold leading-tight tracking-tight text-foreground",
  "shadow-[0_0_14px_-12px_hsl(var(--primary)/0.16)] ring-1 ring-primary/10",
);

export const inboxCollectionPageTitleBadge = cn(
  inboxCollectionSectionHeading,
  "px-2.5 py-0.5 text-base font-bold md:px-3 md:py-1 md:text-lg",
);

export const inboxCollectionCountBadge = cn(
  "ms-1.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full",
  "border border-primary/30 bg-[#0A0A0A] px-1.5 text-[10px] font-bold tabular-nums text-primary",
  "ring-1 ring-primary/10",
);

export const inboxCollectionShellClass = "flex w-full flex-1 flex-col min-h-0 bg-[#0A0A0A]";

export const inboxCollectionHeaderClass =
  "sticky top-0 z-40 shrink-0 border-b border-primary/20 bg-[#0A0A0A] shadow-[0_1px_14px_-6px_rgba(0,0,0,0.4)]";

export const inboxCollectionBackBtnClass = cn(
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
  "border border-primary/30 bg-[#0A0A0A] text-primary ring-1 ring-primary/10",
  "transition-colors hover:border-primary/45 hover:bg-black/85",
);

export const inboxCollectionListWrapClass =
  "mx-auto flex w-full max-w-[820px] flex-1 flex-col bg-[#0A0A0A] px-3 py-2 md:px-4";

export const inboxCollectionListGapClass = "flex w-full flex-col gap-1";

export const inboxCollectionRowCard = cn(
  "rounded-xl border border-primary/28 bg-[#0A0A0A] px-2.5 py-2",
  "shadow-[0_0_10px_-10px_hsl(var(--primary)/0.12)] ring-1 ring-primary/10",
);

export const inboxCollectionActionBtn = cn(
  "inline-flex h-8 flex-1 items-center justify-center rounded-lg border border-primary/38",
  "bg-primary/10 px-2 text-[12px] font-semibold leading-none text-primary",
  "shadow-[0_0_12px_-12px_hsl(var(--primary)/0.28)] transition-colors hover:bg-primary/16 disabled:opacity-45",
);

export const inboxCollectionSecondaryBtn = cn(
  "inline-flex h-8 flex-1 items-center justify-center rounded-lg border border-primary/28",
  "bg-[#0A0A0A] px-2 text-[12px] font-semibold leading-none text-foreground",
  "transition-colors hover:border-primary/42 hover:bg-black/50 disabled:opacity-45",
);

export const inboxCollectionUnblockBtn = cn(
  inboxCollectionActionBtn,
  "border-red-500/35 bg-red-950/20 text-red-100 hover:bg-red-950/35",
);

export const inboxCollectionThumbClass =
  "h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-primary/20 bg-[#0A0A0A]";

export const inboxCollectionSkeletonRowClass =
  "h-[4.75rem] w-full rounded-xl border border-primary/15 bg-[#0A0A0A]";

export const inboxCollectionEmptyCardClass = cn(
  "rounded-2xl border border-primary/40 bg-[#0A0A0A] p-6",
  "shadow-[0_0_22px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10 md:p-8",
);

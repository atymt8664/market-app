import { cn } from "@/lib/utils";

/** Shared profile mid-page section container — Metrics · Commerce · Identity */
export const PROFILE_SECTION_SHELL =
  "rounded-2xl border border-primary/35 bg-[#0A0A0A]/75 shadow-[0_0_22px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10";

/** Section titles — white hierarchy (lime reserved for metrics · states · actions) */
export const PROFILE_SECTION_LABEL =
  "text-xs font-semibold leading-tight text-foreground md:text-[13px]";

export const PROFILE_SECTION_HEADER =
  "border-b border-primary/20 px-2.5 py-0.5 md:px-3";

/** Vertical rhythm between mid-page sections */
export const PROFILE_SECTION_STACK_GAP = "mt-2";

export function profileSectionClassName(className?: string) {
  return cn(PROFILE_SECTION_SHELL, className);
}

/** Segment tabs — shared by identity tiers + content navigator (button-based, identical render) */
export const PROFILE_SEGMENT_TAB_LIST_BASE =
  "grid h-auto w-full gap-1 rounded-none border-0 bg-transparent p-1 shadow-none ring-0";

export const PROFILE_SEGMENT_TAB_LIST_3 = cn(PROFILE_SEGMENT_TAB_LIST_BASE, "grid-cols-3");

export const PROFILE_SEGMENT_TAB_LIST_4 = cn(PROFILE_SEGMENT_TAB_LIST_BASE, "grid-cols-4");

export const PROFILE_SEGMENT_TAB_BASE =
  "relative flex min-h-8 flex-1 items-center justify-center rounded-lg border px-0.5 py-1 text-center text-[11px] font-semibold leading-tight transition-all sm:text-xs md:px-1 md:text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

export const PROFILE_SEGMENT_TAB_INACTIVE =
  "border-transparent bg-transparent text-foreground/60 hover:border-primary/22 hover:bg-[#0A0A0A]/85 hover:text-foreground/85";

export const PROFILE_SEGMENT_TAB_ACTIVE =
  "border-primary/45 bg-black/95 text-primary shadow-[0_0_16px_-12px_hsl(var(--primary)/0.24)] ring-1 ring-primary/20 after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary";

import { cn } from "@/lib/utils";

/** Matches NotificationBell — shared header / in-search icon controls. */
export const marketplaceHeaderIconButtonClass = cn(
  "relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl",
  "border border-primary/35 bg-zinc-950/80 text-primary",
  "shadow-[0_0_16px_-12px_hsl(var(--primary)/0.32)] ring-1 ring-primary/15",
  "transition-[transform,colors,box-shadow] hover:border-primary/50 hover:bg-zinc-900/90",
  "hover:shadow-[0_0_20px_-10px_hsl(var(--primary)/0.38)] active:scale-[0.96]",
);

export const marketplaceHeaderIconButtonActiveClass = cn(
  "border-primary/50 bg-zinc-900/95 shadow-[0_0_20px_-10px_hsl(var(--primary)/0.4)]",
);

import { memo } from "react";
import { cn } from "@/lib/utils";

export type HomeFeaturedDividerPlacement = "featured-top" | "featured-bottom";

type HomeFeaturedDividerProps = {
  isRtl: boolean;
  /** featured-top: above featured title; featured-bottom: before recommended */
  placement?: HomeFeaturedDividerPlacement;
};

/**
 * Lime section divider for Home featured block (6B-3).
 * CSS-only — no animation/blur layers that could jank scroll on Android.
 */
export const HomeFeaturedDivider = memo(function HomeFeaturedDivider({
  isRtl,
  placement = "featured-bottom",
}: HomeFeaturedDividerProps) {
  const isTop = placement === "featured-top";

  return (
    <div
      role="separator"
      aria-hidden
      className="relative mx-auto w-full max-w-screen-xl px-4 md:px-6 lg:px-8"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div
        className={cn(
          "relative",
          isTop ? "py-1 max-md:py-0.5 md:py-2.5" : "py-1 max-md:py-0.5 md:py-3",
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0",
            isTop
              ? "bottom-0 h-4 max-md:h-3 bg-gradient-to-t from-zinc-950/45 to-transparent md:h-6"
              : "top-0 h-4 max-md:h-3 bg-gradient-to-b from-zinc-950/55 to-transparent md:h-8 md:from-zinc-950/50",
          )}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-4 top-1/2 h-2.5 -translate-y-1/2 bg-[radial-gradient(ellipse_72%_100%_at_50%_50%,hsl(var(--primary)/0.16),transparent_70%)] md:inset-x-6"
          aria-hidden
        />
        <div className="relative flex items-center gap-2.5 md:gap-3">
          <div
            className={cn(
              "h-[1.5px] min-w-0 flex-1 shadow-[0_0_10px_-6px_hsl(var(--primary)/0.45)]",
              isRtl
                ? "bg-gradient-to-l from-transparent via-primary/42 to-primary/18"
                : "bg-gradient-to-r from-transparent via-primary/42 to-primary/18",
            )}
          />
          <div
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70 ring-1 ring-primary/35 shadow-[0_0_12px_2px_hsl(var(--primary)/0.32)] md:h-1 md:w-1 md:shadow-[0_0_10px_2px_hsl(var(--primary)/0.22)]"
            aria-hidden
          />
          <div
            className={cn(
              "h-[1.5px] min-w-0 flex-1 shadow-[0_0_10px_-6px_hsl(var(--primary)/0.45)]",
              isRtl
                ? "bg-gradient-to-r from-transparent via-primary/42 to-primary/18"
                : "bg-gradient-to-l from-transparent via-primary/42 to-primary/18",
            )}
          />
        </div>
      </div>
    </div>
  );
});

import { memo } from "react";
import { cn } from "@/lib/utils";
import { HOME_PAGE_GUTTER, HOME_PAGE_SHELL } from "@/lib/home-page-layout";

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
      className={cn(HOME_PAGE_SHELL, HOME_PAGE_GUTTER)}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div
        className={cn(
          "relative",
          isTop ? "py-0.5 max-md:py-0 md:py-2" : "py-0.5 max-md:py-0 md:py-2.5",
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0",
            isTop
              ? "bottom-0 h-4 max-md:h-3 bg-gradient-to-t from-[#0A0A0A]/45 to-transparent md:h-6"
              : "top-0 h-4 max-md:h-3 bg-gradient-to-b from-[#0A0A0A]/55 to-transparent md:h-8 md:from-[#0A0A0A]/50",
          )}
          aria-hidden
        />
        <div className="relative flex items-center gap-2.5 md:gap-3">
          <div
            className={cn(
              "h-px min-w-0 flex-1",
              isRtl
                ? "bg-gradient-to-l from-transparent via-primary/28 to-primary/12"
                : "bg-gradient-to-r from-transparent via-primary/28 to-primary/12",
            )}
          />
          <div
            className="h-1 w-1 shrink-0 rounded-full bg-primary/55 ring-1 ring-primary/25 md:h-1 md:w-1"
            aria-hidden
          />
          <div
            className={cn(
              "h-px min-w-0 flex-1",
              isRtl
                ? "bg-gradient-to-r from-transparent via-primary/28 to-primary/12"
                : "bg-gradient-to-l from-transparent via-primary/28 to-primary/12",
            )}
          />
        </div>
      </div>
    </div>
  );
});

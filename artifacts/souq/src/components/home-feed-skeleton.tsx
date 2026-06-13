import { AdCardSkeleton } from "@/components/ad-card-skeleton";
import { HOME_PAGE_INSET } from "@/lib/home-page-layout";
import { BOTTOM_NAV_SCROLL_END_SPACER_CLASS } from "@/lib/bottom-nav-layout";
import { cn } from "@/lib/utils";

const FEATURED_KEYS = [0, 1, 2] as const;
const GRID_KEYS = [0, 1, 2, 3] as const;

/** Stable home feed placeholder — dark premium + lime accent; visible during featured fetch (P9-E). */
export function HomeFeedSkeleton() {
  return (
    <div className="min-w-0" data-testid="home-feed-skeleton" aria-busy="true" aria-label="Loading">
      <section className={cn(HOME_PAGE_INSET, "pb-2 pt-1")}>
        <div className="mb-2 h-7 w-28 rounded-2xl border border-primary/20 bg-white/[0.04] animate-pulse" />
        <div className="flex gap-2 overflow-hidden">
          {FEATURED_KEYS.map((k) => (
            <div key={k} className="w-[42%] shrink-0 md:w-[28%]">
              <AdCardSkeleton />
            </div>
          ))}
        </div>
      </section>
      <section className={cn(HOME_PAGE_INSET, "pb-2")}>
        <div className="mb-2 h-7 w-32 rounded-2xl border border-primary/20 bg-white/[0.04] animate-pulse" />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
          {GRID_KEYS.map((k) => (
            <AdCardSkeleton key={k} />
          ))}
        </div>
      </section>
      <div className={BOTTOM_NAV_SCROLL_END_SPACER_CLASS} aria-hidden />
    </div>
  );
}

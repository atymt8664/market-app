import { AdCardSkeleton } from "@/components/ad-card-skeleton";
import { HOME_PAGE_INSET } from "@/lib/home-page-layout";
import { BOTTOM_NAV_SCROLL_END_SPACER_CLASS } from "@/lib/bottom-nav-layout";
import { cn } from "@/lib/utils";

const FEATURED_KEYS = [0, 1, 2] as const;
const GRID_KEYS = [0, 1, 2, 3] as const;

/** L2 scroll skeleton — featured + recommended placeholders (P9-E / P9-3B). */
export function HomeFeedSkeleton() {
  return (
    <div className="min-w-0" data-testid="home-feed-skeleton" aria-busy="true" aria-label="Loading">
      <section className="min-w-0 pb-1 pt-0.5 max-md:pb-0.5 md:py-4" aria-hidden>
        <div className={cn(HOME_PAGE_INSET, "mb-1.5 md:mb-2")}>
          <div className="h-7 w-28 rounded-2xl border border-primary/20 bg-white/[0.04] animate-pulse" />
        </div>
        <div className={HOME_PAGE_INSET}>
          <div className="flex gap-2 overflow-hidden pb-0.5 md:gap-2.5 md:pb-1">
            {FEATURED_KEYS.map((k) => (
              <div key={k} className="w-[42%] shrink-0 md:w-[28%]">
                <AdCardSkeleton />
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className={cn(HOME_PAGE_INSET, "pb-2 pt-0")}>
        <div className="mb-1.5 md:mb-2 h-7 w-32 rounded-2xl border border-primary/20 bg-white/[0.04] animate-pulse" />
        <div className="grid grid-cols-2 gap-x-2 gap-y-2 md:grid-cols-3 md:gap-x-2.5 md:gap-y-2.5 xl:grid-cols-4">
          {GRID_KEYS.map((k) => (
            <AdCardSkeleton key={k} />
          ))}
        </div>
      </section>
      <div className={BOTTOM_NAV_SCROLL_END_SPACER_CLASS} aria-hidden />
    </div>
  );
}

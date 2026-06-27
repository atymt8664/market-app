import type { Ad } from "@workspace/api-client-react";
import { memo, useRef } from "react";
import { HomeFeedAdCard } from "@/components/home-feed-ad-card";
import { AdCardSkeleton } from "@/components/ad-card-skeleton";
import { HorizontalScrollStrip } from "@/components/horizontal-scroll-strip";
import { HomeFeaturedDivider } from "@/components/home-featured-divider";
import { useInfiniteScrollSentinel } from "@/hooks/use-infinite-scroll-sentinel";
import { t } from "@/i18n";
import { HOME_FEED_ADS_INSET, HOME_PAGE_INSET } from "@/lib/home-page-layout";
import { BOTTOM_NAV_SCROLL_END_CLEARANCE_CLASS } from "@/lib/bottom-nav-layout";
import { HomeFeedBottomLoader } from "@/components/home-feed-bottom-loader";
import { cn } from "@/lib/utils";

const FEATURED_SKELETON_KEYS = [0, 1, 2, 3] as const;
const GRID_SKELETON_KEYS = [0, 1, 2, 3] as const;

const homeSectionHeading = cn(
  "inline-flex max-w-full items-center rounded-2xl border border-primary/28 bg-[#0A0A0A] px-2 py-px",
  "text-[15px] font-semibold leading-tight tracking-tight text-foreground md:text-base",
  "ring-1 ring-primary/8",
);

const homeAdCardTone = cn(
  "[&>div]:h-full",
  "[&_article]:flex [&_article]:h-full [&_article]:flex-col",
  "[&_article]:transition-none",
  "[&_article]:active:scale-100",
);

const featuredStripClassName = cn(
  "flex w-max max-w-none items-start justify-start gap-2 pb-0.5 md:gap-2.5 md:pb-1",
  homeAdCardTone,
  "[&>div]:h-auto [&_article]:h-auto",
);

const recommendedGridClassName = cn(
  "grid grid-cols-2 items-stretch gap-x-2 gap-y-2 min-[520px]:grid-cols-3 min-[520px]:gap-x-2.5 min-[520px]:gap-y-2.5 md:grid-cols-3 md:gap-x-2.5 md:gap-y-2.5 xl:grid-cols-4 xl:gap-x-3 xl:gap-y-2.5 2xl:grid-cols-5 2xl:gap-x-3.5 2xl:gap-y-3",
  homeAdCardTone,
);

export type HomeFeedSectionsProps = {
  isRtl: boolean;
  isLoadingFeatured: boolean;
  featuredAds: Ad[] | undefined;
  isLoadingRecommended: boolean;
  recommendedAds: Ad[] | undefined;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  fetchNextPage?: () => void;
  scrollRootRef?: React.RefObject<HTMLDivElement | null>;
};

/** Recommended grid — API pages append on scroll; loader tied to isFetchingNextPage. */
export const HomeFeedScrollContent = memo(function HomeFeedScrollContent({
  isRtl,
  isLoadingFeatured,
  featuredAds,
  isLoadingRecommended,
  recommendedAds,
  hasNextPage = false,
  isFetchingNextPage = false,
  fetchNextPage,
  scrollRootRef,
}: HomeFeedSectionsProps) {
  const featuredList = Array.isArray(featuredAds) ? featuredAds : [];
  const recommendedList = Array.isArray(recommendedAds) ? recommendedAds : [];
  const infiniteSentinelRef = useRef<HTMLDivElement>(null);

  useInfiniteScrollSentinel(infiniteSentinelRef, scrollRootRef ?? { current: null }, {
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage: fetchNextPage ?? (() => {}),
  });

  return (
    <div className="animate-in fade-in duration-300">
      <section className="min-w-0 pb-1 pt-0.5 max-md:pb-0.5 md:py-4">
        <div className={cn(HOME_PAGE_INSET, "mb-1.5 md:mb-2")}>
          <h2 className={homeSectionHeading}>{t("home.featured_ads")}</h2>
        </div>
        <div className={HOME_FEED_ADS_INSET}>
          <HorizontalScrollStrip dir={isRtl ? "rtl" : "ltr"}>
            <div className={featuredStripClassName} dir={isRtl ? "rtl" : "ltr"}>
              {isLoadingFeatured ? (
                FEATURED_SKELETON_KEYS.map((i) => (
                  <AdCardSkeleton key={i} featured homeFeed />
                ))
              ) : featuredList.length ? (
                featuredList.map((ad, index) => (
                  <HomeFeedAdCard
                    key={ad.id}
                    ad={ad}
                    featured
                    featuredLead={index === 0}
                    showFavoriteHeart
                  />
                ))
              ) : (
                <div className="w-full py-5 text-center text-sm text-muted-foreground">
                  {t("home.no_featured_ads")}
                </div>
              )}
            </div>
          </HorizontalScrollStrip>
        </div>
      </section>

      <div>
        <HomeFeaturedDivider isRtl={isRtl} placement="featured-bottom" />
      </div>

      <section className="pb-3 pt-0.5 max-md:pb-0.5 md:pb-4 md:pt-0">
        <div className={cn(HOME_PAGE_INSET, "mb-1.5 md:mb-2")}>
          <h2 className={homeSectionHeading}>{t("home.recommended")}</h2>
        </div>
        <div className={HOME_FEED_ADS_INSET}>
        <div className={recommendedGridClassName}>
          {isLoadingRecommended ? (
            GRID_SKELETON_KEYS.map((i) => (
              <div key={i} className="h-full min-h-0">
                <AdCardSkeleton homeFeed />
              </div>
            ))
          ) : recommendedList.length ? (
            <>
              {recommendedList.map((ad) => (
                <div key={ad.id} className="h-full min-h-0">
                  <HomeFeedAdCard ad={ad} showFavoriteHeart />
                </div>
              ))}
              {isFetchingNextPage ? <HomeFeedBottomLoader /> : null}
              {hasNextPage ? (
                <div
                  ref={infiniteSentinelRef}
                  className="col-span-full h-2 w-full"
                  data-testid="home-feed-infinite-sentinel"
                  aria-hidden
                />
              ) : null}
            </>
          ) : (
            <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
              {t("home.no_ads")}
            </div>
          )}
        </div>
        </div>
      </section>
      <div aria-hidden className={BOTTOM_NAV_SCROLL_END_CLEARANCE_CLASS} data-testid="home-feed-scroll-clearance" />
    </div>
  );
});

/** P7-PR-8: lazy chunk — AdCard favorite/auth stack stays off Home entry parse path. */
const HomeFeedSections = memo(function HomeFeedSections(props: HomeFeedSectionsProps) {
  return <HomeFeedScrollContent {...props} />;
});

export default HomeFeedSections;

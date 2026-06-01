import {
  useListCategories,
  useListFeaturedAds,
  useListRecommendedAds,
  useListAds,
  getListCategoriesQueryKey,
  getListFeaturedAdsQueryKey,
  getListAdsQueryKey,
  getListRecommendedAdsQueryKey,
  type Ad,
  type Category,
} from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { ChevronDown } from "lucide-react";
import { AdCard, AdCardSkeleton } from "@/components/ad-card";
import {
  adCardNoImageIconClassName,
} from "@/components/ad-card-no-image-placeholder";
import { CategoryIcon } from "@/components/category-icon";
import { MarketplaceSearchBar } from "@/components/marketplace-search-bar";
import { NotificationBell } from "@/components/notification-bell";
import { HorizontalScrollStrip } from "@/components/horizontal-scroll-strip";
import { HomeFeaturedDivider } from "@/components/home-featured-divider";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { scheduleAfterFirstPaint } from "@/lib/after-first-paint";
import { useSelectedCity } from "@/hooks/use-selected-city";
import { useSearchLocation } from "@/hooks/use-search-location";
import { searchLocationCityForFeed } from "@/lib/search-location";
import { filterHomeFeedAds } from "@/lib/home-feed-ads";
import { useAuth } from "@/hooks/use-auth";
import { t } from "@/i18n";
import type { Locale } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import { getCreateAdTaxonomyLabel } from "@/lib/create-ad-taxonomy-labels";
import { splitHomeCategoryLabel, filterHomeCategories } from "@/lib/home-category-display";
import {
  HOME_PAGE_INSET,
} from "@/lib/home-page-layout";
import { cn } from "@/lib/utils";

/** Home feed ad cards — layout only; shell styling lives in AdCard HOME_FEED_CARD_SHELL. */
const homeAdCardTone = cn(
  "[&>div]:h-full",
  "[&_article]:flex [&_article]:h-full [&_article]:flex-col",
  "[&_article]:transition-none",
  "[&_article]:active:scale-100",
  "[&_article_img]:transition-none [&_article_img]:group-hover:scale-100",
  "[&_article>div:first-child]:rounded-t-xl",
  "[&_article_button]:rounded-full [&_article_button]:border [&_article_button]:border-primary/45 [&_article_button]:bg-black/55 [&_article_button]:shadow-none [&_article_button]:transition-none [&_article_button]:active:scale-95",
);

/** React Query: تقليل إعادة الجلب عند التنقل للرئيسية دون المساس بـ invalidate بعد الطفرات/الأدمن. */
const HOME_STALE_CATEGORIES_MS = 10 * 60 * 1000;
const HOME_STALE_FEATURED_MS = 2 * 60 * 1000;
const HOME_STALE_FEED_MS = 90 * 1000;

const CATEGORY_SKELETON_KEYS = [0, 1, 2, 3, 4] as const;
const FEATURED_SKELETON_KEYS = [0, 1, 2, 3] as const;
const GRID_SKELETON_KEYS = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
] as const;

/** Featured strip — gutter applied on wrapper; cards align with section titles. */
const featuredStripClassName = cn(
  "flex w-max max-w-none items-start justify-start gap-2 pb-0.5 md:gap-2.5 md:pb-1",
  homeAdCardTone,
  "[&>div]:h-auto [&_article]:h-auto",
);

const recommendedGridClassName = cn(
  "grid grid-cols-2 items-stretch gap-x-2 gap-y-2 md:grid-cols-3 md:gap-x-2.5 md:gap-y-2.5 xl:grid-cols-4 xl:gap-x-3 xl:gap-y-2.5 2xl:grid-cols-5 2xl:gap-x-3.5 2xl:gap-y-3",
  homeAdCardTone,
);

/** Section titles — #0A0A0A chip; thin lime rim only. */
const homeSectionHeading = cn(
  "inline-flex max-w-full items-center rounded-2xl border border-primary/28 bg-[#0A0A0A] px-2 py-px",
  "text-[15px] font-semibold leading-tight tracking-tight text-foreground md:text-base",
  "ring-1 ring-primary/8",
);

/** Unified home category tile — fixed width for strip alignment. */
const HOME_CATEGORY_TILE_W = "w-16";

/** Category icon shell — lime accent only; no outer glow. */
const homeCategoryIconShell = cn(
  "flex items-center justify-center border border-primary/28 bg-primary/[0.05] ring-1 ring-primary/10",
  "relative h-10 w-10 shrink-0 rounded-xl transition-none",
);

const homeCategoryTileShell = cn(
  HOME_CATEGORY_TILE_W,
  "shrink-0 touch-manipulation transition-none",
);

const homeCategoryIconGlyphClassName = cn(
  "h-[1.125rem] w-[1.125rem]",
  adCardNoImageIconClassName,
);

function HomeCategoryIconBox({ iconName }: { iconName?: string }) {
  return (
    <div className={homeCategoryIconShell}>
      {iconName ? (
        <CategoryIcon name={iconName} className={homeCategoryIconGlyphClassName} />
      ) : (
        <span className={cn(homeCategoryIconGlyphClassName, "opacity-0")} aria-hidden>
          •
        </span>
      )}
    </div>
  );
}

/** Two-line label box — fixed height; no truncate / no ellipsis. */
const homeCategoryLabelBox = cn(
  "flex h-7 w-full shrink-0 flex-col items-center justify-center gap-px text-center",
  "text-[10px] font-medium leading-[1.08] text-foreground/90",
  "[overflow-wrap:anywhere] break-words",
);

/** Fixed edge overlay — subtle glass fade; arrow stays put while categories scroll beneath. */
function homeCategoriesArrowLink() {
  return cn(
    "absolute end-0 top-0 z-20 flex h-full min-h-[4.25rem] w-10 items-center justify-center",
    "bg-transparent text-foreground/85 touch-manipulation",
    "transition-[color,transform] duration-150",
    "hover:text-foreground active:scale-95",
    "[&_svg]:relative [&_svg]:z-[1]",
  );
}

function homeCategoriesArrowFade(isRtl: boolean) {
  return cn(
    "pointer-events-none absolute inset-y-0 inset-x-0",
    isRtl
      ? "bg-gradient-to-r from-black/[0.10] via-black/[0.04] to-transparent"
      : "bg-gradient-to-l from-black/[0.10] via-black/[0.04] to-transparent",
    "backdrop-blur-[3px] backdrop-saturate-150",
    "[-webkit-backdrop-filter:blur(3px)_saturate(1.5)]",
  );
}

function homeCategoriesStripInner() {
  return cn(
    "flex w-max max-w-none items-start gap-1 pb-0.5 md:gap-1.5",
  );
}

function HomeCategoryLabel({ label }: { label: string }) {
  const lines = splitHomeCategoryLabel(label);
  if (lines.length === 1) {
    return (
      <span className={homeCategoryLabelBox}>
        <span className="block w-full">{lines[0]}</span>
      </span>
    );
  }
  return (
    <span className={homeCategoryLabelBox}>
      <span className="block w-full">{lines[0]}</span>
      <span className="block w-full">{lines[1]}</span>
    </span>
  );
}

type HomeCategoriesStripProps = {
  isRtl: boolean;
  locale: Locale;
  isLoadingCategories: boolean;
  categories: Category[] | undefined;
};

const HomeCategoriesStrip = memo(function HomeCategoriesStrip({
  isRtl,
  locale,
  isLoadingCategories,
  categories,
}: HomeCategoriesStripProps) {
  /** Stable index keys + one Link shell — avoids skeleton→loaded DOM teardown (root flicker cause). */
  const categoryTiles = useMemo(() => {
    if (Array.isArray(categories)) {
      return categories.map((cat, index) => ({
        slotKey: `home-cat-${index}`,
        href: `/category/${cat.id}`,
        icon: cat.icon,
        label: getCreateAdTaxonomyLabel(locale, cat.name),
        isPlaceholder: false,
      }));
    }
    if (categories === undefined && isLoadingCategories) {
      return CATEGORY_SKELETON_KEYS.map((i) => ({
        slotKey: `home-cat-${i}`,
        href: null,
        icon: undefined,
        label: null,
        isPlaceholder: true,
      }));
    }
    return [];
  }, [categories, isLoadingCategories, locale]);

  return (
    <div
      className="min-w-0 pt-2.5 transition-none -mx-4 md:-mx-6 lg:-mx-8"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="relative min-w-0 w-full transition-none">
        <HorizontalScrollStrip className="min-w-0 w-full">
          <div className={cn(homeCategoriesStripInner(), "pe-10 transition-none")}>
            {categoryTiles.map((tile) => (
              <Link
                key={tile.slotKey}
                href={tile.href ?? "#"}
                aria-hidden={tile.isPlaceholder ? true : undefined}
                aria-busy={tile.isPlaceholder ? true : undefined}
                tabIndex={tile.isPlaceholder ? -1 : undefined}
                onClick={
                  tile.isPlaceholder
                    ? (event) => {
                        event.preventDefault();
                      }
                    : undefined
                }
                className={cn(
                  homeCategoryTileShell,
                  tile.isPlaceholder && "pointer-events-none",
                )}
              >
                <div className="flex w-full flex-col items-center gap-1">
                  <HomeCategoryIconBox iconName={tile.icon} />
                  {tile.label ? (
                    <HomeCategoryLabel label={tile.label} />
                  ) : (
                    <span className={homeCategoryLabelBox}>
                      <span className="block w-full opacity-0" aria-hidden>
                        &nbsp;
                      </span>
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </HorizontalScrollStrip>
        <Link
          href="/categories"
          aria-label={t("home.view_all")}
          className={homeCategoriesArrowLink()}
        >
          <span aria-hidden className={homeCategoriesArrowFade(isRtl)} />
          <ChevronDown
            className="h-[18px] w-[18px] shrink-0 stroke-[2.75]"
            aria-hidden
          />
        </Link>
      </div>
    </div>
  );
});

/** Header divider — static line; minimal lime accent. */
const HomeStickyHeaderDivider = memo(function HomeStickyHeaderDivider({
  isRtl,
}: {
  isRtl: boolean;
}) {
  return (
    <div role="separator" aria-hidden className="relative pb-1.5 pt-1 max-md:pb-1">
      <div className="relative flex items-center gap-2 md:gap-2.5">
        <div
          className={cn(
            "h-px min-w-0 flex-1",
            isRtl
              ? "bg-gradient-to-l from-transparent via-primary/16 to-primary/8"
              : "bg-gradient-to-r from-transparent via-primary/16 to-primary/8",
          )}
        />
        <div
          className="h-1 w-1 shrink-0 rounded-full bg-primary/40 ring-1 ring-primary/15"
          aria-hidden
        />
        <div
          className={cn(
            "h-px min-w-0 flex-1",
            isRtl
              ? "bg-gradient-to-r from-transparent via-primary/16 to-primary/8"
              : "bg-gradient-to-l from-transparent via-primary/16 to-primary/8",
          )}
        />
      </div>
    </div>
  );
});

type HomeFeedHeaderProps = {
  isRtl: boolean;
  locale: Locale;
  reserveBellSlot: boolean;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  isLoadingCategories: boolean;
  categories: Category[] | undefined;
};

const HomeFeedHeader = memo(function HomeFeedHeader({
  isRtl,
  locale,
  reserveBellSlot,
  searchQuery,
  onSearchQueryChange,
  onSearchSubmit,
  isLoadingCategories,
  categories,
  headerRef,
}: HomeFeedHeaderProps & { headerRef?: React.RefObject<HTMLElement | null> }) {
  return (
    <header
      ref={headerRef}
      className="fixed inset-x-0 top-0 z-40 bg-[#0A0A0A]"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className={HOME_PAGE_INSET}>
        <div className="flex items-center gap-2 pt-3 pb-0 -mx-2 md:-mx-3 lg:-mx-4">
          <MarketplaceSearchBar
            isRtl={isRtl}
            value={searchQuery}
            onChange={onSearchQueryChange}
            onSubmit={onSearchSubmit}
            className="border-primary/28 bg-[#0A0A0A] ring-primary/8 focus-within:border-primary/38 focus-within:ring-primary/12"
          />
          {reserveBellSlot ? (
            <NotificationBell className="h-8 w-8 shrink-0 [&_svg]:h-4 [&_svg]:w-4" />
          ) : null}
        </div>
        <HomeCategoriesStrip
          isRtl={isRtl}
          locale={locale}
          isLoadingCategories={isLoadingCategories}
          categories={categories}
        />
        <HomeStickyHeaderDivider isRtl={isRtl} />
      </div>
    </header>
  );
});

type HomeFeedSectionsProps = {
  isRtl: boolean;
  isLoadingFeatured: boolean;
  featuredAds: Ad[] | undefined;
  isLoadingRecommended: boolean;
  recommendedAds: Ad[] | undefined;
};

/**
 * أقسام المحتوى تحت الهيدر — معزولة بـ memo حتى لا تعاد رسم الكروت الثقيلة
 * عند كل حرف في حقل البحث (حالة البحث تبقى في الأب فقط).
 */
const HomeFeedSections = memo(function HomeFeedSections({
  isRtl,
  isLoadingFeatured,
  featuredAds,
  isLoadingRecommended,
  recommendedAds,
}: HomeFeedSectionsProps) {
  return (
    <>
      {/* Featured Ads */}
      <section className="min-w-0 pb-1 pt-0.5 max-md:pb-0.5 md:py-4">
        <div className={cn(HOME_PAGE_INSET, "mb-1.5 md:mb-2")}>
          <h2 className={homeSectionHeading}>{t("home.featured_ads")}</h2>
        </div>
        <div className={HOME_PAGE_INSET}>
          <HorizontalScrollStrip dir={isRtl ? "rtl" : "ltr"}>
            <div className={featuredStripClassName} dir={isRtl ? "rtl" : "ltr"}>
              {isLoadingFeatured ? (
                FEATURED_SKELETON_KEYS.map((i) => (
                  <AdCardSkeleton key={i} featured homeFeed />
                ))
              ) : Array.isArray(featuredAds) && featuredAds.length ? (
                featuredAds.map((ad, index) => (
                  <AdCard
                    key={ad.id}
                    ad={ad}
                    featured
                    homeFeed
                    featuredLead={index === 0}
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

      <HomeFeaturedDivider isRtl={isRtl} placement="featured-bottom" />

      {/* Recommended Ads Grid */}
      <section className={cn(HOME_PAGE_INSET, "pb-3 pt-1 max-md:pb-3 max-md:pt-0.5 md:py-4")}>
        <h2 className={cn(homeSectionHeading, "mb-1.5 md:mb-2")}>{t("home.recommended")}</h2>

        <div className={recommendedGridClassName}>
          {isLoadingRecommended ? (
            GRID_SKELETON_KEYS.map((i) => (
              <div key={i} className="h-full min-h-0">
                <AdCardSkeleton homeFeed />
              </div>
            ))
          ) : Array.isArray(recommendedAds) && recommendedAds.length ? (
            recommendedAds.map((ad) => (
              <div key={ad.id} className="h-full min-h-0">
                <AdCard ad={ad} homeFeed />
              </div>
            ))
          ) : (
            <div className="col-span-full text-sm text-muted-foreground text-center py-8">
              {t("home.no_ads")}
            </div>
          )}
        </div>
      </section>
    </>
  );
});

export default function Home() {
  const { locale } = useLocale();
  const isRtl = locale === "ar";
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { city } = useSelectedCity();
  const { location: searchLocation } = useSearchLocation();
  const feedCity = useMemo(
    () => searchLocationCityForFeed(city, searchLocation),
    [city, searchLocation],
  );
  const { user, isLoading: authLoading } = useAuth();
  const reserveBellSlot = Boolean(user && !authLoading);
  const { data: categories, isLoading: isLoadingCategories, isFetched: categoriesFetched } =
    useListCategories({
      query: {
        queryKey: getListCategoriesQueryKey(),
        staleTime: HOME_STALE_CATEGORIES_MS,
      },
    });
  const homeCategories = useMemo(
    () => filterHomeCategories(categories),
    [categories],
  );

  /** P7-PR-4: fetch featured in parallel with categories — do not wait for categoriesFetched (LCP waterfall). */
  const { data: featuredAds, isLoading: isLoadingFeatured } =
    useListFeaturedAds({
      query: {
        queryKey: getListFeaturedAdsQueryKey(),
        staleTime: HOME_STALE_FEATURED_MS,
      },
    });

  const [recommendedQueryEnabled, setRecommendedQueryEnabled] = useState(false);
  useEffect(() => {
    if (!categoriesFetched) return;
    return scheduleAfterFirstPaint(() => setRecommendedQueryEnabled(true), 400);
  }, [categoriesFetched]);

  const recommendedFeedEnabled = recommendedQueryEnabled;

  const { data: defaultRecommended, isLoading: isLoadingDefaultRec, isFetched: defaultRecFetched } =
    useListRecommendedAds({
      query: {
        queryKey: getListRecommendedAdsQueryKey(),
        enabled: recommendedFeedEnabled,
        staleTime: HOME_STALE_FEED_MS,
      },
    });
  const { data: cityAds, isLoading: isLoadingCityAds, isFetched: cityAdsFetched } = useListAds(
    { city: feedCity, limit: 20 },
    {
      query: {
        queryKey: getListAdsQueryKey({ city: feedCity, limit: 20 }),
        enabled: recommendedFeedEnabled && !!feedCity,
        staleTime: HOME_STALE_FEED_MS,
      },
    },
  );

  const recommendedAdsRaw = useMemo(() => {
    if (feedCity) {
      if (Array.isArray(cityAds) && cityAds.length > 0) return cityAds;
      if (cityAdsFetched) return defaultRecommended ?? [];
    }
    return defaultRecommended;
  }, [feedCity, cityAds, cityAdsFetched, defaultRecommended]);

  const featuredAdsForHome = useMemo(
    () => filterHomeFeedAds(featuredAds),
    [featuredAds],
  );
  const recommendedAds = useMemo(
    () => filterHomeFeedAds(recommendedAdsRaw),
    [recommendedAdsRaw],
  );

  const isLoadingFeaturedUi = isLoadingFeatured;
  const isLoadingRecommended =
    !recommendedFeedEnabled ||
    (feedCity
      ? !cityAdsFetched && !defaultRecFetched
      : isLoadingDefaultRec);

  const onSearchQueryChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) {
        const cityParam = feedCity ? `&city=${encodeURIComponent(feedCity)}` : "";
        setLocation(`/search?q=${encodeURIComponent(searchQuery)}${cityParam}`);
      }
    },
    [searchQuery, feedCity, setLocation],
  );

  const headerRef = useRef<HTMLElement>(null);
  const [headerOffsetPx, setHeaderOffsetPx] = useState(106);

  useEffect(() => {
    const el = headerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const sync = () => setHeaderOffsetPx(el.getBoundingClientRect().height);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isLoadingCategories, reserveBellSlot]);

  return (
    <main
      className="flex min-h-0 w-full flex-col bg-[#0A0A0A]"
      style={{ paddingTop: headerOffsetPx }}
    >
      <HomeFeedHeader
        headerRef={headerRef}
        isRtl={isRtl}
        locale={locale}
        reserveBellSlot={reserveBellSlot}
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        onSearchSubmit={handleSearch}
        isLoadingCategories={isLoadingCategories}
        categories={homeCategories}
      />

      <HomeFeedSections
        isRtl={isRtl}
        isLoadingFeatured={isLoadingFeaturedUi}
        featuredAds={featuredAdsForHome}
        isLoadingRecommended={isLoadingRecommended}
        recommendedAds={recommendedAds}
      />
    </main>
  );
}

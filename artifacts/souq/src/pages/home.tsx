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
import { ChevronLeft } from "lucide-react";
import { AdCard, AdCardSkeleton } from "@/components/ad-card";
import { CategoryIcon } from "@/components/category-icon";
import { MarketplaceSearchBar } from "@/components/marketplace-search-bar";
import { NotificationBell } from "@/components/notification-bell";
import { HorizontalScrollStrip } from "@/components/horizontal-scroll-strip";
import { HomeFeaturedDivider } from "@/components/home-featured-divider";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
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
import { cn } from "@/lib/utils";

/** توحيد كروت الإعلانات مع ad-detail / user-profile (طبقة أب فقط) */
/** على الموبايل ظل أخف قليلًا لتقليل تكلفة التركيب أثناء التمرير؛ md+ يبقى كما كان. */
const homeAdCardTone =
  "[&>div]:h-full [&_article]:flex [&_article]:h-full [&_article]:flex-col [&_article]:rounded-2xl [&_article]:border-primary/35 [&_article]:bg-card/80 [&_article]:shadow-[0_0_20px_-12px_hsl(var(--primary)/0.16)] max-md:[&_article]:shadow-[0_0_12px_-14px_hsl(var(--primary)/0.09)] [&_article]:ring-1 [&_article]:ring-primary/10 [&_article]:dark:bg-zinc-950/70 [&_article]:transition-[transform,border-color,box-shadow] [&_article]:duration-200 [&_article]:ease-out [&_article]:hover:border-primary/45 [&_article]:hover:shadow-[0_0_22px_-12px_hsl(var(--primary)/0.2)] [&_article]:active:scale-[0.985] [&_article>div:first-child]:rounded-t-2xl [&_article_button]:rounded-full [&_article_button]:border [&_article_button]:border-primary/45 [&_article_button]:bg-black/55 [&_article_button]:transition-transform [&_article_button]:active:scale-95";

/** React Query: تقليل إعادة الجلب عند التنقل للرئيسية دون المساس بـ invalidate بعد الطفرات/الأدمن. */
const HOME_STALE_CATEGORIES_MS = 10 * 60 * 1000;
const HOME_STALE_FEATURED_MS = 2 * 60 * 1000;
const HOME_STALE_FEED_MS = 90 * 1000;

const CATEGORY_SKELETON_KEYS = [0, 1, 2, 3, 4] as const;
const FEATURED_SKELETON_KEYS = [0, 1, 2, 3] as const;
const GRID_SKELETON_KEYS = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
] as const;

/** No mx-auto — centering made the first featured card look mid-screen in RTL scroll. */
const featuredStripClassName = cn(
  "flex w-max max-w-none items-stretch justify-start gap-3 px-4 pb-0.5 md:gap-3.5 md:pb-1 md:px-6 lg:px-8",
  homeAdCardTone,
);

const recommendedGridClassName = cn(
  "grid grid-cols-2 items-stretch gap-x-2 gap-y-2 md:grid-cols-3 md:gap-x-2.5 md:gap-y-2.5 xl:grid-cols-4 xl:gap-x-3 xl:gap-y-2.5 2xl:grid-cols-5 2xl:gap-x-3.5 2xl:gap-y-3",
  homeAdCardTone,
);

/** Section titles only — inline mini-chip; same type size/margins as before. */
const homeSectionHeading = cn(
  "inline-flex max-w-full items-center rounded-2xl border border-primary/30 bg-zinc-950/55 px-2 py-px",
  "text-base font-semibold leading-tight tracking-tight text-foreground md:text-lg",
  "shadow-[0_0_14px_-14px_hsl(var(--primary)/0.14)] ring-1 ring-primary/10",
);

/** Category name under icon — single-line pill; fixed row height, width fits up to max. */
const homeCategoryLabelPill = cn(
  "inline-flex h-4 max-h-4 w-fit min-w-0 max-w-[6.75rem] items-center justify-center rounded-full",
  "border border-primary/20 bg-zinc-950/50 px-1.5",
  "text-xs font-medium leading-none text-foreground/90 truncate whitespace-nowrap",
  "shadow-[0_0_10px_-12px_hsl(var(--primary)/0.1)] ring-1 ring-primary/5",
);

type HomeFeedHeaderProps = {
  isRtl: boolean;
  reserveBellSlot: boolean;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
};

const HomeFeedHeader = memo(function HomeFeedHeader({
  isRtl,
  reserveBellSlot,
  searchQuery,
  onSearchQueryChange,
  onSearchSubmit,
}: HomeFeedHeaderProps) {
  return (
    <header
      className="sticky top-0 z-40 border-b border-primary/20 bg-[#0A0A0A]/95 shadow-[0_1px_14px_-6px_rgba(0,0,0,0.4)]"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="mx-auto flex w-full max-w-screen-xl items-center gap-2 overflow-x-hidden px-3 py-2.5 md:px-6 md:py-3 lg:px-8">
        <MarketplaceSearchBar
          isRtl={isRtl}
          value={searchQuery}
          onChange={onSearchQueryChange}
          onSubmit={onSearchSubmit}
        />
        {reserveBellSlot ? (
          <div className="shrink-0">
            <NotificationBell />
          </div>
        ) : null}
      </div>
    </header>
  );
});

type HomeFeedSectionsProps = {
  isRtl: boolean;
  locale: Locale;
  isLoadingCategories: boolean;
  categories: Category[] | undefined;
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
  locale,
  isLoadingCategories,
  categories,
  isLoadingFeatured,
  featuredAds,
  isLoadingRecommended,
  recommendedAds,
}: HomeFeedSectionsProps) {
  return (
    <>
      {/* Categories Horizontal Scroll */}
      <section className="pt-3 pb-1 max-md:pb-0.5 md:py-4">
        <div className="mx-auto mb-2 flex w-full max-w-screen-xl items-center justify-between px-4 max-md:mb-2 md:mb-3 md:px-6 lg:px-8">
          <h2 className={homeSectionHeading}>{t("home.categories")}</h2>
          <Link
            href="/categories"
            className="text-primary text-sm font-medium flex items-center"
          >
            {t("home.view_all")} <ChevronLeft className="w-4 h-4" />
          </Link>
        </div>
        <HorizontalScrollStrip dir={isRtl ? "rtl" : "ltr"}>
          <div className="mx-auto flex w-max max-w-none gap-4 px-4 pb-1 max-md:pb-0.5 md:pb-2 md:px-6 lg:px-8">
            {isLoadingCategories
              ? CATEGORY_SKELETON_KEYS.map((i) => (
                  <div key={i} className="flex shrink-0 flex-col items-center gap-2">
                    <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
                    <div className="h-4 w-12 max-w-[6.75rem] rounded-full bg-muted/60 animate-pulse" />
                  </div>
                ))
              : Array.isArray(categories) &&
                categories.map((cat) => (
                  <Link key={cat.id} href={`/category/${cat.id}`} className="shrink-0">
                    <div className="flex flex-col items-center gap-2 group cursor-pointer">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/35 bg-zinc-950/75 text-primary shadow-[0_0_14px_-10px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10 transition-transform group-active:scale-95">
                        <CategoryIcon name={cat.icon} className="w-7 h-7" />
                      </div>
                      <span className={homeCategoryLabelPill}>
                        {getCreateAdTaxonomyLabel(locale, cat.name)}
                      </span>
                    </div>
                  </Link>
                ))}
          </div>
        </HorizontalScrollStrip>
      </section>

      <HomeFeaturedDivider isRtl={isRtl} placement="featured-top" />

      {/* Featured Ads */}
      <section className="min-w-0 bg-zinc-950/40 pb-1.5 pt-1 max-md:pb-1 max-md:pt-0.5 md:py-5">
        <div className="mx-auto mb-2 w-full max-w-screen-xl px-4 md:mb-3 md:px-6 lg:px-8">
          <h2 className={homeSectionHeading}>{t("home.featured_ads")}</h2>
        </div>
        <HorizontalScrollStrip dir={isRtl ? "rtl" : "ltr"}>
          <div className={featuredStripClassName} dir={isRtl ? "rtl" : "ltr"}>
            {isLoadingFeatured ? (
              FEATURED_SKELETON_KEYS.map((i) => (
                <AdCardSkeleton key={i} featured />
              ))
            ) : Array.isArray(featuredAds) && featuredAds.length ? (
              featuredAds.map((ad, index) => (
                <AdCard
                  key={ad.id}
                  ad={ad}
                  featured
                  featuredLead={index === 0}
                />
              ))
            ) : (
              <div className="w-full py-6 text-center text-sm text-muted-foreground">
                {t("home.no_featured_ads")}
              </div>
            )}
          </div>
        </HorizontalScrollStrip>
      </section>

      <HomeFeaturedDivider isRtl={isRtl} placement="featured-bottom" />

      {/* Recommended Ads Grid */}
      <section className="mx-auto w-full max-w-screen-xl px-4 pb-4 pt-1.5 max-md:pb-3.5 max-md:pt-1 md:px-6 md:py-5 lg:px-8">
        <h2 className={cn(homeSectionHeading, "mb-2 md:mb-3")}>{t("home.recommended")}</h2>

        <div className={recommendedGridClassName}>
          {isLoadingRecommended ? (
            GRID_SKELETON_KEYS.map((i) => (
              <div key={i} className="h-full min-h-0">
                <AdCardSkeleton />
              </div>
            ))
          ) : Array.isArray(recommendedAds) && recommendedAds.length ? (
            recommendedAds.map((ad) => (
              <div key={ad.id} className="h-full min-h-0">
                <AdCard ad={ad} />
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

  const [featuredQueryEnabled, setFeaturedQueryEnabled] = useState(false);
  useEffect(() => {
    if (!categoriesFetched) return;
    const frameId = requestAnimationFrame(() => setFeaturedQueryEnabled(true));
    return () => cancelAnimationFrame(frameId);
  }, [categoriesFetched]);

  const { data: featuredAds, isLoading: isLoadingFeatured } =
    useListFeaturedAds({
      query: {
        queryKey: getListFeaturedAdsQueryKey(),
        enabled: featuredQueryEnabled,
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

  const isLoadingFeaturedUi = !featuredQueryEnabled || isLoadingFeatured;
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

  return (
    <main className="flex min-h-0 w-full flex-col bg-[#0A0A0A]">
      <HomeFeedHeader
        isRtl={isRtl}
        reserveBellSlot={reserveBellSlot}
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        onSearchSubmit={handleSearch}
      />

      <HomeFeedSections
        isRtl={isRtl}
        locale={locale}
        isLoadingCategories={isLoadingCategories}
        categories={categories}
        isLoadingFeatured={isLoadingFeaturedUi}
        featuredAds={featuredAdsForHome}
        isLoadingRecommended={isLoadingRecommended}
        recommendedAds={recommendedAds}
      />
    </main>
  );
}

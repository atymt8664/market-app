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
import { Search, ChevronLeft, X } from "lucide-react";
import { AdCard, AdCardSkeleton } from "@/components/ad-card";
import { CategoryIcon } from "@/components/category-icon";
import { LocationPicker } from "@/components/location-picker";
import { NotificationBell } from "@/components/notification-bell";
import { Input } from "@/components/ui/input";
import { HorizontalScrollStrip } from "@/components/horizontal-scroll-strip";
import { HomeFeaturedDivider } from "@/components/home-featured-divider";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { scheduleAfterFirstPaint } from "@/lib/after-first-paint";
import { useSelectedCity } from "@/hooks/use-selected-city";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useAuth } from "@/hooks/use-auth";
import { t } from "@/i18n";
import type { Locale } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import { getCreateAdTaxonomyLabel } from "@/lib/create-ad-taxonomy-labels";
import { cn } from "@/lib/utils";

/** توحيد كروت الإعلانات مع ad-detail / user-profile (طبقة أب فقط) */
/** على الموبايل ظل أخف قليلًا لتقليل تكلفة التركيب أثناء التمرير؛ md+ يبقى كما كان. */
const homeAdCardTone =
  "[&_article]:rounded-2xl [&_article]:border-primary/35 [&_article]:bg-card/80 [&_article]:shadow-[0_0_20px_-12px_hsl(var(--primary)/0.16)] max-md:[&_article]:shadow-[0_0_12px_-14px_hsl(var(--primary)/0.09)] [&_article]:ring-1 [&_article]:ring-primary/10 [&_article]:dark:bg-zinc-950/70 [&_article]:hover:border-primary/40 [&_article>div:first-child]:rounded-t-2xl [&_article_button]:rounded-full [&_article_button]:border [&_article_button]:border-primary/45 [&_article_button]:bg-black/55";

/** React Query: تقليل إعادة الجلب عند التنقل للرئيسية دون المساس بـ invalidate بعد الطفرات/الأدمن. */
const HOME_STALE_CATEGORIES_MS = 10 * 60 * 1000;
const HOME_STALE_FEATURED_MS = 2 * 60 * 1000;
const HOME_STALE_FEED_MS = 90 * 1000;

const CATEGORY_SKELETON_KEYS = [0, 1, 2, 3, 4] as const;
const FEATURED_SKELETON_KEYS = [0, 1, 2, 3] as const;
const GRID_SKELETON_KEYS = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
] as const;

const locationPickerTriggerClassName = cn(
  "h-8 max-w-[9.25rem] justify-center gap-1 rounded-2xl border border-solid border-primary/40 bg-zinc-950/90 px-2 py-0 text-[11px] leading-none",
  "shadow-[0_0_14px_-10px_hsl(var(--primary)/0.38)] ring-1 ring-primary/14",
  "sm:max-w-[10.5rem]",
);

const featuredStripClassName = cn(
  "mx-auto flex w-max max-w-none gap-3 px-4 pb-0 md:gap-3.5 md:pb-1 md:px-6 lg:px-8",
  homeAdCardTone,
);

const recommendedGridClassName = cn(
  "grid grid-cols-2 items-start gap-2.5 md:grid-cols-3 md:gap-3 xl:grid-cols-4 xl:gap-3.5 2xl:grid-cols-5 2xl:gap-4",
  homeAdCardTone,
);

type HomeFeedHeaderProps = {
  isRtl: boolean;
  reserveBellSlot: boolean;
  locationHintDismissed: boolean;
  onDismissLocationHint: () => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  brandMain: string;
  brandFull: string;
  brandHasEuSuffix: boolean;
};

const HomeFeedHeader = memo(function HomeFeedHeader({
  isRtl,
  reserveBellSlot,
  locationHintDismissed,
  onDismissLocationHint,
  searchQuery,
  onSearchQueryChange,
  onSearchSubmit,
  brandMain,
  brandFull,
  brandHasEuSuffix,
}: HomeFeedHeaderProps) {
  return (
    <header
      className="sticky top-0 z-40 border-b border-primary/20 bg-[#0A0A0A]/95 shadow-[0_1px_14px_-6px_rgba(0,0,0,0.4)]"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-2 overflow-x-hidden px-3 py-2 md:gap-2 md:px-6 md:py-2.5 lg:px-8">
        <div className="flex min-h-9 w-full min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h1
              dir={isRtl ? "rtl" : "ltr"}
              className="min-w-0 flex-1 truncate text-lg font-bold leading-snug tracking-tight text-foreground sm:text-xl"
            >
              {brandHasEuSuffix ? (
                <>
                  <span className="text-foreground">{brandMain}</span>{" "}
                  <span className="font-bold text-primary">EU</span>
                </>
              ) : (
                brandFull
              )}
            </h1>
            <div className="shrink-0 flex items-center gap-1.5">
              <LocationPicker triggerClassName={locationPickerTriggerClassName} />
              {reserveBellSlot ? <NotificationBell /> : null}
            </div>
          </div>
        </div>

        {!locationHintDismissed ? (
          <div className="flex items-start gap-1.5 rounded-2xl border border-primary/28 bg-zinc-950/75 px-2.5 py-2 text-[11px] leading-snug text-zinc-400 ring-1 ring-primary/10 transition-colors">
            <span className="min-w-0 flex-1">
              {t("home.location_hint_prefix")}{" "}
              <span className="font-medium text-foreground/85">{t("home.location_picker")}</span>{" "}
              {t("home.location_hint_suffix")}
            </span>
            <button
              type="button"
              onClick={onDismissLocationHint}
              className="shrink-0 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              aria-label={t("home.hide_hint")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}

        <div
          className="flex items-center rounded-2xl border border-primary/30 bg-zinc-950/75 px-2.5 py-1.5 ring-1 ring-primary/10 transition-colors focus-within:border-primary/45 focus-within:ring-primary/15"
          role="search"
        >
          <form
            onSubmit={onSearchSubmit}
            className="relative flex min-h-0 w-full min-w-0 items-center"
          >
            <label className="sr-only">{t("home.search_label")}</label>
            <Search
              className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground opacity-90"
              aria-hidden
            />
            <Input
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              placeholder={t("home.search_placeholder")}
              className="h-7 w-full border-0 bg-transparent py-0 pr-8 pl-0.5 text-[13px] leading-tight text-foreground shadow-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
            />
          </form>
        </div>
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
          <h2 className="text-base font-semibold tracking-tight text-foreground md:text-lg">{t("home.categories")}</h2>
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
                    <div className="w-12 h-3 bg-muted animate-pulse rounded" />
                  </div>
                ))
              : Array.isArray(categories) &&
                categories.map((cat) => (
                  <Link key={cat.id} href={`/category/${cat.id}`} className="shrink-0">
                    <div className="flex flex-col items-center gap-2 group cursor-pointer">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/35 bg-zinc-950/75 text-primary shadow-[0_0_14px_-10px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10 transition-transform group-active:scale-95">
                        <CategoryIcon name={cat.icon} className="w-7 h-7" />
                      </div>
                      <span className="text-xs font-medium text-center w-16 truncate">
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
      <section className="bg-zinc-950/40 pb-1.5 pt-1 max-md:pb-1 max-md:pt-0.5 md:py-5">
        <div className="mx-auto mb-2 w-full max-w-screen-xl px-4 md:mb-3.5 md:px-6 lg:px-8">
          <h2 className="text-base font-semibold tracking-tight text-foreground md:text-lg">{t("home.featured_ads")}</h2>
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
      <section className="mx-auto w-full max-w-screen-xl px-4 pb-5 pt-1 max-md:pt-0 md:px-6 md:py-6 lg:px-8">
        <h2 className="mb-2 text-base font-semibold tracking-tight text-foreground md:mb-4 md:text-lg">{t("home.recommended")}</h2>

        <div className={recommendedGridClassName}>
          {isLoadingRecommended ? (
            GRID_SKELETON_KEYS.map((i) => (
              <AdCardSkeleton key={i} />
            ))
          ) : Array.isArray(recommendedAds) && recommendedAds.length ? (
            recommendedAds.map((ad) => <AdCard key={ad.id} ad={ad} />)
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
  const { user, isLoading: authLoading } = useAuth();
  const reserveBellSlot = Boolean(user && !authLoading);
  const [locationHintDismissed, setLocationHintDismissed] = useLocalStorage(
    "location_filter_hint_dismissed",
    false,
  );

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

  const { data: featuredAds, isLoading: isLoadingFeatured, isFetched: featuredFetched } =
    useListFeaturedAds({
      query: {
        queryKey: getListFeaturedAdsQueryKey(),
        enabled: featuredQueryEnabled,
        staleTime: HOME_STALE_FEATURED_MS,
      },
    });

  const [recommendedQueryEnabled, setRecommendedQueryEnabled] = useState(false);
  useEffect(() => {
    if (!featuredQueryEnabled) return;
    return scheduleAfterFirstPaint(() => setRecommendedQueryEnabled(true), 600);
  }, [featuredQueryEnabled]);

  const recommendedFeedEnabled = recommendedQueryEnabled && featuredFetched;

  const { data: defaultRecommended, isLoading: isLoadingDefaultRec } =
    useListRecommendedAds({
      query: {
        queryKey: getListRecommendedAdsQueryKey(),
        enabled: recommendedFeedEnabled && !city,
        staleTime: HOME_STALE_FEED_MS,
      },
    });
  const { data: cityAds, isLoading: isLoadingCityAds } = useListAds(
    { city, limit: 20 },
    {
      query: {
        queryKey: getListAdsQueryKey({ city, limit: 20 }),
        enabled: recommendedFeedEnabled && !!city,
        staleTime: HOME_STALE_FEED_MS,
      },
    },
  );
  const recommendedAds = city ? cityAds : defaultRecommended;
  const isLoadingFeaturedUi = !featuredQueryEnabled || isLoadingFeatured;
  const isLoadingRecommended =
    !recommendedFeedEnabled || (city ? isLoadingCityAds : isLoadingDefaultRec);

  const brandParts = useMemo(() => {
    const brandFull = t("app.brand");
    const brandEuMatch = brandFull.match(/^(.*)\sEU$/);
    const brandMain = brandEuMatch?.[1]?.trimEnd() ?? brandFull;
    const brandHasEuSuffix = Boolean(brandEuMatch);
    return { brandFull, brandMain, brandHasEuSuffix };
  }, [locale]);

  const onDismissLocationHint = useCallback(() => {
    setLocationHintDismissed(true);
  }, []);

  const onSearchQueryChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) {
        const cityParam = city ? `&city=${encodeURIComponent(city)}` : "";
        setLocation(`/search?q=${encodeURIComponent(searchQuery)}${cityParam}`);
      }
    },
    [searchQuery, city, setLocation],
  );

  return (
    <main className="flex min-h-0 w-full flex-col bg-[#0A0A0A]">
      <HomeFeedHeader
        isRtl={isRtl}
        reserveBellSlot={reserveBellSlot}
        locationHintDismissed={locationHintDismissed}
        onDismissLocationHint={onDismissLocationHint}
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        onSearchSubmit={handleSearch}
        brandMain={brandParts.brandMain}
        brandFull={brandParts.brandFull}
        brandHasEuSuffix={brandParts.brandHasEuSuffix}
      />

      <HomeFeedSections
        isRtl={isRtl}
        locale={locale}
        isLoadingCategories={isLoadingCategories}
        categories={categories}
        isLoadingFeatured={isLoadingFeaturedUi}
        featuredAds={featuredAds}
        isLoadingRecommended={isLoadingRecommended}
        recommendedAds={recommendedAds}
      />
    </main>
  );
}

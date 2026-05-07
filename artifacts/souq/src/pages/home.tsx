import {
  useListCategories,
  useListFeaturedAds,
  useListRecommendedAds,
  useListAds,
  getListAdsQueryKey,
  getListRecommendedAdsQueryKey,
} from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Search, ChevronLeft, X } from "lucide-react";
import { AdCard, AdCardSkeleton } from "@/components/ad-card";
import { CategoryIcon } from "@/components/category-icon";
import { LocationPicker } from "@/components/location-picker";
import { NotificationBell } from "@/components/notification-bell";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useState } from "react";
import { useSelectedCity } from "@/hooks/use-selected-city";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useAuth } from "@/hooks/use-auth";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import { getCreateAdTaxonomyLabel } from "@/lib/create-ad-taxonomy-labels";
import { cn } from "@/lib/utils";

/** توحيد كروت الإعلانات مع ad-detail / user-profile (طبقة أب فقط) */
const homeAdCardTone =
  "[&_article]:rounded-2xl [&_article]:border-primary/35 [&_article]:bg-card/80 [&_article]:shadow-[0_0_20px_-12px_hsl(var(--primary)/0.16)] [&_article]:ring-1 [&_article]:ring-primary/10 [&_article]:dark:bg-zinc-950/70 [&_article]:hover:border-primary/40 [&_article>div:first-child]:rounded-t-2xl [&_article_button]:rounded-full [&_article_button]:border [&_article_button]:border-primary/45 [&_article_button]:bg-black/55";

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

  const { data: categories, isLoading: isLoadingCategories } =
    useListCategories();
  const { data: featuredAds, isLoading: isLoadingFeatured } =
    useListFeaturedAds();
  const { data: defaultRecommended, isLoading: isLoadingDefaultRec } =
    useListRecommendedAds({
      query: {
        queryKey: getListRecommendedAdsQueryKey(),
        enabled: !city,
      },
    });
  const { data: cityAds, isLoading: isLoadingCityAds } = useListAds(
    { city, limit: 20 },
    {
      query: {
        queryKey: getListAdsQueryKey({ city, limit: 20 }),
        enabled: !!city,
      },
    },
  );
  const recommendedAds = city ? cityAds : defaultRecommended;
  const isLoadingRecommended = city ? isLoadingCityAds : isLoadingDefaultRec;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const cityParam = city ? `&city=${encodeURIComponent(city)}` : "";
      setLocation(`/search?q=${encodeURIComponent(searchQuery)}${cityParam}`);
    }
  };

  const brandFull = t("app.brand");
  const brandEuMatch = brandFull.match(/^(.*)\sEU$/);
  const brandMain = brandEuMatch?.[1]?.trimEnd() ?? brandFull;
  const brandHasEuSuffix = Boolean(brandEuMatch);

  return (
    <div className="flex min-h-0 w-full flex-col bg-[#0A0A0A]">
      {/* App header: brand + location filter + search */}
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
                <LocationPicker
                  triggerClassName={cn(
                    "h-8 max-w-[9.25rem] justify-center gap-1 rounded-2xl border border-solid border-primary/40 bg-zinc-950/90 px-2 py-0 text-[11px] leading-none",
                    "shadow-[0_0_14px_-10px_hsl(var(--primary)/0.38)] ring-1 ring-primary/14",
                    "sm:max-w-[10.5rem]",
                  )}
                />
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
                onClick={() => setLocationHintDismissed(true)}
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
              onSubmit={handleSearch}
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
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
          </div>
        </div>
      </header>

      {/* Categories Horizontal Scroll */}
      <section className="py-4">
        <div className="mx-auto mb-3 flex w-full max-w-screen-xl items-center justify-between px-4 md:px-6 lg:px-8">
          <h2 className="text-base font-semibold tracking-tight text-foreground md:text-lg">{t("home.categories")}</h2>
          <Link
            href="/categories"
            className="text-primary text-sm font-medium flex items-center"
          >
            {t("home.view_all")} <ChevronLeft className="w-4 h-4" />
          </Link>
        </div>
        <ScrollArea className="w-full whitespace-nowrap" dir={isRtl ? "rtl" : "ltr"}>
          <div className="mx-auto w-full max-w-screen-xl flex gap-4 px-4 md:px-6 lg:px-8 pb-2">
            {isLoadingCategories
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
                    <div className="w-12 h-3 bg-muted animate-pulse rounded" />
                  </div>
                ))
              : Array.isArray(categories) &&
                categories.map((cat) => (
                  <Link key={cat.id} href={`/category/${cat.id}`}>
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
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>
      </section>

      {/* Featured Ads */}
      <section className="border-b border-primary/15 bg-zinc-950/40 py-4 md:py-5">
        <div className="mx-auto mb-3 w-full max-w-screen-xl px-4 md:mb-3.5 md:px-6 lg:px-8">
          <h2 className="text-base font-semibold tracking-tight text-foreground md:text-lg">{t("home.featured_ads")}</h2>
        </div>
        <ScrollArea className="w-full whitespace-nowrap" dir={isRtl ? "rtl" : "ltr"}>
          <div
            className={cn(
              "mx-auto flex w-full max-w-screen-xl gap-3 px-4 pb-1 md:gap-3.5 md:px-6 lg:px-8",
              homeAdCardTone,
            )}
          >
            {isLoadingFeatured ? (
              Array.from({ length: 4 }).map((_, i) => (
                <AdCardSkeleton key={i} featured />
              ))
            ) : Array.isArray(featuredAds) && featuredAds.length ? (
              featuredAds.map((ad) => <AdCard key={ad.id} ad={ad} featured />)
            ) : (
              <div className="w-full py-6 text-center text-sm text-muted-foreground">
                {t("home.no_featured_ads")}
              </div>
            )}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>
      </section>

      {/* Recommended Ads Grid */}
      <section className="mx-auto w-full max-w-screen-xl px-4 py-5 md:px-6 md:py-6 lg:px-8">
        <h2 className="mb-3 text-base font-semibold tracking-tight text-foreground md:mb-4 md:text-lg">{t("home.recommended")}</h2>

        <div
          className={cn(
            "grid grid-cols-2 items-start gap-2.5 md:grid-cols-3 md:gap-3 xl:grid-cols-4 xl:gap-3.5 2xl:grid-cols-5 2xl:gap-4",
            homeAdCardTone,
          )}
        >
          {isLoadingRecommended ? (
            Array.from({ length: 10 }).map((_, i) => (
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
    </div>
  );
}

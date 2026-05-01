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
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useState } from "react";
import { motion } from "framer-motion";
import { useSelectedCity } from "@/hooks/use-selected-city";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import { getCreateAdTaxonomyLabel } from "@/lib/create-ad-taxonomy-labels";

export default function Home() {
  const { locale } = useLocale();
  const isRtl = locale === "ar";
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { city } = useSelectedCity();
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col w-full min-h-screen bg-background"
    >
      {/* App header: brand + location filter + search */}
      <header
        className="sticky top-0 z-40 border-b border-border/80 bg-background/95 shadow-sm backdrop-blur-md"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-2.5 px-4 py-3 md:gap-3 md:px-6 md:py-3.5 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <h1 className="min-w-0 flex-1 text-lg font-bold leading-none tracking-tight text-foreground">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span>{t("app.brand")}</span>
                <span className="inline-flex shrink-0 items-center rounded-md bg-primary/15 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-primary">
                  EU
                </span>
              </span>
            </h1>
            <div className="flex shrink-0 items-center ps-1">
              <LocationPicker />
            </div>
          </div>

          {!locationHintDismissed ? (
            <div className="flex items-start gap-2 rounded-xl border border-dashed border-primary/25 bg-primary/5 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground transition-colors">
              <span className="min-w-0 flex-1">
                {t("home.location_hint_prefix")}{" "}
                <span className="font-medium text-foreground/85">{t("home.location_picker")}</span>{" "}
                {t("home.location_hint_suffix")}
              </span>
              <button
                type="button"
                onClick={() => setLocationHintDismissed(true)}
                className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                aria-label={t("home.hide_hint")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          <div
            className="flex items-center gap-2 rounded-xl border border-dashed border-primary/25 bg-primary/5 px-3 py-2.5 transition-colors focus-within:border-primary/35 focus-within:bg-primary/[0.08]"
            role="search"
          >
            <form
              onSubmit={handleSearch}
              className="relative flex min-h-0 w-full min-w-0 items-center"
            >
              <label className="sr-only">{t("home.search_label")}</label>
              <Search
                className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                enterKeyHint="search"
                autoComplete="off"
                placeholder={t("home.search_placeholder")}
                className="h-8 w-full border-0 bg-transparent pr-9 pl-1 text-sm leading-tight text-foreground shadow-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
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
                      <div className="w-16 h-16 rounded-2xl bg-primary/15 text-primary flex items-center justify-center group-active:scale-95 transition-transform border border-primary/20">
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
      <section className="border-b border-border/40 bg-muted/25 py-4 md:py-5">
        <div className="mx-auto mb-3 w-full max-w-screen-xl px-4 md:mb-3.5 md:px-6 lg:px-8">
          <h2 className="text-base font-semibold tracking-tight text-foreground md:text-lg">{t("home.featured_ads")}</h2>
        </div>
        <ScrollArea className="w-full whitespace-nowrap" dir={isRtl ? "rtl" : "ltr"}>
          <div className="mx-auto flex w-full max-w-screen-xl gap-3 px-4 pb-1 md:gap-3.5 md:px-6 lg:px-8">
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

        <div className="grid grid-cols-2 items-start gap-2.5 md:grid-cols-3 md:gap-3 xl:grid-cols-4 xl:gap-3.5 2xl:grid-cols-5 2xl:gap-4">
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
    </motion.div>
  );
}

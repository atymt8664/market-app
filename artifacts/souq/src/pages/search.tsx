import { keepPreviousData } from "@tanstack/react-query";
import { useListAds, getListAdsQueryKey } from "@workspace/api-client-react";
import { STALE_AD_LIST_MS } from "@/lib/query-stale-times";
import { Link, useSearch } from "wouter";
import { ArrowRight, Filter, Inbox } from "lucide-react";
import { AdCard, AdCardSkeleton } from "@/components/ad-card";
import { MarketplaceSearchBar } from "@/components/marketplace-search-bar";
import { useSelectedCity } from "@/hooks/use-selected-city";
import { useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { motion } from "framer-motion";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";
import {
  SETTINGS_BACK_BUTTON,
  SETTINGS_HEADER_BAR,
  SETTINGS_HEADER_INNER,
  SETTINGS_IMMERSIVE_BOTTOM,
  SETTINGS_PAGE_BG,
  SETTINGS_CARD_SHELL,
} from "@/components/settings-shell";

const listingGridCardTone =
  "[&_article]:rounded-2xl [&_article]:border-primary/35 [&_article]:bg-card/80 [&_article]:shadow-[0_0_20px_-12px_hsl(var(--primary)/0.16)] [&_article]:ring-1 [&_article]:ring-primary/10 [&_article]:dark:bg-zinc-950/70 [&_article]:hover:border-primary/40 [&_article>div:first-child]:rounded-t-2xl [&_article_button]:rounded-full [&_article_button]:border [&_article_button]:border-primary/45 [&_article_button]:bg-black/55";

export default function Search() {
  const { locale } = useLocale();
  const isRtl = locale === "ar";
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);

  const initialQ = searchParams.get("q") || "";
  const categoryId = searchParams.get("categoryId")
    ? Number(searchParams.get("categoryId"))
    : undefined;
  const subcategoryId = searchParams.get("subcategoryId")
    ? Number(searchParams.get("subcategoryId"))
    : undefined;

  const [query, setQuery] = useState(initialQ);
  const debouncedQuery = useDebounce(query, 500);
  const { city } = useSelectedCity();
  const cityFromUrl = searchParams.get("city")?.trim() || undefined;
  const filterCity = cityFromUrl || city || undefined;

  const { data: ads, isPending, isFetching } = useListAds(
    { q: debouncedQuery || undefined, categoryId, subcategoryId, city: filterCity },
    {
      query: {
        queryKey: getListAdsQueryKey({
          q: debouncedQuery || undefined,
          categoryId,
          subcategoryId,
          city: filterCity,
        }),
        staleTime: STALE_AD_LIST_MS,
        placeholderData: keepPreviousData,
      },
    },
  );
  const showAdsSkeleton = isPending && !ads;
  const adsLoadingLabel = isFetching && !showAdsSkeleton;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className={cn(SETTINGS_PAGE_BG, SETTINGS_IMMERSIVE_BOTTOM, "flex flex-col")}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <header className={cn(SETTINGS_HEADER_BAR, "border-b border-primary/15")}>
        <div className={cn(SETTINGS_HEADER_INNER, "flex-col gap-3 py-3 md:flex-row md:items-center md:py-3")}>
          <div className="flex w-full items-center gap-3">
            <Link href="/">
              <button
                type="button"
                className={SETTINGS_BACK_BUTTON}
                aria-label={t("common.back")}
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            </Link>
            <MarketplaceSearchBar
              isRtl={isRtl}
              value={query}
              onChange={setQuery}
              onSubmit={handleSearchSubmit}
              placeholder={t("search.placeholder")}
              searchLabel={t("search.placeholder")}
              autoFocus
              className="min-w-0 flex-1"
            />
            <button
              type="button"
              className={cn(
                "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                "border border-primary/50 bg-black/55 text-primary shadow-[0_0_10px_-4px_hsl(var(--primary)/0.2)]",
                "transition-colors hover:border-primary/75 active:opacity-90",
              )}
              aria-label={t("search.filters_aria")}
            >
              <Filter className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[900px] flex-1 flex-col px-4 py-4 md:max-w-[760px] md:px-6 md:py-5 lg:max-w-[860px]">
        <p
          className={cn(
            "mb-3 text-sm font-medium text-zinc-500 md:mb-4",
            isRtl ? "text-right" : "text-left",
          )}
        >
          {adsLoadingLabel
            ? t("search.loading")
            : t("search.results_count", { count: ads?.length || 0 })}
        </p>

        <div
          className={cn(
            "grid grid-cols-1 items-start gap-2.5 sm:grid-cols-2 md:gap-3 lg:grid-cols-3 xl:grid-cols-4 xl:gap-3.5",
            listingGridCardTone,
          )}
        >
          {showAdsSkeleton ? (
            Array.from({ length: 8 }).map((_, i) => (
              <AdCardSkeleton key={i} />
            ))
          ) : ads?.length ? (
            ads.map((ad) => <AdCard key={ad.id} ad={ad} />)
          ) : (
            <div
              className={cn(
                SETTINGS_CARD_SHELL,
                "col-span-full flex flex-col items-center gap-3 px-5 py-12 text-center sm:col-span-2 lg:col-span-3 xl:col-span-4",
              )}
            >
              <div
                className={cn(
                  "flex h-16 w-16 items-center justify-center rounded-2xl",
                  "border border-primary/35 bg-zinc-950/75 text-primary",
                  "shadow-[0_0_20px_-12px_hsl(var(--primary)/0.25)] ring-1 ring-primary/12",
                )}
              >
                <Inbox className="h-8 w-8" aria-hidden />
              </div>
              <h2 className="text-base font-semibold text-foreground">{t("search.empty_title")}</h2>
              <p className="max-w-sm text-sm text-zinc-500">{t("search.empty_desc")}</p>
            </div>
          )}
        </div>
      </main>
    </motion.div>
  );
}

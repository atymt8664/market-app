import { useCallback, useMemo } from "react";
import {
  useListAds,
  useListSubcategories,
  useListCategories,
  getListAdsQueryKey,
  getListCategoriesQueryKey,
  getListSubcategoriesQueryKey,
} from "@workspace/api-client-react";
import { Link, useLocation, useParams, useSearch } from "wouter";
import { ArrowRight, LayoutGrid } from "lucide-react";
import { AdCard, AdCardSkeleton } from "@/components/ad-card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import { usePageSeo } from "@/hooks/use-page-seo";
import { getDefaultSiteDescription } from "@/lib/seo-foundation";
import { getCreateAdTaxonomyLabel } from "@/lib/create-ad-taxonomy-labels";
import { CategoryIcon } from "@/components/category-icon";
import { cn } from "@/lib/utils";
import {
  STALE_AD_LIST_MS,
  STALE_CATEGORIES_MS,
} from "@/lib/query-stale-times";
import {
  SETTINGS_BACK_BUTTON,
  SETTINGS_HEADER_ACTION_ICON,
  SETTINGS_HEADER_BAR,
  SETTINGS_HEADER_INNER,
  SETTINGS_HEADER_TRAILING,
  SETTINGS_IMMERSIVE_BOTTOM,
  SETTINGS_PAGE_BG,
  SETTINGS_PAGE_TITLE,
  SETTINGS_PAGE_TITLE_BADGE,
  SETTINGS_CARD_SHELL,
} from "@/components/settings-shell";

/** Same ad grid tone as `home.tsx` recommended section */
const listingGridCardTone =
  "[&_article]:rounded-2xl [&_article]:border-primary/35 [&_article]:bg-[#0A0A0A]/80 [&_article]:shadow-[0_0_20px_-12px_hsl(var(--primary)/0.16)] [&_article]:ring-1 [&_article]:ring-primary/10 [&_article]:bg-[#0A0A0A]/70 [&_article]:hover:border-primary/40 [&_article>div:first-child]:rounded-t-2xl [&_article_button]:rounded-full [&_article_button]:border [&_article_button]:border-primary/45 [&_article_button]:bg-black/55";

const categoryListingGridClassName =
  "grid grid-cols-2 items-start gap-x-2 gap-y-2 min-[520px]:grid-cols-3 min-[520px]:gap-x-2.5 min-[520px]:gap-y-2.5 md:grid-cols-3 md:gap-x-2.5 md:gap-y-2.5 xl:grid-cols-4 xl:gap-x-3 xl:gap-y-2.5";

const subChipClass =
  "inline-flex shrink-0 items-center rounded-full border border-primary/40 bg-[#0A0A0A]/75 px-4 py-2 text-[13px] font-medium text-foreground shadow-[0_0_14px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10 transition-[border-color,box-shadow,transform] duration-200 hover:border-primary/55 hover:shadow-[0_0_22px_-12px_hsl(var(--primary)/0.24)] active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100";

function SubChipSkeleton() {
  return (
    <div className="h-10 w-[5.5rem] shrink-0 animate-pulse rounded-full border border-primary/20 bg-[#0A0A0A]/85 ring-1 ring-primary/8" />
  );
}

function parseSubcategoryId(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export default function Category() {
  const { locale } = useLocale();
  const isRtl = locale === "ar";
  const params = useParams();
  const categoryId = Number(params.id);
  const searchString = useSearch();
  const [, navigate] = useLocation();
  const activeSubcategoryId = useMemo(
    () => parseSubcategoryId(new URLSearchParams(searchString).get("subcategoryId")),
    [searchString],
  );

  const selectSubcategory = useCallback(
    (subcategoryId: number | undefined) => {
      const base = `/category/${categoryId}`;
      navigate(
        subcategoryId ? `${base}?subcategoryId=${subcategoryId}` : base,
        { replace: true },
      );
    },
    [categoryId, navigate],
  );

  const { data: categories } = useListCategories({
    query: {
      queryKey: getListCategoriesQueryKey(),
      staleTime: STALE_CATEGORIES_MS,
    },
  });
  const { data: subcategories, isLoading: isLoadingSubs } = useListSubcategories(
    categoryId,
    {
      query: {
        queryKey: getListSubcategoriesQueryKey(categoryId),
        staleTime: STALE_CATEGORIES_MS,
      },
    },
  );
  const adsQueryParams = useMemo(
    () =>
      activeSubcategoryId
        ? { categoryId, subcategoryId: activeSubcategoryId }
        : { categoryId },
    [categoryId, activeSubcategoryId],
  );
  const { data: ads, isLoading: isLoadingAds } = useListAds(adsQueryParams, {
    query: {
      enabled: !!categoryId,
      queryKey: getListAdsQueryKey(adsQueryParams),
      staleTime: STALE_AD_LIST_MS,
    },
  });
  const selectedCategory = categories?.find((cat) => cat.id === categoryId);
  const title = selectedCategory
    ? getCreateAdTaxonomyLabel(locale, selectedCategory.name)
    : t("category.title_fallback");

  const pageSeo = useMemo(() => {
    if (!categoryId) return null;
    const seoTitle = selectedCategory
      ? `${getCreateAdTaxonomyLabel(locale, selectedCategory.name)} | Souq Arab EU`
      : t("p11.seo.category_title_generic");
    return {
      title: seoTitle,
      description: getDefaultSiteDescription(locale),
      canonicalPath: activeSubcategoryId
        ? `/category/${categoryId}?subcategoryId=${activeSubcategoryId}`
        : `/category/${categoryId}`,
    };
  }, [categoryId, selectedCategory, locale, activeSubcategoryId]);
  usePageSeo(pageSeo);

  const hasArabicText = (value?: string | null) =>
    !!value && /[\u0600-\u06FF]/.test(value);

  const headerSubtitle = selectedCategory?.subtitle
    ? (() => {
        const mapped = getCreateAdTaxonomyLabel(locale, selectedCategory.subtitle);
        if (locale !== "ar" && hasArabicText(mapped)) return t("category.subtitle");
        return mapped;
      })()
    : null;

  const activeSubLabel = activeSubcategoryId
    ? subcategories?.find((sub) => sub.id === activeSubcategoryId)?.name
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className={cn(SETTINGS_PAGE_BG, SETTINGS_IMMERSIVE_BOTTOM, "flex flex-col")}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <header className={SETTINGS_HEADER_BAR}>
        <div className={SETTINGS_HEADER_INNER}>
          <h1
            className={cn(
              SETTINGS_PAGE_TITLE,
              "flex items-center gap-2",
              isRtl ? "flex-row-reverse justify-end" : "flex-row",
            )}
          >
            {selectedCategory ? (
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  "border border-primary/35 bg-[#0A0A0A]/75 text-primary",
                  "shadow-[0_0_14px_-10px_hsl(var(--primary)/0.2)] ring-1 ring-primary/10",
                )}
              >
                <CategoryIcon name={selectedCategory.icon} className="h-5 w-5" />
              </div>
            ) : null}
            <span className={SETTINGS_PAGE_TITLE_BADGE}>{title}</span>
          </h1>
          <div className={SETTINGS_HEADER_TRAILING}>
            <Link href="/categories">
              <button
                type="button"
                className={SETTINGS_BACK_BUTTON}
                aria-label={t("common.back")}
              >
                <ArrowRight className={SETTINGS_HEADER_ACTION_ICON} />
              </button>
            </Link>
          </div>
        </div>
      </header>

      <div className="border-b border-primary/12 bg-[#0A0A0A]/45">
        <div className="mx-auto w-full max-w-[900px] px-4 py-3 md:max-w-[760px] md:px-6 md:py-3.5 lg:max-w-[860px]">
          {headerSubtitle ? (
            <p
              className={cn(
                "mb-3 text-sm leading-relaxed text-zinc-500",
                isRtl ? "text-right" : "text-left",
              )}
            >
              {headerSubtitle}
            </p>
          ) : null}
          <div
            data-category-panel-shell="1"
            className={cn(
              SETTINGS_CARD_SHELL,
              "p-2.5 shadow-[0_0_20px_-14px_hsl(var(--primary)/0.15)] md:p-3",
            )}
          >
            <ScrollArea className="w-full whitespace-nowrap" dir={isRtl ? "rtl" : "ltr"}>
              <div className="flex gap-2 pb-0.5 pt-0.5">
                {isLoadingSubs ? (
                  <>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <SubChipSkeleton key={i} />
                    ))}
                  </>
                ) : subcategories?.length ? (
                  <>
                    <button
                      type="button"
                      data-category-sub-chip="1"
                      data-selected={activeSubcategoryId ? undefined : "true"}
                      className={cn(subChipClass, "cursor-pointer")}
                      onClick={() => selectSubcategory(undefined)}
                    >
                      {t("notifications.tabs.all")}
                    </button>
                    {subcategories.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        data-category-sub-chip="1"
                        data-selected={
                          activeSubcategoryId === sub.id ? "true" : undefined
                        }
                        className={cn(subChipClass, "cursor-pointer")}
                        onClick={() => selectSubcategory(sub.id)}
                      >
                        {getCreateAdTaxonomyLabel(locale, sub.name)}
                      </button>
                    ))}
                  </>
                ) : (
                  <span className="px-2 py-1.5 text-sm text-zinc-500">
                    {t("category.no_subcategories")}
                  </span>
                )}
              </div>
              <ScrollBar orientation="horizontal" className="hidden" />
            </ScrollArea>
          </div>
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-[900px] flex-1 flex-col px-4 py-4 md:max-w-[760px] md:px-6 md:py-5 lg:max-w-[860px]">
        <h2
          className={cn(
            "mb-3 text-base font-semibold tracking-tight text-foreground md:mb-4 md:text-lg",
            isRtl ? "text-right" : "text-left",
          )}
        >
          {activeSubLabel
            ? getCreateAdTaxonomyLabel(locale, activeSubLabel)
            : t("home.recommended")}
        </h2>

        <div
          className={cn(categoryListingGridClassName, listingGridCardTone)}
        >
          {isLoadingAds ? (
            Array.from({ length: 8 }).map((_, i) => (
              <AdCardSkeleton key={i} />
            ))
          ) : ads?.length ? (
            ads.map((ad) => (
              <AdCard key={ad.id} ad={ad} categoryListing />
            ))
          ) : (
            <div
              className={cn(
                SETTINGS_CARD_SHELL,
                "col-span-full flex flex-col items-center gap-3 px-5 py-12 text-center",
              )}
            >
              <div
                className={cn(
                  "flex h-16 w-16 items-center justify-center rounded-2xl",
                  "border border-primary/35 bg-[#0A0A0A]/75 text-primary",
                  "shadow-[0_0_20px_-12px_hsl(var(--primary)/0.25)] ring-1 ring-primary/12",
                )}
              >
                <LayoutGrid className="h-8 w-8" aria-hidden />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                {t("category.empty_title")}
              </h3>
              <p className="max-w-sm text-sm text-zinc-500">{t("category.empty_desc")}</p>
            </div>
          )}
        </div>
      </main>
    </motion.div>
  );
}

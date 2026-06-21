import {
  getListCategoriesQueryKey,
  useListCategories,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { ChevronLeft, ArrowRight, LayoutGrid } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { motion } from "framer-motion";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import { getCreateAdTaxonomyLabel } from "@/lib/create-ad-taxonomy-labels";
import { cn } from "@/lib/utils";
import { STALE_CATEGORIES_MS } from "@/lib/query-stale-times";
import { Button } from "@/components/ui/button";
import {
  SETTINGS_BACK_BUTTON,
  SETTINGS_CARD_SHELL,
  SETTINGS_HEADER_ACTION_ICON,
  SETTINGS_HEADER_BAR,
  SETTINGS_HEADER_INNER,
  SETTINGS_HEADER_TRAILING,
  SETTINGS_IMMERSIVE_BOTTOM,
  SETTINGS_PAGE_BG,
  SETTINGS_PAGE_TITLE,
  SETTINGS_PAGE_TITLE_BADGE,
} from "@/components/settings-shell";

function CategoryCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-primary/25 bg-[#0A0A0A]/60 p-2.5 shadow-[0_0_14px_-14px_hsl(var(--primary)/0.12)] ring-1 ring-primary/8 md:rounded-2xl md:p-4",
        className,
      )}
    >
      <div className="flex items-center gap-2 md:gap-3">
        <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-[#0A0A0A]/90 ring-1 ring-primary/15 md:h-14 md:w-14 md:rounded-2xl" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-3.5 w-[72%] max-w-[12rem] animate-pulse rounded-md bg-zinc-800/90 md:h-4" />
          <div className="h-2.5 w-[88%] max-w-[14rem] animate-pulse rounded-md bg-zinc-800/70 md:h-3" />
        </div>
        <div className="h-4 w-4 shrink-0 animate-pulse rounded bg-zinc-800/80 md:h-5 md:w-5" />
      </div>
    </div>
  );
}

export default function Categories() {
  const { locale } = useLocale();
  const isRtl = locale === "ar";
  const {
    data: categories,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useListCategories({
    query: {
      queryKey: getListCategoriesQueryKey(),
      staleTime: STALE_CATEGORIES_MS,
    },
  });

  const hasArabicText = (value?: string | null) =>
    !!value && /[\u0600-\u06FF]/.test(value);

  const subtitleFor = (cat: { subtitle?: string | null }) => {
    if (!cat.subtitle) return t("category.subtitle");
    const mapped = getCreateAdTaxonomyLabel(locale, cat.subtitle);
    if (locale !== "ar" && hasArabicText(mapped)) {
      return t("category.subtitle");
    }
    return mapped;
  };

  const list = Array.isArray(categories) ? categories : [];

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
          <h1 className={SETTINGS_PAGE_TITLE}>
            <span className={SETTINGS_PAGE_TITLE_BADGE}>{t("categories.title")}</span>
          </h1>
          <div className={SETTINGS_HEADER_TRAILING}>
            <Link href="/">
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

      <main className="mx-auto flex w-full max-w-[900px] flex-1 flex-col px-3 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] md:max-w-[760px] md:px-6 md:py-5 lg:max-w-[860px]">
        <p
          className={cn(
            "mb-2 text-xs leading-snug text-zinc-500 md:mb-5 md:text-sm md:leading-relaxed",
            isRtl ? "text-right" : "text-left",
          )}
        >
          {t("categories.page_hint")}
        </p>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-3.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <CategoryCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <div
            className={cn(
              SETTINGS_CARD_SHELL,
              "flex flex-col items-center gap-4 px-5 py-10 text-center",
            )}
          >
            <p className="text-sm font-medium text-foreground">
              {t("categories.error_title")}
            </p>
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-primary/45 bg-[#0A0A0A]/80 text-primary hover:bg-black/90"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              {t("categories.retry")}
            </Button>
          </div>
        ) : list.length === 0 ? (
          <div
            className={cn(
              SETTINGS_CARD_SHELL,
              "flex flex-col items-center gap-3 px-5 py-12 text-center",
            )}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/35 bg-[#0A0A0A]/75 text-primary shadow-[0_0_20px_-12px_hsl(var(--primary)/0.25)] ring-1 ring-primary/12">
              <LayoutGrid className="h-8 w-8" aria-hidden />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              {t("categories.empty_title")}
            </h2>
            <p className="max-w-sm text-sm text-zinc-500">
              {t("categories.empty_desc")}
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-1 rounded-full border-primary/45 text-primary"
              onClick={() => void refetch()}
            >
              {t("categories.retry")}
            </Button>
          </div>
        ) : (
          <ul
            className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-3.5"
            role="list"
          >
            {list.map((cat) => (
              <li key={cat.id} className="min-w-0">
                <Link href={`/category/${cat.id}`}>
                  <div
                    className={cn(
                      SETTINGS_CARD_SHELL,
                      "group cursor-pointer rounded-xl p-0 transition-[border-color,box-shadow,transform] duration-200 md:rounded-2xl",
                      "hover:border-primary/55 hover:shadow-[0_0_28px_-12px_hsl(var(--primary)/0.28)]",
                      "active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100",
                    )}
                  >
                    <div className="flex items-center gap-2 p-2.5 md:gap-3 md:p-4">
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                          "border border-primary/35 bg-[#0A0A0A]/75 text-primary",
                          "shadow-[0_0_12px_-10px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10",
                          "transition-transform group-hover:shadow-[0_0_16px_-10px_hsl(var(--primary)/0.26)]",
                          "group-active:scale-95 motion-reduce:group-active:scale-100",
                          "md:h-14 md:w-14 md:rounded-2xl",
                        )}
                      >
                        <CategoryIcon name={cat.icon} className="h-5 w-5 md:h-7 md:w-7" />
                      </div>
                      <div
                        className={cn(
                          "min-w-0 flex-1",
                          isRtl ? "text-right" : "text-left",
                        )}
                      >
                        <h2 className="text-[13px] font-semibold leading-tight text-foreground md:text-[15px] md:leading-snug lg:text-base">
                          {getCreateAdTaxonomyLabel(locale, cat.name)}
                        </h2>
                        <p className="mt-0 line-clamp-1 text-[11px] leading-snug text-zinc-500 md:mt-0.5 md:line-clamp-2 md:text-xs md:leading-relaxed lg:text-[13px]">
                          {subtitleFor(cat)}
                        </p>
                        <p className="mt-0.5 text-[10px] font-medium tabular-nums text-primary/85 md:mt-1.5 md:text-[11px]">
                          {t("categories.listings_count", { count: cat.adCount ?? 0 })}
                        </p>
                      </div>
                      <ChevronLeft
                        className={cn(
                          "h-4 w-4 shrink-0 text-primary/70 transition-transform group-hover:text-primary md:h-5 md:w-5",
                          isRtl
                            ? "rotate-180 group-hover:-translate-x-0.5"
                            : "group-hover:translate-x-0.5",
                        )}
                        aria-hidden
                      />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </motion.div>
  );
}

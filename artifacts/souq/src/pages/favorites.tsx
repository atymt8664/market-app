import { useListFavoriteAds } from "@workspace/api-client-react";
import { favoritesListQueryKey } from "@/lib/invalidate-ad-queries";
import { Link } from "wouter";
import { Heart, Search } from "lucide-react";
import {
  FavoriteListItem,
  FavoriteListItemSkeleton,
} from "@/components/favorite-list-item";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { STALE_USER_ADS_MS } from "@/lib/query-stale-times";

const emptyCardShell =
  "rounded-2xl border border-primary/40 bg-zinc-950/75 p-6 shadow-[0_0_22px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10 md:p-8";

/** نفس mini-card عنوان «إنشاء إعلان» — dark/lime خفيف */
const favoritesSectionHeading = cn(
  "inline-flex max-w-full w-fit items-center rounded-2xl border border-primary/35 bg-card/80 px-2 py-px",
  "text-sm font-semibold leading-tight tracking-tight text-foreground md:text-base",
  "shadow-[0_0_14px_-12px_hsl(var(--primary)/0.16)] ring-1 ring-primary/10 dark:bg-zinc-950/70",
);
const favoritesPageTitleHeading = cn(
  favoritesSectionHeading,
  "px-2.5 py-0.5 text-lg font-bold md:px-3 md:py-1 md:text-xl",
);

/** دائرة القلب — h-11 مثل أزرار الرجوع + هوية dark/lime لكرت العنوان */
const favoritesHeaderHeartCircle = cn(
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
  "border border-primary/40 bg-zinc-950/75",
  "shadow-[0_0_22px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10",
  "text-primary transition-[border-color,box-shadow] duration-200",
);

/** مساحة نهاية القائمة — إظهار شريط إحصائيات آخر كرت فوق Bottom Nav الثابت */
const favoritesScrollEndSpacer =
  "min-h-[calc(3.25rem+env(safe-area-inset-bottom,0px))] md:min-h-[calc(3.5rem+env(safe-area-inset-bottom,0px))]";

export default function Favorites() {
  const { user, isLoading: authLoading } = useAuth();

  const { data, isLoading } = useListFavoriteAds({
    query: {
      queryKey: favoritesListQueryKey(),
      enabled: !!user,
      retry: false,
      staleTime: STALE_USER_ADS_MS,
    },
  });

  if (!authLoading && !user) return <Redirect to="/guest-welcome?redirect=/favorites" />;

  const favoriteAds = Array.isArray(data) ? data : [];

  return (
    <div className="flex min-h-[100svh] w-full flex-col bg-[#0A0A0A]">
      <header
        className="sticky top-0 z-40 border-b border-primary/20 bg-[#0A0A0A]/95 px-3 py-3 shadow-[0_1px_14px_-6px_rgba(0,0,0,0.4)] md:backdrop-blur md:px-4 md:py-3.5"
        dir="rtl"
      >
        <h1 className="flex items-center gap-2 text-lg font-bold text-foreground md:text-xl">
          <span className="min-w-0 flex-1 text-right">
            <span className={favoritesPageTitleHeading}>{t("favorites.title")}</span>
          </span>
          <span className={favoritesHeaderHeartCircle} aria-hidden>
            <Heart
              className="h-5 w-5 fill-primary text-primary md:h-6 md:w-6"
              strokeWidth={2.25}
            />
          </span>
        </h1>
      </header>

      <div className="flex-1 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-2 md:px-4 md:pb-[calc(1rem+env(safe-area-inset-bottom,0px))] md:pt-3">
        {isLoading ? (
          <ul className="mx-auto flex w-full max-w-lg flex-col gap-2 sm:max-w-xl md:max-w-2xl md:gap-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <FavoriteListItemSkeleton key={i} />
            ))}
          </ul>
        ) : favoriteAds.length > 0 ? (
          <ul className="mx-auto flex w-full max-w-lg flex-col gap-2 sm:max-w-xl md:max-w-2xl md:gap-2.5">
            {favoriteAds.map((ad) => (
              <FavoriteListItem key={ad.id} ad={ad} />
            ))}
            <li aria-hidden className={cn(favoritesScrollEndSpacer, "list-none")} />
          </ul>
        ) : (
          <div className="flex justify-center py-6 md:py-8">
            <div
              className={cn(
                emptyCardShell,
                "flex w-full max-w-sm flex-col items-center text-center sm:max-w-md",
              )}
              dir="rtl"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-primary/35 bg-zinc-950/90 shadow-[0_0_18px_-8px_hsl(var(--primary)/0.22)] ring-1 ring-primary/12 md:h-[4.5rem] md:w-[4.5rem]">
                <Heart
                  className="h-8 w-8 fill-primary/25 text-primary md:h-9 md:w-9"
                  strokeWidth={2}
                  aria-hidden
                />
              </div>
              <h3 className="mb-1.5 text-lg font-bold text-foreground md:text-xl">
                {t("favorites.empty_title")}
              </h3>
              <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
                {t("favorites.empty_desc")}
              </p>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/40 bg-zinc-950/90 px-4 py-2.5 text-sm font-semibold text-primary shadow-[0_0_14px_-6px_hsl(var(--primary)/0.22)] ring-1 ring-primary/10 transition-colors hover:border-primary/55 hover:bg-zinc-900/95"
              >
                <Search className="h-4 w-4 shrink-0" strokeWidth={2.25} />
                {t("favorites.browse_ads")}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

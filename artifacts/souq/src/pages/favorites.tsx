import {
  useListFavoriteAds,
  getListFavoriteAdsQueryKey,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { Heart, Search } from "lucide-react";
import { AdCard, AdCardSkeleton } from "@/components/ad-card";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

const favoritesGridTone =
  "[&_article]:rounded-2xl [&_article]:border-primary/35 [&_article]:bg-card/80 [&_article]:shadow-[0_0_20px_-12px_hsl(var(--primary)/0.16)] [&_article]:ring-1 [&_article]:ring-primary/10 [&_article]:dark:bg-zinc-950/70 [&_article]:hover:border-primary/40";

const emptyCardShell =
  "rounded-2xl border border-primary/40 bg-card/80 p-8 shadow-[0_0_28px_-12px_hsl(var(--primary)/0.2)] ring-1 ring-primary/15 dark:bg-zinc-950/70 md:p-10";

export default function Favorites() {
  const { user, isLoading: authLoading } = useAuth();

  const { data, isLoading } = useListFavoriteAds({
    query: {
      queryKey: getListFavoriteAdsQueryKey(),
      enabled: !!user,
      retry: false,
    },
  });

  if (!authLoading && !user) return <Redirect to="/guest-welcome?redirect=/favorites" />;

  const favoriteAds = Array.isArray(data) ? data : [];

  return (
    <div className="flex min-h-0 w-full flex-col bg-[#0A0A0A]">
      <header
        className="sticky top-0 z-40 border-b border-primary/20 bg-[#0A0A0A]/95 px-4 py-3.5 shadow-[0_1px_14px_-6px_rgba(0,0,0,0.4)]"
        dir="rtl"
      >
        <h1 className="flex items-center gap-2.5 text-xl font-bold text-foreground">
          <span className="min-w-0 flex-1 text-right">{t("favorites.title")}</span>
          <Heart
            className="h-6 w-6 shrink-0 fill-primary text-primary"
            strokeWidth={2}
            aria-hidden
          />
        </h1>
      </header>

      <div className="flex-1 p-4">
        <div
          className={cn(
            "grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4",
            favoriteAds.length > 0 && !isLoading ? favoritesGridTone : "",
          )}
        >
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <AdCardSkeleton key={i} />)
          ) : favoriteAds.length > 0 ? (
            favoriteAds.map((ad) => (
              <AdCard key={ad.id} ad={ad} favoritesList />
            ))
          ) : (
            <div className="col-span-full flex justify-center py-6">
              <div
                className={cn(
                  emptyCardShell,
                  "flex w-full max-w-md flex-col items-center text-center",
                )}
              >
                <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-primary/35 bg-zinc-950/90 shadow-[0_0_18px_-8px_hsl(var(--primary)/0.22)] ring-1 ring-primary/12">
                  <Heart
                    className="h-9 w-9 fill-primary/25 text-primary"
                    strokeWidth={2}
                    aria-hidden
                  />
                </div>
                <h3 className="mb-2 text-xl font-bold text-foreground">
                  {t("favorites.empty_title")}
                </h3>
                <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                  {t("favorites.empty_desc")}
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-primary/45 bg-zinc-950/90 px-5 py-2.5 text-sm font-semibold text-primary shadow-[0_0_14px_-6px_hsl(var(--primary)/0.22)] ring-1 ring-primary/10 transition-colors hover:border-primary/60 hover:bg-zinc-900/95"
                >
                  <Search className="h-4 w-4 shrink-0" strokeWidth={2.25} />
                  {t("favorites.browse_ads")}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

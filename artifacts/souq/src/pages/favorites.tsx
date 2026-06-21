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
import {
  BOTTOM_NAV_PAGE_SHELL_CLASS,
  BOTTOM_NAV_SCROLL_END_SPACER_CLASS,
} from "@/lib/bottom-nav-layout";
import { AppShellContentScroll } from "@/components/app-shell-content-scroll";

const emptyCardShell =
  "rounded-2xl border border-primary/40 bg-[#0A0A0A]/75 p-6 shadow-[0_0_22px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10 md:p-8";

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
    <div className={BOTTOM_NAV_PAGE_SHELL_CLASS}>
      <AppShellContentScroll>
      <div className="flex-1 px-3 pt-2 md:px-4 md:pt-3">
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
          </ul>
        ) : (
          <div className="flex justify-center pt-0 pb-6 md:pt-1 md:pb-8">
            <div
              className={cn(
                emptyCardShell,
                "flex w-full max-w-sm flex-col items-center text-center sm:max-w-md",
              )}
              dir="rtl"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-primary/35 bg-[#0A0A0A]/90 shadow-[0_0_18px_-8px_hsl(var(--primary)/0.22)] ring-1 ring-primary/12 md:h-[4.5rem] md:w-[4.5rem]">
                <Heart
                  className="h-8 w-8 text-primary md:h-9 md:w-9"
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
                className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/40 bg-[#0A0A0A]/90 px-4 py-2.5 text-sm font-semibold text-primary shadow-[0_0_14px_-6px_hsl(var(--primary)/0.22)] ring-1 ring-primary/10 transition-colors hover:border-primary/55 hover:bg-black/95"
              >
                <Search className="h-4 w-4 shrink-0" strokeWidth={2.25} />
                {t("favorites.browse_ads")}
              </Link>
            </div>
          </div>
        )}
      </div>
      <div
        aria-hidden
        className={BOTTOM_NAV_SCROLL_END_SPACER_CLASS}
        data-testid="favorites-scroll-spacer"
      />
      </AppShellContentScroll>
    </div>
  );
}

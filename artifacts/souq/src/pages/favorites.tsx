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
import { STALE_USER_ADS_MS } from "@/lib/query-stale-times";
import {
  BOTTOM_NAV_PAGE_SHELL_CLASS,
  BOTTOM_NAV_SCROLL_END_SPACER_CLASS,
} from "@/lib/bottom-nav-layout";
import { AppShellContentScroll } from "@/components/app-shell-content-scroll";
import { OverlayPullToRefresh } from "@/components/overlay-pull-to-refresh";
import {
  TAB_EMPTY_CTA_CLASS,
  TAB_EMPTY_DESC_CLASS,
  TAB_EMPTY_ICON_RING_CLASS,
  TAB_EMPTY_TITLE_CLASS,
  TAB_EMPTY_WRAPPER_CLASS,
  tabEmptyCardClass,
} from "@/lib/tab-empty-state-layout";
import { useCallback, useRef } from "react";

export default function Favorites() {
  const { user, isLoading: authLoading } = useAuth();
  const favoritesScrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, refetch } = useListFavoriteAds({
    query: {
      queryKey: favoritesListQueryKey(),
      enabled: !!user,
      retry: false,
      staleTime: STALE_USER_ADS_MS,
    },
  });

  const refreshFavorites = useCallback(async () => {
    await refetch();
  }, [refetch]);

  if (!authLoading && !user) return <Redirect to="/guest-welcome?redirect=/favorites" />;

  const favoriteAds = Array.isArray(data) ? data : [];

  return (
    <div className={BOTTOM_NAV_PAGE_SHELL_CLASS}>
      <AppShellContentScroll ref={favoritesScrollRef}>
        <OverlayPullToRefresh
          scrollRef={favoritesScrollRef}
          enabled={!!user && !authLoading}
          onRefresh={refreshFavorites}
          indicatorTestId="favorites-pull-to-refresh-indicator"
          dataPrefix="favorites-ptr"
          contentMarker="favorites"
        >
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
              <div className={TAB_EMPTY_WRAPPER_CLASS}>
                <div className={tabEmptyCardClass()} dir="rtl" data-testid="tab-empty-state-card">
                  <div className={TAB_EMPTY_ICON_RING_CLASS}>
                    <Heart
                      className="h-8 w-8 text-primary md:h-9 md:w-9"
                      strokeWidth={2}
                      aria-hidden
                    />
                  </div>
                  <h3 className={TAB_EMPTY_TITLE_CLASS}>
                    {t("favorites.empty_title")}
                  </h3>
                  <p className={TAB_EMPTY_DESC_CLASS}>
                    {t("favorites.empty_desc")}
                  </p>
                  <Link href="/" className={TAB_EMPTY_CTA_CLASS}>
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
        </OverlayPullToRefresh>
      </AppShellContentScroll>
    </div>
  );
}

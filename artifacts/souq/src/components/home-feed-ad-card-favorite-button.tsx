import { Heart } from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  useFavoriteAd,
  useUnfavoriteAd,
  type Ad,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { createFavoriteToggleHandlers } from "@/lib/invalidate-ad-queries";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

type HomeFeedAdCardFavoriteButtonProps = {
  ad: Ad;
};

function areFavoriteButtonPropsEqual(
  prev: HomeFeedAdCardFavoriteButtonProps,
  next: HomeFeedAdCardFavoriteButtonProps,
): boolean {
  const a = prev.ad;
  const b = next.ad;
  if (a === b) return true;
  return a.id === b.id && a.isFavorited === b.isFavorited && a.favoriteCount === b.favoriteCount;
}

function HomeFeedAdCardFavoriteButtonInner({ ad }: HomeFeedAdCardFavoriteButtonProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [locationPath, navigate] = useLocation();
  const favMut = useFavoriteAd();
  const unfavMut = useUnfavoriteAd();
  const [optimisticFav, setOptimisticFav] = useState<boolean | null>(null);

  useEffect(() => {
    if (optimisticFav === null) return;
    if (Boolean(ad.isFavorited) === optimisticFav) {
      setOptimisticFav(null);
    }
  }, [ad.isFavorited, optimisticFav]);

  const isFavorite = Boolean(user && (optimisticFav ?? ad.isFavorited));
  const pending = favMut.isPending || unfavMut.isPending;

  const toggleFavorite = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!user) {
        navigate(`/login?redirect=${encodeURIComponent(locationPath || "/")}`);
        return;
      }
      const next = !Boolean(optimisticFav ?? ad.isFavorited);
      setOptimisticFav(next);
      const handlers = createFavoriteToggleHandlers(queryClient, ad);
      handlers.optimistic(next);

      if (next) {
        favMut.mutate(
          { adId: ad.id },
          {
            onError: () => {
              setOptimisticFav(null);
              handlers.onError();
            },
            onSuccess: handlers.onSuccess,
          },
        );
      } else {
        unfavMut.mutate(
          { adId: ad.id },
          {
            onError: () => {
              setOptimisticFav(null);
              handlers.onError();
            },
            onSuccess: handlers.onSuccess,
          },
        );
      }
    },
    [ad, locationPath, navigate, optimisticFav, queryClient, user, favMut, unfavMut],
  );

  return (
    <button
      type="button"
      onClick={toggleFavorite}
      onPointerDown={(e) => e.stopPropagation()}
      disabled={pending}
      aria-label={isFavorite ? t("ad-card.remove_favorite") : t("ad-card.add_favorite")}
      className={cn(
        "absolute end-1 top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full",
        "border border-primary/35 bg-[#0A0A0A]/90 text-primary shadow-[0_0_10px_-4px_hsl(var(--primary)/0.2)]",
        "ring-1 ring-primary/15 transition-colors hover:border-primary/50 active:scale-95",
        "disabled:pointer-events-none disabled:opacity-60",
      )}
    >
      <Heart
        strokeWidth={2.25}
        className={cn(
          "h-3.5 w-3.5 transition-colors",
          isFavorite
            ? "fill-primary stroke-primary text-primary"
            : "fill-transparent stroke-white text-white",
        )}
        aria-hidden
      />
    </button>
  );
}

export const HomeFeedAdCardFavoriteButton = memo(
  HomeFeedAdCardFavoriteButtonInner,
  areFavoriteButtonPropsEqual,
);

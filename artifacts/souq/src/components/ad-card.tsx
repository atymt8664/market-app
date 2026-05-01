import { Link, useLocation } from "wouter";
import { Heart, MapPin, Eye, ThumbsUp, Star, ImageIcon } from "lucide-react";
import { formatRelativeTime, formatPrice, formatCurrencyAmount } from "@/lib/format";
import {
  useFavoriteAd,
  useUnfavoriteAd,
  getListFavoriteAdsQueryKey,
  type Ad,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { t } from "@/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useLocale } from "@/hooks/use-locale";
import {
  invalidateAdRelatedQueries,
  patchAdEngagementInCaches,
} from "@/lib/invalidate-ad-queries";

export interface AdCardProps {
  ad: Ad;
  /** Fixed width for horizontal carousel (featured strip). */
  featured?: boolean;
  /**
   * Legacy prop — all cards use the same compact vertical tile.
   * Kept for call-site compatibility (`variant="grid"`).
   */
  variant?: "default" | "grid";
  /** Show explicit remove control below the card (favorites page). */
  favoritesList?: boolean;
}

/** Title: exactly two line-heights — no vertical shift between cards */
const TITLE_BOX = "h-[2.5rem] min-h-[2.5rem] max-h-[2.5rem] shrink-0";
/** Price row + compact type badge below */
const PRICE_BOX = "min-h-[2.2rem] shrink-0";
/** Location + time */
const META_BOX = "h-[1.25rem] min-h-[1.25rem] max-h-[1.25rem] shrink-0";

function priceTypeBadgeText(type: Ad["priceType"]) {
  if (type === "negotiable") return t("ad-card.negotiable");
  if (type === "fixed") return t("ad-card.fixed_price");
  if (type === "free") return t("ad-card.free");
  return t("ad-card.swap");
}

function PriceBlock({ ad }: { ad: Ad }) {
  const adWithDetails = ad as Ad & {
    details?: Record<string, unknown>;
  };
  const selectedCurrency =
    ((adWithDetails.details as Record<string, unknown> | undefined)
      ?.selectedCurrency as
      | string
      | undefined) ?? "EUR";
  const main = ad.price == null
    ? formatPrice(ad.price, ad.priceType, selectedCurrency)
    : formatCurrencyAmount(ad.price, selectedCurrency, 0);

  return (
    <div className={cn(PRICE_BOX, "flex w-full min-w-0 flex-col items-start justify-center gap-1")}>
      <p className="min-w-0 truncate text-[15px] font-bold leading-none tabular-nums text-primary">
        {main}
      </p>
      <span className="inline-flex rounded-full border border-primary/35 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
        {priceTypeBadgeText(ad.priceType)}
      </span>
    </div>
  );
}

export function AdCard({ ad, featured, variant: _variant, favoritesList }: AdCardProps) {
  const { locale } = useLocale();
  const numberLocale = locale === "de" ? "de-DE" : locale === "en" ? "en-US" : "ar";
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [locationPath, navigate] = useLocation();
  const favMut = useFavoriteAd();
  const unfavMut = useUnfavoriteAd();

  const [imageFailed, setImageFailed] = useState(false);

  const isFavorite = Boolean(user && ad.isFavorited);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(locationPath || "/")}`);
      return;
    }
    const prevFav = Boolean(ad.isFavorited);
    const prevCount = ad.favoriteCount ?? 0;
    const next = !prevFav;

    patchAdEngagementInCaches(queryClient, ad.id, {
      isFavorited: next,
      favoriteCount: Math.max(0, prevCount + (next ? 1 : -1)),
    });

    const onError = () => {
      patchAdEngagementInCaches(queryClient, ad.id, {
        isFavorited: prevFav,
        favoriteCount: prevCount,
      });
      queryClient.invalidateQueries({ queryKey: getListFavoriteAdsQueryKey() });
    };

    const onSuccess = (data: { count: number; active: boolean }) => {
      patchAdEngagementInCaches(queryClient, ad.id, {
        isFavorited: data.active,
        favoriteCount: data.count,
      });
      queryClient.setQueryData<Ad[]>(getListFavoriteAdsQueryKey(), (old) => {
        if (data.active) {
          if (old?.some((a) => a.id === ad.id)) return old;
          return [
            ...(old ?? []),
            { ...ad, isFavorited: true, favoriteCount: data.count },
          ];
        }
        return (old ?? []).filter((a) => a.id !== ad.id);
      });
      invalidateAdRelatedQueries(queryClient, ad.id);
    };

    if (next) {
      favMut.mutate({ adId: ad.id }, { onError, onSuccess });
    } else {
      unfavMut.mutate({ adId: ad.id }, { onError, onSuccess });
    }
  };

  const hasImage = !!(ad.images && ad.images.length > 0 && ad.images[0]) && !imageFailed;

  return (
    <div
      className={cn(
        "flex min-h-0 w-full flex-col gap-2 outline-none",
        featured ? "h-full" : "h-auto",
        featured &&
          "w-[148px] max-w-[148px] shrink-0 sm:w-[160px] sm:max-w-[160px] md:w-[172px] md:max-w-[172px]",
      )}
    >
    <Link
      href={`/ad/${ad.id}`}
      className={cn("block min-h-0 w-full outline-none", !featured && "h-auto")}
    >
      <motion.article
        whileTap={{ scale: 0.98 }}
        className={cn(
          "group flex w-full flex-col overflow-hidden rounded-xl border border-border/45 bg-card text-start [contain:layout]",
          featured ? "h-full min-h-0" : "h-auto",
          "shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35)]",
          "transition-[border-color,box-shadow] duration-200",
          "hover:border-primary/25 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_2px_10px_rgba(0,0,0,0.45)]",
        )}
      >
        {/* Image — aspect box; media + placeholder both absolute inset-0 → identical geometry */}
        <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-muted/40">
          {hasImage ? (
            <img
              src={ad.images[0]}
              alt={ad.title}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
              loading="lazy"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-muted/95 via-muted/75 to-muted/55 px-2 dark:from-muted/85 dark:via-muted/60 dark:to-muted/45">
              <div className="rounded-full bg-background/30 p-2 opacity-50 ring-1 ring-border/35 dark:bg-background/12">
                <ImageIcon
                  className="h-5 w-5 text-muted-foreground/45"
                  strokeWidth={1.5}
                  aria-hidden
                />
              </div>
              <span className="mt-2 max-w-[95%] text-center text-[10px] leading-tight text-muted-foreground/50">
                {t("ad-card.no_image")}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={toggleFavorite}
            disabled={favMut.isPending || unfavMut.isPending}
            aria-label={
              isFavorite ? t("ad-card.remove_favorite") : t("ad-card.add_favorite")
            }
            className="absolute end-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 shadow-sm backdrop-blur-[2px] transition-colors hover:bg-black/60 disabled:pointer-events-none disabled:opacity-70"
          >
            <motion.div
              animate={{ scale: isFavorite ? [1, 1.12, 1] : 1 }}
              transition={{ duration: 0.2 }}
            >
              <Heart
                strokeWidth={2.25}
                className={cn(
                  "h-3.5 w-3.5 transition-colors",
                  isFavorite
                    ? "fill-primary stroke-primary text-primary"
                    : "fill-transparent stroke-white text-white",
                )}
              />
            </motion.div>
          </button>
        </div>

        {/* Body — fixed row heights + uniform gap + bottom padding (no layout shift) */}
        <div className="flex shrink-0 flex-col gap-1.5 px-2 pb-2.5 pt-1.5">
          <h3
            className={cn(
              TITLE_BOX,
              "break-words text-[13px] font-semibold leading-[1.25rem] text-foreground",
              "line-clamp-2 overflow-hidden",
            )}
          >
            {ad.title}
          </h3>

          <PriceBlock ad={ad} />

          {/* Engagement — equal thirds, fixed inner row height, vertically centered */}
          <div className="shrink-0 border-t border-primary/15 pt-1.5 text-[10px] leading-none text-primary/60">
            <div className="grid h-5 w-full grid-cols-3 items-center gap-x-0.5">
              <StatCell
                icon={<Eye className="h-[11px] w-[11px]" strokeWidth={2} />}
                value={(ad.views ?? 0).toLocaleString(numberLocale)}
              />
              <StatCell
                icon={<Star className="h-[11px] w-[11px]" strokeWidth={2} />}
                value={(ad.favoriteCount ?? 0).toLocaleString(numberLocale)}
              />
              <StatCell
                icon={<ThumbsUp className="h-[11px] w-[11px]" strokeWidth={2} />}
                value={(ad.likeCount ?? 0).toLocaleString(numberLocale)}
              />
            </div>
          </div>

          {/* Location + time */}
          <div
            className={cn(
              META_BOX,
              "flex w-full min-w-0 items-center gap-1 text-[10px] leading-none text-primary/55",
            )}
          >
            <MapPin
              className="h-[11px] w-[11px] shrink-0 text-primary/45"
              strokeWidth={2}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate">{ad.city || t("ad-card.unknown_city")}</span>
            <span className="max-w-[45%] shrink-0 truncate text-end tabular-nums text-primary/50">
              {formatRelativeTime(ad.createdAt)}
            </span>
          </div>
        </div>
      </motion.article>
    </Link>
    {favoritesList && user && isFavorite && (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full shrink-0 gap-2 border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        disabled={favMut.isPending || unfavMut.isPending}
        onClick={(e) => toggleFavorite(e)}
      >
        <Heart className="h-4 w-4 fill-primary text-primary" strokeWidth={2} />
        {t("ad-card.remove_favorite")}
      </Button>
    )}
    </div>
  );
}

function StatCell({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <span className="flex min-h-0 min-w-0 w-full items-center justify-center gap-1 text-primary/65 [&_svg]:text-primary/50">
      <span className="shrink-0 [&_svg]:block">{icon}</span>
      <span className="min-w-0 truncate text-center tabular-nums">{value}</span>
    </span>
  );
}

export function AdCardSkeleton({
  featured,
  variant: _variant,
}: {
  featured?: boolean;
  variant?: "default" | "grid";
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-xl border border-border/45 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35)]",
        featured ? "h-full" : "h-auto",
        featured &&
          "w-[148px] max-w-[148px] shrink-0 sm:w-[160px] sm:max-w-[160px] md:w-[172px] md:max-w-[172px]",
      )}
    >
      <Skeleton className="aspect-[4/3] w-full shrink-0 rounded-none bg-muted/40" />
      <div className="flex flex-col gap-1.5 px-2 pb-2.5 pt-1.5">
        <Skeleton className="h-[2.5rem] w-full rounded-md bg-muted/50" />
        <Skeleton className="h-[1.5rem] w-2/5 rounded-md bg-muted/50" />
        <div className="grid h-5 grid-cols-3 items-center gap-x-0.5 border-t border-border/35 pt-1.5">
          <Skeleton className="mx-auto h-3 w-10 rounded bg-muted/45" />
          <Skeleton className="mx-auto h-3 w-10 rounded bg-muted/45" />
          <Skeleton className="mx-auto h-3 w-10 rounded bg-muted/45" />
        </div>
        <Skeleton className="h-[1.25rem] w-full rounded bg-muted/40" />
      </div>
    </div>
  );
}

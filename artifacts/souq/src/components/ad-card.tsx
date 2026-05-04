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
const TITLE_BOX_FAVORITES =
  "h-[2.125rem] min-h-[2.125rem] max-h-[2.125rem] shrink-0";
/** Price row + compact type badge below */
const PRICE_BOX = "min-h-[2.2rem] shrink-0";
const PRICE_BOX_COMPACT = "min-h-[2rem] shrink-0";

/** صفحة المفضلة — نفس هوية كروت البروفايل / نشر إعلان، بحجم مدمج للموبايل */
const FAVORITES_CARD_SHELL =
  "rounded-2xl border border-primary/40 bg-zinc-950/75 shadow-[0_0_22px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10 transition-[border-color,box-shadow] duration-200 hover:border-primary/45 hover:shadow-[0_0_26px_-12px_hsl(var(--primary)/0.22)]";
/** Location + time */
const META_BOX = "h-[1.25rem] min-h-[1.25rem] max-h-[1.25rem] shrink-0";

function priceTypeBadgeText(type: Ad["priceType"]) {
  if (type === "negotiable") return t("ad-card.negotiable");
  if (type === "fixed") return t("ad-card.fixed_price");
  if (type === "free") return t("ad-card.free");
  return t("ad-card.swap");
}

function PriceBlock({ ad, compact }: { ad: Ad; compact?: boolean }) {
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
    <div
      className={cn(
        compact ? PRICE_BOX_COMPACT : PRICE_BOX,
        "flex w-full min-w-0 flex-col items-start justify-center gap-0.5",
        compact && "gap-0",
      )}
    >
      <p
        className={cn(
          "min-w-0 truncate font-bold leading-none tabular-nums text-primary",
          compact ? "text-[13px]" : "text-[15px]",
        )}
      >
        {main}
      </p>
      <span
        className={cn(
          "inline-flex rounded-full border border-primary/35 bg-primary/10 text-primary",
          compact ? "px-1.5 py-0 text-[9px]" : "px-2 py-0.5 text-[10px]",
        )}
      >
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
  const favCompact = Boolean(favoritesList);

  return (
    <div
      className={cn(
        "flex min-h-0 w-full flex-col outline-none",
        favCompact ? "gap-1" : "gap-2",
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
          "group flex w-full flex-col overflow-hidden text-start [contain:layout]",
          favCompact
            ? FAVORITES_CARD_SHELL
            : [
                "rounded-xl border border-border/45 bg-card",
                "shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35)]",
                "transition-[border-color,box-shadow] duration-200",
                "hover:border-primary/25 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_2px_10px_rgba(0,0,0,0.45)]",
              ].join(" "),
          featured ? "h-full min-h-0" : "h-auto",
        )}
      >
        {/* Image — صفحة المفضلة: ارتفاع ثابت أصغر؛ باقي الصفحات: aspect 4/3 */}
        <div
          className={cn(
            "relative w-full shrink-0 overflow-hidden bg-muted/40",
            favCompact
              ? "h-[88px] sm:h-[96px] md:h-[104px]"
              : "aspect-[4/3]",
          )}
        >
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
            className={cn(
              "absolute flex items-center justify-center rounded-full border border-primary/25 bg-black/50 text-primary shadow-[0_0_10px_-4px_hsl(var(--primary)/0.15)] backdrop-blur-[2px] transition-colors hover:bg-black/65 disabled:pointer-events-none disabled:opacity-70",
              favCompact ? "end-1 top-1 h-6 w-6" : "end-1.5 top-1.5 h-7 w-7",
            )}
          >
            <motion.div
              animate={{ scale: isFavorite ? [1, 1.12, 1] : 1 }}
              transition={{ duration: 0.2 }}
            >
              <Heart
                strokeWidth={2.25}
                className={cn(
                  "transition-colors",
                  favCompact ? "h-3 w-3" : "h-3.5 w-3.5",
                  isFavorite
                    ? "fill-primary stroke-primary text-primary"
                    : "fill-transparent stroke-white text-white",
                )}
              />
            </motion.div>
          </button>
        </div>

        {/* Body — fixed row heights + uniform gap + bottom padding (no layout shift) */}
        <div
          className={cn(
            "flex shrink-0 flex-col",
            favCompact ? "gap-1 px-1.5 pb-2 pt-1" : "gap-1.5 px-2 pb-2.5 pt-1.5",
          )}
        >
          <h3
            className={cn(
              favCompact ? TITLE_BOX_FAVORITES : TITLE_BOX,
              "break-words font-semibold text-foreground line-clamp-2 overflow-hidden",
              favCompact
                ? "text-[12px] leading-[1.06rem]"
                : "text-[13px] leading-[1.25rem]",
            )}
          >
            {ad.title}
          </h3>

          <PriceBlock ad={ad} compact={favCompact} />

          {/* Engagement — equal thirds, fixed inner row height, vertically centered */}
          <div
            className={cn(
              "shrink-0 border-t border-primary/15 text-[10px] leading-none text-primary/60",
              favCompact ? "pt-1" : "pt-1.5",
            )}
          >
            <div
              className={cn(
                "grid w-full grid-cols-3 items-center gap-x-0.5",
                favCompact ? "h-4" : "h-5",
              )}
            >
              <StatCell
                compact={favCompact}
                icon={<Eye className={favCompact ? "h-2.5 w-2.5" : "h-[11px] w-[11px]"} strokeWidth={2} />}
                value={(ad.views ?? 0).toLocaleString(numberLocale)}
              />
              <StatCell
                compact={favCompact}
                icon={<Star className={favCompact ? "h-2.5 w-2.5" : "h-[11px] w-[11px]"} strokeWidth={2} />}
                value={(ad.favoriteCount ?? 0).toLocaleString(numberLocale)}
              />
              <StatCell
                compact={favCompact}
                icon={<ThumbsUp className={favCompact ? "h-2.5 w-2.5" : "h-[11px] w-[11px]"} strokeWidth={2} />}
                value={(ad.likeCount ?? 0).toLocaleString(numberLocale)}
              />
            </div>
          </div>

          {/* Location + time */}
          <div
            className={cn(
              favCompact ? "h-[1.1rem] min-h-[1.1rem] max-h-[1.1rem]" : META_BOX,
              "flex w-full min-w-0 items-center gap-0.5 text-[10px] leading-none text-primary/55",
              favCompact && "text-[9px] text-primary/50",
            )}
          >
            <MapPin
              className={cn(
                "shrink-0 text-primary/45",
                favCompact ? "h-2.5 w-2.5" : "h-[11px] w-[11px]",
              )}
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
        className="h-8 w-full shrink-0 gap-1.5 rounded-full border-primary/35 bg-zinc-950/85 px-3 text-[11px] font-medium text-primary shadow-[0_0_12px_-8px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10 hover:border-primary/50 hover:bg-zinc-900/90 hover:text-primary"
        disabled={favMut.isPending || unfavMut.isPending}
        onClick={(e) => toggleFavorite(e)}
      >
        <Heart className="h-3.5 w-3.5 shrink-0 fill-primary text-primary" strokeWidth={2} />
        {t("ad-card.remove_favorite")}
      </Button>
    )}
    </div>
  );
}

function StatCell({
  icon,
  value,
  compact,
}: {
  icon: React.ReactNode;
  value: string;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex min-h-0 min-w-0 w-full items-center justify-center gap-0.5 text-primary/65 [&_svg]:text-primary/50",
        compact && "text-[9px] text-primary/60",
      )}
    >
      <span className="shrink-0 [&_svg]:block">{icon}</span>
      <span className="min-w-0 truncate text-center tabular-nums">{value}</span>
    </span>
  );
}

export function AdCardSkeleton({
  featured,
  variant: _variant,
  favoritesList,
}: {
  featured?: boolean;
  variant?: "default" | "grid";
  favoritesList?: boolean;
}) {
  const compact = Boolean(favoritesList);
  return (
    <div
      className={cn(
        "flex w-full flex-col overflow-hidden",
        compact
          ? FAVORITES_CARD_SHELL
          : "rounded-xl border border-border/45 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35)]",
        featured ? "h-full" : "h-auto",
        featured &&
          "w-[148px] max-w-[148px] shrink-0 sm:w-[160px] sm:max-w-[160px] md:w-[172px] md:max-w-[172px]",
      )}
    >
      <Skeleton
        className={cn(
          "w-full shrink-0 rounded-none bg-muted/40",
          compact ? "h-[88px] sm:h-[96px] md:h-[104px]" : "aspect-[4/3]",
        )}
      />
      <div
        className={cn(
          "flex flex-col",
          compact ? "gap-1 px-1.5 pb-2 pt-1" : "gap-1.5 px-2 pb-2.5 pt-1.5",
        )}
      >
        <Skeleton
          className={cn(
            "w-full rounded-md bg-muted/50",
            compact ? "h-[2.125rem]" : "h-[2.5rem]",
          )}
        />
        <Skeleton className={cn("rounded-md bg-muted/50", compact ? "h-3.5 w-2/5" : "h-[1.5rem] w-2/5")} />
        <div
          className={cn(
            "grid grid-cols-3 items-center gap-x-0.5 border-t border-primary/15",
            compact ? "h-4 pt-1" : "h-5 border-border/35 pt-1.5",
          )}
        >
          <Skeleton className="mx-auto h-2.5 w-8 rounded bg-muted/45" />
          <Skeleton className="mx-auto h-2.5 w-8 rounded bg-muted/45" />
          <Skeleton className="mx-auto h-2.5 w-8 rounded bg-muted/45" />
        </div>
        <Skeleton className={cn("w-full rounded bg-muted/40", compact ? "h-3" : "h-[1.25rem]")} />
      </div>
      {compact ? (
        <div className="px-0 pb-0.5 pt-0">
          <Skeleton className="h-8 w-full rounded-full bg-muted/40" />
        </div>
      ) : null}
    </div>
  );
}

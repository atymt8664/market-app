import { Link, useLocation } from "wouter";
import { Heart, MapPin, Eye, ThumbsUp, Star } from "lucide-react";
import { AdCardNoImagePlaceholder } from "@/components/ad-card-no-image-placeholder";
import { formatRelativeTime, formatPrice, formatCurrencyAmount } from "@/lib/format";
import {
  useFavoriteAd,
  useUnfavoriteAd,
  type Ad,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { memo, useCallback, useEffect, useState } from "react";
import { t } from "@/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useLocale } from "@/hooks/use-locale";
import { createFavoriteToggleHandlers } from "@/lib/invalidate-ad-queries";
import {
  getAdImageHeroUrl,
  getAdImageThumbUrl,
} from "@/lib/ad-image-url";

export interface AdCardProps {
  ad: Ad;
  /** Fixed width for horizontal carousel (featured strip). */
  featured?: boolean;
  /** First visible featured card: eager decode for perceived load (strip only). */
  featuredLead?: boolean;
  /** Dense tile for home feed sections — tighter image ratio and body spacing. */
  homeFeed?: boolean;
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
  "rounded-2xl border border-primary/40 bg-[#0A0A0A]/75 shadow-[0_0_22px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10 transition-[transform,border-color,box-shadow] duration-200 hover:border-primary/45 hover:shadow-[0_0_26px_-12px_hsl(var(--primary)/0.22)]";

/** Home feed — #0A0A0A shell; thin lime rim, no card glow. */
const HOME_FEED_CARD_SHELL =
  "rounded-xl border border-primary/30 bg-[#0A0A0A] ring-1 ring-primary/8 shadow-none transition-none";
/** Location + time */
const META_BOX = "h-[1.25rem] min-h-[1.25rem] max-h-[1.25rem] shrink-0";

/** Featured strip card width — home feed compact; balanced near recommended grid tiles. */
const FEATURED_HOME_FEED_CARD_W =
  "w-[168px] max-w-[168px] shrink-0 sm:w-[172px] sm:max-w-[172px] md:w-[175px] md:max-w-[175px]";

/** Legacy featured width when not using home feed compact body. */
const FEATURED_DEFAULT_CARD_W =
  "w-[136px] max-w-[136px] shrink-0 sm:w-[148px] sm:max-w-[148px] md:w-[160px] md:max-w-[160px]";

function priceTypeBadgeText(type: Ad["priceType"]) {
  if (type === "negotiable") return t("ad-card.negotiable");
  if (type === "fixed") return t("ad-card.fixed_price");
  if (type === "free") return t("ad-card.free");
  return t("ad-card.swap");
}

const PriceBlock = memo(function PriceBlock({
  ad,
  compact,
  inlineBadge,
}: {
  ad: Ad;
  compact?: boolean;
  inlineBadge?: boolean;
}) {
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

  if (inlineBadge) {
    return (
      <div className="flex h-[1.25rem] min-h-[1.25rem] w-full min-w-0 items-center gap-1">
        <p className="min-w-0 truncate text-[12px] font-bold leading-none tabular-nums text-primary">
          {main}
        </p>
        <span className="inline-flex shrink-0 rounded-full border border-primary/35 bg-primary/10 px-1 py-0 text-[8px] text-primary">
          {priceTypeBadgeText(ad.priceType)}
        </span>
      </div>
    );
  }

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
});

type StatKind = "views" | "favorites" | "likes";

const StatCell = memo(function StatCell({
  kind,
  value,
  compact,
}: {
  kind: StatKind;
  value: string;
  compact?: boolean;
}) {
  const icon =
    kind === "views" ? (
      <Eye
        className={compact ? "h-2.5 w-2.5" : "h-[11px] w-[11px]"}
        strokeWidth={2}
        aria-hidden
      />
    ) : kind === "favorites" ? (
      <Star
        className={compact ? "h-2.5 w-2.5" : "h-[11px] w-[11px]"}
        strokeWidth={2}
        aria-hidden
      />
    ) : (
      <ThumbsUp
        className={compact ? "h-2.5 w-2.5" : "h-[11px] w-[11px]"}
        strokeWidth={2}
        aria-hidden
      />
    );

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
});

type AdCardMemoProps = AdCardProps & { viewerAuthKey: string };

/** يقلّل إعادة رسم الكرت عند إعادة رسم الأب مع نفس بيانات الإعلان (مرجع كائن متغيّر من الكاش). */
/** P7-PR-5: Supabase render variants for home featured strip (LCP lead = hero). */
function adCardDisplayImageSrc(
  rawUrl: string | undefined,
  featured?: boolean,
  featuredLead?: boolean,
  homeFeed?: boolean,
): string | undefined {
  if (!rawUrl) return undefined;
  if (featured && featuredLead) return getAdImageHeroUrl(rawUrl);
  if (featured && homeFeed) return getAdImageThumbUrl(rawUrl);
  return rawUrl;
}

function areAdCardPropsEqual(prev: AdCardMemoProps, next: AdCardMemoProps): boolean {
  if (prev.viewerAuthKey !== next.viewerAuthKey) {
    return false;
  }
  if (
    prev.featured !== next.featured ||
    prev.featuredLead !== next.featuredLead ||
    prev.homeFeed !== next.homeFeed ||
    prev.favoritesList !== next.favoritesList ||
    prev.variant !== next.variant
  ) {
    return false;
  }
  const a = prev.ad;
  const b = next.ad;
  if (a === b) return true;
  const curA =
    (a.details as { selectedCurrency?: string } | undefined)?.selectedCurrency ?? "";
  const curB =
    (b.details as { selectedCurrency?: string } | undefined)?.selectedCurrency ?? "";
  return (
    a.id === b.id &&
    a.title === b.title &&
    a.price === b.price &&
    a.priceType === b.priceType &&
    a.city === b.city &&
    (a.images?.[0] ?? "") === (b.images?.[0] ?? "") &&
    a.views === b.views &&
    a.favoriteCount === b.favoriteCount &&
    a.likeCount === b.likeCount &&
    a.isFavorited === b.isFavorited &&
    a.createdAt === b.createdAt &&
    curA === curB
  );
}

function AdCardInner({
  ad,
  featured,
  featuredLead,
  homeFeed,
  variant: _variant,
  favoritesList,
  viewerAuthKey: _viewerAuthKey,
}: AdCardMemoProps) {
  const { locale } = useLocale();
  const numberLocale = locale === "de" ? "de-DE" : locale === "en" ? "en-US" : "ar";
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [locationPath, navigate] = useLocation();
  const favMut = useFavoriteAd();
  const unfavMut = useUnfavoriteAd();

  const rawImageUrl = ad.images?.[0];
  const optimizedImageSrc = adCardDisplayImageSrc(
    rawImageUrl,
    featured,
    featuredLead,
    homeFeed,
  );
  const [imageSrc, setImageSrc] = useState(optimizedImageSrc);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageSrc(optimizedImageSrc);
    setImageFailed(false);
  }, [optimizedImageSrc]);

  const isFavorite = Boolean(user && ad.isFavorited);

  const handleImageError = useCallback(() => {
    if (rawImageUrl && imageSrc !== rawImageUrl) {
      setImageSrc(rawImageUrl);
      return;
    }
    setImageFailed(true);
  }, [rawImageUrl, imageSrc]);

  const toggleFavorite = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!user) {
        navigate(`/login?redirect=${encodeURIComponent(locationPath || "/")}`);
        return;
      }
      const next = !Boolean(ad.isFavorited);
      const handlers = createFavoriteToggleHandlers(queryClient, ad);
      handlers.optimistic(next);

      if (next) {
        favMut.mutate(
          { adId: ad.id },
          { onError: handlers.onError, onSuccess: handlers.onSuccess },
        );
      } else {
        unfavMut.mutate(
          { adId: ad.id },
          { onError: handlers.onError, onSuccess: handlers.onSuccess },
        );
      }
    },
    [ad, locationPath, navigate, queryClient, user, favMut, unfavMut],
  );

  const hasImage = !!imageSrc && !imageFailed;
  const favCompact = Boolean(favoritesList);
  const feedCompact = Boolean(homeFeed && !favoritesList);
  /** Hint decode size for the CDN/browser without changing layout (object-cover + fixed aspect). */
  const imageSizes = featured
    ? feedCompact
      ? "(max-width: 640px) 168px, 175px"
      : "(max-width: 640px) 148px, 160px"
    : "(max-width: 640px) 50vw, (max-width: 1024px) 34vw, 360px";

  return (
    <div
      className={cn(
        "flex min-h-0 w-full flex-col outline-none",
        favCompact ? "gap-1" : feedCompact ? "gap-1" : "gap-2",
        featured ? "h-full" : "h-full",
        featured &&
          (feedCompact ? FEATURED_HOME_FEED_CARD_W : FEATURED_DEFAULT_CARD_W),
      )}
    >
    <Link
      href={`/ad/${ad.id}`}
      className={cn("block h-full min-h-0 w-full outline-none")}
    >
      <article
        className={cn(
          "group flex h-full w-full flex-col overflow-hidden text-start [contain:layout]",
          !feedCompact && "active:scale-[0.98]",
          favCompact
            ? FAVORITES_CARD_SHELL
            : feedCompact
              ? HOME_FEED_CARD_SHELL
              : [
                "rounded-xl border border-border/45 bg-[#0A0A0A]",
                "shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35)]",
                "transition-[transform,border-color,box-shadow] duration-200 ease-out",
                "hover:border-primary/25 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_2px_10px_rgba(0,0,0,0.45)]",
              ].join(" "),
          "h-full min-h-0",
        )}
      >
        {/* Image — صفحة المفضلة: ارتفاع ثابت أصغر؛ باقي الصفحات: aspect 4/3 */}
        <div
          className={cn(
            "relative w-full shrink-0 overflow-hidden",
            feedCompact ? "bg-[#0A0A0A]" : "bg-[#0A0A0A]/80",
            favCompact
              ? "h-[88px] sm:h-[96px] md:h-[104px]"
              : feedCompact
                ? featured
                  ? "aspect-[4/3]"
                  : "aspect-[4/3]"
                : "aspect-[4/3]",
          )}
        >
          {hasImage ? (
            <img
              src={imageSrc}
              alt={ad.title}
              className={cn(
                "absolute inset-0 h-full w-full object-cover",
                !featured &&
                  "transition-transform duration-300 ease-out group-hover:scale-[1.02]",
              )}
              loading={featured && featuredLead ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={featured && featuredLead ? "high" : undefined}
              draggable={false}
              sizes={imageSizes}
              onError={handleImageError}
            />
          ) : (
            <AdCardNoImagePlaceholder plainBackdrop={feedCompact} subtleIcon={feedCompact} />
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
              favCompact ? "end-1 top-1 h-6 w-6" : feedCompact ? "end-1 top-1 h-6 w-6" : "end-1.5 top-1.5 h-7 w-7",
            )}
          >
            <span className="inline-flex">
              <Heart
                strokeWidth={2.25}
                className={cn(
                  "transition-colors",
                  favCompact ? "h-3 w-3" : feedCompact ? "h-3 w-3" : "h-3.5 w-3.5",
                  isFavorite
                    ? "fill-primary stroke-primary text-primary"
                    : "fill-transparent stroke-white text-white",
                )}
              />
            </span>
          </button>
        </div>

        {/* Body — fixed row heights + uniform gap + bottom padding (no layout shift) */}
        <div
          className={cn(
            "flex shrink-0 flex-col",
            favCompact
              ? "gap-1 px-1.5 pb-2 pt-1"
              : feedCompact
                ? "gap-0.5 px-1.5 pb-1.5 pt-1"
                : "gap-1.5 px-2 pb-2.5 pt-1.5",
          )}
        >
          <h3
            className={cn(
              favCompact
                ? TITLE_BOX_FAVORITES
                : feedCompact
                  ? "h-4 min-h-4 max-h-4 shrink-0"
                  : TITLE_BOX,
              "overflow-hidden font-semibold text-foreground [overflow-wrap:anywhere]",
              favCompact
                ? "text-[12px] leading-[1.06rem] line-clamp-2"
                : feedCompact
                  ? "text-[11px] leading-4 line-clamp-1"
                  : "text-[13px] leading-[1.25rem] line-clamp-2",
            )}
          >
            {ad.title}
          </h3>

          <PriceBlock ad={ad} compact={favCompact} inlineBadge={feedCompact} />

          {/* Engagement — equal thirds, fixed inner row height, vertically centered */}
          <div
            className={cn(
              "shrink-0 border-t border-primary/15 leading-none text-primary/60",
              favCompact ? "pt-1 text-[10px]" : feedCompact ? "pt-0.5 text-[9px]" : "pt-1.5 text-[10px]",
            )}
          >
            <div
              className={cn(
                "grid w-full grid-cols-3 items-center gap-x-0.5",
                favCompact ? "h-4" : feedCompact ? "h-3.5" : "h-5",
              )}
            >
              <StatCell
                kind="views"
                compact={favCompact || feedCompact}
                value={(ad.views ?? 0).toLocaleString(numberLocale)}
              />
              <StatCell
                kind="favorites"
                compact={favCompact || feedCompact}
                value={(ad.favoriteCount ?? 0).toLocaleString(numberLocale)}
              />
              <StatCell
                kind="likes"
                compact={favCompact || feedCompact}
                value={(ad.likeCount ?? 0).toLocaleString(numberLocale)}
              />
            </div>
          </div>

          {/* Location + time */}
          <div
            className={cn(
              favCompact
                ? "h-[1.1rem] min-h-[1.1rem] max-h-[1.1rem]"
                : feedCompact
                  ? "h-3 min-h-3 max-h-3"
                  : META_BOX,
              "flex w-full min-w-0 items-center gap-0.5 leading-none text-primary/55",
              favCompact && "text-[9px] text-primary/50",
              feedCompact && "text-[8px] text-primary/50",
              !favCompact && !feedCompact && "text-[10px]",
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
      </article>
    </Link>
    {favoritesList && user && isFavorite && (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 w-full shrink-0 gap-1.5 rounded-full border-primary/35 bg-[#0A0A0A]/85 px-3 text-[11px] font-medium text-primary shadow-[0_0_12px_-8px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10 hover:border-primary/50 hover:bg-black/90 hover:text-primary"
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

const AdCardMemoized = memo(AdCardInner, areAdCardPropsEqual);

/** يعيد حساب مفتاح الجلسة خارج الـ memo حتى لا تبقى أزرار المفضلة/الحالة عالقة عند تسجيل الدخول أو الخروج. */
export function AdCard(props: AdCardProps) {
  const { user } = useAuth();
  const viewerAuthKey = user ? `u:${user.id}` : "guest";
  return <AdCardMemoized {...props} viewerAuthKey={viewerAuthKey} />;
}

export function AdCardSkeleton({
  featured,
  homeFeed,
  variant: _variant,
  favoritesList,
}: {
  featured?: boolean;
  homeFeed?: boolean;
  variant?: "default" | "grid";
  favoritesList?: boolean;
}) {
  const compact = Boolean(favoritesList);
  const feedCompact = Boolean(homeFeed && !favoritesList);
  return (
    <div
      className={cn(
        "flex w-full flex-col overflow-hidden",
        compact
          ? FAVORITES_CARD_SHELL
          : feedCompact
            ? HOME_FEED_CARD_SHELL
            : "rounded-xl border border-border/45 bg-[#0A0A0A] shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35)]",
        featured ? "h-full" : "h-auto",
        featured &&
          (feedCompact ? FEATURED_HOME_FEED_CARD_W : FEATURED_DEFAULT_CARD_W),
      )}
    >
      <Skeleton
        className={cn(
          "w-full shrink-0 rounded-none",
          feedCompact ? "bg-primary/[0.06]" : "bg-muted/40",
          compact
            ? "h-[88px] sm:h-[96px] md:h-[104px]"
            : feedCompact
              ? featured
                ? "aspect-[4/3]"
                : "aspect-[4/3]"
              : "aspect-[4/3]",
        )}
      />
      <div
        className={cn(
          "flex flex-col",
          compact
            ? "gap-1 px-1.5 pb-2 pt-1"
            : feedCompact
              ? "gap-0.5 px-1.5 pb-1.5 pt-1"
              : "gap-1.5 px-2 pb-2.5 pt-1.5",
        )}
      >
        <Skeleton
          className={cn(
            "w-full rounded-md",
            feedCompact ? "bg-primary/[0.08]" : "bg-muted/50",
            compact ? "h-[2.125rem]" : feedCompact ? "h-4" : "h-[2.5rem]",
          )}
        />
        <Skeleton
          className={cn(
            "rounded-md",
            feedCompact || compact ? "bg-primary/[0.08]" : "bg-muted/50",
            compact || feedCompact ? "h-3.5 w-2/5" : "h-[1.5rem] w-2/5",
          )}
        />
        <div
          className={cn(
            "grid grid-cols-3 items-center gap-x-0.5 border-t border-primary/15",
            compact ? "h-4 pt-1" : feedCompact ? "h-3.5 pt-0.5" : "h-5 border-border/35 pt-1.5",
          )}
        >
          <Skeleton className={cn("mx-auto h-2.5 w-8 rounded", feedCompact ? "bg-primary/[0.07]" : "bg-muted/45")} />
          <Skeleton className={cn("mx-auto h-2.5 w-8 rounded", feedCompact ? "bg-primary/[0.07]" : "bg-muted/45")} />
          <Skeleton className={cn("mx-auto h-2.5 w-8 rounded", feedCompact ? "bg-primary/[0.07]" : "bg-muted/45")} />
        </div>
        <Skeleton className={cn("w-full rounded", feedCompact ? "bg-primary/[0.06]" : "bg-muted/40", compact ? "h-3" : feedCompact ? "h-3" : "h-[1.25rem]")} />
      </div>
      {compact ? (
        <div className="px-0 pb-0.5 pt-0">
          <Skeleton className="h-8 w-full rounded-full bg-muted/40" />
        </div>
      ) : null}
    </div>
  );
}

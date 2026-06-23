import { Link } from "wouter";
import { MapPin, Eye, ThumbsUp, Star } from "lucide-react";
import { AdCardNoImagePlaceholder } from "@/components/ad-card-no-image-placeholder";
import { formatRelativeTime, formatPrice, formatCurrencyAmount } from "@/lib/format";
import type { Ad } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { memo, useCallback, useEffect, useState } from "react";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import {
  getAdImageFeaturedLeadUrl,
  getAdImageThumbUrl,
  getAdImageFeedUrl,
} from "@/lib/ad-image-url";
import {
  FEATURED_HOME_FEED_CARD_W,
  FEATURED_LEAD_IMG_H,
  FEATURED_LEAD_IMG_W,
  HOME_FEED_CARD_SHELL,
  HOME_FEED_IMG_H,
  HOME_FEED_IMG_W,
} from "@/components/ad-card-shells";
import { HomeFeedAdCardFavoriteButton } from "@/components/home-feed-ad-card-favorite-button";

export type HomeFeedAdCardProps = {
  ad: Ad;
  featured?: boolean;
  /** First featured tile — hero-sized image URL only (no DOM handoff). */
  featuredLead?: boolean;
  /** Home page only — interactive favorite heart overlay on image. */
  showFavoriteHeart?: boolean;
};

function priceTypeBadgeText(type: Ad["priceType"]) {
  if (type === "negotiable") return t("ad-card.negotiable");
  if (type === "fixed") return t("ad-card.fixed_price");
  if (type === "free") return t("ad-card.free");
  return t("ad-card.swap");
}

function adCardDisplayImageSrc(
  rawUrl: string | undefined,
  featured?: boolean,
  featuredLead?: boolean,
): string | undefined {
  if (!rawUrl) return undefined;
  if (featured && featuredLead) return getAdImageFeaturedLeadUrl(rawUrl);
  if (featured) return getAdImageThumbUrl(rawUrl);
  return getAdImageFeedUrl(rawUrl);
}

function areHomeFeedAdCardPropsEqual(
  prev: HomeFeedAdCardProps,
  next: HomeFeedAdCardProps,
): boolean {
  if (prev.featured !== next.featured) return false;
  if (prev.featuredLead !== next.featuredLead) return false;
  if (prev.showFavoriteHeart !== next.showFavoriteHeart) return false;
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

/** P7-PR-8: Home feed tile — favorite heart gated via showFavoriteHeart (Home page only). */
function HomeFeedAdCardInner({
  ad,
  featured,
  featuredLead,
  showFavoriteHeart = false,
}: HomeFeedAdCardProps) {
  const { locale } = useLocale();
  const numberLocale = locale === "de" ? "de-DE" : locale === "en" ? "en-US" : "ar";
  const rawImageUrl = ad.images?.[0];
  const optimizedImageSrc = adCardDisplayImageSrc(rawImageUrl, featured, featuredLead);
  const [imageSrc, setImageSrc] = useState(optimizedImageSrc);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageSrc(optimizedImageSrc);
    setImageFailed(false);
  }, [optimizedImageSrc]);

  const handleImageError = useCallback(() => {
    if (rawImageUrl && imageSrc !== rawImageUrl) {
      setImageSrc(rawImageUrl);
      return;
    }
    setImageFailed(true);
  }, [rawImageUrl, imageSrc]);

  const hasImage = !!imageSrc && !imageFailed;

  const adWithDetails = ad as Ad & { details?: Record<string, unknown> };
  const selectedCurrency =
    ((adWithDetails.details as Record<string, unknown> | undefined)?.selectedCurrency as
      | string
      | undefined) ?? "EUR";
  const main =
    ad.price == null
      ? formatPrice(ad.price, ad.priceType, selectedCurrency)
      : formatCurrencyAmount(ad.price, selectedCurrency, 0);

  const imageSizes = featured
    ? "(max-width: 640px) 168px, 175px"
    : "(max-width: 640px) 50vw, (max-width: 1024px) 34vw, 360px";

  const imgWidth = featured ? FEATURED_LEAD_IMG_W : HOME_FEED_IMG_W;
  const imgHeight = featured ? FEATURED_LEAD_IMG_H : HOME_FEED_IMG_H;

  return (
    <div
      className={cn(
        "flex min-h-0 w-full flex-col outline-none gap-1 h-full",
        featured && FEATURED_HOME_FEED_CARD_W,
      )}
    >
      <Link href={`/ad/${ad.id}`} className="block h-full min-h-0 w-full outline-none">
        <article
          className={cn(
            "group flex h-full w-full flex-col overflow-hidden text-start [contain:layout]",
            HOME_FEED_CARD_SHELL,
            "h-full min-h-0",
          )}
        >
          <div className="relative w-full shrink-0 overflow-hidden bg-[#0A0A0A] aspect-[4/3]">
            {hasImage ? (
              <img
                src={imageSrc}
                alt={ad.title}
                width={imgWidth}
                height={imgHeight}
                className="absolute inset-0 h-full w-full object-cover"
                loading={featured && featuredLead ? "eager" : "lazy"}
                decoding="async"
                fetchPriority={featured && featuredLead ? "high" : featured ? "low" : undefined}
                draggable={false}
                sizes={imageSizes}
                onError={handleImageError}
              />
            ) : (
              <AdCardNoImagePlaceholder plainBackdrop subtleIcon />
            )}
            {showFavoriteHeart ? <HomeFeedAdCardFavoriteButton ad={ad} /> : null}
          </div>

          <div className="flex shrink-0 flex-col gap-0.5 px-1.5 pb-1.5 pt-1">
            <h3 className="h-4 min-h-4 max-h-4 shrink-0 overflow-hidden font-semibold text-[11px] leading-4 line-clamp-1 text-foreground [overflow-wrap:anywhere]">
              {ad.title}
            </h3>

            <div className="flex h-[1.25rem] min-h-[1.25rem] w-full min-w-0 items-center gap-1">
              <p className="min-w-0 truncate text-[12px] font-bold leading-none tabular-nums text-primary">
                {main}
              </p>
              <span className="inline-flex shrink-0 rounded-full border border-primary/35 bg-primary/10 px-1 py-0 text-[8px] text-primary">
                {priceTypeBadgeText(ad.priceType)}
              </span>
            </div>

            <div className="shrink-0 border-t border-primary/15 pt-0.5 text-[9px] leading-none text-primary/60">
              <div className="grid h-3.5 w-full grid-cols-3 items-center gap-x-0.5">
                <span className="flex min-w-0 items-center justify-center gap-0.5 text-primary/65">
                  <Eye className="h-2.5 w-2.5 shrink-0 text-primary/50" strokeWidth={2} aria-hidden />
                  <span className="truncate tabular-nums">{(ad.views ?? 0).toLocaleString(numberLocale)}</span>
                </span>
                <span className="flex min-w-0 items-center justify-center gap-0.5 text-primary/65">
                  <Star className="h-2.5 w-2.5 shrink-0 text-primary/50" strokeWidth={2} aria-hidden />
                  <span className="truncate tabular-nums">
                    {(ad.favoriteCount ?? 0).toLocaleString(numberLocale)}
                  </span>
                </span>
                <span className="flex min-w-0 items-center justify-center gap-0.5 text-primary/65">
                  <ThumbsUp className="h-2.5 w-2.5 shrink-0 text-primary/50" strokeWidth={2} aria-hidden />
                  <span className="truncate tabular-nums">
                    {(ad.likeCount ?? 0).toLocaleString(numberLocale)}
                  </span>
                </span>
              </div>
            </div>

            <div className="flex h-3 min-h-3 max-h-3 w-full min-w-0 items-center gap-0.5 text-[8px] leading-none text-primary/50">
              <MapPin className="h-2.5 w-2.5 shrink-0 text-primary/45" strokeWidth={2} aria-hidden />
              <span className="min-w-0 flex-1 truncate">{ad.city || t("ad-card.unknown_city")}</span>
              <span className="max-w-[45%] shrink-0 truncate text-end tabular-nums">
                {formatRelativeTime(ad.createdAt)}
              </span>
            </div>
          </div>
        </article>
      </Link>
    </div>
  );
}

export const HomeFeedAdCard = memo(HomeFeedAdCardInner, areHomeFeedAdCardPropsEqual);

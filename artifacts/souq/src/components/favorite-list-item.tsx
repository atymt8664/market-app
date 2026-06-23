import { Link, useLocation } from "wouter";
import {
  Eye,
  Heart,
  ImageIcon,
  MapPin,
  MoreVertical,
  Share2,
  Star,
  ThumbsUp,
} from "lucide-react";
import { memo, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUnfavoriteAd, type Ad } from "@workspace/api-client-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useLocale } from "@/hooks/use-locale";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/i18n";
import { createFavoriteToggleHandlers } from "@/lib/invalidate-ad-queries";
import {
  formatCurrencyAmount,
  formatPrice,
  formatRelativeTime,
} from "@/lib/format";
import { getPublicAdUrl } from "@/lib/public-url";
import { buildAdShareText } from "@/lib/share-text";
import { shareOrCopyLink, tryAdImageAsShareFile } from "@/lib/native-share";
import { cn } from "@/lib/utils";

const CARD_SHELL =
  "rounded-2xl border border-primary/40 bg-[#0A0A0A]/75 shadow-[0_0_22px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10 transition-[border-color,box-shadow] duration-200 hover:border-primary/45 hover:shadow-[0_0_26px_-12px_hsl(var(--primary)/0.22)]";

const dropdownSurface =
  "border border-primary/30 bg-[#0A0A0A]/95 text-foreground shadow-[0_0_24px_-8px_hsl(var(--primary)/0.2)]";

const dropdownItemClass =
  "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm focus:bg-primary/10 focus:text-foreground";

function priceTypeBadgeText(type: Ad["priceType"]) {
  if (type === "negotiable") return t("ad-card.negotiable");
  if (type === "fixed") return t("ad-card.fixed_price");
  if (type === "free") return t("ad-card.free");
  return t("ad-card.swap");
}

function FavoriteListImage({ ad }: { ad: Ad }) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = !!(ad.images?.[0]) && !imageFailed;

  if (hasImage) {
    return (
      <img
        src={ad.images![0]}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
        decoding="async"
        sizes="96px"
        draggable={false}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center bg-[#0A0A0A]"
      aria-hidden
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/28 bg-primary/[0.07] ring-1 ring-primary/15">
        <ImageIcon className="h-3.5 w-3.5 text-primary/70" strokeWidth={1.75} />
      </div>
    </div>
  );
}

type FavoriteListItemProps = {
  ad: Ad;
  viewerAuthKey: string;
};

function areFavoriteListItemEqual(
  prev: FavoriteListItemProps,
  next: FavoriteListItemProps,
): boolean {
  if (prev.viewerAuthKey !== next.viewerAuthKey) return false;
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

function FavoriteListItemInner({
  ad,
  viewerAuthKey: _viewerAuthKey,
}: FavoriteListItemProps) {
  const { locale } = useLocale();
  const numberLocale = locale === "de" ? "de-DE" : locale === "en" ? "en-US" : "ar";
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const [locationPath, navigate] = useLocation();
  const unfavMut = useUnfavoriteAd();

  const selectedCurrency =
    ((ad.details as Record<string, unknown> | undefined)?.selectedCurrency as
      | string
      | undefined) ?? "EUR";
  const priceLabel =
    ad.price == null
      ? formatPrice(ad.price, ad.priceType, selectedCurrency)
      : formatCurrencyAmount(ad.price, selectedCurrency, 0);

  const removeFavorite = useCallback(
    (e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      if (!user) {
        navigate(`/login?redirect=${encodeURIComponent(locationPath || "/favorites")}`);
        return;
      }
      if (!ad.isFavorited) return;

      const handlers = createFavoriteToggleHandlers(queryClient, ad);
      handlers.optimistic(false);

      unfavMut.mutate(
        { adId: ad.id },
        {
          onError: handlers.onError,
          onSuccess: (data) => {
            handlers.onSuccess(data);
            toast({ title: t("favorites.removed_toast") });
          },
        },
      );
    },
    [ad, locationPath, navigate, queryClient, toast, unfavMut, user],
  );

  const handleShare = useCallback(async () => {
    const url = getPublicAdUrl(ad.id);
    const text = buildAdShareText(ad, url);
    const imageFile = await tryAdImageAsShareFile(ad.images?.[0]);
    const outcome = await shareOrCopyLink({
      title: ad.title,
      text,
      url,
      imageFile,
    });
    if (outcome === "copied") {
      toast({ title: t("share.link_copied") });
    } else if (outcome === "failed") {
      toast({
        title: t("ad_detail.copy_failed"),
        description: t("ad_detail.copy_failed_desc"),
        variant: "destructive",
      });
    }
  }, [ad, toast]);

  const pending = unfavMut.isPending;

  const heartButton = (
    <button
      type="button"
      onClick={removeFavorite}
      onPointerDown={(e) => e.stopPropagation()}
      disabled={pending}
      aria-label={t("ad-card.remove_favorite")}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 bg-black/45 text-primary shadow-[0_0_10px_-4px_hsl(var(--primary)/0.2)] ring-1 ring-primary/15 transition-colors hover:border-primary/50 hover:bg-black/60 active:scale-95 disabled:pointer-events-none disabled:opacity-60"
    >
      <Heart
        className="h-3.5 w-3.5 fill-primary stroke-primary text-primary"
        strokeWidth={2.25}
        aria-hidden
      />
    </button>
  );

  return (
    <li>
      <article
        className={cn(CARD_SHELL, "overflow-hidden active:scale-[0.99]")}
        dir="rtl"
      >
        <div className="flex min-h-[5.75rem] items-stretch gap-2.5 p-2.5 sm:min-h-[6rem] sm:gap-3 sm:p-3">
          <div className="relative h-[5.25rem] w-[5.25rem] shrink-0 overflow-hidden rounded-xl border border-primary/25 bg-[#0A0A0A] sm:h-24 sm:w-24">
            <FavoriteListImage ad={ad} />
          </div>

          <Link
            href={`/ad/${ad.id}`}
            className="flex min-w-0 flex-1 flex-col justify-center gap-1 text-start outline-none"
          >
            <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-foreground [overflow-wrap:anywhere] sm:text-sm">
              {ad.title}
            </h3>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
              <p className="truncate text-[13px] font-bold tabular-nums text-primary sm:text-sm">
                {priceLabel}
              </p>
              <span className="inline-flex shrink-0 rounded-full border border-primary/35 bg-primary/10 px-1.5 py-0 text-[9px] text-primary">
                {priceTypeBadgeText(ad.priceType)}
              </span>
            </div>
            <div className="flex min-w-0 items-center gap-1 text-[10px] leading-none text-primary/50 sm:text-[11px]">
              <MapPin className="h-2.5 w-2.5 shrink-0 text-primary/40" strokeWidth={2} aria-hidden />
              <span className="min-w-0 flex-1 truncate">
                {ad.city || t("ad-card.unknown_city")}
              </span>
              <span className="shrink-0 tabular-nums">{formatRelativeTime(ad.createdAt)}</span>
            </div>
          </Link>

          <div className="flex shrink-0 flex-col items-center justify-between gap-1 py-0.5">
            {heartButton}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/20 bg-[#0A0A0A]/80 text-primary/80 transition-colors hover:border-primary/35 hover:text-primary"
                  aria-label={t("favorites.more_options")}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className={dropdownSurface} dir="rtl">
                <DropdownMenuItem className={dropdownItemClass} onSelect={() => removeFavorite()}>
                  <Heart className="h-4 w-4 shrink-0 fill-primary text-primary" strokeWidth={2} />
                  {t("ad-card.remove_favorite")}
                </DropdownMenuItem>
                <DropdownMenuItem className={dropdownItemClass} onSelect={() => void handleShare()}>
                  <Share2 className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.25} />
                  {t("profile.actions.share")}
                </DropdownMenuItem>
                <DropdownMenuItem className={dropdownItemClass} asChild>
                  <Link href={`/ad/${ad.id}`} className={dropdownItemClass}>
                    <Eye className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.25} />
                    {t("message_thread.menu_view_ad")}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid grid-cols-3 items-center gap-x-1 border-t border-primary/15 px-3 py-1.5 text-[9px] leading-none text-primary/60 sm:px-3.5 sm:text-[10px]">
          <span className="flex min-w-0 items-center justify-center gap-0.5">
            <Eye className="h-2.5 w-2.5 shrink-0 text-primary/45" strokeWidth={2} aria-hidden />
            <span className="truncate tabular-nums">
              {(ad.views ?? 0).toLocaleString(numberLocale)}
            </span>
          </span>
          <span className="flex min-w-0 items-center justify-center gap-0.5">
            <Star className="h-2.5 w-2.5 shrink-0 text-primary/45" strokeWidth={2} aria-hidden />
            <span className="truncate tabular-nums">
              {(ad.favoriteCount ?? 0).toLocaleString(numberLocale)}
            </span>
          </span>
          <span className="flex min-w-0 items-center justify-center gap-0.5">
            <ThumbsUp className="h-2.5 w-2.5 shrink-0 text-primary/45" strokeWidth={2} aria-hidden />
            <span className="truncate tabular-nums">
              {(ad.likeCount ?? 0).toLocaleString(numberLocale)}
            </span>
          </span>
        </div>
      </article>
    </li>
  );
}

const FavoriteListItemMemo = memo(FavoriteListItemInner, areFavoriteListItemEqual);

export function FavoriteListItem({ ad }: { ad: Ad }) {
  const { user } = useAuth();
  const viewerAuthKey = user ? `u:${user.id}` : "guest";
  return <FavoriteListItemMemo ad={ad} viewerAuthKey={viewerAuthKey} />;
}

export function FavoriteListItemSkeleton() {
  return (
    <li>
      <div className={cn(CARD_SHELL, "overflow-hidden")} dir="rtl" aria-hidden>
        <div className="flex min-h-[5.75rem] items-stretch gap-2.5 p-2.5 sm:min-h-[6rem] sm:gap-3 sm:p-3">
          <Skeleton className="h-[5.25rem] w-[5.25rem] shrink-0 rounded-xl bg-muted/40 sm:h-24 sm:w-24" />
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
            <Skeleton className="h-4 w-full rounded-md bg-muted/45" />
            <Skeleton className="h-3.5 w-2/5 rounded-md bg-muted/45" />
            <Skeleton className="h-3 w-3/5 rounded bg-muted/40" />
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <Skeleton className="h-8 w-8 rounded-full bg-muted/40" />
            <Skeleton className="h-8 w-8 rounded-full bg-muted/35" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1 border-t border-primary/15 px-3 py-1.5">
          <Skeleton className="mx-auto h-2.5 w-10 rounded bg-muted/35" />
          <Skeleton className="mx-auto h-2.5 w-10 rounded bg-muted/35" />
          <Skeleton className="mx-auto h-2.5 w-10 rounded bg-muted/35" />
        </div>
      </div>
    </li>
  );
}

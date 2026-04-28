import { Link } from "wouter";
import { Heart, MapPin, Eye, ThumbsUp, Star, ImageOff } from "lucide-react";
import { formatRelativeTime, formatPrice } from "@/lib/format";
import type { Ad } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useState } from "react";
import { t } from "@/i18n";

interface AdCardProps {
  ad: Ad;
  featured?: boolean;
}

export function AdCard({ ad, featured }: AdCardProps) {
  const [favorites, setFavorites] = useLocalStorage<number[]>("favorites", []);
  const [imageFailed, setImageFailed] = useState(false);
  const isFavorite = favorites.includes(ad.id);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isFavorite) {
      setFavorites(favorites.filter((id) => id !== ad.id));
    } else {
      setFavorites([...favorites, ad.id]);
    }
  };

  const isFree = ad.priceType === "free";
  const hasImage = !!(ad.images && ad.images.length > 0 && ad.images[0]) && !imageFailed;
  const priceTypeLabel = useMemo(() => {
    if (ad.priceType === "negotiable") return t("ad-card.negotiable");
    if (ad.priceType === "fixed") return t("ad-card.fixed_price");
    return null;
  }, [ad.priceType]);

  return (
    <Link href={`/ad/${ad.id}`}>
      <motion.div
        whileTap={{ scale: 0.98 }}
        className={cn(
          "group flex h-full w-full flex-col gap-2 rounded-lg md:rounded-xl border border-border bg-background p-2 md:p-3 relative overflow-hidden",
          featured
            ? "min-w-[176px] max-w-[176px] md:min-w-[208px] md:max-w-[208px]"
            : ""
        )}
      >
        <div className="relative flex gap-2 md:block">
          <div className="relative h-[84px] w-[112px] shrink-0 overflow-hidden rounded-md bg-muted md:h-auto md:w-full md:aspect-[4/3] md:rounded-lg">
            {hasImage ? (
              <img
                src={ad.images[0]}
                alt={ad.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-[10px] md:text-xs text-muted-foreground">
                <ImageOff className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span>{t("ad-card.no_image")}</span>
              </div>
            )}
            <button
              onClick={toggleFavorite}
              aria-label={isFavorite ? t("ad-card.remove_favorite") : t("ad-card.add_favorite")}
              className="absolute top-1.5 left-1.5 md:top-2 md:left-2 w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors shadow-md"
            >
              <motion.div
                animate={{ scale: isFavorite ? [1, 1.25, 1] : 1 }}
                transition={{ duration: 0.2 }}
              >
                <Heart
                  strokeWidth={2.5}
                  className={cn("w-3.5 h-3.5 md:w-4 md:h-4", isFavorite ? "fill-primary text-primary" : "text-white")}
                />
              </motion.div>
            </button>
          </div>

          <div className="min-w-0 flex flex-1 flex-col justify-between md:hidden">
            <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-foreground">{ad.title}</h3>
            <div className="mt-1 flex items-center justify-between gap-2">
              <div className="truncate text-sm font-bold leading-5 text-primary">
                {isFree ? t("ad-card.free") : formatPrice(ad.price, ad.priceType)}
              </div>
              {priceTypeLabel && (
                <span className="shrink-0 rounded-full border border-primary/35 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                  {priceTypeLabel}
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="w-3 h-3 shrink-0 text-primary/80" strokeWidth={2.25} />
              <span className="truncate">{ad.city || t("ad-card.unknown_city")}</span>
            </div>
          </div>
          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 text-white text-[10px] rounded-md backdrop-blur-sm md:bottom-2 md:right-2 md:px-2 md:text-[11px]">
            {isFree ? t("ad-card.free") : ad.type === "request" ? t("ad-card.request") : t("ad-card.offer")}
          </div>
        </div>

        <div className="hidden md:flex flex-col gap-1">
          <h3 className="font-semibold text-sm line-clamp-2 text-foreground leading-tight min-h-[2.35rem]">
            {ad.title}
          </h3>

          <div className="flex items-center justify-between gap-2 mt-0.5">
            <div className="text-primary font-bold text-[15px] leading-6 truncate">
              {isFree ? t("ad-card.free") : formatPrice(ad.price, ad.priceType)}
            </div>
            {priceTypeLabel && (
              <span className="shrink-0 rounded-full border border-primary/35 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                {priceTypeLabel}
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center text-[11px] text-muted-foreground gap-1">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-primary/80" strokeWidth={2.25} />
            <span className="truncate">{ad.city || t("ad-card.unknown_city")}</span>
            <span className="opacity-40">•</span>
            <span className="truncate">{formatRelativeTime(ad.createdAt)}</span>
          </div>

          <div className="mt-1 grid grid-cols-3 gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
            <MetaItem icon={<Eye className="w-3.5 h-3.5" />} text={(ad.views ?? 0).toLocaleString("ar")} />
            <MetaItem icon={<Star className="w-3.5 h-3.5" />} text={(ad.favoriteCount ?? 0).toLocaleString("ar")} />
            <MetaItem icon={<ThumbsUp className="w-3.5 h-3.5" />} text={(ad.likeCount ?? 0).toLocaleString("ar")} />
          </div>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground md:mt-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <MetaItem icon={<Eye className="w-3 h-3 md:w-3.5 md:h-3.5" />} text={(ad.views ?? 0).toLocaleString("ar")} />
            <MetaItem icon={<Star className="w-3 h-3 md:w-3.5 md:h-3.5" />} text={(ad.favoriteCount ?? 0).toLocaleString("ar")} />
            <MetaItem icon={<ThumbsUp className="w-3 h-3 md:w-3.5 md:h-3.5" />} text={(ad.likeCount ?? 0).toLocaleString("ar")} />
          </div>
          <span className="truncate text-[10px] md:text-[11px]">{formatRelativeTime(ad.createdAt)}</span>
        </div>
      </motion.div>
    </Link>
  );
}

export function AdCardSkeleton({ featured }: { featured?: boolean }) {
  return (
    <div className={cn(
      "flex h-full w-full flex-col gap-2 rounded-xl border border-border bg-background p-2.5 md:p-3",
      featured ? "min-w-[176px] max-w-[176px] md:min-w-[208px] md:max-w-[208px]" : ""
    )}>
      <Skeleton className="aspect-[4/3] w-full rounded-lg" />
      <div className="flex flex-col gap-1">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-5 w-1/2 mt-1" />
        <div className="grid grid-cols-2 gap-2 mt-1">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>
    </div>
  );
}

function MetaItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-1 min-w-0">
      <span className="shrink-0 text-primary/80">{icon}</span>
      <span className="truncate">{text}</span>
    </div>
  );
}

import { Link } from "wouter";
import { Heart, MapPin, Eye, ThumbsUp, Star, ImageOff } from "lucide-react";
import { formatRelativeTime, formatPrice } from "@/lib/format";
import type { Ad } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useState } from "react";

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
    if (ad.priceType === "negotiable") return "قابل للتفاوض";
    if (ad.priceType === "fixed") return "سعر ثابت";
    return null;
  }, [ad.priceType]);

  return (
    <Link href={`/ad/${ad.id}`}>
      <motion.div
        whileTap={{ scale: 0.98 }}
        className={cn(
          "group flex h-full w-full flex-col gap-2 rounded-xl border border-border bg-background p-2.5 md:p-3 relative overflow-hidden",
          featured
            ? "min-w-[176px] max-w-[176px] md:min-w-[208px] md:max-w-[208px]"
            : ""
        )}
      >
        <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted">
          {hasImage ? (
            <img
              src={ad.images[0]}
              alt={ad.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground text-xs">
              <ImageOff className="w-4 h-4" />
              <span>لا توجد صورة</span>
            </div>
          )}
          <button
            onClick={toggleFavorite}
            aria-label={isFavorite ? "إزالة من المفضلة" : "إضافة للمفضلة"}
            className="absolute top-2 left-2 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors shadow-md"
          >
            <motion.div
              animate={{ scale: isFavorite ? [1, 1.25, 1] : 1 }}
              transition={{ duration: 0.2 }}
            >
              <Heart
                strokeWidth={2.5}
                className={cn("w-4 h-4", isFavorite ? "fill-primary text-primary" : "text-white")}
              />
            </motion.div>
          </button>
          
          <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 text-white text-[11px] rounded-md backdrop-blur-sm">
            {isFree ? "مجاناً" : ad.type === "request" ? "طلب" : "عرض"}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-sm line-clamp-2 text-foreground leading-tight min-h-[2.35rem]">
            {ad.title}
          </h3>

          <div className="flex items-center justify-between gap-2 mt-0.5">
            <div className="text-primary font-bold text-[15px] leading-6 truncate">
              {isFree ? "مجاناً" : formatPrice(ad.price, ad.priceType)}
            </div>
            {priceTypeLabel && (
              <span className="shrink-0 rounded-full border border-primary/35 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                {priceTypeLabel}
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center text-[11px] text-muted-foreground gap-1">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-primary/80" strokeWidth={2.25} />
            <span className="truncate">{ad.city || "غير محدد"}</span>
            <span className="opacity-40">•</span>
            <span className="truncate">{formatRelativeTime(ad.createdAt)}</span>
          </div>

          <div className="mt-1 grid grid-cols-3 gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
            <MetaItem icon={<Eye className="w-3.5 h-3.5" />} text={(ad.views ?? 0).toLocaleString("ar")} />
            <MetaItem icon={<Star className="w-3.5 h-3.5" />} text={(ad.favoriteCount ?? 0).toLocaleString("ar")} />
            <MetaItem icon={<ThumbsUp className="w-3.5 h-3.5" />} text={(ad.likeCount ?? 0).toLocaleString("ar")} />
          </div>
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
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="shrink-0 text-primary/80">{icon}</span>
      <span className="truncate">{text}</span>
    </div>
  );
}

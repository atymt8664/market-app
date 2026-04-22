import { Link } from "wouter";
import { Heart, MapPin } from "lucide-react";
import { formatRelativeTime, formatPrice } from "@/lib/format";
import type { Ad } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

interface AdCardProps {
  ad: Ad;
  featured?: boolean;
}

export function AdCard({ ad, featured }: AdCardProps) {
  const [favorites, setFavorites] = useLocalStorage<number[]>("favorites", []);
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

  return (
    <Link href={`/ad/${ad.id}`}>
      <motion.div
        whileTap={{ scale: 0.98 }}
        className={cn(
          "group flex flex-col gap-2 rounded-lg bg-background p-2 border border-border relative overflow-hidden",
          featured ? "min-w-[160px] max-w-[160px]" : "w-full"
        )}
      >
        <div className="relative aspect-square rounded-md overflow-hidden bg-muted">
          {ad.images && ad.images.length > 0 ? (
            <img
              src={ad.images[0]}
              alt={ad.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
              لا توجد صورة
            </div>
          )}
          <button
            onClick={toggleFavorite}
            className="absolute top-2 left-2 p-1.5 rounded-full bg-black/20 backdrop-blur-sm hover:bg-black/40 transition-colors"
          >
            <motion.div
              animate={{ scale: isFavorite ? [1, 1.2, 1] : 1 }}
              transition={{ duration: 0.2 }}
            >
              <Heart
                className={cn("w-4 h-4", isFavorite ? "fill-primary text-primary" : "text-white")}
              />
            </motion.div>
          </button>
          
          {isFree && (
            <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-bold rounded">
              مجاناً
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-sm line-clamp-2 text-foreground leading-tight min-h-[2.5rem]">
            {ad.title}
          </h3>
          
          {!isFree && (
            <div className="text-primary font-bold text-base">
              {formatPrice(ad.price, ad.priceType)}
            </div>
          )}
          
          <div className="flex items-center text-xs text-muted-foreground gap-1 mt-1">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{ad.city}</span>
            <span className="mx-1 opacity-50">•</span>
            <span className="truncate shrink-0">{formatRelativeTime(ad.createdAt)}</span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

export function AdCardSkeleton({ featured }: { featured?: boolean }) {
  return (
    <div className={cn(
      "flex flex-col gap-2 rounded-lg bg-background p-2 border border-border",
      featured ? "min-w-[160px] max-w-[160px]" : "w-full"
    )}>
      <Skeleton className="aspect-square w-full rounded-md" />
      <div className="flex flex-col gap-1">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-5 w-1/2 mt-1" />
        <div className="flex gap-2 mt-1">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
    </div>
  );
}

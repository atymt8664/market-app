import { useListAds, getListAdsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Heart, Search } from "lucide-react";
import { AdCard, AdCardSkeleton } from "@/components/ad-card";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function Favorites() {
  const [favorites] = useLocalStorage<number[]>("favorites", []);

  const { data: ads, isLoading } = useListAds(
    {},
    { query: { queryKey: getListAdsQueryKey({}) } }, // We fetch all for simplicity, then filter client side
  );

  const favoriteAds = (Array.isArray(ads) ? ads : []).filter((ad) =>
    favorites.includes(ad.id),
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col w-full min-h-[100dvh] bg-background"
    >
      <header className="sticky top-0 z-40 bg-background border-b border-border p-4">
        <h1 className="font-bold text-xl flex items-center gap-2">
          <Heart className="w-6 h-6 text-primary fill-primary" />
          المفضلة
        </h1>
      </header>

      <div className="p-4 flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 pb-20">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <AdCardSkeleton key={i} />)
          ) : favoriteAds.length > 0 ? (
            favoriteAds.map((ad) => <AdCard key={ad.id} ad={ad} />)
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
                <Heart className="w-10 h-10 text-muted-foreground opacity-50" />
              </div>
              <h3 className="text-xl font-bold mb-2">قائمتك فارغة</h3>
              <p className="text-muted-foreground mb-6">
                احفظ الإعلانات التي تعجبك للعودة إليها لاحقاً.
              </p>
              <Link href="/">
                <Button variant="outline" className="gap-2">
                  <Search className="w-4 h-4" />
                  تصفح الإعلانات
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

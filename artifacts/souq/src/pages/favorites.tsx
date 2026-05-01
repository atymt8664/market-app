import {
  useListFavoriteAds,
  getListFavoriteAdsQueryKey,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { Heart, Search } from "lucide-react";
import { AdCard, AdCardSkeleton } from "@/components/ad-card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { t } from "@/i18n";

export default function Favorites() {
  const { user, isLoading: authLoading } = useAuth();

  const { data, isLoading } = useListFavoriteAds({
    query: {
      queryKey: getListFavoriteAdsQueryKey(),
      enabled: !!user,
      retry: false,
    },
  });

  if (!authLoading && !user) return <Redirect to="/guest-welcome?redirect=/favorites" />;

  const favoriteAds = Array.isArray(data) ? data : [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-[100dvh] w-full flex-col bg-background"
    >
      <header className="sticky top-0 z-40 border-b border-border bg-background p-4">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Heart className="h-6 w-6 fill-primary text-primary" />
          {t("favorites.title")}
        </h1>
      </header>

      <div className="flex-1 p-4 pb-20">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <AdCardSkeleton key={i} />)
          ) : favoriteAds.length > 0 ? (
            favoriteAds.map((ad) => (
              <AdCard key={ad.id} ad={ad} favoritesList />
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
                <Heart className="h-10 w-10 text-muted-foreground opacity-50" />
              </div>
              <h3 className="mb-2 text-xl font-bold">{t("favorites.empty_title")}</h3>
              <p className="mb-6 text-muted-foreground">
                {t("favorites.empty_desc")}
              </p>
              <Link href="/">
                <Button variant="outline" className="gap-2">
                  <Search className="h-4 w-4" />
                  {t("favorites.browse_ads")}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

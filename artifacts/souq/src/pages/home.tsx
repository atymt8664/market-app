import {
  useListCategories,
  useListFeaturedAds,
  useListRecommendedAds,
  useListAds,
  getListAdsQueryKey,
} from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Search, ChevronLeft } from "lucide-react";
import { AdCard, AdCardSkeleton } from "@/components/ad-card";
import { CategoryIcon } from "@/components/category-icon";
import { LocationPicker } from "@/components/location-picker";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useState } from "react";
import { motion } from "framer-motion";
import { useSelectedCity } from "@/hooks/use-selected-city";

export default function Home() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { city } = useSelectedCity();

  const { data: categories, isLoading: isLoadingCategories } =
    useListCategories();
  const { data: featuredAds, isLoading: isLoadingFeatured } =
    useListFeaturedAds();
  const { data: defaultRecommended, isLoading: isLoadingDefaultRec } =
    useListRecommendedAds({
      query: {
        queryKey: ["recommended-ads"],
        enabled: !city,
      },
    });
  const { data: cityAds, isLoading: isLoadingCityAds } = useListAds(
    { city, limit: 20 },
    {
      query: {
        queryKey: getListAdsQueryKey({ city, limit: 20 }),
        enabled: !!city,
      },
    },
  );
  const recommendedAds = city ? cityAds : defaultRecommended;
  const isLoadingRecommended = city ? isLoadingCityAds : isLoadingDefaultRec;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const cityParam = city ? `&city=${encodeURIComponent(city)}` : "";
      setLocation(`/search?q=${encodeURIComponent(searchQuery)}${cityParam}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col w-full min-h-screen bg-background"
    >
      {/* Header / Sticky Search */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="mx-auto w-full max-w-screen-xl px-4 md:px-6 lg:px-8 py-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <img src="/logo.png" alt="سوق العرب" className="h-8 object-contain" />
            <LocationPicker />
          </div>

          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="عن ماذا تبحث؟"
              className="w-full pl-4 pr-10 py-6 bg-muted/50 border-transparent focus-visible:ring-primary rounded-xl text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
        </div>
      </header>

      {/* Categories Horizontal Scroll */}
      <section className="py-4">
        <div className="mx-auto w-full max-w-screen-xl px-4 md:px-6 lg:px-8 flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">التصنيفات</h2>
          <Link
            href="/categories"
            className="text-primary text-sm font-medium flex items-center"
          >
            عرض الكل <ChevronLeft className="w-4 h-4" />
          </Link>
        </div>
        <ScrollArea className="w-full whitespace-nowrap" dir="rtl">
          <div className="mx-auto w-full max-w-screen-xl flex gap-4 px-4 md:px-6 lg:px-8 pb-2">
            {isLoadingCategories
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
                    <div className="w-12 h-3 bg-muted animate-pulse rounded" />
                  </div>
                ))
              : Array.isArray(categories) &&
                categories.map((cat) => (
                  <Link key={cat.id} href={`/category/${cat.id}`}>
                    <div className="flex flex-col items-center gap-2 group cursor-pointer">
                      <div className="w-16 h-16 rounded-2xl bg-primary/15 text-primary flex items-center justify-center group-active:scale-95 transition-transform border border-primary/20">
                        <CategoryIcon name={cat.icon} className="w-7 h-7" />
                      </div>
                      <span className="text-xs font-medium text-center w-16 truncate">
                        {cat.name}
                      </span>
                    </div>
                  </Link>
                ))}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>
      </section>

      {/* Featured Ads */}
      <section className="py-2 bg-muted/30">
        <div className="mx-auto w-full max-w-screen-xl px-4 md:px-6 lg:px-8 mb-3">
          <h2 className="font-bold text-lg">إعلانات مميزة</h2>
        </div>
        <ScrollArea className="w-full whitespace-nowrap" dir="rtl">
          <div className="mx-auto w-full max-w-screen-xl flex gap-4 px-4 md:px-6 lg:px-8 pb-4">
            {isLoadingFeatured ? (
              Array.from({ length: 3 }).map((_, i) => (
                <AdCardSkeleton key={i} featured />
              ))
            ) : Array.isArray(featuredAds) && featuredAds.length ? (
              featuredAds.map((ad) => <AdCard key={ad.id} ad={ad} featured />)
            ) : (
              <div className="text-sm text-muted-foreground w-full text-center py-4">
                لا توجد إعلانات مميزة حالياً
              </div>
            )}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>
      </section>

      {/* Recommended Ads Grid */}
      <section className="mx-auto w-full max-w-screen-xl px-4 md:px-6 lg:px-8 py-4">
        <h2 className="font-bold text-lg mb-4">موصى لك</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 lg:gap-5">
          {isLoadingRecommended ? (
            Array.from({ length: 6 }).map((_, i) => <AdCardSkeleton key={i} />)
          ) : Array.isArray(recommendedAds) && recommendedAds.length ? (
            recommendedAds.map((ad) => <AdCard key={ad.id} ad={ad} />)
          ) : (
            <div className="col-span-full text-sm text-muted-foreground text-center py-8">
              لا توجد إعلانات حالياً
            </div>
          )}
        </div>
      </section>
    </motion.div>
  );
}

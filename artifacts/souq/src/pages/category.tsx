import { useListAds, useListSubcategories, getListAdsQueryKey } from "@workspace/api-client-react";
import { Link, useParams } from "wouter";
import { ArrowRight } from "lucide-react";
import { AdCard, AdCardSkeleton } from "@/components/ad-card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";

export default function Category() {
  const params = useParams();
  const categoryId = Number(params.id);

  const { data: subcategories, isLoading: isLoadingSubs } = useListSubcategories(categoryId);
  const { data: ads, isLoading: isLoadingAds } = useListAds({ categoryId }, { query: { enabled: !!categoryId, queryKey: getListAdsQueryKey({ categoryId }) } });

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col w-full min-h-[100dvh] bg-background"
    >
      <header className="sticky top-0 z-40 bg-background border-b border-border p-4 flex items-center gap-4">
        <Link href="/categories">
          <button className="p-2 -mr-2 rounded-full hover:bg-muted active:scale-95 transition-all">
            <ArrowRight className="w-5 h-5" />
          </button>
        </Link>
        <h1 className="font-bold text-xl">إعلانات التصنيف</h1>
      </header>

      {/* Subcategories */}
      <div className="border-b border-border bg-muted/20">
        <ScrollArea className="w-full whitespace-nowrap" dir="rtl">
          <div className="flex gap-2 p-3">
            {isLoadingSubs ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-8 w-24 bg-muted animate-pulse rounded-full" />
              ))
            ) : (
              subcategories?.map((sub) => (
                <Link key={sub.id} href={`/search?categoryId=${categoryId}&subcategoryId=${sub.id}`}>
                  <div className="px-4 py-1.5 bg-background border border-border rounded-full text-sm font-medium hover:bg-muted active:scale-95 transition-all cursor-pointer">
                    {sub.name}
                  </div>
                </Link>
              ))
            )}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>
      </div>

      {/* Ads Grid */}
      <div className="p-4 flex-1">
        <div className="grid grid-cols-2 gap-3">
          {isLoadingAds ? (
            Array.from({ length: 6 }).map((_, i) => (
              <AdCardSkeleton key={i} />
            ))
          ) : ads?.length ? (
            ads.map((ad) => (
              <AdCard key={ad.id} ad={ad} />
            ))
          ) : (
            <div className="col-span-2 flex flex-col items-center justify-center py-12 text-center opacity-80">
              <img src="/empty-state.png" alt="لا توجد إعلانات" className="w-48 h-48 mb-4" />
              <h2 className="text-xl font-bold mb-2">لا توجد إعلانات</h2>
              <p className="text-muted-foreground">لم يتم العثور على إعلانات في هذا التصنيف.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

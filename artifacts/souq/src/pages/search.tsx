import { useListAds, getListAdsQueryKey } from "@workspace/api-client-react";
import { Link, useSearch } from "wouter";
import { ArrowRight, Filter, Search as SearchIcon } from "lucide-react";
import { AdCard, AdCardSkeleton } from "@/components/ad-card";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { motion } from "framer-motion";

export default function Search() {
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  
  const initialQ = searchParams.get("q") || "";
  const categoryId = searchParams.get("categoryId") ? Number(searchParams.get("categoryId")) : undefined;
  const subcategoryId = searchParams.get("subcategoryId") ? Number(searchParams.get("subcategoryId")) : undefined;

  const [query, setQuery] = useState(initialQ);
  const debouncedQuery = useDebounce(query, 500);

  const { data: ads, isLoading } = useListAds(
    { q: debouncedQuery || undefined, categoryId, subcategoryId },
    { query: { queryKey: getListAdsQueryKey({ q: debouncedQuery || undefined, categoryId, subcategoryId }) } }
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col w-full min-h-[100dvh] bg-background"
    >
      <header className="sticky top-0 z-40 bg-background border-b border-border p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Link href="/">
            <button className="p-2 -mr-2 rounded-full hover:bg-muted active:scale-95 transition-all">
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
          <div className="relative flex-1">
            <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              type="search"
              placeholder="بحث..." 
              className="w-full pl-4 pr-9 py-2 bg-muted/50 border-transparent focus-visible:ring-primary rounded-lg text-sm h-10"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <button className="p-2 bg-muted rounded-lg active:scale-95 transition-transform text-primary">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="p-4 flex-1">
        <h2 className="font-semibold text-sm text-muted-foreground mb-4">
          {isLoading ? "جاري البحث..." : `تم العثور على ${ads?.length || 0} نتيجة`}
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <AdCardSkeleton key={i} />
            ))
          ) : ads?.length ? (
            ads.map((ad) => (
              <AdCard key={ad.id} ad={ad} />
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center opacity-80">
              <img src="/empty-state.png" alt="لا توجد نتائج" className="w-48 h-48 mb-4" />
              <h2 className="text-xl font-bold mb-2">لا توجد نتائج</h2>
              <p className="text-muted-foreground">جرب كلمات بحث مختلفة أو تصفح الأقسام.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

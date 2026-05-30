import { useGetAdsStats } from "@workspace/api-client-react";
import { Link } from "wouter";
import { ArrowRight, BarChart3, MapPin, Tag } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

export default function Stats() {
  const { data: stats, isLoading } = useGetAdsStats();

  const maxCatCount = Math.max(...(stats?.byCategory.map(c => c.count) || [1]));
  const maxCityCount = Math.max(...(stats?.byCity.map(c => c.count) || [1]));

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col w-full min-h-[100dvh] bg-[#0A0A0A] pb-20"
    >
      <header className="sticky top-0 z-40 bg-[#0A0A0A]/95 backdrop-blur border-b border-border">
        <div className="mx-auto w-full max-w-5xl px-4 md:px-6 py-4 flex items-center gap-4">
          <Link href="/profile">
            <button className="p-2 -mr-2 rounded-full hover:bg-muted active:scale-95 transition-all">
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
          <h1 className="font-bold text-xl flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            حالة السوق
          </h1>
        </div>
      </header>

      {isLoading ? (
        <div className="mx-auto w-full max-w-5xl px-4 md:px-6 py-5 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      ) : stats ? (
        <div className="mx-auto w-full max-w-5xl px-4 md:px-6 py-5 space-y-6">
          
          {/* Top Level Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-primary/10 rounded-xl p-4 flex flex-col items-center justify-center text-center border border-primary/20">
              <span className="text-3xl font-bold text-primary mb-1">{stats.totalAds}</span>
              <span className="text-xs font-medium opacity-80">إعلان نشط</span>
            </div>
            <div className="bg-muted rounded-xl p-4 flex flex-col items-center justify-center text-center border border-border">
              <span className="text-3xl font-bold mb-1">{stats.totalCategories}</span>
              <span className="text-xs font-medium opacity-80">أقسام رئيسية</span>
            </div>
            <div className="bg-muted rounded-xl p-4 flex flex-col items-center justify-center text-center border border-border">
              <span className="text-3xl font-bold mb-1">{stats.totalCities}</span>
              <span className="text-xs font-medium opacity-80">مدينة نشطة</span>
            </div>
          </div>

          {/* Top Categories */}
          <div className="bg-[#0A0A0A] border border-border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="w-5 h-5 text-muted-foreground" />
              <h2 className="font-bold text-lg">الأقسام الأكثر نشاطاً</h2>
            </div>
            <div className="space-y-4">
              {stats.byCategory.map((cat, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-sm font-medium">
                    <span>{cat.categoryName}</span>
                    <span className="text-muted-foreground">{cat.count}</span>
                  </div>
                  <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(cat.count / maxCatCount) * 100}%` }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Cities */}
          <div className="bg-[#0A0A0A] border border-border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <h2 className="font-bold text-lg">المدن الأكثر نشاطاً</h2>
            </div>
            <div className="space-y-4">
              {stats.byCity.map((city, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 text-center text-sm font-bold opacity-50">{i + 1}</div>
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="flex justify-between text-sm font-medium">
                      <span>{city.city}</span>
                      <span className="text-muted-foreground">{city.count}</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(city.count / maxCityCount) * 100}%` }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                        className="h-full bg-violet-500 rounded-full"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      ) : null}
    </motion.div>
  );
}

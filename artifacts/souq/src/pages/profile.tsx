import { useListAds, getListAdsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { User, Settings, ArrowRight } from "lucide-react";
import { AdCard, AdCardSkeleton } from "@/components/ad-card";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function Profile() {
  const [profile] = useLocalStorage("seller_profile", { name: "", phone: "", city: "" });
  
  const { data: ads, isLoading } = useListAds(
    { q: profile.name }, // Simple filter for v1 based on name
    { query: { enabled: !!profile.name, queryKey: getListAdsQueryKey({ q: profile.name }) } }
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col w-full min-h-[100dvh] bg-background"
    >
      <header className="bg-primary pt-8 pb-4 px-4 text-primary-foreground relative">
        <div className="absolute top-4 left-4 flex gap-2">
          <Link href="/stats">
            <button className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center active:scale-95 transition-transform">
              <ArrowRight className="w-5 h-5 rotate-[135deg]" /> 
              {/* Using rotated arrow to imply stats/trend */}
            </button>
          </Link>
          <button className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center active:scale-95 transition-transform">
            <Settings className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center mt-6">
          <div className="w-24 h-24 rounded-full bg-white/20 border-4 border-white/40 flex items-center justify-center text-4xl mb-3 overflow-hidden shadow-lg">
            {profile.name ? profile.name.charAt(0) : <User className="w-10 h-10 opacity-70" />}
          </div>
          <h1 className="text-2xl font-bold">{profile.name || "ضيف جديد"}</h1>
          <p className="opacity-80 mt-1">{profile.city || "لم يتم تحديد المدينة"}</p>
          <p className="text-sm opacity-70 font-mono mt-1" dir="ltr">{profile.phone || "لا يوجد رقم مسجل"}</p>
        </div>
      </header>

      <div className="p-4 flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">إعلاناتي</h2>
          <span className="text-muted-foreground text-sm">{ads?.length || 0} إعلانات</span>
        </div>

        <div className="grid grid-cols-2 gap-3 pb-20">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <AdCardSkeleton key={i} />
            ))
          ) : ads && ads.length > 0 ? (
            ads.map((ad) => (
              <AdCard key={ad.id} ad={ad} />
            ))
          ) : (
            <div className="col-span-2 flex flex-col items-center justify-center py-12 text-center">
              <img src="/empty-state.png" alt="لا توجد إعلانات" className="w-48 h-48 opacity-80 mb-4" />
              <h3 className="text-xl font-bold mb-2">ليس لديك إعلانات بعد</h3>
              <p className="text-muted-foreground mb-6">ابدأ ببيع أشيائك المستعملة بسهولة ومجاناً.</p>
              <Link href="/new">
                <Button className="px-8 font-bold">أنشئ أول إعلان</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

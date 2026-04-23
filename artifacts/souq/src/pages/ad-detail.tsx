import {
  useGetAd,
  getGetAdQueryKey,
  useRecordAdView,
  useStartConversation,
} from "@workspace/api-client-react";
import { Link, useLocation, useParams } from "wouter";
import { ArrowRight, MapPin, Share2, Heart, Copy, CheckCircle2, MessageCircle, Phone, Eye, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { formatRelativeTime, formatPrice } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";

export default function AdDetail() {
  const params = useParams();
  const id = Number(params.id);
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: ad, isLoading } = useGetAd(id, { query: { enabled: !!id, queryKey: getGetAdQueryKey(id) } });

  const [favorites, setFavorites] = useLocalStorage<number[]>("favorites", []);
  const isFavorite = ad ? favorites.includes(ad.id) : false;
  const [copied, setCopied] = useState(false);
  const [viewCount, setViewCount] = useState<number | null>(null);

  const recordView = useRecordAdView();
  const viewedRef = useRef<number | null>(null);
  useEffect(() => {
    if (!id || viewedRef.current === id) return;
    viewedRef.current = id;
    recordView.mutate(
      { adId: id },
      {
        onSuccess: (data) => setViewCount(data.views),
        onError: () => { /* ignore */ },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const startConversation = useStartConversation();
  const handleMessage = () => {
    if (!ad) return;
    if (!user) {
      navigate(`/login?redirect=/ad/${ad.id}`);
      return;
    }
    if (ad.userId && ad.userId === user.id) {
      toast({ title: "هذا إعلانك", description: "لا يمكنك مراسلة نفسك" });
      return;
    }
    startConversation.mutate(
      { data: { adId: ad.id } },
      {
        onSuccess: (data) => {
          navigate(`/messages/${data.id}`);
        },
        onError: (err: unknown) => {
          const e = err as { data?: { error?: string } };
          toast({
            title: "تعذّر فتح المحادثة",
            description: e?.data?.error || "حاول مرة أخرى",
            variant: "destructive",
          });
        },
      },
    );
  };

  const toggleFavorite = () => {
    if (!ad) return;
    if (isFavorite) {
      setFavorites(favorites.filter(fId => fId !== ad.id));
    } else {
      setFavorites([...favorites, ad.id]);
    }
  };

  const handleCopyPhone = () => {
    if (!ad) return;
    navigator.clipboard.writeText(ad.sellerPhone);
    setCopied(true);
    toast({
      title: "تم النسخ",
      description: "تم نسخ رقم الهاتف بنجاح",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: ad?.title,
        url: window.location.href
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "تم نسخ الرابط" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col w-full min-h-[100dvh] bg-background">
        <Skeleton className="w-full aspect-square" />
        <div className="p-4 flex flex-col gap-4">
          <Skeleton className="w-2/3 h-8" />
          <Skeleton className="w-1/3 h-6" />
          <Skeleton className="w-full h-24 mt-4" />
        </div>
      </div>
    );
  }

  if (!ad) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-background p-4 text-center">
        <h2 className="text-2xl font-bold mb-2">الإعلان غير موجود</h2>
        <p className="text-muted-foreground mb-6">ربما تم حذف هذا الإعلان أو أن الرابط غير صحيح.</p>
        <Link href="/">
          <Button>العودة للصفحة الرئيسية</Button>
        </Link>
      </div>
    );
  }

  const isFree = ad.priceType === "free";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col w-full min-h-[100dvh] bg-background pb-24"
    >
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <div className="w-full max-w-[480px] px-4 py-3 flex justify-between items-center pointer-events-auto">
          <Link href="/">
            <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-transform">
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex gap-2">
            <button onClick={handleShare} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-transform">
              <Share2 className="w-5 h-5" />
            </button>
            <button onClick={toggleFavorite} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center active:scale-95 transition-transform">
              <Heart className={`w-5 h-5 ${isFavorite ? "fill-primary text-primary" : "text-white"}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Images Carousel */}
      <div className="w-full aspect-square bg-muted relative">
        {ad.images && ad.images.length > 0 ? (
          <Carousel className="w-full h-full" dir="ltr">
            <CarouselContent className="h-full">
              {ad.images.map((img, i) => (
                <CarouselItem key={i} className="h-full">
                  <img src={img} alt={`${ad.title} - صورة ${i + 1}`} className="w-full h-full object-cover" />
                </CarouselItem>
              ))}
            </CarouselContent>
            {ad.images.length > 1 && (
              <>
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1 z-10">
                  {ad.images.map((_, i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-white/50 backdrop-blur-sm" />
                  ))}
                </div>
              </>
            )}
          </Carousel>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            لا توجد صور
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Title and Price */}
        <div>
          <h1 className="text-xl font-bold leading-tight mb-2">{ad.title}</h1>
          {isFree ? (
            <div className="text-primary font-bold text-2xl">مجاناً</div>
          ) : (
            <div className="text-primary font-bold text-2xl flex items-center gap-2">
              {formatPrice(ad.price, ad.priceType)}
              {ad.priceType === "negotiable" && (
                <span className="text-sm font-medium bg-primary/10 px-2 py-0.5 rounded-md text-primary">قابل للتفاوض</span>
              )}
            </div>
          )}
          <div className="flex items-center flex-wrap text-sm text-muted-foreground gap-x-1 gap-y-1 mt-2">
            <MapPin className="w-4 h-4 shrink-0" />
            <span>{ad.city}</span>
            <span className="mx-2 opacity-50">•</span>
            <span>{formatRelativeTime(ad.createdAt)}</span>
            <span className="mx-2 opacity-50">•</span>
            <Eye className="w-4 h-4 shrink-0" />
            <span>{(viewCount ?? ad.views ?? 0).toLocaleString("ar")} مشاهدة</span>
          </div>
        </div>

        <Separator />

        {/* Description */}
        <div>
          <h3 className="font-semibold mb-2">الوصف</h3>
          <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">
            {ad.description}
          </p>
        </div>

        <Separator />

        {/* Details List */}
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between py-1 border-b border-border/50">
            <span className="text-muted-foreground">القسم</span>
            <span className="font-medium">{ad.categoryName}</span>
          </div>
          {ad.subcategoryName && (
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">الفئة الفرعية</span>
              <span className="font-medium">{ad.subcategoryName}</span>
            </div>
          )}
          <div className="flex justify-between py-1 border-b border-border/50">
            <span className="text-muted-foreground">نوع الإعلان</span>
            <span className="font-medium">{ad.type === "offer" ? "عرض" : "طلب"}</span>
          </div>
        </div>

        <Separator />

        {/* Seller Info */}
        <div className="flex flex-col gap-3 p-3 rounded-xl border border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0">
              {ad.sellerName.charAt(0)}
            </div>
            <div className="flex-1 flex flex-col min-w-0">
              <span className="font-semibold truncate">{ad.sellerName}</span>
              <span className="text-xs text-muted-foreground">عضو في سوق العرب</span>
            </div>
          </div>
          <Button
            type="button"
            onClick={handleMessage}
            disabled={startConversation.isPending}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-5 text-base shadow-md shadow-primary/20 flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-5 h-5" />
            راسل البائع داخل التطبيق
          </Button>
          <Button
            type="button"
            onClick={() => {
              const text = encodeURIComponent(`مرحباً، أنا مهتم بإعلانك: ${ad.title}`);
              window.open(
                `https://wa.me/${ad.sellerPhone.replace(/[^0-9+]/g, "")}?text=${text}`,
                "_blank",
              );
            }}
            variant="outline"
            className="w-full border-2 border-[#25D366]/40 hover:bg-[#25D366]/10 text-[#25D366] hover:text-[#25D366] font-bold py-5 text-base flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            تواصل عبر واتساب
          </Button>
          <button
            type="button"
            onClick={handleCopyPhone}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-md border border-border bg-background text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            <Phone className="w-4 h-4" />
            <span dir="ltr" className="font-mono">{ad.sellerPhone}</span>
            {copied ? (
              <CheckCircle2 className="w-4 h-4 text-primary" />
            ) : (
              <Copy className="w-4 h-4 opacity-60" />
            )}
          </button>
        </div>
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 flex justify-center pointer-events-none z-40">
        <div className="w-full max-w-[480px] bg-background border-t border-border p-4 flex gap-3 pointer-events-auto">
          <Button
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 text-base shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            onClick={handleMessage}
            disabled={startConversation.isPending}
          >
            <MessageSquare className="w-5 h-5" />
            راسل البائع
          </Button>
          <Button
            variant="outline"
            className="flex-none py-6 px-4 border-2 text-[#25D366] border-[#25D366]/40"
            onClick={() => {
              const text = encodeURIComponent(`مرحباً، أنا مهتم بإعلانك: ${ad.title}`);
              window.open(`https://wa.me/${ad.sellerPhone.replace(/[^0-9+]/g, '')}?text=${text}`, '_blank');
            }}
            aria-label="WhatsApp"
          >
            <MessageCircle className="w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            className="flex-none py-6 px-4 border-2"
            onClick={handleCopyPhone}
            aria-label="Copy phone"
          >
            {copied ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <Copy className="w-5 h-5" />}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

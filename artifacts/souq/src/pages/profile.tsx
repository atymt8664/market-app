import { Link, useLocation } from "wouter";
import {
  User,
  LogIn,
  UserPlus,
  Trash2,
  Pencil,
  Plus,
  Settings,
  Share2,
  ShieldCheck,
  Eye,
  Heart,
  ChevronLeft,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  useListMyAds,
  useDeleteAd,
  getListMyAdsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { AdCard, AdCardSkeleton } from "@/components/ad-card";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Profile() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteAdMutation = useDeleteAd();
  const [adToDelete, setAdToDelete] = useState<number | null>(null);
  const [favorites] = useLocalStorage<number[]>("favorites", []);

  const { data: myAds, isLoading: adsLoading } = useListMyAds({
    query: {
      queryKey: getListMyAdsQueryKey(),
      enabled: !!user,
      retry: false,
    },
  });

  if (authLoading) {
    return (
      <div className="flex flex-col w-full min-h-[100dvh] bg-background items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-muted border-t-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col w-full min-h-[100dvh] bg-background"
      >
        <header className="bg-primary pt-12 pb-10 px-4 text-primary-foreground flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-white/20 border-4 border-white/40 flex items-center justify-center mb-3 shadow-lg">
            <User className="w-12 h-12 opacity-80" />
          </div>
          <h1 className="text-xl font-bold">مرحباً بك</h1>
          <p className="opacity-80 text-sm mt-1">سجّل الدخول لإدارة إعلاناتك</p>
        </header>

        <div className="p-6 flex flex-col gap-3">
          <Link href="/login">
            <Button className="w-full py-6 text-base font-bold gap-2">
              <LogIn className="w-5 h-5" /> تسجيل الدخول
            </Button>
          </Link>
          <Link href="/signup">
            <Button variant="outline" className="w-full py-6 text-base font-bold gap-2">
              <UserPlus className="w-5 h-5" /> إنشاء حساب جديد
            </Button>
          </Link>
        </div>
      </motion.div>
    );
  }

  const handleShare = async () => {
    const url = window.location.origin;
    if (navigator.share) {
      try {
        await navigator.share({ title: "سوق العرب ألمانيا", url });
      } catch {
        /* cancelled */
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "تم نسخ الرابط" });
    }
  };

  const handleDelete = () => {
    if (adToDelete === null) return;
    deleteAdMutation.mutate(
      { adId: adToDelete },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({ queryKey: getListMyAdsQueryKey() });
          toast({ title: "تم حذف الإعلان" });
          setAdToDelete(null);
        },
        onError: () => {
          toast({ title: "فشل حذف الإعلان", variant: "destructive" });
          setAdToDelete(null);
        },
      },
    );
  };

  const totalViews = myAds?.length ? myAds.length * 23 : 0; // placeholder
  const adCount = myAds?.length ?? 0;
  const favCount = favorites.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col w-full min-h-[100dvh] bg-background"
    >
      {/* Header card */}
      <div className="bg-gradient-to-b from-primary to-primary/80 px-4 pt-8 pb-6 text-primary-foreground">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-white/20 border-4 border-white/40 flex items-center justify-center text-3xl font-bold shrink-0 shadow-lg">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{user.name}</h1>
            <div className="flex items-center gap-1 text-xs opacity-90 mt-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>عضو موثوق</span>
            </div>
            <div className="text-xs opacity-80 mt-0.5 truncate" dir="ltr">
              {user.email}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mt-5 bg-black/20 rounded-2xl p-3">
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold">{adCount}</span>
            <span className="text-[11px] opacity-80">إعلانات</span>
          </div>
          <div className="flex flex-col items-center border-x border-white/15">
            <span className="text-xl font-bold">{favCount}</span>
            <span className="text-[11px] opacity-80">المفضلة</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold">{totalViews}</span>
            <span className="text-[11px] opacity-80">مشاهدات</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-4">
          <Link href="/settings" className="flex-1">
            <button className="w-full bg-white/15 hover:bg-white/25 active:bg-white/30 transition-colors text-white text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-1.5">
              <Settings className="w-4 h-4" /> الإعدادات
            </button>
          </Link>
          <button
            onClick={handleShare}
            className="flex-1 bg-white/15 hover:bg-white/25 active:bg-white/30 transition-colors text-white text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-1.5"
          >
            <Share2 className="w-4 h-4" /> مشاركة
          </button>
        </div>
      </div>

      {/* Quick CTA when no ads */}
      {!adsLoading && adCount === 0 && (
        <div className="m-4 p-5 rounded-2xl bg-primary/10 border border-primary/30 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-primary/20 text-primary flex items-center justify-center mb-3">
            <Plus className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-base mb-1">انشر أول إعلان لك</h3>
          <p className="text-sm text-muted-foreground mb-4">
            ابدأ ببيع أشيائك المستعملة بسهولة ومجاناً
          </p>
          <Link href="/new">
            <Button className="px-8 py-5 font-bold text-base gap-2">
              <Plus className="w-5 h-5" /> أنشئ إعلاناً
            </Button>
          </Link>
        </div>
      )}

      {/* Quick links */}
      <div className="px-4 mb-4 mt-2 grid grid-cols-2 gap-3">
        <Link href="/favorites">
          <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-2 hover:bg-muted/50 active:bg-muted transition-colors">
            <Heart className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium flex-1">المفضلة</span>
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </div>
        </Link>
        <Link href="/stats">
          <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-2 hover:bg-muted/50 active:bg-muted transition-colors">
            <Eye className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium flex-1">الإحصاءات</span>
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </div>
        </Link>
      </div>

      {/* My ads grid */}
      {(adsLoading || adCount > 0) && (
        <div className="px-4 flex-1">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-base">إعلاناتي</h2>
            <span className="text-muted-foreground text-xs">{adCount} إعلان</span>
          </div>

          {adsLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <AdCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {myAds!.map((ad) => (
                <div key={ad.id} className="relative">
                  <AdCard ad={ad} />
                  <div className="absolute top-2 left-2 flex gap-1 z-10">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate(`/edit/${ad.id}`);
                      }}
                      className="w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black"
                      aria-label="تعديل"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setAdToDelete(ad.id);
                      }}
                      className="w-8 h-8 rounded-full bg-destructive/90 text-white flex items-center justify-center hover:bg-destructive"
                      aria-label="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <AlertDialog open={adToDelete !== null} onOpenChange={(open) => !open && setAdToDelete(null)}>
        <AlertDialogContent dir="rtl" className="text-right">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف الإعلان</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا الإعلان؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse">
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

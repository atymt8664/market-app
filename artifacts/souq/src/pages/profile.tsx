import { Link, useLocation } from "wouter";
import { User, LogOut, LogIn, UserPlus, Trash2, Pencil, Plus, Phone, MapPin, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  useListMyAds,
  useDeleteAd,
  useAuthLogout,
  getListMyAdsQueryKey,
  getAuthMeQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { AdCard, AdCardSkeleton } from "@/components/ad-card";
import { useToast } from "@/hooks/use-toast";
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
  const logoutMutation = useAuthLogout();
  const deleteAdMutation = useDeleteAd();
  const [adToDelete, setAdToDelete] = useState<number | null>(null);

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
        <header className="bg-primary pt-12 pb-8 px-4 text-primary-foreground flex flex-col items-center">
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

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getAuthMeQueryKey() });
        await queryClient.invalidateQueries({ queryKey: getListMyAdsQueryKey() });
        toast({ title: "تم تسجيل الخروج" });
        navigate("/");
      },
    });
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col w-full min-h-[100dvh] bg-background"
    >
      <header className="bg-primary pt-8 pb-6 px-4 text-primary-foreground relative">
        <div className="flex flex-col items-center mt-4">
          <div className="w-24 h-24 rounded-full bg-white/20 border-4 border-white/40 flex items-center justify-center text-4xl font-bold mb-3 overflow-hidden shadow-lg">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-2xl font-bold">{user.name}</h1>
        </div>

        <div className="grid grid-cols-1 gap-1 mt-4 text-sm bg-black/15 rounded-xl p-3">
          <div className="flex items-center gap-2 opacity-90">
            <Mail className="w-4 h-4 shrink-0" />
            <span dir="ltr" className="truncate">{user.email}</span>
          </div>
          <div className="flex items-center gap-2 opacity-90">
            <Phone className="w-4 h-4 shrink-0" />
            <span dir="ltr">{user.phone}</span>
          </div>
          {user.city && (
            <div className="flex items-center gap-2 opacity-90">
              <MapPin className="w-4 h-4 shrink-0" />
              <span>{user.city}</span>
            </div>
          )}
        </div>
      </header>

      <div className="p-4 flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">إعلاناتي</h2>
          <span className="text-muted-foreground text-sm">
            {myAds?.length ?? 0} إعلان
          </span>
        </div>

        {adsLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <AdCardSkeleton key={i} />
            ))}
          </div>
        ) : myAds && myAds.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {myAds.map((ad) => (
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
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Plus className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold mb-2">ليس لديك إعلانات بعد</h3>
            <p className="text-muted-foreground mb-6 text-sm">ابدأ ببيع أشيائك المستعملة بسهولة ومجاناً.</p>
            <Link href="/new">
              <Button className="px-8 font-bold">أنشئ أول إعلان</Button>
            </Link>
          </div>
        )}

        <Button
          variant="outline"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          className="w-full mt-6 py-6 text-base font-medium gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="w-5 h-5" /> تسجيل الخروج
        </Button>
      </div>

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

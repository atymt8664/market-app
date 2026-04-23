import { Link, useLocation } from "wouter";
import {
  LogIn,
  UserPlus,
  Trash2,
  Pencil,
  Plus,
  Settings,
  Share2,
  ShieldCheck,
  Eye,
  ChevronLeft,
  Users,
  UserCheck,
  Heart,
  Smile,
  Leaf,
  Camera,
  Loader2,
  Receipt,
  Clock,
  User as UserIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useRef } from "react";
import {
  useListMyAds,
  useDeleteAd,
  getListMyAdsQueryKey,
  useAuthUpdateProfile,
  getAuthMeQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUpload } from "@workspace/object-storage-web";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { AdCard, AdCardSkeleton } from "@/components/ad-card";
import { AvatarCircle } from "@/components/avatar-circle";
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
  const deleteAdMutation = useDeleteAd();
  const updateProfile = useAuthUpdateProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [adToDelete, setAdToDelete] = useState<number | null>(null);

  const { data: myAds, isLoading: adsLoading } = useListMyAds({
    query: {
      queryKey: getListMyAdsQueryKey(),
      enabled: !!user,
      retry: false,
    },
  });

  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response) => {
      const url = `/api/storage${response.objectPath}`;
      updateProfile.mutate(
        { data: { avatarUrl: url } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: getAuthMeQueryKey(),
            });
            toast({ title: "تم تحديث الصورة الشخصية" });
          },
          onError: () => {
            toast({
              title: "فشل تحديث الصورة",
              variant: "destructive",
            });
          },
        },
      );
    },
    onError: () => {
      toast({ title: "فشل رفع الصورة", variant: "destructive" });
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
            <UserIcon className="w-12 h-12 opacity-80" />
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

  const handleAvatarPick = () => fileInputRef.current?.click();
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "الملف ليس صورة", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "الصورة كبيرة جداً (الحد 5MB)", variant: "destructive" });
      return;
    }
    uploadFile(file);
    e.target.value = "";
  };

  const adCount = user?.adCount ?? myAds?.length ?? 0;
  const followerCount = user?.followerCount ?? 0;
  const profileViews = user?.profileViews ?? 0;
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("ar", {
        year: "numeric",
        month: "long",
      })
    : null;
  const avatarBusy = isUploading || updateProfile.isPending;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col w-full min-h-[100dvh] bg-background pb-6"
    >
      {/* Top profile section */}
      <div className="bg-gradient-to-b from-primary to-primary/80 px-4 pt-5 pb-5 text-primary-foreground">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <AvatarCircle name={user.name} src={user.avatarUrl} size={64} />
            <button
              type="button"
              onClick={handleAvatarPick}
              disabled={avatarBusy}
              aria-label="تغيير الصورة"
              className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full bg-white text-primary border-2 border-primary flex items-center justify-center shadow-md active:scale-95 transition-transform disabled:opacity-60"
            >
              {avatarBusy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileChange}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{user.name}</h1>
            <div className="text-[11px] opacity-80 truncate mt-0.5" dir="ltr">
              {user.email}
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          <Badge icon={<ShieldCheck className="w-3 h-3" />} text="موثوق" />
          <Badge icon={<Smile className="w-3 h-3" />} text="ودود" />
          <Badge icon={<Leaf className="w-3 h-3" />} text="نشط" />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-3">
          <Link href="/settings" className="flex-1">
            <button className="w-full bg-white/15 hover:bg-white/25 active:bg-white/30 transition-colors text-white text-sm font-medium py-2 rounded-lg flex items-center justify-center gap-1.5">
              <Settings className="w-4 h-4" /> الإعدادات
            </button>
          </Link>
          <button
            onClick={handleShare}
            className="flex-1 bg-white/15 hover:bg-white/25 active:bg-white/30 transition-colors text-white text-sm font-medium py-2 rounded-lg flex items-center justify-center gap-1.5"
          >
            <Share2 className="w-4 h-4" /> مشاركة
          </button>
        </div>
      </div>

      {/* Compact info list (Kleinanzeigen-style stacked rows) */}
      <div className="px-4 mt-3 flex flex-col gap-2 text-[13px]">
        <CompactInfo icon={<UserIcon className="w-4 h-4 text-primary" />} text="بائع شخصي" />
        {memberSince && (
          <CompactInfo
            icon={<ShieldCheck className="w-4 h-4 text-primary" />}
            text={`عضو منذ ${memberSince}`}
          />
        )}
        <CompactInfo
          icon={<Clock className="w-4 h-4 text-primary" />}
          text="يرد عادةً خلال ساعات قليلة"
        />
        <CompactInfo
          icon={<Users className="w-4 h-4 text-primary" />}
          text={`${followerCount.toLocaleString("ar")} متابع`}
        />
      </div>

      {/* Stats grid */}
      <div className="px-4 mt-4">
        <div className="grid grid-cols-4 gap-2">
          <StatCard label="إعلانات" value={adCount} />
          <StatCard label="نشطة" value={adCount} accent />
          <StatCard
            label="متابعون"
            value={followerCount}
            icon={<Users className="w-3.5 h-3.5" />}
          />
          <StatCard
            label="مشاهدات"
            value={profileViews}
            icon={<Eye className="w-3.5 h-3.5" />}
          />
        </div>
      </div>

      {/* Sales overview placeholder */}
      <div className="mx-4 mt-4">
        <Link href="/stats">
          <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 hover:bg-muted/40 active:scale-[0.99] transition-all cursor-pointer">
            <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <Receipt className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm">نظرة عامة على المبيعات</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                تابع أداء إعلاناتك ومشاهداتك
              </p>
            </div>
            <ChevronLeft className="w-5 h-5 text-muted-foreground shrink-0" />
          </div>
        </Link>
      </div>

      {/* Quick links */}
      <div className="mx-4 mt-3 grid grid-cols-2 gap-2">
        <Link href="/favorites">
          <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-2 hover:bg-muted/50 active:bg-muted transition-colors h-full">
            <Heart className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium flex-1">المفضلة</span>
          </div>
        </Link>
        <Link href={`/users/${user.id}`}>
          <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-2 hover:bg-muted/50 active:bg-muted transition-colors h-full">
            <UserCheck className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium flex-1">ملفي العام</span>
          </div>
        </Link>
      </div>

      {/* Empty state CTA */}
      {!adsLoading && adCount === 0 && (
        <div className="mx-4 mt-4 p-5 rounded-2xl bg-primary/10 border border-primary/30 flex flex-col items-center text-center">
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

      {/* My ads grid */}
      {(adsLoading || adCount > 0) && (
        <div className="px-4 mt-5 flex-1">
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

      <div className="h-16" />
    </motion.div>
  );
}

function Badge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1 bg-white/15 text-white text-[11px] font-medium px-2 py-1 rounded-full">
      {icon}
      {text}
    </span>
  );
}

function CompactInfo({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-foreground/90">
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{text}</span>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-2.5 flex flex-col items-center justify-center text-center ${
        accent
          ? "bg-primary/10 border-primary/30"
          : "bg-card border-border"
      }`}
    >
      <div className="flex items-center gap-1">
        {icon}
        <span className="text-base font-bold tabular-nums">
          {value.toLocaleString("ar")}
        </span>
      </div>
      <span className="text-[10px] text-muted-foreground mt-0.5">{label}</span>
    </div>
  );
}

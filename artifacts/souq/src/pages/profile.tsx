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
        <div className="flex flex-col items-center justify-center flex-1 gap-8 px-6">
          {/* الأيقونة */}
          <div className="relative">
            <div className="absolute inset-0 blur-2xl bg-primary/20 rounded-full"></div>
            <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 shadow-xl">
              <UserIcon className="w-12 h-12 text-primary" />
            </div>
          </div>

          {/* النص */}
          <div className="text-center space-y-3">
            <h1 className="text-2xl font-extrabold">مرحباً بك 👋</h1>
            <p className="text-sm text-muted-foreground">
              سجّل الدخول لإدارة إعلاناتك بسهولة
            </p>
          </div>

          {/* الأزرار */}
          <div className="w-full flex flex-col gap-4 mt-4">
            <Link href="/login">
              <Button className="w-[60%] ml-auto mr-16 h-14 rounded-2xl bg-primary text-black font-bold text-base shadow-lg hover:scale-[1.02] active:scale-[0.97] transition-all">
                تسجيل الدخول →
              </Button>
            </Link>

            <Link href="/signup">
              <Button
                variant="outline"
                className="w-[60%] mx-auto h-14 rounded-2xl border border-border text-muted-foreground flex items-center justify-center gap-2 hover:bg-muted/30 transition-all"
              >
                <UserPlus className="w-5 h-5" />
                إنشاء حساب جديد
              </Button>
            </Link>
          </div>
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
          await queryClient.invalidateQueries({
            queryKey: getListMyAdsQueryKey(),
          });
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

  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center w-full min-h-[100dvh] bg-background px-6 text-center"
      >
        <h1 className="text-2xl font-bold mb-3">مرحباً بك 👋</h1>
        <p className="text-muted-foreground mb-8">
          سجل الدخول لإدارة إعلاناتك بسهولة
        </p>

        <Link href="/login" className="w-full max-w-xs">
          <button className="w-full h-14 rounded-2xl bg-primary text-black font-bold text-base">
            تسجيل الدخول
          </button>
        </Link>

        <Link href="/signup" className="w-full max-w-xs mt-4">
          <button className="w-full h-14 rounded-2xl border border-border">
            إنشاء حساب جديد
          </button>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col w-full min-h-[100dvh] bg-background pb-6"
    >
      {/* Top header — dark, with title + icon actions */}
      <div className="px-4 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground truncate">
              حسابي
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {adCount.toLocaleString("ar")} إعلانات ·{" "}
              {followerCount.toLocaleString("ar")} متابع
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleShare}
              aria-label="مشاركة"
              className="w-9 h-9 flex items-center justify-center text-primary hover:bg-muted/50 active:bg-muted rounded-full transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <Link href="/settings">
              <button
                aria-label="الإعدادات"
                className="w-9 h-9 flex items-center justify-center text-primary hover:bg-muted/50 active:bg-muted rounded-full transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
            </Link>
          </div>
        </div>

        {/* Avatar row */}
        <div className="flex items-center gap-3 mt-4">
          <div className="relative shrink-0">
            <AvatarCircle name={user.name} src={user.avatarUrl} size={56} />
            <button
              type="button"
              onClick={handleAvatarPick}
              disabled={avatarBusy}
              aria-label="تغيير الصورة"
              className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full bg-muted text-foreground border border-border flex items-center justify-center active:scale-95 transition-transform disabled:opacity-60"
            >
              {avatarBusy ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Camera className="w-3 h-3" />
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
        </div>

        {/* Name */}
        <h2 className="text-lg font-bold text-foreground truncate mt-3">
          {user.name}
        </h2>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          <div className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-purple-600 text-white">
            <ShieldCheck className="w-3 h-3" />
            موثوق
          </div>

          <div className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-purple-600 text-white">
            <Smile className="w-3 h-3" />
            ودود
          </div>

          <div className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-purple-600 text-white">
            <Leaf className="w-3 h-3" />
            نشط
          </div>
        </div>
      </div>

      {/* Compact info list (Kleinanzeigen-style stacked rows) */}
      <div className="px-4 mt-3 flex flex-col gap-2 text-[13px]">
        <CompactInfo
          icon={<UserIcon className="w-4 h-4 text-primary" />}
          text="بائع شخصي"
        />
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
        <div className="mt-6 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-primary/20 text-primary flex items-center justify-center mb-3">
            <Plus className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-base mb-1">انشر أول إعلان لك</h3>
          <p className="text-sm text-muted-foreground mb-4">
            ابدأ ببيع أشيائك المستعملة بسهولة ومجاناً
          </p>
          <Link href="/new">
            <Button className="px-4 py-2 text-sm font-medium rounded-full bg-[#b6e356] text-black inline-flex items-center gap-2 shadow-sm">
              <Plus className="w-4 h-4" />
              أنشئ إعلانًا
            </Button>
          </Link>
        </div>
      )}

      {/* My ads grid */}
      {(adsLoading || adCount > 0) && (
        <div className="px-4 mt-5 flex-1">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-base">إعلاناتي</h2>
            <span className="text-muted-foreground text-xs">
              {adCount} إعلان
            </span>
          </div>

          {adsLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <AdCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {Array.isArray(myAds) &&
                myAds.map((ad) => (
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

      <AlertDialog
        open={adToDelete !== null}
        onOpenChange={(open) => !open && setAdToDelete(null)}
      >
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
        accent ? "bg-primary/10 border-primary/30" : "bg-card border-border"
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

import { Link, useLocation } from "wouter";
import {
  UserPlus,
  Trash2,
  Pencil,
  Plus,
  Settings,
  Share2,
  ShieldCheck,
  Eye,
  Users,
  UserCheck,
  Heart,
  Camera,
  Loader2,
  Clock,
  User as UserIcon,
  Megaphone,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useRef } from "react";
import {
  useListMyAds,
  useDeleteAd,
  getListMyAdsQueryKey,
  useAuthUpdateProfile,
  getAuthMeQueryKey,
  useListAds,
  getListAdsQueryKey,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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
  const [activeTab, setActiveTab] = useState("my-ads");
  const [favorites] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem("favorites");
      return raw ? (JSON.parse(raw) as number[]) : [];
    } catch {
      return [];
    }
  });
  const { data: allAds } = useListAds(
    {},
    { query: { queryKey: getListAdsQueryKey({}), enabled: favorites.length > 0 } },
  );

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
        <div className="mx-auto w-full max-w-screen-md flex flex-col items-center justify-center flex-1 gap-8 px-6 md:px-8">
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
          <div className="w-full max-w-sm flex flex-col gap-4 mt-4">
            <Link href="/login">
              <Button className="w-full h-14 rounded-2xl bg-primary text-black font-bold text-base shadow-lg hover:scale-[1.02] active:scale-[0.97] transition-all">
                تسجيل الدخول →
              </Button>
            </Link>

            <Link href="/signup">
              <Button
                variant="outline"
                className="w-full h-14 rounded-2xl border border-border text-muted-foreground flex items-center justify-center gap-2 hover:bg-muted/30 transition-all"
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
  const favoriteAds = (allAds ?? []).filter((ad) => favorites.includes(ad.id));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col w-full min-h-[100dvh] bg-background pb-6"
    >
      <div className="mx-auto w-full max-w-[900px] md:max-w-[760px] lg:max-w-[860px] px-4 md:px-6 py-5">
        <div className="pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-foreground truncate">حسابي</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {adCount.toLocaleString("ar")} إعلانات · {followerCount.toLocaleString("ar")} متابع
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleShare}
                aria-label="مشاركة"
                className="w-9 h-9 flex items-center justify-center text-primary hover:bg-muted/50 rounded-full transition-colors"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <Link href="/settings">
                <button
                  aria-label="الإعدادات"
                  className="w-9 h-9 flex items-center justify-center text-primary hover:bg-muted/50 rounded-full transition-colors"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </Link>
            </div>
          </div>
        </div>

        <section className="mt-3 rounded-2xl border border-border bg-card/70 p-4 md:p-5">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <AvatarCircle name={user.name} src={user.avatarUrl} size={72} />
              <button
                type="button"
                onClick={handleAvatarPick}
                disabled={avatarBusy}
                aria-label="تغيير الصورة"
                className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full bg-muted text-foreground border border-border flex items-center justify-center disabled:opacity-60"
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
            <div className="min-w-0 flex-1">
              <h2 className="text-lg md:text-xl font-bold truncate">{user.name}</h2>
              <div className="mt-1.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1">
                  <UserIcon className="w-3.5 h-3.5" />
                  بائع شخصي
                </span>
                {memberSince && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1">
                    <Clock className="w-3.5 h-3.5" />
                    عضو منذ {memberSince}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3.5 grid grid-cols-2 md:grid-cols-4 gap-2">
            <StatCard label="إعلانات" value={adCount} icon={<Megaphone className="w-3.5 h-3.5" />} />
            <StatCard label="نشطة" value={adCount} accent />
            <StatCard label="متابعون" value={followerCount} icon={<Users className="w-3.5 h-3.5" />} />
            <StatCard label="مشاهدات" value={profileViews} icon={<Eye className="w-3.5 h-3.5" />} />
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-border bg-card/50 p-3 md:p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl" className="w-full">
            <TabsList className="h-auto w-full grid grid-cols-3 rounded-xl bg-muted/50 p-1">
              <TabsTrigger value="my-ads" className="text-xs md:text-sm">إعلاناتي</TabsTrigger>
              <TabsTrigger value="favorites" className="text-xs md:text-sm">المفضلة</TabsTrigger>
              <TabsTrigger value="public" className="text-xs md:text-sm">الملف العام</TabsTrigger>
            </TabsList>

            <TabsContent value="my-ads" className="mt-4">
              {!adsLoading && adCount === 0 ? (
                <div className="py-10 text-center">
                  <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                    <Plus className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-base mb-1">انشر أول إعلان لك</h3>
                  <p className="text-sm text-muted-foreground mb-4">ابدأ ببيع أشيائك بسهولة</p>
                  <Link href="/new">
                    <Button className="px-4 py-2 text-sm font-medium rounded-full bg-[#b6e356] text-black inline-flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      أنشئ إعلانًا
                    </Button>
                  </Link>
                </div>
              ) : adsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <AdCardSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {Array.isArray(myAds) &&
                    myAds.map((ad) => (
                      <div key={ad.id} className="relative w-full">
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
            </TabsContent>

            <TabsContent value="favorites" className="mt-4">
              {favoriteAds.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">لا توجد عناصر في المفضلة حالياً</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {favoriteAds.map((ad) => (
                    <AdCard key={ad.id} ad={ad} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="public" className="mt-4">
              <div className="rounded-xl border border-border bg-background/60 p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm">شاهد ملفك كما يراه الآخرون</p>
                  <p className="text-xs text-muted-foreground mt-1">يمكنك مراجعة الإعلانات والبيانات العامة</p>
                </div>
                <Link href={`/users/${user.id}`}>
                  <Button variant="outline" className="gap-2 shrink-0">
                    <UserCheck className="w-4 h-4" />
                    فتح الملف العام
                  </Button>
                </Link>
              </div>
            </TabsContent>
          </Tabs>
        </section>
      </div>

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
      className={`rounded-xl border p-2 flex flex-col items-center justify-center text-center ${
        accent ? "bg-primary/10 border-primary/30" : "bg-card border-border"
      }`}
    >
      <div className="flex items-center gap-1">
        {icon}
        <span className="text-sm md:text-base font-bold tabular-nums">
          {value.toLocaleString("ar")}
        </span>
      </div>
      <span className="text-[10px] text-muted-foreground mt-0.5">{label}</span>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowRight,
  MapPin,
  Eye,
  UserPlus,
  UserCheck,
  Loader2,
  Flag,
  ShieldBan,
  Megaphone,
  CalendarDays,
  MoreVertical,
} from "lucide-react";
import { AvatarCircle } from "@/components/avatar-circle";
import {
  useGetUserProfile,
  getGetUserProfileQueryKey,
  useFollowUser,
  useUnfollowUser,
  useRecordProfileView,
  useListAds,
  getListAdsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdCard, AdCardSkeleton } from "@/components/ad-card";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";

const USER_PROFILE_MORE_HINT_KEY = "souq.hint.userProfileMoreMenu.v1";

export default function UserProfile() {
  const params = useParams();
  const userId = Number(params.id);
  const { user: me } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const profileKey = getGetUserProfileQueryKey(userId);
  const { data: profile, isLoading } = useGetUserProfile(userId, {
    query: { queryKey: profileKey, enabled: !!userId },
  });

  const recordView = useRecordProfileView();
  const viewedRef = useRef<number | null>(null);
  useEffect(() => {
    if (!userId || viewedRef.current === userId) return;
    viewedRef.current = userId;
    recordView.mutate(
      { userId },
      {
        onSuccess: () =>
          queryClient.invalidateQueries({ queryKey: profileKey }),
        onError: () => {},
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const adsKey = getListAdsQueryKey({});
  const { data: allAds } = useListAds(
    {},
    { query: { queryKey: adsKey, enabled: !!userId } },
  );
  const userAds = (allAds ?? []).filter((a) => a.userId === userId);

  const followMut = useFollowUser();
  const unfollowMut = useUnfollowUser();

  const [reportOpen, setReportOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportExtra, setReportExtra] = useState("");
  const [blockInfoOpen, setBlockInfoOpen] = useState(false);
  const [showMoreHint, setShowMoreHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!profile || profile.isSelf) return;
    try {
      if (!localStorage.getItem(USER_PROFILE_MORE_HINT_KEY)) {
        setShowMoreHint(true);
      }
    } catch {
      setShowMoreHint(true);
    }
  }, [profile]);

  const dismissMoreHint = () => {
    try {
      localStorage.setItem(USER_PROFILE_MORE_HINT_KEY, "1");
    } catch {
      /* ignore */
    }
    setShowMoreHint(false);
  };

  const submitUserReport = async () => {
    if (!reportReason.trim()) {
      toast({ title: "اختر سبب الإبلاغ", variant: "destructive" });
      return;
    }
    if (!me) {
      navigate(`/login?redirect=/users/${userId}`);
      return;
    }
    if (reportReason === "أخرى" && !reportExtra.trim()) {
      toast({ title: "أضف تفاصيل", variant: "destructive" });
      return;
    }
    setReporting(true);
    try {
      const res = await fetch(apiUrl("/api/reports"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          targetUserId: userId,
          reason: reportReason,
          description:
            reportReason === "أخرى" ? reportExtra.trim() : undefined,
        }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        toast({
          title: "تعذّر إرسال البلاغ",
          description: t || `رمز ${res.status}`,
          variant: "destructive",
        });
        return;
      }
      toast({ title: "تم إرسال البلاغ", description: "شكراً لمساعدتك في الحفاظ على السوق." });
      setReportOpen(false);
      setReportReason("");
      setReportExtra("");
    } catch {
      toast({ title: "فشل الاتصال", variant: "destructive" });
    } finally {
      setReporting(false);
    }
  };

  const patchProfile = (
    patch: Partial<NonNullable<typeof profile>>,
  ) => {
    queryClient.setQueryData<NonNullable<typeof profile>>(profileKey, (old) =>
      old ? { ...old, ...patch } : old,
    );
  };

  const toggleFollow = () => {
    if (!profile) return;
    if (!me) {
      navigate(`/login?redirect=/users/${userId}`);
      return;
    }
    const willFollow = !profile.isFollowing;
    const prev = {
      isFollowing: profile.isFollowing,
      followerCount: profile.followerCount,
    };
    patchProfile({
      isFollowing: willFollow,
      followerCount: profile.followerCount + (willFollow ? 1 : -1),
    });
    const onSuccess = (r: {
      isFollowing: boolean;
      followerCount: number;
      followingCount: number;
    }) =>
      patchProfile({
        isFollowing: r.isFollowing,
        followerCount: r.followerCount,
        followingCount: r.followingCount,
      });
    const onError = () => patchProfile(prev);
    if (willFollow)
      followMut.mutate({ userId }, { onSuccess, onError });
    else unfollowMut.mutate({ userId }, { onSuccess, onError });
  };

  if (isLoading || !profile) {
    return (
      <div className="flex flex-col w-full min-h-[100dvh] bg-background items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isPending = followMut.isPending || unfollowMut.isPending;
  const isSelfProfile = profile.isSelf;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col w-full min-h-[100dvh] bg-background"
    >
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border p-4 flex items-center gap-3">
        <button
          onClick={() => window.history.back()}
          className="p-2 -mr-2 rounded-full hover:bg-muted active:scale-95 transition-all shrink-0"
          aria-label="رجوع"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-lg truncate flex-1 min-w-0">{profile.name}</h1>
        {!isSelfProfile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-2 rounded-full hover:bg-muted shrink-0"
                aria-label="المزيد"
                onClick={() => dismissMoreHint()}
              >
                <MoreVertical className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[12rem]" dir="rtl">
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onSelect={() => setReportOpen(true)}
              >
                <Flag className="w-4 h-4 text-amber-500" />
                إبلاغ عن المستخدم
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onSelect={() => setBlockInfoOpen(true)}
              >
                <ShieldBan className="w-4 h-4 text-red-400" />
                حظر المستخدم
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      {showMoreHint && !isSelfProfile && (
        <div className="mx-4 mt-3 md:mx-6 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-xs text-foreground/90 leading-relaxed flex gap-2 justify-between items-start">
          <span>
            يمكنك الإبلاغ عن هذا المستخدم أو حظره من قائمة «المزيد» (⋮) أعلى الصفحة.
          </span>
          <button
            type="button"
            onClick={dismissMoreHint}
            className="shrink-0 text-[11px] font-medium text-primary underline underline-offset-2"
          >
            فهمت
          </button>
        </div>
      )}

      <div className="px-4 py-5 flex-1 mx-auto w-full max-w-screen-xl md:px-6 lg:px-8">
        <section className="rounded-2xl border border-border bg-gradient-to-b from-primary/20 via-primary/5 to-background p-4 md:p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <AvatarCircle name={profile.name} src={profile.avatarUrl} size={84} />
            <div className="flex-1 min-w-0">
              <h2 className="text-xl md:text-2xl font-bold truncate">{profile.name}</h2>
              {profile.city && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{profile.city}</span>
                </div>
              )}
              <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground rounded-full border border-border px-2.5 py-1">
                <CalendarDays className="w-3.5 h-3.5" />
                عضو منذ {new Date(profile.createdAt).toLocaleDateString("ar")}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-4">
            <Stat label="إعلانات" value={profile.adCount} icon={<Megaphone className="w-3.5 h-3.5" />} />
            <Stat label="متابعون" value={profile.followerCount} />
            <Stat label="يتابع" value={profile.followingCount} />
            <Stat label="مشاهدات" value={profile.profileViews} icon={<Eye className="w-3.5 h-3.5" />} />
          </div>

          {!isSelfProfile && (
            <div className="mt-4">
              <Button
                onClick={toggleFollow}
                disabled={isPending}
                className={`w-full gap-2 h-11 rounded-xl ${
                  profile.isFollowing
                    ? "bg-muted hover:bg-muted/80 text-foreground"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : profile.isFollowing ? (
                  <>
                    <UserCheck className="w-4 h-4" /> تتم المتابعة
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" /> متابعة
                  </>
                )}
              </Button>
            </div>
          )}
        </section>

        <section className="mt-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-base">إعلانات {profile.name}</h3>
          <span className="text-muted-foreground text-xs">
            {userAds.length} إعلان
          </span>
        </div>

        {!allAds ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <AdCardSkeleton key={i} />
            ))}
          </div>
        ) : userAds.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-12">
            لا توجد إعلانات حالياً
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {userAds.map((ad) => (
              <AdCard key={ad.id} ad={ad} />
            ))}
          </div>
        )}
        </section>
      </div>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent dir="rtl" className="text-right sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إبلاغ عن المستخدم</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full border rounded-lg p-2.5 bg-background text-sm"
            >
              <option value="" disabled>
                اختر السبب
              </option>
              <option value="سلوك مسيء أو تحرش">سلوك مسيء أو تحرش</option>
              <option value="احتيال أو نصب">احتيال أو نصب</option>
              <option value="إعلانات مضللة">إعلانات مضللة</option>
              <option value="انتحال شخصية">انتحال شخصية</option>
              <option value="أخرى">أخرى</option>
            </select>
            {reportReason === "أخرى" && (
              <textarea
                placeholder="تفاصيل إضافية..."
                className="w-full border rounded-lg p-2.5 bg-background text-sm min-h-[88px]"
                value={reportExtra}
                onChange={(e) => setReportExtra(e.target.value)}
              />
            )}
            <Button
              type="button"
              className="w-full"
              onClick={() => void submitUserReport()}
              disabled={
                reporting ||
                !reportReason ||
                (reportReason === "أخرى" && !reportExtra.trim())
              }
            >
              {reporting ? "جاري الإرسال..." : "إرسال البلاغ"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={blockInfoOpen} onOpenChange={setBlockInfoOpen}>
        <AlertDialogContent dir="rtl" className="text-right">
          <AlertDialogHeader>
            <AlertDialogTitle>حظر المستخدم</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              لا يتوفر حظر المستخدم مباشرة من التطبيق في هذه النسخة. يمكنك الإبلاغ عن المستخدم من قائمة «المزيد» إذا كان هناك سلوك مخالف، وسيتم مراجعة البلاغ من الإدارة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse sm:justify-start">
            <AlertDialogAction className="rounded-xl">حسناً</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center rounded-xl border border-border/70 bg-background/50 py-2.5 px-1 shadow-sm">
      <div className="flex items-center gap-1">
        {icon}
        <span className="text-lg font-bold tabular-nums">
          {value.toLocaleString("ar")}
        </span>
      </div>
      <span className="text-[10px] text-muted-foreground mt-0.5">{label}</span>
    </div>
  );
}

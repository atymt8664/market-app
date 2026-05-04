import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
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
  Users,
} from "lucide-react";
import { AvatarCircle } from "@/components/avatar-circle";
import { cn } from "@/lib/utils";
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
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AUTH_ACCENT_OUTLINE_BTN } from "@/lib/auth-page-styles";
import { AdCard, AdCardSkeleton } from "@/components/ad-card";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/hooks/use-locale";
import { apiUrl } from "@/lib/api-url";
import { t } from "@/i18n";
import {
  PROFILE_STATS_GRID,
  ProfileStatTile,
} from "@/components/profile-stat-tiles";
import { ProfileStatsDetailSheet } from "@/components/profile-stats-detail-sheet";

const USER_PROFILE_MORE_HINT_KEY = "souq.hint.userProfileMoreMenu.v1";

const USER_REPORT_REASONS = [
  "سلوك مسيء أو تحرش",
  "احتيال أو نصب",
  "إعلانات مضللة",
  "انتحال شخصية",
  "أخرى",
] as const;

const dropdownSurface =
  "z-50 max-h-[min(70vh,520px)] min-w-[14rem] overflow-y-auto rounded-2xl border border-primary/35 bg-zinc-950/95 p-1.5 shadow-[0_0_28px_-12px_hsl(var(--primary)/0.22)] ring-1 ring-primary/15";

const dropdownItemClass =
  "cursor-pointer gap-2 rounded-xl border border-transparent px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary/25 focus:bg-zinc-900/90 data-[highlighted]:border-primary/20 data-[highlighted]:bg-zinc-900/90";

const dialogSurface =
  "rounded-2xl border border-primary/35 bg-zinc-950/95 p-0 shadow-[0_0_32px_-12px_hsl(var(--primary)/0.25)] ring-1 ring-primary/15 gap-0 overflow-hidden sm:max-w-md";

const alertSurface =
  "rounded-2xl border border-primary/35 bg-zinc-950/95 p-5 shadow-[0_0_32px_-12px_hsl(var(--primary)/0.25)] ring-1 ring-primary/15 sm:max-w-md";

const reportReasonBtn = (active: boolean) =>
  cn(
    "w-full rounded-xl border px-3 py-2.5 text-right text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
    active
      ? "border-primary/45 bg-zinc-900/95 ring-1 ring-primary/18 shadow-[0_0_14px_-10px_hsl(var(--primary)/0.2)]"
      : "border-primary/25 bg-zinc-950/85 hover:border-primary/38 hover:bg-zinc-900/70",
  );

/** مطابقة أزرار الرأس في ad-detail */
const floatingHeaderBtn =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/55 bg-card/90 text-primary shadow-[0_0_16px_-5px_hsl(var(--primary)/0.38)] transition-[transform,colors,box-shadow] hover:border-primary/70 hover:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.45)] active:scale-[0.96] disabled:pointer-events-none disabled:opacity-55 dark:bg-black/55";

const pageMax =
  "mx-auto w-full max-w-[900px] md:max-w-[760px] lg:max-w-[860px] px-4 md:px-6";

/** كرت المحتوى — نفس ad-detail (lime + glow) */
const deviceInfoShell =
  "rounded-2xl border border-primary/40 bg-card/80 p-4 shadow-[0_0_28px_-12px_hsl(var(--primary)/0.22)] ring-1 ring-primary/15 dark:bg-zinc-950/70 md:p-5";

const sellerInnerShell =
  "rounded-2xl border border-zinc-700/45 bg-zinc-950/85 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] ring-1 ring-white/[0.05] md:p-5";

const statsStripSurface =
  "rounded-2xl border border-primary/40 bg-muted/25 p-1 shadow-[0_0_28px_-10px_hsl(var(--primary)/0.22)] ring-1 ring-primary/15 dark:bg-zinc-950/70";

/** تجاوز مظهر AdCard ليتوافق مع ad-detail دون تعديل المكوّن */
const sellerAdsGridCardTone =
  "[&_article]:rounded-2xl [&_article]:border-primary/40 [&_article]:bg-card/80 [&_article]:shadow-[0_0_28px_-12px_hsl(var(--primary)/0.22)] [&_article]:ring-1 [&_article]:ring-primary/15 [&_article]:dark:bg-zinc-950/70 [&_article]:hover:border-primary/50 [&_article]:hover:shadow-[0_0_32px_-10px_hsl(var(--primary)/0.28)] [&_article>div:first-child]:rounded-t-2xl [&_button]:rounded-full [&_button]:border [&_button]:border-primary/50 [&_button]:bg-black/55 [&_button]:shadow-[0_0_14px_-4px_hsl(var(--primary)/0.35)] [&_button]:hover:border-primary/65";

export default function UserProfile() {
  const params = useParams();
  const userId = Number(params.id);
  const profileQueryEnabled = Number.isFinite(userId) && userId > 0;
  const { locale } = useLocale();
  const numberLocale = locale === "en" ? "en-US" : locale === "de" ? "de-DE" : "ar";
  const { user: me } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const profileKey = getGetUserProfileQueryKey(userId);
  const { data: profile, isLoading } = useGetUserProfile(userId, {
    query: { queryKey: profileKey, enabled: profileQueryEnabled },
  });

  const recordView = useRecordProfileView();
  const viewedRef = useRef<number | null>(null);
  useEffect(() => {
    if (!profileQueryEnabled || viewedRef.current === userId) return;
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

  const listAdsParams = { userId, limit: 100 } as const;
  const adsKey = getListAdsQueryKey(listAdsParams);
  const { data: userAds, isLoading: adsLoading } = useListAds(
    listAdsParams,
    { query: { queryKey: adsKey, enabled: profileQueryEnabled } },
  );
  const sellerAds = userAds ?? [];

  const followMut = useFollowUser();
  const unfollowMut = useUnfollowUser();

  const [reportOpen, setReportOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportExtra, setReportExtra] = useState("");
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [showMoreHint, setShowMoreHint] = useState(false);
  const [statsSheet, setStatsSheet] = useState<
    null | "followers" | "following" | "views"
  >(null);

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

  const attemptBlockUser = async () => {
    setBlockConfirmOpen(false);
    if (!me) {
      navigate(`/login?redirect=/users/${userId}`);
      return;
    }
    try {
      const res = await fetch(apiUrl(`/api/users/${userId}/block`), {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        toast({ title: t("user_profile.block_success") });
        return;
      }
    } catch {
      /* network */
    }
    toast({
      title: t("user_profile.block_unavailable_title"),
      description: t("user_profile.block_unavailable_desc"),
    });
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
      <div
        dir="rtl"
        className="flex flex-col w-full min-h-[100dvh] items-center justify-center bg-[#0A0A0A]"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isPending = followMut.isPending || unfollowMut.isPending;
  const isSelfProfile = profile.isSelf;

  return (
    <motion.div
      dir="rtl"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-[100dvh] w-full flex-col bg-[#0A0A0A] pb-10"
    >
      <div className={`${pageMax} pb-2 pt-3 md:pt-4`}>
        <div className="flex items-center justify-between gap-3 py-1">
          <button
            type="button"
            onClick={() => window.history.back()}
            className={floatingHeaderBtn}
            aria-label="رجوع"
          >
            <ArrowRight className="h-5 w-5" strokeWidth={2.25} />
          </button>
          <span className="min-w-0 flex-1" aria-hidden="true" />
          {!isSelfProfile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={floatingHeaderBtn}
                  aria-label="المزيد"
                  onClick={() => dismissMoreHint()}
                >
                  <MoreVertical className="h-5 w-5" strokeWidth={2.25} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={dropdownSurface} dir="rtl">
                <DropdownMenuItem
                  className={dropdownItemClass}
                  onSelect={() => setReportOpen(true)}
                >
                  <Flag className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.25} />
                  إبلاغ عن المستخدم
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={dropdownItemClass}
                  onSelect={() => setBlockConfirmOpen(true)}
                >
                  <ShieldBan className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.25} />
                  حظر المستخدم
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="inline-block h-11 w-11 shrink-0" aria-hidden />
          )}
        </div>
      </div>

      {showMoreHint && !isSelfProfile && (
        <div
          className={`${pageMax} pb-3`}
        >
          <div className="flex items-start justify-between gap-2 rounded-2xl border border-amber-500/35 bg-zinc-950/80 px-3 py-2.5 text-xs leading-relaxed text-foreground/90 shadow-[0_0_20px_-8px_hsl(var(--primary)/0.15)] ring-1 ring-amber-500/15">
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
        </div>
      )}

      <div className={`${pageMax} flex-1 py-2 md:py-4`}>
        <section className={cn(deviceInfoShell, "space-y-4")}>
          <div className={cn(sellerInnerShell, "space-y-4")}>
            <div className="flex items-center gap-4">
              <div className="shrink-0 ring-2 ring-primary/25 ring-offset-2 ring-offset-zinc-950 rounded-full">
                <AvatarCircle name={profile.name} src={profile.avatarUrl} size={84} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-xl font-bold text-foreground md:text-2xl">
                  {profile.name}
                </h2>
                {profile.city ? (
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/80" />
                    <span>{profile.city}</span>
                  </div>
                ) : null}
                <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-primary/30 bg-black/40 px-2.5 py-1 text-[11px] text-muted-foreground ring-1 ring-primary/10">
                  <CalendarDays className="h-3.5 w-3.5 text-primary/80" />
                  عضو منذ {new Date(profile.createdAt).toLocaleDateString("ar")}
                </div>
              </div>
            </div>
          </div>

          <div className={cn(statsStripSurface, "p-2 md:p-2.5")}>
            <div className={PROFILE_STATS_GRID} dir="rtl">
              <ProfileStatTile
                icon={<Megaphone strokeWidth={2.25} />}
                value={profile.adCount}
                label={t("profile.stats.ads")}
                numberLocale={numberLocale}
              />
              <ProfileStatTile
                icon={<UserPlus strokeWidth={2.25} />}
                value={profile.followerCount}
                label={t("profile.stats.followers")}
                numberLocale={numberLocale}
                onClick={() => setStatsSheet("followers")}
              />
              <ProfileStatTile
                icon={<Users strokeWidth={2.25} />}
                value={profile.followingCount}
                label={t("profile.stats.following")}
                numberLocale={numberLocale}
                onClick={() => setStatsSheet("following")}
              />
              <ProfileStatTile
                icon={<Eye strokeWidth={2.25} />}
                value={profile.profileViews}
                label={t("profile.stats.views")}
                numberLocale={numberLocale}
                onClick={() => setStatsSheet("views")}
              />
            </div>
          </div>

          {!isSelfProfile && (
            <Button
              type="button"
              onClick={toggleFollow}
              disabled={isPending}
              className={cn(
                "h-12 w-full gap-2 rounded-2xl border-2 text-sm font-semibold shadow-[0_0_12px_-6px_hsl(var(--primary)/0.2)] transition-colors",
                profile.isFollowing
                  ? "border-primary/40 bg-zinc-950/90 text-foreground hover:bg-zinc-900/95"
                  : "border-primary/55 bg-zinc-950/90 text-primary hover:border-primary/70 hover:bg-zinc-900/95",
              )}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : profile.isFollowing ? (
                <>
                  <UserCheck className="h-4 w-4" /> تتم المتابعة
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" /> متابعة
                </>
              )}
            </Button>
          )}
        </section>

        <section className="mt-6 md:mt-8">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-base font-bold text-foreground">
              إعلانات {profile.name}
            </h3>
            <span className="text-xs text-primary/80 tabular-nums">
              {sellerAds.length} إعلان
            </span>
          </div>

          {adsLoading ? (
            <div
              className={cn(
                "grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3 lg:grid-cols-4 lg:gap-3.5",
                sellerAdsGridCardTone,
              )}
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <AdCardSkeleton key={i} />
              ))}
            </div>
          ) : sellerAds.length === 0 ? (
            <div
              className={cn(
                deviceInfoShell,
                "py-12 text-center text-sm text-muted-foreground",
              )}
            >
              لا توجد إعلانات حالياً
            </div>
          ) : (
            <div
              className={cn(
                "grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3 lg:grid-cols-4 lg:gap-3.5",
                sellerAdsGridCardTone,
              )}
            >
              {sellerAds.map((ad) => (
                <AdCard key={ad.id} ad={ad} />
              ))}
            </div>
          )}
        </section>
      </div>

      <ProfileStatsDetailSheet
        open={statsSheet !== null}
        onOpenChange={(open) => !open && setStatsSheet(null)}
        title={
          statsSheet === "followers"
            ? t("profile.stats.sheet.followers_title")
            : statsSheet === "following"
              ? t("profile.stats.sheet.following_title")
              : statsSheet === "views"
                ? t("profile.stats.sheet.views_title")
                : ""
        }
      >
        <p className="text-sm leading-relaxed">
          {statsSheet === "views"
            ? t("profile.stats.sheet.empty_views_list")
            : t("profile.stats.sheet.empty_follow_list")}
        </p>
      </ProfileStatsDetailSheet>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent hideClose dir="rtl" className={cn(dialogSurface, "text-right")}>
          <DialogHeader className="border-b border-primary/15 px-4 pb-3 pt-4 text-right">
            <DialogTitle className="text-base font-bold text-foreground">
              إبلاغ عن المستخدم
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[min(56vh,420px)] space-y-3 overflow-y-auto px-4 py-4">
            <p className="text-xs font-medium text-muted-foreground">اختر السبب</p>
            <div className="space-y-2">
              {USER_REPORT_REASONS.map((reasonOpt) => (
                <button
                  key={reasonOpt}
                  type="button"
                  onClick={() => setReportReason(reasonOpt)}
                  className={reportReasonBtn(reportReason === reasonOpt)}
                >
                  {reasonOpt}
                </button>
              ))}
            </div>
            {reportReason === "أخرى" && (
              <textarea
                placeholder="تفاصيل إضافية..."
                className="min-h-[88px] w-full rounded-xl border border-primary/28 bg-zinc-950/90 p-3 text-right text-sm text-foreground shadow-inner ring-1 ring-primary/10 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                value={reportExtra}
                onChange={(e) => setReportExtra(e.target.value)}
              />
            )}
          </div>
          <div className="border-t border-primary/15 px-4 pb-4 pt-2">
            <Button
              type="button"
              variant="ghost"
              disabled={
                reporting ||
                !reportReason ||
                (reportReason === "أخرى" && !reportExtra.trim())
              }
              className={cn(
                AUTH_ACCENT_OUTLINE_BTN,
                "hover:bg-zinc-900",
              )}
              onClick={() => void submitUserReport()}
            >
              {reporting ? "جاري الإرسال..." : "إرسال البلاغ"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={blockConfirmOpen} onOpenChange={setBlockConfirmOpen}>
        <AlertDialogContent dir="rtl" className={cn(alertSurface, "text-right")}>
          <AlertDialogHeader className="space-y-2 text-right">
            <AlertDialogTitle className="text-lg font-bold text-foreground">
              {t("user_profile.block_confirm_title")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
              {t("user_profile.block_confirm_desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-row-reverse flex-wrap gap-2 pt-4">
            <button
              type="button"
              onClick={() => void attemptBlockUser()}
              className={cn(
                "inline-flex h-11 min-w-[8rem] flex-1 items-center justify-center rounded-xl border border-red-500/40 bg-zinc-950/90 px-4 text-sm font-semibold text-red-200 shadow-[0_0_18px_-12px_rgba(239,68,68,0.35)] ring-1 ring-red-500/15 transition-colors hover:border-red-500/55 hover:bg-red-950/25 sm:flex-none",
              )}
            >
              {t("user_profile.block_confirm_cta")}
            </button>
            <AlertDialogCancel
              className={cn(
                "mt-0 h-11 flex-1 rounded-xl border border-primary/35 bg-zinc-950/90 text-sm font-semibold text-foreground hover:bg-zinc-900 sm:flex-none",
              )}
            >
              {t("user_profile.block_cancel")}
            </AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

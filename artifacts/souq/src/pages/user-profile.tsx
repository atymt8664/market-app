import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowRight,
  MapPin,
  UserPlus,
  UserCheck,
  Loader2,
  Flag,
  ShieldBan,
  ShieldOff,
  MoreVertical,
  Clock,
  Megaphone,
} from "lucide-react";
import { AvatarCircle } from "@/components/avatar-circle";
import {
  parseUserApiErrorResponse,
  showUserApiErrorToast,
} from "@/lib/user-api-errors";
import { cn } from "@/lib/utils";
import { STALE_AD_LIST_MS, STALE_PEER_BLOCK_MS } from "@/lib/query-stale-times";
import {
  useGetUserProfile,
  getGetUserProfileQueryKey,
  useFollowUser,
  useUnfollowUser,
  useRecordProfileView,
  useListAds,
  getListAdsQueryKey,
  useAuthUpdateProfile,
  getAuthMeQueryKey,
  getAuthProfileCsrfTokenForRequest,
  useUserPresenceBatch,
  invalidateUserPresenceBatchQueries,
} from "@workspace/api-client-react";
import { useUpload } from "@workspace/object-storage-web";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  AlertDialogCancel,
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
import { AUTH_ACCENT_OUTLINE_BTN } from "@/lib/auth-page-styles";
import { HomeFeedAdCard } from "@/components/home-feed-ad-card";
import { AdCardSkeleton } from "@/components/ad-card-skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/hooks/use-locale";
import { usePageSeo } from "@/hooks/use-page-seo";
import { buildProfileSocialOverride } from "@/lib/social-meta-foundation";
import { apiUrl } from "@/lib/api-url";
import { t } from "@/i18n";
import { ProfileMetricsBand } from "@/components/profile-metrics-band";
import {
  PROFILE_SECTION_HEADER,
  PROFILE_SECTION_LABEL,
  PROFILE_SECTION_STACK_GAP,
  profileSectionClassName,
} from "@/components/profile-section-shell";
import { ProfileStatsDetailSheet } from "@/components/profile-stats-detail-sheet";
import { ProfileStatsListsPanel } from "@/components/profile-stats-lists-panel";
import { UserPresenceBadge } from "@/components/user-presence-badge";
import {
  ProfileAvatarPreviewDialog,
  ProfileAvatarCameraBadge,
} from "@/components/profile-avatar-preview-dialog";
import {
  SETTINGS_DIALOG_CONTENT,
  SETTINGS_OUTLINE_BUTTON,
} from "@/components/settings-shell";

const USER_PROFILE_MORE_HINT_KEY = "souq.hint.userProfileMoreMenu.v1";

const USER_REPORT_REASON_KEYS = [
  "user_profile.report.opt_harassment",
  "user_profile.report.opt_fraud",
  "user_profile.report.opt_misleading",
  "user_profile.report.opt_impersonation",
  "user_profile.report.opt_other",
] as const;

const dropdownSurface =
  "z-50 max-h-[min(70vh,520px)] min-w-[14rem] overflow-y-auto rounded-2xl border border-primary/35 bg-[#0A0A0A]/95 p-1.5 shadow-[0_0_28px_-12px_hsl(var(--primary)/0.22)] ring-1 ring-primary/15";

const dropdownItemClass =
  "cursor-pointer gap-2 rounded-xl border border-transparent px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary/25 focus:bg-black/90 data-[highlighted]:border-primary/20 data-[highlighted]:bg-black/90";

const dialogSurface =
  "rounded-2xl border border-primary/35 bg-[#0A0A0A]/95 p-0 shadow-[0_0_32px_-12px_hsl(var(--primary)/0.25)] ring-1 ring-primary/15 gap-0 overflow-hidden sm:max-w-md";

const alertSurface =
  "rounded-2xl border border-primary/35 bg-[#0A0A0A]/95 p-5 shadow-[0_0_32px_-12px_hsl(var(--primary)/0.25)] ring-1 ring-primary/15 sm:max-w-md";

const reportReasonBtn = (active: boolean, alignClass: string) =>
  cn(
    "w-full rounded-xl border px-3 py-2.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
    alignClass,
    active
      ? "border-primary/45 bg-[#0A0A0A]/95 ring-1 ring-primary/18 shadow-[0_0_14px_-10px_hsl(var(--primary)/0.2)]"
      : "border-primary/25 bg-[#0A0A0A]/85 hover:border-primary/38 hover:bg-black/70",
  );

/** أزرار الرأس — متناسقة مع /profile */
const publicProfileHeaderBtn =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/55 bg-[#0A0A0A]/90 text-primary shadow-[0_0_10px_-4px_hsl(var(--primary)/0.18)] transition-colors hover:border-primary/75 hover:bg-[#0A0A0A]/95 active:opacity-90 disabled:pointer-events-none disabled:opacity-55 dark:bg-black/55";

const PAGE_INSET =
  "mx-auto w-full max-w-screen-sm md:max-w-[760px] lg:max-w-[860px] px-3 md:px-6";

/** Home recommended grid — identical card tone to home feed */
const homeAdCardTone = cn(
  "[&>div]:h-full",
  "[&_article]:flex [&_article]:h-full [&_article]:flex-col",
  "[&_article]:transition-none",
  "[&_article]:active:scale-100",
);

const publicProfileAdsGrid = cn(
  "grid min-w-0 grid-cols-2 items-stretch gap-x-2 gap-y-2 md:grid-cols-3 md:gap-x-2.5 md:gap-y-2.5",
  homeAdCardTone,
);

const profileTextAlign = (dir: "rtl" | "ltr") => (dir === "rtl" ? "text-right" : "text-left");

const publicProfileFollowBtn = cn(
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border text-sm font-semibold shadow-[0_0_12px_-6px_hsl(var(--primary)/0.2)] transition-colors active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60",
);

export default function UserProfile() {
  const params = useParams();
  const userId = Number(params.id);
  const profileQueryEnabled = Number.isFinite(userId) && userId > 0;
  const { locale } = useLocale();
  const reportTextAlign = locale === "ar" ? "text-right" : "text-left";
  const userReportReasonOptions = useMemo(
    () => USER_REPORT_REASON_KEYS.map((k) => t(k)),
    [locale],
  );
  const otherReportLabel = t("user_profile.report.opt_other");
  const numberLocale = locale === "en" ? "en-US" : locale === "de" ? "de-DE" : "ar";
  const profileDir = locale === "ar" ? "rtl" : "ltr";
  const dateLocale = locale === "en" ? "en-US" : locale === "de" ? "de-DE" : "ar";
  const { user: me } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const profileKey = getGetUserProfileQueryKey(userId);
  const { data: profile, isLoading, isError } = useGetUserProfile(userId, {
    query: { queryKey: profileKey, enabled: profileQueryEnabled },
  });

  const profilePageSeo = useMemo(() => {
    if (!userId || !profile?.name) return null;
    const cityPart = profile.city?.trim();
    const description = cityPart
      ? `${cityPart} · ${t("user_profile.browse_ads_desc")}`
      : t("user_profile.browse_ads_desc");
    return {
      title: `${profile.name} | Souq Arab EU`,
      description,
      canonicalPath: `/users/${userId}`,
    };
  }, [userId, profile?.name, profile?.city, locale]);

  const profileSocialOverride = useMemo(() => {
    if (!userId || !profile) return null;
    return buildProfileSocialOverride({
      id: userId,
      name: profile.name,
      city: profile.city,
      avatarUrl: profile.avatarUrl,
    });
  }, [userId, profile]);

  usePageSeo(profilePageSeo, profileSocialOverride);

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

  const profilePresenceTargets = useMemo(() => {
    if (!profile || profile.isSelf || !me?.id) return [];
    return [userId];
  }, [profile, me?.id, userId]);

  const profilePresenceQ = useUserPresenceBatch(profilePresenceTargets, {
    enabled: profileQueryEnabled && profilePresenceTargets.length > 0,
  });
  const profilePresenceEntry = profilePresenceQ.data?.byUserId[String(userId)];

  const listAdsParams = { userId, limit: 100 } as const;
  const adsKey = getListAdsQueryKey(listAdsParams);
  const { data: userAds, isLoading: adsLoading } = useListAds(
    listAdsParams,
    {
      query: {
        queryKey: adsKey,
        enabled: profileQueryEnabled,
        staleTime: STALE_AD_LIST_MS,
      },
    },
  );
  const sellerAds = userAds ?? [];

  const blockStatusQueryEnabled =
    profileQueryEnabled &&
    Boolean(me?.id) &&
    profile != null &&
    !profile.isSelf;

  const userBlockStatusQueryKey = ["userBlockStatus", userId, me?.id ?? 0] as const;

  const { data: blockStatus } = useQuery({
    queryKey: userBlockStatusQueryKey,
    enabled: blockStatusQueryEnabled,
    staleTime: STALE_PEER_BLOCK_MS,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/users/${userId}/block-status`), {
        credentials: "include",
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(errBody || `HTTP ${res.status}`);
      }
      return (await res.json()) as { blockedByMe: boolean; blocksMe?: boolean };
    },
  });

  const followMut = useFollowUser();
  const unfollowMut = useUnfollowUser();

  const [reportOpen, setReportOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportExtra, setReportExtra] = useState("");
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [unblockConfirmOpen, setUnblockConfirmOpen] = useState(false);
  const [showMoreHint, setShowMoreHint] = useState(false);
  const [statsSheet, setStatsSheet] = useState<
    null | "followers" | "following" | "views"
  >(null);
  const updateProfile = useAuthUpdateProfile();
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false);
  const [avatarRemoveOpen, setAvatarRemoveOpen] = useState(false);

  const { uploadFile, isUploading } = useUpload({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: getAuthMeQueryKey() });
      await queryClient.invalidateQueries({ queryKey: profileKey });
      toast({ title: t("profile.image_updated") });
    },
    onError: () => {
      toast({
        title: t("profile.image_upload_failed"),
        variant: "destructive",
      });
    },
  });

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

  const csrfHeadersForUserMutations = (): Record<string, string> => {
    const headers: Record<string, string> = { Accept: "application/json" };
    const csrf = getAuthProfileCsrfTokenForRequest();
    if (typeof csrf === "string" && csrf.length >= 32) {
      headers["X-CSRF-Token"] = csrf;
    }
    return headers;
  };

  const submitUserReport = async () => {
    if (!reportReason.trim()) {
      toast({ title: t("user_profile.report.choose_reason_toast"), variant: "destructive" });
      return;
    }
    if (!me) {
      navigate(`/login?redirect=/users/${userId}`);
      return;
    }
    if (reportReason === otherReportLabel && !reportExtra.trim()) {
      toast({ title: t("user_profile.report.add_details_toast"), variant: "destructive" });
      return;
    }
    setReporting(true);
    try {
      const csrf = getAuthProfileCsrfTokenForRequest();
      const reportHeaders: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (typeof csrf === "string" && csrf.length >= 32) {
        reportHeaders["X-CSRF-Token"] = csrf;
      }
      const res = await fetch(apiUrl("/api/reports"), {
        method: "POST",
        headers: reportHeaders,
        credentials: "include",
        body: JSON.stringify({
          targetUserId: userId,
          reason: reportReason,
          description:
            reportReason === otherReportLabel ? reportExtra.trim() : undefined,
        }),
      });
      if (!res.ok) {
        const parsed = await parseUserApiErrorResponse(res);
        showUserApiErrorToast(toast, parsed);
        return;
      }
      toast({
        title: t("user_profile.report.sent_title"),
        description: t("user_profile.report.sent_desc"),
      });
      setReportOpen(false);
      setReportReason("");
      setReportExtra("");
    } catch {
      toast({ title: t("user_profile.report.network_failed"), variant: "destructive" });
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
        headers: csrfHeadersForUserMutations(),
      });
      if (res.ok) {
        toast({ title: t("user_profile.block_success") });
        queryClient.setQueryData<{ blockedByMe: boolean }>(userBlockStatusQueryKey, {
          blockedByMe: true,
        });
        await queryClient.invalidateQueries({ queryKey: userBlockStatusQueryKey });
        await invalidateUserPresenceBatchQueries(queryClient, [userId]);
        return;
      }
    } catch {
      /* network */
    }
    toast({
      title: t("user_profile.block_unavailable_title"),
      description: t("user_profile.block_unavailable_desc"),
      variant: "destructive",
    });
  };

  const attemptUnblockUser = async () => {
    setUnblockConfirmOpen(false);
    if (!me) {
      navigate(`/login?redirect=/users/${userId}`);
      return;
    }
    try {
      const res = await fetch(apiUrl(`/api/users/${userId}/block`), {
        method: "DELETE",
        credentials: "include",
        headers: csrfHeadersForUserMutations(),
      });
      if (res.ok) {
        toast({ title: t("user_profile.unblock_success") });
        queryClient.setQueryData<{ blockedByMe: boolean }>(userBlockStatusQueryKey, {
          blockedByMe: false,
        });
        await queryClient.invalidateQueries({ queryKey: userBlockStatusQueryKey });
        await invalidateUserPresenceBatchQueries(queryClient, [userId]);
        return;
      }
    } catch {
      /* network */
    }
    toast({
      title: t("user_profile.block_unavailable_title"),
      description: t("user_profile.block_unavailable_desc"),
      variant: "destructive",
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

  if (!profileQueryEnabled) {
    return (
      <div
        dir={profileDir}
        className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-[#0A0A0A] px-4 text-center"
      >
        <p className="text-sm text-muted-foreground">{t("user_profile.not_found")}</p>
        <button
          type="button"
          className={cn(AUTH_ACCENT_OUTLINE_BTN, "mt-4 px-5")}
          onClick={() => navigate("/")}
        >
          {t("user_profile.back_home")}
        </button>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        dir={profileDir}
        className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-[#0A0A0A] px-4 text-center"
      >
        <p className="text-sm text-muted-foreground">{t("user_profile.load_error")}</p>
        <button
          type="button"
          className={cn(AUTH_ACCENT_OUTLINE_BTN, "mt-4 px-5")}
          onClick={() => navigate("/")}
        >
          {t("user_profile.back_home")}
        </button>
      </div>
    );
  }

  if (isLoading || !profile) {
    return (
      <div
        dir={profileDir}
        className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-[#0A0A0A]"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isPending = followMut.isPending || unfollowMut.isPending;
  const isSelfProfile = profile.isSelf;
  const memberSince = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString(dateLocale, {
        year: "numeric",
        month: "long",
      })
    : null;

  const avatarBusy =
    isSelfProfile && (isUploading || updateProfile.isPending);

  const handleAvatarPick = () => avatarFileInputRef.current?.click();

  const onAvatarFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !me?.id) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: t("profile.not_an_image"), variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: t("profile.image_too_large"), variant: "destructive" });
      return;
    }
    uploadFile(file, { folder: "avatars", userId: me.id, fileExtension: "jpg" });
    e.target.value = "";
  };

  const handleConfirmRemoveAvatar = () => {
    updateProfile.mutate(
      { data: { avatarUrl: null } },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({ queryKey: getAuthMeQueryKey() });
          await queryClient.invalidateQueries({ queryKey: profileKey });
          toast({ title: t("profile.avatar_removed") });
          setAvatarRemoveOpen(false);
        },
        onError: () => {
          toast({
            title: t("profile.avatar_remove_failed"),
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <motion.div
      dir={profileDir}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex min-h-[100dvh] w-full min-w-0 flex-col overflow-x-hidden bg-[#0A0A0A] pb-10"
    >
      <div className={`${PAGE_INSET} pb-2 pt-3 md:pt-4`}>
        <div className="flex items-center justify-between gap-3 py-1">
          <button
            type="button"
            onClick={() => window.history.back()}
            className={publicProfileHeaderBtn}
            aria-label={t("user_profile.back_aria")}
          >
            <ArrowRight className="h-5 w-5" strokeWidth={2.25} />
          </button>
          <span className="min-w-0 flex-1" aria-hidden="true" />
          {!isSelfProfile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={publicProfileHeaderBtn}
                  aria-label={t("user_profile.more_aria")}
                  onClick={() => dismissMoreHint()}
                >
                  <MoreVertical className="h-5 w-5" strokeWidth={2.25} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={dropdownSurface} dir={profileDir}>
                <DropdownMenuItem
                  className={dropdownItemClass}
                  onSelect={() => setReportOpen(true)}
                >
                  <Flag className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.25} />
                  {t("user_profile.report_user")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={dropdownItemClass}
                  onSelect={() =>
                    blockStatus?.blockedByMe
                      ? setUnblockConfirmOpen(true)
                      : setBlockConfirmOpen(true)
                  }
                >
                  {blockStatus?.blockedByMe ? (
                    <>
                      <ShieldOff className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.25} />
                      {t("user_profile.unblock_menu")}
                    </>
                  ) : (
                    <>
                      <ShieldBan className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.25} />
                      {t("user_profile.block_confirm_cta")}
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="inline-block h-11 w-11 shrink-0" aria-hidden />
          )}
        </div>
      </div>

      {showMoreHint && !isSelfProfile && (
        <div className={`${PAGE_INSET} pb-2`}>
          <div className="flex items-start justify-between gap-2 rounded-2xl border border-amber-500/35 bg-[#0A0A0A]/80 px-3 py-2.5 text-xs leading-relaxed text-foreground/90 shadow-[0_0_20px_-8px_hsl(var(--primary)/0.15)] ring-1 ring-amber-500/15">
            <span>{t("user_profile.more_hint")}</span>
            <button
              type="button"
              onClick={dismissMoreHint}
              className="shrink-0 text-[11px] font-medium text-primary underline underline-offset-2"
            >
              {t("user_profile.more_hint_dismiss")}
            </button>
          </div>
        </div>
      )}

      <div className={cn(PAGE_INSET, "min-w-0 flex-1 py-2 md:py-3")}>
        <section
          dir={profileDir}
          className={profileSectionClassName("overflow-hidden")}
          data-testid="public-profile-identity"
        >
          <div className={cn(PROFILE_SECTION_HEADER, profileDir === "rtl" ? "text-right" : "text-left")}>
            <p className={PROFILE_SECTION_LABEL}>{t("user_profile.section.identity")}</p>
          </div>

          <div className="px-2.5 py-3 md:px-3">
            <div className="flex items-start gap-3">
              <div className="relative shrink-0">
                <button
                  type="button"
                  disabled={isSelfProfile ? avatarBusy : false}
                  onClick={() => {
                    if (isSelfProfile && !profile.avatarUrl) {
                      handleAvatarPick();
                      return;
                    }
                    setAvatarPreviewOpen(true);
                  }}
                  aria-label={
                    profile.avatarUrl
                      ? t("profile.avatar_preview.open")
                      : isSelfProfile
                        ? t("profile.change_avatar")
                        : t("profile.avatar_preview.title")
                  }
                  className="rounded-full p-[3px] shadow-[0_0_16px_-4px_rgba(182,227,86,0.28)] transition-[opacity,transform] hover:opacity-95 active:scale-[0.99] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
                  style={{
                    background:
                      "linear-gradient(145deg, rgba(182,227,86,0.5), rgba(182,227,86,0.08))",
                  }}
                >
                  <div className="rounded-full bg-black p-[2px]">
                    <AvatarCircle name={profile.name} src={profile.avatarUrl} size={80} />
                  </div>
                </button>
                {isSelfProfile && !profile.avatarUrl ? (
                  <ProfileAvatarCameraBadge
                    onClick={handleAvatarPick}
                    disabled={avatarBusy}
                    busy={avatarBusy}
                  />
                ) : null}
                {isSelfProfile ? (
                  <input
                    ref={avatarFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onAvatarFileChange}
                  />
                ) : null}
              </div>

              <div className={cn("min-w-0 flex-1 overflow-hidden", profileTextAlign(profileDir))}>
                <h1 className="truncate text-xl font-bold leading-tight text-foreground md:text-2xl">
                  {profile.name}
                </h1>
                {profilePresenceTargets.length > 0 ? (
                  <div className="mt-1.5 w-full min-w-0 overflow-hidden">
                    <UserPresenceBadge
                      entry={profilePresenceEntry}
                      isLoading={profilePresenceQ.isPending}
                      variant="default"
                    />
                  </div>
                ) : null}
                {profile.city ? (
                  <p className="mt-1.5 text-[0.82rem] leading-tight text-muted-foreground md:text-sm">
                    <span className="inline-flex max-w-full min-w-0 items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.25} />
                      <span className="min-w-0 truncate">{profile.city}</span>
                    </span>
                  </p>
                ) : null}
                {memberSince ? (
                  <p className="mt-1.5 text-[0.8rem] leading-tight text-muted-foreground/85 md:text-sm">
                    <span className="inline-flex max-w-full min-w-0 items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.25} />
                      <span className="min-w-0 truncate">
                        {t("profile.member_since", { date: memberSince })}
                      </span>
                    </span>
                  </p>
                ) : null}
              </div>
            </div>

            {!isSelfProfile ? (
              <button
                type="button"
                onClick={toggleFollow}
                disabled={isPending}
                className={cn(
                  publicProfileFollowBtn,
                  "mt-3 border-t border-primary/15 pt-3",
                  profile.isFollowing
                    ? "border-primary/40 bg-[#0A0A0A]/90 text-foreground hover:bg-black/95"
                    : "border-primary/55 bg-[#0A0A0A]/90 text-primary hover:border-primary/70 hover:bg-black/95",
                )}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : profile.isFollowing ? (
                  <>
                    <UserCheck className="h-4 w-4 shrink-0" strokeWidth={2.25} />
                    {t("user_profile.following_active")}
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 shrink-0" strokeWidth={2.25} />
                    {t("user_profile.follow")}
                  </>
                )}
              </button>
            ) : null}
          </div>
        </section>

        <ProfileMetricsBand
          className={PROFILE_SECTION_STACK_GAP}
          dir={profileDir}
          adCount={profile.adCount}
          profileViews={profile.profileViews}
          followerCount={profile.followerCount}
          followingCount={profile.followingCount}
          numberLocale={numberLocale}
          onFollowersClick={() => setStatsSheet("followers")}
          onFollowingClick={() => setStatsSheet("following")}
          onViewsClick={() => setStatsSheet("views")}
        />

        <section
          dir={profileDir}
          className={profileSectionClassName(cn("overflow-hidden", PROFILE_SECTION_STACK_GAP))}
          data-testid="public-profile-ads"
        >
          <div
            className={cn(
              PROFILE_SECTION_HEADER,
              "flex items-center justify-between gap-2",
              profileDir === "rtl" ? "text-right" : "text-left",
            )}
          >
            <p className={PROFILE_SECTION_LABEL}>{t("user_profile.section.ads")}</p>
            <span className="shrink-0 text-[11px] font-medium tabular-nums text-primary/85 md:text-xs">
              {t("user_profile.ads_count", { count: profile.adCount ?? sellerAds.length })}
            </span>
          </div>

          <div className="min-w-0 border-t border-primary/20 px-2 pb-2 pt-1.5 md:px-2.5 md:pb-2.5 md:pt-2">
            {adsLoading ? (
              <div className={publicProfileAdsGrid}>
                {Array.from({ length: profile.adCount === 1 ? 2 : 4 }).map((_, i) => (
                  <div key={i} className="h-full min-h-0">
                    <AdCardSkeleton homeFeed />
                  </div>
                ))}
              </div>
            ) : sellerAds.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary shadow-[0_0_18px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/20">
                  <Megaphone className="h-7 w-7" strokeWidth={2.25} />
                </div>
                <p className="text-sm font-medium text-foreground">{t("user_profile.empty_ads")}</p>
              </div>
            ) : (
              <div className={publicProfileAdsGrid}>
                {sellerAds.map((ad) => (
                  <div key={ad.id} className="h-full min-h-0">
                    <HomeFeedAdCard ad={ad} />
                  </div>
                ))}
              </div>
            )}
          </div>
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
        {statsSheet !== null ? (
          <ProfileStatsListsPanel
            sheet={statsSheet}
            profileUserId={userId}
            isSelf={Boolean(profile?.isSelf)}
            viewerUserId={me?.id}
          />
        ) : null}
      </ProfileStatsDetailSheet>

      <ProfileAvatarPreviewDialog
        open={avatarPreviewOpen}
        onOpenChange={setAvatarPreviewOpen}
        name={profile.name}
        avatarUrl={profile.avatarUrl}
        canManage={isSelfProfile}
        busy={avatarBusy}
        onEdit={handleAvatarPick}
        onDelete={() => setAvatarRemoveOpen(true)}
      />

      <AlertDialog open={avatarRemoveOpen} onOpenChange={setAvatarRemoveOpen}>
        <AlertDialogContent
          dir={profileDir}
          className={cn(
            SETTINGS_DIALOG_CONTENT,
            "!p-0 gap-0 overflow-hidden sm:max-w-md",
            profileDir === "rtl" ? "text-right" : "text-left",
          )}
        >
          <div className="border-b border-primary/20 px-5 py-4">
            <AlertDialogHeader className={cn("space-y-1.5", profileTextAlign(profileDir))}>
              <AlertDialogTitle className={cn("text-base font-bold text-foreground", profileTextAlign(profileDir))}>
                {t("profile.avatar_remove_dialog.title")}
              </AlertDialogTitle>
              <AlertDialogDescription className={cn("text-sm leading-relaxed text-zinc-400", profileTextAlign(profileDir))}>
                {t("profile.avatar_remove_dialog.description")}
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <AlertDialogFooter className="flex flex-col-reverse gap-2 border-t border-primary/20 bg-[#0A0A0A]/98 p-4 sm:flex-row sm:justify-stretch sm:gap-3">
            <AlertDialogCancel
              className={cn(SETTINGS_OUTLINE_BUTTON, "m-0 mt-0 w-full sm:flex-1")}
            >
              {t("profile.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemoveAvatar}
              className={cn(
                "m-0 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-red-500/45 bg-red-950/40 px-4 text-sm font-semibold text-red-100 shadow-[0_0_22px_-12px_rgba(239,68,68,0.35)] ring-1 ring-red-500/22 transition-colors hover:border-red-500/58 hover:bg-red-950/55 sm:flex-1",
              )}
            >
              {t("profile.avatar_remove_dialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent
          hideClose
          dir={locale === "ar" ? "rtl" : "ltr"}
          className={cn(dialogSurface, reportTextAlign)}
        >
          <DialogHeader
            className={cn(
              "border-b border-primary/15 px-4 pb-3 pt-4",
              reportTextAlign,
            )}
          >
            <DialogTitle className="text-base font-bold text-foreground">
              {t("user_profile.report.dialog_title")}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[min(56vh,420px)] space-y-3 overflow-y-auto px-4 py-4">
            <p className="text-xs font-medium text-muted-foreground">
              {t("user_profile.report.pick_reason_hint")}
            </p>
            <div className="space-y-2">
              {userReportReasonOptions.map((reasonOpt) => (
                <button
                  key={reasonOpt}
                  type="button"
                  onClick={() => setReportReason(reasonOpt)}
                  className={reportReasonBtn(reportReason === reasonOpt, reportTextAlign)}
                >
                  {reasonOpt}
                </button>
              ))}
            </div>
            {reportReason === otherReportLabel && (
              <textarea
                placeholder={t("user_profile.report.details_placeholder")}
                className={cn(
                  "min-h-[88px] w-full rounded-xl border border-primary/28 bg-[#0A0A0A]/90 p-3 text-sm text-foreground shadow-inner ring-1 ring-primary/10 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                  reportTextAlign,
                )}
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
                (reportReason === otherReportLabel && !reportExtra.trim())
              }
              className={cn(
                AUTH_ACCENT_OUTLINE_BTN,
                "hover:bg-black/30",
              )}
              onClick={() => void submitUserReport()}
            >
              {reporting
                ? t("user_profile.report.submitting")
                : t("user_profile.report.submit")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={blockConfirmOpen} onOpenChange={setBlockConfirmOpen}>
        <AlertDialogContent dir={profileDir} className={cn(alertSurface, profileTextAlign(profileDir))}>
          <AlertDialogHeader className={cn("space-y-2", profileTextAlign(profileDir))}>
            <AlertDialogTitle className="text-lg font-bold text-foreground">
              {t("user_profile.block_confirm_title")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
              {t("user_profile.block_confirm_desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div
            className={cn(
              "flex flex-wrap gap-2 pt-4",
              profileDir === "rtl" ? "flex-row-reverse" : "flex-row",
            )}
          >
            <button
              type="button"
              onClick={() => void attemptBlockUser()}
              className={cn(
                "inline-flex h-11 min-w-[8rem] flex-1 items-center justify-center rounded-xl border border-red-500/40 bg-[#0A0A0A]/90 px-4 text-sm font-semibold text-red-200 shadow-[0_0_18px_-12px_rgba(239,68,68,0.35)] ring-1 ring-red-500/15 transition-colors hover:border-red-500/55 hover:bg-red-950/25 sm:flex-none",
              )}
            >
              {t("user_profile.block_confirm_cta")}
            </button>
            <AlertDialogCancel
              className={cn(
                "mt-0 h-11 flex-1 rounded-xl border border-primary/35 bg-[#0A0A0A]/90 text-sm font-semibold text-foreground hover:bg-black/30 sm:flex-none",
              )}
            >
              {t("user_profile.block_cancel")}
            </AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={unblockConfirmOpen} onOpenChange={setUnblockConfirmOpen}>
        <AlertDialogContent dir={profileDir} className={cn(alertSurface, profileTextAlign(profileDir))}>
          <AlertDialogHeader className={cn("space-y-2", profileTextAlign(profileDir))}>
            <AlertDialogTitle className="text-lg font-bold text-foreground">
              {t("user_profile.unblock_confirm_title")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
              {t("user_profile.unblock_confirm_desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div
            className={cn(
              "flex flex-wrap gap-2 pt-4",
              profileDir === "rtl" ? "flex-row-reverse" : "flex-row",
            )}
          >
            <button
              type="button"
              onClick={() => void attemptUnblockUser()}
              className={cn(
                "inline-flex h-11 min-w-[8rem] flex-1 items-center justify-center rounded-xl border border-primary/45 bg-primary/15 px-4 text-sm font-semibold text-primary shadow-[0_0_18px_-12px_hsl(var(--primary)/0.35)] ring-1 ring-primary/15 transition-colors hover:bg-primary/22 sm:flex-none",
              )}
            >
              {t("user_profile.unblock_confirm_cta")}
            </button>
            <AlertDialogCancel
              className={cn(
                "mt-0 h-11 flex-1 rounded-xl border border-primary/35 bg-[#0A0A0A]/90 text-sm font-semibold text-foreground hover:bg-black/30 sm:flex-none",
              )}
            >
              {t("user_profile.unblock_cancel")}
            </AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

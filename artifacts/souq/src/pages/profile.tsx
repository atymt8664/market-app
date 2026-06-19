import { Link, Redirect, useLocation } from "wouter";
import {
  Trash2,
  Pencil,
  Plus,
  Settings,
  Share2,
  Eye,
  MapPin,
  UserCheck,
  Heart,
  Clock,
  User as UserIcon,
  MoreVertical,
  RefreshCw,
  ThumbsUp,
  ArrowUp,
  Package,
} from "lucide-react";
import { useState, useRef, useLayoutEffect, useCallback } from "react";
import {
  useListMyAds,
  useDeleteAd,
  getListMyAdsQueryKey,
  useAuthUpdateProfile,
  getAuthMeQueryKey,
  useListFavoriteAds,
  type Ad,
  ApiError,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { favoritesListQueryKey } from "@/lib/invalidate-ad-queries";
import { useUpload } from "@workspace/object-storage-web";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { AdCard, AdCardSkeleton } from "@/components/ad-card";
import {
  FavoriteListItem,
  FavoriteListItemSkeleton,
} from "@/components/favorite-list-item";
import { AdCardNoImagePlaceholder } from "@/components/ad-card-no-image-placeholder";
import { AvatarCircle } from "@/components/avatar-circle";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/hooks/use-locale";
import { t } from "@/i18n";
import { ProfileIdentityStrip, type ProfilePlanTier } from "@/components/profile-identity-strip";
import {
  ProfileContentTabShell,
  type ProfileContentTab,
} from "@/components/profile-content-tab-shell";
import { PROFILE_SECTION_STACK_GAP } from "@/components/profile-section-shell";
import {
  SETTINGS_DIALOG_CONTENT,
  SETTINGS_OUTLINE_BUTTON,
  SETTINGS_PRIMARY_BUTTON,
} from "@/components/settings-shell";
import { OrdersAccountCardGrid } from "@/features/p17-commerce/orders-account-card-grid";
import {
  ProfileAvatarPreviewDialog,
  ProfileAvatarCameraBadge,
} from "@/components/profile-avatar-preview-dialog";
import { formatRelativeTime } from "@/lib/format";
import { getPublicAdUrl, getPublicUserProfileUrl } from "@/lib/public-url";
import { buildAdShareText, buildProfileShareText } from "@/lib/share-text";
import { shareOrCopyLink, tryAdImageAsShareFile } from "@/lib/native-share";
import { cn } from "@/lib/utils";
import { BOTTOM_NAV_PAGE_SHELL_CLASS, BOTTOM_NAV_SCROLL_END_SPACER_CLASS } from "@/lib/bottom-nav-layout";
import { useAppChromeContext } from "@/contexts/app-chrome-context";
import { STALE_USER_ADS_MS } from "@/lib/query-stale-times";
import { stashPromoteAdPreview } from "@/lib/promote-ad-preview";
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
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

import {
  TAB_PAGE_HEADER_ACTION_BTN,
  TAB_PAGE_HEADER_ACTION_ICON,
  TAB_PAGE_HEADER_ACTIONS_GAP,
} from "@/lib/tab-page-header-styles";

const profilePageColumn =
  "mx-auto w-full max-w-screen-sm px-3 md:max-w-[760px] md:px-6 lg:max-w-[860px]";

/** نفس تعريفات كروت صفحة «نشر إعلان» (`create-ad.tsx` — adCardShell / adCardShellCompact) */
const AD_CARD_SHELL =
  "rounded-2xl border border-primary/40 bg-[#0A0A0A]/75 shadow-[0_0_22px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10";

/** أزرار إجراءات كرت الإعلان — mini-card موحّد مع هوية الكروت / الشريط السفلي */
const PROFILE_AD_ACTION_SHELL =
  "inline-flex min-h-10 w-full items-center justify-center rounded-xl border px-2 text-xs font-semibold shadow-[0_0_18px_-14px_hsl(var(--primary)/0.14)] ring-1 transition hover:shadow-[0_0_22px_-12px_hsl(var(--primary)/0.22)] active:scale-[0.98] md:min-h-[2.5rem]";

const profileAdActionSecondary = cn(
  PROFILE_AD_ACTION_SHELL,
  "border-primary/32 bg-[#0A0A0A]/82 text-primary ring-primary/12 hover:border-primary/45 hover:bg-black/92",
);

const profileAdActionPromote = cn(
  PROFILE_AD_ACTION_SHELL,
  "gap-1 border-primary/48 bg-[#0A0A0A]/90 font-bold text-primary shadow-[0_0_26px_-12px_hsl(var(--primary)/0.34)] ring-primary/22 hover:border-primary/58 hover:bg-black/95 hover:shadow-[0_0_30px_-10px_hsl(var(--primary)/0.4)]",
);

const profileAdActionDelete = cn(
  PROFILE_AD_ACTION_SHELL,
  "border-red-500/38 bg-red-950/[0.22] text-red-300 shadow-[0_0_18px_-14px_rgba(239,68,68,0.18)] ring-red-500/18 hover:border-red-500/48 hover:bg-red-950/35",
);

/** P9-PROFILE-ADS-CARD-COMPACT-POLISH — profile /profile my-ads only */
const PROFILE_MY_ADS_CARD_SHELL = cn(AD_CARD_SHELL, "p-2.5 md:p-2.5 lg:p-3");

const PROFILE_MY_ADS_EMPTY =
  "w-full shrink-0 py-3 text-center";

const AD_DELETE_LINKED_ORDERS_CODE = "AD_DELETE_LINKED_ORDERS";

function isAdDeleteLinkedOrdersError(err: unknown): boolean {
  if (!(err instanceof ApiError) || err.status !== 409) return false;
  const data = err.data as { code?: string } | null;
  return data?.code === AD_DELETE_LINKED_ORDERS_CODE;
}

export default function Profile() {
  const { locale } = useLocale();
  const profileDir = locale === "ar" ? "rtl" : "ltr";
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteAdMutation = useDeleteAd();
  const updateProfile = useAuthUpdateProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [adToDelete, setAdToDelete] = useState<number | null>(null);
  const [adDeleteBlockedOpen, setAdDeleteBlockedOpen] = useState(false);
  const [actionAd, setActionAd] = useState<Ad | null>(null);
  const [avatarRemoveOpen, setAvatarRemoveOpen] = useState(false);
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false);

  const { data: myAds, isLoading: adsLoading } = useListMyAds({
    query: {
      queryKey: getListMyAdsQueryKey(),
      enabled: !!user,
      retry: false,
      staleTime: STALE_USER_ADS_MS,
    },
  });
  const [activeTab, setActiveTab] = useState<ProfileContentTab>("my-ads");
  const [planTier, setPlanTier] = useState<ProfilePlanTier>("personal");
  const { data: favoriteAdsData, isLoading: favoritesLoading } = useListFavoriteAds({
    query: {
      queryKey: favoritesListQueryKey(),
      enabled: !!user,
      retry: false,
      staleTime: STALE_USER_ADS_MS,
    },
  });
  const favoriteAds = Array.isArray(favoriteAdsData) ? favoriteAdsData : [];

  const { uploadFile, isUploading } = useUpload({
    /** Upload endpoint already persists `avatarUrl`; only refresh session — PATCH rejects Supabase public URLs. */
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: getAuthMeQueryKey() });
      toast({ title: t("profile.image_updated") });
    },
    onError: () => {
      toast({ title: t("profile.image_upload_failed"), variant: "destructive" });
    },
  });

  const { setOverride } = useAppChromeContext();

  const handleShare = useCallback(async () => {
    if (!user) return;
    const url = getPublicUserProfileUrl(user.id);
    const text = buildProfileShareText(user.name, user.city, url);
    const outcome = await shareOrCopyLink({
      title: user.name,
      text,
      url,
    });
    if (outcome === "copied") {
      toast({ title: t("share.link_copied") });
    } else if (outcome === "failed") {
      toast({
        title: t("ad_detail.copy_failed"),
        description: t("ad_detail.copy_failed_desc"),
        variant: "destructive",
      });
    }
  }, [user, toast]);

  useLayoutEffect(() => {
    if (!user) {
      setOverride({});
      return () => setOverride({});
    }
    setOverride({
      trailing: (
        <div className={cn("flex shrink-0 items-center", TAB_PAGE_HEADER_ACTIONS_GAP)} dir="ltr">
          <button
            type="button"
            onClick={() => void handleShare()}
            aria-label={t("profile.share")}
            className={TAB_PAGE_HEADER_ACTION_BTN}
          >
            <Share2 className={TAB_PAGE_HEADER_ACTION_ICON} strokeWidth={2.25} />
          </button>
          <Link href="/settings">
            <button
              type="button"
              aria-label={t("profile.settings")}
              className={TAB_PAGE_HEADER_ACTION_BTN}
            >
              <Settings className={TAB_PAGE_HEADER_ACTION_ICON} strokeWidth={2.25} />
            </button>
          </Link>
        </div>
      ),
    });
    return () => setOverride({});
  }, [user, setOverride, handleShare]);

  if (authLoading) {
    return (
      <div className={cn(BOTTOM_NAV_PAGE_SHELL_CLASS, "items-center justify-center")}>
        <div className="w-12 h-12 rounded-full border-4 border-muted border-t-primary animate-spin" />
      </div>
    );
  }

  if (!user) return <Redirect to="/guest-welcome?redirect=/profile" />;

  const handleDelete = () => {
    if (adToDelete === null) return;
    deleteAdMutation.mutate(
      { adId: adToDelete },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({
            queryKey: getListMyAdsQueryKey(),
          });
          toast({ title: t("profile.ad_deleted") });
          setAdToDelete(null);
        },
        onError: (err) => {
          setAdToDelete(null);
          if (isAdDeleteLinkedOrdersError(err)) {
            setAdDeleteBlockedOpen(true);
            return;
          }
          toast({ title: t("profile.ad_delete_failed"), variant: "destructive" });
        },
      },
    );
  };

  const openPromoteForAd = (ad: Ad) => {
    stashPromoteAdPreview(ad.id, { title: ad.title, imageUrl: ad.images?.[0] ?? null });
    navigate(`/promote/${ad.id}`);
  };

  const handleShareAd = async (ad: Ad) => {
    const url = getPublicAdUrl(ad.id);
    const text = buildAdShareText(ad, url);
    const imageFile = await tryAdImageAsShareFile(ad.images?.[0]);
    const outcome = await shareOrCopyLink({
      title: ad.title,
      text,
      url,
      imageFile,
    });
    if (outcome === "copied") {
      toast({ title: t("share.link_copied") });
    } else if (outcome === "failed") {
      toast({
        title: t("ad_detail.copy_failed"),
        description: t("ad_detail.copy_failed_desc"),
        variant: "destructive",
      });
    }
  };

  const handleAvatarPick = () => fileInputRef.current?.click();
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: t("profile.not_an_image"), variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: t("profile.image_too_large"), variant: "destructive" });
      return;
    }
    uploadFile(file, { folder: "avatars", userId: user?.id, fileExtension: "jpg" });
    e.target.value = "";
  };

  const handleConfirmRemoveAvatar = () => {
    updateProfile.mutate(
      { data: { avatarUrl: null } },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({ queryKey: getAuthMeQueryKey() });
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

  const adCount = user?.adCount ?? myAds?.length ?? 0;
  const isMyAdsEmpty = activeTab === "my-ads" && !adsLoading && adCount === 0;
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("ar", {
        year: "numeric",
        month: "long",
      })
    : null;
  const avatarBusy = isUploading || updateProfile.isPending;

  return (
    <div className={cn(BOTTOM_NAV_PAGE_SHELL_CLASS)}>
      <div className="shrink-0 bg-[#0A0A0A]" data-testid="profile-pinned-header">
        <div className={cn(profilePageColumn, "pt-2 md:pt-3")}>
          <div dir="rtl">
            <div className="flex min-w-0 flex-col items-start gap-2.5 text-right">
              <div className="relative shrink-0">
                <button
                  type="button"
                  disabled={avatarBusy}
                  onClick={() =>
                    user.avatarUrl ? setAvatarPreviewOpen(true) : handleAvatarPick()
                  }
                  aria-label={
                    user.avatarUrl
                      ? t("profile.avatar_preview.open")
                      : t("profile.change_avatar")
                  }
                  className="rounded-full p-[3px] shadow-[0_0_16px_-4px_rgba(182,227,86,0.28)] transition-[opacity,transform] hover:opacity-95 active:scale-[0.99] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
                  style={{
                    background:
                      "linear-gradient(145deg, rgba(182,227,86,0.5), rgba(182,227,86,0.08))",
                  }}
                >
                  <div className="rounded-full bg-black p-[2px]">
                    <AvatarCircle name={user.name} src={user.avatarUrl} size={80} />
                  </div>
                </button>
                {!user.avatarUrl ? (
                  <ProfileAvatarCameraBadge
                    onClick={handleAvatarPick}
                    disabled={avatarBusy}
                    busy={avatarBusy}
                  />
                ) : null}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onFileChange}
                />
              </div>

              <h2 className="max-w-full truncate text-right text-xl font-bold leading-tight text-foreground md:text-2xl">
                {user.name}
              </h2>
              <p className="text-right text-[0.82rem] leading-tight text-muted-foreground md:text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <UserIcon className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.25} />
                  {t("profile.seller_type")}
                </span>
              </p>
              {memberSince ? (
                <p className="text-right text-[0.8rem] leading-tight text-muted-foreground/85 md:text-sm">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.25} />
                    {t("profile.member_since", { date: memberSince })}
                  </span>
                </p>
              ) : null}
            </div>
          </div>

          <OrdersAccountCardGrid
            className={PROFILE_SECTION_STACK_GAP}
            onBuyerNavigate={() => navigate("/orders")}
            onSellerNavigate={() => navigate("/seller-orders")}
          />

          <ProfileIdentityStrip
            className={PROFILE_SECTION_STACK_GAP}
            dir={profileDir}
            planTier={planTier}
            onPlanTierChange={setPlanTier}
          />
        </div>
      </div>

      <div
        className={cn(
          profilePageColumn,
          "flex min-h-0 flex-col pb-1",
          isMyAdsEmpty ? "shrink-0" : "flex-1",
        )}
      >
        <ProfileContentTabShell
          className={cn(
            PROFILE_SECTION_STACK_GAP,
            isMyAdsEmpty ? "h-fit shrink-0" : "min-h-0 flex-1",
          )}
          panelScrollable={!isMyAdsEmpty}
          dir={profileDir}
          value={activeTab}
          onChange={setActiveTab}
          ariaLabel={t("profile.tabs.nav_aria")}
          tabs={[
            { value: "my-ads", label: t("profile.tabs.my_ads") },
            { value: "favorites", label: t("profile.tabs.favorites") },
            { value: "public", label: t("profile.tabs.public") },
          ]}
        >
          {activeTab === "my-ads" ? (
            !adsLoading && adCount === 0 ? (
              <div className={PROFILE_MY_ADS_EMPTY} data-testid="profile-my-ads-empty">
                <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <Plus className="h-5 w-5" />
                </div>
                <h3 className="mb-0.5 text-base font-bold">{t("profile.empty.first_ad_title")}</h3>
                <p className="mb-3 text-sm text-muted-foreground">{t("profile.empty.first_ad_subtitle")}</p>
                <Link href="/new">
                  <Button className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-primary/50 bg-[#0A0A0A]/92 px-5 py-2.5 text-sm font-semibold text-primary shadow-[0_0_18px_-10px_hsl(var(--primary)/0.32)] ring-1 ring-primary/18 transition-colors hover:border-primary/65 hover:bg-black/95 hover:shadow-[0_0_24px_-10px_hsl(var(--primary)/0.42)] active:scale-[0.98]">
                    <Plus className="w-4 h-4 text-primary" />
                    {t("profile.empty.create_ad")}
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
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:gap-3 lg:grid-cols-3">
                {Array.isArray(myAds) &&
                  myAds.map((ad) => (
                    <div key={ad.id} className="relative w-full">
                      <div className="md:hidden">
                        <ProfileMobileAdCard
                          ad={ad}
                          onOpen={() => navigate(`/ad/${ad.id}`)}
                          onOpenActions={() => setActionAd(ad)}
                          onEdit={() => navigate(`/edit/${ad.id}`)}
                          onDelete={() => setAdToDelete(ad.id)}
                          onPromote={() => openPromoteForAd(ad)}
                        />
                      </div>
                      <div className="hidden md:block">
                        <ProfileDesktopAdCard
                          ad={ad}
                          onOpen={() => navigate(`/ad/${ad.id}`)}
                          showActions
                          onEdit={() => navigate(`/edit/${ad.id}`)}
                          onDelete={() => setAdToDelete(ad.id)}
                          onPromote={() => openPromoteForAd(ad)}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            )
          ) : activeTab === "favorites" ? (
            favoritesLoading ? (
              <ul className="mx-auto flex w-full max-w-lg flex-col gap-2 sm:max-w-xl md:max-w-2xl md:gap-2.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <FavoriteListItemSkeleton key={i} />
                ))}
              </ul>
            ) : favoriteAds.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">{t("profile.favorites.empty")}</div>
            ) : (
              <ul className="mx-auto flex w-full max-w-lg flex-col gap-2 sm:max-w-xl md:max-w-2xl md:gap-2.5">
                {favoriteAds.map((ad) => (
                  <FavoriteListItem key={ad.id} ad={ad} />
                ))}
              </ul>
            )
          ) : (
            <div
              className={cn(
                AD_CARD_SHELL,
                "p-4 text-right md:p-5",
              )}
            >
              <h3 className="text-base font-semibold leading-snug text-foreground md:text-lg">
                شاهد ملفك كما يراه الآخرون
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                يمكنك مراجعة إعلاناتك وبياناتك العامة كما تظهر للزوار.
              </p>
              <Link
                href={`/users/${user.id}`}
                className={cn(
                  "mt-5 flex w-full min-w-0 max-w-full items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-[#0A0A0A]/90 px-1 py-3.5 text-sm font-semibold text-foreground shadow-[0_0_10px_-6px_hsl(var(--primary)/0.15)] transition-colors hover:border-primary/55 hover:bg-black/95",
                )}
              >
                <UserCheck className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.25} />
                فتح الملف العام
              </Link>
            </div>
          )}
        </ProfileContentTabShell>
      </div>

      <div
        aria-hidden
        className={BOTTOM_NAV_SCROLL_END_SPACER_CLASS}
        data-testid="profile-scroll-spacer"
      />

      <ProfileAvatarPreviewDialog
        open={avatarPreviewOpen}
        onOpenChange={setAvatarPreviewOpen}
        name={user.name}
        avatarUrl={user.avatarUrl}
        canManage
        busy={avatarBusy}
        onEdit={handleAvatarPick}
        onDelete={() => setAvatarRemoveOpen(true)}
      />

      <AlertDialog open={avatarRemoveOpen} onOpenChange={setAvatarRemoveOpen}>
        <AlertDialogContent
          dir="rtl"
          className={cn(
            SETTINGS_DIALOG_CONTENT,
            "!p-0 gap-0 overflow-hidden text-right sm:max-w-md",
          )}
        >
          <div className="border-b border-primary/20 px-5 py-4">
            <AlertDialogHeader className="space-y-1.5 text-right">
              <AlertDialogTitle className="text-right text-base font-bold text-foreground">
                {t("profile.avatar_remove_dialog.title")}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-right text-sm leading-relaxed text-zinc-400">
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

      <AlertDialog
        open={adToDelete !== null}
        onOpenChange={(open) => !open && setAdToDelete(null)}
      >
        <AlertDialogContent
          dir="rtl"
          className={cn(
            SETTINGS_DIALOG_CONTENT,
            "!p-0 gap-0 overflow-hidden text-right sm:max-w-md",
          )}
        >
          <div className="border-b border-primary/20 px-5 py-4">
            <AlertDialogHeader className="space-y-1.5 text-right">
              <AlertDialogTitle className="text-right text-base font-bold text-foreground">
                {t("profile.delete_dialog.title")}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-right text-sm leading-relaxed text-zinc-400">
                {t("profile.delete_dialog.description")}
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
              onClick={handleDelete}
              className={cn(
                "m-0 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-red-500/45 bg-red-950/40 px-4 text-sm font-semibold text-red-100 shadow-[0_0_22px_-12px_rgba(239,68,68,0.35)] ring-1 ring-red-500/22 transition-colors hover:border-red-500/58 hover:bg-red-950/55 sm:flex-1",
              )}
            >
              {t("profile.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={adDeleteBlockedOpen} onOpenChange={setAdDeleteBlockedOpen}>
        <AlertDialogContent
          dir={profileDir}
          className={cn(
            SETTINGS_DIALOG_CONTENT,
            "!p-0 gap-0 overflow-hidden sm:max-w-md",
            profileDir === "rtl" ? "text-right" : "text-left",
          )}
        >
          <div className="border-b border-primary/20 px-5 py-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/45 bg-[#0A0A0A]/76 text-primary shadow-[0_0_18px_-12px_hsl(var(--primary)/0.35)]">
                <Package className="h-5 w-5" aria-hidden />
              </div>
              <AlertDialogHeader className={cn("space-y-2", profileDir === "rtl" ? "text-right" : "text-left")}>
                <AlertDialogTitle className="text-base font-bold text-foreground">
                  {t("profile.delete_blocked_dialog.title")}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
                  {t("profile.delete_blocked_dialog.description")}
                </AlertDialogDescription>
              </AlertDialogHeader>
            </div>
          </div>
          <AlertDialogFooter className="border-t border-primary/20 bg-[#0A0A0A]/98 p-4">
            <AlertDialogAction
              className={cn(SETTINGS_PRIMARY_BUTTON, "m-0 h-11 w-full rounded-xl")}
            >
              {t("profile.delete_blocked_dialog.dismiss")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Drawer open={!!actionAd} onOpenChange={(open) => !open && setActionAd(null)}>
        <DrawerContent className="rounded-t-2xl border-border bg-[#0A0A0A]/95">
          <DrawerHeader className="text-right">
            <DrawerTitle>{t("profile.actions.title")}</DrawerTitle>
            <DrawerDescription className="text-xs">{actionAd?.title}</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-2 px-3 pb-4" dir="rtl">
            <button
              type="button"
              onClick={() => {
                if (!actionAd) return;
                navigate(`/edit/${actionAd.id}`);
                setActionAd(null);
              }}
              className={cn(
                profileAdActionSecondary,
                "min-h-12 justify-between px-3 py-3 text-sm font-medium",
              )}
            >
              <Pencil className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.25} />
              <span>{t("profile.actions.edit")}</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!actionAd) return;
                await handleShareAd(actionAd);
                setActionAd(null);
              }}
              className={cn(
                profileAdActionSecondary,
                "min-h-12 justify-between px-3 py-3 text-sm font-medium",
              )}
            >
              <Share2 className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.25} />
              <span>{t("profile.actions.share")}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!actionAd) return;
                openPromoteForAd(actionAd);
                setActionAd(null);
              }}
              className={cn(
                profileAdActionSecondary,
                "min-h-12 justify-between px-3 py-3 text-sm font-medium",
              )}
            >
              <RefreshCw className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.25} />
              <span>{t("profile.actions.bump")}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!actionAd) return;
                setAdToDelete(actionAd.id);
                setActionAd(null);
              }}
              className={cn(
                profileAdActionDelete,
                "min-h-12 justify-between px-3 py-3 text-sm font-medium",
              )}
            >
              <Trash2 className="h-4 w-4 shrink-0" strokeWidth={2.25} />
              <span>{t("profile.actions.delete")}</span>
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

/** شارة حالة المراجعة لإعلانات المستخدم — لا تظهر للـ approved في السوق العام */
function ProfileAdStatusRibbon({ status }: { status?: string }) {
  if (status === "pending") {
    return (
      <span className="pointer-events-none absolute right-2 top-2 z-[5] inline-flex max-w-[calc(100%-1rem)] rounded-full border border-amber-500/45 bg-amber-950/92 px-2 py-0.5 text-[10px] font-semibold leading-tight text-amber-100 shadow-[0_0_14px_-4px_rgba(245,158,11,0.45)] ring-1 ring-amber-500/25">
        قيد المراجعة
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="pointer-events-none absolute right-2 top-2 z-[5] inline-flex max-w-[calc(100%-1rem)] rounded-full border border-red-500/40 bg-red-950/90 px-2 py-0.5 text-[10px] font-semibold leading-tight text-red-100 shadow-[0_0_14px_-4px_rgba(239,68,68,0.35)] ring-1 ring-red-500/22">
        مرفوض
      </span>
    );
  }
  return null;
}

function ProfileDesktopAdCard({
  ad,
  onOpen,
  showActions,
  onEdit,
  onDelete,
  onPromote,
}: {
  ad: Ad;
  onOpen: () => void;
  showActions?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onPromote?: () => void;
}) {
  const priceTypeLabel =
    ad.priceType === "negotiable"
      ? t("ad-card.negotiable")
      : ad.priceType === "fixed"
        ? t("ad-card.fixed_price")
        : ad.priceType === "swap"
          ? t("ad-card.swap")
          : null;
  const formattedAmount =
    ad.price == null
      ? t("ad-card.unknown_price")
      : new Intl.NumberFormat("ar-DE", {
          style: "currency",
          currency: "EUR",
          maximumFractionDigits: 0,
        }).format(ad.price);
  const priceText =
    ad.priceType === "free"
      ? t("ad-card.free")
      : ad.priceType === "swap"
        ? t("ad-card.swap")
        : formattedAmount;

  return (
    <article
      className={cn(
        PROFILE_MY_ADS_CARD_SHELL,
        "transition-colors hover:border-primary/45",
      )}
      dir="rtl"
    >
      <button type="button" onClick={onOpen} className="w-full text-right">
        <div className="relative w-full aspect-[16/10] overflow-hidden rounded-xl border border-primary/25 bg-[#0A0A0A]">
          <ProfileAdStatusRibbon status={ad.status} />
          {ad.images?.[0] ? (
            <img
              src={ad.images[0]}
              alt={ad.title}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <AdCardNoImagePlaceholder plainBackdrop className="rounded-xl" />
          )}
        </div>

        <h3 className="mt-2 min-h-[2.25rem] text-sm font-semibold leading-5 text-foreground line-clamp-2 lg:text-[15px]">
          {ad.title}
        </h3>

        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-sm font-bold leading-none text-primary lg:text-base">{priceText}</p>
          {priceTypeLabel && (
            <span className="rounded-full border border-primary/35 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
              {priceTypeLabel}
            </span>
          )}
        </div>

        <p className="mt-1 truncate text-xs text-muted-foreground">
          {(ad.city || t("ad-card.unknown_city"))} · {formatRelativeTime(ad.createdAt)}
        </p>

        <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-primary/80" />
            {(ad.views ?? 0).toLocaleString("ar")}
          </span>
          <span className="inline-flex items-center gap-1">
            <Heart className="w-3.5 h-3.5 text-primary/80" />
            {(ad.favoriteCount ?? 0).toLocaleString("ar")}
          </span>
          <span className="inline-flex items-center gap-1">
            <ThumbsUp className="w-3.5 h-3.5 text-primary/80" />
            {(ad.likeCount ?? 0).toLocaleString("ar")}
          </span>
          <span className="ms-auto inline-flex items-center gap-1 truncate">
            <MapPin className="w-3.5 h-3.5 text-primary/80" />
            <span className="truncate">{ad.city || t("ad-card.unknown_city")}</span>
          </span>
        </div>
      </button>

      {showActions && (
        <div
          className={cn(
            "mt-2.5 grid gap-2",
            onPromote ? "grid-cols-3" : "grid-cols-2",
          )}
        >
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit?.();
            }}
            className={profileAdActionSecondary}
          >
            {t("profile.card.edit")}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete?.();
            }}
            className={profileAdActionDelete}
          >
            {t("profile.card.delete")}
          </button>
          {onPromote ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPromote();
              }}
              className={profileAdActionPromote}
            >
              <ArrowUp className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
              <span>{t("profile.card.promote")}</span>
            </button>
          ) : null}
        </div>
      )}
    </article>
  );
}

function ProfileMobileAdCard({
  ad,
  onOpen,
  onOpenActions,
  onEdit,
  onDelete,
  onPromote,
}: {
  ad: Ad;
  onOpen: () => void;
  onOpenActions: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPromote: () => void;
}) {
  const direction =
    typeof document === "undefined"
      ? "rtl"
      : document.documentElement.dir === "ltr"
        ? "ltr"
        : "rtl";
  const isRtl = direction === "rtl";
  const imageSrc = ad.images?.[0];
  const formattedAmount =
    ad.price == null
      ? t("ad-card.unknown_price")
      : new Intl.NumberFormat("ar-DE", {
          style: "currency",
          currency: "EUR",
          maximumFractionDigits: 0,
        }).format(ad.price);
  const priceText =
    ad.priceType === "free"
      ? t("ad-card.free")
      : ad.priceType === "swap"
        ? t("ad-card.swap")
        : formattedAmount;
  const priceTypeLabel = ad.priceType === "negotiable" ? t("ad-card.negotiable") : null;

  return (
    <article
      className={cn(
        PROFILE_MY_ADS_CARD_SHELL,
        "relative w-full transition-colors hover:border-primary/45",
      )}
      onClick={onOpen}
      dir={direction}
    >
      <button
        type="button"
        aria-label={t("profile.actions.open")}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpenActions();
        }}
        className="pointer-events-auto absolute left-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-lg border border-primary/32 bg-[#0A0A0A]/90 text-primary shadow-[0_0_12px_-12px_hsl(var(--primary)/0.16)] ring-1 ring-primary/12 transition-colors hover:border-primary/45 hover:bg-black/95 active:scale-[0.98]"
      >
        <MoreVertical className="h-3.5 w-3.5" strokeWidth={2.25} />
      </button>

      <div className="flex w-full items-start gap-2.5">
        <div
          className={cn(
            "relative h-[100px] w-[100px] shrink-0 self-start overflow-hidden rounded-xl border border-primary/25 bg-[#0A0A0A]",
            isRtl ? "order-1" : "order-2",
          )}
        >
          <ProfileAdStatusRibbon status={ad.status} />
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={ad.title}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <AdCardNoImagePlaceholder plainBackdrop compact className="rounded-xl" />
          )}
        </div>

        <div className={cn("min-w-0 flex-1", isRtl ? "order-2 text-right pl-1" : "order-1 text-left pr-1")} dir={direction}>
          <h3 className="line-clamp-2 text-[16px] font-bold leading-5 text-foreground">{ad.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <p className="text-[18px] font-bold leading-none text-primary">{priceText}</p>
            {priceTypeLabel && (
              <span className="inline-flex rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                {priceTypeLabel}
              </span>
            )}
          </div>

          <p className="mt-1 truncate text-[11px] text-muted-foreground">
            {(ad.city || t("ad-card.unknown_city"))} · {formatRelativeTime(ad.createdAt)}
          </p>

          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-primary/80" />
              {(ad.views ?? 0).toLocaleString("ar")}
            </span>
            <span className="inline-flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 text-primary/80" />
              {(ad.favoriteCount ?? 0).toLocaleString("ar")}
            </span>
            <span className="inline-flex items-center gap-1">
              <ThumbsUp className="w-3.5 h-3.5 text-primary/80" />
              {(ad.likeCount ?? 0).toLocaleString("ar")}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-2" dir={direction}>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit();
          }}
          className={profileAdActionSecondary}
        >
          {t("profile.card.edit")}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
          className={profileAdActionDelete}
        >
          {t("profile.card.delete")}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onPromote();
          }}
          className={profileAdActionPromote}
        >
          <ArrowUp className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
          <span>{t("profile.card.promote")}</span>
        </button>
      </div>
    </article>
  );
}

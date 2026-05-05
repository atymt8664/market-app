import { Link, Redirect, useLocation } from "wouter";
import {
  UserPlus,
  Trash2,
  Pencil,
  Plus,
  Settings,
  Share2,
  Eye,
  MapPin,
  UserCheck,
  Heart,
  Camera,
  Loader2,
  Clock,
  User as UserIcon,
  MoreVertical,
  RefreshCw,
  ThumbsUp,
  ArrowUp,
  Megaphone,
  Users,
} from "lucide-react";
import { useState, useRef } from "react";
import {
  useListMyAds,
  useDeleteAd,
  getListMyAdsQueryKey,
  useAuthUpdateProfile,
  getAuthMeQueryKey,
  useListFavoriteAds,
  getListFavoriteAdsQueryKey,
  type Ad,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUpload } from "@workspace/object-storage-web";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { AdCard, AdCardSkeleton } from "@/components/ad-card";
import { AvatarCircle } from "@/components/avatar-circle";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/hooks/use-locale";
import { t } from "@/i18n";
import {
  PROFILE_STATS_GRID,
  ProfileStatTile,
} from "@/components/profile-stat-tiles";
import {
  SETTINGS_DIALOG_CONTENT,
  SETTINGS_OUTLINE_BUTTON,
} from "@/components/settings-shell";
import { ProfileStatsDetailSheet } from "@/components/profile-stats-detail-sheet";
import { formatRelativeTime } from "@/lib/format";
import { getPublicAdUrl, getPublicUserProfileUrl } from "@/lib/public-url";
import { buildAdShareText, buildProfileShareText } from "@/lib/share-text";
import { shareOrCopyLink, tryAdImageAsShareFile } from "@/lib/native-share";
import { cn } from "@/lib/utils";
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
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

/** أزرار الرأس — ظل ثابت خفيف، بدون transform (يقلّل flicker أثناء التمرير) */
const profileHeaderIconBtn =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/55 bg-card/90 text-primary shadow-[0_0_10px_-4px_hsl(var(--primary)/0.18)] transition-colors hover:border-primary/75 hover:bg-card/95 active:opacity-90 disabled:pointer-events-none disabled:opacity-55 dark:bg-black/55";

/** نفس تعريفات كروت صفحة «نشر إعلان» (`create-ad.tsx` — adCardShell / adCardShellCompact) */
const AD_CARD_SHELL =
  "rounded-2xl border border-primary/40 bg-zinc-950/75 shadow-[0_0_22px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10";

/** أزرار إجراءات كرت الإعلان — mini-card موحّد مع هوية الكروت / الشريط السفلي */
const PROFILE_AD_ACTION_SHELL =
  "inline-flex min-h-10 w-full items-center justify-center rounded-xl border px-2 text-xs font-semibold shadow-[0_0_18px_-14px_hsl(var(--primary)/0.14)] ring-1 transition hover:shadow-[0_0_22px_-12px_hsl(var(--primary)/0.22)] active:scale-[0.98] md:min-h-[2.5rem]";

const profileAdActionSecondary = cn(
  PROFILE_AD_ACTION_SHELL,
  "border-primary/32 bg-zinc-950/82 text-primary ring-primary/12 hover:border-primary/45 hover:bg-zinc-900/92",
);

const profileAdActionPromote = cn(
  PROFILE_AD_ACTION_SHELL,
  "gap-1 border-primary/48 bg-zinc-950/90 font-bold text-primary shadow-[0_0_26px_-12px_hsl(var(--primary)/0.34)] ring-primary/22 hover:border-primary/58 hover:bg-zinc-900/95 hover:shadow-[0_0_30px_-10px_hsl(var(--primary)/0.4)]",
);

const profileAdActionDelete = cn(
  PROFILE_AD_ACTION_SHELL,
  "border-red-500/38 bg-red-950/[0.22] text-red-300 shadow-[0_0_18px_-14px_rgba(239,68,68,0.18)] ring-red-500/18 hover:border-red-500/48 hover:bg-red-950/35",
);

const PROFILE_TAB_LIST =
  "h-auto w-full grid grid-cols-3 gap-1.5 rounded-xl border border-primary/32 bg-zinc-950/78 p-1.5 shadow-[0_0_24px_-14px_hsl(var(--primary)/0.16)] ring-1 ring-primary/12";

const PROFILE_TAB_TRIGGER =
  "rounded-lg border border-transparent bg-transparent px-2 py-2.5 text-xs font-semibold text-primary/55 transition-all md:text-sm data-[state=active]:border-primary/52 data-[state=active]:bg-zinc-900/95 data-[state=active]:text-primary data-[state=active]:shadow-[0_0_24px_-12px_hsl(var(--primary)/0.32)] data-[state=active]:ring-1 data-[state=active]:ring-primary/28 hover:border-primary/22 hover:bg-zinc-950/85 hover:text-primary/85";

export default function Profile() {
  const { locale } = useLocale();
  const numberLocale = locale === "en" ? "en-US" : locale === "de" ? "de-DE" : "ar";
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteAdMutation = useDeleteAd();
  const updateProfile = useAuthUpdateProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [adToDelete, setAdToDelete] = useState<number | null>(null);
  const [actionAd, setActionAd] = useState<Ad | null>(null);

  const { data: myAds, isLoading: adsLoading } = useListMyAds({
    query: {
      queryKey: getListMyAdsQueryKey(),
      enabled: !!user,
      retry: false,
    },
  });
  const [activeTab, setActiveTab] = useState("my-ads");
  const [statsSheet, setStatsSheet] = useState<
    null | "followers" | "following" | "views"
  >(null);
  const { data: favoriteAdsData, isLoading: favoritesLoading } = useListFavoriteAds({
    query: {
      queryKey: getListFavoriteAdsQueryKey(),
      enabled: !!user,
      retry: false,
    },
  });
  const favoriteAds = Array.isArray(favoriteAdsData) ? favoriteAdsData : [];

  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response) => {
      const url = response.publicUrl;
      updateProfile.mutate(
        { data: { avatarUrl: url } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: getAuthMeQueryKey(),
            });
            toast({ title: t("profile.image_updated") });
          },
          onError: () => {
            toast({
              title: t("profile.image_update_failed"),
              variant: "destructive",
            });
          },
        },
      );
    },
    onError: () => {
      toast({ title: t("profile.image_upload_failed"), variant: "destructive" });
    },
  });

  if (authLoading) {
    return (
      <div className="flex min-h-[100svh] w-full flex-col items-center justify-center bg-background">
        <div className="w-12 h-12 rounded-full border-4 border-muted border-t-primary animate-spin" />
      </div>
    );
  }

  if (!authLoading && !user) return <Redirect to="/guest-welcome?redirect=/profile" />;

  const handleShare = async () => {
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
          toast({ title: t("profile.ad_deleted") });
          setAdToDelete(null);
        },
        onError: () => {
          toast({ title: t("profile.ad_delete_failed"), variant: "destructive" });
          setAdToDelete(null);
        },
      },
    );
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

  const adCount = user?.adCount ?? myAds?.length ?? 0;
  const followerCount = user?.followerCount ?? 0;
  const followingCount = user?.followingCount ?? 0;
  const profileViews = user?.profileViews ?? 0;
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("ar", {
        year: "numeric",
        month: "long",
      })
    : null;
  const avatarBusy = isUploading || updateProfile.isPending;

  return (
    <div className="flex min-h-[100svh] w-full flex-col bg-[#0A0A0A]">
      <div className="mx-auto w-full max-w-screen-sm md:max-w-[760px] lg:max-w-[860px] px-3 md:px-6 py-3 md:py-5">
        <header className="pt-2 md:pt-5" dir="rtl">
          <div className="flex w-full items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col items-start gap-2.5 text-right">
              <span className="inline-flex rounded-full border-2 border-primary/60 bg-black/40 px-4 py-1.5 text-sm font-semibold text-primary shadow-[0_0_12px_-6px_hsl(var(--primary)/0.22)]">
                {t("profile.title")}
              </span>
              <div className="relative shrink-0">
                <div
                  className="rounded-full p-[3px] shadow-[0_0_16px_-4px_rgba(182,227,86,0.28)]"
                  style={{
                    background:
                      "linear-gradient(145deg, rgba(182,227,86,0.5), rgba(182,227,86,0.08))",
                  }}
                >
                  <div className="rounded-full bg-black p-[2px]">
                    <AvatarCircle name={user.name} src={user.avatarUrl} size={80} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAvatarPick}
                  disabled={avatarBusy}
                  aria-label={t("profile.change_avatar")}
                  className="absolute -bottom-0.5 -left-0.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-black bg-[#b6e356] text-black shadow-[0_0_8px_-1px_rgba(182,227,86,0.4)] disabled:opacity-60"
                >
                  {avatarBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
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

            <div className="flex shrink-0 items-center gap-2 self-start" dir="ltr">
              <button
                type="button"
                onClick={handleShare}
                aria-label={t("profile.share")}
                className={profileHeaderIconBtn}
              >
                <Share2 className="h-5 w-5" strokeWidth={2.25} />
              </button>
              <Link href="/settings">
                <button
                  type="button"
                  aria-label={t("profile.settings")}
                  className={profileHeaderIconBtn}
                >
                  <Settings className="h-5 w-5" strokeWidth={2.25} />
                </button>
              </Link>
            </div>
          </div>
        </header>

        <section className="mt-5 md:mt-6 px-0 md:px-1" dir="rtl">
          <div className={PROFILE_STATS_GRID} dir="rtl">
            <ProfileStatTile
              icon={<Megaphone strokeWidth={2.25} />}
              value={adCount}
              label={t("profile.stats.ads")}
              numberLocale={numberLocale}
            />
            <ProfileStatTile
              icon={<UserPlus strokeWidth={2.25} />}
              value={followerCount}
              label={t("profile.stats.followers")}
              numberLocale={numberLocale}
              onClick={() => setStatsSheet("followers")}
            />
            <ProfileStatTile
              icon={<Users strokeWidth={2.25} />}
              value={followingCount}
              label={t("profile.stats.following")}
              numberLocale={numberLocale}
              onClick={() => setStatsSheet("following")}
            />
            <ProfileStatTile
              icon={<Eye strokeWidth={2.25} />}
              value={profileViews}
              label={t("profile.stats.views")}
              numberLocale={numberLocale}
              onClick={() => setStatsSheet("views")}
            />
          </div>
        </section>

        <section
          className={cn(
            AD_CARD_SHELL,
            "mt-5 md:mt-6 p-2.5 md:p-4",
          )}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl" className="w-full">
            <TabsList className={PROFILE_TAB_LIST}>
              <TabsTrigger value="my-ads" className={PROFILE_TAB_TRIGGER}>
                {t("profile.tabs.my_ads")}
              </TabsTrigger>
              <TabsTrigger value="favorites" className={PROFILE_TAB_TRIGGER}>
                {t("profile.tabs.favorites")}
              </TabsTrigger>
              <TabsTrigger value="public" className={PROFILE_TAB_TRIGGER}>
                {t("profile.tabs.public")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="my-ads" className="mt-3 md:mt-4">
              {!adsLoading && adCount === 0 ? (
                <div className="py-10 text-center">
                  <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                    <Plus className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-base mb-1">{t("profile.empty.first_ad_title")}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{t("profile.empty.first_ad_subtitle")}</p>
                  <Link href="/new">
                    <Button className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-primary/50 bg-zinc-950/92 px-5 py-2.5 text-sm font-semibold text-primary shadow-[0_0_18px_-10px_hsl(var(--primary)/0.32)] ring-1 ring-primary/18 transition-colors hover:border-primary/65 hover:bg-zinc-900/95 hover:shadow-[0_0_24px_-10px_hsl(var(--primary)/0.42)] active:scale-[0.98]">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
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
                            onPromote={() => navigate(`/stats?ad=${ad.id}`)}
                          />
                        </div>
                        <div className="hidden md:block">
                          <ProfileDesktopAdCard
                            ad={ad}
                            onOpen={() => navigate(`/ad/${ad.id}`)}
                            showActions
                            onEdit={() => navigate(`/edit/${ad.id}`)}
                            onDelete={() => setAdToDelete(ad.id)}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="favorites" className="mt-3 md:mt-4">
              {favoritesLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <AdCardSkeleton key={i} favoritesList />
                  ))}
                </div>
              ) : favoriteAds.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">{t("profile.favorites.empty")}</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {favoriteAds.map((ad) => (
                    <div key={ad.id}>
                      <div className="md:hidden">
                        <AdCard ad={ad} favoritesList />
                      </div>
                      <div className="hidden md:block">
                        <ProfileDesktopAdCard ad={ad} onOpen={() => navigate(`/ad/${ad.id}`)} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="public" className="mt-3 md:mt-4">
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
                    "mt-5 flex w-full min-w-0 max-w-full items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-zinc-950/90 px-1 py-3.5 text-sm font-semibold text-foreground shadow-[0_0_10px_-6px_hsl(var(--primary)/0.15)] transition-colors hover:border-primary/55 hover:bg-zinc-900/95",
                  )}
                >
                  <UserCheck className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.25} />
                  فتح الملف العام
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
        <div className="rounded-2xl border border-primary/30 bg-zinc-950/85 p-4 shadow-[0_0_16px_-10px_hsl(var(--primary)/0.18)] ring-1 ring-primary/12">
          <p className="text-sm leading-relaxed text-zinc-200">
            {statsSheet === "followers"
              ? t("profile.stats.sheet.followers_unavailable")
              : statsSheet === "following"
                ? t("profile.stats.sheet.following_unavailable")
                : t("profile.stats.sheet.views_unavailable")}
          </p>
        </div>
      </ProfileStatsDetailSheet>

      <Drawer open={!!actionAd} onOpenChange={(open) => !open && setActionAd(null)}>
        <DrawerContent className="rounded-t-2xl border-border bg-card/95">
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
                toast({ title: t("profile.actions.bumped") });
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
}: {
  ad: Ad;
  onOpen: () => void;
  showActions?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
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
        AD_CARD_SHELL,
        "p-3 transition-colors hover:border-primary/45 lg:p-3.5",
      )}
      dir="rtl"
    >
      <button type="button" onClick={onOpen} className="w-full text-right">
        <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden bg-muted">
          <ProfileAdStatusRibbon status={ad.status} />
          {ad.images?.[0] ? (
            <img src={ad.images[0]} alt={ad.title} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
              {t("ad-card.no_image")}
            </div>
          )}
        </div>

        <h3 className="mt-2.5 text-sm lg:text-[15px] font-semibold leading-5 line-clamp-2 text-foreground min-h-[2.4rem]">
          {ad.title}
        </h3>

        <div className="mt-1.5 flex items-center justify-between gap-2">
          <p className="text-sm lg:text-base font-bold text-primary leading-none">{priceText}</p>
          {priceTypeLabel && (
            <span className="rounded-full border border-primary/35 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
              {priceTypeLabel}
            </span>
          )}
        </div>

        <p className="mt-1.5 text-xs text-muted-foreground truncate">
          {(ad.city || t("ad-card.unknown_city"))} · {formatRelativeTime(ad.createdAt)}
        </p>

        <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
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
        <div className="mt-3 grid grid-cols-2 gap-2">
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
        AD_CARD_SHELL,
        "relative w-full p-3 transition-colors hover:border-primary/45",
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
        className="absolute left-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/35 bg-zinc-950/85 text-primary shadow-[0_0_18px_-14px_hsl(var(--primary)/0.18)] ring-1 ring-primary/14 transition-colors hover:border-primary/48 hover:bg-zinc-900/95 hover:shadow-[0_0_22px_-12px_hsl(var(--primary)/0.26)]"
      >
        <MoreVertical className="h-5 w-5" strokeWidth={2.25} />
      </button>

      <div className="flex items-start gap-3 w-full">
        <div
          className={cn(
            "relative h-[112px] w-[112px] shrink-0 overflow-hidden rounded-xl bg-muted self-start",
            isRtl ? "order-1" : "order-2",
          )}
        >
          <ProfileAdStatusRibbon status={ad.status} />
          {imageSrc ? (
            <img src={imageSrc} alt={ad.title} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-[11px] text-muted-foreground"
              dir={direction}
            >
              {t("ad-card.no_image")}
            </div>
          )}
        </div>

        <div className={cn("min-w-0 flex-1", isRtl ? "order-2 text-right pl-1" : "order-1 text-left pr-1")} dir={direction}>
          <h3 className="text-[16px] font-bold leading-5 line-clamp-2 text-foreground">{ad.title}</h3>
          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            <p className="text-[18px] font-bold text-primary leading-none">{priceText}</p>
            {priceTypeLabel && (
              <span className="inline-flex rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                {priceTypeLabel}
              </span>
            )}
          </div>

          <p className="mt-1.5 text-[11px] text-muted-foreground truncate">
            {(ad.city || t("ad-card.unknown_city"))} · {formatRelativeTime(ad.createdAt)}
          </p>

          <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
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

      <div className="mt-3 grid grid-cols-3 gap-2" dir={direction}>
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

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
  type Ad,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUpload } from "@workspace/object-storage-web";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { AdCard, AdCardSkeleton } from "@/components/ad-card";
import { AvatarCircle } from "@/components/avatar-circle";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/i18n";
import { formatRelativeTime } from "@/lib/format";
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

export default function Profile() {
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
      <div className="flex flex-col w-full min-h-[100dvh] bg-background items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-muted border-t-primary animate-spin" />
      </div>
    );
  }

  if (!user) return <Redirect to="/guest-welcome?redirect=/profile" />;

  const handleShare = async () => {
    const url = window.location.origin;
    if (navigator.share) {
      try {
        await navigator.share({ title: t("profile.share_title"), url });
      } catch {
        /* cancelled */
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: t("profile.link_copied") });
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
    const url = `${window.location.origin}/ad/${ad.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: ad.title, url });
      } catch {
        /* cancelled */
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: t("profile.link_copied") });
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
      <div className="mx-auto w-full max-w-screen-sm md:max-w-[760px] lg:max-w-[860px] px-3 md:px-6 py-3 md:py-5">
        <header className="pt-2 md:pt-5" dir="rtl">
          <div className="flex items-start justify-between gap-2" dir="ltr">
            <div className="flex items-center gap-1.5 shrink-0" dir="ltr">
              <button
                onClick={handleShare}
                aria-label={t("profile.share")}
                className="h-9 w-9 md:h-10 md:w-10 flex items-center justify-center text-primary hover:bg-muted/50 rounded-full transition-colors"
              >
                <Share2 className="h-5 w-5" />
              </button>
              <Link href="/settings">
                <button
                  aria-label={t("profile.settings")}
                  className="h-9 w-9 md:h-10 md:w-10 flex items-center justify-center text-primary hover:bg-muted/50 rounded-full transition-colors"
                >
                  <Settings className="h-5 w-5" />
                </button>
              </Link>
            </div>
            <div className="flex flex-col items-end text-right min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-foreground">{t("profile.title")}</h1>
              <div className="mt-6 flex flex-col items-end text-right gap-2.5">
                <div className="relative shrink-0">
                  <AvatarCircle name={user.name} src={user.avatarUrl} size={74} />
                  <button
                    type="button"
                    onClick={handleAvatarPick}
                    disabled={avatarBusy}
                    aria-label={t("profile.change_avatar")}
                    className="absolute -bottom-1 -left-1 h-7 w-7 rounded-full border border-border bg-muted text-foreground flex items-center justify-center disabled:opacity-60"
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

                <div className="min-w-0 flex flex-col items-end text-right gap-1.5">
                  <h2 className="text-lg md:text-xl font-bold leading-tight text-foreground truncate max-w-full">
                    {user.name}
                  </h2>
                  <p className="inline-flex items-center justify-end gap-1.5 text-[0.82rem] md:text-sm leading-tight text-muted-foreground">
                    <UserIcon className="h-3.5 w-3.5 shrink-0" />
                    {t("profile.seller_type")}
                  </p>
                  {memberSince && (
                    <p className="inline-flex items-center justify-end gap-1.5 text-[0.8rem] md:text-sm leading-tight text-muted-foreground/85">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      {t("profile.member_since", { date: memberSince })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="mt-3 md:mt-3 px-1 md:px-2" dir="rtl">
          <div className="mt-4 grid grid-cols-3 gap-3 text-center" dir="rtl">
            <div className="min-w-0">
              <p className="text-base md:text-lg font-bold tabular-nums">{adCount.toLocaleString("ar")}</p>
              <p className="mt-0.5 text-[11px] md:text-xs text-muted-foreground">{t("profile.stats.ads")}</p>
            </div>
            <div className="min-w-0">
              <p className="text-base md:text-lg font-bold tabular-nums">{profileViews.toLocaleString("ar")}</p>
              <p className="mt-0.5 text-[11px] md:text-xs text-muted-foreground">{t("profile.stats.views")}</p>
            </div>
            <div className="min-w-0">
              <p className="text-base md:text-lg font-bold tabular-nums">{followerCount.toLocaleString("ar")}</p>
              <p className="mt-0.5 text-[11px] md:text-xs text-muted-foreground">{t("profile.stats.followers")}</p>
            </div>
          </div>
        </section>

        <section className="mt-3 md:mt-4 rounded-2xl border border-border bg-card/50 p-2.5 md:p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl" className="w-full">
            <TabsList className="h-auto w-full grid grid-cols-3 rounded-xl bg-muted/50 p-1">
              <TabsTrigger value="my-ads" className="text-xs md:text-sm">{t("profile.tabs.my_ads")}</TabsTrigger>
              <TabsTrigger value="favorites" className="text-xs md:text-sm">{t("profile.tabs.favorites")}</TabsTrigger>
              <TabsTrigger value="public" className="text-xs md:text-sm">{t("profile.tabs.public")}</TabsTrigger>
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
                    <Button className="px-4 py-2 text-sm font-medium rounded-full bg-[#b6e356] text-black inline-flex items-center gap-2">
                      <Plus className="w-4 h-4" />
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
              {favoriteAds.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">{t("profile.favorites.empty")}</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {favoriteAds.map((ad) => (
                    <div key={ad.id}>
                      <div className="md:hidden">
                        <AdCard ad={ad} />
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
              <div className="rounded-xl border border-border bg-background/60 p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{t("profile.public.title")}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t("profile.public.subtitle")}</p>
                </div>
                <Link href={`/users/${user.id}`}>
                  <Button variant="outline" className="gap-2 shrink-0">
                    <UserCheck className="w-4 h-4" />
                    {t("profile.public.open")}
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
            <AlertDialogTitle>{t("profile.delete_dialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("profile.delete_dialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse">
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("profile.delete")}
            </AlertDialogAction>
            <AlertDialogCancel>{t("profile.cancel")}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Drawer open={!!actionAd} onOpenChange={(open) => !open && setActionAd(null)}>
        <DrawerContent className="rounded-t-2xl border-border bg-card/95">
          <DrawerHeader className="text-right">
            <DrawerTitle>{t("profile.actions.title")}</DrawerTitle>
            <DrawerDescription className="text-xs">{actionAd?.title}</DrawerDescription>
          </DrawerHeader>
          <div className="px-3 pb-4 space-y-1.5" dir="rtl">
            <button
              type="button"
              onClick={() => {
                if (!actionAd) return;
                navigate(`/edit/${actionAd.id}`);
                setActionAd(null);
              }}
              className="w-full min-h-12 rounded-xl border border-border bg-background/60 px-3 py-3 flex items-center justify-between text-sm font-medium"
            >
              <Pencil className="w-4 h-4 text-primary" />
              <span>{t("profile.actions.edit")}</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!actionAd) return;
                await handleShareAd(actionAd);
                setActionAd(null);
              }}
              className="w-full min-h-12 rounded-xl border border-border bg-background/60 px-3 py-3 flex items-center justify-between text-sm font-medium"
            >
              <Share2 className="w-4 h-4 text-primary" />
              <span>{t("profile.actions.share")}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                toast({ title: t("profile.actions.bumped") });
                setActionAd(null);
              }}
              className="w-full min-h-12 rounded-xl border border-border bg-background/60 px-3 py-3 flex items-center justify-between text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4 text-primary" />
              <span>{t("profile.actions.bump")}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!actionAd) return;
                setAdToDelete(actionAd.id);
                setActionAd(null);
              }}
              className="w-full min-h-12 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-3 flex items-center justify-between text-sm font-medium text-destructive"
            >
              <Trash2 className="w-4 h-4" />
              <span>{t("profile.actions.delete")}</span>
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      <div className="h-16" />
    </motion.div>
  );
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
      className="rounded-2xl border border-border/70 bg-card/60 p-3 lg:p-3.5 shadow-sm hover:border-primary/25 transition-colors"
      dir="rtl"
    >
      <button type="button" onClick={onOpen} className="w-full text-right">
        <div className="w-full aspect-[16/10] rounded-xl overflow-hidden bg-muted">
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
            className="h-9 rounded-full border border-border bg-transparent text-xs font-medium text-foreground hover:bg-muted/40"
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
            className="h-9 rounded-full border border-destructive/40 bg-destructive/10 text-xs font-medium text-destructive hover:bg-destructive/15"
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
      className="relative w-full rounded-2xl border border-border/70 bg-[#121212] p-3 shadow-[0_2px_8px_rgba(0,0,0,0.25)] active:scale-[0.995] transition-transform"
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
        className="absolute left-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-lg border border-border/70 bg-muted/55 text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors"
      >
        <MoreVertical className="h-5 w-5" />
      </button>

      <div className="flex items-start gap-3 w-full">
        <div
          className={cn(
            "relative h-[112px] w-[112px] shrink-0 overflow-hidden rounded-xl bg-muted self-start",
            isRtl ? "order-1" : "order-2",
          )}
        >
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
          className="h-10 rounded-full border border-border bg-transparent text-foreground text-xs font-medium"
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
          className="h-10 rounded-full border border-border bg-transparent text-foreground text-xs font-medium"
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
          className="h-10 rounded-full bg-primary text-black text-xs font-semibold inline-flex items-center justify-center gap-1.5"
        >
          <ArrowUp className="w-3.5 h-3.5" />
          <span>{t("profile.card.promote")}</span>
        </button>
      </div>
    </article>
  );
}

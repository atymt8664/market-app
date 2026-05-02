import {
  useGetAd,
  getGetAdQueryKey,
  useRecordAdView,
  useStartConversation,
  useLikeAd,
  useUnlikeAd,
  useFavoriteAd,
  useUnfavoriteAd,
} from "@workspace/api-client-react";
import { apiUrl } from "@/lib/api-url";
import { Link, useLocation, useParams } from "wouter";
import {
  ArrowRight,
  MapPin,
  Share2,
  Heart,
  Copy,
  CheckCircle2,
  MessageCircle,
  Phone,
  Eye,
  MessageSquare,
  ThumbsUp,
  Star,
  MoreVertical,
  Flag,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { formatRelativeTime, formatPrice } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateAdImageGallery } from "@/components/create-ad-image-gallery";
import { parseStoredAdDetails } from "@/lib/ad-stored-details";
import { labelForSpecKey } from "@/lib/ad-dynamic-field-labels";
import {
  AD_PROMOTION_LABELS,
  AD_SHIPPING_LABELS,
} from "@/lib/ad-meta-labels";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BuyerSafetyNote } from "@/components/buyer-safety-note";
import { t } from "@/i18n";

/** عرض العملة للواجهة العربية دون إظهار رموز خام مثل EUR فقط */
function currencyDisplayAr(code?: string | null): string | null {
  if (!code?.trim()) return null;
  const c = code.trim().toUpperCase();
  const map: Record<string, string> = {
    EUR: "يورو (€)",
    USD: "دولار أمريكي ($)",
    GBP: "جنيه إسترليني (£)",
    CHF: "فرنك سويسري",
    SEK: "كرونة سويدية",
    NOK: "كرونة نرويجية",
    DKK: "كرونة دنماركية",
    CAD: "دولار كندي (C$)",
  };
  return map[c] ?? `عملة ${c}`;
}

function buildAdPublicUrl(adId: number): string {
  const basePath = import.meta.env.BASE_URL || "/";
  const origin = window.location.origin;
  const base =
    basePath === "/"
      ? `${origin}/`
      : `${origin}${basePath.endsWith("/") ? basePath : `${basePath}/`}`;
  try {
    return new URL(`ad/${adId}`, base).href;
  } catch {
    return `${origin}/ad/${adId}`;
  }
}

export default function AdDetail() {
  const params = useParams();
  const id = Number(params.id);
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const queryClient = useQueryClient();
  const adKey = getGetAdQueryKey(id);
  const { data: ad, isLoading } = useGetAd(id, {
    query: { enabled: !!id, queryKey: adKey },
  });

  const [copied, setCopied] = useState(false);
  const [viewCount, setViewCount] = useState<number | null>(null);
  const [reporting, setReporting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reportExtra, setReportExtra] = useState("");

  const recordView = useRecordAdView();
  const viewedRef = useRef<number | null>(null);
  useEffect(() => {
    if (!id || viewedRef.current === id) return;
    viewedRef.current = id;
    recordView.mutate(
      { adId: id },
      {
        onSuccess: (data) => {
          setViewCount(data.views);
          queryClient.invalidateQueries({ queryKey: adKey });
        },
        onError: () => {
          /* ignore */
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const likeMut = useLikeAd();
  const unlikeMut = useUnlikeAd();
  const favMut = useFavoriteAd();
  const unfavMut = useUnfavoriteAd();

  const handleReport = async () => {
    if (!reason) {
      toast({
        title: t("ad_detail.error"),
        description: t("ad_detail.report.choose_reason"),
        variant: "destructive",
      });
      return;
    }

    if (!requireLogin()) return;

    const otherReason = t("ad_detail.report.opt_other");

    try {
      setReporting(true);

      const res = await fetch(apiUrl("/api/reports"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          targetAdId: id,
          reason,
          description:
            reason === otherReason ? reportExtra.trim() || undefined : undefined,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        toast({
          title: t("ad_detail.report.failed"),
          description: errText || `رمز ${res.status}`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t("ad_detail.done"),
        description: t("ad_detail.report.sent"),
      });
      setReason("");
      setReportExtra("");
      setReportOpen(false);
    } catch {
      toast({
        title: t("ad_detail.error"),
        description: t("ad_detail.report.failed"),
      });
    } finally {
      setReporting(false);
    }
  };

  type AdData = NonNullable<typeof ad>;

  const patchAd = (patch: Partial<AdData>) => {
    queryClient.setQueryData<AdData>(adKey, (old) =>
      old ? { ...old, ...patch } : old,
    );
  };

  const requireLogin = () => {
    if (!user) {
      navigate(`/login?redirect=/ad/${id}`);
      return false;
    }
    return true;
  };

  const handleToggleLike = () => {
    if (!ad || !requireLogin()) return;

    const prev = { isLiked: ad.isLiked, likeCount: ad.likeCount };
    const willLike = !ad.isLiked;

    patchAd({
      isLiked: willLike,
      likeCount: ad.likeCount + (willLike ? 1 : -1),
    });

    const onSuccess = (data: { count: number; active: boolean }) =>
      patchAd({ isLiked: data.active, likeCount: data.count });

    const onError = () => patchAd(prev);

    if (willLike) likeMut.mutate({ adId: ad.id }, { onSuccess, onError });
    else unlikeMut.mutate({ adId: ad.id }, { onSuccess, onError });
  };

  const handleToggleFavorite = () => {
    if (!ad || !requireLogin()) return;
    const prev = {
      isFavorited: ad.isFavorited,
      favoriteCount: ad.favoriteCount,
    };
    const willFav = !ad.isFavorited;
    patchAd({
      isFavorited: willFav,
      favoriteCount: ad.favoriteCount + (willFav ? 1 : -1),
    });
    const onSuccess = (data: { count: number; active: boolean }) =>
      patchAd({ isFavorited: data.active, favoriteCount: data.count });
    const onError = () => patchAd(prev);
    if (willFav) favMut.mutate({ adId: ad.id }, { onSuccess, onError });
    else unfavMut.mutate({ adId: ad.id }, { onSuccess, onError });
  };

  const startConversation = useStartConversation();
  const handleMessage = () => {
    if (!ad) return;
    if (!user) {
      navigate(`/login?redirect=/ad/${ad.id}`);
      return;
    }
    if (ad.userId && ad.userId === user.id) {
      toast({ title: "هذا إعلانك", description: "لا يمكنك مراسلة نفسك" });
      return;
    }
    startConversation.mutate(
      { data: { adId: ad.id } },
      {
        onSuccess: (data) => {
          const draft = t("ad_detail.message_draft", {
            title: ad.title,
            url: buildAdPublicUrl(ad.id),
          });
          navigate(
            `/messages/${data.id}?draft=${encodeURIComponent(draft)}`,
          );
        },
        onError: (err: unknown) => {
          const e = err as { data?: { error?: string } };
          toast({
            title: "تعذّر فتح المحادثة",
            description: e?.data?.error || "حاول مرة أخرى",
            variant: "destructive",
          });
        },
      },
    );
  };

  const handleCopyPhone = () => {
    if (!ad) return;
    if (!requireLogin()) return;
    navigator.clipboard.writeText(ad.sellerPhone);
    setCopied(true);
    toast({
      title: "تم النسخ",
      description: "تم نسخ رقم الهاتف بنجاح",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: ad?.title,
          url: window.location.href,
        })
        .catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "تم نسخ الرابط" });
    }
  };

  const handleWhatsappContact = () => {
    if (!ad) return;
    if (!requireLogin()) return;
    const text = encodeURIComponent(`مرحباً، أنا مهتم بإعلانك: ${ad.title}`);
    window.open(
      `https://wa.me/${ad.sellerPhone.replace(/[^0-9+]/g, "")}?text=${text}`,
      "_blank",
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col w-full min-h-[100dvh] bg-background">
        <Skeleton className="w-full aspect-square" />
        <div className="p-4 flex flex-col gap-4">
          <Skeleton className="w-2/3 h-8" />
          <Skeleton className="w-1/3 h-6" />
          <Skeleton className="w-full h-24 mt-4" />
        </div>
      </div>
    );
  }

  if (!ad) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-background p-4 text-center">
        <h2 className="text-2xl font-bold mb-2">الإعلان غير موجود</h2>
        <p className="text-muted-foreground mb-6">
          ربما تم حذف هذا الإعلان أو أن الرابط غير صحيح.
        </p>
        <Link href="/">
          <Button>العودة للصفحة الرئيسية</Button>
        </Link>
      </div>
    );
  }

  const isFree = ad.priceType === "free";
  const parsed = parseStoredAdDetails(ad.details);
  const specEntries = Object.entries(parsed.specs).filter(
    ([, v]) => typeof v === "string" && v.trim(),
  );
  const pathLabel = parsed.meta?.categoryPath
    ? [
        parsed.meta.categoryPath.main,
        parsed.meta.categoryPath.sub,
        parsed.meta.categoryPath.leaf,
      ]
        .filter(Boolean)
        .join(" ← ")
    : null;

  const currencyDisplay = currencyDisplayAr(parsed.meta?.currency);
  const shipMeta = parsed.meta?.shipping;
  const shippingPickupOnly = shipMeta?.pickupOnly === true;
  const shippingIdList = shipMeta?.ids ?? [];
  const shippingRows: string[] =
    shippingPickupOnly || shippingIdList.length === 0
      ? []
      : shippingIdList.map((sid) => AD_SHIPPING_LABELS[sid] ?? sid);

  const promotionRows =
    parsed.meta?.promotions?.filter(Boolean).map(
      (pid) => AD_PROMOTION_LABELS[pid] ?? pid,
    ) ?? [];

  const hasDeviceBlock =
    specEntries.length > 0 || parsed.meta?.directBuy != null;
  const hasPromotionBlock = promotionRows.length > 0;

  const pageMax =
    "mx-auto w-full max-w-[900px] md:max-w-[760px] lg:max-w-[860px] px-4 md:px-6";

  return (
    <motion.div
      dir="rtl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col w-full min-h-[100dvh] bg-background pb-28"
    >
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none bg-gradient-to-b from-background/80 to-transparent pb-2">
        <div className={`${pageMax} py-3 flex justify-between items-center pointer-events-auto`}>
          <Link href="/">
            <button
              type="button"
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-transform"
              aria-label="رجوع"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-transform"
              aria-label={t("ad_detail.copy_link")}
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleToggleFavorite}
              aria-label={t("ad_detail.favorite")}
              disabled={favMut.isPending || unfavMut.isPending}
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center active:scale-95 transition-transform disabled:opacity-60"
            >
              <Heart
                className={`w-5 h-5 ${ad?.isFavorited ? "fill-primary text-primary" : "text-white"}`}
              />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-transform"
                  aria-label="المزيد"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[11rem]" dir="rtl">
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onSelect={() => {
                    if (!user) {
                      navigate(`/login?redirect=/ad/${id}`);
                      return;
                    }
                    setReportOpen(true);
                  }}
                >
                  <Flag className="w-4 h-4" />
                  {t("ad_detail.report.submit")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* معرض الصور — مطابق لعرض الإنشاء المحلي */}
      <div className={`${pageMax} pt-16 md:pt-[4.5rem] pb-2 space-y-2`}>
        <CreateAdImageGallery
          readOnly
          uploadedImages={ad.images ?? []}
          maxImages={Math.max(ad.images?.length ?? 0, 1)}
          isSubmittingUploads={false}
        />
      </div>

      <div className={`${pageMax} py-2 md:py-4`}>
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_288px] gap-4 md:gap-5 lg:items-start">
          <div className="flex flex-col gap-4 min-w-0">
            {/* كرت العنوان والسعر والموقع */}
            <div
              className="rounded-2xl border border-border bg-card/70 p-4 md:p-5"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}
            >
              <h1 className="text-xl md:text-2xl font-bold leading-tight mb-2 text-foreground">
                {ad.title}
              </h1>
              {isFree ? (
                <div className="text-2xl font-bold text-primary">
                  {t("ad-card.free")}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 text-2xl font-bold text-primary">
                  {formatPrice(ad.price, ad.priceType)}
                  {ad.priceType === "negotiable" && (
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {t("ad-card.negotiable")}
                    </span>
                  )}
                </div>
              )}
              {currencyDisplay && (
                <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                  {t("create_ad.preview_dialog.display_currency", {
                    currency: currencyDisplay,
                  })}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{ad.city}</span>
                <span className="opacity-50">•</span>
                <span>{formatRelativeTime(ad.createdAt)}</span>
              </div>
            </div>

            {/* الإحصائيات: المشاهدات — الإعجابات — المفضلة */}
            <div className="flex items-stretch divide-x divide-border/60 rounded-2xl border border-border bg-card px-2 py-2.5 text-xs sm:text-sm text-muted-foreground [direction:rtl]">
              <div className="flex flex-1 flex-col items-center justify-center gap-0.5 sm:flex-row sm:gap-1">
                <Eye className="h-4 w-4 shrink-0" />
                <span className="font-semibold text-foreground tabular-nums">
                  {(viewCount ?? ad.views ?? 0).toLocaleString("ar")}
                </span>
                <span className="text-[11px]">{t("ad_detail.views")}</span>
              </div>
              <button
                type="button"
                onClick={handleToggleLike}
                aria-label={t("ad_detail.likes")}
                disabled={likeMut.isPending || unlikeMut.isPending}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 active:scale-[0.98] transition-all sm:flex-row sm:gap-1 ${ad.isLiked ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <ThumbsUp
                  className={`h-4 w-4 shrink-0 ${ad.isLiked ? "fill-primary" : ""}`}
                />
                <span className="font-semibold tabular-nums text-foreground">
                  {(ad.likeCount ?? 0).toLocaleString("ar")}
                </span>
                <span className="text-[11px]">{t("ad_detail.likes")}</span>
              </button>
              <button
                type="button"
                onClick={handleToggleFavorite}
                aria-label={t("ad_detail.favorites")}
                disabled={favMut.isPending || unfavMut.isPending}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 active:scale-[0.98] transition-all sm:flex-row sm:gap-1 ${ad.isFavorited ? "text-amber-500" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Star
                  className={`h-4 w-4 shrink-0 ${ad.isFavorited ? "fill-amber-500" : ""}`}
                />
                <span className="font-semibold tabular-nums text-foreground">
                  {(ad.favoriteCount ?? 0).toLocaleString("ar")}
                </span>
                <span className="text-[11px]">{t("ad_detail.favorites")}</span>
              </button>
            </div>

            {/* معلومات الجهاز / المواصفات */}
            {hasDeviceBlock && (
              <div className="rounded-2xl border border-border bg-card/70 p-4 text-sm">
                <h3 className="mb-3 font-semibold text-base">
                  {t("ad_detail.device_info")}
                </h3>
                <div className="flex flex-col gap-0">
                  {specEntries.map(([key, val], idx) => (
                    <div
                      key={key}
                      className={`flex justify-between gap-3 py-2.5 ${idx > 0 ? "border-t border-border/50" : ""}`}
                    >
                      <span className="text-muted-foreground shrink-0">
                        {labelForSpecKey(key)}
                      </span>
                      <span className="max-w-[58%] text-end font-medium leading-snug">
                        {val}
                      </span>
                    </div>
                  ))}
                  {parsed.meta?.directBuy && (
                    <div
                      className={`flex justify-between gap-3 py-2.5 ${specEntries.length > 0 ? "border-t border-border/50" : ""}`}
                    >
                      <span className="text-muted-foreground">شراء مباشر</span>
                      <span className="font-medium">
                        {parsed.meta.directBuy === "yes" ? "نعم" : "لا"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* الوصف */}
            <div className="rounded-2xl border border-border bg-card/70 p-4 md:p-5">
              <h3 className="mb-2 font-semibold text-base">
                {t("ad_detail.description")}
              </h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {ad.description?.trim()
                  ? ad.description
                  : t("ad_detail.no_description")}
              </p>
            </div>

            {/* الشحن والتسليم */}
            <div className="rounded-2xl border border-border bg-card/70 p-4 text-sm">
              <h3 className="mb-2 font-semibold text-base">
                {t("ad_detail.shipping_delivery")}
              </h3>
              {shippingPickupOnly ? (
                <p className="leading-relaxed text-foreground/90">
                  {t("ad_detail.pickup_only")}
                </p>
              ) : shippingRows.length > 0 ? (
                <ul className="list-disc list-inside space-y-1.5 text-foreground/90 [padding-inline-start:1rem]">
                  {shippingRows.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">
                  {t("ad_detail.no_shipping_options")}
                </p>
              )}
            </div>

            {/* معلومات التصنيف */}
            <div className="rounded-2xl border border-border bg-card/70 p-4 text-sm">
              <h3 className="mb-2 font-semibold text-base">
                {t("ad_detail.classification_info")}
              </h3>
              <div className="flex justify-between gap-2 border-b border-border/50 py-2.5 first:pt-0">
                <span className="text-muted-foreground shrink-0">
                  {t("create_ad.preview_dialog.category")}
                </span>
                <span className="max-w-[60%] text-end font-medium">
                  {ad.categoryName}
                </span>
              </div>
              {ad.subcategoryName && (
                <div className="flex justify-between gap-2 border-b border-border/50 py-2.5">
                  <span className="text-muted-foreground shrink-0">
                    {t("create_ad.preview_dialog.subcategory")}
                  </span>
                  <span className="max-w-[60%] text-end font-medium">
                    {ad.subcategoryName}
                  </span>
                </div>
              )}
              {pathLabel && (
                <div className="flex justify-between gap-2 border-b border-border/50 py-2.5">
                  <span className="text-muted-foreground shrink-0">
                    {t("create_ad.preview_dialog.path")}
                  </span>
                  <span className="max-w-[65%] text-end text-xs font-medium leading-snug">
                    {pathLabel}
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-2 py-2.5">
                <span className="text-muted-foreground shrink-0">
                  {t("create_ad.preview_dialog.ad_type")}
                </span>
                <span className="font-medium">
                  {ad.type === "offer"
                    ? t("create_ad.type.offer")
                    : t("create_ad.type.request")}
                </span>
              </div>
            </div>

            {/* العروض الترويجية */}
            {hasPromotionBlock && (
              <div className="rounded-2xl border border-border bg-card/70 p-4 text-sm">
                <h3 className="mb-2 font-semibold text-base">
                  {t("create_ad.preview_dialog.promotions_optional")}
                </h3>
                <ul className="list-disc list-inside space-y-1 text-foreground/90 [padding-inline-start:1rem]">
                  {promotionRows.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* عمود البائع — مطابق لنمط الكرت المحلي */}
          <aside className="h-fit rounded-2xl border border-border bg-card/70 p-3 md:p-4 space-y-3 lg:sticky lg:top-[4.75rem]">
            <h3 className="font-semibold text-base ps-0.5">
              {t("ad_detail.seller_info")}
            </h3>
            <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-muted/15 p-3">
              {ad.userId ? (
                <Link
                  href={`/users/${ad.userId}`}
                  className="flex items-center gap-3 rounded-lg hover:bg-muted/30 active:scale-[0.99] transition-all p-0.5 -m-0.5"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/20 text-lg font-bold text-primary">
                    {ad.sellerName.charAt(0)}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold">
                      {ad.sellerName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t("ad_detail.view_profile_and_ads")}
                    </span>
                  </div>
                </Link>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/20 text-lg font-bold text-primary">
                    {ad.sellerName ? ad.sellerName.charAt(0) : "؟"}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold">
                      {ad.sellerName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t("ad_detail.member")}
                    </span>
                  </div>
                </div>
              )}
              <Button
                type="button"
                onClick={handleMessage}
                disabled={startConversation?.isPending}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#b6e356] text-sm font-semibold text-black hover:bg-[#a8d94c]"
              >
                {t("ad_detail.message_seller")}
                <MessageSquare className="h-4 w-4 shrink-0" />
              </Button>
              <Button
                type="button"
                onClick={handleWhatsappContact}
                variant="outline"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border-green-500/60 text-sm font-medium text-green-500 hover:bg-green-500/10"
              >
                {t("ad_detail.contact_whatsapp")}
                <MessageCircle className="h-5 w-5 shrink-0" />
              </Button>
            </div>
            <button
              type="button"
              onClick={handleCopyPhone}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background py-3 text-sm font-medium transition-colors hover:bg-muted/50"
            >
              <Phone className="h-4 w-4 shrink-0" />
              <span dir="ltr" className="font-mono">
                {ad.sellerPhone}
              </span>
              {copied ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
              ) : (
                <Copy className="h-4 w-4 shrink-0 opacity-60" />
              )}
            </button>
            <BuyerSafetyNote />
          </aside>
        </div>
      </div>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent dir="rtl" className="text-right sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("ad_detail.report.submit")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border rounded-lg p-2.5 bg-background text-sm"
            >
              <option value="" disabled>
                {t("ad_detail.report.choose_reason")}
              </option>
              <option value={t("ad_detail.report.opt_fraud")}>
                {t("ad_detail.report.opt_fraud")}
              </option>
              <option value={t("ad_detail.report.opt_duplicate")}>
                {t("ad_detail.report.opt_duplicate")}
              </option>
              <option value={t("ad_detail.report.opt_wrong_info")}>
                {t("ad_detail.report.opt_wrong_info")}
              </option>
              <option value={t("ad_detail.report.opt_violation")}>
                {t("ad_detail.report.opt_violation")}
              </option>
              <option value={t("ad_detail.report.opt_inappropriate")}>
                {t("ad_detail.report.opt_inappropriate")}
              </option>
              <option value={t("ad_detail.report.opt_other")}>
                {t("ad_detail.report.opt_other")}
              </option>
            </select>
            {reason === t("ad_detail.report.opt_other") && (
              <textarea
                placeholder={t("ad_detail.report.details_placeholder")}
                className="w-full border rounded-lg p-2.5 bg-background text-sm min-h-[88px]"
                value={reportExtra}
                onChange={(e) => setReportExtra(e.target.value)}
              />
            )}
            <Button
              type="button"
              className="w-full"
              onClick={() => void handleReport()}
              disabled={
                reporting ||
                !reason ||
                (reason === t("ad_detail.report.opt_other") &&
                  !reportExtra.trim())
              }
            >
              {reporting
                ? t("ad_detail.sending")
                : t("ad_detail.report.submit")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

import {
  useGetAd,
  getGetAdQueryKey,
  useRecordAdView,
  useStartConversation,
  useLikeAd,
  useUnlikeAd,
  useFavoriteAd,
  useUnfavoriteAd,
  getAuthProfileCsrfTokenForRequest,
  useUserPresenceBatch,
  ApiError,
} from "@workspace/api-client-react";
import { apiUrl } from "@/lib/api-url";
import { Link, useLocation, useParams } from "wouter";
import {
  ArrowRight,
  Check,
  ChevronDown,
  MapPin,
  Share2,
  Heart,
  Copy,
  Phone,
  Eye,
  MessageSquare,
  ThumbsUp,
  Star,
  Flag,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useAuth } from "@/hooks/use-auth";
import { formatRelativeTime, formatPrice } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CreateAdImageGallery } from "@/components/create-ad-image-gallery";
import { getPublicAdUrl } from "@/lib/public-url";
import { buildAdShareText } from "@/lib/share-text";
import { shareOrCopyLink, tryAdImageAsShareFile } from "@/lib/native-share";
import { parseStoredAdDetails } from "@/lib/ad-stored-details";
import { AD_SHIPPING_LABELS } from "@/lib/ad-meta-labels";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/hooks/use-locale";
import { getCreateAdTaxonomyLabel } from "@/lib/create-ad-taxonomy-labels";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BuyerSafetyNote } from "@/components/buyer-safety-note";
import { UserPresenceBadge } from "@/components/user-presence-badge";
import { t, type Locale } from "@/i18n";
import { cn } from "@/lib/utils";
import { AUTH_ACCENT_OUTLINE_BTN } from "@/lib/auth-page-styles";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";

function normalizeAdDetailsRaw(raw: unknown): unknown {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return undefined;
    }
  }
  return raw;
}

/**
 * الحقول من create-ad: `details.specs` (color, condition, storage, …).
 * الشركة المصنعة: أولاً `specs.manufacturer` إن وُجدت؛ وإلا آخر مستوى من `details.categoryPath.leaf`
 * (مسار الناشر المحفوظ في نفس JSON — مثل إلكترونيات → هواتف → آبل) ولا يُستخدم إلا إذا وُجدت `leaf`.
 */
const DEVICE_SPEC_KEYS_REST = ["color", "condition", "storage", "accessories"] as const;

type DeviceSpecKeyRest = (typeof DEVICE_SPEC_KEYS_REST)[number];

/** بدائل المفاتيح كما في create-ad أو بيانات قديمة (نفس الفتحة المعروضة) */
const DEVICE_SPEC_ALIASES: Record<DeviceSpecKeyRest, readonly string[]> = {
  color: ["color"],
  condition: ["condition"],
  storage: ["storage", "capacity"],
  accessories: [
    "accessories",
    "deviceAccessories",
    "device_accessories",
    "includedItems",
    "included_items",
  ],
};

function coerceDeviceSpecString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") {
    const t = value.trim();
    return t.length > 0 ? t : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  return null;
}

/** `specs[key]` ثم جذر details — بدون categoryPath */
function getDeviceSpecValueFromDetails(
  detailsRoot: Record<string, unknown> | null,
  parsedSpecs: Record<string, string>,
  key: string,
): string | null {
  const fromSpecs = coerceDeviceSpecString(parsedSpecs[key]);
  if (fromSpecs) return fromSpecs;
  if (!detailsRoot) return null;
  return coerceDeviceSpecString(detailsRoot[key]);
}

type ParsedAdDetails = ReturnType<typeof parseStoredAdDetails>;

/** مسار التصنيف من details كما يحفظه الإنشاء (main/sub/leaf) */
function getStoredCategoryPath(
  detailsRoot: Record<string, unknown> | null,
  parsed: ParsedAdDetails,
): { main: string; sub: string; leaf?: string } | null {
  const metaPath = parsed.meta?.categoryPath;
  if (
    metaPath &&
    typeof metaPath.main === "string" &&
    metaPath.main.trim() &&
    typeof metaPath.sub === "string" &&
    metaPath.sub.trim()
  ) {
    return {
      main: metaPath.main.trim(),
      sub: metaPath.sub.trim(),
      ...(metaPath.leaf?.trim()
        ? { leaf: metaPath.leaf.trim() }
        : {}),
    };
  }
  if (!detailsRoot) return null;
  const cp = detailsRoot["categoryPath"];
  if (!cp || typeof cp !== "object" || Array.isArray(cp)) return null;
  const o = cp as Record<string, unknown>;
  const main = typeof o.main === "string" ? o.main.trim() : "";
  const sub = typeof o.sub === "string" ? o.sub.trim() : "";
  if (!main || !sub) return null;
  const leafRaw = typeof o.leaf === "string" ? o.leaf.trim() : "";
  return leafRaw
    ? { main, sub, leaf: leafRaw }
    : { main, sub };
}

/**
 * الشركة المصنعة: من details فقط.
 * 1) specs.manufacturer أو manufacturer على جذر details
 * 2) إن غابت: ورقة المسار `categoryPath.leaf` فقط (اختيار الناشر المخزّن)، مع وجود main+sub+leaf — بدون leaf لا نستنتج شركة من المسار.
 */
function getManufacturerFromDetails(
  detailsRoot: Record<string, unknown> | null,
  parsed: ParsedAdDetails,
): string | null {
  const explicit = getDeviceSpecValueFromDetails(
    detailsRoot,
    parsed.specs,
    "manufacturer",
  );
  if (explicit) return explicit;
  /** سيارات وغيرها: create-ad يستخدم `car_brand` لا `manufacturer` */
  const carBrand = getDeviceSpecValueFromDetails(
    detailsRoot,
    parsed.specs,
    "car_brand",
  );
  if (carBrand) return carBrand;
  const brand = getDeviceSpecValueFromDetails(
    detailsRoot,
    parsed.specs,
    "brand",
  );
  if (brand) return brand;
  const path = getStoredCategoryPath(detailsRoot, parsed);
  const leaf = path?.leaf?.trim();
  if (!leaf) return null;
  return leaf;
}

function buildDeviceInfoRowsFromDetailsOnly(detailsUnknown: unknown): {
  id: string;
  label: string;
  value: string;
}[] {
  const root =
    detailsUnknown &&
    typeof detailsUnknown === "object" &&
    !Array.isArray(detailsUnknown)
      ? (detailsUnknown as Record<string, unknown>)
      : null;
  const parsed = parseStoredAdDetails(detailsUnknown ?? {});
  const rows: { id: string; label: string; value: string }[] = [];

  const manufacturer = getManufacturerFromDetails(root, parsed);
  if (manufacturer) {
    rows.push({
      id: "device-spec:manufacturer",
      label: "",
      value: manufacturer,
    });
  }

  for (const key of DEVICE_SPEC_KEYS_REST) {
    let value: string | null = null;
    for (const alias of DEVICE_SPEC_ALIASES[key]) {
      value = getDeviceSpecValueFromDetails(root, parsed.specs, alias);
      if (value) break;
    }
    if (!value) continue;
    rows.push({
      id: `device-spec:${key}`,
      label: "",
      value,
    });
  }
  return rows;
}

export default function AdDetail() {
  const params = useParams();
  const id = Number(params.id);
  const { toast } = useToast();
  const { user } = useAuth();
  const { locale } = useLocale();
  const [, navigate] = useLocation();

  const queryClient = useQueryClient();
  const adKey = getGetAdQueryKey(id);
  const { data: ad, isLoading } = useGetAd(id, {
    query: { enabled: !!id, queryKey: adKey },
  });

  const sellerPresenceTargets = useMemo(() => {
    if (!ad?.userId || !user?.id || ad.userId === user.id) return [];
    return [ad.userId];
  }, [ad?.userId, user?.id]);

  const sellerPresenceQ = useUserPresenceBatch(sellerPresenceTargets, {
    enabled: sellerPresenceTargets.length > 0,
  });
  const sellerPresenceEntry = sellerPresenceQ.data?.byUserId[String(ad?.userId ?? "")];

  const [copied, setCopied] = useState(false);
  const [viewCount, setViewCount] = useState<number | null>(null);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const [reportExtra, setReportExtra] = useState("");
  const [reportReasonOpen, setReportReasonOpen] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

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
          description: errText || t("ad_detail.http_status", { status: res.status }),
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
      toast({
        title: t("ad_detail.own_ad"),
        description: t("ad_detail.cannot_message_self"),
      });
      return;
    }
    startConversation.mutate(
      { data: { adId: ad.id } },
      {
        onSuccess: (data) => {
          const draft = t("ad_detail.message_draft", {
            title: ad.title,
            url: getPublicAdUrl(ad.id),
          });
          navigate(
            `/messages/${data.id}?draft=${encodeURIComponent(draft)}`,
          );
        },
        onError: (err: unknown) => {
          if (err instanceof ApiError && err.status === 403) {
            toast({
              title: t("ad_detail.chat.open_failed"),
              description: err.message || t("message_thread.chat_send_blocked_toast_body"),
              variant: "destructive",
            });
            return;
          }
          const e = err as { data?: { error?: string } };
          toast({
            title: t("ad_detail.chat.open_failed"),
            description: e?.data?.error || t("common.try_again"),
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
      title: t("ad_detail.copied"),
      description: t("ad_detail.phone_copied"),
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!ad) return;
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
      return;
    }
    if (outcome === "failed") {
      toast({
        title: t("ad_detail.copy_failed"),
        description: t("ad_detail.copy_failed_desc"),
        variant: "destructive",
      });
    }
  };

  const handleWhatsappContact = () => {
    if (!ad) return;
    if (!requireLogin()) return;
    const text = encodeURIComponent(t("ad_detail.whatsapp_message", { title: ad.title }));
    window.open(
      `https://wa.me/${ad.sellerPhone.replace(/[^0-9+]/g, "")}?text=${text}`,
      "_blank",
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col w-full min-h-[100dvh] bg-[#0A0A0A]">
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
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-[#0A0A0A] p-4 text-center">
        <h2 className="text-2xl font-bold mb-2">{t("ad_detail.not_found_title")}</h2>
        <p className="text-muted-foreground mb-6">{t("ad_detail.not_found_desc")}</p>
        <Link href="/">
          <Button>{t("ad_detail.back_home")}</Button>
        </Link>
      </div>
    );
  }

  const isFree = ad.priceType === "free";
  /** `details` يأتي من الـ API لكنه غير مُعرَّف في نوع Ad المولَّد */
  const detailsRaw = normalizeAdDetailsRaw(
    (ad as unknown as Record<string, unknown>).details,
  );
  const parsed = parseStoredAdDetails(detailsRaw ?? {});
  const deviceLabelById: Record<string, string> = {
    "device-spec:manufacturer": t("ad_detail.device.manufacturer"),
    "device-spec:color": t("ad_detail.device.color"),
    "device-spec:condition": t("ad_detail.device.condition"),
    "device-spec:storage": t("ad_detail.device.storage"),
    "device-spec:accessories": t("ad_detail.device.accessories"),
  };
  const deviceInfoRows = buildDeviceInfoRowsFromDetailsOnly(detailsRaw ?? {}).map((row) => ({
    ...row,
    label: deviceLabelById[row.id] ?? row.label,
    value:
      row.value === "نعم"
        ? t("common.yes")
        : row.value === "لا"
          ? t("common.no")
          : getCreateAdTaxonomyLabel(locale as Locale, row.value),
  }));

  const shipMeta = parsed.meta?.shipping;
  const shippingPickupOnly = shipMeta?.pickupOnly === true;
  const shippingIdList = shipMeta?.ids ?? [];
  const shippingRows: string[] =
    shippingPickupOnly || shippingIdList.length === 0
      ? []
      : shippingIdList.map((sid) => AD_SHIPPING_LABELS[sid] ?? sid);

  const pageMax =
    "mx-auto w-full max-w-[900px] md:max-w-[760px] lg:max-w-[860px] px-4 md:px-6";
  /** كرت العنوان/السعر/الموقع — نفس روح الإحصائيات ومعلومات الجهاز (lime + glow) */
  const heroTitlePriceSurface =
    "rounded-2xl border border-primary/40 bg-card/80 p-4 shadow-[0_0_28px_-12px_hsl(var(--primary)/0.22)] ring-1 ring-primary/15 dark:bg-zinc-950/70 md:p-5";
  /** شريط إحصائيات: حدود lime خفيفة + خلفية داكنة (متناسق مع مرجع الصفحة) */
  const statsStripSurface =
    "rounded-2xl border border-primary/40 bg-muted/25 p-1 shadow-[0_0_28px_-10px_hsl(var(--primary)/0.22)] ring-1 ring-primary/15 dark:bg-zinc-950/70";
  /** كرت «معلومات الجهاز» — dark + lime خفيف + glow بسيط (متناسق مع شريط الإحصائيات) */
  const deviceInfoShell =
    "rounded-2xl border border-primary/40 bg-card/80 p-4 shadow-[0_0_28px_-12px_hsl(var(--primary)/0.22)] ring-1 ring-primary/15 dark:bg-zinc-950/70 md:p-5";
  /** بطاقة مواصفة داخل الشبكة */
  const deviceSpecTile =
    "flex min-h-[5.25rem] flex-col justify-start gap-1.5 rounded-xl border border-primary/32 bg-muted/20 p-3.5 text-right shadow-[0_0_18px_-12px_hsl(var(--primary)/0.16)] ring-1 ring-primary/12 dark:bg-black/40";
  /** أزرار علوية فوق المعرض: دائرة داكنة + حدود lime + أيقونة primary + توهج خفيف */
  const floatingHeaderBtn =
    "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/55 bg-card/90 text-primary shadow-[0_0_16px_-5px_hsl(var(--primary)/0.38)] transition-[transform,colors,box-shadow] hover:border-primary/70 hover:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.45)] active:scale-[0.96] disabled:pointer-events-none disabled:opacity-55 dark:bg-black/55";
  const sellerActionH = "h-12 rounded-2xl text-sm font-semibold";
  /** كرت داخلي داخل «معلومات البائع» — نفس روح كروت الشات. */
  const sellerInnerShell =
    "rounded-2xl border border-primary/35 bg-[#0A0A0A] p-4 shadow-[0_0_22px_-12px_hsl(var(--primary)/0.22)] ring-1 ring-primary/12 md:p-5";
  /** صف رقم الهاتف — حدود lime خفيفة أوضح للتفاعل */
  const sellerPhoneRow =
    "flex h-12 w-full items-center gap-3 rounded-xl border border-primary/35 bg-black/55 px-3.5 ring-1 ring-primary/10 transition-colors hover:border-primary/45 hover:ring-primary/15 dark:bg-black/50";
  /** زر عرض الملف الشخصي — حد مشابه لصف الهاتف */
  const sellerProfileLinkBtn =
    "flex h-12 w-full items-center justify-center rounded-2xl border border-primary/32 bg-zinc-950/80 text-sm font-semibold text-foreground ring-1 ring-primary/8 transition-colors hover:border-primary/42 hover:bg-zinc-900/90 hover:ring-primary/12";
  const otherReason = t("ad_detail.report.opt_other");
  const reportReasonOptions = [
    t("ad_detail.report.opt_fraud"),
    t("ad_detail.report.opt_duplicate"),
    t("ad_detail.report.opt_wrong_info"),
    t("ad_detail.report.opt_violation"),
    t("ad_detail.report.opt_inappropriate"),
    otherReason,
  ];
  const reportDisabled =
    reporting ||
    !reason ||
    (reason === otherReason && !reportExtra.trim());

  const reportReasonValue = reason || "";

  const descRaw = ad.description?.trim() ?? "";
  const descNeedsToggle =
    descRaw.length > 100 || descRaw.split("\n").length > 2;

  return (
    <motion.div
      dir="rtl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col w-full min-h-[100dvh] bg-[#0A0A0A] pb-28"
    >
      {/* أزرار علوية ضمن تدفق الصفحة فوق المعرض — بدون fixed/sticky لتجنب التداخل مع الكروت عند التمرير */}
      <div className={`${pageMax} pb-2 space-y-2`}>
        <div className="flex items-center justify-between gap-3 py-3 md:py-4">
          <Link href="/" className="shrink-0">
            <button
              type="button"
              className={floatingHeaderBtn}
              aria-label={t("common.back")}
            >
              <ArrowRight className="h-5 w-5" strokeWidth={2.25} />
            </button>
          </Link>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleShare()}
              className={floatingHeaderBtn}
              aria-label={t("ad_detail.copy_link")}
            >
              <Share2 className="h-5 w-5" strokeWidth={2.25} />
            </button>
            <button
              type="button"
              onClick={handleToggleFavorite}
              aria-label={t("ad_detail.favorite")}
              disabled={favMut.isPending || unfavMut.isPending}
              className={floatingHeaderBtn}
            >
              <Heart
                className={cn(
                  "h-5 w-5",
                  ad.isFavorited
                    ? "fill-primary text-primary"
                    : "text-primary",
                )}
                strokeWidth={2.25}
              />
            </button>
          </div>
        </div>
        {/* معرض الصور — مطابق لعرض الإنشاء المحلي */}
        <CreateAdImageGallery
          readOnly
          uploadedImages={ad.images ?? []}
          maxImages={Math.max(ad.images?.length ?? 0, 1)}
          isSubmittingUploads={false}
        />
      </div>

      <div className={`${pageMax} py-2 md:py-4`}>
        <div className="flex flex-col gap-4 min-w-0">
          {/* كرت العنوان والسعر والموقع */}
          <div className={heroTitlePriceSurface}>
            <h1 className="text-xl md:text-2xl font-bold leading-tight mb-2 text-foreground text-right">
              {ad.title}
            </h1>
            {isFree ? (
              <div className="text-2xl font-bold text-primary">
                {t("ad-card.free")}
              </div>
            ) : (
              <div className="text-2xl md:text-[1.65rem] font-bold text-primary text-right">
                {formatPrice(ad.price, ad.priceType)}
              </div>
            )}
            {!isFree && ad.priceType === "negotiable" && (
              <div className="mt-3 flex justify-end">
                <span className="inline-flex rounded-full border border-primary/50 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {t("ad-card.negotiable")}
                </span>
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.25} />
              <span>{ad.city}</span>
              <span className="opacity-50">·</span>
              <span>{formatRelativeTime(ad.createdAt)}</span>
            </div>
          </div>

          {/* الإحصائيات — شريط أفقي بحدود lime وثلاثة أعمدة */}
          <div
            className={cn(
              statsStripSurface,
              "flex min-h-[5.25rem] items-stretch py-3.5",
            )}
          >
            <div className="flex flex-1 flex-col items-center justify-center gap-1.5 px-2">
              <div className="flex items-center gap-1.5 text-primary">
                <span className="text-lg font-bold tabular-nums leading-none text-foreground">
                  {(viewCount ?? ad.views ?? 0).toLocaleString("ar")}
                </span>
                <Eye className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.25} />
              </div>
              <span className="text-[11px] font-medium text-primary/90">
                {t("ad_detail.views")}
              </span>
            </div>
            <div
              className="w-px shrink-0 bg-primary/25 self-stretch my-0.5"
              aria-hidden
            />
            <button
              type="button"
              onClick={handleToggleLike}
              aria-label={t("ad_detail.likes")}
              disabled={likeMut.isPending || unlikeMut.isPending}
              className="flex flex-1 flex-col items-center justify-center gap-1.5 px-2 active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              <div className="flex items-center gap-1.5 text-primary">
                <span className="text-lg font-bold tabular-nums leading-none text-foreground">
                  {(ad.likeCount ?? 0).toLocaleString("ar")}
                </span>
                <ThumbsUp
                  className={cn(
                    "h-4 w-4 shrink-0 text-primary",
                    ad.isLiked && "fill-primary",
                  )}
                  strokeWidth={2.25}
                />
              </div>
              <span className="text-[11px] font-medium text-primary/90">
                {t("ad_detail.likes")}
              </span>
            </button>
            <div
              className="w-px shrink-0 bg-primary/25 self-stretch my-0.5"
              aria-hidden
            />
            <button
              type="button"
              onClick={handleToggleFavorite}
              aria-label={t("ad_detail.favorites")}
              disabled={favMut.isPending || unfavMut.isPending}
              className="flex flex-1 flex-col items-center justify-center gap-1.5 px-2 active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              <div className="flex items-center gap-1.5 text-primary">
                <span className="text-lg font-bold tabular-nums leading-none text-foreground">
                  {(ad.favoriteCount ?? 0).toLocaleString("ar")}
                </span>
                <Star
                  className={cn(
                    "h-4 w-4 shrink-0 text-primary",
                    ad.isFavorited && "fill-primary",
                  )}
                  strokeWidth={2.25}
                />
              </div>
              <span className="text-[11px] font-medium text-primary/90">
                {t("ad_detail.favorites")}
              </span>
            </button>
          </div>

          {/* 1 — معلومات الجهاز: من ad.details (specs + عند الحاجة categoryPath.leaf للشركة المصنعة) */}
          {deviceInfoRows.length > 0 ? (
            <div
              data-testid="ad-device-info-section"
              className={cn(deviceInfoShell, "text-sm")}
            >
              <h3 className="mb-4 text-right text-base font-semibold tracking-tight text-foreground md:text-lg">
                {t("ad_detail.device_info")}
              </h3>
              <ul className="grid grid-cols-2 gap-3">
                {deviceInfoRows.map((row) => (
                  <li key={row.id} className={deviceSpecTile}>
                    <p className="text-[11px] font-medium leading-tight text-muted-foreground">
                      {row.label}
                    </p>
                    <p className="text-[15px] font-bold leading-snug text-foreground break-words">
                      {row.value}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* 2 — الوصف */}
          <div className={cn(deviceInfoShell, "text-sm")}>
            <h3 className="mb-3 text-right text-base font-semibold text-foreground">
              {t("ad_detail.description")}
            </h3>
            {descRaw ? (
              <>
                <p
                  className={cn(
                    "whitespace-pre-wrap text-right text-sm leading-relaxed text-foreground/90",
                    descNeedsToggle && !descExpanded && "line-clamp-2",
                  )}
                >
                  {descRaw}
                </p>
                {descNeedsToggle ? (
                  <button
                    type="button"
                    onClick={() => setDescExpanded((v) => !v)}
                    className="mt-2.5 text-sm font-medium text-primary hover:underline"
                  >
                    {descExpanded
                      ? t("ad_detail.show_less")
                      : t("ad_detail.show_more")}
                  </button>
                ) : null}
              </>
            ) : (
              <p className="text-right text-sm text-muted-foreground">
                {t("ad_detail.no_description")}
              </p>
            )}
          </div>

          {/* 3 — الشحن والتسليم */}
          <div className={cn(deviceInfoShell, "text-sm")}>
            <h3 className="mb-3 text-right text-base font-semibold text-foreground">
              {t("ad_detail.shipping_delivery")}
            </h3>
            {shippingPickupOnly ? (
              <p className="text-right leading-relaxed text-foreground/88">
                {t("ad_detail.pickup_only")}
              </p>
            ) : shippingRows.length > 0 ? (
              <ul className="list-disc space-y-1.5 text-right text-foreground/88 [padding-inline-start:1.1rem]">
                {shippingRows.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="text-right text-muted-foreground">
                {t("ad_detail.no_shipping_options")}
              </p>
            )}
          </div>

          {/* 4 — كرت البائع */}
          <section className={cn(deviceInfoShell, "text-sm", "space-y-3")}>
            <h3 className="text-right text-base font-semibold text-foreground">
              {t("ad_detail.seller_info")}
            </h3>

            <div className="space-y-3.5">
              <div className={cn(sellerInnerShell, "space-y-3")}>
                <div className="flex items-center gap-3 text-right">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground shadow-[0_0_14px_-5px_hsl(var(--primary)/0.38)]"
                    aria-hidden
                  >
                    {(ad.sellerName || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col items-stretch gap-1">
                    <p className="truncate text-base font-bold leading-tight text-foreground">
                      {ad.sellerName}
                    </p>
                    {sellerPresenceTargets.length > 0 ? (
                      <UserPresenceBadge
                        entry={sellerPresenceEntry}
                        isLoading={sellerPresenceQ.isPending}
                        variant="compact"
                      />
                    ) : null}
                    <p className="text-xs leading-snug text-muted-foreground">
                      {ad.userId
                        ? t("ad_detail.view_profile_and_ads")
                        : t("ad_detail.member")}
                    </p>
                  </div>
                </div>
                {ad.userId ? (
                  <Link
                    href={`/users/${ad.userId}`}
                    className={sellerProfileLinkBtn}
                  >
                    {t("ad_detail.view_profile")}
                  </Link>
                ) : null}
              </div>

              <div className={cn(sellerInnerShell, "flex flex-col gap-2.5")}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleMessage}
                  disabled={startConversation?.isPending}
                  className={cn(
                    sellerActionH,
                    "flex w-full items-center justify-center gap-2 border-2 border-primary/55 bg-zinc-950/90 font-semibold text-primary shadow-[0_0_12px_-6px_hsl(var(--primary)/0.2)] hover:bg-zinc-900/95 hover:text-primary hover:border-primary/65",
                  )}
                >
                  {t("ad_detail.message_seller")}
                  <MessageSquare className="h-4 w-4 shrink-0" />
                </Button>

                <button
                  type="button"
                  onClick={handleWhatsappContact}
                  className={cn(
                    sellerActionH,
                    "flex w-full items-center justify-center gap-2 border-2 border-emerald-500/50 bg-zinc-950/90 font-semibold text-emerald-600 transition-colors hover:bg-emerald-500/[0.07] dark:text-emerald-400 dark:border-emerald-500/45",
                  )}
                >
                  <span>{t("ad_detail.contact_whatsapp")}</span>
                  <FaWhatsapp className="h-5 w-5 shrink-0" aria-hidden />
                </button>

                <button
                  type="button"
                  onClick={handleCopyPhone}
                  className={cn(
                    sellerPhoneRow,
                    "justify-between font-medium",
                  )}
                >
                  <Phone className="h-4 w-4 shrink-0 text-primary" />
                  <span
                    dir="ltr"
                    className="min-w-0 flex-1 text-center font-mono text-[15px] text-foreground"
                  >
                    {ad.sellerPhone}
                  </span>
                  <Copy
                    className={cn(
                      "h-4 w-4 shrink-0 text-primary",
                      copied &&
                        "drop-shadow-[0_0_8px_hsl(var(--primary)/0.35)]",
                    )}
                  />
                </button>

              </div>

              <div className={cn(sellerInnerShell, "space-y-2.5")}>
                <div className="rounded-xl border border-primary/30 bg-zinc-950/90 p-3 shadow-[0_0_16px_-12px_hsl(var(--primary)/0.2)] ring-1 ring-primary/10">
                  <p className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    {t("ad_detail.report.choose_reason")}
                  </p>
                  <button
                    type="button"
                    onClick={() => setReportReasonOpen(true)}
                    className="flex h-11 w-full items-center justify-between rounded-xl border border-primary/35 bg-[#0A0A0A] px-3 text-right text-sm text-foreground outline-none ring-1 ring-primary/10 transition-colors hover:border-primary/48 hover:bg-zinc-900/90 focus-visible:ring-2 focus-visible:ring-primary/25"
                  >
                    <ChevronDown className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span className="truncate text-right">
                      {reportReasonValue || t("ad_detail.report.choose_reason")}
                    </span>
                  </button>
                </div>

                <div className="rounded-xl border border-primary/30 bg-zinc-950/90 p-2.5 shadow-[0_0_16px_-12px_hsl(var(--primary)/0.2)] ring-1 ring-primary/10">
                  <Button
                    type="button"
                    variant="ghost"
                    title={
                      reportDisabled && !reporting && !reason
                        ? t("ad_detail.report.choose_reason")
                        : reportDisabled &&
                            !reporting &&
                            reason === otherReason &&
                            !reportExtra.trim()
                          ? t("ad_detail.report.details_placeholder")
                          : undefined
                    }
                    className={cn(
                      AUTH_ACCENT_OUTLINE_BTN,
                      "w-full hover:bg-zinc-900",
                      reportDisabled && "pointer-events-none opacity-50",
                    )}
                    onClick={() => {
                      if (!user) {
                        navigate(`/login?redirect=/ad/${id}`);
                        return;
                      }
                      void handleReport();
                    }}
                    disabled={reportDisabled}
                  >
                    <Flag className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.25} />
                    {reporting
                      ? t("ad_detail.sending")
                      : t("ad_detail.report.submit")}
                  </Button>
                </div>
              </div>

              {reason === otherReason && (
                <div className={sellerInnerShell}>
                  <textarea
                    placeholder={t("ad_detail.report.details_placeholder")}
                    className="min-h-[88px] w-full rounded-xl border border-primary/28 bg-zinc-950/90 p-3 text-right text-sm text-foreground shadow-inner ring-1 ring-primary/10 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    value={reportExtra}
                    onChange={(e) => setReportExtra(e.target.value)}
                  />
                </div>
              )}
            </div>
          </section>

          {/* 5 — التحذير الأمني (خارج كرت البائع) */}
          <BuyerSafetyNote
            className={cn("w-full", deviceInfoShell, "text-sm")}
          />
        </div>
      </div>

      <Sheet open={reportReasonOpen} onOpenChange={setReportReasonOpen}>
        <SheetContent
          side="bottom"
          hideClose
          className="flex max-h-[min(86dvh,680px)] flex-col gap-0 rounded-t-2xl border-x-0 border-b-0 border-t border-primary/35 bg-[#0A0A0A] p-0 shadow-[0_-12px_48px_-16px_rgba(0,0,0,0.55)] ring-1 ring-primary/20 sm:mx-auto sm:max-w-lg"
        >
          <div className="flex items-center justify-between border-b border-primary/20 px-4 pb-3 pt-4">
            <SheetTitle className="text-base font-semibold text-white">
              {t("ad_detail.report.choose_reason")}
            </SheetTitle>
            <button
              type="button"
              onClick={() => setReportReasonOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-primary/45 bg-zinc-950/90 text-primary hover:border-primary/65 hover:bg-zinc-900"
              aria-label={t("common.cancel")}
            >
              <ArrowRight className="h-4 w-4 rotate-180" aria-hidden />
            </button>
          </div>
          <SheetDescription className="sr-only">
            {t("ad_detail.report.choose_reason")}
          </SheetDescription>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <div className="flex flex-col gap-2.5">
              {reportReasonOptions.map((opt) => {
                const selected = reason === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setReason(opt);
                      setReportReasonOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-right text-sm font-medium transition-colors",
                      selected
                        ? "border-primary/55 bg-primary/12 text-primary shadow-[0_0_18px_-10px_hsl(var(--primary)/0.35)] ring-1 ring-primary/22"
                        : "border-primary/30 bg-zinc-950/90 text-white shadow-[0_0_16px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10 hover:border-primary/45 hover:bg-zinc-900/95",
                    )}
                  >
                    <span>{opt}</span>
                    <span
                      className={cn(
                        "inline-flex h-5 w-5 items-center justify-center rounded-full border",
                        selected
                          ? "border-primary/70 bg-primary/20 text-primary"
                          : "border-zinc-600 bg-[#0A0A0A] text-transparent",
                      )}
                      aria-hidden
                    >
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </motion.div>
  );
}

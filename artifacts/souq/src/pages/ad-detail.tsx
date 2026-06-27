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
  useGetUserProfile,
  useListCategories,
  getListCategoriesQueryKey,
} from "@workspace/api-client-react";
import {
  parseUserApiErrorResponse,
  resolveUserApiToastFromError,
  showUserApiErrorToast,
} from "@/lib/user-api-errors";
import { apiUrl } from "@/lib/api-url";
import { Link, useLocation, useParams } from "wouter";
import {
  ArrowRight,
  Check,
  ChevronDown,
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
import { AdDetailHeroSection } from "@/components/ad-detail-hero-section";
import { getPublicAdUrl } from "@/lib/public-url";
import { buildAdShareText } from "@/lib/share-text";
import { shareOrCopyLink, tryAdImageAsShareFile } from "@/lib/native-share";
import { parseStoredAdDetails } from "@/lib/ad-stored-details";
import { AD_SHIPPING_LABELS } from "@/lib/ad-meta-labels";
import { useToast } from "@/hooks/use-toast";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePageSeo } from "@/hooks/use-page-seo";
import { getDefaultSiteDescription, truncateForMeta } from "@/lib/seo-foundation";
import { buildAdSocialOverride } from "@/lib/social-meta-foundation";
import { buildAdStructuredDataJsonLd } from "@/lib/ad-structured-data";
import { useLocale } from "@/hooks/use-locale";
import { BuyerSafetyNote } from "@/components/buyer-safety-note";
import { AdDetailCommerceActions } from "@/features/p17-commerce/ad-detail-commerce-actions";
import {
  P17_MESSAGE_SELLER_BTN,
  P17_WHATSAPP_BTN,
} from "@/features/p17-commerce/ad-detail-commerce-styles";
import { AdDetailSellerPresenceBadge } from "@/components/ad-detail-seller-presence-badge";
import { ProfileAvatarRing } from "@/components/profile-avatar-ring";
import { t, type Locale } from "@/i18n";
import {
  BOTTOM_NAV_PAGE_SHELL_CLASS,
} from "@/lib/bottom-nav-layout";
import { AppShellContentScroll } from "@/components/app-shell-content-scroll";
import { cn } from "@/lib/utils";
import { PLATFORM_CARD_INSET } from "@/lib/home-page-layout";

/** Scroll-end clearance — nav button row + L3 visual drop + breathing room for last full card. */
const adDetailScrollEndSpacer =
  "min-h-[calc(3.125rem+var(--souq-bottom-nav-drop,0px)+1rem)] shrink-0 bg-[#0A0A0A] md:min-h-[calc(3.5rem+var(--souq-bottom-nav-drop,0px)+1rem)]";
import { getCreateAdTaxonomyLabel } from "@/lib/create-ad-taxonomy-labels";
import { buildAdDetailSpecRows } from "@/lib/create-ad-dynamic-fields";
import { lookupMarketplaceCountry } from "@/lib/locations/manifest-data";
import { useQueryClient } from "@tanstack/react-query";
import { STALE_AD_DETAIL_MS, STALE_CATEGORIES_MS } from "@/lib/query-stale-times";
import { createFavoriteToggleHandlers } from "@/lib/invalidate-ad-queries";
import { prefetchConversationThread } from "@/lib/prefetch-conversation-thread";
import { bustConversationThreadCache } from "@/lib/chat-thread-cache";
import { AUTH_ACCENT_OUTLINE_BTN } from "@/lib/auth-page-styles";
import {
  UI_LAYER_ABOVE_LEAFLET,
  UI_LAYER_ABOVE_LEAFLET_OVERLAY,
} from "@/lib/ui-layer-z-index";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";

const AdDetailLocationCard = lazy(() =>
  import("@/components/ad-detail-location-card").then((m) => ({
    default: m.AdDetailLocationCard,
  })),
);

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
 * الحقول من create-ad: `details.specs` عبر نفس تعريفات Create Ad (slug + subcategoryName).
 * legacy manufacturer: specs.manufacturer أو categoryPath.leaf للهواتف القديمة فقط.
 */
function getDeviceSpecValueFromDetails(
  detailsRoot: Record<string, unknown> | null,
  parsedSpecs: Record<string, string>,
  key: string,
): string | null {
  const fromSpecs = parsedSpecs[key]?.trim();
  if (fromSpecs) return fromSpecs;
  if (!detailsRoot) return null;
  const raw = detailsRoot[key];
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  if (typeof raw === "boolean") return raw ? "نعم" : "لا";
  return null;
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
 * Legacy phone brand: specs.manufacturer, or categoryPath.leaf when present.
 * Not used for category/subcategory display — API categoryName/subcategoryName only.
 */
function getLegacyManufacturerFromDetails(
  detailsRoot: Record<string, unknown> | null,
  parsed: ParsedAdDetails,
): string | null {
  const explicit = getDeviceSpecValueFromDetails(
    detailsRoot,
    parsed.specs,
    "manufacturer",
  );
  if (explicit) return explicit;
  const path = getStoredCategoryPath(detailsRoot, parsed);
  const leaf = path?.leaf?.trim();
  return leaf || null;
}

function buildAdDetailSpecRowsFromAd(
  detailsUnknown: unknown,
  categorySlug: string | undefined,
  subcategoryName: string | null | undefined,
): { id: string; label: string; value: string }[] {
  const root =
    detailsUnknown &&
    typeof detailsUnknown === "object" &&
    !Array.isArray(detailsUnknown)
      ? (detailsUnknown as Record<string, unknown>)
      : null;
  const parsed = parseStoredAdDetails(detailsUnknown ?? {});
  const legacyManufacturer = getLegacyManufacturerFromDetails(root, parsed);
  return buildAdDetailSpecRows(
    parsed.specs,
    categorySlug,
    subcategoryName ?? undefined,
    legacyManufacturer,
  );
}

const AD_DETAIL_SPEC_LABEL_KEYS: Record<string, string> = {
  manufacturer: "ad_detail.device.manufacturer",
  car_brand: "ad_detail.spec.car_brand",
  color: "ad_detail.device.color",
  condition: "ad_detail.device.condition",
  storage: "ad_detail.device.storage",
  accessories: "ad_detail.device.accessories",
  equipment_brand: "ad_detail.spec.equipment_brand",
};

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
    query: {
      enabled: !!id,
      queryKey: adKey,
      staleTime: STALE_AD_DETAIL_MS,
    },
  });
  const { data: categories } = useListCategories({
    query: {
      queryKey: getListCategoriesQueryKey(),
      staleTime: STALE_CATEGORIES_MS,
    },
  });

  const adPageSeo = useMemo(() => {
    if (!id || !ad?.title) return null;
    const descRaw = ad.description?.trim() ?? "";
    const description = descRaw
      ? truncateForMeta(descRaw)
      : getDefaultSiteDescription(locale);
    return {
      title: `${ad.title} | Souq Arab EU`,
      description,
      canonicalPath: `/ad/${id}`,
    };
  }, [id, ad?.title, ad?.description, locale]);

  const adSocialOverride = useMemo(() => {
    if (!id || !ad) return null;
    return buildAdSocialOverride({
      id,
      title: ad.title,
      description: ad.description,
      price: ad.price,
      priceType: ad.priceType,
      city: ad.city,
      images: ad.images,
    });
  }, [id, ad]);

  const adStructuredDataJsonLd = useMemo(() => {
    if (!id || !ad?.title) return null;
    return buildAdStructuredDataJsonLd({
      id,
      title: ad.title,
      description: ad.description,
      price: ad.price,
      priceType: ad.priceType,
      type: ad.type,
      city: ad.city,
      images: ad.images,
      status: ad.status,
      categoryName: ad.categoryName,
      sellerName: ad.sellerName,
    });
  }, [id, ad]);

  usePageSeo(adPageSeo, adSocialOverride, adStructuredDataJsonLd);

  const sellerPresenceTargets = useMemo(() => {
    if (!ad?.userId || !user?.id || ad.userId === user.id) return [];
    return [ad.userId];
  }, [ad?.userId, user?.id]);

  const sellerPresenceQ = useUserPresenceBatch(sellerPresenceTargets, {
    enabled: sellerPresenceTargets.length > 0,
  });
  const sellerPresenceEntry = sellerPresenceQ.data?.byUserId[String(ad?.userId ?? "")];

  const sellerUserId = ad?.userId ?? null;
  const sellerProfileQueryEnabled =
    sellerUserId != null && Number.isFinite(sellerUserId) && sellerUserId > 0;
  const { data: sellerProfile } = useGetUserProfile(sellerUserId ?? 0, {
    query: { enabled: sellerProfileQueryEnabled },
  });
  const sellerDisplayName = sellerProfile?.name ?? ad?.sellerName ?? "";

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
          queryClient.setQueryData(adKey, (old) =>
            old && typeof old === "object" ? { ...old, views: data.views } : old,
          );
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
  const favBusy = favMut.isPending || unfavMut.isPending;
  const adImages = useMemo(() => ad?.images ?? [], [ad?.images]);

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
        const parsed = await parseUserApiErrorResponse(res);
        showUserApiErrorToast(toast, parsed);
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
    const willFav = !ad.isFavorited;
    const handlers = createFavoriteToggleHandlers(queryClient, ad);
    handlers.optimistic(willFav);
    if (willFav) {
      favMut.mutate(
        { adId: ad.id },
        { onSuccess: handlers.onSuccess, onError: handlers.onError },
      );
    } else {
      unfavMut.mutate(
        { adId: ad.id },
        { onSuccess: handlers.onSuccess, onError: handlers.onError },
      );
    }
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
        onSuccess: async (data) => {
          const draft = t("ad_detail.message_draft", {
            title: ad.title,
            url: getPublicAdUrl(ad.id),
          });
          bustConversationThreadCache(queryClient, data.id);
          await prefetchConversationThread(queryClient, data.id);
          navigate(
            `/messages/${data.id}?draft=${encodeURIComponent(draft)}`,
          );
        },
        onError: (err: unknown) => {
          const payload = resolveUserApiToastFromError(err);
          toast({
            title: payload.title,
            description: payload.description,
            variant: payload.variant,
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
      <div className={BOTTOM_NAV_PAGE_SHELL_CLASS}>
        <AppShellContentScroll>
          <div className="flex w-full flex-col bg-[#0A0A0A]">
            <Skeleton className="aspect-square w-full" />
            <div className="flex flex-col gap-4 p-4">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="mt-4 h-24 w-full" />
            </div>
          </div>
        </AppShellContentScroll>
      </div>
    );
  }

  if (!ad) {
    return (
      <div className={BOTTOM_NAV_PAGE_SHELL_CLASS}>
        <AppShellContentScroll>
          <div className="flex min-h-[50dvh] flex-col items-center justify-center bg-[#0A0A0A] p-4 text-center">
            <h2 className="mb-2 text-2xl font-bold">{t("ad_detail.not_found_title")}</h2>
            <p className="mb-6 text-muted-foreground">{t("ad_detail.not_found_desc")}</p>
            <Link href="/">
              <Button>{t("ad_detail.back_home")}</Button>
            </Link>
          </div>
        </AppShellContentScroll>
      </div>
    );
  }

  const isFree = ad.priceType === "free";
  /** `details` يأتي من الـ API لكنه غير مُعرَّف في نوع Ad المولَّد */
  const detailsRaw = normalizeAdDetailsRaw(
    (ad as unknown as Record<string, unknown>).details,
  );
  const parsed = parseStoredAdDetails(detailsRaw ?? {});
  const categorySlug = categories?.find((c) => c.id === ad.categoryId)?.slug;
  const taxonomyCategoryLabel = ad.categoryName
    ? getCreateAdTaxonomyLabel(locale as Locale, ad.categoryName)
    : "";
  const taxonomySubcategoryLabel = ad.subcategoryName
    ? getCreateAdTaxonomyLabel(locale as Locale, ad.subcategoryName)
    : "";
  const taxonomyLine = [taxonomyCategoryLabel, taxonomySubcategoryLabel]
    .filter(Boolean)
    .join(" · ");
  const specRows = buildAdDetailSpecRowsFromAd(
    detailsRaw ?? {},
    categorySlug,
    ad.subcategoryName,
  ).map((row) => ({
    ...row,
    label:
      (AD_DETAIL_SPEC_LABEL_KEYS[row.id]
        ? t(AD_DETAIL_SPEC_LABEL_KEYS[row.id]!)
        : row.label) || row.label,
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

  const pageInset = PLATFORM_CARD_INSET;
  /** عناوين أقسام — mini-card مثل Create Ad */
  const adDetailSectionHeading = cn(
    "inline-flex max-w-full w-fit items-center rounded-2xl border border-primary/35 bg-[#0A0A0A]/80 px-2 py-px",
    "text-sm font-semibold leading-tight tracking-tight text-foreground",
    "shadow-[0_0_14px_-12px_hsl(var(--primary)/0.16)] ring-1 ring-primary/10 bg-[#0A0A0A]/70",
  );
  /** كرت العنوان/السعر/الموقع — نفس روح الإحصائيات ومعلومات الجهاز (lime + glow) */
  const heroTitlePriceSurface =
    "rounded-2xl border border-primary/40 bg-[#0A0A0A]/80 p-2.5 shadow-[0_0_28px_-12px_hsl(var(--primary)/0.22)] ring-1 ring-primary/15 bg-[#0A0A0A]/70 md:p-3";
  /** شريط إحصائيات: حدود lime خفيفة + خلفية داكنة (متناسق مع مرجع الصفحة) */
  const statsStripSurface =
    "rounded-2xl border border-primary/40 bg-muted/25 px-1 py-0.5 shadow-[0_0_28px_-10px_hsl(var(--primary)/0.22)] ring-1 ring-primary/15 bg-[#0A0A0A]/70";
  /** كروت أقسام المحتوى — مدمجة */
  const deviceInfoShell =
    "rounded-2xl border border-primary/40 bg-[#0A0A0A]/80 p-2.5 shadow-[0_0_22px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/15 bg-[#0A0A0A]/70 md:p-3";
  /** بطاقة مواصفة داخل الشبكة */
  const deviceSpecTile =
    "flex min-h-[3.75rem] flex-col justify-start gap-0.5 rounded-xl border border-primary/30 bg-muted/20 p-2.5 text-right shadow-[0_0_14px_-12px_hsl(var(--primary)/0.12)] ring-1 ring-primary/10 dark:bg-black/40";
  const sellerActionH = "h-12 rounded-2xl text-sm font-semibold";
  /** كرت داخلي داخل «معلومات البائع» — نفس روح كروت الشات. */
  const sellerInnerShell =
    "rounded-2xl border border-primary/35 bg-[#0A0A0A] p-4 shadow-[0_0_22px_-12px_hsl(var(--primary)/0.22)] ring-1 ring-primary/12 md:p-5";
  /** صف رقم الهاتف — حدود lime خفيفة أوضح للتفاعل */
  const sellerPhoneRow =
    "flex h-12 w-full items-center gap-3 rounded-xl border border-primary/35 bg-black/55 px-3.5 ring-1 ring-primary/10 transition-colors hover:border-primary/45 hover:ring-primary/15 dark:bg-black/50";
  /** زر عرض الملف الشخصي — حد مشابه لصف الهاتف */
  const sellerProfileLinkBtn =
    "flex h-12 w-full items-center justify-center rounded-2xl border border-primary/32 bg-[#0A0A0A]/80 text-sm font-semibold text-foreground ring-1 ring-primary/8 transition-colors hover:border-primary/42 hover:bg-black/90 hover:ring-primary/12";
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

  const detailsRecord =
    detailsRaw && typeof detailsRaw === "object" && !Array.isArray(detailsRaw)
      ? (detailsRaw as Record<string, unknown>)
      : null;
  const adCountryCode =
    typeof detailsRecord?.countryCode === "string"
      ? detailsRecord.countryCode.trim().toUpperCase()
      : typeof detailsRecord?.locationCountryCode === "string"
        ? detailsRecord.locationCountryCode.trim().toUpperCase()
        : ad.city?.trim()
          ? "DE"
          : "";
  const adCountryRow = adCountryCode ? lookupMarketplaceCountry(adCountryCode) : undefined;
  const adCountryLabel = adCountryRow
    ? locale === "ar"
      ? adCountryRow.nameAr
      : adCountryRow.nameEn
    : adCountryCode || null;
  const cityTrim = ad.city?.trim() ?? "";
  const locationLine =
    cityTrim && adCountryLabel
      ? `${cityTrim}، ${adCountryLabel}`
      : cityTrim || adCountryLabel;

  return (
    <div className={BOTTOM_NAV_PAGE_SHELL_CLASS}>
      <AppShellContentScroll>
      <div
        dir="rtl"
        className="flex w-full flex-col bg-[#0A0A0A]"
      >
      <AdDetailHeroSection
        pageInset={pageInset}
        images={adImages}
        title={ad.title}
        isFavorited={ad.isFavorited ?? false}
        favBusy={favBusy}
        onShare={() => void handleShare()}
        onToggleFavorite={handleToggleFavorite}
      />

      <div className={cn(pageInset, "py-1.5 md:py-3")}>
        <div className="flex flex-col gap-3 min-w-0">
          {/* كرت العنوان والسعر والموقع */}
          <div className={heroTitlePriceSurface} data-ad-detail-shell="hero">
            <div className="flex flex-col gap-1 text-right">
              <h1 className="text-xl md:text-2xl font-bold leading-snug text-foreground">
                {ad.title}
              </h1>
              <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-0.5">
                {isFree ? (
                  <span className="text-[1.75rem] md:text-[1.85rem] font-extrabold leading-none text-primary">
                    {t("ad-card.free")}
                  </span>
                ) : (
                  <span className="text-[1.75rem] md:text-[1.85rem] font-extrabold leading-none text-primary tabular-nums">
                    {formatPrice(ad.price, ad.priceType)}
                  </span>
                )}
                {!isFree && ad.priceType === "negotiable" && (
                  <span className="inline-flex rounded-full border border-primary/50 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {t("ad-card.negotiable")}
                  </span>
                )}
              </div>
              {(taxonomyLine || locationLine || ad.createdAt) && (
                <p className="text-[11px] leading-snug text-muted-foreground/75">
                  {taxonomyLine ? (
                    <>
                      <Link
                        href={`/category/${ad.categoryId}${ad.subcategoryId ? `?subcategoryId=${ad.subcategoryId}` : ""}`}
                        className="font-medium text-primary/90 hover:underline"
                      >
                        {taxonomyLine}
                      </Link>
                      {locationLine || ad.createdAt ? " · " : ""}
                    </>
                  ) : null}
                  {locationLine}
                  {locationLine && ad.createdAt ? " · " : ""}
                  <span className="tabular-nums">{formatRelativeTime(ad.createdAt)}</span>
                </p>
              )}
            </div>
          </div>

          {/* الإحصائيات — شريط أفقي بحدود lime وثلاثة أعمدة */}
          <div
            data-ad-detail-shell="stats"
            className={cn(
              statsStripSurface,
              "flex min-h-[4rem] items-stretch py-2",
            )}
          >
            <div className="flex flex-1 flex-col items-center justify-center gap-1 px-2">
              <div className="flex items-center gap-1 text-primary">
                <span className="text-base font-bold tabular-nums leading-none text-foreground">
                  {(viewCount ?? ad.views ?? 0).toLocaleString("ar")}
                </span>
                <Eye className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.25} />
              </div>
              <span className="text-[10px] font-medium text-primary/90">
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
              className="flex flex-1 flex-col items-center justify-center gap-1 px-2 touch-manipulation active:scale-[0.98] transition-transform duration-150 disabled:opacity-60"
            >
              <div className="flex items-center gap-1 text-primary">
                <span className="text-base font-bold tabular-nums leading-none text-foreground">
                  {(ad.likeCount ?? 0).toLocaleString("ar")}
                </span>
                <ThumbsUp
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 text-primary",
                    ad.isLiked && "fill-primary",
                  )}
                  strokeWidth={2.25}
                />
              </div>
              <span className="text-[10px] font-medium text-primary/90">
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
              className="flex flex-1 flex-col items-center justify-center gap-1 px-2 touch-manipulation active:scale-[0.98] transition-transform duration-150 disabled:opacity-60"
            >
              <div className="flex items-center gap-1 text-primary">
                <span className="text-base font-bold tabular-nums leading-none text-foreground">
                  {(ad.favoriteCount ?? 0).toLocaleString("ar")}
                </span>
                <Star
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 text-primary",
                    ad.isFavorited && "fill-primary",
                  )}
                  strokeWidth={2.25}
                />
              </div>
              <span className="text-[10px] font-medium text-primary/90">
                {t("ad_detail.favorites")}
              </span>
            </button>
          </div>

          {/* 1 — المواصفات: من ad.details.specs + تعريفات Create Ad (slug + subcategoryName من API) */}
          {specRows.length > 0 ? (
            <div
              data-ad-detail-shell="section"
              data-testid="ad-device-info-section"
              className={cn(deviceInfoShell, "space-y-1.5 text-sm")}
            >
              <span className={cn(adDetailSectionHeading, "mb-0")} data-ad-detail-shell="heading">
                {t("ad_detail.specifications")}
              </span>
              <ul className="grid grid-cols-2 gap-2">
                {specRows.map((row) => (
                  <li key={row.id} className={deviceSpecTile} data-ad-detail-shell="tile">
                    <p className="text-[10px] font-medium leading-tight text-muted-foreground">
                      {row.label}
                    </p>
                    <p className="text-sm font-bold leading-snug text-foreground break-words">
                      {row.value}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* 2 — الوصف */}
          <div className={cn(deviceInfoShell, "space-y-1.5 text-sm")} data-ad-detail-shell="section">
            <span className={cn(adDetailSectionHeading, "mb-0")} data-ad-detail-shell="heading">
              {t("ad_detail.description")}
            </span>
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
          <div className={cn(deviceInfoShell, "space-y-1.5 text-sm")} data-ad-detail-shell="section">
            <span className={cn(adDetailSectionHeading, "mb-0")} data-ad-detail-shell="heading">
              {t("ad_detail.shipping_delivery")}
            </span>
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
          <section className={cn(deviceInfoShell, "space-y-2.5 text-sm")} data-ad-detail-shell="section">
            <span className={cn(adDetailSectionHeading, "mb-0")} data-ad-detail-shell="heading">
              {t("ad_detail.seller_info")}
            </span>

            <div className="space-y-3.5">
              <div className={cn(sellerInnerShell, "space-y-3")} data-ad-detail-shell="inner">
                <div className="flex items-center gap-3 text-right">
                  <div className="shrink-0" aria-hidden>
                    <ProfileAvatarRing
                      name={sellerDisplayName}
                      src={sellerProfile?.avatarUrl}
                      size={44}
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col items-stretch gap-1">
                    <p className="truncate text-base font-bold leading-tight text-foreground">
                      {sellerDisplayName}
                    </p>
                    {sellerPresenceTargets.length > 0 ? (
                      <AdDetailSellerPresenceBadge
                        entry={sellerPresenceEntry}
                        isLoading={sellerPresenceQ.isPending}
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
                    data-ad-detail-shell="btn"
                  >
                    {t("ad_detail.view_profile")}
                  </Link>
                ) : null}
              </div>

              <div className={cn(sellerInnerShell, "flex flex-col gap-2.5")} data-ad-detail-shell="inner">
                <AdDetailCommerceActions
                  adId={ad.id}
                  secondaryButtonClassName={sellerActionH}
                  hidden={Boolean(user?.id && ad.userId && user.id === ad.userId)}
                />

                <button
                  type="button"
                  onClick={handleWhatsappContact}
                  className={cn(P17_WHATSAPP_BTN, sellerActionH)}
                >
                  <span>{t("ad_detail.contact_whatsapp")}</span>
                  <FaWhatsapp className="h-5 w-5 shrink-0" aria-hidden />
                </button>

                <button
                  type="button"
                  onClick={handleMessage}
                  disabled={startConversation?.isPending}
                  className={cn(P17_MESSAGE_SELLER_BTN, sellerActionH)}
                >
                  {t("ad_detail.message_seller")}
                  <MessageSquare className="h-4 w-4 shrink-0 opacity-90" />
                </button>

                <button
                  type="button"
                  onClick={handleCopyPhone}
                  data-ad-detail-shell="row"
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

              <div className={cn(sellerInnerShell, "space-y-2.5")} data-ad-detail-shell="inner">
                <div className="rounded-xl border border-primary/30 bg-[#0A0A0A]/90 p-3 shadow-[0_0_16px_-12px_hsl(var(--primary)/0.2)] ring-1 ring-primary/10" data-ad-detail-shell="nested">
                  <p className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    {t("ad_detail.report.choose_reason")}
                  </p>
                  <button
                    type="button"
                    onClick={() => setReportReasonOpen(true)}
                    className="flex h-11 w-full items-center justify-between rounded-xl border border-primary/35 bg-[#0A0A0A] px-3 text-right text-sm text-foreground outline-none ring-1 ring-primary/10 transition-colors hover:border-primary/48 hover:bg-black/90 focus-visible:ring-2 focus-visible:ring-primary/25"
                  >
                    <ChevronDown className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span className="truncate text-right">
                      {reportReasonValue || t("ad_detail.report.choose_reason")}
                    </span>
                  </button>
                </div>

                <div className="rounded-xl border border-primary/30 bg-[#0A0A0A]/90 p-2.5 shadow-[0_0_16px_-12px_hsl(var(--primary)/0.2)] ring-1 ring-primary/10" data-ad-detail-shell="nested">
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
                      "w-full hover:bg-black/30",
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
                <div className={sellerInnerShell} data-ad-detail-shell="inner">
                  <textarea
                    placeholder={t("ad_detail.report.details_placeholder")}
                    className="min-h-[88px] w-full rounded-xl border border-primary/28 bg-[#0A0A0A]/90 p-3 text-right text-sm text-foreground shadow-inner ring-1 ring-primary/10 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    value={reportExtra}
                    onChange={(e) => setReportExtra(e.target.value)}
                  />
                </div>
              )}
            </div>
          </section>

          {/* 5 — موقع الإعلان (خريطة المدينة فقط — فوق التحذير الأمني) */}
          <Suspense
            fallback={
              <div
                className="h-[14rem] w-full animate-pulse rounded-2xl border border-primary/30 bg-[#0A0A0A]/60"
                aria-hidden
              />
            }
          >
            <AdDetailLocationCard
              city={ad.city ?? ""}
              countryCode="DE"
              sectionShellClassName={deviceInfoShell}
              overlayActive={reportReasonOpen}
            />
          </Suspense>

          {/* 6 — التحذير الأمني (خارج كرت البائع) */}
          <BuyerSafetyNote
            className={cn("w-full", deviceInfoShell, "text-sm")}
          />
        </div>
      </div>

      <div aria-hidden className={adDetailScrollEndSpacer} data-testid="ad-detail-scroll-spacer" />
      </div>

      <Sheet open={reportReasonOpen} onOpenChange={setReportReasonOpen}>
        <SheetContent
          side="bottom"
          hideClose
          overlayClassName={UI_LAYER_ABOVE_LEAFLET_OVERLAY}
          className={cn(
            UI_LAYER_ABOVE_LEAFLET,
            "flex max-h-[min(86dvh,680px)] flex-col gap-0 rounded-t-2xl border-x-0 border-b-0 border-t border-primary/35 bg-[#0A0A0A] p-0 shadow-[0_-12px_48px_-16px_rgba(0,0,0,0.55)] ring-1 ring-primary/20 sm:mx-auto sm:max-w-lg",
          )}
        >
          <div className="flex items-center justify-between border-b border-primary/20 px-4 pb-3 pt-4">
            <SheetTitle className="text-base font-semibold text-white">
              {t("ad_detail.report.choose_reason")}
            </SheetTitle>
            <button
              type="button"
              onClick={() => setReportReasonOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-primary/45 bg-[#0A0A0A]/90 text-primary hover:border-primary/65 hover:bg-black/30"
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
                        : "border-primary/30 bg-[#0A0A0A]/90 text-white shadow-[0_0_16px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10 hover:border-primary/45 hover:bg-black/95",
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
      </AppShellContentScroll>
    </div>
  );
}

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
      toast({ title: "خطأ", description: "اختر سبب الإبلاغ" });
      return;
    }

    if (!requireLogin()) return;

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
            reason === "أخرى" ? reportExtra.trim() || undefined : undefined,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        toast({
          title: "تعذّر الإبلاغ",
          description: errText || `رمز ${res.status}`,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "تم", description: "تم إرسال البلاغ" });
      setReason("");
      setReportExtra("");
      setReportOpen(false);
    } catch (err) {
      toast({ title: "خطأ", description: "فشل إرسال البلاغ" });
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
  const shippingLine =
    parsed.meta?.shipping?.pickupOnly === true
      ? "استلام من البائع فقط"
      : parsed.meta?.shipping?.ids?.length
        ? parsed.meta.shipping.ids
            .map((sid) => AD_SHIPPING_LABELS[sid] ?? sid)
            .join("، ")
        : null;
  const promotionLine =
    parsed.meta?.promotions?.filter(Boolean).map(
      (pid) => AD_PROMOTION_LABELS[pid] ?? pid,
    ) ?? [];
  const hasExtraDetailsBlock =
    specEntries.length > 0 ||
    !!pathLabel ||
    !!parsed.meta?.currency ||
    !!shippingLine ||
    !!parsed.meta?.directBuy ||
    promotionLine.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col w-full min-h-[100dvh] bg-background pb-24"
    >
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <div className="w-full max-w-5xl px-4 md:px-6 py-3 flex justify-between items-center pointer-events-auto">
          <Link href="/">
            <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-transform">
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex gap-2">
            <button
              onClick={handleShare}
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-transform"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleToggleFavorite}
              aria-label="favorite"
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
                  إبلاغ عن الإعلان
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-4 md:px-6 pt-16 md:pt-[4.5rem]">
        <CreateAdImageGallery
          readOnly
          uploadedImages={ad.images ?? []}
          maxImages={Math.max(ad.images?.length ?? 0, 1)}
          isSubmittingUploads={false}
        />
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 md:px-6 py-3 md:py-4">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px] gap-4 lg:gap-5">
          <div className="flex flex-col gap-4">
            {/* Title and Price */}
            <div className="rounded-2xl border border-border bg-card/70 p-4 md:p-4.5">
              <h1 className="text-xl md:text-2xl font-bold leading-tight mb-2">{ad.title}</h1>
              {isFree ? (
                <div className="text-primary font-bold text-2xl">مجاناً</div>
              ) : (
                <div className="text-primary font-bold text-2xl flex items-center gap-2 flex-wrap">
                  {formatPrice(ad.price, ad.priceType)}
                  {ad.priceType === "negotiable" && (
                    <span className="text-xs font-medium bg-primary/10 px-2 py-0.5 rounded-md text-primary">
                      قابل للتفاوض
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center flex-wrap text-sm text-muted-foreground gap-x-1 gap-y-1 mt-2">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>{ad.city}</span>
                <span className="mx-2 opacity-50">•</span>
                <span>{formatRelativeTime(ad.createdAt)}</span>
              </div>
            </div>

            {/* Engagement counter strip + reaction buttons */}
            <div className="bg-card border border-border rounded-2xl px-2 py-1.5 flex items-stretch divide-x divide-border/60 [direction:rtl] [&>*]:px-1.5">
              <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground flex-1 justify-center">
                <Eye className="w-4 h-4" />
                <span className="font-semibold text-foreground tabular-nums">
                  {(viewCount ?? ad.views ?? 0).toLocaleString("ar")}
                </span>
                <span className="text-[11px]">مشاهدة</span>
              </div>
              <button
                type="button"
                onClick={handleToggleLike}
                aria-label="like"
                disabled={likeMut.isPending || unlikeMut.isPending}
                className={`flex items-center gap-1 text-xs sm:text-sm flex-1 justify-center active:scale-95 transition-all rounded-lg ${ad.isLiked ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <ThumbsUp
                  className={`w-4 h-4 ${ad.isLiked ? "fill-primary" : ""}`}
                />
                <span className="font-semibold tabular-nums">
                  {(ad.likeCount ?? 0).toLocaleString("ar")}
                </span>
                <span className="text-[11px]">إعجاب</span>
              </button>
              <button
                type="button"
                onClick={handleToggleFavorite}
                aria-label="favorite-counter"
                disabled={favMut.isPending || unfavMut.isPending}
                className={`flex items-center gap-1 text-xs sm:text-sm flex-1 justify-center active:scale-95 transition-all rounded-lg ${ad.isFavorited ? "text-amber-500" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Star
                  className={`w-4 h-4 ${ad.isFavorited ? "fill-amber-500" : ""}`}
                />
                <span className="font-semibold tabular-nums">
                  {(ad.favoriteCount ?? 0).toLocaleString("ar")}
                </span>
                <span className="text-[11px]">مفضّلة</span>
              </button>
            </div>

            {hasExtraDetailsBlock && (
              <div className="rounded-2xl border border-border bg-card/70 p-4 space-y-2 text-sm">
                <h3 className="font-semibold mb-1">التفاصيل والمواصفات</h3>
                {pathLabel && (
                  <div className="flex justify-between gap-3 py-1 border-b border-border/50">
                    <span className="text-muted-foreground shrink-0">مسار التصنيف</span>
                    <span className="font-medium text-left">{pathLabel}</span>
                  </div>
                )}
                {parsed.meta?.currency && (
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">العملة المعروضة</span>
                    <span className="font-medium">{parsed.meta.currency}</span>
                  </div>
                )}
                {shippingLine && (
                  <div className="flex justify-between gap-3 py-1 border-b border-border/50">
                    <span className="text-muted-foreground shrink-0">الشحن</span>
                    <span className="font-medium text-left">{shippingLine}</span>
                  </div>
                )}
                {parsed.meta?.directBuy && (
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">شراء مباشر</span>
                    <span className="font-medium">
                      {parsed.meta.directBuy === "yes" ? "نعم" : "لا"}
                    </span>
                  </div>
                )}
                {promotionLine.length > 0 && (
                  <div className="flex justify-between gap-3 py-1 border-b border-border/50">
                    <span className="text-muted-foreground shrink-0">خيارات التمييز</span>
                    <span className="font-medium text-left">
                      {promotionLine.join("، ")}
                    </span>
                  </div>
                )}
                {specEntries.map(([key, val]) => (
                  <div
                    key={key}
                    className="flex justify-between gap-3 py-1 border-b border-border/50 last:border-0"
                  >
                    <span className="text-muted-foreground shrink-0">
                      {labelForSpecKey(key)}
                    </span>
                    <span className="font-medium text-left">{val}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Description */}
            <div className="rounded-2xl border border-border bg-card/70 p-4">
              <h3 className="font-semibold mb-2">الوصف</h3>
              <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">
                {ad.description}
              </p>
            </div>

            {/* Details List */}
            <div className="rounded-2xl border border-border bg-card/70 p-4 flex flex-col gap-2 text-sm">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">القسم</span>
                <span className="font-medium">{ad.categoryName}</span>
              </div>
              {ad.subcategoryName && (
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">الفئة الفرعية</span>
                  <span className="font-medium">{ad.subcategoryName}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">نوع الإعلان</span>
                <span className="font-medium">
                  {ad.type === "offer" ? "عرض" : "طلب"}
                </span>
              </div>
            </div>
          </div>
          {/* Seller Info */}
          <aside className="h-fit rounded-2xl border border-border bg-card/70 p-3 space-y-2 lg:sticky lg:top-20">
            <h3 className="font-semibold">معلومات البائع</h3>
            <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-muted/20 p-3">
            {ad.userId ? (
              <Link
                href={`/users/${ad.userId}`}
                className="flex items-center gap-3 hover:opacity-90 active:scale-[0.99] transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                  {ad.sellerName.charAt(0)}
                </div>
                <div className="flex-1 flex flex-col min-w-0">
                  <span className="font-semibold truncate">
                    {ad.sellerName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    عرض الملف الشخصي وإعلانات أخرى
                  </span>
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                  {ad.sellerName ? ad.sellerName.charAt(0) : "؟"}
                </div>
                <div className="flex-1 flex flex-col min-w-0">
                  <span className="font-semibold truncate">
                    {ad.sellerName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    عضو في سوق العرب
                  </span>
                </div>
              </div>
            )}
            <Button
              type="button"
              onClick={handleMessage}
              disabled={startConversation?.isPending}
              className="w-full bg-[#b6e356] hover:bg-[#a8d94c] text-black rounded-xl py-2 text-sm font-medium flex items-center justify-center gap-2 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              راسل البائع داخل التطبيق
            </Button>
            <Button
              type="button"
              onClick={handleWhatsappContact}
              className="w-full bg-transparent border border-green-500 text-green-400 hover:bg-green-500/10 rounded-xl py-2 text-sm font-medium flex items-center justify-center gap-2 transition-all"
            >
              <MessageCircle className="w-5 h-5" />
              تواصل عبر واتساب
            </Button>
            </div>
            <button
            type="button"
            onClick={handleCopyPhone}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-md border border-border bg-background text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            <Phone className="w-4 h-4" />
            <span dir="ltr" className="font-mono">
              {ad.sellerPhone}
            </span>
            {copied ? (
              <CheckCircle2 className="w-4 h-4 text-primary" />
            ) : (
              <Copy className="w-4 h-4 opacity-60" />
            )}
            </button>
            <BuyerSafetyNote />
          </aside>
        </div>
      </div>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent dir="rtl" className="text-right sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إبلاغ عن الإعلان</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border rounded-lg p-2.5 bg-background text-sm"
            >
              <option value="" disabled>
                اختر السبب
              </option>
              <option value="احتيال أو نصب">احتيال أو نصب</option>
              <option value="إعلان مكرر">إعلان مكرر</option>
              <option value="معلومات غير صحيحة">معلومات غير صحيحة</option>
              <option value="منتج مخالف">منتج مخالف</option>
              <option value="محتوى غير لائق">محتوى غير لائق</option>
              <option value="أخرى">أخرى</option>
            </select>
            {reason === "أخرى" && (
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
              onClick={() => void handleReport()}
              disabled={
                reporting ||
                !reason ||
                (reason === "أخرى" && !reportExtra.trim())
              }
            >
              {reporting ? "جاري الإرسال..." : "إرسال البلاغ"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

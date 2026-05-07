import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import {
  Check,
  Eye,
  EyeOff,
  Loader2,
  Megaphone,
  Search,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import { getListFeaturedAdsQueryKey } from "@workspace/api-client-react";
import {
  adminLogout,
  deleteAdminAd,
  patchAdminAdFeatured,
  updateAdminAdStatus,
} from "@/features/admin/api";
import {
  ADMIN_ROW_ACTION_BASE,
  ADMIN_TABLE_ROW,
  BTN_FIX,
  BTN_MODAL_GHOST,
  BTN_SEARCH,
  CARD_SHELL,
  SURFACE_TABLE_WRAP,
  adminPillBtn,
} from "@/features/admin/admin-interaction-classes";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { useAdminAds, useAdminDashboard, useRequireAdmin } from "@/features/admin/hooks";
import type { AdminAd } from "@/features/admin/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AUTH_HEADER_TITLE } from "@/lib/auth-page-styles";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const FILTERS = [
  { key: "all", label: "الكل" },
  { key: "pending", label: "قيد المراجعة" },
  { key: "approved", label: "مقبول" },
  { key: "rejected", label: "مرفوض" },
  { key: "hidden", label: "مخفي" },
] as const;

const FEATURE_FILTERS = [
  { key: "all", label: "الكل" },
  { key: "true", label: "مميزة" },
  { key: "false", label: "غير مميزة" },
] as const;

const inputClass =
  "w-full rounded-2xl border border-primary/30 bg-zinc-900/90 px-4 py-2.5 text-sm text-foreground outline-none ring-1 ring-primary/5 transition placeholder:text-muted-foreground focus:border-primary/55 focus:ring-2 focus:ring-primary/25";

function statusLabel(status: string) {
  if (status === "pending") return "قيد المراجعة";
  if (status === "approved") return "مقبول";
  if (status === "rejected") return "مرفوض";
  if (status === "hidden") return "مخفي";
  return status;
}

function statusBadgeClass(status: string) {
  if (status === "pending") return "border-amber-500/45 bg-amber-500/15 text-amber-200";
  if (status === "approved") return "border-emerald-500/45 bg-emerald-500/15 text-emerald-200";
  if (status === "rejected") return "border-orange-500/45 bg-orange-500/12 text-orange-200";
  if (status === "hidden") return "border-zinc-600 bg-zinc-800/80 text-zinc-300";
  return "border-primary/35 bg-primary/10 text-primary";
}

function featuredFilterFromParam(raw: string | null): "all" | "true" | "false" {
  if (raw === "true") return "true";
  if (raw === "false") return "false";
  return "all";
}

function FeaturedStripBadge({ featured }: { featured: boolean }) {
  if (!featured) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary/45 bg-primary/12 px-2 py-0.5 text-xs font-medium text-primary shadow-[0_0_12px_-8px_hsl(var(--primary)/0.35)]">
      <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
      مميز
    </span>
  );
}

function FeaturedToggleButtons({
  ad,
  disabled,
  onRequest,
}: {
  ad: AdminAd;
  disabled: boolean;
  onRequest: (ad: AdminAd, nextFeatured: boolean) => void;
}) {
  if (ad.featured) {
    return (
      <button
        type="button"
        onClick={() => onRequest(ad, false)}
        disabled={disabled}
        className={cn(
          ADMIN_ROW_ACTION_BASE,
          "border-zinc-500/55 bg-zinc-900/80 text-zinc-100 hover:border-primary/40 hover:bg-primary/10 hover:text-primary focus-visible:ring-primary/35",
        )}
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        إزالة التمييز
      </button>
    );
  }
  if (ad.status === "approved") {
    return (
      <button
        type="button"
        onClick={() => onRequest(ad, true)}
        disabled={disabled}
        className={cn(
          ADMIN_ROW_ACTION_BASE,
          "border-primary/45 bg-primary/12 text-primary hover:border-primary/60 hover:bg-primary/20 focus-visible:ring-primary/40",
        )}
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        تمييز
      </button>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <button
            type="button"
            disabled
            className={cn(
              ADMIN_ROW_ACTION_BASE,
              "cursor-not-allowed border-zinc-700/80 bg-zinc-900/60 text-zinc-500 opacity-70",
            )}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            تمييز
          </button>
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-[260px] border border-primary/35 bg-zinc-950 px-3 py-2 text-xs leading-relaxed text-foreground shadow-lg"
      >
        لا يظهر الإعلان في الشريط المميز للجميع إلا بعد اعتماده (مقبول). يمكنك قبول الإعلان أولاً ثم التمييز.
      </TooltipContent>
    </Tooltip>
  );
}

export default function AdminAdsPage() {
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();
  const meQuery = useRequireAdmin();
  const { toast } = useToast();

  const params = new URLSearchParams(window.location.search);
  const [status, setStatus] = useState(params.get("status") || "all");
  const [searchInput, setSearchInput] = useState(params.get("q") || "");
  const [search, setSearch] = useState(params.get("q") || "");
  const [featuredFilter, setFeaturedFilter] = useState<"all" | "true" | "false">(() =>
    featuredFilterFromParam(params.get("featured")),
  );
  const [selectedAd, setSelectedAd] = useState<AdminAd | null>(null);
  const [dismissedFocusId, setDismissedFocusId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState(params.get("sort") || "created");
  const focusId = Number(params.get("focusId") || 0);
  const [pendingDelete, setPendingDelete] = useState<AdminAd | null>(null);
  const [featuredConfirm, setFeaturedConfirm] = useState<{
    ad: AdminAd;
    nextFeatured: boolean;
  } | null>(null);

  const adsQuery = useAdminAds({ status, q: search, featured: featuredFilter });
  const dashboardQuery = useAdminDashboard();
  const adsStatusCounts = dashboardQuery.data?.statusCounts?.ads ?? {};
  const visibleAds = useMemo(() => {
    const list = [...(adsQuery.data ?? [])];
    if (sortBy === "views") {
      list.sort((a, b) => b.views - a.views);
    }
    return list;
  }, [adsQuery.data, sortBy]);

  const openAdDetails = (ad: AdminAd) => {
    setDismissedFocusId(null);
    setSelectedAd(ad);
  };

  const closeAdDetails = useCallback(() => {
    setDismissedFocusId(selectedAd?.id ?? focusId ?? null);
    setSelectedAd(null);
  }, [selectedAd?.id, focusId]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (status !== "all") next.set("status", status);
    if (search) next.set("q", search);
    if (sortBy !== "created") next.set("sort", sortBy);
    if (featuredFilter !== "all") next.set("featured", featuredFilter);
    if (selectedAd?.id) next.set("focusId", String(selectedAd.id));
    const qs = next.toString();
    const nextUrl = `/admin/ads${qs ? `?${qs}` : ""}`;
    if (`${location}${window.location.search}` !== nextUrl) {
      navigate(nextUrl, { replace: true });
    }
  }, [status, search, sortBy, featuredFilter, selectedAd, location, navigate]);

  useEffect(() => {
    if (!focusId || !visibleAds.length || focusId === dismissedFocusId) return;
    const target = visibleAds.find((ad) => ad.id === focusId);
    if (target) setSelectedAd(target);
  }, [focusId, visibleAds, dismissedFocusId]);

  useEffect(() => {
    if (!selectedAd) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeAdDetails();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedAd, closeAdDetails]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin", "ads"] });
    await queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    await queryClient.invalidateQueries({ queryKey: getListFeaturedAdsQueryKey() });
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: number; nextStatus: "approved" | "rejected" | "hidden" }) =>
      updateAdminAdStatus(id, nextStatus),
    onSuccess: async (_res, variables) => {
      if (selectedAd?.id === variables.id) {
        setSelectedAd((prev) => (prev ? { ...prev, status: variables.nextStatus } : prev));
      }
      await refresh();
      toast({
        title: "تم تحديث الحالة",
        description: `تم تغيير حالة الإعلان إلى ${statusLabel(variables.nextStatus)}`,
      });
    },
    onError: (error) => {
      toast({
        title: "فشل تحديث الحالة",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAdminAd(id),
    onSuccess: async () => {
      setPendingDelete(null);
      setSelectedAd(null);
      await refresh();
      toast({
        title: "تم حذف الإعلان",
        description: "تم حذف الإعلان من قاعدة البيانات بنجاح",
      });
    },
    onError: (error) => {
      toast({
        title: "فشل حذف الإعلان",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    },
  });

  const featuredMutation = useMutation({
    mutationFn: ({ id, featured }: { id: number; featured: boolean }) =>
      patchAdminAdFeatured(id, featured),
    onSuccess: async (_data, variables) => {
      setFeaturedConfirm(null);
      if (selectedAd?.id === variables.id) {
        setSelectedAd((prev) => (prev ? { ...prev, featured: variables.featured } : prev));
      }
      await queryClient.invalidateQueries({ queryKey: ["admin", "ads"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      await queryClient.invalidateQueries({ queryKey: getListFeaturedAdsQueryKey() });
      toast({
        title: variables.featured ? "تم تمييز الإعلان" : "تمت إزالة التمييز",
        description: variables.featured
          ? "سيظهر في شريط الإعلانات المميزة على الصفحة الرئيسية."
          : "لن يُعرض في الشريط المميز بعد الآن.",
      });
    },
    onError: (error) => {
      toast({
        title: "فشل تحديث التمييز",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    },
  });

  const handleLogout = async () => {
    await adminLogout();
    navigate("/admin-login");
  };

  const actionBusy =
    statusMutation.isPending || deleteMutation.isPending || featuredMutation.isPending;

  const requestDelete = (ad: AdminAd) => {
    setPendingDelete(ad);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteMutation.mutate(pendingDelete.id);
  };

  const confirmFeaturedChange = () => {
    if (!featuredConfirm) return;
    featuredMutation.mutate({
      id: featuredConfirm.ad.id,
      featured: featuredConfirm.nextFeatured,
    });
  };

  if (meQuery.isLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-muted-foreground"
        dir="rtl"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      </div>
    );
  }

  return (
    <AdminShell activeKey="ads" onLogout={handleLogout}>
      <div className="space-y-6" dir="rtl">
        <header
          className={cn(
            "flex flex-col gap-4 rounded-2xl border border-primary/40 bg-zinc-950/75 px-5 py-5 shadow-[0_0_24px_-12px_hsl(var(--primary)/0.2)] ring-1 ring-primary/12 sm:flex-row sm:items-center sm:justify-between",
          )}
        >
          <div className="space-y-1 text-right">
            <h1 className={cn(AUTH_HEADER_TITLE, "text-2xl md:text-[1.65rem]")}>إدارة الإعلانات</h1>
            <p className="text-sm text-muted-foreground">مراجعة الإعلانات وتعديل الحالات مباشرة</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-zinc-900/90 px-3 py-1.5 text-xs text-muted-foreground ring-1 ring-primary/10">
              <Megaphone className="h-3.5 w-3.5 text-primary" aria-hidden />
              {visibleAds.length.toLocaleString("ar-EG")} إعلاناً في القائمة
            </span>
          </div>
        </header>

        <section className={cn(CARD_SHELL, "p-4 sm:p-5")}>
          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {(
              [
                ["pending", "قيد المراجعة", adsStatusCounts.pending],
                ["approved", "مقبول", adsStatusCounts.approved],
                ["rejected", "مرفوض", adsStatusCounts.rejected],
                ["hidden", "مخفي", adsStatusCounts.hidden],
              ] as const
            ).map(([key, label, count]) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatus(key)}
                className={cn(
                  BTN_FIX,
                  "rounded-2xl border p-3 text-right transition-all duration-150 ease-out active:scale-[0.98]",
                  "hover:border-primary/45 hover:shadow-[0_0_18px_-10px_hsl(var(--primary)/0.18)]",
                  status === key
                    ? "border-primary/45 bg-primary/10 shadow-[0_0_18px_-10px_hsl(var(--primary)/0.25)] ring-1 ring-primary/15"
                    : "border-primary/20 bg-zinc-900/50 ring-1 ring-primary/5",
                )}
              >
                <p className="text-xs text-muted-foreground">{label}</p>
                <p
                  className={cn(
                    "mt-1 text-xl font-semibold tabular-nums",
                    key === "pending" && "text-amber-200",
                    key === "approved" && "text-emerald-200",
                    key === "rejected" && "text-orange-200",
                    key === "hidden" && "text-foreground",
                  )}
                >
                  {Number(count ?? 0).toLocaleString("ar-EG")}
                </p>
              </button>
            ))}
          </div>

          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <form
              className="flex w-full flex-col gap-2 sm:max-w-xl sm:flex-row sm:items-center"
              onSubmit={(e) => {
                e.preventDefault();
                setSearch(searchInput.trim());
              }}
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="ابحث بالعنوان، الوصف، المدينة، اسم البائع..."
                  className={cn(inputClass, "pr-10")}
                  aria-label="بحث في الإعلانات"
                />
              </div>
              <Button type="submit" className={BTN_SEARCH}>
                بحث
              </Button>
            </form>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">الحالة:</span>
              {FILTERS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setStatus(item.key)}
                  className={adminPillBtn(status === item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">تمييز:</span>
              {FEATURE_FILTERS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFeaturedFilter(item.key)}
                  className={adminPillBtn(featuredFilter === item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">الترتيب:</span>
              <button type="button" onClick={() => setSortBy("created")} className={adminPillBtn(sortBy === "created")}>
                الأحدث
              </button>
              <button type="button" onClick={() => setSortBy("views")} className={adminPillBtn(sortBy === "views")}>
                الأعلى مشاهدة
              </button>
            </div>
          </div>

          {adsQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-primary/25 bg-zinc-900/40 py-12 text-muted-foreground ring-1 ring-primary/10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              جاري تحميل الإعلانات...
            </div>
          ) : adsQuery.isError ? (
            <div className="rounded-2xl border border-red-500/35 bg-red-950/25 px-4 py-10 text-center text-sm text-red-200 ring-1 ring-red-500/20">
              تعذر تحميل الإعلانات. حاول التحديث مرة أخرى.
            </div>
          ) : visibleAds.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-primary/30 bg-zinc-900/40 py-12 text-center text-sm text-muted-foreground">
              لا يوجد إعلانات مطابقة للفلاتر الحالية.
            </div>
          ) : (
            <div className={SURFACE_TABLE_WRAP}>
              <table className="w-full min-w-[1080px] text-sm">
                <thead className="border-b border-primary/25 bg-zinc-900/50 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3 text-right font-medium">#</th>
                    <th className="px-3 py-3 text-right font-medium">العنوان</th>
                    <th className="px-3 py-3 text-right font-medium">المدينة</th>
                    <th className="px-3 py-3 text-right font-medium">السعر</th>
                    <th className="px-3 py-3 text-right font-medium">الحالة</th>
                    <th className="px-3 py-3 text-right font-medium">تمييز</th>
                    <th className="px-3 py-3 text-right font-medium">المشاهدات</th>
                    <th className="px-3 py-3 text-center font-medium">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleAds.map((ad) => (
                    <tr key={ad.id} className={cn(ADMIN_TABLE_ROW, "last:border-0")}>
                      <td className="px-3 py-3 align-middle tabular-nums text-muted-foreground">{ad.id}</td>
                      <td className="px-3 py-3 align-middle">
                        <p className="line-clamp-1 font-medium text-foreground">{ad.title}</p>
                        <p className="text-xs text-muted-foreground">{ad.categoryName || "بدون تصنيف"}</p>
                      </td>
                      <td className="px-3 py-3 align-middle">{ad.city}</td>
                      <td className="px-3 py-3 align-middle tabular-nums">
                        {ad.price === null ? "غير محدد" : `${ad.price} €`}
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
                            statusBadgeClass(ad.status),
                          )}
                        >
                          {statusLabel(ad.status)}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <FeaturedStripBadge featured={ad.featured} />
                      </td>
                      <td className="px-3 py-3 align-middle tabular-nums text-primary">{ad.views.toLocaleString("ar-EG")}</td>
                      <td className="px-3 py-3 align-middle">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openAdDetails(ad)}
                            className={cn(
                              ADMIN_ROW_ACTION_BASE,
                              "border-primary/40 bg-primary/10 text-primary hover:border-primary/55 hover:bg-primary/18 focus-visible:ring-primary/40",
                            )}
                          >
                            <Eye className="h-3.5 w-3.5" aria-hidden />
                            التفاصيل
                          </button>
                          <button
                            type="button"
                            onClick={() => statusMutation.mutate({ id: ad.id, nextStatus: "approved" })}
                            disabled={actionBusy}
                            className={cn(
                              ADMIN_ROW_ACTION_BASE,
                              "border-emerald-500/45 bg-emerald-600/15 text-emerald-200 hover:bg-emerald-600/25 focus-visible:ring-emerald-500/40",
                            )}
                          >
                            <Check className="h-3.5 w-3.5" aria-hidden />
                            قبول
                          </button>
                          <button
                            type="button"
                            onClick={() => statusMutation.mutate({ id: ad.id, nextStatus: "rejected" })}
                            disabled={actionBusy}
                            className={cn(
                              ADMIN_ROW_ACTION_BASE,
                              "border-orange-500/45 bg-orange-600/12 text-orange-100 hover:bg-orange-600/22 focus-visible:ring-orange-500/35",
                            )}
                          >
                            <XCircle className="h-3.5 w-3.5" aria-hidden />
                            رفض
                          </button>
                          <button
                            type="button"
                            onClick={() => statusMutation.mutate({ id: ad.id, nextStatus: "hidden" })}
                            disabled={actionBusy}
                            className={cn(
                              ADMIN_ROW_ACTION_BASE,
                              "border-zinc-600 bg-zinc-800/90 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800 focus-visible:ring-zinc-500/40",
                            )}
                          >
                            <EyeOff className="h-3.5 w-3.5" aria-hidden />
                            إخفاء
                          </button>
                          <FeaturedToggleButtons
                            ad={ad}
                            disabled={actionBusy}
                            onRequest={(a, next) => setFeaturedConfirm({ ad: a, nextFeatured: next })}
                          />
                          <button
                            type="button"
                            onClick={() => requestDelete(ad)}
                            disabled={actionBusy}
                            className={cn(
                              ADMIN_ROW_ACTION_BASE,
                              "border-red-500/45 bg-red-950/40 text-red-200 hover:border-red-400/55 hover:bg-red-950/60 focus-visible:ring-red-500/40",
                            )}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {selectedAd &&
        createPortal(
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
            onClick={() => closeAdDetails()}
            role="presentation"
          >
            <div
              className={cn(
                CARD_SHELL,
                "max-h-[90vh] w-full max-w-2xl overflow-y-auto p-5 shadow-[0_0_40px_-16px_hsl(var(--primary)/0.45)]",
              )}
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-ad-detail-title"
              dir="rtl"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 id="admin-ad-detail-title" className="text-xl font-semibold text-foreground">
                    تفاصيل الإعلان #{selectedAd.id}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{selectedAd.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => closeAdDetails()}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), BTN_MODAL_GHOST, "shrink-0")}
                >
                  إغلاق
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-muted-foreground">العنوان:</span>{" "}
                  <span className="text-foreground">{selectedAd.title}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">الحالة:</span>{" "}
                  <span
                    className={cn(
                      "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                      statusBadgeClass(selectedAd.status),
                    )}
                  >
                    {statusLabel(selectedAd.status)}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">المدينة:</span>{" "}
                  <span className="text-foreground">{selectedAd.city}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">السعر:</span>{" "}
                  <span className="text-foreground">
                    {selectedAd.price === null ? "غير محدد" : `${selectedAd.price} €`}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">البائع:</span>{" "}
                  <span className="text-foreground">{selectedAd.sellerName}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">الهاتف:</span>{" "}
                  <span className="text-foreground">{selectedAd.sellerPhone}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">التصنيف:</span>{" "}
                  <span className="text-foreground">{selectedAd.categoryName || "بدون تصنيف"}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">المشاهدات:</span>{" "}
                  <span className="tabular-nums text-primary">{selectedAd.views.toLocaleString("ar-EG")}</span>
                </p>
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">تمييز الرئيسية:</span>{" "}
                  <span className="mr-1 inline-flex align-middle">
                    <FeaturedStripBadge featured={selectedAd.featured} />
                  </span>
                  {selectedAd.status !== "approved" ? (
                    <p className="mt-2 text-xs leading-relaxed text-amber-200/90">
                      لن يظهر الإعلان في الشريط المميز للجميع حتى تصبح حالته «مقبول». يمكن تفعيل التمييز من لوحة الإجراءات بعد
                      الاعتماد.
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-primary/25 bg-zinc-900/50 p-4 ring-1 ring-primary/10">
                <p className="mb-2 text-xs font-medium text-muted-foreground">الوصف</p>
                <p className="text-sm leading-relaxed text-foreground">{selectedAd.description}</p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2 border-t border-primary/15 pt-5">
                <FeaturedToggleButtons
                  ad={selectedAd}
                  disabled={actionBusy}
                  onRequest={(a, next) => setFeaturedConfirm({ ad: a, nextFeatured: next })}
                />
                <button
                  type="button"
                  onClick={() => statusMutation.mutate({ id: selectedAd.id, nextStatus: "approved" })}
                  disabled={actionBusy}
                  className={cn(
                    ADMIN_ROW_ACTION_BASE,
                    "border-emerald-500/45 bg-emerald-600/15 text-emerald-200 hover:bg-emerald-600/25",
                  )}
                >
                  <Check className="h-3.5 w-3.5" aria-hidden />
                  قبول
                </button>
                <button
                  type="button"
                  onClick={() => statusMutation.mutate({ id: selectedAd.id, nextStatus: "rejected" })}
                  disabled={actionBusy}
                  className={cn(
                    ADMIN_ROW_ACTION_BASE,
                    "border-orange-500/45 bg-orange-600/12 text-orange-100 hover:bg-orange-600/22",
                  )}
                >
                  <XCircle className="h-3.5 w-3.5" aria-hidden />
                  رفض
                </button>
                <button
                  type="button"
                  onClick={() => statusMutation.mutate({ id: selectedAd.id, nextStatus: "hidden" })}
                  disabled={actionBusy}
                  className={cn(
                    ADMIN_ROW_ACTION_BASE,
                    "border-zinc-600 bg-zinc-800/90 text-zinc-200 hover:bg-zinc-800",
                  )}
                >
                  <EyeOff className="h-3.5 w-3.5" aria-hidden />
                  إخفاء
                </button>
                <button
                  type="button"
                  onClick={() => requestDelete(selectedAd)}
                  disabled={actionBusy}
                  className={cn(
                    ADMIN_ROW_ACTION_BASE,
                    "border-red-500/45 bg-red-950/40 text-red-200 hover:bg-red-950/60",
                  )}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  حذف
                </button>
              </div>

              <div className="mt-5">
                <a
                  href={`/ad/${selectedAd.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants(), BTN_SEARCH, "inline-flex")}
                >
                  عرض صفحة الإعلان
                </a>
              </div>
            </div>
          </div>,
          document.body,
        )}

      <AlertDialog
        open={featuredConfirm !== null}
        onOpenChange={(open) => {
          if (!open) setFeaturedConfirm(null);
        }}
      >
        <AlertDialogContent
          dir="rtl"
          className="z-[60] max-w-md rounded-2xl border border-primary/40 bg-zinc-950 shadow-[0_0_32px_-12px_hsl(var(--primary)/0.35)] ring-1 ring-primary/15 sm:rounded-2xl"
        >
          <AlertDialogHeader className="space-y-2 text-right sm:text-right">
            <AlertDialogTitle className="text-lg font-semibold text-foreground">
              {featuredConfirm?.nextFeatured ? "تأكيد تمييز الإعلان؟" : "تأكيد إزالة التمييز؟"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
              {featuredConfirm?.nextFeatured ? (
                <>
                  سيُعرض الإعلان «{featuredConfirm.ad.title}» في شريط الإعلانات المميزة على الصفحة الرئيسية لأن حالته معتمدة.
                </>
              ) : (
                <>
                  سيُزال الإعلان «{featuredConfirm?.ad.title ?? ""}» من شريط الإعلانات المميزة ولن يظهر هناك بعد الآن.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row-reverse flex-wrap gap-2 sm:flex-row-reverse sm:justify-start sm:gap-2 sm:space-x-0">
            <AlertDialogCancel
              className={cn(buttonVariants({ variant: "outline", size: "default" }), BTN_MODAL_GHOST, "mt-0")}
            >
              إلغاء
            </AlertDialogCancel>
            <button
              type="button"
              disabled={featuredMutation.isPending || !featuredConfirm}
              className={cn(
                buttonVariants({ variant: "default", size: "default" }),
                BTN_FIX,
                "inline-flex cursor-pointer gap-2 rounded-xl border border-primary/35 bg-primary/90 text-primary-foreground transition-all duration-150 ease-out hover:bg-primary hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
              )}
              onClick={() => confirmFeaturedChange()}
            >
              {featuredMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  جاري التحديث...
                </>
              ) : featuredConfirm?.nextFeatured ? (
                <>
                  <Sparkles className="h-4 w-4" aria-hidden />
                  تمييز
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" aria-hidden />
                  إزالة التمييز
                </>
              )}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent
          dir="rtl"
          className="max-w-md rounded-2xl border border-primary/40 bg-zinc-950 shadow-[0_0_32px_-12px_hsl(var(--primary)/0.35)] ring-1 ring-primary/15 sm:rounded-2xl"
        >
          <AlertDialogHeader className="space-y-2 text-right sm:text-right">
            <AlertDialogTitle className="text-lg font-semibold text-foreground">تأكيد حذف الإعلان</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
              {pendingDelete ? (
                <>
                  هل أنت متأكد من حذف الإعلان «{pendingDelete.title}» (#{pendingDelete.id})؟ لا يمكن التراجع عن هذا
                  الإجراء وسيُزال الإعلان نهائياً من المنصة.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row-reverse flex-wrap gap-2 sm:flex-row-reverse sm:justify-start sm:gap-2 sm:space-x-0">
            <AlertDialogCancel
              className={cn(buttonVariants({ variant: "outline", size: "default" }), BTN_MODAL_GHOST, "mt-0")}
            >
              إلغاء
            </AlertDialogCancel>
            <button
              type="button"
              disabled={deleteMutation.isPending || !pendingDelete}
              title={deleteMutation.isPending ? "جاري الحذف…" : undefined}
              className={cn(
                buttonVariants({ variant: "destructive", size: "default" }),
                BTN_FIX,
                "inline-flex cursor-pointer gap-2 rounded-xl transition-all duration-150 ease-out hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
              )}
              onClick={() => confirmDelete()}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  جاري الحذف...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" aria-hidden />
                  حذف
                </>
              )}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import {
  Check,
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
  assignAdminAd,
  claimAdminAd,
  deleteAdminAd,
  patchAdminAdFeatured,
  releaseAdminAd,
  updateAdminAdStatus,
} from "@/features/admin/api";
import { toastAdminAction, parseAdminActionResponse, toastAdminError } from "@/features/admin/admin-action-toast";
import {
  AdminAdsTableRow,
  FeaturedStripBadge,
  FeaturedToggleButtons,
  statusBadgeClass,
  statusLabel,
} from "@/features/admin/components/admin-ads-table-row";
import { ModerationReasonDialog } from "@/features/admin/components/moderation-reason-dialog";
import { AdminScrollableTable } from "@/features/admin/components/admin-scrollable-table";
import { AdminPaginationBar } from "@/features/admin/components/admin-pagination-bar";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminPageLoading,
} from "@/features/admin/components/admin-page-states";
import { StaffAssignDialog } from "@/features/admin/components/staff-assign-dialog";
import { StaffWorkflowPanel } from "@/features/admin/components/staff-workflow-panel";
import {
  ADMIN_ROW_ACTION_BASE,
  BTN_FIX,
  BTN_MODAL_GHOST,
  BTN_SEARCH,
  CARD_SHELL,
  SURFACE_TABLE_WRAP,
  adminPillBtn,
} from "@/features/admin/admin-interaction-classes";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { OperationsQueueTabBar } from "@/features/admin/components/operations-queue-tab-bar";
import { useAdminAccess, useAdminAds, useAdminAdsStats, useRequireAdmin } from "@/features/admin/hooks";
import type { OpsQueueKey } from "@/features/admin/operations-queue-types";
import type { AdminAd } from "@/features/admin/types";
import { useToast } from "@/hooks/use-toast";
import { getLocale, t } from "@/i18n";
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

const AD_STATUS_FILTER_KEYS = ["all", "pending", "approved", "rejected", "hidden"] as const;
const FEATURE_FILTER_KEYS = ["all", "true", "false"] as const;

function localeTag() {
  return getLocale() === "ar" ? "ar-EG" : getLocale() === "de" ? "de-DE" : "en-US";
}

const inputClass =
  "w-full rounded-2xl border border-primary/30 bg-zinc-900/90 px-4 py-2.5 text-sm text-foreground outline-none ring-1 ring-primary/5 transition placeholder:text-muted-foreground focus:border-primary/55 focus:ring-2 focus:ring-primary/25";

function featuredFilterFromParam(raw: string | null): "all" | "true" | "false" {
  if (raw === "true") return "true";
  if (raw === "false") return "false";
  return "all";
}

const ADMIN_AD_STATUS_KEYS = new Set(AD_STATUS_FILTER_KEYS);

function parseAdminAdsSearch(searchString: string) {
  const p = new URLSearchParams(searchString);
  const rawStatus = p.get("status");
  const status =
    rawStatus && ADMIN_AD_STATUS_KEYS.has(rawStatus as (typeof AD_STATUS_FILTER_KEYS)[number])
      ? rawStatus
      : "all";
  return {
    status,
    q: p.get("q") || "",
    sort: p.get("sort") || "created",
    featured: featuredFilterFromParam(p.get("featured")),
  };
}

export default function AdminAdsPage() {
  const [location, navigate] = useLocation();
  const searchString = useSearch();
  const queryClient = useQueryClient();
  const meQuery = useRequireAdmin();
  const access = useAdminAccess();
  const { toast } = useToast();

  const initial = parseAdminAdsSearch(searchString);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [status, setStatus] = useState(initial.status);
  const [queue, setQueue] = useState<OpsQueueKey>("all");
  const adsStatsQuery = useAdminAdsStats(!meQuery.isLoading);
  const [searchInput, setSearchInput] = useState(initial.q);
  const [search, setSearch] = useState(initial.q);
  const [featuredFilter, setFeaturedFilter] = useState<"all" | "true" | "false">(initial.featured);
  const [selectedAd, setSelectedAd] = useState<AdminAd | null>(null);
  const [dismissedFocusId, setDismissedFocusId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState(initial.sort);
  const focusId = Number(new URLSearchParams(searchString).get("focusId") || 0);
  const [pendingDelete, setPendingDelete] = useState<AdminAd | null>(null);
  const [pendingReject, setPendingReject] = useState<AdminAd | null>(null);
  const [featuredConfirm, setFeaturedConfirm] = useState<{
    ad: AdminAd;
    nextFeatured: boolean;
  } | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  const statusFilters = useMemo(
    () =>
      AD_STATUS_FILTER_KEYS.map((key) => ({
        key,
        label: t(`p8.admin.ads.filter_${key}` as "p8.admin.ads.filter_all"),
      })),
    [],
  );

  const featureFilters = useMemo(
    () =>
      FEATURE_FILTER_KEYS.map((key) => ({
        key,
        label:
          key === "all"
            ? t("p8.admin.ads.featured_all")
            : key === "true"
              ? t("p8.admin.ads.featured_true")
              : t("p8.admin.ads.featured_false"),
      })),
    [],
  );

  const adsQuery = useAdminAds({ status, q: search, queue, featured: featuredFilter, page, pageSize });
  const ads = adsQuery.data?.items ?? [];
  const pagination = adsQuery.data?.pagination;
  const visibleAds = useMemo(() => {
    const list = [...ads];
    if (sortBy === "views") {
      list.sort((a, b) => b.views - a.views);
    }
    return list;
  }, [ads, sortBy]);

  useEffect(() => {
    setPage(1);
  }, [status, search, queue, featuredFilter]);

  const openAdDetails = (ad: AdminAd) => {
    setDismissedFocusId(null);
    setSelectedAd(ad);
  };

  const closeAdDetails = useCallback(() => {
    setDismissedFocusId(selectedAd?.id ?? focusId ?? null);
    setSelectedAd(null);
  }, [selectedAd?.id, focusId]);

  /** Keep filters in sync when the query string changes (in-app navigation, back/forward). */
  useEffect(() => {
    const parsed = parseAdminAdsSearch(searchString);
    setStatus(parsed.status);
    setSearchInput(parsed.q);
    setSearch(parsed.q);
    setSortBy(parsed.sort);
    setFeaturedFilter(parsed.featured);
  }, [searchString]);

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
    await queryClient.invalidateQueries({ queryKey: ["admin", "nav-badges"] });
    await queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    await queryClient.invalidateQueries({ queryKey: ["admin", "ads"] });
    await queryClient.invalidateQueries({ queryKey: getListFeaturedAdsQueryKey() });
  };

  const statusMutation = useMutation({
    mutationFn: ({
      id,
      nextStatus,
      reason,
    }: {
      id: number;
      nextStatus: "approved" | "rejected" | "hidden";
      reason?: string;
    }) => updateAdminAdStatus(id, nextStatus, reason),
    onSuccess: async (res, variables) => {
      if (selectedAd?.id === variables.id) {
        setSelectedAd((prev) => (prev ? { ...prev, status: variables.nextStatus } : prev));
      }
      await refresh();
      toastAdminAction(toast, parseAdminActionResponse(res as Record<string, unknown>), t("p8.admin.ads.toast_status_updated"));
    },
    onError: (error) => {
      toast({
        title: t("p8.admin.ads.toast_status_failed"),
        description: error instanceof Error ? error.message : t("p8.admin.ads.unexpected_error"),
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
        title: t("p8.admin.ads.toast_deleted"),
        description: t("p8.admin.ads.toast_deleted_desc"),
      });
    },
    onError: (error) => {
      toast({
        title: t("p8.admin.ads.toast_delete_failed"),
        description: error instanceof Error ? error.message : t("p8.admin.ads.unexpected_error"),
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
      await queryClient.invalidateQueries({ queryKey: ["admin", "nav-badges"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "ads"] });
      await queryClient.invalidateQueries({ queryKey: getListFeaturedAdsQueryKey() });
      toast({
        title: variables.featured ? t("p8.admin.ads.toast_featured_on") : t("p8.admin.ads.toast_featured_off"),
        description: variables.featured
          ? t("p8.admin.ads.toast_featured_on_desc")
          : t("p8.admin.ads.toast_featured_off_desc"),
      });
    },
    onError: (error) => {
      toast({
        title: t("p8.admin.ads.toast_featured_failed"),
        description: error instanceof Error ? error.message : t("p8.admin.ads.connection_error"),
        variant: "destructive",
      });
    },
  });

  const workflowMutation = useMutation({
    mutationFn: async (action: { type: "claim" | "release"; id: number }) => {
      if (action.type === "claim") return claimAdminAd(action.id);
      return releaseAdminAd(action.id);
    },
    onSuccess: async (res, action) => {
      await refresh();
      if (selectedAd?.id === action.id && res.assignment) {
        setSelectedAd((prev) => (prev ? { ...prev, assignment: res.assignment } : prev));
      }
      toastAdminAction(toast, res, action.type === "claim" ? t("p8.admin.ads.toast_claim") : t("p8.admin.ads.toast_release"));
    },
    onError: (error) => toastAdminError(toast, error),
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, staffId }: { id: number; staffId: number }) => assignAdminAd(id, staffId),
    onSuccess: async (res, variables) => {
      setAssignOpen(false);
      await refresh();
      if (selectedAd?.id === variables.id && res.assignment) {
        setSelectedAd((prev) => (prev ? { ...prev, assignment: res.assignment } : prev));
      }
      toastAdminAction(toast, res, t("p8.admin.ads.toast_assign"));
    },
    onError: (error) => toastAdminError(toast, error),
  });

  const handleLogout = async () => {
    await adminLogout();
    navigate("/admin-login");
  };

  const actionBusy =
    statusMutation.isPending ||
    deleteMutation.isPending ||
    featuredMutation.isPending ||
    assignMutation.isPending;

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
            <h1 className={cn(AUTH_HEADER_TITLE, "text-2xl md:text-[1.65rem]")}>{t("p8.admin.ads.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("p8.admin.ads.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-zinc-900/90 px-3 py-1.5 text-xs text-muted-foreground ring-1 ring-primary/10">
              <Megaphone className="h-3.5 w-3.5 text-primary" aria-hidden />
              {t("p8.admin.ads.list_count", {
                count: (pagination?.totalItems ?? visibleAds.length).toLocaleString(localeTag()),
              })}
            </span>
          </div>
        </header>

        <OperationsQueueTabBar queue={queue} counts={adsStatsQuery.data ?? undefined} onChange={setQueue} />

        <section className={cn(CARD_SHELL, "p-4 sm:p-5")}>
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
                  placeholder={t("p8.admin.ads.search_placeholder")}
                  className={cn(inputClass, "pr-10")}
                  aria-label={t("p8.admin.ads.search_aria")}
                />
              </div>
              <Button type="submit" className={BTN_SEARCH}>
                {t("p8.admin.common.search")}
              </Button>
            </form>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">{t("p8.admin.ads.label_status")}</span>
              {statusFilters.map((item) => (
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
              <span className="text-xs text-muted-foreground">{t("p8.admin.ads.label_featured")}</span>
              {featureFilters.map((item) => (
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
              <span className="text-xs text-muted-foreground">{t("p8.admin.ads.label_sort")}</span>
              <button type="button" onClick={() => setSortBy("created")} className={adminPillBtn(sortBy === "created")}>
                {t("p8.admin.ads.sort_newest")}
              </button>
              <button type="button" onClick={() => setSortBy("views")} className={adminPillBtn(sortBy === "views")}>
                {t("p8.admin.ads.sort_views")}
              </button>
            </div>
          </div>

          {adsQuery.isLoading ? (
            <AdminPageLoading message={t("p8.admin.ads.loading")} />
          ) : adsQuery.isError ? (
            <AdminErrorState
              title={t("p8.admin.ads.load_error")}
              description={t("p8.admin.ads.load_error_hint")}
              onRetry={() => adsQuery.refetch()}
            />
          ) : visibleAds.length === 0 ? (
            <AdminEmptyState
              title={t("p8.admin.ads.empty_title")}
              description={t("p8.admin.ads.empty_body")}
              nextStep={t("p8.admin.ads.empty_next")}
            />
          ) : (
            <AdminScrollableTable
              items={visibleAds}
              minWidth="min-w-[1080px]"
              head={
                <tr>
                  <th className="px-3 py-3 text-right font-medium">{t("p8.admin.ads.col_id")}</th>
                  <th className="px-3 py-3 text-right font-medium">{t("p8.admin.ads.col_title")}</th>
                  <th className="px-3 py-3 text-right font-medium">{t("p8.admin.ads.col_city")}</th>
                  <th className="px-3 py-3 text-right font-medium">{t("p8.admin.ads.col_price")}</th>
                  <th className="px-3 py-3 text-right font-medium">{t("p8.admin.ads.col_status")}</th>
                  <th className="px-3 py-3 text-right font-medium">{t("p8.admin.ads.col_sla")}</th>
                  <th className="px-3 py-3 text-right font-medium">{t("p8.admin.ads.col_featured")}</th>
                  <th className="px-3 py-3 text-right font-medium">{t("p8.admin.ads.col_views")}</th>
                  <th className="px-3 py-3 text-center font-medium">{t("p8.admin.ads.col_actions")}</th>
                </tr>
              }
              getRowKey={(ad) => ad.id}
              renderRow={(ad) => (
                <AdminAdsTableRow
                  ad={ad}
                  actionBusy={actionBusy}
                  onOpenDetails={openAdDetails}
                  onApprove={(id) => statusMutation.mutate({ id, nextStatus: "approved" })}
                  onReject={setPendingReject}
                  onHide={(id) => statusMutation.mutate({ id, nextStatus: "hidden" })}
                  onFeaturedRequest={(a, next) => setFeaturedConfirm({ ad: a, nextFeatured: next })}
                  onDelete={requestDelete}
                />
              )}
            />
          )}

          <AdminPaginationBar
            pagination={pagination}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
            isLoading={adsQuery.isFetching}
          />
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
                    {t("p8.admin.ads.detail_title", { id: selectedAd.id })}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{selectedAd.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => closeAdDetails()}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), BTN_MODAL_GHOST, "shrink-0")}
                >
                  {t("p8.admin.common.close")}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-muted-foreground">{t("p8.admin.ads.field_title")}</span>{" "}
                  <span className="text-foreground">{selectedAd.title}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">{t("p8.admin.ads.field_status")}</span>{" "}
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
                  <span className="text-muted-foreground">{t("p8.admin.ads.field_city")}</span>{" "}
                  <span className="text-foreground">{selectedAd.city}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">{t("p8.admin.ads.field_price")}</span>{" "}
                  <span className="text-foreground">
                    {selectedAd.price === null ? t("p8.admin.common.price_unset") : `${selectedAd.price} €`}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">{t("p8.admin.ads.field_seller")}</span>{" "}
                  <span className="text-foreground">{selectedAd.sellerName}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">{t("p8.admin.ads.field_phone")}</span>{" "}
                  <span className="text-foreground">{selectedAd.sellerPhone}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">{t("p8.admin.ads.field_category")}</span>{" "}
                  <span className="text-foreground">{selectedAd.categoryName || t("p8.admin.common.no_category")}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">{t("p8.admin.ads.field_views")}</span>{" "}
                  <span className="tabular-nums text-primary">{selectedAd.views.toLocaleString(localeTag())}</span>
                </p>
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">{t("p8.admin.ads.field_featured_home")}</span>{" "}
                  <span className="mr-1 inline-flex align-middle">
                    <FeaturedStripBadge featured={selectedAd.featured} />
                  </span>
                  {selectedAd.status !== "approved" ? (
                    <p className="mt-2 text-xs leading-relaxed text-amber-200/90">{t("p8.admin.ads.featured_tooltip")}</p>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-primary/25 bg-zinc-900/50 p-4 ring-1 ring-primary/10">
                <p className="mb-2 text-xs font-medium text-muted-foreground">{t("p8.admin.ads.field_description")}</p>
                <p className="text-sm leading-relaxed text-foreground">{selectedAd.description}</p>
              </div>

              <div className="mt-4">
                <StaffWorkflowPanel
                  assignment={selectedAd.assignment}
                  busy={workflowMutation.isPending || assignMutation.isPending}
                  canAssign={access.isFounder}
                  onAssign={() => setAssignOpen(true)}
                  onClaim={() => workflowMutation.mutate({ type: "claim", id: selectedAd.id })}
                  onRelease={() => workflowMutation.mutate({ type: "release", id: selectedAd.id })}
                />
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
                  {t("p8.admin.ads.approve")}
                </button>
                <button
                  type="button"
                  onClick={() => setPendingReject(selectedAd)}
                  disabled={actionBusy}
                  className={cn(
                    ADMIN_ROW_ACTION_BASE,
                    "border-orange-500/45 bg-orange-600/12 text-orange-100 hover:bg-orange-600/22",
                  )}
                >
                  <XCircle className="h-3.5 w-3.5" aria-hidden />
                  {t("p8.admin.ads.reject")}
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
                  {t("p8.admin.ads.hide")}
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
                  {t("p8.admin.ads.delete")}
                </button>
              </div>

              <div className="mt-5">
                <a
                  href={`/ad/${selectedAd.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants(), BTN_SEARCH, "inline-flex")}
                >
                  {t("p8.admin.ads.view_ad_page")}
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
              {featuredConfirm?.nextFeatured
                ? t("p8.admin.ads.featured_confirm_add_title")
                : t("p8.admin.ads.featured_confirm_remove_title")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
              {featuredConfirm?.nextFeatured
                ? t("p8.admin.ads.featured_confirm_add_body", { title: featuredConfirm.ad.title })
                : t("p8.admin.ads.featured_confirm_remove_body", {
                    title: featuredConfirm?.ad.title ?? "",
                  })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row-reverse flex-wrap gap-2 sm:flex-row-reverse sm:justify-start sm:gap-2 sm:space-x-0">
            <AlertDialogCancel
              className={cn(buttonVariants({ variant: "outline", size: "default" }), BTN_MODAL_GHOST, "mt-0")}
            >
              {t("p8.admin.common.cancel")}
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
                  {t("p8.admin.ads.updating")}
                </>
              ) : featuredConfirm?.nextFeatured ? (
                <>
                  <Sparkles className="h-4 w-4" aria-hidden />
                  {t("p8.admin.common.feature")}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" aria-hidden />
                  {t("p8.admin.common.remove_featured")}
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
            <AlertDialogTitle className="text-lg font-semibold text-foreground">{t("p8.admin.ads.delete_confirm_title")}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
              {pendingDelete
                ? t("p8.admin.ads.delete_confirm_body", { title: pendingDelete.title, id: pendingDelete.id })
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row-reverse flex-wrap gap-2 sm:flex-row-reverse sm:justify-start sm:gap-2 sm:space-x-0">
            <AlertDialogCancel
              className={cn(buttonVariants({ variant: "outline", size: "default" }), BTN_MODAL_GHOST, "mt-0")}
            >
              {t("p8.admin.common.cancel")}
            </AlertDialogCancel>
            <button
              type="button"
              disabled={deleteMutation.isPending || !pendingDelete}
              title={deleteMutation.isPending ? t("p8.admin.ads.deleting") : undefined}
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
                  {t("p8.admin.ads.deleting")}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" aria-hidden />
                  {t("p8.admin.ads.delete")}
                </>
              )}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <StaffAssignDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        title={t("p8.admin.ads.assign_title")}
        description={t("p8.admin.ads.assign_description")}
        currentAssignee={selectedAd?.assignment?.staffName}
        busy={assignMutation.isPending}
        onConfirm={(staffActorId) => {
          if (!selectedAd) return;
          assignMutation.mutate({ id: selectedAd.id, staffId: staffActorId });
        }}
      />

      <ModerationReasonDialog
        open={pendingReject !== null}
        onOpenChange={(open) => {
          if (!open) setPendingReject(null);
        }}
        title={t("p8.admin.ads.reject_reason_title")}
        description={t("p8.admin.moderation.reason_hint")}
        confirmLabel={t("p8.admin.ads.reject_confirm_label")}
        onConfirm={(reason) => {
          if (!pendingReject) return;
          statusMutation.mutate(
            { id: pendingReject.id, nextStatus: "rejected", reason },
            { onSettled: () => setPendingReject(null) },
          );
        }}
      />
    </AdminShell>
  );
}

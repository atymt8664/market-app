import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  Eye,
  Flag,
  Loader2,
  Megaphone,
  MessageSquare,
  Trash2,
  User,
} from "lucide-react";
import { adminLogout, assignAdminReport, claimAdminReport, moderateReportedAd, releaseAdminReport, updateAdminReportStatus } from "@/features/admin/api";
import { toastAdminAction, toastAdminError } from "@/features/admin/admin-action-toast";
import { ModerationReasonDialog } from "@/features/admin/components/moderation-reason-dialog";
import { SlaStatusBadge } from "@/features/admin/components/sla-status-badge";
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
  ADMIN_TABLE_ROW,
  BTN_SEARCH,
  CARD_SHELL,
  SURFACE_TABLE_WRAP,
  adminPillBtn,
} from "@/features/admin/admin-interaction-classes";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { useAdminAccess, useAdminReports, useAdminReportsStats, useRequireAdmin } from "@/features/admin/hooks";
import type { AdminPaginatedResult } from "@/features/admin/api";
import type { AdminReport } from "@/features/admin/types";
import { useToast } from "@/hooks/use-toast";
import { getLocale, t } from "@/i18n";
import { useAdminLocale } from "@/features/admin/hooks/use-admin-locale";
import { apiUrl } from "@/lib/api-url";
import { AUTH_HEADER_TITLE } from "@/lib/auth-page-styles";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";

import { OperationsQueueTabBar } from "@/features/admin/components/operations-queue-tab-bar";
import type { OpsQueueKey } from "@/features/admin/operations-queue-types";

const REPORT_STATUS_FILTER_KEYS = ["all", "open", "under_review", "resolved", "rejected"] as const;

function localeTag() {
  return getLocale() === "ar" ? "ar-EG" : getLocale() === "de" ? "de-DE" : "en-US";
}

function mediaSrc(url: string | null | undefined): string | undefined {
  if (!url?.trim()) return undefined;
  const u = url.trim();
  if (/^https?:\/\//i.test(u)) return u;
  return apiUrl(u.startsWith("/") ? u : `/${u}`);
}

function initials(name: string | null | undefined) {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]).join("").slice(0, 2);
}

function normalizeReportStatusKey(status: string): string {
  if (status === "pending") return "open";
  if (status === "in_review") return "under_review";
  if (status === "ignored") return "rejected";
  return status;
}

function statusLabel(status: string) {
  const key = normalizeReportStatusKey(status);
  if (key === "open") return t("p8.admin.reports.status_open");
  if (key === "under_review") return t("p8.admin.reports.status_under_review");
  if (key === "resolved") return t("p8.admin.reports.status_resolved");
  if (key === "rejected") return t("p8.admin.reports.status_rejected");
  return status;
}

function statusBadgeClass(status: string) {
  const key = normalizeReportStatusKey(status);
  if (key === "open") return "border-amber-500/45 bg-amber-500/15 text-amber-200";
  if (key === "under_review") return "border-primary/45 bg-primary/15 text-primary";
  if (key === "resolved") return "border-emerald-500/45 bg-emerald-500/15 text-emerald-200";
  if (key === "rejected") return "border-zinc-600 bg-zinc-800/80 text-zinc-300";
  return "border-zinc-600 bg-zinc-900/70 text-zinc-300";
}

function formatReportDate(iso: string | null) {
  if (!iso) return t("p8.admin.common.dash");
  try {
    return new Date(iso).toLocaleString(localeTag(), {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function ReportSubjectCell({ report }: { report: AdminReport }) {
  if (report.targetType === "ad" && report.targetAdId) {
    const title =
      report.targetAdTitle?.trim() ||
      t("p8.admin.reports.subject_ad_fallback", { id: report.targetAdId });
    const seller =
      report.targetAdOwnerName?.trim() ||
      report.targetAdSellerName?.trim() ||
      null;
    return (
      <div className="flex items-center gap-2">
        <Avatar className="h-9 w-9 shrink-0 border border-primary/25 ring-1 ring-primary/10">
          <AvatarImage src={mediaSrc(report.targetAdOwnerAvatarUrl)} alt="" className="object-cover" />
          <AvatarFallback className="bg-zinc-800 text-[10px] font-semibold text-primary">
            {initials(seller || title)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 text-right">
          <p className="line-clamp-1 font-medium text-foreground">{title}</p>
          <p className="text-[11px] text-muted-foreground">
            {seller
              ? t("p8.admin.reports.subject_seller", { name: seller })
              : t("p8.admin.reports.subject_ad_fallback", { id: report.targetAdId })}
          </p>
        </div>
      </div>
    );
  }
  if (report.targetType === "user" && report.targetUserId) {
    const name = report.targetProfileName?.trim() || `#${report.targetUserId}`;
    return (
      <div className="flex items-center gap-2">
        <Avatar className="h-9 w-9 shrink-0 border border-primary/25 ring-1 ring-primary/10">
          <AvatarImage src={mediaSrc(report.targetProfileAvatarUrl)} alt="" className="object-cover" />
          <AvatarFallback className="bg-zinc-800 text-[10px] font-semibold text-primary">
            {initials(report.targetProfileName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 text-right">
          <p className="line-clamp-1 font-medium text-foreground">{name}</p>
          <p className="text-[11px] text-muted-foreground">{t("p8.admin.reports.subject_user_report")}</p>
        </div>
      </div>
    );
  }
  if (report.targetType === "conversation" && report.relatedConversationId) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <MessageSquare className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <span className="text-sm">
          {t("p8.admin.reports.subject_conversation", { id: report.relatedConversationId })}
        </span>
      </div>
    );
  }
  return <span className="text-muted-foreground">{t("p8.admin.common.dash")}</span>;
}

function ReporterCell({ report }: { report: AdminReport }) {
  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-9 w-9 shrink-0 border border-primary/25 ring-1 ring-primary/10">
        <AvatarImage src={mediaSrc(report.reporterAvatarUrl)} alt="" className="object-cover" />
        <AvatarFallback className="bg-zinc-800 text-[10px] font-semibold text-primary">
          {initials(report.reporterName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 text-right">
        <p className="line-clamp-1 font-medium text-foreground">
          {report.reporterName?.trim() || t("p8.admin.common.dash")}
        </p>
        <p className="text-[11px] text-muted-foreground">{report.reporterEmail || t("p8.admin.common.dash")}</p>
      </div>
    </div>
  );
}

export default function AdminReportsPage() {
  const { dir, formatNumber, formatDateTime } = useAdminLocale();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const meQuery = useRequireAdmin();
  const access = useAdminAccess();
  const params = new URLSearchParams(window.location.search);
  const initialQueue = (params.get("queue") || "all") as OpsQueueKey;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [queue, setQueue] = useState<OpsQueueKey>(initialQueue);
  const reportsQuery = useAdminReports({ queue, page, pageSize });
  const reportsStatsQuery = useAdminReportsStats(!meQuery.isLoading);
  const { toast } = useToast();
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const initialRaw = params.get("status") || "all";
  const initialStatus =
    initialRaw === "pending" ? "open" : initialRaw === "in_review" ? "under_review" : initialRaw;
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [reasonDialog, setReasonDialog] = useState<
    | null
    | { kind: "status"; id: number; status: "resolved" | "rejected" }
    | { kind: "ad"; id: number; action: "hide" | "delete" }
  >(null);

  const statusFilters = useMemo(
    () =>
      REPORT_STATUS_FILTER_KEYS.map((key) => ({
        key,
        label: t(`p8.admin.reports.filter_${key}` as "p8.admin.reports.filter_all"),
      })),
    [],
  );

  const workflowMutation = useMutation({
    mutationFn: async (action: { type: "claim" | "release"; id: number }) => {
      if (action.type === "claim") return claimAdminReport(action.id);
      return releaseAdminReport(action.id);
    },
    onSuccess: async (_res, action) => {
      await refresh();
      toastAdminAction(
        toast,
        _res,
        action.type === "claim" ? t("p8.admin.reports.toast_claim") : t("p8.admin.reports.toast_release"),
      );
    },
    onError: (error) => toastAdminError(toast, error),
  });

  const closeReportModal = useCallback(() => {
    const next = new URLSearchParams(window.location.search);
    next.delete("reportId");
    const qs = next.toString();
    navigate(`/admin/reports${qs ? `?${qs}` : ""}`, { replace: true });
    setSelectedReport(null);
  }, [navigate]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin", "nav-badges"] });
    await queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    await queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
    await queryClient.invalidateQueries({ queryKey: ["admin", "ads"] });
  };

  useEffect(() => {
    setPage(1);
  }, [queue]);

  const assignMutation = useMutation({
    mutationFn: ({ id, staffId }: { id: number; staffId: number }) => assignAdminReport(id, staffId),
    onSuccess: async (res, variables) => {
      setAssignOpen(false);
      await refresh();
      if (selectedReport?.id === variables.id && res.assignment) {
        setSelectedReport((prev) => (prev ? { ...prev, assignment: res.assignment } : prev));
      }
      toastAdminAction(toast, res, t("p8.admin.reports.toast_assign"));
    },
    onError: (error) => toastAdminError(toast, error),
  });

  const statusMutation = useMutation({
    mutationFn: ({
      id,
      status,
      reason,
    }: {
      id: number;
      status: "open" | "under_review" | "resolved" | "rejected";
      reason?: string;
    }) => updateAdminReportStatus(id, status, reason),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["admin", "reports"] });
      const previous = queryClient.getQueryData<AdminPaginatedResult<AdminReport>>([
        "admin",
        "reports",
        queue,
        page,
        pageSize,
      ]);
      queryClient.setQueryData<AdminPaginatedResult<AdminReport>>(
        ["admin", "reports", queue, page, pageSize],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((item) =>
              item.id === variables.id ? { ...item, status: variables.status } : item,
            ),
          };
        },
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["admin", "reports", queue, page, pageSize], context.previous);
      }
      toast({
        title: t("p8.admin.reports.toast_status_failed"),
        description: error instanceof Error ? error.message : t("p8.admin.common.error_generic"),
        variant: "destructive",
      });
    },
    onSuccess: async (_, variables) => {
      setSelectedReport((prev) =>
        prev && prev.id === variables.id ? { ...prev, status: variables.status } : prev,
      );
      await refresh();
      toast({
        title: t("p8.admin.reports.toast_status_updated"),
        description: t("p8.admin.reports.toast_status_updated_desc", { status: statusLabel(variables.status) }),
      });
    },
  });

  const adActionMutation = useMutation({
    mutationFn: ({ id, action, reason }: { id: number; action: "hide" | "delete"; reason: string }) =>
      moderateReportedAd(id, action, reason),
    onSuccess: async (_, variables) => {
      setReasonDialog(null);
      await refresh();
      toast({
        title: t("p8.admin.reports.toast_action_done"),
        description:
          variables.action === "hide"
            ? t("p8.admin.reports.toast_action_hide")
            : t("p8.admin.reports.toast_action_delete"),
      });
    },
    onError: (error) => {
      toast({
        title: t("p8.admin.reports.toast_action_failed"),
        description: error instanceof Error ? error.message : t("p8.admin.common.error_generic"),
        variant: "destructive",
      });
    },
  });

  const handleLogout = async () => {
    await adminLogout();
    navigate("/admin-login");
  };

  const reports = reportsQuery.data?.items ?? [];
  const pagination = reportsQuery.data?.pagination;
  const actionPending = statusMutation.isPending || adActionMutation.isPending || assignMutation.isPending;
  const visibleReports = useMemo(() => {
    if (statusFilter === "all") return reports;
    if (statusFilter === "rejected") {
      return reports.filter(
        (r) => normalizeReportStatusKey(r.status) === "rejected",
      );
    }
    return reports.filter((r) => normalizeReportStatusKey(r.status) === statusFilter);
  }, [reports, statusFilter]);

  /** مزامنة الحالة مع الشريط دون حذف reportId من الرابط العميق قبل تحميل القائمة */
  useLayoutEffect(() => {
    const cur = new URLSearchParams(window.location.search);
    const next = new URLSearchParams();
    if (statusFilter !== "all") next.set("status", statusFilter);

    if (selectedReport?.id) {
      next.set("reportId", String(selectedReport.id));
    } else if (cur.get("reportId")) {
      next.set("reportId", cur.get("reportId")!);
    }

    const qs = next.toString();
    const nextPath = `/admin/reports${qs ? `?${qs}` : ""}`;
    const currentPath = `${window.location.pathname}${window.location.search}`;
    if (currentPath !== nextPath) {
      navigate(nextPath, { replace: true });
    }
  }, [statusFilter, selectedReport, navigate]);

  /** فتح بلاغ من ?reportId= بعد توفر البيانات، ودمج الصف المحدث بعد إعادة الجلب */
  useEffect(() => {
    const reportId = Number(new URLSearchParams(window.location.search).get("reportId") || 0);
    if (!reportId || !reports.length) return;
    const target = reports.find((r) => r.id === reportId);
    if (!target) return;
    setSelectedReport((prev) => {
      if (prev?.id === reportId) return { ...prev, ...target };
      return target;
    });
  }, [reports]);

  useEffect(() => {
    if (!selectedReport) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeReportModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedReport, closeReportModal]);


  if (meQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      </div>
    );
  }

  return (
    <AdminShell activeKey="reports" onLogout={handleLogout}>
      <div className="space-y-6">
        <header
          className={cn(
            "flex flex-col gap-4 rounded-2xl border border-primary/40 bg-zinc-950/75 px-5 py-5 shadow-[0_0_24px_-12px_hsl(var(--primary)/0.2)] ring-1 ring-primary/12 sm:flex-row sm:items-center sm:justify-between",
          )}
        >
          <div className="space-y-1 text-right">
            <h1 className={cn(AUTH_HEADER_TITLE, "text-2xl md:text-[1.65rem]")}>{t("p8.admin.reports.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("p8.admin.reports.subtitle")}</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-zinc-900/90 px-3 py-1.5 text-xs text-muted-foreground ring-1 ring-primary/10">
            <Flag className="h-3.5 w-3.5 text-primary" aria-hidden />
            {t("p8.admin.reports.list_count", {
              count: (pagination?.totalItems ?? visibleReports.length).toLocaleString(localeTag()),
            })}
          </span>
        </header>

        <OperationsQueueTabBar
          queue={queue}
          counts={reportsStatsQuery.data ?? undefined}
          onChange={setQueue}
        />

        <section className={cn(CARD_SHELL, "p-4 sm:p-5")}>
          <div className="mb-5 flex flex-wrap gap-2">
            {statusFilters.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setStatusFilter(item.key)}
                className={adminPillBtn(statusFilter === item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {reportsQuery.isLoading ? (
            <AdminPageLoading message={t("p8.admin.reports.loading")} />
          ) : reportsQuery.isError ? (
            <AdminErrorState
              title={t("p8.admin.reports.load_error")}
              description={t("p8.admin.reports.load_error_hint")}
              onRetry={() => reportsQuery.refetch()}
            />
          ) : visibleReports.length === 0 ? (
            <AdminEmptyState title={t("p8.admin.reports.empty_title")} description={t("p8.admin.reports.empty_body")} />
          ) : (
            <AdminScrollableTable
              items={visibleReports}
              minWidth="min-w-[1080px]"
              head={
                  <tr>
                    <th className="px-3 py-3 text-right font-medium">{t("p8.admin.reports.col_id")}</th>
                    <th className="px-3 py-3 text-right font-medium">{t("p8.admin.reports.col_reporter")}</th>
                    <th className="px-3 py-3 text-right font-medium">{t("p8.admin.reports.col_subject")}</th>
                    <th className="px-3 py-3 text-right font-medium">{t("p8.admin.reports.col_reason")}</th>
                    <th className="px-3 py-3 text-right font-medium">{t("p8.admin.reports.col_status")}</th>
                    <th className="px-3 py-3 text-right font-medium">{t("p8.admin.reports.col_sla")}</th>
                    <th className="px-3 py-3 text-right font-medium">{t("p8.admin.reports.col_date")}</th>
                    <th className="px-3 py-3 text-center font-medium">{t("p8.admin.reports.col_actions")}</th>
                  </tr>
              }
              getRowKey={(report) => report.id}
              renderRow={(report) => (
                    <tr
                      key={report.id}
                      className={cn("cursor-pointer last:border-0", ADMIN_TABLE_ROW)}
                      onClick={() => setSelectedReport(report)}
                    >
                      <td className="px-3 py-3 align-middle tabular-nums text-muted-foreground">{report.id}</td>
                      <td className="px-3 py-3 align-middle">
                        <ReporterCell report={report} />
                      </td>
                      <td className="max-w-[220px] px-3 py-3 align-middle">
                        <ReportSubjectCell report={report} />
                      </td>
                      <td className="max-w-[200px] px-3 py-3 align-middle">
                        <p className="line-clamp-2 font-medium text-foreground">{report.reason}</p>
                        {report.description?.trim() ? (
                          <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{report.description}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
                            statusBadgeClass(report.status),
                          )}
                        >
                          {statusLabel(report.status)}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        {report.slaState ? (
                          <SlaStatusBadge state={report.slaState} minutesRemaining={report.slaMinutesRemaining} />
                        ) : (
                          <span className="text-xs text-muted-foreground">{t("p8.admin.common.dash")}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 align-middle text-[13px] text-muted-foreground whitespace-nowrap">
                        {formatReportDate(report.createdAt)}
                      </td>
                      <td className="px-3 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedReport(report)}
                            className={cn(
                              ADMIN_ROW_ACTION_BASE,
                              "border-primary/40 bg-primary/10 text-primary hover:border-primary/55 hover:bg-primary/18 focus-visible:ring-primary/40",
                            )}
                          >
                            <Eye className="h-3.5 w-3.5" aria-hidden />
                            {t("p8.admin.common.details")}
                          </button>
                          <button
                            type="button"
                            onClick={() => statusMutation.mutate({ id: report.id, status: "under_review" })}
                            disabled={actionPending}
                            className={cn(
                              ADMIN_ROW_ACTION_BASE,
                              "border-primary/35 bg-primary/8 text-primary hover:bg-primary/15",
                            )}
                          >
                            {t("p8.admin.reports.action_review_short")}
                          </button>
                          <button
                            type="button"
                            onClick={() => statusMutation.mutate({ id: report.id, status: "resolved" })}
                            disabled={actionPending}
                            className={cn(
                              ADMIN_ROW_ACTION_BASE,
                              "border-emerald-500/45 bg-emerald-600/15 text-emerald-200 hover:bg-emerald-600/25",
                            )}
                          >
                            {t("p8.admin.reports.action_resolve_short")}
                          </button>
                          <button
                            type="button"
                            onClick={() => statusMutation.mutate({ id: report.id, status: "rejected" })}
                            disabled={actionPending}
                            className={cn(
                              ADMIN_ROW_ACTION_BASE,
                              "border-amber-500/45 bg-amber-600/12 text-amber-100 hover:bg-amber-600/22",
                            )}
                          >
                            {t("p8.admin.reports.ignore")}
                          </button>
                        </div>
                      </td>
                    </tr>
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
            isLoading={reportsQuery.isFetching}
          />
        </section>
      </div>

      {selectedReport &&
        createPortal(
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
            onClick={() => closeReportModal()}
            role="presentation"
          >
            <div
              className={cn(CARD_SHELL, "max-h-[92vh] w-full max-w-2xl overflow-y-auto p-5 shadow-[0_0_40px_-16px_hsl(var(--primary)/0.45)]")}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-report-detail-title"
             
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 id="admin-report-detail-title" className="text-xl font-semibold text-foreground">
                    {t("p8.admin.reports.detail_title", { id: selectedReport.id })}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatReportDate(selectedReport.createdAt)} ·{" "}
                    <span className="tabular-nums">#{selectedReport.id}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => closeReportModal()}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0 rounded-2xl border-primary/35")}
                >
                  {t("p8.admin.common.close")}
                </button>
              </div>

              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className={cn(CARD_SHELL, "p-4")}>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">{t("p8.admin.reports.detail_reporter")}</p>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border border-primary/30 ring-1 ring-primary/10">
                      <AvatarImage src={mediaSrc(selectedReport.reporterAvatarUrl)} alt="" className="object-cover" />
                      <AvatarFallback className="bg-zinc-800 text-sm font-semibold text-primary">
                        {initials(selectedReport.reporterName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{selectedReport.reporterName || t("p8.admin.common.dash")}</p>
                      <p className="break-all text-xs text-muted-foreground">{selectedReport.reporterEmail || t("p8.admin.common.dash")}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {t("p8.admin.reports.detail_id_label", { id: selectedReport.reporterId })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={cn(CARD_SHELL, "p-4")}>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">{t("p8.admin.reports.detail_target")}</p>
                  {selectedReport.targetType === "ad" && selectedReport.targetAdId ? (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border border-primary/30 ring-1 ring-primary/10">
                        <AvatarImage src={mediaSrc(selectedReport.targetAdOwnerAvatarUrl)} alt="" className="object-cover" />
                        <AvatarFallback className="bg-zinc-800 text-sm font-semibold text-primary">
                          {initials(
                            selectedReport.targetAdOwnerName ||
                              selectedReport.targetAdSellerName ||
                              selectedReport.targetAdTitle,
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">
                          {selectedReport.targetAdTitle?.trim() ||
                            t("p8.admin.reports.subject_ad_fallback", { id: selectedReport.targetAdId })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(selectedReport.targetAdOwnerName || selectedReport.targetAdSellerName)?.trim()
                            ? t("p8.admin.reports.subject_seller", {
                                name: (selectedReport.targetAdOwnerName || selectedReport.targetAdSellerName)?.trim() ?? "",
                              })
                            : t("p8.admin.reports.subject_ad_fallback", { id: selectedReport.targetAdId })}
                        </p>
                      </div>
                    </div>
                  ) : selectedReport.targetType === "user" && selectedReport.targetUserId ? (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border border-primary/30 ring-1 ring-primary/10">
                        <AvatarImage src={mediaSrc(selectedReport.targetProfileAvatarUrl)} alt="" className="object-cover" />
                        <AvatarFallback className="bg-zinc-800 text-sm font-semibold text-primary">
                          {initials(selectedReport.targetProfileName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">
                          {selectedReport.targetProfileName?.trim() || `#${selectedReport.targetUserId}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("p8.admin.reports.detail_id_label", { id: selectedReport.targetUserId })}
                        </p>
                      </div>
                    </div>
                  ) : selectedReport.targetType === "conversation" ? (
                    <p className="text-sm text-muted-foreground">
                      {t("p8.admin.reports.subject_conversation", {
                        id: selectedReport.relatedConversationId ?? t("p8.admin.common.dash"),
                      })}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("p8.admin.reports.detail_unspecified")}</p>
                  )}
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                <span
                  className={cn(
                    "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
                    statusBadgeClass(selectedReport.status),
                  )}
                >
                  {statusLabel(selectedReport.status)}
                </span>
                <span className="inline-flex rounded-full border border-primary/25 bg-zinc-900/60 px-2.5 py-1 text-xs text-muted-foreground">
                  {t("p8.admin.reports.detail_type", { type: selectedReport.targetType })}
                </span>
              </div>

              <div className="mb-4 rounded-2xl border border-primary/25 bg-zinc-900/50 p-4 ring-1 ring-primary/10">
                <p className="mb-2 text-xs font-medium text-muted-foreground">{t("p8.admin.reports.detail_reason")}</p>
                <p className="text-sm leading-relaxed text-foreground">{selectedReport.reason}</p>
                <p className="mb-1 mt-4 text-xs font-medium text-muted-foreground">{t("p8.admin.reports.detail_description")}</p>
                <p className="text-sm leading-relaxed text-foreground">
                  {selectedReport.description?.trim() || t("p8.admin.reports.detail_no_description")}
                </p>
              </div>

              <div className="mb-4">
                <StaffWorkflowPanel
                  assignment={selectedReport.assignment}
                  busy={workflowMutation.isPending || assignMutation.isPending}
                  canAssign={access.isFounder}
                  onAssign={() => setAssignOpen(true)}
                  onClaim={() => workflowMutation.mutate({ type: "claim", id: selectedReport.id })}
                  onRelease={() => workflowMutation.mutate({ type: "release", id: selectedReport.id })}
                />
              </div>

              <div className="mb-5 flex flex-wrap gap-2 border-t border-primary/15 pt-5">
                <button
                  type="button"
                  onClick={() => statusMutation.mutate({ id: selectedReport.id, status: "under_review" })}
                  disabled={actionPending}
                  className={cn(ADMIN_ROW_ACTION_BASE, "border-primary/40 bg-primary/10 text-primary")}
                >
                  {t("p8.admin.reports.status_under_review")}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setReasonDialog({ kind: "status", id: selectedReport.id, status: "resolved" })
                  }
                  disabled={actionPending}
                  className={cn(ADMIN_ROW_ACTION_BASE, "border-emerald-500/45 bg-emerald-600/15 text-emerald-200")}
                >
                  {t("p8.admin.reports.status_resolved")}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setReasonDialog({ kind: "status", id: selectedReport.id, status: "rejected" })
                  }
                  disabled={actionPending}
                  className={cn(ADMIN_ROW_ACTION_BASE, "border-amber-500/45 bg-amber-600/12 text-amber-100")}
                >
                  {t("p8.admin.reports.ignore")}
                </button>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-primary/15 pt-5">
                {selectedReport.targetAdId ? (
                  <>
                    <a
                      href={`/ad/${selectedReport.targetAdId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-2xl border-primary/35")}
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      {t("p8.admin.reports.link_ad_page")}
                    </a>
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/ads?focusId=${selectedReport.targetAdId}`)}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-2xl border-primary/35")}
                    >
                      <Megaphone className="h-3.5 w-3.5" aria-hidden />
                      {t("p8.admin.reports.link_admin_ads")}
                    </button>
                  </>
                ) : null}
                {selectedReport.targetUserId ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/users/${selectedReport.targetUserId}`)}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-2xl border-primary/35")}
                  >
                    <User className="h-3.5 w-3.5" aria-hidden />
                    {t("p8.admin.reports.link_user_page")}
                  </button>
                ) : null}
                {selectedReport.relatedConversationId ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/messages/${selectedReport.relatedConversationId}`)}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-2xl border-primary/35")}
                  >
                    <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                    {t("p8.admin.reports.link_conversation")}
                  </button>
                ) : null}
              </div>

              {selectedReport.targetAdId ? (
                <div className="mt-5 flex flex-wrap gap-2 border-t border-primary/15 pt-5">
                  <button
                    type="button"
                    onClick={() =>
                      setReasonDialog({ kind: "ad", id: selectedReport.id, action: "hide" })
                    }
                    disabled={actionPending}
                    className={cn(
                      ADMIN_ROW_ACTION_BASE,
                      "border-zinc-600 bg-zinc-800/90 text-zinc-200 hover:bg-zinc-800",
                    )}
                  >
                    {t("p8.admin.reports.action_hide_ad")}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setReasonDialog({ kind: "ad", id: selectedReport.id, action: "delete" })
                    }
                    disabled={actionPending}
                    className={cn(
                      ADMIN_ROW_ACTION_BASE,
                      "border-red-500/45 bg-red-950/40 text-red-200 hover:bg-red-950/60",
                    )}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    {t("p8.admin.reports.action_delete_ad")}
                  </button>
                </div>
              ) : null}
            </div>
          </div>,
          document.body,
        )}

      <StaffAssignDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        title={t("p8.admin.reports.assign_title")}
        description={t("p8.admin.reports.assign_description")}
        currentAssignee={selectedReport?.assignment?.staffName}
        busy={assignMutation.isPending}
        onConfirm={(staffActorId) => {
          if (!selectedReport) return;
          assignMutation.mutate({ id: selectedReport.id, staffId: staffActorId });
        }}
      />

      <ModerationReasonDialog
        open={reasonDialog !== null}
        onOpenChange={(open) => {
          if (!open) setReasonDialog(null);
        }}
        title={
          reasonDialog?.kind === "ad"
            ? t("p8.admin.reports.moderation_ad_reason_title")
            : reasonDialog?.status === "rejected"
              ? t("p8.admin.reports.moderation_reject_title")
              : t("p8.admin.reports.moderation_resolve_title")
        }
        description={t("p8.admin.moderation.reason_hint")}
        onConfirm={(reason) => {
          if (!reasonDialog) return;
          if (reasonDialog.kind === "status") {
            statusMutation.mutate({
              id: reasonDialog.id,
              status: reasonDialog.status,
              reason,
            });
          } else {
            adActionMutation.mutate({
              id: reasonDialog.id,
              action: reasonDialog.action,
              reason,
            });
          }
          setReasonDialog(null);
        }}
      />
    </AdminShell>
  );
}

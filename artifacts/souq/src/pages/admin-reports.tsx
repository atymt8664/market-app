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
import { adminLogout, moderateReportedAd, updateAdminReportStatus } from "@/features/admin/api";
import {
  ADMIN_ROW_ACTION_BASE,
  ADMIN_TABLE_ROW,
  BTN_FIX,
  BTN_SEARCH,
  CARD_SHELL,
  SURFACE_TABLE_WRAP,
  adminPillBtn,
} from "@/features/admin/admin-interaction-classes";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { useAdminDashboard, useAdminReports, useRequireAdmin } from "@/features/admin/hooks";
import type { AdminReport } from "@/features/admin/types";
import { useToast } from "@/hooks/use-toast";
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

function statusLabel(status: string) {
  if (status === "pending") return "جديد";
  if (status === "in_review") return "قيد المراجعة";
  if (status === "resolved") return "تم الحل";
  if (status === "rejected" || status === "ignored") return "متجاهل";
  return status;
}

function statusBadgeClass(status: string) {
  if (status === "pending") return "border-amber-500/45 bg-amber-500/15 text-amber-200";
  if (status === "in_review") return "border-primary/45 bg-primary/15 text-primary";
  if (status === "resolved") return "border-emerald-500/45 bg-emerald-500/15 text-emerald-200";
  if (status === "rejected" || status === "ignored") return "border-zinc-600 bg-zinc-800/80 text-zinc-300";
  return "border-zinc-600 bg-zinc-900/70 text-zinc-300";
}

function formatReportDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function ReportSubjectCell({ report }: { report: AdminReport }) {
  if (report.targetType === "ad" && report.targetAdId) {
    const title = report.targetAdTitle?.trim() || `إعلان #${report.targetAdId}`;
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
            {seller ? `البائع: ${seller}` : `إعلان #${report.targetAdId}`}
          </p>
        </div>
      </div>
    );
  }
  if (report.targetType === "user" && report.targetUserId) {
    const name = report.targetProfileName?.trim() || `مستخدم #${report.targetUserId}`;
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
          <p className="text-[11px] text-muted-foreground">بلاغ ضد مستخدم</p>
        </div>
      </div>
    );
  }
  if (report.targetType === "conversation" && report.relatedConversationId) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <MessageSquare className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <span className="text-sm">محادثة #{report.relatedConversationId}</span>
      </div>
    );
  }
  return <span className="text-muted-foreground">—</span>;
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
        <p className="line-clamp-1 font-medium text-foreground">{report.reporterName?.trim() || "—"}</p>
        <p className="text-[11px] text-muted-foreground">{report.reporterEmail || "—"}</p>
      </div>
    </div>
  );
}

const STATUS_FILTERS = [
  { key: "all", label: "الكل" },
  { key: "pending", label: "جديد" },
  { key: "in_review", label: "قيد المراجعة" },
  { key: "resolved", label: "تم الحل" },
  { key: "rejected", label: "متجاهل" },
] as const;

export default function AdminReportsPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const meQuery = useRequireAdmin();
  const reportsQuery = useAdminReports();
  const dashboardQuery = useAdminDashboard();
  const reportsStatusCounts = dashboardQuery.data?.statusCounts?.reports ?? {};
  const { toast } = useToast();
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);
  const params = new URLSearchParams(window.location.search);
  const initialStatus = params.get("status") || "all";
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [pendingAdDeleteReportId, setPendingAdDeleteReportId] = useState<number | null>(null);

  const closeReportModal = useCallback(() => {
    const next = new URLSearchParams(window.location.search);
    next.delete("reportId");
    const qs = next.toString();
    navigate(`/admin/reports${qs ? `?${qs}` : ""}`, { replace: true });
    setSelectedReport(null);
  }, [navigate]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
    await queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    await queryClient.invalidateQueries({ queryKey: ["admin", "ads"] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "pending" | "in_review" | "resolved" | "rejected" }) =>
      updateAdminReportStatus(id, status),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["admin", "reports"] });
      const previous = queryClient.getQueryData<AdminReport[]>(["admin", "reports"]);
      queryClient.setQueryData<AdminReport[]>(["admin", "reports"], (old = []) =>
        old.map((item) =>
          item.id === variables.id ? { ...item, status: variables.status } : item,
        ),
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["admin", "reports"], context.previous);
      }
      toast({
        title: "فشل تحديث البلاغ",
        description: error instanceof Error ? error.message : "حدث خطأ",
        variant: "destructive",
      });
    },
    onSuccess: async (_, variables) => {
      setSelectedReport((prev) =>
        prev && prev.id === variables.id ? { ...prev, status: variables.status } : prev,
      );
      await refresh();
      toast({
        title: "تم تحديث البلاغ",
        description: `تم تغيير الحالة إلى ${statusLabel(variables.status)}`,
      });
    },
  });

  const adActionMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "hide" | "delete" }) =>
      moderateReportedAd(id, action),
    onSuccess: async (_, variables) => {
      setPendingAdDeleteReportId(null);
      await refresh();
      toast({
        title: "تم تنفيذ الإجراء",
        description: variables.action === "hide" ? "تم إخفاء الإعلان المرتبط" : "تم حذف الإعلان المرتبط",
      });
    },
    onError: (error) => {
      toast({
        title: "فشل تنفيذ الإجراء",
        description: error instanceof Error ? error.message : "حدث خطأ",
        variant: "destructive",
      });
    },
  });

  const handleLogout = async () => {
    await adminLogout();
    navigate("/admin-login");
  };

  const reports = reportsQuery.data ?? [];
  const actionPending = statusMutation.isPending || adActionMutation.isPending;
  const visibleReports = useMemo(() => {
    if (statusFilter === "all") return reports;
    if (statusFilter === "rejected") {
      return reports.filter((r) => r.status === "rejected" || r.status === "ignored");
    }
    return reports.filter((r) => r.status === statusFilter);
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

  const ignoredTotal =
    Number(reportsStatusCounts.ignored ?? 0) + Number(reportsStatusCounts.rejected ?? 0);

  if (meQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-muted-foreground" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      </div>
    );
  }

  return (
    <AdminShell activeKey="reports" onLogout={handleLogout}>
      <div className="space-y-6" dir="rtl">
        <header
          className={cn(
            "flex flex-col gap-4 rounded-2xl border border-primary/40 bg-zinc-950/75 px-5 py-5 shadow-[0_0_24px_-12px_hsl(var(--primary)/0.2)] ring-1 ring-primary/12 sm:flex-row sm:items-center sm:justify-between",
          )}
        >
          <div className="space-y-1 text-right">
            <h1 className={cn(AUTH_HEADER_TITLE, "text-2xl md:text-[1.65rem]")}>إدارة البلاغات</h1>
            <p className="text-sm text-muted-foreground">مراجعة البلاغات وربطها بالإعلانات والمستخدمين</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-zinc-900/90 px-3 py-1.5 text-xs text-muted-foreground ring-1 ring-primary/10">
            <Flag className="h-3.5 w-3.5 text-primary" aria-hidden />
            {visibleReports.length.toLocaleString("ar-EG")} بلاغاً في العرض
          </span>
        </header>

        <section className={cn(CARD_SHELL, "p-4 sm:p-5")}>
          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {(
              [
                ["pending", "جديدة", reportsStatusCounts.pending],
                ["in_review", "قيد المراجعة", reportsStatusCounts.in_review],
                ["resolved", "تم الحل", reportsStatusCounts.resolved],
                ["rejected", "متجاهلة", ignoredTotal],
              ] as const
            ).map(([key, label, count]) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={cn(
                  BTN_FIX,
                  "rounded-2xl border p-3 text-right transition-all duration-150 ease-out active:scale-[0.98]",
                  "hover:border-primary/45 hover:shadow-[0_0_18px_-10px_hsl(var(--primary)/0.18)]",
                  statusFilter === key
                    ? "border-primary/45 bg-primary/10 shadow-[0_0_18px_-10px_hsl(var(--primary)/0.25)] ring-1 ring-primary/15"
                    : "border-primary/20 bg-zinc-900/50 ring-1 ring-primary/5",
                )}
              >
                <p className="text-xs text-muted-foreground">{label}</p>
                <p
                  className={cn(
                    "mt-1 text-xl font-semibold tabular-nums",
                    key === "pending" && "text-amber-200",
                    key === "in_review" && "text-primary",
                    key === "resolved" && "text-emerald-200",
                    key === "rejected" && "text-zinc-200",
                  )}
                >
                  {Number(count ?? 0).toLocaleString("ar-EG")}
                </p>
              </button>
            ))}
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            {STATUS_FILTERS.map((item) => (
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
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-primary/25 bg-zinc-900/40 py-12 text-muted-foreground ring-1 ring-primary/10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              جاري تحميل البلاغات...
            </div>
          ) : reportsQuery.isError ? (
            <div className="rounded-2xl border border-red-500/35 bg-red-950/25 px-4 py-10 text-center text-sm text-red-200 ring-1 ring-red-500/20">
              <p className="mb-3">تعذر تحميل البلاغات. حاول مرة أخرى.</p>
              <button
                type="button"
                onClick={() => reportsQuery.refetch()}
                className={cn(buttonVariants(), BTN_SEARCH)}
              >
                إعادة المحاولة
              </button>
            </div>
          ) : visibleReports.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-primary/30 bg-zinc-900/40 py-12 text-center text-sm text-muted-foreground">
              لا يوجد بلاغات مطابقة للفلتر الحالي.
            </div>
          ) : (
            <div className={SURFACE_TABLE_WRAP}>
              <table className="w-full min-w-[1080px] text-sm">
                <thead className="border-b border-primary/25 bg-zinc-900/50 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3 text-right font-medium">#</th>
                    <th className="px-3 py-3 text-right font-medium">المبلّغ</th>
                    <th className="px-3 py-3 text-right font-medium">حول</th>
                    <th className="px-3 py-3 text-right font-medium">السبب</th>
                    <th className="px-3 py-3 text-right font-medium">الحالة</th>
                    <th className="px-3 py-3 text-right font-medium">التاريخ</th>
                    <th className="px-3 py-3 text-center font-medium">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleReports.map((report) => (
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
                            تفاصيل
                          </button>
                          <button
                            type="button"
                            onClick={() => statusMutation.mutate({ id: report.id, status: "in_review" })}
                            disabled={actionPending}
                            className={cn(
                              ADMIN_ROW_ACTION_BASE,
                              "border-primary/35 bg-primary/8 text-primary hover:bg-primary/15",
                            )}
                          >
                            مراجعة
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
                            حل
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
                            تجاهل
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
              dir="rtl"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 id="admin-report-detail-title" className="text-xl font-semibold text-foreground">
                    تفاصيل البلاغ #{selectedReport.id}
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
                  إغلاق
                </button>
              </div>

              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className={cn(CARD_SHELL, "p-4")}>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">المبلّغ</p>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border border-primary/30 ring-1 ring-primary/10">
                      <AvatarImage src={mediaSrc(selectedReport.reporterAvatarUrl)} alt="" className="object-cover" />
                      <AvatarFallback className="bg-zinc-800 text-sm font-semibold text-primary">
                        {initials(selectedReport.reporterName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{selectedReport.reporterName || "—"}</p>
                      <p className="break-all text-xs text-muted-foreground">{selectedReport.reporterEmail || "—"}</p>
                      <p className="text-[11px] text-muted-foreground">معرّف: {selectedReport.reporterId}</p>
                    </div>
                  </div>
                </div>

                <div className={cn(CARD_SHELL, "p-4")}>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">الهدف</p>
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
                          {selectedReport.targetAdTitle?.trim() || `إعلان #${selectedReport.targetAdId}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(selectedReport.targetAdOwnerName || selectedReport.targetAdSellerName)?.trim()
                            ? `البائع: ${(selectedReport.targetAdOwnerName || selectedReport.targetAdSellerName)?.trim()}`
                            : `إعلان #${selectedReport.targetAdId}`}
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
                          {selectedReport.targetProfileName?.trim() || `مستخدم #${selectedReport.targetUserId}`}
                        </p>
                        <p className="text-xs text-muted-foreground">معرّف: {selectedReport.targetUserId}</p>
                      </div>
                    </div>
                  ) : selectedReport.targetType === "conversation" ? (
                    <p className="text-sm text-muted-foreground">
                      محادثة #{selectedReport.relatedConversationId ?? "—"}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">غير محدد</p>
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
                  النوع: {selectedReport.targetType}
                </span>
              </div>

              <div className="mb-4 rounded-2xl border border-primary/25 bg-zinc-900/50 p-4 ring-1 ring-primary/10">
                <p className="mb-2 text-xs font-medium text-muted-foreground">سبب البلاغ</p>
                <p className="text-sm leading-relaxed text-foreground">{selectedReport.reason}</p>
                <p className="mb-1 mt-4 text-xs font-medium text-muted-foreground">الوصف / تفاصيل إضافية</p>
                <p className="text-sm leading-relaxed text-foreground">
                  {selectedReport.description?.trim() || "لا يوجد وصف إضافي."}
                </p>
              </div>

              <div className="mb-5 flex flex-wrap gap-2 border-t border-primary/15 pt-5">
                <button
                  type="button"
                  onClick={() => statusMutation.mutate({ id: selectedReport.id, status: "in_review" })}
                  disabled={actionPending}
                  className={cn(ADMIN_ROW_ACTION_BASE, "border-primary/40 bg-primary/10 text-primary")}
                >
                  قيد المراجعة
                </button>
                <button
                  type="button"
                  onClick={() => statusMutation.mutate({ id: selectedReport.id, status: "resolved" })}
                  disabled={actionPending}
                  className={cn(ADMIN_ROW_ACTION_BASE, "border-emerald-500/45 bg-emerald-600/15 text-emerald-200")}
                >
                  تم الحل
                </button>
                <button
                  type="button"
                  onClick={() => statusMutation.mutate({ id: selectedReport.id, status: "rejected" })}
                  disabled={actionPending}
                  className={cn(ADMIN_ROW_ACTION_BASE, "border-amber-500/45 bg-amber-600/12 text-amber-100")}
                >
                  تجاهل
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
                      صفحة الإعلان
                    </a>
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/ads?focusId=${selectedReport.targetAdId}`)}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-2xl border-primary/35")}
                    >
                      <Megaphone className="h-3.5 w-3.5" aria-hidden />
                      في لوحة الإعلانات
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
                    صفحة المستخدم
                  </button>
                ) : null}
                {selectedReport.relatedConversationId ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/messages/${selectedReport.relatedConversationId}`)}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-2xl border-primary/35")}
                  >
                    <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                    المحادثة
                  </button>
                ) : null}
              </div>

              {selectedReport.targetAdId ? (
                <div className="mt-5 flex flex-wrap gap-2 border-t border-primary/15 pt-5">
                  <button
                    type="button"
                    onClick={() => adActionMutation.mutate({ id: selectedReport.id, action: "hide" })}
                    disabled={actionPending}
                    className={cn(
                      ADMIN_ROW_ACTION_BASE,
                      "border-zinc-600 bg-zinc-800/90 text-zinc-200 hover:bg-zinc-800",
                    )}
                  >
                    إخفاء الإعلان المرتبط
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingAdDeleteReportId(selectedReport.id)}
                    disabled={actionPending}
                    className={cn(
                      ADMIN_ROW_ACTION_BASE,
                      "border-red-500/45 bg-red-950/40 text-red-200 hover:bg-red-950/60",
                    )}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    حذف الإعلان المرتبط
                  </button>
                </div>
              ) : null}
            </div>
          </div>,
          document.body,
        )}

      <AlertDialog
        open={pendingAdDeleteReportId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingAdDeleteReportId(null);
        }}
      >
        <AlertDialogContent
          dir="rtl"
          className="max-w-md rounded-2xl border border-primary/40 bg-zinc-950 shadow-[0_0_32px_-12px_hsl(var(--primary)/0.35)] ring-1 ring-primary/15 sm:rounded-2xl"
        >
          <AlertDialogHeader className="space-y-2 text-right sm:text-right">
            <AlertDialogTitle className="text-lg font-semibold text-foreground">تأكيد حذف الإعلان المرتبط</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
              سيتم حذف الإعلان المرتبط بهذا البلاغ نهائياً من المنصة. هذا الإجراء لا يمكن التراجع عنه. هل تريد
              المتابعة؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row-reverse flex-wrap gap-2 sm:flex-row-reverse sm:justify-start sm:gap-2 sm:space-x-0">
            <AlertDialogCancel
              className={cn(
                buttonVariants({ variant: "outline", size: "default" }),
                "mt-0 rounded-2xl border-primary/35 bg-zinc-900/80 hover:bg-zinc-900",
              )}
            >
              إلغاء
            </AlertDialogCancel>
            <button
              type="button"
              disabled={adActionMutation.isPending || pendingAdDeleteReportId === null}
              className={cn(
                buttonVariants({ variant: "destructive", size: "default" }),
                "inline-flex gap-2 rounded-2xl border-red-500/50 shadow-[0_0_18px_-10px_rgba(220,38,38,0.35)]",
              )}
              onClick={() => {
                if (pendingAdDeleteReportId === null) return;
                adActionMutation.mutate({ id: pendingAdDeleteReportId, action: "delete" });
              }}
            >
              {adActionMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  جاري الحذف...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" aria-hidden />
                  حذف الإعلان
                </>
              )}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}

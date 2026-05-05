import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { adminLogout, moderateReportedAd, updateAdminReportStatus } from "@/features/admin/api";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { useAdminDashboard, useAdminReports, useRequireAdmin } from "@/features/admin/hooks";
import type { AdminReport } from "@/features/admin/types";
import { useToast } from "@/hooks/use-toast";

function statusLabel(status: string) {
  if (status === "pending") return "جديد";
  if (status === "in_review") return "قيد المراجعة";
  if (status === "resolved") return "تم الحل";
  if (status === "rejected") return "تم التجاهل";
  return status;
}

export default function AdminReportsPage() {
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();
  const meQuery = useRequireAdmin();
  const reportsQuery = useAdminReports();
  const dashboardQuery = useAdminDashboard();
  const reportsStatusCounts = dashboardQuery.data?.statusCounts?.reports ?? {};
  const { toast } = useToast();
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);
  const params = new URLSearchParams(window.location.search);
  const initialStatus = params.get("status") || "all";
  const focusReportId = Number(params.get("reportId") || 0);
  const [statusFilter, setStatusFilter] = useState(initialStatus);

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
    return reports.filter((r) => r.status === statusFilter);
  }, [reports, statusFilter]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (statusFilter !== "all") next.set("status", statusFilter);
    if (selectedReport?.id) next.set("reportId", String(selectedReport.id));
    const qs = next.toString();
    const nextUrl = `/admin/reports${qs ? `?${qs}` : ""}`;
    if (`${location}${window.location.search}` !== nextUrl) {
      navigate(nextUrl, { replace: true });
    }
  }, [statusFilter, selectedReport, location, navigate]);

  useEffect(() => {
    if (!focusReportId || !reports.length) return;
    const target = reports.find((r) => r.id === focusReportId);
    if (target) setSelectedReport(target);
  }, [focusReportId, reports]);

  if (meQuery.isLoading) {
    return <div className="min-h-screen bg-[#070b16] text-slate-200 flex items-center justify-center">جاري التحميل...</div>;
  }

  return (
    <AdminShell activeKey="reports" onLogout={handleLogout}>
      <div className="space-y-4">
        <header className="rounded-2xl border border-slate-800 bg-[#0d1324] px-5 py-4">
          <h1 className="text-2xl font-semibold">إدارة البلاغات</h1>
          <p className="text-sm text-slate-400">عرض كامل للبلاغات مع إجراءات معالجة مباشرة</p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-[#0d1324] p-4">
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-[#0a1020] p-3">
              <p className="text-xs text-slate-400">جديدة</p>
              <p className="mt-1 text-xl font-semibold text-amber-300">{Number(reportsStatusCounts.pending ?? 0)}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-[#0a1020] p-3">
              <p className="text-xs text-slate-400">قيد المراجعة</p>
              <p className="mt-1 text-xl font-semibold text-blue-300">{Number(reportsStatusCounts.in_review ?? 0)}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-[#0a1020] p-3">
              <p className="text-xs text-slate-400">تم الحل</p>
              <p className="mt-1 text-xl font-semibold text-emerald-300">{Number(reportsStatusCounts.resolved ?? 0)}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-[#0a1020] p-3">
              <p className="text-xs text-slate-400">متجاهلة</p>
              <p className="mt-1 text-xl font-semibold text-slate-200">
                {Number(reportsStatusCounts.ignored ?? reportsStatusCounts.rejected ?? 0)}
              </p>
            </div>
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            {[
              { key: "all", label: "الكل" },
              { key: "pending", label: "جديد" },
              { key: "in_review", label: "قيد المراجعة" },
              { key: "resolved", label: "تم الحل" },
                { key: "rejected", label: "متجاهل" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setStatusFilter(item.key)}
                className={`rounded-lg px-3 py-1 text-sm ${
                  statusFilter === item.key
                    ? "bg-indigo-500/20 text-indigo-200"
                    : "bg-[#0a1020] text-slate-300 hover:bg-slate-800"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          {reportsQuery.isLoading ? (
            <div className="rounded-xl border border-slate-800 bg-[#0a1020] p-8 text-center text-slate-300">
              جاري تحميل البلاغات...
            </div>
          ) : reportsQuery.isError ? (
            <div className="rounded-xl border border-red-700/40 bg-red-950/20 p-8 text-center text-red-200">
              <p className="mb-3">تعذر تحميل البلاغات. حاول مرة أخرى.</p>
              <button
                type="button"
                onClick={() => reportsQuery.refetch()}
                className="rounded-lg bg-indigo-500 px-4 py-2 text-sm text-white"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : visibleReports.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-[#0a1020] p-8 text-center text-slate-300">
              لا يوجد بلاغات حالياً.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="text-slate-400">
                  <tr className="border-b border-slate-800">
                    <th className="px-2 py-2 text-right">#</th>
                    <th className="px-2 py-2 text-right">النوع/الهدف</th>
                    <th className="px-2 py-2 text-right">السبب</th>
                    <th className="px-2 py-2 text-right">الرسالة</th>
                    <th className="px-2 py-2 text-right">الحالة</th>
                    <th className="px-2 py-2 text-right">المبلغ</th>
                    <th className="px-2 py-2 text-right">التاريخ</th>
                    <th className="px-2 py-2 text-right">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleReports.map((report) => (
                    <tr
                      key={report.id}
                      className="cursor-pointer border-b border-slate-900/70 transition hover:bg-slate-900/60"
                      onClick={() => setSelectedReport(report)}
                    >
                      <td className="px-2 py-3">{report.id}</td>
                      <td className="px-2 py-3">
                        {report.targetType === "ad"
                          ? `إعلان #${report.targetAdId}`
                          : report.targetType === "user"
                            ? `مستخدم #${report.targetUserId}`
                            : report.targetType === "conversation"
                              ? `محادثة #${report.relatedConversationId ?? "—"}`
                              : "غير محدد"}
                      </td>
                      <td className="px-2 py-3">{report.reason}</td>
                      <td className="px-2 py-3">
                        <p className="line-clamp-1">{report.description || "—"}</p>
                      </td>
                      <td className="px-2 py-3">{statusLabel(report.status)}</td>
                      <td className="px-2 py-3">
                        <div>
                          <p>{report.reporterName || "—"}</p>
                          <p className="text-xs text-slate-400">{report.reporterEmail || "—"}</p>
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        {report.createdAt ? new Date(report.createdAt).toLocaleString() : "—"}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedReport(report)}
                            className="cursor-pointer rounded-lg bg-slate-700 px-2 py-1 text-xs text-white transition hover:bg-slate-600"
                          >
                            التفاصيل
                          </button>
                          <button
                            type="button"
                            onClick={() => statusMutation.mutate({ id: report.id, status: "in_review" })}
                            disabled={actionPending}
                            className="cursor-pointer rounded-lg bg-blue-600 px-2 py-1 text-xs text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {actionPending ? "..." : "قيد المراجعة"}
                          </button>
                          <button
                            type="button"
                            onClick={() => statusMutation.mutate({ id: report.id, status: "resolved" })}
                            disabled={actionPending}
                            className="cursor-pointer rounded-lg bg-green-600 px-2 py-1 text-xs text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {actionPending ? "..." : "تم الحل"}
                          </button>
                          <button
                            type="button"
                            onClick={() => statusMutation.mutate({ id: report.id, status: "rejected" })}
                            disabled={actionPending}
                            className="cursor-pointer rounded-lg bg-amber-600 px-2 py-1 text-xs text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {actionPending ? "..." : "تجاهل"}
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
          <div className="fixed inset-0 z-50 bg-black/60">
            <button
              type="button"
              onClick={() => setSelectedReport(null)}
              className="absolute inset-0 h-full w-full cursor-default"
              aria-label="close panel overlay"
            />
            <div className="absolute inset-y-0 right-0 w-full max-w-xl overflow-y-auto border-l border-slate-800 bg-[#0d1324] p-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">تفاصيل البلاغ #{selectedReport.id}</h2>
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="cursor-pointer rounded-lg bg-slate-700 px-3 py-1 text-sm transition hover:bg-slate-600"
                >
                  إغلاق
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <p><span className="text-slate-400">النوع:</span> {selectedReport.targetType}</p>
                <p><span className="text-slate-400">الحالة:</span> {statusLabel(selectedReport.status)}</p>
                <p><span className="text-slate-400">رقم الإعلان:</span> {selectedReport.targetAdId || "—"}</p>
                <p><span className="text-slate-400">رقم المستخدم:</span> {selectedReport.targetUserId || "—"}</p>
                <p><span className="text-slate-400">رقم المحادثة:</span> {selectedReport.relatedConversationId || "—"}</p>
                <p><span className="text-slate-400">المبلغ:</span> {selectedReport.reporterName || "—"}</p>
                <p><span className="text-slate-400">البريد:</span> {selectedReport.reporterEmail || "—"}</p>
                <p><span className="text-slate-400">التاريخ:</span> {selectedReport.createdAt ? new Date(selectedReport.createdAt).toLocaleString() : "—"}</p>
              </div>

              <div className="mt-4 rounded-xl border border-slate-800 bg-[#0a1020] p-3">
                <p className="mb-1 text-xs text-slate-400">سبب البلاغ</p>
                <p className="text-sm">{selectedReport.reason}</p>
                <p className="mb-1 mt-3 text-xs text-slate-400">الوصف/الرسالة</p>
                <p className="text-sm leading-6">{selectedReport.description || "بدون وصف"}</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => statusMutation.mutate({ id: selectedReport.id, status: "in_review" })}
                  disabled={actionPending}
                  className="cursor-pointer rounded-lg bg-blue-600 px-3 py-2 text-sm text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionPending ? "جاري التنفيذ..." : "قيد المراجعة"}
                </button>
                <button
                  type="button"
                  onClick={() => statusMutation.mutate({ id: selectedReport.id, status: "resolved" })}
                  disabled={actionPending}
                  className="cursor-pointer rounded-lg bg-green-600 px-3 py-2 text-sm text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  حل البلاغ
                </button>
                <button
                  type="button"
                  onClick={() => statusMutation.mutate({ id: selectedReport.id, status: "rejected" })}
                  disabled={actionPending}
                  className="cursor-pointer rounded-lg bg-amber-600 px-3 py-2 text-sm text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  تجاهل البلاغ
                </button>
                {selectedReport.targetAdId && (
                  <>
                    <button
                      type="button"
                      onClick={() => adActionMutation.mutate({ id: selectedReport.id, action: "hide" })}
                      disabled={actionPending}
                      className="cursor-pointer rounded-lg bg-slate-600 px-3 py-2 text-sm text-white transition hover:bg-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      إخفاء الإعلان المرتبط
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("هل أنت متأكد من حذف الإعلان المرتبط؟")) {
                          adActionMutation.mutate({ id: selectedReport.id, action: "delete" });
                        }
                      }}
                      disabled={actionPending}
                      className="cursor-pointer rounded-lg bg-red-700 px-3 py-2 text-sm text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      حذف الإعلان المرتبط
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </AdminShell>
  );
}

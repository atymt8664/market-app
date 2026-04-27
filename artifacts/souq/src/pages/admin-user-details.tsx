import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { adminLogout, updateAdminUserStatus } from "@/features/admin/api";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { useAdminUserDetails, useRequireAdmin } from "@/features/admin/hooks";
import { useToast } from "@/hooks/use-toast";

export default function AdminUserDetailsPage() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/admin/users/:id");
  const userId = Number(params?.id || 0);
  const meQuery = useRequireAdmin();
  const detailsQuery = useAdminUserDetails(Number.isInteger(userId) && userId > 0 ? userId : null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: number; nextStatus: "active" | "banned" }) =>
      updateAdminUserStatus(id, nextStatus),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "users", "details", userId] });
      toast({ title: "تم تحديث حالة المستخدم" });
    },
    onError: (error) => {
      toast({
        title: "فشل تحديث الحالة",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    },
  });

  const handleLogout = async () => {
    await adminLogout();
    navigate("/admin-login");
  };

  if (meQuery.isLoading || detailsQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#070b16] text-slate-200 flex items-center justify-center">
        جاري التحميل...
      </div>
    );
  }

  if (detailsQuery.isError || !detailsQuery.data) {
    return (
      <AdminShell activeKey="users" onLogout={handleLogout}>
        <div className="rounded-2xl border border-red-700/40 bg-red-950/20 p-8 text-center text-red-200">
          تعذر تحميل تفاصيل المستخدم.
        </div>
      </AdminShell>
    );
  }

  const details = detailsQuery.data;

  return (
    <AdminShell activeKey="users" onLogout={handleLogout}>
      <div className="space-y-4">
        <header className="rounded-2xl border border-slate-800 bg-[#0d1324] px-5 py-4 shadow-sm">
          <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-100">
                تفاصيل المستخدم #{details.user.id}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                ملخص الحساب وسجل النشاطات المرتبطة بالمستخدم
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigate("/admin/users")}
                className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-sm text-slate-100 hover:bg-slate-700"
              >
                رجوع
              </button>
              <button
                type="button"
                onClick={() =>
                  statusMutation.mutate({
                    id: details.user.id,
                    nextStatus: details.user.status === "banned" ? "active" : "banned",
                  })
                }
                disabled={statusMutation.isPending}
                className={`rounded-lg px-3 py-1.5 text-sm text-white disabled:opacity-60 ${
                  details.user.status === "banned"
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-amber-600 hover:bg-amber-500"
                }`}
              >
                {details.user.status === "banned" ? "فك الحظر" : "حظر"}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-800 bg-[#0a1020] p-4 text-sm sm:grid-cols-2">
            <p><span className="text-slate-400">الاسم:</span> <span className="text-slate-100">{details.user.name}</span></p>
            <p><span className="text-slate-400">البريد الإلكتروني:</span> <span className="text-slate-100">{details.user.email}</span></p>
            <p><span className="text-slate-400">الهاتف:</span> <span className="text-slate-100">{details.user.phone}</span></p>
            <p><span className="text-slate-400">المدينة:</span> <span className="text-slate-100">{details.user.city || "-"}</span></p>
            <p>
              <span className="text-slate-400">الحالة:</span>{" "}
              <span className={details.user.status === "banned" ? "text-red-300" : "text-emerald-300"}>
                {details.user.status === "banned" ? "محظور" : "نشط"}
              </span>
            </p>
            <p>
              <span className="text-slate-400">تاريخ الإنشاء:</span>{" "}
              <span className="text-slate-100">
                {details.user.createdAt ? new Date(details.user.createdAt).toLocaleString() : "-"}
              </span>
            </p>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-[#0d1324] p-4">
            <p className="text-xs text-slate-400">إجمالي الإعلانات</p>
            <p className="mt-2 text-2xl font-semibold">{details.stats.adsCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-[#0d1324] p-4">
            <p className="text-xs text-slate-400">إجمالي البلاغات</p>
            <p className="mt-2 text-2xl font-semibold">{details.stats.reportsCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-[#0d1324] p-4">
            <p className="text-xs text-slate-400">إجمالي تذاكر الدعم</p>
            <p className="mt-2 text-2xl font-semibold">{details.stats.supportTicketsCount}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-[#0d1324] p-4">
          <h2 className="mb-3 text-lg font-semibold text-slate-100">إعلانات المستخدم</h2>
          {details.ads.length === 0 ? (
            <p className="text-sm text-slate-400">لا توجد إعلانات.</p>
          ) : (
            <div className="space-y-2">
              {details.ads.map((ad) => (
                <div key={ad.id} className="rounded-lg border border-slate-800 bg-[#0a1020] p-3 text-sm transition hover:bg-slate-900/50">
                  <p className="font-medium text-slate-100">#{ad.id} - {ad.title}</p>
                  <p className="text-xs text-slate-400">
                    الحالة: {ad.status} | المدينة: {ad.city} | المشاهدات: {ad.views}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-[#0d1324] p-4">
          <h2 className="mb-3 text-lg font-semibold text-slate-100">آخر البلاغات عن المستخدم</h2>
          {details.reports.length === 0 ? (
            <p className="text-sm text-slate-400">لا توجد بلاغات.</p>
          ) : (
            <div className="space-y-2">
              {details.reports.map((report) => (
                <div key={report.id} className="rounded-lg border border-slate-800 bg-[#0a1020] p-3 text-sm transition hover:bg-slate-900/50">
                  <p className="font-medium text-slate-100">بلاغ #{report.id} - {report.reason}</p>
                  <p className="text-xs text-slate-400">
                    الحالة: {report.status} | المبلغ: {report.reporterName || "-"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-[#0d1324] p-4">
          <h2 className="mb-3 text-lg font-semibold text-slate-100">تذاكر الدعم</h2>
          {details.supportTickets.length === 0 ? (
            <p className="text-sm text-slate-400">لا توجد تذاكر دعم.</p>
          ) : (
            <div className="space-y-2">
              {details.supportTickets.map((ticket) => (
                <div key={ticket.id} className="rounded-lg border border-slate-800 bg-[#0a1020] p-3 text-sm transition hover:bg-slate-900/50">
                  <p className="font-medium text-slate-100">#{ticket.id} - {ticket.subject}</p>
                  <p className="text-xs text-slate-400">
                    النوع: {ticket.category} | الحالة: {ticket.status} | الأولوية: {ticket.priority}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}

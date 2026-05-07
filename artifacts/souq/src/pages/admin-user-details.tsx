import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Shield, ShieldOff } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { adminLogout, updateAdminUserStatus } from "@/features/admin/api";
import { ADMIN_ROW_ACTION_BASE, BTN_FIX, BTN_MODAL_GHOST } from "@/features/admin/admin-interaction-classes";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { useAdminUserDetails, useRequireAdmin } from "@/features/admin/hooks";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AdminUserDetailsPage() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/admin/users/:id");
  const userId = Number(params?.id || 0);
  const meQuery = useRequireAdmin();
  const detailsQuery = useAdminUserDetails(Number.isInteger(userId) && userId > 0 ? userId : null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pendingBan, setPendingBan] = useState<{ id: number; name: string } | null>(null);

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

  const actionPending = statusMutation.isPending;

  const confirmBan = () => {
    if (!pendingBan) return;
    statusMutation.mutate(
      { id: pendingBan.id, nextStatus: "banned" },
      { onSettled: () => setPendingBan(null) },
    );
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
              {details.user.status === "banned" ? (
                <button
                  type="button"
                  onClick={() =>
                    statusMutation.mutate({
                      id: details.user.id,
                      nextStatus: "active",
                    })
                  }
                  disabled={actionPending}
                  className={cn(
                    ADMIN_ROW_ACTION_BASE,
                    "border-emerald-500/45 bg-emerald-600/15 text-emerald-200",
                  )}
                >
                  <ShieldOff className="h-3.5 w-3.5" aria-hidden />
                  فك الحظر
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setPendingBan({
                      id: details.user.id,
                      name: details.user.name,
                    })
                  }
                  disabled={actionPending}
                  className={cn(
                    ADMIN_ROW_ACTION_BASE,
                    "border-amber-500/45 bg-amber-600/12 text-amber-100",
                  )}
                >
                  <Shield className="h-3.5 w-3.5" aria-hidden />
                  حظر
                </button>
              )}
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

      <AlertDialog open={pendingBan !== null} onOpenChange={(o) => !o && setPendingBan(null)}>
        <AlertDialogContent
          dir="rtl"
          className="z-[100] max-w-md rounded-2xl border border-primary/40 bg-zinc-950 shadow-[0_0_32px_-12px_hsl(var(--primary)/0.35)] ring-1 ring-primary/15 sm:rounded-2xl"
        >
          <AlertDialogHeader className="text-right sm:text-right">
            <AlertDialogTitle className="text-lg font-semibold text-foreground">تأكيد حظر المستخدم</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
              {pendingBan ? (
                <>
                  هل تريد حظر «{pendingBan.name}» (#{pendingBan.id})؟ لن يتمكن من استخدام الحساب بالشكل المعتاد حتى يتم
                  فك الحظر.
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
              disabled={actionPending || !pendingBan}
              title={actionPending ? "جاري تنفيذ العملية…" : undefined}
              className={cn(
                buttonVariants({ variant: "destructive", size: "default" }),
                BTN_FIX,
                "cursor-pointer rounded-xl transition-all duration-150 ease-out hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
              )}
              onClick={() => confirmBan()}
            >
              {actionPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              تأكيد الحظر
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}

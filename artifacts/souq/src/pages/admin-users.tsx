import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import {
  ExternalLink,
  Loader2,
  Megaphone,
  Search,
  Shield,
  ShieldOff,
  User,
  Users,
} from "lucide-react";
import { adminLogout, updateAdminUserStatus } from "@/features/admin/api";
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
import {
  useAdminDashboard,
  useAdminUserDetails,
  useAdminUsers,
  useRequireAdmin,
} from "@/features/admin/hooks";
import type { AdminUser } from "@/features/admin/types";
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
import { Button, buttonVariants } from "@/components/ui/button";

const STATUS_OPTIONS = [
  { key: "all", label: "الكل" },
  { key: "active", label: "غير محظور" },
  { key: "banned", label: "محظور" },
] as const;

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

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

const inputClass =
  "w-full rounded-2xl border border-primary/30 bg-zinc-900/90 px-4 py-2.5 text-sm text-foreground outline-none ring-1 ring-primary/5 transition placeholder:text-muted-foreground focus:border-primary/55 focus:ring-2 focus:ring-primary/25";

export default function AdminUsersPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const meQuery = useRequireAdmin();
  const dashboardQuery = useAdminDashboard();
  const usersStatusCounts = dashboardQuery.data?.statusCounts?.users ?? {};
  const totals = dashboardQuery.data?.totals;
  const badges = dashboardQuery.data?.badges;

  const [status, setStatus] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [pendingBan, setPendingBan] = useState<{ id: number; name: string } | null>(null);

  const usersQuery = useAdminUsers({ status, q: search });
  const detailsQuery = useAdminUserDetails(selectedUserId);

  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);

  const platformTotalUsers = Number(totals?.users ?? 0);
  const platformActive = Number(usersStatusCounts.active ?? 0);
  const platformBlocked = Number(usersStatusCounts.blocked ?? 0);
  const usersNewToday = Number(badges?.usersNewToday ?? 0);

  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: number; nextStatus: "active" | "banned" }) =>
      updateAdminUserStatus(id, nextStatus),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      await queryClient.invalidateQueries({
        queryKey: ["admin", "users", "details", variables.id],
      });
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

  const closeUserModal = useCallback(() => {
    setSelectedUserId(null);
  }, []);

  const requestBan = (user: AdminUser) => {
    setPendingBan({ id: user.id, name: user.name });
  };

  const confirmBan = () => {
    if (!pendingBan) return;
    statusMutation.mutate(
      { id: pendingBan.id, nextStatus: "banned" },
      { onSettled: () => setPendingBan(null) },
    );
  };

  const toggleBanFromRow = (user: AdminUser) => {
    if (user.status === "banned") {
      statusMutation.mutate({ id: user.id, nextStatus: "active" });
    } else {
      requestBan(user);
    }
  };

  const handleLogout = async () => {
    await adminLogout();
    navigate("/admin-login");
  };

  useEffect(() => {
    if (!selectedUserId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeUserModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedUserId, closeUserModal]);

  const actionPending = statusMutation.isPending;

  if (meQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-muted-foreground" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      </div>
    );
  }

  return (
    <AdminShell activeKey="users" onLogout={handleLogout}>
      <div className="space-y-6" dir="rtl">
        <header
          className={cn(
            "flex flex-col gap-4 rounded-2xl border border-primary/40 bg-zinc-950/75 px-5 py-5 shadow-[0_0_24px_-12px_hsl(var(--primary)/0.2)] ring-1 ring-primary/12 sm:flex-row sm:items-center sm:justify-between",
          )}
        >
          <div className="space-y-1 text-right">
            <h1 className={cn(AUTH_HEADER_TITLE, "text-2xl md:text-[1.65rem]")}>إدارة المستخدمين</h1>
            <p className="text-sm text-muted-foreground">
              الأرقام أدناه من لوحة التحكم (كل المنصة). القائمة قابلة للتصفية والبحث.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-zinc-900/90 px-3 py-1.5 text-xs text-muted-foreground ring-1 ring-primary/10">
            <Users className="h-3.5 w-3.5 text-primary" aria-hidden />
            {users.length.toLocaleString("ar-EG")} مستخدم في العرض الحالي
          </span>
        </header>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className={cn(CARD_SHELL, "p-4")}>
            <p className="text-xs text-muted-foreground">إجمالي المستخدمين</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
              {platformTotalUsers.toLocaleString("ar-EG")}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">من `/api/admin/dashboard`</p>
          </div>
          <div className={cn(CARD_SHELL, "p-4")}>
            <p className="text-xs text-muted-foreground">جدد اليوم</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-primary">
              {usersNewToday.toLocaleString("ar-EG")}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">حسب التسجيل منذ بداية اليوم</p>
          </div>
          <div className={cn(CARD_SHELL, "p-4")}>
            <p className="text-xs text-muted-foreground">غير محظورين</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-200">
              {platformActive.toLocaleString("ar-EG")}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">ليسوا «متصلين الآن» — لا يوجد حضور لحظي في النظام</p>
          </div>
          <div className={cn(CARD_SHELL, "p-4")}>
            <p className="text-xs text-muted-foreground">محظورون</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-red-200">
              {platformBlocked.toLocaleString("ar-EG")}
            </p>
          </div>
        </section>

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
                  placeholder="ابحث بالاسم أو البريد..."
                  className={cn(inputClass, "pr-10")}
                  aria-label="بحث عن مستخدم"
                />
              </div>
              <Button type="submit" className={BTN_SEARCH}>
                بحث
              </Button>
            </form>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((item) => (
                <button key={item.key} type="button" onClick={() => setStatus(item.key)} className={adminPillBtn(status === item.key)}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {usersQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-primary/25 bg-zinc-900/40 py-12 text-muted-foreground ring-1 ring-primary/10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              جاري تحميل المستخدمين...
            </div>
          ) : usersQuery.isError ? (
            <div className="rounded-2xl border border-red-500/35 bg-red-950/25 px-4 py-10 text-center text-sm text-red-200 ring-1 ring-red-500/20">
              فشل تحميل المستخدمين
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-primary/30 bg-zinc-900/40 py-12 text-center text-sm text-muted-foreground">
              لا يوجد مستخدمون مطابقون للبحث أو الفلتر.
            </div>
          ) : (
            <div className={SURFACE_TABLE_WRAP}>
              <table className="w-full min-w-[920px] text-sm">
                <thead className="border-b border-primary/25 bg-zinc-900/50 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3 text-right font-medium">#</th>
                    <th className="px-3 py-3 text-right font-medium">المستخدم</th>
                    <th className="px-3 py-3 text-right font-medium">البريد</th>
                    <th className="px-3 py-3 text-right font-medium">الحالة</th>
                    <th className="px-3 py-3 text-right font-medium">تاريخ التسجيل</th>
                    <th className="px-3 py-3 text-center font-medium">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className={cn("cursor-pointer last:border-0", ADMIN_TABLE_ROW)}
                      onClick={() => setSelectedUserId(user.id)}
                    >
                      <td className="px-3 py-3 align-middle tabular-nums text-muted-foreground">{user.id}</td>
                      <td className="px-3 py-3 align-middle">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-9 w-9 shrink-0 border border-primary/25 ring-1 ring-primary/10">
                            <AvatarImage src={mediaSrc(user.avatarUrl)} alt="" className="object-cover" />
                            <AvatarFallback className="bg-zinc-800 text-[10px] font-semibold text-primary">
                              {initials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground">{user.name}</span>
                        </div>
                      </td>
                      <td className="max-w-[240px] px-3 py-3 align-middle">
                        <p className="break-all text-muted-foreground">{user.email}</p>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
                            user.status === "banned"
                              ? "border-red-500/45 bg-red-950/35 text-red-200"
                              : "border-emerald-500/45 bg-emerald-500/12 text-emerald-200",
                          )}
                        >
                          {user.status === "banned" ? "محظور" : "غير محظور"}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-middle whitespace-nowrap text-[13px] text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-3 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedUserId(user.id)}
                            className={cn(
                              ADMIN_ROW_ACTION_BASE,
                              "border-primary/40 bg-primary/10 text-primary hover:border-primary/55 hover:bg-primary/18",
                            )}
                          >
                            التفاصيل
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleBanFromRow(user)}
                            disabled={actionPending}
                            className={cn(
                              ADMIN_ROW_ACTION_BASE,
                              user.status === "banned"
                                ? "border-emerald-500/45 bg-emerald-600/15 text-emerald-200"
                                : "border-amber-500/45 bg-amber-600/12 text-amber-100",
                            )}
                          >
                            {user.status === "banned" ? (
                              <>
                                <ShieldOff className="h-3.5 w-3.5" aria-hidden />
                                فك الحظر
                              </>
                            ) : (
                              <>
                                <Shield className="h-3.5 w-3.5" aria-hidden />
                                حظر
                              </>
                            )}
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

      {selectedUserId !== null &&
        createPortal(
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
            onClick={closeUserModal}
            role="presentation"
          >
            <div
              className={cn(CARD_SHELL, "max-h-[92vh] w-full max-w-2xl overflow-y-auto p-5 shadow-[0_0_40px_-16px_hsl(var(--primary)/0.45)]")}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-user-modal-title"
              dir="rtl"
            >
              {detailsQuery.isLoading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  جاري تحميل التفاصيل...
                </div>
              ) : detailsQuery.isError || !detailsQuery.data ? (
                <p className="py-8 text-center text-red-300">تعذر تحميل تفاصيل المستخدم.</p>
              ) : (
                <>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <h2 id="admin-user-modal-title" className="text-xl font-semibold text-foreground">
                      المستخدم #{detailsQuery.data.user.id}
                    </h2>
                    <button
                      type="button"
                      onClick={closeUserModal}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-2xl border-primary/35")}
                    >
                      إغلاق
                    </button>
                  </div>

                  <div className={cn(CARD_SHELL, "mb-4 p-4")}>
                    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                      <Avatar className="h-20 w-20 border border-primary/30 ring-1 ring-primary/10">
                        <AvatarImage src={mediaSrc(detailsQuery.data.user.avatarUrl)} alt="" className="object-cover" />
                        <AvatarFallback className="bg-zinc-800 text-xl font-semibold text-primary">
                          {initials(detailsQuery.data.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1 text-right">
                        <p className="text-lg font-semibold text-foreground">{detailsQuery.data.user.name}</p>
                        <p className="break-all text-sm text-muted-foreground">{detailsQuery.data.user.email}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          الهاتف: {detailsQuery.data.user.phone || "—"} · المدينة: {detailsQuery.data.user.city || "—"}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          البريد مُفعَّل: {detailsQuery.data.user.emailVerified ? "نعم" : "لا"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 flex flex-wrap gap-2">
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
                        detailsQuery.data.user.status === "banned"
                          ? "border-red-500/45 bg-red-950/35 text-red-200"
                          : "border-emerald-500/45 bg-emerald-500/12 text-emerald-200",
                      )}
                    >
                      {detailsQuery.data.user.status === "banned" ? "محظور" : "غير محظور"}
                    </span>
                    <span className="rounded-full border border-primary/25 bg-zinc-900/60 px-2.5 py-1 text-xs text-muted-foreground">
                      تسجيل: {formatDate(detailsQuery.data.user.createdAt)}
                    </span>
                    <span className="rounded-full border border-dashed border-primary/30 px-2.5 py-1 text-xs text-muted-foreground">
                      آخر نشاط: غير متوفر في قاعدة البيانات (لا يوجد حقل lastSeen)
                    </span>
                  </div>

                  <div className="mb-4 grid grid-cols-3 gap-2">
                    <div className={cn(CARD_SHELL, "p-3 text-center")}>
                      <p className="text-[11px] text-muted-foreground">إعلانات</p>
                      <p className="text-lg font-semibold tabular-nums text-primary">
                        {detailsQuery.data.stats.adsCount.toLocaleString("ar-EG")}
                      </p>
                    </div>
                    <div className={cn(CARD_SHELL, "p-3 text-center")}>
                      <p className="text-[11px] text-muted-foreground">بلاغات</p>
                      <p className="text-lg font-semibold tabular-nums text-primary">
                        {detailsQuery.data.stats.reportsCount.toLocaleString("ar-EG")}
                      </p>
                    </div>
                    <div className={cn(CARD_SHELL, "p-3 text-center")}>
                      <p className="text-[11px] text-muted-foreground">دعم</p>
                      <p className="text-lg font-semibold tabular-nums text-primary">
                        {detailsQuery.data.stats.supportTicketsCount.toLocaleString("ar-EG")}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4 flex flex-wrap gap-2 border-t border-primary/15 pt-4">
                    <a
                      href={`/users/${detailsQuery.data.user.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-2xl border-primary/35")}
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      الملف العام
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        closeUserModal();
                        navigate(`/admin/users/${detailsQuery.data.user.id}`);
                      }}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-2xl border-primary/35")}
                    >
                      <User className="h-3.5 w-3.5" aria-hidden />
                      صفحة التفاصيل الكاملة
                    </button>
                    {detailsQuery.data.ads.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          closeUserModal();
                          navigate(`/admin/ads?focusId=${detailsQuery.data.ads[0].id}`);
                        }}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-2xl border-primary/35")}
                      >
                        <Megaphone className="h-3.5 w-3.5" aria-hidden />
                        أول إعلان في لوحة الإعلانات
                      </button>
                    ) : null}
                  </div>

                  {detailsQuery.data.ads.length > 0 ? (
                    <div className="mb-4 rounded-2xl border border-primary/25 bg-zinc-900/40 p-3 ring-1 ring-primary/10">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">إعلانات (أحدث {Math.min(5, detailsQuery.data.ads.length)})</p>
                      <ul className="space-y-1 text-sm">
                        {detailsQuery.data.ads.slice(0, 5).map((ad) => (
                          <li key={ad.id} className="flex justify-between gap-2 border-b border-primary/10 py-1 last:border-0">
                            <span className="line-clamp-1 text-foreground">{ad.title}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">#{ad.id}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {detailsQuery.data.reports.length > 0 ? (
                    <div className="mb-4 rounded-2xl border border-primary/25 bg-zinc-900/40 p-3 ring-1 ring-primary/10">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">بلاغات ضد المستخدم (أحدث {Math.min(5, detailsQuery.data.reports.length)})</p>
                      <ul className="space-y-1 text-sm">
                        {detailsQuery.data.reports.slice(0, 5).map((r) => (
                          <li key={r.id} className="flex justify-between gap-2 border-b border-primary/10 py-1 last:border-0">
                            <span className="line-clamp-1 text-foreground">{r.reason}</span>
                            <button
                              type="button"
                              className="shrink-0 text-xs text-primary hover:underline"
                              onClick={() => {
                                closeUserModal();
                                navigate(`/admin/reports?reportId=${r.id}`);
                              }}
                            >
                              #{r.id}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2 border-t border-primary/15 pt-4">
                    {detailsQuery.data.user.status === "banned" ? (
                      <button
                        type="button"
                        disabled={actionPending}
                        onClick={() =>
                          statusMutation.mutate({
                            id: detailsQuery.data.user.id,
                            nextStatus: "active",
                          })
                        }
                        className={cn(ADMIN_ROW_ACTION_BASE, "border-emerald-500/45 bg-emerald-600/15 text-emerald-200")}
                      >
                        <ShieldOff className="h-3.5 w-3.5" aria-hidden />
                        فك الحظر
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={actionPending}
                        onClick={() =>
                          setPendingBan({
                            id: detailsQuery.data.user.id,
                            name: detailsQuery.data.user.name,
                          })
                        }
                        className={cn(ADMIN_ROW_ACTION_BASE, "border-amber-500/45 bg-amber-600/12 text-amber-100")}
                      >
                        <Shield className="h-3.5 w-3.5" aria-hidden />
                        حظر المستخدم
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body,
        )}

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

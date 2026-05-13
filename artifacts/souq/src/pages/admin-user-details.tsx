import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  ChevronRight,
  Flag,
  LifeBuoy,
  Loader2,
  Mail,
  MapPin,
  Megaphone,
  PackageOpen,
  Phone,
  Shield,
  ShieldOff,
  Sparkles,
} from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { adminLogout, updateAdminUserStatus } from "@/features/admin/api";
import {
  ADMIN_ROW_ACTION_BASE,
  BTN_FIX,
  BTN_MODAL_GHOST,
  BTN_TOOLBAR_OUTLINE,
  CARD_SHELL,
  PANEL_INSET,
  STAT_TILE,
  SUB_CARD,
} from "@/features/admin/admin-interaction-classes";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { useAdminUserDetails, useRequireAdmin } from "@/features/admin/hooks";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";
import { AUTH_HEADER_TITLE } from "@/lib/auth-page-styles";
import { SETTINGS_SECTION_TITLE } from "@/components/settings-shell";
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
import { cn } from "@/lib/utils";

/** Dark glass + lime rim — aligned with admin shell / settings-card vibe; border-primary/20 per spec */
const ADMIN_GLASS_SURFACE =
  "rounded-2xl border border-primary/20 bg-zinc-950/65 backdrop-blur-md shadow-[0_0_32px_-14px_hsl(var(--primary)/0.28)] ring-1 ring-primary/12";

const STAT_GLASS = cn(
  STAT_TILE,
  "border-primary/20 shadow-[0_0_26px_-12px_hsl(var(--primary)/0.22)] ring-primary/12",
);

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

function EmptyBlock({
  icon: Icon,
  title,
  hint,
}: {
  icon: typeof PackageOpen;
  title: string;
  hint: string;
}) {
  return (
    <div
      className={cn(
        PANEL_INSET,
        "border border-dashed border-primary/25 bg-zinc-950/40 py-14 shadow-[inset_0_1px_0_0_hsl(var(--primary)/0.06)] ring-1 ring-primary/8",
      )}
    >
      <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary shadow-[0_0_24px_-10px_hsl(var(--primary)/0.45)] ring-1 ring-primary/15">
          <Icon className="h-7 w-7 opacity-90" aria-hidden />
        </span>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

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
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#0A0A0A] text-muted-foreground"
        dir="rtl"
      >
        <Loader2 className="h-9 w-9 animate-spin text-primary" aria-hidden />
        <span className="text-sm font-medium text-foreground/80">جاري تحميل تفاصيل المستخدم…</span>
      </div>
    );
  }

  if (detailsQuery.isError || !detailsQuery.data) {
    return (
      <AdminShell activeKey="users" onLogout={handleLogout}>
        <div
          className={cn(
            ADMIN_GLASS_SURFACE,
            "border-red-500/35 bg-red-950/20 p-10 text-center text-red-100 ring-red-500/15",
          )}
        >
          <p className="text-sm font-medium">تعذر تحميل تفاصيل المستخدم.</p>
          <button
            type="button"
            onClick={() => navigate("/admin/users")}
            className={cn(BTN_TOOLBAR_OUTLINE, "mx-auto mt-6 px-5 py-2.5 text-sm")}
          >
            العودة إلى قائمة المستخدمين
          </button>
        </div>
      </AdminShell>
    );
  }

  const details = detailsQuery.data;
  const u = details.user;

  return (
    <AdminShell activeKey="users" onLogout={handleLogout}>
      <div className="space-y-6" dir="rtl">
        {/* Top bar: back + actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => navigate("/admin/users")}
            className={cn(
              BTN_TOOLBAR_OUTLINE,
              "inline-flex w-fit items-center gap-2 px-4 py-2.5 text-sm font-semibold",
            )}
          >
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
            رجوع إلى المستخدمين
          </button>
          <div className="flex flex-wrap gap-2">
            {u.status === "banned" ? (
              <button
                type="button"
                onClick={() => statusMutation.mutate({ id: u.id, nextStatus: "active" })}
                disabled={actionPending}
                className={cn(
                  ADMIN_ROW_ACTION_BASE,
                  "border-emerald-500/45 bg-emerald-600/15 px-4 py-2 text-emerald-100 shadow-[0_0_18px_-10px_rgba(16,185,129,0.25)]",
                )}
              >
                <ShieldOff className="h-4 w-4" aria-hidden />
                فك الحظر
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setPendingBan({ id: u.id, name: u.name })}
                disabled={actionPending}
                className={cn(
                  ADMIN_ROW_ACTION_BASE,
                  BTN_FIX,
                  "border-red-500/50 bg-red-950/45 px-4 py-2 text-red-100 shadow-[0_0_20px_-10px_rgba(239,68,68,0.35)]",
                  "hover:border-red-400/60 hover:bg-red-900/55 hover:shadow-[0_0_22px_-8px_rgba(239,68,68,0.4)]",
                )}
              >
                <Shield className="h-4 w-4" aria-hidden />
                حظر المستخدم
              </button>
            )}
          </div>
        </div>

        {/* Hero */}
        <section className={cn(ADMIN_GLASS_SURFACE, "relative overflow-hidden p-6 sm:p-8")}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.14),transparent_55%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
            <div className="flex shrink-0 justify-center lg:justify-start">
              <div className="relative">
                <span className="absolute -inset-1 rounded-[1.35rem] bg-gradient-to-br from-primary/35 via-primary/10 to-transparent opacity-80 blur-sm" />
                <Avatar className="relative h-28 w-28 border-2 border-primary/35 shadow-[0_0_32px_-8px_hsl(var(--primary)/0.5)] ring-2 ring-primary/20 sm:h-32 sm:w-32">
                  <AvatarImage src={mediaSrc(u.avatarUrl)} alt="" className="object-cover" />
                  <AvatarFallback className="bg-zinc-900 text-2xl font-bold text-primary">
                    {initials(u.name)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-4 text-right">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0 space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary/80">
                    ملف المستخدم
                  </p>
                  <h1 className={cn(AUTH_HEADER_TITLE, "text-2xl sm:text-3xl")}>{u.name}</h1>
                  <p className="text-sm text-muted-foreground">
                    معرف الحساب{" "}
                    <span className="font-mono tabular-nums text-foreground/90">#{u.id}</span>
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-full border px-4 py-1.5 text-xs font-semibold shadow-[0_0_18px_-8px_hsl(var(--primary)/0.2)]",
                    u.status === "banned"
                      ? "border-red-500/45 bg-red-950/40 text-red-100 ring-1 ring-red-500/20"
                      : "border-emerald-500/45 bg-emerald-500/12 text-emerald-100 ring-1 ring-emerald-500/15",
                  )}
                >
                  <Sparkles className="h-3.5 w-3.5 opacity-90" aria-hidden />
                  {u.status === "banned" ? "محظور" : "نشط"}
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div
                  className={cn(
                    SUB_CARD,
                    "flex items-center gap-3 border-primary/20 bg-zinc-950/50 p-3.5 sm:p-4",
                  )}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                    <Mail className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 text-right">
                    <p className="text-[11px] font-medium text-muted-foreground">البريد الإلكتروني</p>
                    <p className="truncate text-sm font-medium text-foreground">{u.email}</p>
                    {u.emailVerified ? (
                      <p className="mt-0.5 text-[11px] text-emerald-400/90">موثّق</p>
                    ) : (
                      <p className="mt-0.5 text-[11px] text-amber-300/90">غير موثّق</p>
                    )}
                  </div>
                </div>

                <div
                  className={cn(
                    SUB_CARD,
                    "flex items-center gap-3 border-primary/20 bg-zinc-950/50 p-3.5 sm:p-4",
                  )}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                    <MapPin className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 text-right">
                    <p className="text-[11px] font-medium text-muted-foreground">المدينة</p>
                    <p className="text-sm font-medium text-foreground">{u.city?.trim() || "—"}</p>
                  </div>
                </div>

                <div
                  className={cn(
                    SUB_CARD,
                    "flex items-center gap-3 border-primary/20 bg-zinc-950/50 p-3.5 sm:p-4",
                  )}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                    <Calendar className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 text-right">
                    <p className="text-[11px] font-medium text-muted-foreground">تاريخ الإنشاء</p>
                    <p className="text-sm font-medium text-foreground tabular-nums">
                      {formatDate(u.createdAt)}
                    </p>
                  </div>
                </div>

                <div
                  className={cn(
                    SUB_CARD,
                    "flex items-center gap-3 border-primary/20 bg-zinc-950/50 p-3.5 sm:p-4",
                  )}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                    <Phone className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 text-right">
                    <p className="text-[11px] font-medium text-muted-foreground">الهاتف</p>
                    <p className="font-mono text-sm font-medium text-foreground tabular-nums">
                      {u.phone?.trim() || "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className={cn(STAT_GLASS, "p-5")}>
            <div className="flex items-start justify-between gap-3">
              <div className="text-right">
                <p className="text-xs font-medium text-muted-foreground">إجمالي الإعلانات</p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-primary">
                  {details.stats.adsCount.toLocaleString("ar-EG")}
                </p>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/12 text-primary shadow-[0_0_18px_-8px_hsl(var(--primary)/0.4)]">
                <Megaphone className="h-5 w-5" aria-hidden />
              </span>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">كل الإعلانات المرتبطة بهذا الحساب</p>
          </div>
          <div className={cn(STAT_GLASS, "p-5")}>
            <div className="flex items-start justify-between gap-3">
              <div className="text-right">
                <p className="text-xs font-medium text-muted-foreground">البلاغات</p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-amber-200">
                  {details.stats.reportsCount.toLocaleString("ar-EG")}
                </p>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-500/35 bg-amber-500/10 text-amber-200 shadow-[0_0_18px_-8px_rgba(245,158,11,0.25)]">
                <Flag className="h-5 w-5" aria-hidden />
              </span>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">بلاغات تخص هذا المستخدم</p>
          </div>
          <div className={cn(STAT_GLASS, "p-5")}>
            <div className="flex items-start justify-between gap-3">
              <div className="text-right">
                <p className="text-xs font-medium text-muted-foreground">تذاكر الدعم</p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-sky-200">
                  {details.stats.supportTicketsCount.toLocaleString("ar-EG")}
                </p>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-sky-500/35 bg-sky-500/10 text-sky-200 shadow-[0_0_18px_-8px_rgba(56,189,248,0.22)]">
                <LifeBuoy className="h-5 w-5" aria-hidden />
              </span>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">محادثات الدعم المفتوحة أو المغلقة</p>
          </div>
        </section>

        {/* Ads */}
        <section className={cn(CARD_SHELL, "border-primary/20 p-5 sm:p-6")}>
          <div className="mb-5 flex flex-col gap-1 text-right sm:mb-6">
            <p className={SETTINGS_SECTION_TITLE}>النشاط التجاري</p>
            <h2 className="text-lg font-semibold text-foreground sm:text-xl">إعلانات المستخدم</h2>
            <p className="text-sm text-muted-foreground">آخر الإعلانات المسجلة لهذا الحساب</p>
          </div>
          {details.ads.length === 0 ? (
            <EmptyBlock
              icon={PackageOpen}
              title="لا توجد إعلانات"
              hint="لم يُنشئ هذا المستخدم أي إعلان بعد، أو تمت إزالة كل السجلات المرتبطة به."
            />
          ) : (
            <ul className="space-y-3">
              {details.ads.map((ad) => (
                <li
                  key={ad.id}
                  className={cn(
                    SUB_CARD,
                    "border-primary/20 bg-zinc-950/55 p-4 transition-all duration-200 hover:border-primary/40 hover:shadow-[0_0_24px_-12px_hsl(var(--primary)/0.2)]",
                  )}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 text-right">
                      <p className="font-semibold text-foreground">
                        <span className="font-mono text-primary/90">#{ad.id}</span> — {ad.title}
                      </p>
                      <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          الحالة:{" "}
                          <span className="font-medium text-foreground/90">{ad.status}</span>
                        </span>
                        <span>المدينة: {ad.city || "—"}</span>
                        <span className="tabular-nums">المشاهدات: {ad.views.toLocaleString("ar-EG")}</span>
                        {ad.createdAt ? (
                          <span className="tabular-nums">{formatDate(ad.createdAt)}</span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Reports */}
        <section className={cn(CARD_SHELL, "border-primary/20 p-5 sm:p-6")}>
          <div className="mb-5 flex flex-col gap-1 text-right sm:mb-6">
            <p className={SETTINGS_SECTION_TITLE}>السلامة والامتثال</p>
            <h2 className="text-lg font-semibold text-foreground sm:text-xl">البلاغات المرتبطة</h2>
            <p className="text-sm text-muted-foreground">بلاغات وُجهت ضد هذا المستخدم أو نشاطه</p>
          </div>
          {details.reports.length === 0 ? (
            <EmptyBlock
              icon={Flag}
              title="لا توجد بلاغات"
              hint="لا توجد سجلات بلاغات لهذا المستخدم في الفترة الحالية."
            />
          ) : (
            <ul className="space-y-3">
              {details.reports.map((report) => (
                <li
                  key={report.id}
                  className={cn(
                    SUB_CARD,
                    "border-primary/20 bg-zinc-950/55 p-4 transition-all duration-200 hover:border-primary/40 hover:shadow-[0_0_24px_-12px_hsl(var(--primary)/0.2)]",
                  )}
                >
                  <p className="font-semibold text-foreground">
                    <span className="font-mono text-amber-200/90">#{report.id}</span> — {report.reason}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    الحالة:{" "}
                    <span className="font-medium text-foreground/90">{report.status}</span>
                    {" · "}
                    المبلّغ: {report.reporterName?.trim() || "—"}
                    {report.createdAt ? (
                      <>
                        {" · "}
                        <span className="tabular-nums">{formatDate(report.createdAt)}</span>
                      </>
                    ) : null}
                  </p>
                  {report.description?.trim() ? (
                    <p className="mt-2 line-clamp-2 rounded-xl border border-primary/15 bg-zinc-900/50 px-3 py-2 text-xs text-muted-foreground">
                      {report.description}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Support */}
        <section className={cn(CARD_SHELL, "border-primary/20 p-5 sm:p-6")}>
          <div className="mb-5 flex flex-col gap-1 text-right sm:mb-6">
            <p className={SETTINGS_SECTION_TITLE}>الدعم</p>
            <h2 className="text-lg font-semibold text-foreground sm:text-xl">تذاكر الدعم</h2>
            <p className="text-sm text-muted-foreground">طلبات المساعدة المفتوحة من هذا الحساب</p>
          </div>
          {details.supportTickets.length === 0 ? (
            <EmptyBlock
              icon={LifeBuoy}
              title="لا توجد تذاكر دعم"
              hint="لم يُفتح أي تذكرة دعم من هذا المستخدم بعد."
            />
          ) : (
            <ul className="space-y-3">
              {details.supportTickets.map((ticket) => (
                <li
                  key={ticket.id}
                  className={cn(
                    SUB_CARD,
                    "border-primary/20 bg-zinc-950/55 p-4 transition-all duration-200 hover:border-primary/40 hover:shadow-[0_0_24px_-12px_hsl(var(--primary)/0.2)]",
                  )}
                >
                  <p className="font-semibold text-foreground">
                    <span className="font-mono text-sky-200/90">#{ticket.id}</span> — {ticket.subject}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    النوع: {ticket.category}
                    {" · "}
                    الحالة:{" "}
                    <span className="font-medium text-foreground/90">{ticket.status}</span>
                    {" · "}
                    الأولوية: {ticket.priority}
                    {ticket.createdAt ? (
                      <>
                        {" · "}
                        <span className="tabular-nums">{formatDate(ticket.createdAt)}</span>
                      </>
                    ) : null}
                  </p>
                </li>
              ))}
            </ul>
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

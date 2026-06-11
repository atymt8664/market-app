import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Check,
  ChevronRight,
  Flag,
  LifeBuoy,
  Loader2,
  Mail,
  MapPin,
  Megaphone,
  Phone,
  Shield,
  ShieldOff,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { adminLogout, reviewAdminUserAvatar, updateAdminUserStatus } from "@/features/admin/api";
import { ModerationReasonDialog } from "@/features/admin/components/moderation-reason-dialog";
import {
  ADMIN_ROW_ACTION_BASE,
  BTN_FIX,
  BTN_MODAL_GHOST,
  BTN_TOOLBAR_OUTLINE,
  CARD_SHELL,
  STAT_TILE,
  SUB_CARD,
} from "@/features/admin/admin-interaction-classes";
import { AdminShell } from "@/features/admin/components/admin-shell";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminPageLoading,
} from "@/features/admin/components/admin-page-states";
import { useAdminUserDetails, useRequireAdmin } from "@/features/admin/hooks";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";
import { AUTH_HEADER_TITLE } from "@/lib/auth-page-styles";
import { useAdminLocale } from "@/features/admin/hooks/use-admin-locale";
import { adminIntlLocale, formatAdminDateTime } from "@/features/admin/admin-locale";
import { getLocale, t } from "@/i18n";
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
  if (!iso) return t("p8.admin.common.dash");
  try {
    return formatAdminDateTime(iso, getLocale(), { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function EmptyBlock({
  title,
  hint,
}: {
  title: string;
  hint: string;
}) {
  return <AdminEmptyState title={title} description={hint} />;
}

export default function AdminUserDetailsPage() {
  const { dir, formatNumber, formatDateTime } = useAdminLocale();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/admin/users/:id");
  const userId = Number(params?.id || 0);
  const meQuery = useRequireAdmin();
  const detailsQuery = useAdminUserDetails(Number.isInteger(userId) && userId > 0 ? userId : null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pendingBan, setPendingBan] = useState<{ id: number; name: string } | null>(null);
  const [pendingAvatarReject, setPendingAvatarReject] = useState(false);

  function isFounderUser(user: { id: number; name: string }) {
    return user.id === 1 || user.name.trim().toLowerCase() === "mohamed";
  }

  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: number; nextStatus: "active" | "banned" }) =>
      updateAdminUserStatus(id, nextStatus),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "users", "details", userId] });
      toast({ title: t("p8.admin.user_details.toast_status_updated") });
    },
    onError: (error) => {
      toast({
        title: t("p8.admin.user_details.toast_status_fail"),
        description: error instanceof Error ? error.message : t("p8.admin.common.error_generic"),
        variant: "destructive",
      });
    },
  });

  const avatarReviewMutation = useMutation({
    mutationFn: ({
      decision,
      reason,
    }: {
      decision: "approve" | "reject";
      reason?: string;
    }) => reviewAdminUserAvatar(userId, decision, reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "users", "details", userId] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      toast({ title: t("p8.admin.user_details.toast_avatar_reviewed") });
    },
    onError: (error) => {
      toast({
        title: t("p8.admin.user_details.toast_avatar_review_fail"),
        description: error instanceof Error ? error.message : t("p8.admin.common.error_generic"),
        variant: "destructive",
      });
    },
  });

  const handleLogout = async () => {
    await adminLogout();
    navigate("/admin-login");
  };

  const actionPending = statusMutation.isPending || avatarReviewMutation.isPending;

  const confirmBan = () => {
    if (!pendingBan) return;
    if (isFounderUser(pendingBan)) {
      toast({
        title: t("p8.admin.user_details.protected_title"),
        description: t("p8.admin.user_details.protected_hint"),
        variant: "destructive",
      });
      setPendingBan(null);
      return;
    }
    statusMutation.mutate(
      { id: pendingBan.id, nextStatus: "banned" },
      { onSettled: () => setPendingBan(null) },
    );
  };

  if (meQuery.isLoading || detailsQuery.isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A]">
        <AdminPageLoading message={t("p8.admin.user_details.loading")} />
      </div>
    );
  }

  if (detailsQuery.isError || !detailsQuery.data) {
    return (
      <AdminShell activeKey="users" onLogout={handleLogout}>
        <div className="space-y-4">
          <AdminErrorState
            title={t("p8.admin.user_details.load_error")}
            onRetry={() => void detailsQuery.refetch()}
          />
          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate("/admin/users")}
              className={cn(BTN_TOOLBAR_OUTLINE, "px-5 py-2.5 text-sm")}
            >
              {t("p8.admin.user_details.back_to_users")}
            </button>
          </div>
        </div>
      </AdminShell>
    );
  }

  const details = detailsQuery.data;
  const u = details.user;

  return (
    <AdminShell activeKey="users" onLogout={handleLogout}>
      <div className="space-y-6">
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
            {t("p8.admin.user_details.back")}
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
                {t("p8.admin.user_details.unban")}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (isFounderUser(u)) {
                    toast({
                      title: t("p8.admin.user_details.protected_title"),
                      description: t("p8.admin.user_details.protected_hint"),
                      variant: "destructive",
                    });
                    return;
                  }
                  setPendingBan({ id: u.id, name: u.name });
                }}
                disabled={actionPending || isFounderUser(u)}
                className={cn(
                  ADMIN_ROW_ACTION_BASE,
                  BTN_FIX,
                  "border-red-500/50 bg-red-950/45 px-4 py-2 text-red-100 shadow-[0_0_20px_-10px_rgba(239,68,68,0.35)]",
                  "hover:border-red-400/60 hover:bg-red-900/55 hover:shadow-[0_0_22px_-8px_rgba(239,68,68,0.4)]",
                )}
              >
                <Shield className="h-4 w-4" aria-hidden />
                {t("p8.admin.user_details.ban")}
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
                    {t("p8.admin.user_details.profile_label")}
                  </p>
                  <h1 className={cn(AUTH_HEADER_TITLE, "text-2xl sm:text-3xl")}>{u.name}</h1>
                  <p className="text-sm text-muted-foreground">
                    {t("p8.admin.user_details.account_id")}{" "}
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
                  {u.status === "banned" ? t("p8.admin.user_details.status_banned") : t("p8.admin.user_details.status_active")}
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
                    <p className="text-[11px] font-medium text-muted-foreground">{t("p8.admin.user_details.email")}</p>
                    <p className="truncate text-sm font-medium text-foreground">{u.email}</p>
                    {u.emailVerified ? (
                      <p className="mt-0.5 text-[11px] text-emerald-400/90">{t("p8.admin.user_details.verified")}</p>
                    ) : (
                      <p className="mt-0.5 text-[11px] text-amber-300/90">{t("p8.admin.user_details.unverified")}</p>
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
                    <p className="text-[11px] font-medium text-muted-foreground">{t("p8.admin.user_details.city")}</p>
                    <p className="text-sm font-medium text-foreground">{u.city?.trim() || t("p8.admin.common.dash")}</p>
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
                    <p className="text-[11px] font-medium text-muted-foreground">{t("p8.admin.user_details.created_at")}</p>
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
                    <p className="text-[11px] font-medium text-muted-foreground">{t("p8.admin.user_details.phone")}</p>
                    <p className="font-mono text-sm font-medium text-foreground tabular-nums">
                      {u.phone?.trim() || t("p8.admin.common.dash")}
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
                <p className="text-xs font-medium text-muted-foreground">{t("p8.admin.user_details.stats_ads")}</p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-primary">
                  {details.stats.adsCount.toLocaleString(adminIntlLocale(getLocale()))}
                </p>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/12 text-primary shadow-[0_0_18px_-8px_hsl(var(--primary)/0.4)]">
                <Megaphone className="h-5 w-5" aria-hidden />
              </span>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">{t("p8.admin.user_details.stats_ads_hint")}</p>
          </div>
          <div className={cn(STAT_GLASS, "p-5")}>
            <div className="flex items-start justify-between gap-3">
              <div className="text-right">
                <p className="text-xs font-medium text-muted-foreground">{t("p8.admin.user_details.stats_reports")}</p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-amber-200">
                  {details.stats.reportsCount.toLocaleString(adminIntlLocale(getLocale()))}
                </p>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-500/35 bg-amber-500/10 text-amber-200 shadow-[0_0_18px_-8px_rgba(245,158,11,0.25)]">
                <Flag className="h-5 w-5" aria-hidden />
              </span>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">{t("p8.admin.user_details.stats_reports_hint")}</p>
          </div>
          <div className={cn(STAT_GLASS, "p-5")}>
            <div className="flex items-start justify-between gap-3">
              <div className="text-right">
                <p className="text-xs font-medium text-muted-foreground">{t("p8.admin.user_details.stats_support")}</p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-sky-200">
                  {details.stats.supportTicketsCount.toLocaleString(adminIntlLocale(getLocale()))}
                </p>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-sky-500/35 bg-sky-500/10 text-sky-200 shadow-[0_0_18px_-8px_rgba(56,189,248,0.22)]">
                <LifeBuoy className="h-5 w-5" aria-hidden />
              </span>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">{t("p8.admin.user_details.stats_support_hint")}</p>
          </div>
        </section>

        {u.avatarPendingReview ? (
          <section className={cn(CARD_SHELL, "border-amber-500/35 p-5 sm:p-6 ring-amber-500/15")}>
            <div className="mb-4 flex flex-col gap-1 text-right">
              <p className={SETTINGS_SECTION_TITLE}>{t("p8.admin.user_details.avatar_review_section")}</p>
              <h2 className="text-lg font-semibold text-foreground sm:text-xl">{t("p8.admin.user_details.avatar_pending_title")}</h2>
              <p className="text-sm text-muted-foreground">{t("p8.admin.user_details.avatar_review_hint")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={actionPending}
                onClick={() => avatarReviewMutation.mutate({ decision: "approve" })}
                className={cn(
                  ADMIN_ROW_ACTION_BASE,
                  "border-emerald-500/45 bg-emerald-600/15 px-4 py-2 text-emerald-100",
                )}
              >
                <Check className="h-4 w-4" aria-hidden />
                {t("p8.admin.user_details.approve_avatar")}
              </button>
              <button
                type="button"
                disabled={actionPending}
                onClick={() => setPendingAvatarReject(true)}
                className={cn(
                  ADMIN_ROW_ACTION_BASE,
                  "border-orange-500/45 bg-orange-600/12 px-4 py-2 text-orange-100",
                )}
              >
                <XCircle className="h-4 w-4" aria-hidden />
                {t("p8.admin.user_details.reject_avatar")}
              </button>
            </div>
          </section>
        ) : null}

        {/* Ads */}
        <section className={cn(CARD_SHELL, "border-primary/20 p-5 sm:p-6")}>
          <div className="mb-5 flex flex-col gap-1 text-right sm:mb-6">
            <p className={SETTINGS_SECTION_TITLE}>{t("p8.admin.user_details.commercial_section")}</p>
            <h2 className="text-lg font-semibold text-foreground sm:text-xl">{t("p8.admin.user_details.ads_title")}</h2>
            <p className="text-sm text-muted-foreground">{t("p8.admin.user_details.ads_subtitle")}</p>
          </div>
          {details.ads.length === 0 ? (
            <EmptyBlock
              title={t("p8.admin.user_details.ads_empty_title")}
              hint={t("p8.admin.user_details.ads_empty_hint")}
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
                          {t("p8.admin.user_details.label_status")}{" "}
                          <span className="font-medium text-foreground/90">{ad.status}</span>
                        </span>
                        <span>{t("p8.admin.user_details.label_city")} {ad.city || t("p8.admin.common.dash")}</span>
                        <span className="tabular-nums">{t("p8.admin.user_details.label_views")} {ad.views.toLocaleString(adminIntlLocale(getLocale()))}</span>
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
            <p className={SETTINGS_SECTION_TITLE}>{t("p8.admin.user_details.safety_section")}</p>
            <h2 className="text-lg font-semibold text-foreground sm:text-xl">{t("p8.admin.user_details.reports_title")}</h2>
            <p className="text-sm text-muted-foreground">{t("p8.admin.user_details.reports_subtitle")}</p>
          </div>
          {details.reports.length === 0 ? (
            <EmptyBlock
              title={t("p8.admin.user_details.reports_empty_title")}
              hint={t("p8.admin.user_details.reports_empty_hint")}
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
                    {t("p8.admin.user_details.label_status")}{" "}
                    <span className="font-medium text-foreground/90">{report.status}</span>
                    {" · "}
                    {t("p8.admin.user_details.label_reporter")} {report.reporterName?.trim() || t("p8.admin.common.dash")}
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
            <p className={SETTINGS_SECTION_TITLE}>{t("p8.admin.user_details.support_section")}</p>
            <h2 className="text-lg font-semibold text-foreground sm:text-xl">{t("p8.admin.user_details.support_title")}</h2>
            <p className="text-sm text-muted-foreground">{t("p8.admin.user_details.support_subtitle")}</p>
          </div>
          {details.supportTickets.length === 0 ? (
            <EmptyBlock
              title={t("p8.admin.user_details.support_empty_title")}
              hint={t("p8.admin.user_details.support_empty_hint")}
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
                    {t("p8.admin.user_details.label_type")} {ticket.category}
                    {" · "}
                    {t("p8.admin.user_details.label_status")}{" "}
                    <span className="font-medium text-foreground/90">{ticket.status}</span>
                    {" · "}
                    {t("p8.admin.user_details.label_priority")} {ticket.priority}
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
         
          className="z-[100] max-w-md rounded-2xl border border-primary/40 bg-zinc-950 shadow-[0_0_32px_-12px_hsl(var(--primary)/0.35)] ring-1 ring-primary/15 sm:rounded-2xl"
        >
          <AlertDialogHeader className="text-right sm:text-right">
            <AlertDialogTitle className="text-lg font-semibold text-foreground">{t("p8.admin.user_details.ban_confirm_title")}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
              {pendingBan
                ? t("p8.admin.user_details.ban_confirm_body", {
                    name: pendingBan.name,
                    id: pendingBan.id,
                  })
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
              disabled={actionPending || !pendingBan}
              title={actionPending ? t("p8.admin.user_details.action_pending") : undefined}
              className={cn(
                buttonVariants({ variant: "destructive", size: "default" }),
                BTN_FIX,
                "cursor-pointer rounded-xl transition-all duration-150 ease-out hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
              )}
              onClick={() => confirmBan()}
            >
              {actionPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {t("p8.admin.user_details.confirm_ban")}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ModerationReasonDialog
        open={pendingAvatarReject}
        onOpenChange={setPendingAvatarReject}
        presetContext="avatar"
        title={t("p8.admin.user_details.avatar_reject_title")}
        description={t("p8.admin.user_details.avatar_review_hint")}
        confirmLabel={t("p8.admin.user_details.confirm_avatar_reject")}
        onConfirm={(reason) => {
          avatarReviewMutation.mutate(
            { decision: "reject", reason },
            { onSettled: () => setPendingAvatarReject(false) },
          );
        }}
      />
    </AdminShell>
  );
}

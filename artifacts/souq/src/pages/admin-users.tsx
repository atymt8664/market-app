import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
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
import { AdminScrollableTable } from "@/features/admin/components/admin-scrollable-table";
import { AdminPaginationBar } from "@/features/admin/components/admin-pagination-bar";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminPageLoading,
} from "@/features/admin/components/admin-page-states";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { useAdminUserDetails, useAdminUsers, useRequireAdmin } from "@/features/admin/hooks";
import type { AdminUser } from "@/features/admin/types";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";
import { AUTH_HEADER_TITLE } from "@/lib/auth-page-styles";
import { getLocale, t } from "@/i18n";
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

const STATUS_FILTER_KEYS = ["all", "active", "banned"] as const;

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
  const localeTag = getLocale() === "ar" ? "ar-EG" : getLocale() === "de" ? "de-DE" : "en-US";
  try {
    return new Date(iso).toLocaleString(localeTag, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

const inputClass =
  "w-full rounded-2xl border border-primary/30 bg-zinc-900/90 px-4 py-2.5 text-sm text-foreground outline-none ring-1 ring-primary/5 transition placeholder:text-muted-foreground focus:border-primary/55 focus:ring-2 focus:ring-primary/25";

export default function AdminUsersPage() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const meQuery = useRequireAdmin();

  const avatarReviewFilter =
    new URLSearchParams(searchString).get("avatarReview") === "pending" ? "pending" : undefined;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [status, setStatus] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [pendingBan, setPendingBan] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    setPage(1);
  }, [status, search, avatarReviewFilter]);

  const usersQuery = useAdminUsers({ status, q: search, avatarReview: avatarReviewFilter, page, pageSize });
  const detailsQuery = useAdminUserDetails(selectedUserId);

  const users = useMemo(() => usersQuery.data?.items ?? [], [usersQuery.data]);
  const pagination = usersQuery.data?.pagination;

  const statusOptions = useMemo(
    () =>
      STATUS_FILTER_KEYS.map((key) => ({
        key,
        label: t(`p8.admin.users.filter_${key}` as "p8.admin.users.filter_all"),
      })),
    [],
  );

  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: number; nextStatus: "active" | "banned" }) =>
      updateAdminUserStatus(id, nextStatus),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "nav-badges"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      await queryClient.invalidateQueries({
        queryKey: ["admin", "users", "details", variables.id],
      });
      toast({ title: t("p8.admin.users.toast_status_updated") });
    },
    onError: (error) => {
      toast({
        title: t("p8.admin.users.toast_status_failed"),
        description: error instanceof Error ? error.message : t("p8.admin.common.unexpected_error"),
        variant: "destructive",
      });
    },
  });

  const closeUserModal = useCallback(() => {
    setSelectedUserId(null);
  }, []);

  const requestBan = (user: AdminUser) => {
    if (user.id === 1 || user.name.trim().toLowerCase() === "mohamed") {
      toast({
        title: t("p8.admin.users.protected"),
        description: t("p8.admin.users.protected_hint"),
        variant: "destructive",
      });
      return;
    }
    setPendingBan({ id: user.id, name: user.name });
  };

  function isFounderUser(user: Pick<AdminUser, "id" | "name">) {
    return user.id === 1 || user.name.trim().toLowerCase() === "mohamed";
  }

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
        <span className="sr-only">{t("p8.admin.page.loading")}</span>
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
            <h1 className={cn(AUTH_HEADER_TITLE, "text-2xl md:text-[1.65rem]")}>{t("p8.admin.users.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("p8.admin.users.subtitle")}</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-zinc-900/90 px-3 py-1.5 text-xs text-muted-foreground ring-1 ring-primary/10">
            <Users className="h-3.5 w-3.5 text-primary" aria-hidden />
            {t("p8.admin.users.list_count", {
              count: (pagination?.totalItems ?? users.length).toLocaleString(
                getLocale() === "ar" ? "ar-EG" : getLocale() === "de" ? "de-DE" : "en-US",
              ),
            })}
          </span>
        </header>

        {avatarReviewFilter === "pending" ? (
          <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 ring-1 ring-amber-500/15">
            {t("p8.admin.users.avatar_review_banner")}{" "}
            <button
              type="button"
              className="font-semibold text-primary underline-offset-2 hover:underline"
              onClick={() => navigate("/admin/users")}
            >
              {t("p8.admin.users.show_all")}
            </button>
          </div>
        ) : null}

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
                  placeholder={t("p8.admin.users.search_placeholder")}
                  className={cn(inputClass, "pr-10")}
                  aria-label={t("p8.admin.users.search_aria")}
                />
              </div>
              <Button type="submit" className={BTN_SEARCH}>
                {t("p8.admin.common.search")}
              </Button>
            </form>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((item) => (
                <button key={item.key} type="button" onClick={() => setStatus(item.key)} className={adminPillBtn(status === item.key)}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {usersQuery.isLoading ? (
            <AdminPageLoading message={t("p8.admin.users.loading")} />
          ) : usersQuery.isError ? (
            <AdminErrorState
              title={t("p8.admin.users.load_error")}
              description={t("p8.admin.users.load_error_hint")}
              onRetry={() => usersQuery.refetch()}
            />
          ) : users.length === 0 ? (
            <AdminEmptyState title={t("p8.admin.users.empty_title")} description={t("p8.admin.users.empty_body")} />
          ) : (
            <AdminScrollableTable
              items={users}
              minWidth="min-w-[920px]"
              head={
                <tr>
                  <th className="px-3 py-3 text-right font-medium">{t("p8.admin.users.col_id")}</th>
                  <th className="px-3 py-3 text-right font-medium">{t("p8.admin.users.col_user")}</th>
                  <th className="px-3 py-3 text-right font-medium">{t("p8.admin.users.col_email")}</th>
                  <th className="px-3 py-3 text-right font-medium">{t("p8.admin.users.col_status")}</th>
                  <th className="px-3 py-3 text-right font-medium">{t("p8.admin.users.col_created")}</th>
                  <th className="px-3 py-3 text-center font-medium">{t("p8.admin.users.col_actions")}</th>
                </tr>
              }
              getRowKey={(user) => user.id}
              renderRow={(user) => (
                <tr
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
                      {user.status === "banned" ? t("p8.admin.users.status_banned") : t("p8.admin.users.status_active")}
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
                        {t("p8.admin.common.details")}
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
                            {t("p8.admin.users.unban")}
                          </>
                        ) : (
                          <>
                            <Shield className="h-3.5 w-3.5" aria-hidden />
                            {t("p8.admin.users.ban")}
                          </>
                        )}
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
            isLoading={usersQuery.isFetching}
          />
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
                  {t("p8.admin.users.detail_loading")}
                </div>
              ) : detailsQuery.isError || !detailsQuery.data ? (
                <AdminErrorState
                  title={t("p8.admin.users.detail_load_error")}
                  onRetry={() => detailsQuery.refetch()}
                  className="border-0 bg-transparent py-8 ring-0"
                />
              ) : (
                <>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <h2 id="admin-user-modal-title" className="text-xl font-semibold text-foreground">
                      {t("p8.admin.users.detail_title", { id: detailsQuery.data.user.id })}
                    </h2>
                    <button
                      type="button"
                      onClick={closeUserModal}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-2xl border-primary/35")}
                    >
                      {t("p8.admin.common.close")}
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
                          {t("p8.admin.users.field_phone")} {detailsQuery.data.user.phone || t("p8.admin.common.dash")} ·{" "}
                          {t("p8.admin.users.field_city")} {detailsQuery.data.user.city || t("p8.admin.common.dash")}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {t("p8.admin.users.field_email_verified")}{" "}
                          {detailsQuery.data.user.emailVerified ? t("p8.admin.users.yes") : t("p8.admin.users.no")}
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
                      {detailsQuery.data.user.status === "banned" ? t("p8.admin.users.status_banned") : t("p8.admin.users.status_active")}
                    </span>
                    <span className="rounded-full border border-primary/25 bg-zinc-900/60 px-2.5 py-1 text-xs text-muted-foreground">
                      {t("p8.admin.users.registered_label", { date: formatDate(detailsQuery.data.user.createdAt) })}
                    </span>
                    <span className="rounded-full border border-dashed border-primary/30 px-2.5 py-1 text-xs text-muted-foreground">
                      {t("p8.admin.users.last_activity")}{" "}
                      {detailsQuery.data.user.lastSeenAt
                        ? formatDate(detailsQuery.data.user.lastSeenAt)
                        : t("p8.admin.users.never_logged")}
                    </span>
                  </div>

                  <div className="mb-4 grid grid-cols-3 gap-2">
                    <div className={cn(CARD_SHELL, "p-3 text-center")}>
                      <p className="text-[11px] text-muted-foreground">{t("p8.admin.users.stat_ads")}</p>
                      <p className="text-lg font-semibold tabular-nums text-primary">
                        {detailsQuery.data.stats.adsCount.toLocaleString(
                          getLocale() === "ar" ? "ar-EG" : getLocale() === "de" ? "de-DE" : "en-US",
                        )}
                      </p>
                    </div>
                    <div className={cn(CARD_SHELL, "p-3 text-center")}>
                      <p className="text-[11px] text-muted-foreground">{t("p8.admin.users.stat_reports")}</p>
                      <p className="text-lg font-semibold tabular-nums text-primary">
                        {detailsQuery.data.stats.reportsCount.toLocaleString(
                          getLocale() === "ar" ? "ar-EG" : getLocale() === "de" ? "de-DE" : "en-US",
                        )}
                      </p>
                    </div>
                    <div className={cn(CARD_SHELL, "p-3 text-center")}>
                      <p className="text-[11px] text-muted-foreground">{t("p8.admin.users.stat_support")}</p>
                      <p className="text-lg font-semibold tabular-nums text-primary">
                        {detailsQuery.data.stats.supportTicketsCount.toLocaleString(
                          getLocale() === "ar" ? "ar-EG" : getLocale() === "de" ? "de-DE" : "en-US",
                        )}
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
                      {t("p8.admin.users.link_public_profile")}
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
                      {t("p8.admin.users.link_full_details")}
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
                        {t("p8.admin.users.link_first_ad")}
                      </button>
                    ) : null}
                  </div>

                  {detailsQuery.data.ads.length > 0 ? (
                    <div className="mb-4 rounded-2xl border border-primary/25 bg-zinc-900/40 p-3 ring-1 ring-primary/10">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        {t("p8.admin.users.section_recent_ads", {
                          count: Math.min(5, detailsQuery.data.ads.length),
                        })}
                      </p>
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
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        {t("p8.admin.users.section_recent_reports", {
                          count: Math.min(5, detailsQuery.data.reports.length),
                        })}
                      </p>
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
                        {t("p8.admin.users.unban")}
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
                        {t("p8.admin.users.ban_user")}
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
            <AlertDialogTitle className="text-lg font-semibold text-foreground">{t("p8.admin.users.ban_confirm_title")}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
              {pendingBan ? t("p8.admin.users.ban_confirm_body", { name: pendingBan.name, id: pendingBan.id }) : null}
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
              title={actionPending ? t("p8.admin.common.action_pending") : undefined}
              className={cn(
                buttonVariants({ variant: "destructive", size: "default" }),
                BTN_FIX,
                "cursor-pointer rounded-xl transition-all duration-150 ease-out hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
              )}
              onClick={() => confirmBan()}
            >
              {actionPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {t("p8.admin.users.ban_confirm_label")}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}

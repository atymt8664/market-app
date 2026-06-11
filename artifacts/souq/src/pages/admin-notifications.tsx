import { useMemo, useState } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { adminLogout } from "@/features/admin/api";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { AdminNotificationItem } from "@/features/admin/components/admin-notification-item";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminPageLoading,
} from "@/features/admin/components/admin-page-states";
import {
  useAdminNotificationsQuery,
  useMarkAdminNotificationReadMutation,
  useMarkAllAdminNotificationsReadMutation,
} from "@/features/admin/hooks/use-admin-notifications";
import { useRequireAdmin } from "@/features/admin/hooks";
import type { AdminNotificationRow } from "@/features/admin/api/notifications";
import {
  adminNotificationTabs,
  computeAdminNotificationSummary,
  filterAdminNotificationsByTab,
  resolveAdminNotificationHref,
  type AdminNotificationTabId,
} from "@/lib/admin-notification-center";
import { CARD_SHELL } from "@/features/admin/admin-interaction-classes";
import { useAdminLocale } from "@/features/admin/hooks/use-admin-locale";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

export default function AdminNotificationsPage() {
  const { dir, formatNumber } = useAdminLocale();
  const [, navigate] = useLocation();
  const meQuery = useRequireAdmin();
  const listQuery = useAdminNotificationsQuery(!meQuery.isLoading);
  const markOne = useMarkAdminNotificationReadMutation();
  const markAll = useMarkAllAdminNotificationsReadMutation();
  const [activeTab, setActiveTab] = useState<AdminNotificationTabId>("all");
  const [busyId, setBusyId] = useState<number | null>(null);

  const items = listQuery.data ?? [];
  const summary = useMemo(() => computeAdminNotificationSummary(items), [items]);
  const tabs = useMemo(() => adminNotificationTabs(items), [items]);
  const filtered = useMemo(
    () => filterAdminNotificationsByTab(items, activeTab),
    [items, activeTab],
  );

  const onLogout = async () => {
    await adminLogout();
    navigate("/admin-login");
  };

  const handleOpen = async (n: AdminNotificationRow) => {
    setBusyId(n.id);
    try {
      if (!n.readAt) {
        try {
          await markOne.mutateAsync(n.id);
        } catch {
          /* navigate anyway */
        }
      }
      navigate(resolveAdminNotificationHref(n));
    } finally {
      setBusyId(null);
    }
  };

  if (meQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-[#0A0A0A]">
        <AdminPageLoading message={t("p8.admin.notifications.center.loading")} />
      </div>
    );
  }

  const errorMessage =
    listQuery.error instanceof Error
      ? listQuery.error.message
      : t("p8.admin.common.error_generic");

  return (
    <AdminShell activeKey="notifications" onLogout={onLogout}>
      <div className="space-y-5" dir={dir} data-admin-notification-center="1">
        <header className="flex flex-wrap items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/45 bg-primary/12 text-primary">
            <Bell className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 text-right">
            <h1 className="text-xl font-bold text-foreground md:text-2xl">
              {t("p8.admin.notifications.center.title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("p8.admin.notifications.center.page_subtitle")}
            </p>
          </div>
          <button
            type="button"
            disabled={markAll.isPending || summary.unread === 0}
            onClick={() => markAll.mutate()}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl border border-primary/35 bg-zinc-950/70 px-3 py-2 text-sm font-medium text-foreground transition",
              "hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {markAll.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <CheckCheck className="h-4 w-4 text-primary" aria-hidden />
            )}
            {t("p8.admin.notifications.center.mark_all_read")}
          </button>
        </header>

        <section className={cn(CARD_SHELL, "p-4")} data-admin-notification-summary="1">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-primary/25 bg-zinc-950/60 p-3 text-right">
              <p className="text-xs text-muted-foreground">{t("p8.admin.notifications.summary.total")}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{formatNumber(summary.total)}</p>
            </div>
            <div className="rounded-2xl border border-primary/35 bg-primary/8 p-3 text-right">
              <p className="text-xs text-muted-foreground">{t("p8.admin.notifications.summary.unread")}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-primary">{formatNumber(summary.unread)}</p>
            </div>
            <div className="rounded-2xl border border-red-500/35 bg-red-950/20 p-3 text-right">
              <p className="text-xs text-red-200/80">{t("p8.admin.notifications.summary.critical")}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-red-200">{formatNumber(summary.critical)}</p>
            </div>
            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/15 p-3 text-right">
              <p className="text-xs text-amber-100/80">{t("p8.admin.notifications.summary.high")}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-amber-100">
                {formatNumber(items.filter((n) => !n.readAt && n.priority <= 1).length)}
              </p>
            </div>
          </div>
        </section>

        <div
          className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label={t("p8.admin.notifications.center.tabs_label")}
        >
          {tabs.map((tab) => {
            const labelKey =
              tab.id === "all"
                ? "p8.admin.notifications.tab.all"
                : tab.id === "unread"
                  ? "p8.admin.notifications.tab.unread"
                  : `p8.admin.notifications.category.${tab.id}`;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "shrink-0 rounded-2xl border px-3 py-2 text-sm font-medium transition",
                  activeTab === tab.id
                    ? "border-primary/50 bg-primary/15 text-primary"
                    : "border-primary/20 bg-zinc-950/50 text-muted-foreground hover:border-primary/35",
                )}
                data-admin-notification-tab={tab.id}
              >
                {t(labelKey)} ({formatNumber(tab.count)})
              </button>
            );
          })}
        </div>

        {listQuery.isLoading ? (
          <AdminPageLoading message={t("p8.admin.notifications.center.loading")} />
        ) : listQuery.isError ? (
          <AdminErrorState message={errorMessage} onRetry={() => listQuery.refetch()} />
        ) : filtered.length === 0 ? (
          <AdminEmptyState
            title={t("p8.admin.notifications.center.empty")}
            description={t("p8.admin.notifications.center.empty_hint")}
          />
        ) : (
          <div className="space-y-2.5" data-admin-notification-list="1">
            {filtered.map((item) => (
              <AdminNotificationItem
                key={item.id}
                item={item}
                busy={busyId === item.id}
                onOpen={handleOpen}
              />
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}

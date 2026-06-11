import { Bell, ChevronLeft } from "lucide-react";
import { Link } from "wouter";
import { CARD_SHELL } from "@/features/admin/admin-interaction-classes";
import { dashboardContractAttrs } from "@/features/admin/dashboard-contracts";
import {
  useAdminNotificationUnreadQuery,
  useAdminNotificationsQuery,
} from "@/features/admin/hooks/use-admin-notifications";
import { AdminNotificationItem } from "@/features/admin/components/admin-notification-item";
import {
  computeAdminNotificationSummary,
  resolveAdminNotificationHref,
} from "@/lib/admin-notification-center";
import { useMarkAdminNotificationReadMutation } from "@/features/admin/hooks/use-admin-notifications";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useLocation } from "wouter";
import type { AdminNotificationRow } from "@/features/admin/api/notifications";

export function AdminNotificationCenterWidget() {
  const [, navigate] = useLocation();
  const listQuery = useAdminNotificationsQuery();
  const unreadQuery = useAdminNotificationUnreadQuery();
  const markRead = useMarkAdminNotificationReadMutation();
  const [busyId, setBusyId] = useState<number | null>(null);

  const items = listQuery.data ?? [];
  const summary = computeAdminNotificationSummary(items);
  const preview = items.filter((n) => !n.readAt).slice(0, 4);
  const unread = unreadQuery.data?.unread ?? summary.unread;

  const handleOpen = async (n: AdminNotificationRow) => {
    setBusyId(n.id);
    try {
      if (!n.readAt) {
        try {
          await markRead.mutateAsync(n.id);
        } catch {
          /* navigate anyway */
        }
      }
      navigate(resolveAdminNotificationHref(n));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section
      className={cn(CARD_SHELL, "p-4")}
      aria-labelledby="admin-notification-widget-title"
      {...dashboardContractAttrs("monitoring.notification_feed")}
    >
      <div className="mb-4 flex flex-wrap items-start gap-3">
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/45 bg-primary/12 text-primary">
          <Bell className="h-5 w-5" aria-hidden />
          {unread > 0 ? (
            <span className="absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </div>
        <div className="min-w-0 flex-1 space-y-1 text-right">
          <h2 id="admin-notification-widget-title" className="text-lg font-semibold text-foreground">
            {t("p8.admin.notifications.center.title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("p8.admin.notifications.center.subtitle")}</p>
        </div>
      </div>

      {summary.critical > 0 ? (
        <div className="mb-3 rounded-2xl border border-red-500/35 bg-red-950/25 px-3 py-2 text-right text-[13px] text-red-100">
          {t("p8.admin.notifications.center.critical_banner", { count: String(summary.critical) })}
        </div>
      ) : null}

      {listQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl border border-primary/15 bg-zinc-950/60" />
          ))}
        </div>
      ) : preview.length === 0 ? (
        <p className="rounded-2xl border border-primary/20 bg-zinc-950/50 px-3 py-6 text-center text-sm text-muted-foreground">
          {t("p8.admin.notifications.center.empty")}
        </p>
      ) : (
        <div className="space-y-2">
          {preview.map((item) => (
            <AdminNotificationItem
              key={item.id}
              item={item}
              busy={busyId === item.id}
              onOpen={handleOpen}
            />
          ))}
        </div>
      )}

      <div className="mt-4 flex justify-end border-t border-primary/15 pt-3">
        <Link
          href="/admin/notifications"
          className="inline-flex items-center gap-2 rounded-xl border border-primary/35 bg-zinc-950/60 px-3 py-2 text-sm font-medium text-primary transition hover:border-primary/50 hover:bg-zinc-900/80"
        >
          {t("p8.admin.notifications.center.view_all")}
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

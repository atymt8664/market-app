import { useCallback, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Bell } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
  unreadCountQueryKey,
} from "@/hooks/use-notifications";
import { NotificationsApiError, type AppNotification } from "@/lib/notifications-api";
import {
  filterNotificationsByTab,
  resolveNotificationHref,
  visibleNotificationTabs,
  type NotificationCenterTabId,
} from "@/lib/notification-center";
import { NotificationCenterItem } from "@/components/notification-center/notification-center-item";
import { NotificationCenterSummaryBar } from "@/components/notification-center/notification-center-summary";
import { NotificationCenterTabs } from "@/components/notification-center/notification-center-tabs";
import { computeNotificationCenterSummary } from "@/lib/notification-center-stats";
import {
  NotificationCenterEmptyState,
  NotificationCenterErrorState,
  NotificationCenterGuestState,
  NotificationsListSkeleton,
} from "@/components/notification-center/notification-center-states";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";
import { TAB_PAGE_HEADER_BAR } from "@/lib/tab-page-header-styles";
import { platformHeaderDomProps } from "@/lib/platform-header-safe-area";
import { appTextAlignClass, getAppTextDir } from "@/lib/app-text-direction";
import { SETTINGS_IMMERSIVE_BOTTOM, SETTINGS_INNER_SCROLL_CLASS } from "@/components/settings-shell";
import { OverlayPullToRefresh } from "@/components/overlay-pull-to-refresh";
import { invalidateUnreadCounters } from "@/lib/unread-counters-cache";

function notificationErrorMessage(error: unknown): string {
  if (error instanceof NotificationsApiError) {
    if (error.kind === "server") return t("notifications.error.server");
    const key = `notifications.error.${error.kind}` as const;
    const translated = t(key);
    if (translated && translated !== key) return translated;
    return t("notifications.error.unknown");
  }
  return t("notifications.error.unknown");
}

export default function NotificationsPage() {
  const [, navigate] = useLocation();
  const { locale } = useLocale();
  const textDir = getAppTextDir();
  const isRtl = locale === "ar";
  const [activeTab, setActiveTab] = useState<NotificationCenterTabId>("all");
  const [busyId, setBusyId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const handleTabChange = (tab: NotificationCenterTabId) => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setActiveTab(tab);
  };

  const listQuery = useNotificationsQuery({
    enabled: !!user,
    retry: false,
  });

  const refreshNotifications = useCallback(async () => {
    await listQuery.refetch();
    await queryClient.refetchQueries({ queryKey: unreadCountQueryKey });
    invalidateUnreadCounters(queryClient);
  }, [listQuery, queryClient]);
  const markOne = useMarkNotificationReadMutation();
  const markAll = useMarkAllNotificationsReadMutation();

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      navigate("/");
    }
  };

  const items = Array.isArray(listQuery.data) ? listQuery.data : [];
  const summary = useMemo(() => computeNotificationCenterSummary(items), [items]);
  const tabs = useMemo(() => visibleNotificationTabs(items), [items]);
  const filtered = useMemo(
    () => filterNotificationsByTab(items, activeTab),
    [items, activeTab],
  );
  const hasUnread = items.some((n) => !n.readAt);

  const markAllDisabled =
    markAll.isPending || items.length === 0 || !hasUnread || (listQuery.isLoading && !listQuery.data);

  const handleOpen = async (n: AppNotification) => {
    const href = resolveNotificationHref(n);
    setBusyId(n.id);
    try {
      if (!n.readAt) {
        try {
          await markOne.mutateAsync(n.id);
        } catch {
          /* navigate anyway — list refetch on focus */
        }
      }
      if (href) navigate(href);
    } finally {
      setBusyId(null);
    }
  };

  const pageShellClass = cn(
    "flex min-h-0 flex-1 flex-col bg-[#0A0A0A]",
    SETTINGS_IMMERSIVE_BOTTOM,
  );

  if (!authLoading && !user) {
    return (
      <div className={pageShellClass}>
        <header className={cn(TAB_PAGE_HEADER_BAR, "shrink-0 px-3 md:px-4")} dir={textDir} {...platformHeaderDomProps()}>
          <div className="mx-auto flex max-w-screen-xl items-center gap-3">
            <button
              type="button"
              onClick={goBack}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-[#0A0A0A]/75 text-primary ring-1 ring-primary/12 transition-colors hover:border-primary/45 hover:bg-black/85"
              aria-label={t("notifications.back")}
            >
              <ArrowRight
                className={cn("h-5 w-5", !isRtl && "rotate-180")}
                strokeWidth={2.25}
                aria-hidden
              />
            </button>
            <h1 className={cn("flex-1 text-lg font-bold text-foreground md:text-xl", appTextAlignClass())}>
              {t("notifications.title")}
            </h1>
          </div>
        </header>
        <NotificationCenterGuestState />
      </div>
    );
  }

  return (
    <div className={pageShellClass}>
      <header className={cn(TAB_PAGE_HEADER_BAR, "shrink-0 px-3 md:px-4")} dir={textDir} {...platformHeaderDomProps()}>
        <div className="mx-auto flex max-w-screen-xl items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-[#0A0A0A]/75 text-primary ring-1 ring-primary/12 transition-colors hover:border-primary/45 hover:bg-black/85"
            aria-label={t("notifications.back")}
          >
            <ArrowRight
              className={cn("h-5 w-5", !isRtl && "rotate-180")}
              strokeWidth={2.25}
              aria-hidden
            />
          </button>
          <h1 className="flex min-w-0 flex-1 items-center gap-2 text-lg font-bold text-foreground md:text-xl">
            <span className={cn("min-w-0 truncate", appTextAlignClass())}>
              {t("notifications.title")}
            </span>
            <Bell className="h-5 w-5 shrink-0 text-primary md:h-6 md:w-6" strokeWidth={2} aria-hidden />
          </h1>
          <button
            type="button"
            disabled={markAllDisabled}
            onClick={() => markAll.mutate()}
            className={cn(
              "shrink-0 rounded-2xl border px-2.5 py-2 text-[11px] font-semibold transition-colors sm:px-3 sm:text-xs md:text-sm",
              markAllDisabled
                ? "cursor-not-allowed border-primary/15 bg-[#0A0A0A]/50 text-muted-foreground"
                : "border-primary/40 bg-[#0A0A0A]/90 text-primary shadow-[0_0_18px_-12px_hsl(var(--primary)/0.25)] ring-1 ring-primary/15 hover:border-primary/55 hover:bg-black/95",
            )}
          >
            {t("notifications.mark_all_read")}
          </button>
        </div>
        {items.length > 0 ? (
          <div className="mx-auto mt-3 max-w-screen-xl">
            <NotificationCenterTabs
              tabs={tabs}
              active={activeTab}
              items={items}
              onChange={handleTabChange}
            />
          </div>
        ) : null}
      </header>

      <div
        ref={scrollRef}
        data-notification-center-scroll=""
        className={SETTINGS_INNER_SCROLL_CLASS}
      >
        <OverlayPullToRefresh
          scrollRef={scrollRef}
          enabled={!!user && !authLoading}
          onRefresh={refreshNotifications}
          indicatorTestId="notifications-pull-to-refresh-indicator"
          dataPrefix="notifications-ptr"
          contentMarker="notifications"
          tuckUnderHeaderPx={0}
        >
          <div className="px-3 pb-6 pt-3 md:px-4 md:pb-8 md:pt-4" dir={textDir}>
            <div className="mx-auto w-full max-w-lg space-y-3 md:max-w-xl">
              {!authLoading && !(listQuery.isLoading && !listQuery.data) && !listQuery.isError && items.length > 0 ? (
                <NotificationCenterSummaryBar summary={summary} />
              ) : null}
              {authLoading || (listQuery.isLoading && !listQuery.data) ? (
                <NotificationsListSkeleton />
              ) : listQuery.isError ? (
                <NotificationCenterErrorState
                  message={notificationErrorMessage(listQuery.error)}
                  onRetry={() => void listQuery.refetch()}
                />
              ) : filtered.length === 0 ? (
                <NotificationCenterEmptyState filtered={activeTab !== "all"} />
              ) : (
                filtered.map((n) => (
                  <NotificationCenterItem
                    key={n.id}
                    notification={n}
                    busy={busyId === n.id}
                    onOpen={handleOpen}
                  />
                ))
              )}
            </div>
          </div>
        </OverlayPullToRefresh>
      </div>
    </div>
  );
}

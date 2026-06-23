import { formatBadgeCount } from "@/lib/app-badge-counters";
import {
  countUnreadInTab,
  filterNotificationsByTab,
  tabI18nKey,
  type NotificationCenterTabId,
} from "@/lib/notification-center";
import type { AppNotification } from "@/lib/notifications-api";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

type NotificationCenterTabsProps = {
  tabs: NotificationCenterTabId[];
  active: NotificationCenterTabId;
  items: AppNotification[];
  onChange: (tab: NotificationCenterTabId) => void;
};

export function NotificationCenterTabs({
  tabs,
  active,
  items,
  onChange,
}: NotificationCenterTabsProps) {
  return (
    <div
      className="souq-scrollbar-hidden -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 md:-mx-4 md:px-4"
      role="tablist"
      aria-label={t("notifications.tabs_aria")}
    >
      {tabs.map((tab) => {
        const unread = countUnreadInTab(items, tab);
        const total = filterNotificationsByTab(items, tab).length;
        const badgeCount = tab === "all" ? unread : unread > 0 ? unread : 0;
        const selected = tab === active;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-label={
              badgeCount > 0
                ? `${t(tabI18nKey(tab))} (${formatBadgeCount(badgeCount)})`
                : t(tabI18nKey(tab))
            }
            data-tab-count={badgeCount > 0 ? String(badgeCount) : undefined}
            onClick={() => onChange(tab)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-semibold transition-colors sm:text-sm",
              selected
                ? "border-primary/50 bg-primary/15 text-primary shadow-[0_0_16px_-10px_hsl(var(--primary)/0.35)] ring-1 ring-primary/25"
                : "border-primary/20 bg-[#0A0A0A]/70 text-zinc-300 ring-1 ring-primary/8 hover:border-primary/35 hover:text-foreground",
            )}
          >
            <span>{t(tabI18nKey(tab))}</span>
            {badgeCount > 0 ? (
              <span
                dir="ltr"
                className={cn(
                  "inline-flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums",
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary/20 text-primary ring-1 ring-primary/25",
                )}
              >
                {formatBadgeCount(badgeCount)}
              </span>
            ) : tab !== "all" && tab !== "unread" && total > 0 ? (
              <span className="text-[10px] font-medium tabular-nums text-zinc-500">
                ·{total}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

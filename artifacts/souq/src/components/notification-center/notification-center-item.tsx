import {
  Bell,
  MessageCircle,
  Package,
  Shield,
  ShoppingBag,
  Sparkles,
  Flag,
  LifeBuoy,
  Megaphone,
  AlertTriangle,
} from "lucide-react";
import type { AppNotification } from "@/lib/notifications-api";
import {
  categoryI18nKey,
  normalizeNotificationCategory,
  type NotificationCategory,
} from "@/lib/notification-center";
import {
  isHighPriorityNotification,
  resolveNotificationVisualProfile,
} from "@/lib/notification-center-visual";
import { isNotificationFromToday } from "@/lib/notification-center-stats";
import { formatNotificationTime } from "@/lib/format";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { appTextAlignClass } from "@/lib/app-text-direction";

const CATEGORY_ICON: Record<NotificationCategory, typeof Bell> = {
  messages: MessageCircle,
  marketplace: ShoppingBag,
  orders: Package,
  support: LifeBuoy,
  social: Sparkles,
  reports: Flag,
  trust_safety: Shield,
  security: Shield,
  admin: Megaphone,
  system: Bell,
};

type NotificationCenterItemProps = {
  notification: AppNotification;
  busy: boolean;
  onOpen: (n: AppNotification) => void;
};

export function NotificationCenterItem({
  notification: n,
  busy,
  onOpen,
}: NotificationCenterItemProps) {
  const unread = !n.readAt;
  const category = normalizeNotificationCategory(n);
  const profile = resolveNotificationVisualProfile(n);
  const Icon = CATEGORY_ICON[category];
  const important = isHighPriorityNotification(n);
  const isToday = isNotificationFromToday(n.createdAt);
  const timeLabel = formatNotificationTime(n.createdAt);

  return (
    <button
      type="button"
      onClick={() => onOpen(n)}
      disabled={busy}
      data-notification-unread={unread ? "true" : "false"}
      data-notification-category={category}
      data-notification-important={important ? "true" : "false"}
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border px-3 py-3 ring-1 transition-colors sm:px-3.5 sm:py-3.5",
        appTextAlignClass(),
        unread ? profile.unreadCard : profile.readCard,
        important && unread && "ring-2",
        busy && "opacity-70",
      )}
    >
      <span
        className={cn(
          "absolute inset-y-2 w-1 rounded-full",
          profile.accentBar,
          unread ? "opacity-100" : "opacity-35",
          "start-1.5",
        )}
        aria-hidden
      />
      <div className="flex items-start gap-3 ps-2">
        <span
          className={cn(
            "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ring-1",
            unread ? profile.iconShellUnread : profile.iconShellRead,
          )}
          aria-hidden
        >
          <Icon className="h-[1.125rem] w-[1.125rem]" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    "rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    profile.badge,
                  )}
                >
                  {t(categoryI18nKey(category))}
                </span>
                {important ? (
                  <span className="inline-flex items-center gap-0.5 rounded-md border border-red-400/35 bg-red-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-200">
                    <AlertTriangle className="h-3 w-3" aria-hidden />
                    {t("notifications.important_badge")}
                  </span>
                ) : null}
              </div>
              <p
                className={cn(
                  "text-sm font-semibold leading-snug",
                  unread ? profile.titleUnread : profile.titleRead,
                )}
              >
                {n.title}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <time
                className={cn(
                  "whitespace-nowrap text-[11px] font-semibold tabular-nums sm:text-xs",
                  isToday && unread ? "text-primary" : "text-zinc-400",
                )}
                dateTime={n.createdAt}
              >
                {timeLabel}
              </time>
              {unread ? (
                <span className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_10px_-2px_hsl(var(--primary)/0.6)]" />
              ) : (
                <span className="text-[10px] font-medium text-zinc-500">
                  {t("notifications.read_badge")}
                </span>
              )}
            </div>
          </div>
          {n.body ? (
            <p
              className={cn(
                "line-clamp-2 text-xs leading-relaxed sm:line-clamp-3",
                unread ? "text-zinc-300" : "text-zinc-500",
              )}
            >
              {n.body}
            </p>
          ) : null}
        </div>
      </div>
    </button>
  );
}

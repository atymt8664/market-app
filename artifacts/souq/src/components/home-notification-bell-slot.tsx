import { Link } from "wouter";
import { Bell } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  useNotificationsUnreadCount,
  unreadCountersQueryKey,
} from "@/hooks/use-unread-counters";
import { formatBadgeCount, type UnreadCounters } from "@/lib/app-badge-counters";
import { UNREAD_COUNTER_BADGE_CLASS } from "@/lib/messages-badge-styles";
import { readHomeBellSlotHint } from "@/lib/home-bell-slot-hint";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

/** P9-E-4a-2: settled shell — must match NotificationBell link surface (no pale placeholder drift). */
export const HOME_BELL_SHELL_CLASS =
  "relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-primary/35 bg-[#0A0A0A]/80 text-primary shadow-[0_0_16px_-12px_hsl(var(--primary)/0.32)] ring-1 ring-primary/15";

const HOME_BELL_LINK_CLASS = cn(
  HOME_BELL_SHELL_CLASS,
  "transition-colors hover:border-primary/50 hover:bg-black/90 hover:shadow-[0_0_20px_-10px_hsl(var(--primary)/0.38)]",
);

/** @deprecated P9-E-4a alias — use HOME_BELL_SHELL_CLASS */
export const HOME_BELL_SLOT_CLASS = HOME_BELL_SHELL_CLASS;

function HomeBellIcon() {
  return <Bell className="h-4 w-4" strokeWidth={2.25} aria-hidden />;
}

function HomeBellBadge({ count }: { count: number }) {
  return (
    <span
      dir="ltr"
      className={cn(
        "absolute -top-1 -end-1",
        UNREAD_COUNTER_BADGE_CLASS,
        count <= 0 && "opacity-0",
      )}
      aria-hidden={count <= 0}
    >
      {count > 0 ? formatBadgeCount(count) : "\u00a0"}
    </span>
  );
}

/** Home-only bell — eager render, settled shell from first paint, badge slot reserved (P9-E-4a-2). */
function HomeHeaderNotificationBell() {
  const { user, isLoading: authLoading, isFetching: authFetching } = useAuth();
  const queryClient = useQueryClient();
  const cachedNotifications =
    (queryClient.getQueryData(unreadCountersQueryKey) as UnreadCounters | undefined)
      ?.notifications ?? 0;

  const liveCount = useNotificationsUnreadCount({
    enabled: !!user && !authLoading,
  });
  const displayCount = liveCount > 0 ? liveCount : cachedNotifications;

  const bellHint = readHomeBellSlotHint();
  const showLink = Boolean(user && !authLoading);
  /** P9-E-INCIDENT-1: keep settled shell on hint / slow or failed auth — no empty column. */
  const showSettledShell =
    showLink || bellHint || authLoading || authFetching;

  if (!showSettledShell) {
    return null;
  }

  const body = (
    <>
      <HomeBellIcon />
      <HomeBellBadge count={displayCount} />
    </>
  );

  if (showLink) {
    return (
      <Link
        href="/notifications"
        className={HOME_BELL_LINK_CLASS}
        aria-label={t("notifications.bell_aria")}
      >
        {body}
      </Link>
    );
  }

  return (
    <span className={cn(HOME_BELL_SHELL_CLASS, "pointer-events-none")} aria-hidden>
      {body}
    </span>
  );
}

export function HomeNotificationBellSlot({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-9 w-9 shrink-0", className)} data-testid="home-bell-slot">
      <HomeHeaderNotificationBell />
    </div>
  );
}

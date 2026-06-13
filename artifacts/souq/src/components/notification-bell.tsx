import { Link } from "wouter";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useNotificationsUnreadCount } from "@/hooks/use-unread-counters";
import { formatBadgeCount } from "@/lib/app-badge-counters";
import { UNREAD_COUNTER_BADGE_CLASS } from "@/lib/messages-badge-styles";
import { t } from "@/i18n";
import { useAfterFirstPaint } from "@/lib/after-first-paint";

export function NotificationBell({ className }: { className?: string } = {}) {
  const { user, isLoading: authLoading } = useAuth();
  const secondaryQueriesReady = useAfterFirstPaint();
  const count = useNotificationsUnreadCount({
    enabled: !!user && !authLoading && secondaryQueriesReady,
  });

  if (!user || authLoading) return null;

  return (
    <Link
      href="/notifications"
      className={cn(
        "relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-primary/35 bg-[#0A0A0A]/80 text-primary shadow-[0_0_16px_-12px_hsl(var(--primary)/0.32)] ring-1 ring-primary/15 transition-colors hover:border-primary/50 hover:bg-black/90 hover:shadow-[0_0_20px_-10px_hsl(var(--primary)/0.38)]",
        className,
      )}
      aria-label={t("notifications.bell_aria")}
    >
      <Bell className="h-4 w-4" strokeWidth={2.25} aria-hidden />
      {count > 0 ? (
        <span dir="ltr" className={cn("absolute -top-1 -end-1", UNREAD_COUNTER_BADGE_CLASS)}>
          {formatBadgeCount(count)}
        </span>
      ) : null}
    </Link>
  );
}

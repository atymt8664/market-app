import { Link } from "wouter";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useUnreadNotificationsCountQuery } from "@/hooks/use-notifications";
import { t } from "@/i18n";
import { useAfterFirstPaint } from "@/lib/after-first-paint";

export function NotificationBell({ className }: { className?: string } = {}) {
  const { user, isLoading: authLoading } = useAuth();
  const secondaryQueriesReady = useAfterFirstPaint();
  const { data } = useUnreadNotificationsCountQuery({
    enabled: !!user && !authLoading && secondaryQueriesReady,
    retry: false,
  });

  if (!user || authLoading) return null;

  const count = typeof data?.count === "number" ? data.count : 0;

  return (
    <Link
      href="/notifications"
      className={cn(
        "relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-primary/35 bg-zinc-950/80 text-primary shadow-[0_0_16px_-12px_hsl(var(--primary)/0.32)] ring-1 ring-primary/15 transition-colors hover:border-primary/50 hover:bg-zinc-900/90 hover:shadow-[0_0_20px_-10px_hsl(var(--primary)/0.38)]",
        className,
      )}
      aria-label={t("notifications.bell_aria")}
    >
      <Bell className="h-4 w-4" strokeWidth={2.25} aria-hidden />
      {count > 0 ? (
        <span
          dir="ltr"
          className="absolute -top-1 -end-1 flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full border-2 border-zinc-950 bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground tabular-nums shadow-[0_0_8px_-2px_hsl(var(--primary)/0.45)]"
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}

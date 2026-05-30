import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, Bell } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
} from "@/hooks/use-notifications";
import {
  NotificationsApiError,
  type AppNotification,
} from "@/lib/notifications-api";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";

function resolveNotificationHref(n: AppNotification): string | null {
  const et = n.entityType?.trim().toLowerCase() ?? "";
  const id = typeof n.entityId === "number" ? n.entityId : Number(n.entityId);
  if (!et || !Number.isFinite(id) || id <= 0) return null;
  if (et === "ad") return `/ad/${id}`;
  if (et === "support_ticket") return `/account/help?ticket=${id}`;
  return null;
}

function notificationErrorMessage(error: unknown): string {
  if (error instanceof NotificationsApiError) {
    if (error.kind === "server") {
      return t("notifications.error.server");
    }
    const key = `notifications.error.${error.kind}` as const;
    const translated = t(key);
    if (translated && translated !== key) return translated;
    return t("notifications.error.unknown");
  }
  return t("notifications.error.unknown");
}

function NotificationsListSkeleton() {
  return (
    <div className="space-y-2" aria-hidden>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-[5.25rem] animate-pulse rounded-2xl border border-primary/20 bg-[#0A0A0A]/80 ring-1 ring-primary/8"
        />
      ))}
    </div>
  );
}

export default function NotificationsPage() {
  const [, navigate] = useLocation();
  const { locale } = useLocale();
  const isRtl = locale === "ar";
  const [busyId, setBusyId] = useState<number | null>(null);
  const { user, isLoading: authLoading } = useAuth();

  const listQuery = useNotificationsQuery({
    enabled: !!user,
    retry: false,
  });
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
          // Still navigate if marking read fails — user can retry from list refresh
        }
      }
      if (href) navigate(href);
    } finally {
      setBusyId(null);
    }
  };

  if (!authLoading && !user) {
    return (
      <div className="flex min-h-[100svh] w-full flex-col bg-[#0A0A0A]">
        <header
          className="sticky top-0 z-40 border-b border-primary/20 bg-[#0A0A0A]/95 px-3 py-3 shadow-[0_1px_14px_-6px_rgba(0,0,0,0.4)] backdrop-blur md:px-4 md:py-3.5"
          dir={isRtl ? "rtl" : "ltr"}
        >
          <div className="mx-auto flex max-w-screen-xl items-center gap-3">
            <button
              type="button"
              onClick={goBack}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-[#0A0A0A]/75 text-primary ring-1 ring-primary/12 transition-colors hover:border-primary/45 hover:bg-black/85"
              aria-label={t("notifications.back")}
            >
              <ArrowRight className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </button>
            <h1
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2 text-lg font-bold text-foreground md:text-xl",
                isRtl ? "text-right" : "text-left",
              )}
            >
              {t("notifications.title")}
            </h1>
          </div>
        </header>
        <div
          className="flex flex-1 flex-col items-center justify-center px-4 pb-12 pt-8"
          dir={isRtl ? "rtl" : "ltr"}
        >
          <div className="w-full max-w-md rounded-2xl border border-primary/35 bg-[#0A0A0A]/80 p-8 text-center shadow-[0_0_28px_-14px_hsl(var(--primary)/0.35)] ring-1 ring-primary/15">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/40 bg-primary/10 text-primary shadow-[0_0_20px_-10px_hsl(var(--primary)/0.45)]">
              <Bell className="h-7 w-7" strokeWidth={2} aria-hidden />
            </div>
            <p className="text-base font-semibold text-foreground">{t("notifications.guest_title")}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("notifications.guest_body")}
            </p>
            <Link
              href="/login?redirect=/notifications"
              className="mt-6 inline-flex w-full items-center justify-center rounded-2xl border border-primary/45 bg-[#0A0A0A]/90 py-3 text-sm font-semibold text-primary shadow-[0_0_18px_-12px_hsl(var(--primary)/0.3)] ring-1 ring-primary/20 transition-colors hover:border-primary/55 hover:bg-black/30"
            >
              {t("notifications.guest_login")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100svh] w-full flex-col bg-[#0A0A0A]">
      <header
        className="sticky top-0 z-40 border-b border-primary/20 bg-[#0A0A0A]/95 px-3 py-3 shadow-[0_1px_14px_-6px_rgba(0,0,0,0.4)] backdrop-blur md:px-4 md:py-3.5"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className="mx-auto flex max-w-screen-xl items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-[#0A0A0A]/75 text-primary ring-1 ring-primary/12 transition-colors hover:border-primary/45 hover:bg-black/85"
            aria-label={t("notifications.back")}
          >
            <ArrowRight className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </button>
          <h1 className="flex min-w-0 flex-1 items-center gap-2 text-lg font-bold text-foreground md:text-xl">
            <span className={cn("min-w-0 truncate", isRtl ? "text-right" : "text-left")}>
              {t("notifications.title")}
            </span>
            <Bell className="h-5 w-5 shrink-0 text-primary md:h-6 md:w-6" strokeWidth={2} aria-hidden />
          </h1>
          <button
            type="button"
            disabled={markAllDisabled}
            onClick={() => markAll.mutate()}
            className={cn(
              "shrink-0 rounded-2xl border px-3 py-2 text-xs font-semibold transition-colors md:text-sm",
              markAllDisabled
                ? "cursor-not-allowed border-primary/15 bg-[#0A0A0A]/50 text-muted-foreground"
                : "border-primary/40 bg-[#0A0A0A]/90 text-primary shadow-[0_0_18px_-12px_hsl(var(--primary)/0.25)] ring-1 ring-primary/15 hover:border-primary/55 hover:bg-black/95",
            )}
          >
            {t("notifications.mark_all_read")}
          </button>
        </div>
      </header>

      <div
        className="flex-1 px-3 pb-10 pt-3 md:px-4 md:pb-12 md:pt-4"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className="mx-auto w-full max-w-lg space-y-2 md:max-w-xl">
          {authLoading || (listQuery.isLoading && !listQuery.data) ? (
            <NotificationsListSkeleton />
          ) : listQuery.isError ? (
            <div className="rounded-2xl border border-destructive/35 bg-[#0A0A0A]/75 p-6 text-center shadow-[0_0_20px_-14px_rgba(0,0,0,0.5)] ring-1 ring-destructive/15">
              <p className="text-sm font-medium text-destructive">{t("notifications.error.title")}</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {notificationErrorMessage(listQuery.error)}
              </p>
              <button
                type="button"
                onClick={() => void listQuery.refetch()}
                className="mt-4 rounded-2xl border border-primary/40 bg-[#0A0A0A]/90 px-4 py-2 text-xs font-semibold text-primary ring-1 ring-primary/15 hover:border-primary/55"
              >
                {t("notifications.retry")}
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-primary/35 bg-[#0A0A0A]/80 p-10 text-center shadow-[0_0_28px_-14px_hsl(var(--primary)/0.28)] ring-1 ring-primary/12">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/8 text-primary/90">
                <Bell className="h-8 w-8" strokeWidth={1.75} aria-hidden />
              </div>
              <p className="text-base font-semibold text-foreground">{t("notifications.empty_title")}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("notifications.empty")}</p>
            </div>
          ) : (
            items.map((n) => {
              const unread = !n.readAt;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => void handleOpen(n)}
                  disabled={busyId === n.id}
                  className={cn(
                    "w-full rounded-2xl border px-4 py-3.5 shadow-[0_0_20px_-14px_hsl(var(--primary)/0.2)] ring-1 transition-colors",
                    isRtl ? "text-right" : "text-left",
                    unread
                      ? "border-primary/45 bg-[#0A0A0A]/90 ring-primary/25 hover:border-primary/55 hover:shadow-[0_0_26px_-12px_hsl(var(--primary)/0.32)]"
                      : "border-primary/22 bg-[#0A0A0A]/70 ring-primary/10 hover:border-primary/35",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p
                        className={cn(
                          "text-sm font-semibold leading-snug text-foreground",
                          unread && "text-primary",
                        )}
                      >
                        {n.title}
                      </p>
                      {n.body ? (
                        <p className="line-clamp-3 text-xs leading-relaxed text-zinc-400">{n.body}</p>
                      ) : null}
                      <p className="text-[11px] tabular-nums text-zinc-500">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {unread ? (
                      <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary shadow-[0_0_10px_-2px_hsl(var(--primary)/0.6)]" />
                    ) : (
                      <span className="mt-1 shrink-0 text-[10px] font-medium text-zinc-500">
                        {t("notifications.read_badge")}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

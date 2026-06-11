import { Link } from "wouter";
import { Bell } from "lucide-react";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { appTextAlignClass } from "@/lib/app-text-direction";

export function NotificationsListSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => (
          <div
            key={`s-${i}`}
            className="h-16 animate-pulse rounded-2xl border border-primary/20 bg-[#0A0A0A]/80 ring-1 ring-primary/8"
          />
        ))}
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-[6.25rem] animate-pulse rounded-2xl border border-primary/20 bg-[#0A0A0A]/80 ring-1 ring-primary/8"
        />
      ))}
    </div>
  );
}

export function NotificationCenterGuestState() {
  return (
    <div className={cn("flex flex-1 flex-col items-center justify-center px-4 pb-12 pt-8")}>
      <div className="w-full max-w-md rounded-2xl border border-primary/35 bg-[#0A0A0A]/80 p-8 text-center shadow-[0_0_28px_-14px_hsl(var(--primary)/0.35)] ring-1 ring-primary/15">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/40 bg-primary/10 text-primary shadow-[0_0_20px_-10px_hsl(var(--primary)/0.45)]">
          <Bell className="h-7 w-7" strokeWidth={2} aria-hidden />
        </div>
        <p className={cn("text-base font-semibold text-foreground", appTextAlignClass())}>
          {t("notifications.guest_title")}
        </p>
        <p className={cn("mt-2 text-sm leading-relaxed text-muted-foreground", appTextAlignClass())}>
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
  );
}

export function NotificationCenterErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-2xl border border-destructive/35 bg-[#0A0A0A]/75 p-6 text-center shadow-[0_0_20px_-14px_rgba(0,0,0,0.5)] ring-1 ring-destructive/15">
      <p className="text-sm font-medium text-destructive">{t("notifications.error.title")}</p>
      <p className={cn("mt-2 text-sm leading-relaxed text-zinc-400", appTextAlignClass())}>
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-2xl border border-primary/40 bg-[#0A0A0A]/90 px-4 py-2 text-xs font-semibold text-primary ring-1 ring-primary/15 hover:border-primary/55"
      >
        {t("notifications.retry")}
      </button>
    </div>
  );
}

export function NotificationCenterEmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="rounded-2xl border border-primary/35 bg-[#0A0A0A]/80 p-10 text-center shadow-[0_0_28px_-14px_hsl(var(--primary)/0.28)] ring-1 ring-primary/12">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/8 text-primary/90">
        <Bell className="h-8 w-8" strokeWidth={1.75} aria-hidden />
      </div>
      <p className="text-base font-semibold text-foreground">
        {filtered ? t("notifications.empty_filtered_title") : t("notifications.empty_title")}
      </p>
      <p className={cn("mt-2 text-sm leading-relaxed text-muted-foreground", appTextAlignClass())}>
        {filtered ? t("notifications.empty_filtered") : t("notifications.empty")}
      </p>
    </div>
  );
}

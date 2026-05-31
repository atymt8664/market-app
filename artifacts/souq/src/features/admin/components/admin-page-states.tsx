import type { ReactNode } from "react";
import { AlertCircle, Inbox, Loader2 } from "lucide-react";
import { BTN_FIX, BTN_SEARCH, CARD_SHELL, PANEL_INSET } from "@/features/admin/admin-interaction-classes";
import { useAdminLocale } from "@/features/admin/hooks/use-admin-locale";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

type AdminPageLoadingProps = {
  message?: string;
  className?: string;
};

export function AdminPageLoading({ message, className }: AdminPageLoadingProps) {
  const { dir } = useAdminLocale();
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 rounded-2xl border border-primary/25 bg-zinc-900/40 py-12 text-muted-foreground ring-1 ring-primary/10",
        className,
      )}
      dir={dir}
    >
      <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
      <span>{message ?? t("p8.admin.common.loading")}</span>
    </div>
  );
}

type AdminTableSkeletonProps = {
  rows?: number;
  className?: string;
};

export function AdminTableSkeleton({ rows = 6, className }: AdminTableSkeletonProps) {
  const { dir } = useAdminLocale();
  return (
    <div className={cn(CARD_SHELL, "overflow-hidden p-0", className)} dir={dir}>
      <div className="border-b border-primary/20 bg-zinc-900/50 px-4 py-3">
        <div className="h-4 w-1/3 animate-pulse rounded-lg bg-primary/15" />
      </div>
      <div className="divide-y divide-primary/10">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-4">
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-primary/10" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-2/5 animate-pulse rounded bg-primary/12" />
              <div className="h-3 w-1/4 animate-pulse rounded bg-primary/8" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type AdminEmptyStateProps = {
  title: string;
  description?: string;
  nextStep?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

export function AdminEmptyState({
  title,
  description,
  nextStep,
  action,
  icon,
  className,
}: AdminEmptyStateProps) {
  const { dir } = useAdminLocale();
  return (
    <div className={cn(PANEL_INSET, "space-y-3 py-12 text-center", className)} dir={dir}>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary shadow-[0_0_20px_-10px_hsl(var(--primary)/0.35)]">
        {icon ?? <Inbox className="h-6 w-6" aria-hidden />}
      </div>
      <p className="text-base font-semibold text-foreground">{title}</p>
      {description ? <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {nextStep ? <p className="text-xs text-primary/90">{nextStep}</p> : null}
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}

type AdminErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
};

export function AdminErrorState({
  title,
  description,
  onRetry,
  retryLabel,
  className,
}: AdminErrorStateProps) {
  const { dir } = useAdminLocale();
  return (
    <div
      className={cn(
        "rounded-2xl border border-red-500/35 bg-red-950/25 px-4 py-10 text-center ring-1 ring-red-500/20",
        className,
      )}
      dir={dir}
    >
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/40 bg-red-950/40 text-red-200">
        <AlertCircle className="h-5 w-5" aria-hidden />
      </div>
      <p className="text-sm font-semibold text-red-100">{title ?? t("p8.admin.common.error_title")}</p>
      {description ? <p className="mt-2 text-sm text-red-200/85">{description}</p> : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className={cn(BTN_FIX, BTN_SEARCH, "mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium")}
        >
          {retryLabel ?? t("p8.admin.page.retry")}
        </button>
      ) : null}
    </div>
  );
}

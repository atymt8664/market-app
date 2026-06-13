import { Loader2, RefreshCw } from "lucide-react";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

type HomeSectionRetryProps = {
  message?: string;
  onRetry: () => void;
  busy?: boolean;
  className?: string;
  testId?: string;
};

/** Compact inline retry — Home header / feed failure surface (P9-E-INCIDENT-1). */
export function HomeSectionRetry({
  message,
  onRetry,
  busy = false,
  className,
  testId = "home-section-retry",
}: HomeSectionRetryProps) {
  return (
    <div
      role="alert"
      data-testid={testId}
      className={cn(
        "flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-primary/25 bg-primary/[0.04] px-3 py-2 text-center ring-1 ring-primary/10",
        className,
      )}
    >
      <p className="text-[11px] font-medium leading-snug text-muted-foreground sm:text-xs">
        {message ?? t("home.section_load_failed")}
      </p>
      <button
        type="button"
        onClick={onRetry}
        disabled={busy}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-primary/35 bg-[#0A0A0A]/90 px-2.5 py-1 text-[11px] font-semibold text-primary",
          "transition-colors hover:border-primary/50 hover:bg-black disabled:opacity-60",
        )}
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
        )}
        {t("home.retry")}
      </button>
    </div>
  );
}

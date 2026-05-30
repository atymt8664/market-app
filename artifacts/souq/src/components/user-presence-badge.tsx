import type { UserPresenceEntry } from "@workspace/api-client-react";
import { formatRelativeTime } from "@/lib/format";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

const BADGE_ONLINE =
  "inline-flex max-w-full min-w-0 items-center gap-2 rounded-full border border-primary/55 bg-primary/[0.14] font-semibold leading-none text-primary shadow-[0_0_22px_-10px_hsl(var(--primary)/0.42)] ring-1 ring-primary/25";
const BADGE_OFFLINE =
  "inline-flex max-w-full min-w-0 items-center gap-2 rounded-full border border-zinc-600/50 bg-[#0A0A0A]/80 font-medium leading-tight text-zinc-200 ring-1 ring-zinc-700/40";
const BADGE_MUTED =
  "inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border border-zinc-700/40 bg-[#0A0A0A]/55 font-medium leading-tight text-zinc-500 ring-1 ring-zinc-800/45";

const SIZE_DEFAULT = "py-1.5 ps-2.5 pe-3 text-[12px] sm:text-[13px]";
const SIZE_COMPACT = "py-0.5 ps-2 pe-2 text-[10px] sm:text-[11px]";

export function UserPresenceBadge({
  entry,
  isLoading,
  variant = "default",
  className,
}: {
  entry: UserPresenceEntry | undefined;
  isLoading?: boolean;
  variant?: "default" | "compact";
  className?: string;
}) {
  const sz = variant === "compact" ? SIZE_COMPACT : SIZE_DEFAULT;
  if (isLoading) {
    return (
      <span
        className={cn(
          "inline-block max-w-full rounded-full border border-zinc-800/60 bg-[#0A0A0A]/40",
          variant === "compact" ? "h-5 w-24 animate-pulse" : "h-7 w-28 animate-pulse",
          className,
        )}
        aria-hidden
      />
    );
  }
  if (!entry) {
    return (
      <span className={cn(BADGE_MUTED, sz, className)} role="status">
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-600 ring-1 ring-zinc-700/80"
          aria-hidden
        />
        <span className="min-w-0 truncate">{t("message_thread.peer_offline_simple")}</span>
      </span>
    );
  }
  if (entry.visibility === "hidden") {
    return (
      <span className={cn(BADGE_MUTED, sz, className)} role="status">
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-600 ring-1 ring-zinc-700/80"
          aria-hidden
        />
        <span className="min-w-0 truncate">{t("message_thread.peer_offline_simple")}</span>
      </span>
    );
  }
  if (entry.isOnline) {
    return (
      <span className={cn(BADGE_ONLINE, sz, className)} role="status">
        <span className="relative flex h-2 w-2 shrink-0 items-center justify-center" aria-hidden>
          <span className="absolute inline-flex h-2 w-2 rounded-full bg-primary opacity-35 blur-[1.5px]" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_2px_hsl(var(--primary)/0.55)]" />
        </span>
        <span className="min-w-0 truncate">{t("message_thread.peer_online")}</span>
      </span>
    );
  }
  if (entry.lastSeenAt) {
    const rel = formatRelativeTime(entry.lastSeenAt);
    if (!rel) {
      return (
        <span className={cn(BADGE_MUTED, sz, className)} role="status">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-600 ring-1 ring-zinc-700/80"
            aria-hidden
          />
          <span className="min-w-0 truncate">{t("message_thread.peer_offline_simple")}</span>
        </span>
      );
    }
    return (
      <span className={cn(BADGE_OFFLINE, sz, className)} role="status">
        <span
          className={variant === "compact" ? "h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500 ring-1 ring-zinc-600/90" : "h-2 w-2 shrink-0 rounded-full bg-zinc-500 ring-1 ring-zinc-600/90"}
          aria-hidden
        />
        <span className="min-w-0 truncate">{t("message_thread.peer_last_seen", { time: rel })}</span>
      </span>
    );
  }
  return (
    <span className={cn(BADGE_MUTED, sz, className)} role="status">
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-600 ring-1 ring-zinc-700/80"
        aria-hidden
      />
      <span className="min-w-0 truncate">{t("message_thread.peer_offline_simple")}</span>
    </span>
  );
}

import { cn } from "@/lib/utils";

function SecurityEventSkeletonRow({ variant }: { variant: "alerts" | "log" }) {
  const ring =
    variant === "alerts"
      ? "border-lime-400/20 bg-lime-500/[0.03] ring-lime-400/10"
      : "border-primary/20 bg-primary/[0.03] ring-primary/10";
  const iconRing =
    variant === "alerts"
      ? "border-zinc-700/80 bg-[#0A0A0A]/80 ring-lime-400/10"
      : "border-primary/30 bg-[#0A0A0A]/80 ring-primary/10";

  return (
    <div className={cn("flex items-start gap-2.5 rounded-xl border p-3 ring-1 animate-pulse", ring)}>
      <div className={cn("h-10 w-10 shrink-0 rounded-xl border ring-1", iconRing)} />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-4 w-32 max-w-[55%] rounded-md bg-zinc-800/90" />
          {variant === "alerts" ? (
            <div className="h-4 w-12 rounded-full bg-lime-500/10 ring-1 ring-lime-400/15" />
          ) : null}
        </div>
        <div className="h-3 w-[80%] max-w-full rounded-md bg-zinc-800/70" />
        <div className="h-3 w-28 rounded-md bg-zinc-800/60" />
        <div className="h-3 w-36 rounded-md bg-zinc-800/50" />
      </div>
    </div>
  );
}

export function SecurityEventsListSkeleton({
  variant = "alerts",
  rows = 4,
  className,
}: {
  variant?: "alerts" | "log";
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("space-y-2 py-2", className)}
      data-security-events-skeleton=""
      aria-busy="true"
      aria-hidden
    >
      {Array.from({ length: rows }, (_, i) => (
        <SecurityEventSkeletonRow key={i} variant={variant} />
      ))}
    </div>
  );
}

/** Avoid empty-state flash while auth/query is still resolving. */
export function resolveSecurityListViewState<T>(opts: {
  authLoading: boolean;
  user: unknown;
  data: T[] | undefined;
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
}): { items: T[]; loading: boolean; empty: boolean } {
  const items = opts.data ?? [];
  const loading =
    opts.authLoading ||
    !opts.user ||
    (opts.isPending && items.length === 0) ||
    (opts.isFetching && items.length === 0);
  const empty = !loading && !opts.isError && items.length === 0;
  return { items, loading, empty };
}

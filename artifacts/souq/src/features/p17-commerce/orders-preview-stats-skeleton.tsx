import { Skeleton } from "@/components/ui/skeleton";
import { P17_PREVIEW_STAT_ROW } from "./schema-preview-styles";

type OrdersPreviewStatsSkeletonProps = {
  rows: number;
  showCounts?: boolean;
};

export function OrdersPreviewStatsSkeleton({
  rows,
  showCounts = true,
}: OrdersPreviewStatsSkeletonProps) {
  return (
    <ul
      className="space-y-2 rounded-xl border border-primary/20 bg-zinc-950/80 p-2.5 shadow-[0_0_14px_-10px_hsl(var(--primary)/0.12)] ring-1 ring-primary/8"
      data-testid="p17-preview-stats-skeleton"
      aria-hidden
    >
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className={P17_PREVIEW_STAT_ROW}>
          <Skeleton className="h-4 w-36 max-w-[70%] rounded-md bg-primary/10" />
          {showCounts ? (
            <Skeleton className="h-4 w-6 rounded-md bg-primary/10" />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/i18n";
import type { OrderListItem } from "./orders-api.types";

type OrdersRecentListProps = {
  items: OrderListItem[];
  titleKey?: string;
};

export function OrdersRecentList({
  items,
  titleKey = "p17.commerce.preview.recent_orders",
}: OrdersRecentListProps) {
  if (items.length === 0) return null;

  return (
    <div className="mt-3 space-y-2" data-testid="p17-preview-recent-orders">
      <p className="px-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-500">
        {t(titleKey)}
      </p>
      <ul className="space-y-2">
        {items.map((order) => (
          <li
            key={order.id}
            className="rounded-xl border border-primary/25 bg-[#0A0A0A]/85 p-2.5 shadow-[0_0_12px_-10px_hsl(var(--primary)/0.14)] ring-1 ring-primary/10"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-bold text-primary">{order.orderNumber}</p>
              <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                {order.statusLabelAr}
              </span>
            </div>
            <p className="mt-1 text-sm font-medium text-foreground">{order.title}</p>
            <p className="mt-1 text-xs text-zinc-400">
              {t("p17.commerce.preview.status_label")}:{" "}
              <span className="text-zinc-200">{order.statusLabelAr}</span>
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              {t("p17.commerce.preview.last_updated")}: {order.updatedAtRelativeAr}
            </p>
          </li>
        ))}
      </ul>
      <p className="text-center text-[10px] leading-relaxed text-zinc-500">
        {t("p17.commerce.preview.mock_notice")}
      </p>
    </div>
  );
}

export function OrdersRecentListSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="mt-3 space-y-2" data-testid="p17-preview-recent-skeleton" aria-hidden>
      <Skeleton className="h-3 w-28 rounded-md bg-primary/10" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-xl bg-primary/10" />
      ))}
    </div>
  );
}

import type { KeyboardEvent, ReactNode } from "react";
import { ChevronLeft, Package } from "lucide-react";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import type { OrderHubVariant } from "./order-detail-paths";
import { useNavigateToOrderDetail } from "./order-detail-paths";
import type { OrderListItem } from "./orders-api.types";
import { ORDERS_LIST_CARD, ORDERS_LIST_CARD_INTERACTIVE } from "./orders-page-styles";

type OrderListCardProps = {
  order: OrderListItem;
  variant: OrderHubVariant;
  className?: string;
};

export function OrderListCard({ order, variant, className }: OrderListCardProps) {
  const navigateToDetail = useNavigateToOrderDetail();
  const testId =
    variant === "buyer" ? "p17-orders-list-card-buyer" : "p17-orders-list-card-seller";

  const handleOpen = () => navigateToDetail(variant, order.id);

  return (
    <button
      type="button"
      dir="rtl"
      data-testid={testId}
      data-order-id={order.id}
      aria-label={t("p17.commerce.page.order_card_open", { orderNumber: order.orderNumber })}
      className={cn(ORDERS_LIST_CARD, ORDERS_LIST_CARD_INTERACTIVE, className)}
      onClick={handleOpen}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleOpen();
        }
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/35 bg-[#0A0A0A] text-primary md:h-14 md:w-14"
          aria-hidden
        >
          <Package className="h-5 w-5 md:h-6 md:w-6" strokeWidth={2} />
        </div>

        <div className="min-w-0 flex-1 text-right">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-xs font-bold text-primary md:text-sm">{order.orderNumber}</p>
            <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {order.statusLabelAr}
            </span>
          </div>

          <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-foreground">{order.title}</p>

          <div className="mt-1.5 flex flex-wrap items-center justify-end gap-x-2 gap-y-0.5 text-[11px] text-zinc-500">
            <span className="font-bold text-primary">{order.totalAmount}</span>
            <span aria-hidden>·</span>
            <span>{t("p17.commerce.preview.last_updated")}: {order.updatedAtRelativeAr}</span>
          </div>
        </div>

        <ChevronLeft className="mt-1 h-4 w-4 shrink-0 text-primary/45" aria-hidden strokeWidth={2.25} />
      </div>
    </button>
  );
}

type OrdersHubListProps = {
  variant: OrderHubVariant;
  orders: OrderListItem[];
  empty: ReactNode;
};

export function OrdersHubList({ variant, orders, empty }: OrdersHubListProps) {
  if (orders.length === 0) {
    return <>{empty}</>;
  }

  const listTestId =
    variant === "buyer" ? "p17-orders-list-buyer" : "p17-orders-list-seller";

  return (
    <ul className="flex flex-col gap-2 md:gap-2.5" data-testid={listTestId} dir="rtl">
      {orders.map((order) => (
        <li key={order.id}>
          <OrderListCard order={order} variant={variant} />
        </li>
      ))}
    </ul>
  );
}

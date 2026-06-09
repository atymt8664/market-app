import type { KeyboardEvent, ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { getGetAdQueryKey, useGetAd } from "@workspace/api-client-react";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import type { OrderHubVariant } from "./order-detail-paths";
import { useNavigateToOrderDetail } from "./order-detail-paths";
import type { OrderListItem } from "./orders-api.types";
import { ORDERS_LIST_CARD_INBOX, ORDERS_LIST_CARD_INTERACTIVE } from "./orders-page-styles";
import {
  formatOrderPrice,
  formatOrderUpdatedAt,
  resolveOrderStatusLabel,
} from "./order-display-labels";
import {
  ORDER_STATUS_BADGE_CLASS,
  ORDERS_LIST_CARD_NEUTRAL,
  resolveOrderStatusTone,
  SELLER_PENDING_ORDER_CARD_CLASS,
} from "./order-status-tone";
import { OrderNumberCopy } from "./order-number-copy";
import { OrderProductThumbnail } from "./order-product-thumbnail";
import { resolveOrderThumbnailImageUrl } from "./resolve-order-thumbnail-image-url";
import { useOrderDetail } from "./use-orders-api";

type OrderListCardProps = {
  order: OrderListItem;
  variant: OrderHubVariant;
  className?: string;
  interactionDisabled?: boolean;
};

export function OrderListCard({
  order,
  variant,
  className,
  interactionDisabled = false,
}: OrderListCardProps) {
  const navigateToDetail = useNavigateToOrderDetail();
  const testId =
    variant === "buyer" ? "p17-orders-list-card-buyer" : "p17-orders-list-card-seller";

  const statusTone = resolveOrderStatusTone(order.status);
  const statusLabel = resolveOrderStatusLabel(order, variant);
  const priceDisplay = formatOrderPrice(order.totalAmount, order.currency);
  const isSellerNewOrder = variant === "seller" && order.status === "pending_confirmation";

  const handleOpen = () => {
    if (interactionDisabled) return;
    navigateToDetail(variant, order.orderNumber);
  };

  const cardClass = cn(
    ORDERS_LIST_CARD_INBOX,
    isSellerNewOrder ? SELLER_PENDING_ORDER_CARD_CLASS : ORDERS_LIST_CARD_NEUTRAL,
    interactionDisabled ? "cursor-default opacity-80" : ORDERS_LIST_CARD_INTERACTIVE,
    className,
  );

  const inner = (
    <div className="flex w-full items-center gap-2.5 md:gap-3">
      <div className="relative shrink-0">
        <OrderListCardThumbnail order={order} variant={variant} isMock={interactionDisabled} />
        {isSellerNewOrder ? (
          <span
            className="absolute top-1 start-1 rounded-full border border-amber-500/55 bg-amber-500/25 px-1.5 py-px text-[9px] font-bold text-amber-50"
            aria-hidden
          >
            {t("p17.commerce.page.seller_new_order_badge")}
          </span>
        ) : null}
      </div>

      <div className="min-w-0 flex-1 space-y-0.5 text-right">
        <p className="line-clamp-2 text-[14px] font-bold leading-[1.15rem] text-foreground md:text-[15px]">
          {order.title}
        </p>

        <p className="text-[15px] font-bold tabular-nums leading-none text-primary md:text-[16px]">
          {priceDisplay}
        </p>

        <p>
          <span
            className={cn(
              "inline-flex rounded-full border px-1.5 py-px text-[9px] font-semibold md:text-[10px]",
              ORDER_STATUS_BADGE_CLASS[statusTone],
            )}
          >
            {statusLabel}
          </span>
        </p>

        <OrderNumberCopy orderNumber={order.orderNumber} compact testId="p17-order-list-number-copy" />

        <p className="text-[10px] text-zinc-500">{formatOrderUpdatedAt(order)}</p>
      </div>

      <ChevronLeft
        className="h-4 w-4 shrink-0 text-primary/45 md:h-[1.125rem] md:w-[1.125rem]"
        strokeWidth={2.25}
        aria-hidden
      />
    </div>
  );

  if (interactionDisabled) {
    return (
      <div
        dir="rtl"
        data-testid={testId}
        data-order-id={order.id}
        data-interaction-disabled="true"
        className={cardClass}
        aria-label={t("p17.commerce.page.mock_card_unavailable", { orderNumber: order.orderNumber })}
      >
        {inner}
      </div>
    );
  }

  return (
    <button
      type="button"
      dir="rtl"
      data-testid={testId}
      data-order-id={order.id}
      data-seller-new-order={isSellerNewOrder ? "true" : undefined}
      aria-label={t("p17.commerce.page.order_card_open", { orderNumber: order.orderNumber })}
      className={cardClass}
      onClick={handleOpen}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleOpen();
        }
      }}
    >
      {inner}
    </button>
  );
}

function coerceOrderAdId(adId: OrderListItem["adId"]): number {
  if (typeof adId === "number" && Number.isFinite(adId) && adId > 0) return adId;
  if (typeof adId === "string" && adId.trim()) {
    const parsed = Number.parseInt(adId.trim(), 10);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

/** Same image fallback chain as order detail summary — API snapshot → ad gallery → placeholder. */
function OrderListCardThumbnail({
  order,
  variant,
  isMock,
}: {
  order: OrderListItem;
  variant: OrderHubVariant;
  isMock: boolean;
}) {
  const listAdId = coerceOrderAdId(order.adId);
  const needsDetailAdId = listAdId === 0 && !isMock && order.orderNumber.trim().length > 0;
  const detailQuery = useOrderDetail(variant, order.orderNumber, {
    enabled: needsDetailAdId,
  });
  const adId = listAdId || coerceOrderAdId(detailQuery.data?.order?.adId);
  const snapshotImageUrl = order.imageUrl ?? detailQuery.data?.order?.imageUrl;
  const { data: ad } = useGetAd(adId, {
    query: {
      // Detail parity — always resolve gallery when adId is known (not mock-gated list).
      enabled: adId > 0 && !isMock,
      queryKey: getGetAdQueryKey(adId),
      staleTime: 300_000,
      retry: 1,
    },
  });
  const imageUrl = resolveOrderThumbnailImageUrl(ad?.images, snapshotImageUrl);

  return (
    <OrderProductThumbnail
      imageUrl={imageUrl}
      title={order.title}
      size="list"
      className="border-primary/25"
    />
  );
}

export function sortOrdersForInbox(orders: OrderListItem[], tab: string): OrderListItem[] {
  if (tab !== "all") return orders;

  return [...orders].sort((a, b) => {
    const aPending = a.status === "pending_confirmation" ? 1 : 0;
    const bPending = b.status === "pending_confirmation" ? 1 : 0;
    if (bPending !== aPending) return bPending - aPending;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

type OrdersHubListProps = {
  variant: OrderHubVariant;
  orders: OrderListItem[];
  empty: ReactNode;
  interactionDisabled?: boolean;
};

export function OrdersHubList({
  variant,
  orders,
  empty,
  interactionDisabled = false,
}: OrdersHubListProps) {
  if (orders.length === 0) {
    return <>{empty}</>;
  }

  const listTestId =
    variant === "buyer" ? "p17-orders-list-buyer" : "p17-orders-list-seller";

  return (
    <ul
      className="flex flex-col gap-2 md:gap-2"
      data-testid={listTestId}
      data-hub-variant={variant}
      dir="rtl"
    >
      {orders.map((order) => (
        <li key={order.id}>
          <OrderListCard
            order={order}
            variant={variant}
            interactionDisabled={interactionDisabled}
          />
        </li>
      ))}
    </ul>
  );
}

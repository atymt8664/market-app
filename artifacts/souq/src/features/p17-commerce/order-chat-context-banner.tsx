import { useLocation, useSearch } from "wouter";
import { Package } from "lucide-react";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { getBuyerOrderDetailPath, getSellerOrderDetailPath } from "./order-detail-paths";
import { useOrderDetail } from "./use-orders-api";
import { isCanonicalOrderNumber } from "./order-detail-display";

type OrderChatContextBannerProps = {
  orderNumber: string;
};

export function OrderChatContextBanner({ orderNumber }: OrderChatContextBannerProps) {
  const [, navigate] = useLocation();
  const search = useSearch();
  const orderRole = new URLSearchParams(search).get("orderRole") === "seller" ? "seller" : "buyer";
  const valid = isCanonicalOrderNumber(orderNumber);
  const detailQuery = useOrderDetail(orderRole, orderNumber, { enabled: valid });
  const order = detailQuery.data?.order;
  const statusLabel = order?.statusLabelAr ?? t("p17.commerce.chat.banner_status_loading");
  const detailPath =
    orderRole === "seller"
      ? getSellerOrderDetailPath(orderNumber)
      : getBuyerOrderDetailPath(orderNumber);

  if (!valid) return null;

  return (
    <div
      className="mx-auto w-full max-w-[820px] border-b border-primary/25 bg-primary/5 px-4 py-2.5"
      dir="rtl"
      data-testid="p17-chat-order-banner"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 text-right">
          <Package className="h-4 w-4 shrink-0 text-primary" strokeWidth={2} aria-hidden />
          <p className="truncate text-[12px] font-medium text-foreground">
            {t("p17.commerce.chat.banner_line", { orderNumber, status: statusLabel })}
          </p>
        </div>
        <button
          type="button"
          className={cn("shrink-0 text-[11px] font-semibold text-primary underline-offset-2 hover:underline")}
          data-testid="p17-chat-order-banner-view"
          onClick={() => navigate(detailPath)}
        >
          {t("p17.commerce.chat.banner_view_order")}
        </button>
      </div>
    </div>
  );
}

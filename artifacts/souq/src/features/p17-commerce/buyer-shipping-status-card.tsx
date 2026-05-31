import { Truck } from "lucide-react";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import type { OrderDetail } from "./orders-api.types";
import { ORDERS_CARD_COMPACT, ORDERS_CARD_TITLE } from "./orders-page-styles";

type BuyerShippingStatusCardProps = {
  order: OrderDetail;
};

function statusMessageKey(status: string): string {
  if (status === "confirmed") return "p17.commerce.shipping.buyer_status_confirmed";
  if (status === "preparing") return "p17.commerce.shipping.buyer_status_preparing";
  if (status === "shipped") return "p17.commerce.shipping.buyer_status_shipped";
  return "p17.commerce.shipping.buyer_status_default";
}

export function BuyerShippingStatusCard({ order }: BuyerShippingStatusCardProps) {
  const showTracking = order.status === "shipped" && order.shipment;

  return (
    <div className={cn(ORDERS_CARD_COMPACT, "py-3")} data-testid="p17-order-detail-buyer-shipping-status">
      <div className="mb-2 flex items-center justify-end gap-2">
        <p className={ORDERS_CARD_TITLE}>{t("p17.commerce.shipping.buyer_status_title")}</p>
        <Truck className="h-4 w-4 text-primary" strokeWidth={2} aria-hidden />
      </div>
      <p className="text-right text-[12px] leading-relaxed text-zinc-300">
        {t(statusMessageKey(order.status))}
      </p>
      {order.buyerAddress ? (
        <p className="mt-2 text-right text-[10px] text-zinc-500" data-testid="p17-order-detail-buyer-address">
          {t("p17.commerce.shipping.buyer_delivery_to", {
            city: order.buyerAddress.city,
            country: order.buyerAddress.countryCode,
          })}
        </p>
      ) : null}
      {showTracking ? (
        <div
          className="mt-2.5 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-right"
          data-testid="p17-order-detail-buyer-tracking"
        >
          <p className="text-[10px] text-zinc-500">{t("p17.commerce.shipping.buyer_tracking_label")}</p>
          <p className="text-[11px] font-medium text-primary">{order.shipment!.carrierLabel}</p>
          <p className="font-mono text-[11px] text-zinc-200" dir="ltr">
            {order.shipment!.trackingNumber}
          </p>
        </div>
      ) : null}
    </div>
  );
}

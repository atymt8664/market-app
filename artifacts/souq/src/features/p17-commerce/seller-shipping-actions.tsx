import { useState } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { P17_BUY_NOW_BTN } from "./ad-detail-commerce-styles";
import { OrdersApiClientError } from "./orders-api-errors";
import type { OrderDetail } from "./orders-api.types";
import { useMarkShippedOrder, useStartPreparingOrder } from "./use-orders-mutations";
import { useOpenOrderChat } from "./use-order-chat";
import { ORDERS_CARD_COMPACT, ORDERS_CARD_TITLE, ORDERS_GHOST_BTN } from "./orders-page-styles";

type SellerShippingActionsProps = {
  order: OrderDetail;
};

export function SellerShippingActions({ order }: SellerShippingActionsProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const orderChat = useOpenOrderChat();
  const startPreparing = useStartPreparingOrder();
  const markShipped = useMarkShippedOrder();
  const [carrierLabel, setCarrierLabel] = useState(order.shipment?.carrierLabel ?? "");
  const [trackingNumber, setTrackingNumber] = useState(order.shipment?.trackingNumber ?? "");

  const isConfirmed = order.status === "confirmed";
  const isPreparing = order.status === "preparing";
  const isShipped = order.status === "shipped";
  const showChat = isConfirmed || isPreparing || isShipped || order.status === "cancelled";

  const handleStartPreparing = async () => {
    try {
      await startPreparing.mutateAsync(order.orderNumber);
      toast({ title: t("p17.commerce.shipping.start_preparing_success") });
    } catch (err) {
      if (err instanceof OrdersApiClientError && err.status === 409) {
        toast({
          title: t("p17.commerce.detail.seller_action_not_allowed"),
          variant: "destructive",
        });
        return;
      }
      toast({
        title: t("p17.commerce.shipping.start_preparing_failed"),
        variant: "destructive",
      });
    }
  };

  const handleMarkShipped = async () => {
    const carrier = carrierLabel.trim();
    const tracking = trackingNumber.trim();
    if (!carrier || !tracking) {
      toast({
        title: t("p17.commerce.shipping.mark_shipped_validation"),
        variant: "destructive",
      });
      return;
    }
    try {
      await markShipped.mutateAsync({
        orderNumber: order.orderNumber,
        carrierLabel: carrier,
        trackingNumber: tracking,
      });
      toast({ title: t("p17.commerce.shipping.mark_shipped_success") });
    } catch (err) {
      if (err instanceof OrdersApiClientError && err.status === 409) {
        toast({
          title: t("p17.commerce.detail.seller_action_not_allowed"),
          variant: "destructive",
        });
        return;
      }
      toast({
        title: t("p17.commerce.shipping.mark_shipped_failed"),
        variant: "destructive",
      });
    }
  };

  return (
    <div className={cn(ORDERS_CARD_COMPACT, "py-3")} data-testid="p17-order-detail-seller-shipping-actions">
      <p className={cn(ORDERS_CARD_TITLE, "mb-2")}>{t("p17.commerce.shipping.seller_actions_title")}</p>

      {order.buyerAddress ? (
        <div
          className="mb-2.5 rounded-xl border border-primary/20 bg-[#0A0A0A] px-3 py-2 text-right"
          data-testid="p17-order-detail-seller-address"
        >
          <p className="text-[10px] text-zinc-500">{t("p17.commerce.shipping.buyer_address_label")}</p>
          <p className="text-[11px] font-medium text-foreground">
            {order.buyerAddress.city}, {order.buyerAddress.countryCode}
            {order.buyerAddress.postalCode ? ` · ${order.buyerAddress.postalCode}` : ""}
          </p>
          <p className="text-[10px] text-zinc-400">{order.buyerAddress.line1}</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        {isConfirmed ? (
          <button
            type="button"
            className={cn(P17_BUY_NOW_BTN, "h-11 w-full text-sm")}
            disabled={startPreparing.isPending}
            data-testid="p17-order-detail-seller-start-preparing"
            onClick={() => void handleStartPreparing()}
          >
            {startPreparing.isPending ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            ) : (
              t("p17.commerce.shipping.action_start_preparing")
            )}
          </button>
        ) : null}

        {isPreparing ? (
          <>
            <label className="block text-right">
              <span className="text-[10px] text-zinc-500">{t("p17.commerce.shipping.carrier_label")}</span>
              <input
                type="text"
                value={carrierLabel}
                onChange={(e) => setCarrierLabel(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-primary/30 bg-[#0A0A0A] px-3 text-sm text-foreground outline-none focus:border-primary/60"
                data-testid="p17-order-detail-seller-carrier"
                dir="rtl"
              />
            </label>
            <label className="block text-right">
              <span className="text-[10px] text-zinc-500">{t("p17.commerce.shipping.tracking_label")}</span>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-primary/30 bg-[#0A0A0A] px-3 text-sm text-foreground outline-none focus:border-primary/60"
                data-testid="p17-order-detail-seller-tracking"
                dir="ltr"
              />
            </label>
            <button
              type="button"
              className={cn(P17_BUY_NOW_BTN, "h-11 w-full text-sm")}
              disabled={markShipped.isPending}
              data-testid="p17-order-detail-seller-mark-shipped"
              onClick={() => void handleMarkShipped()}
            >
              {markShipped.isPending ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              ) : (
                t("p17.commerce.shipping.action_mark_shipped")
              )}
            </button>
          </>
        ) : null}

        {isShipped && order.shipment ? (
          <div
            className="rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 text-right"
            data-testid="p17-order-detail-seller-shipment-readonly"
          >
            <p className="text-[10px] text-zinc-500">{t("p17.commerce.shipping.shipment_recorded")}</p>
            <p className="text-[11px] font-medium text-primary">{order.shipment.carrierLabel}</p>
            <p className="font-mono text-[11px] text-zinc-300" dir="ltr">
              {order.shipment.trackingNumber}
            </p>
          </div>
        ) : null}

        {showChat ? (
          <button
            type="button"
            className={cn(
              isPreparing || isShipped ? ORDERS_GHOST_BTN : P17_BUY_NOW_BTN,
              "h-11 w-full text-sm",
            )}
            disabled={orderChat.isPending}
            data-testid="p17-order-detail-seller-chat-buyer"
            onClick={() => orderChat.open(order.adId, order.orderNumber, "seller")}
          >
            {t("p17.commerce.detail.seller_action_chat_buyer")}
          </button>
        ) : null}

        <button
          type="button"
          className={cn(ORDERS_GHOST_BTN, "h-10 w-full text-xs")}
          data-testid="p17-order-detail-seller-view-ad"
          onClick={() => navigate(`/ad/${order.adId}`)}
        >
          {t("p17.commerce.detail.view_ad")}
        </button>
      </div>
    </div>
  );
}

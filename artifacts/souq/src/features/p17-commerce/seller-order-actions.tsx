import { useState } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { P17_BUY_NOW_BTN } from "./ad-detail-commerce-styles";
import { OrdersApiClientError } from "./orders-api-errors";
import type { OrderDetail } from "./orders-api.types";
import { useAcceptSellerOrder, useRejectSellerOrder } from "./use-orders-mutations";
import { useOpenOrderChat } from "./use-order-chat";
import { ORDERS_CARD_COMPACT, ORDERS_CARD_TITLE, ORDERS_GHOST_BTN } from "./orders-page-styles";

type SellerActionsCardProps = {
  order: OrderDetail;
  isMock: boolean;
};

export function SellerActionsCard({ order, isMock }: SellerActionsCardProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const orderChat = useOpenOrderChat();
  const acceptOrder = useAcceptSellerOrder();
  const rejectOrder = useRejectSellerOrder();
  const [rejectOpen, setRejectOpen] = useState(false);

  const isPending = !isMock && order.status === "pending_confirmation";
  const isConfirmed = !isMock && order.status === "confirmed";
  const showChat = !isMock && (isPending || isConfirmed || order.status === "cancelled");

  const handleAccept = async () => {
    try {
      await acceptOrder.mutateAsync(order.orderNumber);
      toast({ title: t("p17.commerce.detail.seller_accept_success") });
    } catch (err) {
      if (err instanceof OrdersApiClientError && err.status === 409) {
        toast({
          title: t("p17.commerce.detail.seller_action_not_allowed"),
          variant: "destructive",
        });
        return;
      }
      toast({
        title: t("p17.commerce.detail.seller_accept_failed"),
        variant: "destructive",
      });
    }
  };

  const handleReject = async () => {
    setRejectOpen(false);
    try {
      await rejectOrder.mutateAsync(order.orderNumber);
      toast({ title: t("p17.commerce.detail.seller_reject_success") });
    } catch (err) {
      if (err instanceof OrdersApiClientError && err.status === 409) {
        toast({
          title: t("p17.commerce.detail.seller_action_not_allowed"),
          variant: "destructive",
        });
        return;
      }
      toast({
        title: t("p17.commerce.detail.seller_reject_failed"),
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className={cn(ORDERS_CARD_COMPACT, "py-3")} data-testid="p17-order-detail-seller-actions">
        <p className={cn(ORDERS_CARD_TITLE, "mb-2")}>{t("p17.commerce.detail.seller_actions_title")}</p>
        <div className="flex flex-col gap-2">
          {isPending ? (
            <>
              <button
                type="button"
                className={cn(P17_BUY_NOW_BTN, "h-11 w-full text-sm")}
                disabled={acceptOrder.isPending}
                data-testid="p17-order-detail-seller-accept"
                onClick={() => void handleAccept()}
              >
                {acceptOrder.isPending ? (
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                ) : (
                  t("p17.commerce.detail.seller_action_accept")
                )}
              </button>
              <button
                type="button"
                className={cn(
                  ORDERS_GHOST_BTN,
                  "h-10 w-full border border-red-500/35 text-xs text-red-200/90",
                )}
                disabled={rejectOrder.isPending}
                data-testid="p17-order-detail-seller-reject"
                onClick={() => setRejectOpen(true)}
              >
                {t("p17.commerce.detail.seller_action_reject")}
              </button>
            </>
          ) : null}
          {showChat ? (
            <button
              type="button"
              className={cn(
                isPending ? ORDERS_GHOST_BTN : P17_BUY_NOW_BTN,
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

      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent className="border-primary/30 bg-[#0A0A0A] text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("p17.commerce.detail.seller_reject_confirm_title")}</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {t("p17.commerce.detail.seller_reject_confirm_body")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className={ORDERS_GHOST_BTN}>{t("common.cancel")}</AlertDialogCancel>
            <button
              type="button"
              className={cn(
                ORDERS_GHOST_BTN,
                "border border-red-500/40 text-red-200 hover:bg-red-500/10",
              )}
              disabled={rejectOrder.isPending}
              data-testid="p17-order-detail-seller-reject-confirm"
              onClick={() => void handleReject()}
            >
              {rejectOrder.isPending ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              ) : (
                t("p17.commerce.detail.seller_action_reject")
              )}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

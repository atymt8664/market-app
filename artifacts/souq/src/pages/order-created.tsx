import { useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { ArrowRight, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { isCanonicalOrderNumber } from "@/features/p17-commerce/order-detail-display";
import { getBuyerOrderDetailPath } from "@/features/p17-commerce/order-detail-paths";
import { useOpenOrderChat } from "@/features/p17-commerce/use-order-chat";
import { useOrderDetail } from "@/features/p17-commerce/use-orders-api";
import { P17_BUY_NOW_BTN } from "@/features/p17-commerce/ad-detail-commerce-styles";
import {
  CREATE_AD_BACK_BTN,
  CREATE_AD_HEADER_BAR,
  CREATE_AD_HEADER_INNER,
  CREATE_AD_MAIN_COLUMN,
  ORDERS_CARD,
  ORDERS_CARD_COMPACT,
  ORDERS_GHOST_BTN,
  ORDERS_PAGE_LAYOUT_BOTTOM_CANCEL,
} from "@/features/p17-commerce/orders-page-styles";
export default function OrderCreatedPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const orderChat = useOpenOrderChat();

  const params = new URLSearchParams(search);
  const orderNumber = params.get("orderNumber")?.trim() ?? "";
  const validOrder = isCanonicalOrderNumber(orderNumber);

  const detailQuery = useOrderDetail("buyer", orderNumber, {
    enabled: validOrder && isAuthenticated,
  });
  const order = detailQuery.data?.order;

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate("/login?redirect=/orders");
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && !validOrder) {
      navigate("/orders", { replace: true });
    }
  }, [authLoading, isAuthenticated, validOrder, navigate]);

  if (authLoading || !isAuthenticated || !validOrder) {
    return null;
  }

  return (
    <div
      className={cn("flex min-h-0 w-full flex-col bg-[#0A0A0A]", ORDERS_PAGE_LAYOUT_BOTTOM_CANCEL)}
      dir="rtl"
      data-testid="p17-order-created-page"
    >
      <header className={CREATE_AD_HEADER_BAR}>
        <div className={CREATE_AD_HEADER_INNER}>
          <h1 className="truncate text-sm font-bold text-foreground">
            {t("p17.commerce.created.title")}
          </h1>
          <button
            type="button"
            onClick={() => navigate("/orders")}
            className={CREATE_AD_BACK_BTN}
            aria-label={t("p17.commerce.created.back_to_hub")}
          >
            <ArrowRight className="h-5 w-5" strokeWidth={2.25} />
          </button>
        </div>
      </header>

      <main className={CREATE_AD_MAIN_COLUMN}>
        <div className={cn(ORDERS_CARD, "py-6 text-center")}>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-primary/45 bg-primary/15">
            <Check className="h-8 w-8 text-primary" strokeWidth={2.5} />
          </div>
          <h2 className="text-lg font-bold text-foreground">{t("p17.commerce.created.headline")}</h2>
          <p
            className="mt-2 font-mono text-sm font-semibold text-primary"
            data-testid="p17-order-created-number"
          >
            {orderNumber}
          </p>
          {order ? (
            <p className="mt-1 text-sm text-zinc-400">
              {order.title} — {order.totalAmount} {order.currency}
            </p>
          ) : null}
        </div>

        <div className={ORDERS_CARD_COMPACT}>
          <p className="text-xs font-semibold text-zinc-500">{t("p17.commerce.created.what_next_title")}</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-[11px] text-zinc-300">
            <li>{t("p17.commerce.created.what_next_seller")}</li>
            <li>{t("p17.commerce.created.what_next_hub")}</li>
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            className={cn(P17_BUY_NOW_BTN, "h-12 w-full")}
            data-testid="p17-order-created-view-detail"
            onClick={() => navigate(getBuyerOrderDetailPath(orderNumber))}
          >
            {t("p17.commerce.created.view_detail")}
          </button>
          {order && !detailQuery.data?.mock ? (
            <button
              type="button"
              className={cn(ORDERS_GHOST_BTN, "h-11 w-full text-sm")}
              disabled={orderChat.isPending}
              data-testid="p17-order-created-chat"
              onClick={() => orderChat.open(order.adId, orderNumber)}
            >
              {t("p17.commerce.created.chat_seller")}
            </button>
          ) : null}
        </div>
      </main>
    </div>
  );
}

import { useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Loader2, Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { CommerceMockDataBanner } from "./commerce-mock-data-banner";
import { getOrdersListPath } from "./order-detail-paths";
import { isCanonicalOrderNumber, shouldMaskOrderNumber } from "./order-detail-display";
import { OrderTrackingTrack } from "./order-tracking-track";
import { useOrderDetail, useOrderTimeline } from "./use-orders-api";
import { useCancelBuyerOrder } from "./use-orders-mutations";
import { useOpenOrderChat } from "./use-order-chat";
import type { OrderDetail } from "./orders-api.types";
import { P17_BUY_NOW_BTN } from "./ad-detail-commerce-styles";
import { isP17SellerOrdersEnabled, isP17ShippingEnabled } from "./p17-commerce-flags";
import { SellerActionsCard } from "./seller-order-actions";
import { SellerShippingActions } from "./seller-shipping-actions";
import { BuyerShippingStatusCard } from "./buyer-shipping-status-card";
import { BuyerOrderAddressCard } from "./buyer-order-address-card";
import { SellerDeliveryAddressCard } from "./seller-delivery-address-card";
import { resolveBuyerStatusLabel } from "./order-status-display";
import { useToast } from "@/hooks/use-toast";
import { OrdersApiClientError } from "./orders-api-errors";
import {
  CREATE_AD_BACK_BTN,
  CREATE_AD_HEADER_BAR,
  CREATE_AD_HEADER_INNER,
  CREATE_AD_MAIN_COLUMN,
  ORDERS_BUYER_PAGE_TITLE_HEADING,
  ORDERS_CARD_COMPACT,
  ORDERS_CARD_TITLE,
  ORDERS_GHOST_BTN,
  ORDERS_PAGE_LAYOUT_BOTTOM_CANCEL,
  ORDERS_SCROLL_END_SPACER,
  ORDERS_SECTION_LABEL,
} from "./orders-page-styles";

export type OrderDetailVariant = "buyer" | "seller";

type OrderDetailPageProps = {
  variant: OrderDetailVariant;
  orderId?: string;
};

function isValidOrderId(orderId: string | undefined): orderId is string {
  return typeof orderId === "string" && orderId.trim().length > 0;
}

export function OrderDetailPage({ variant, orderId }: OrderDetailPageProps) {
  const [, navigate] = useLocation();
  const listPath = getOrdersListPath(variant);
  const pageTestId =
    variant === "buyer" ? "p17-order-detail-page-buyer" : "p17-order-detail-page-seller";
  const headerTestId =
    variant === "buyer" ? "p17-order-detail-header-buyer" : "p17-order-detail-header-seller";
  const headerTitleKey =
    variant === "buyer" ? "p17.commerce.detail.buyer_title" : "p17.commerce.detail.seller_title";

  const trimmedId = orderId?.trim() ?? "";
  const isPreviewRoute = isValidOrderId(orderId) && shouldMaskOrderNumber(orderId);

  useEffect(() => {
    if (isPreviewRoute) {
      navigate(listPath);
    }
  }, [isPreviewRoute, listPath, navigate]);

  const detailQuery = useOrderDetail(variant, trimmedId, {
    enabled: isValidOrderId(orderId) && !isPreviewRoute && isCanonicalOrderNumber(trimmedId),
  });

  const isMockResponse = detailQuery.data?.mock === true;
  const order = detailQuery.data?.order;

  const timelineQuery = useOrderTimeline(trimmedId, {
    enabled:
      Boolean(order) &&
      !isMockResponse &&
      isCanonicalOrderNumber(trimmedId) &&
      !detailQuery.isLoading,
  });

  if (!isValidOrderId(orderId) || isPreviewRoute) {
    if (isPreviewRoute) {
      return null;
    }
    return (
      <OrderDetailNotFound
        onBack={() => navigate(listPath)}
        pageTestId={pageTestId}
        headerTestId={headerTestId}
        headerTitleKey={headerTitleKey}
      />
    );
  }

  if (detailQuery.isError || (!detailQuery.isLoading && !order)) {
    return (
      <OrderDetailNotFound
        onBack={() => navigate(listPath)}
        pageTestId={pageTestId}
        headerTestId={headerTestId}
        headerTitleKey={headerTitleKey}
      />
    );
  }

  return (
    <div
      className={cn("flex min-h-0 w-full flex-col bg-[#0A0A0A]", ORDERS_PAGE_LAYOUT_BOTTOM_CANCEL)}
      dir="rtl"
      data-testid={pageTestId}
    >
      <OrderDetailHeader
        title={t(headerTitleKey)}
        onBack={() => navigate(listPath)}
        testId={headerTestId}
      />

      <main className={CREATE_AD_MAIN_COLUMN}>
        {detailQuery.isLoading ? (
          <OrderDetailSkeleton />
        ) : (
          <>
            {isMockResponse ? (
              <section>
                <CommerceMockDataBanner testId="p17-order-detail-mock-banner" />
              </section>
            ) : null}

            <section>
              <p className={ORDERS_SECTION_LABEL}>{t("p17.commerce.detail.summary_section")}</p>
              {order ? (
                <OrderSummaryCard
                  order={order}
                  isMock={isMockResponse}
                  variant={variant}
                  statusLabel={
                    variant === "buyer"
                      ? resolveBuyerStatusLabel(order, timelineQuery.data?.items)
                      : order.statusLabelAr
                  }
                />
              ) : null}
            </section>

            {variant === "seller" &&
            order &&
            !isMockResponse &&
            order.fulfillmentMode === "shipping" &&
            order.buyerAddress ? (
              <section>
                <SellerDeliveryAddressCard address={order.buyerAddress} />
              </section>
            ) : null}

            {variant === "buyer" &&
            order &&
            !isMockResponse &&
            order.fulfillmentMode === "shipping" &&
            order.buyerAddress ? (
              <section>
                <BuyerOrderAddressCard address={order.buyerAddress} />
              </section>
            ) : null}

            {variant === "buyer" && order && !isMockResponse && isP17ShippingEnabled() && order.fulfillmentMode === "shipping" ? (
              <section>
                <BuyerShippingStatusCard order={order} />
              </section>
            ) : null}

            {order && !isMockResponse ? (
              <section>
                <OrderTrackingTrack
                  order={order}
                  compact={variant === "seller"}
                  timelineItems={timelineQuery.data?.items}
                  timelineLoading={!isMockResponse && timelineQuery.isLoading}
                />
              </section>
            ) : null}

            <section>
              {variant === "buyer" && order ? (
                <BuyerActionsCard order={order} isMock={isMockResponse} />
              ) : null}
              {variant === "seller" && order ? (
                isP17SellerOrdersEnabled() ? (
                  order.status === "pending_confirmation" || isMockResponse ? (
                    <SellerActionsCard order={order} isMock={isMockResponse} />
                  ) : isP17ShippingEnabled() && order.fulfillmentMode === "shipping" ? (
                    <SellerShippingActions order={order} />
                  ) : (
                    <SellerActionsCard order={order} isMock={isMockResponse} />
                  )
                ) : (
                  <SellerOrderDetailDeferred />
                )
              ) : null}
            </section>

            <div aria-hidden className={ORDERS_SCROLL_END_SPACER} data-testid="p17-order-detail-scroll-spacer" />
          </>
        )}
      </main>
    </div>
  );
}

function OrderDetailHeader({
  title,
  onBack,
  testId,
}: {
  title: string;
  onBack: () => void;
  testId: string;
}) {
  return (
    <header className={CREATE_AD_HEADER_BAR} dir="rtl" data-testid={testId}>
      <div className={CREATE_AD_HEADER_INNER}>
        <h1 className="min-w-0 flex-1 text-start">
          <span className={ORDERS_BUYER_PAGE_TITLE_HEADING}>{title}</span>
        </h1>
        <button type="button" onClick={onBack} className={CREATE_AD_BACK_BTN} aria-label={t("common.back")}>
          <ArrowRight className="h-5 w-5" strokeWidth={2.25} />
        </button>
      </div>
    </header>
  );
}

function OrderSummaryCard({
  order,
  isMock,
  variant,
  statusLabel,
}: {
  order: OrderDetail;
  isMock: boolean;
  variant: OrderDetailVariant;
  statusLabel: string;
}) {
  const orderNumberDisplay = order.orderNumber;

  return (
    <div className={cn(ORDERS_CARD_COMPACT, "py-3")} data-testid="p17-order-detail-summary">
      <div className="flex items-start gap-3">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-primary/35 bg-[#0A0A0A] text-primary md:h-16 md:w-16"
          aria-hidden
        >
          <Package className="h-6 w-6 md:h-7 md:w-7" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1 text-right">
          <SummaryRow label={t("p17.commerce.detail.product_name")} value={order.title} />
          <SummaryRow
            label={t("p17.commerce.detail.order_number")}
            value={orderNumberDisplay}
            mono
          />
          <SummaryRow
            label={t("p17.commerce.detail.price")}
            value={`${order.totalAmount} ${order.currency}`}
            highlight
          />
          {variant === "seller" && !isMock ? (
            <SummaryRow
              label={t("p17.commerce.detail.buyer_label")}
              value={t("p17.commerce.detail.buyer_ref", { id: String(order.buyerUserId) })}
            />
          ) : null}
          <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
            <span className="text-[11px] text-zinc-500">{t("p17.commerce.detail.status")}</span>
            <span
              className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary"
              data-testid="p17-order-detail-status"
            >
              {statusLabel}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-zinc-500">
            {t("p17.commerce.detail.last_updated")}: {order.updatedAtRelativeAr}
          </p>
          {isMock ? (
            <p className="mt-2 text-[10px] text-amber-200/80">{t("p17.commerce.preview.mock_notice")}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="mt-1 first:mt-0">
      <p className="text-[10px] text-zinc-500">{label}</p>
      <p
        className={cn(
          "text-sm font-semibold text-foreground",
          mono && "font-mono text-[11px] font-medium text-zinc-400",
          highlight && "text-base font-bold text-primary md:text-lg",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function BuyerActionsCard({ order, isMock }: { order: OrderDetail; isMock: boolean }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const orderChat = useOpenOrderChat();
  const cancelOrder = useCancelBuyerOrder();
  const canCancel = !isMock && order.status === "pending_confirmation";

  const handleCancel = async () => {
    try {
      await cancelOrder.mutateAsync(order.orderNumber);
      toast({ title: t("p17.commerce.detail.cancel_success") });
    } catch (err) {
      if (err instanceof OrdersApiClientError && err.status === 409) {
        toast({
          title: t("p17.commerce.detail.cancel_not_allowed"),
          variant: "destructive",
        });
        return;
      }
      toast({
        title: t("p17.commerce.detail.cancel_failed"),
        variant: "destructive",
      });
    }
  };

  return (
    <div className={cn(ORDERS_CARD_COMPACT, "py-3")} data-testid="p17-order-detail-buyer-actions">
      <p className={cn(ORDERS_CARD_TITLE, "mb-2")}>{t("p17.commerce.detail.buyer_actions_title")}</p>
      <div className="flex flex-col gap-2">
        {!isMock ? (
          <button
            type="button"
            className={cn(P17_BUY_NOW_BTN, "h-11 w-full text-sm")}
            disabled={orderChat.isPending}
            data-testid="p17-order-detail-chat-seller"
            onClick={() => orderChat.open(order.adId, order.orderNumber)}
          >
            {t("p17.commerce.detail.buyer_action_contact_seller")}
          </button>
        ) : null}
        {canCancel ? (
          <button
            type="button"
            className={cn(ORDERS_GHOST_BTN, "h-10 w-full text-xs")}
            disabled={cancelOrder.isPending}
            data-testid="p17-order-detail-cancel"
            onClick={() => void handleCancel()}
          >
            {cancelOrder.isPending ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            ) : (
              t("p17.commerce.detail.cancel_order")
            )}
          </button>
        ) : null}
        <button
          type="button"
          className={cn(ORDERS_GHOST_BTN, "h-10 w-full text-xs")}
          data-testid="p17-order-detail-view-ad"
          onClick={() => navigate(`/ad/${order.adId}`)}
        >
          {t("p17.commerce.detail.view_ad")}
        </button>
      </div>
    </div>
  );
}

function SellerOrderDetailDeferred() {
  return (
    <div className={cn(ORDERS_CARD_COMPACT, "py-3 text-center")} data-testid="p17-order-detail-seller-phase-deferred">
      <p className={cn(ORDERS_CARD_TITLE, "mb-1.5")}>{t("p17.commerce.detail.seller_phase_deferred_title")}</p>
      <p className="mx-auto max-w-[20rem] text-[11px] leading-relaxed text-zinc-500">
        {t("p17.commerce.detail.seller_phase_deferred_body")}
      </p>
    </div>
  );
}

function OrderDetailNotFound({
  onBack,
  pageTestId,
  headerTestId,
  headerTitleKey,
}: {
  onBack: () => void;
  pageTestId: string;
  headerTestId: string;
  headerTitleKey: string;
}) {
  return (
    <div
      className={cn("flex min-h-0 w-full flex-col bg-[#0A0A0A]", ORDERS_PAGE_LAYOUT_BOTTOM_CANCEL)}
      dir="rtl"
      data-testid={pageTestId}
    >
      <OrderDetailHeader title={t(headerTitleKey)} onBack={onBack} testId={headerTestId} />

      <main className={CREATE_AD_MAIN_COLUMN}>
        <div
          className={cn(ORDERS_CARD_COMPACT, "py-6 text-center")}
          data-testid="p17-order-detail-not-found"
        >
          <Package className="mx-auto mb-2 h-7 w-7 text-primary" strokeWidth={2} />
          <p className="text-sm font-semibold text-foreground">{t("p17.commerce.detail.not_found_title")}</p>
          <p className="mx-auto mt-1.5 max-w-[18rem] text-[11px] leading-relaxed text-zinc-500">
            {t("p17.commerce.detail.not_found_body")}
          </p>
          <button
            type="button"
            onClick={onBack}
            data-testid="p17-order-detail-back-cta"
            className={cn(
              ORDERS_GHOST_BTN,
              "mx-auto mt-3 min-h-9 w-auto min-w-[8.75rem] px-3 py-1.5 text-[11px]",
            )}
          >
            {t("p17.commerce.detail.back_to_orders")}
          </button>
        </div>

        <div aria-hidden className={ORDERS_SCROLL_END_SPACER} data-testid="p17-order-detail-scroll-spacer" />
      </main>
    </div>
  );
}

function OrderDetailSkeleton() {
  return (
    <div className="flex flex-col gap-2.5 md:gap-3" data-testid="p17-order-detail-skeleton" aria-busy="true">
      <Skeleton className="h-28 w-full rounded-2xl bg-primary/10" />
      <Skeleton className="h-24 w-full rounded-2xl bg-primary/10" />
      <Skeleton className="h-32 w-full rounded-2xl bg-primary/10" />
    </div>
  );
}

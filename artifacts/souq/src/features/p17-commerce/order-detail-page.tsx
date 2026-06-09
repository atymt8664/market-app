import { useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Loader2, Package, Truck } from "lucide-react";
import { getGetAdQueryKey, useGetAd } from "@workspace/api-client-react";
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
import type { OrderDetail, OrderTimelineEntry } from "./orders-api.types";
import { P17_BUY_NOW_BTN } from "./ad-detail-commerce-styles";
import { isP17SellerOrdersEnabled, isP17ShippingEnabled } from "./p17-commerce-flags";
import { SellerActionsCard } from "./seller-order-actions";
import { SellerShippingActions } from "./seller-shipping-actions";
import { BuyerShippingStatusCard } from "./buyer-shipping-status-card";
import { BuyerOrderAddressCard } from "./buyer-order-address-card";
import { SellerDeliveryAddressCard } from "./seller-delivery-address-card";
import { resolveOrderStatusLabel, formatOrderUpdatedAt, formatOrderPrice } from "./order-display-labels";
import { OrderNumberCopy } from "./order-number-copy";
import { OrderProductThumbnail } from "./order-product-thumbnail";
import {
  inferListFulfillmentMode,
  ORDER_STATUS_BADGE_CLASS,
  ORDERS_LIST_CARD_NEUTRAL,
  resolveOrderStatusTone,
} from "./order-status-tone";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { OrdersApiClientError } from "./orders-api-errors";
import {
  CREATE_AD_BACK_BTN,
  CREATE_AD_HEADER_BAR,
  CREATE_AD_HEADER_INNER,
  CREATE_AD_MAIN_COLUMN,
  ORDERS_BUYER_PAGE_TITLE_HEADING,
  ORDERS_CARD_SUPPORT,
  ORDERS_LIST_CARD_INBOX,
  ORDERS_CARD_TITLE,
  ORDERS_GHOST_BTN,
  ORDERS_PAGE_LAYOUT_BOTTOM_CANCEL,
  ORDERS_SCROLL_END_SPACER,
  ORDERS_STICKY_CTA_BAR,
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
  const { user, isLoading: authLoading } = useAuth();
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

  const detailQueryEnabled =
    isValidOrderId(orderId) && !isPreviewRoute && isCanonicalOrderNumber(trimmedId);

  const detailQuery = useOrderDetail(variant, trimmedId, {
    enabled: detailQueryEnabled,
  });

  const isMockResponse = detailQuery.data?.mock === true;
  const order = detailQuery.data?.order;
  const hasOrder = Boolean(order);

  /** Wait for auth + order query to fully settle before any 404 UI. */
  const detailQuerySettled =
    detailQuery.isFetched && detailQuery.fetchStatus === "idle";
  const showDetailSkeleton =
    authLoading ||
    (detailQueryEnabled && (!user || (!hasOrder && !detailQuerySettled)));
  const showNotFound =
    detailQueryEnabled &&
    !!user &&
    detailQuerySettled &&
    !hasOrder;

  const timelineQuery = useOrderTimeline(trimmedId, {
    enabled:
      hasOrder &&
      !isMockResponse &&
      isCanonicalOrderNumber(trimmedId) &&
      !showDetailSkeleton,
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

  const showTracking = Boolean(order && !isMockResponse);
  const showBuyerShippingStatus =
    variant === "buyer" &&
    order &&
    !isMockResponse &&
    isP17ShippingEnabled() &&
    order.fulfillmentMode === "shipping" &&
    !showTracking;

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

      <main className={cn(CREATE_AD_MAIN_COLUMN, "gap-1.5 md:gap-2")}>
        {showDetailSkeleton ? (
          <OrderDetailSkeleton />
        ) : showNotFound ? (
          <OrderDetailNotFoundPanel onBack={() => navigate(listPath)} />
        ) : (
          <>
            {isMockResponse ? (
              <section>
                <CommerceMockDataBanner testId="p17-order-detail-mock-banner" />
              </section>
            ) : null}

            <section aria-label={t("p17.commerce.detail.summary_section")}>
              {order ? (
                <OrderSummaryCard
                  order={order}
                  isMock={isMockResponse}
                  variant={variant}
                  timelineItems={timelineQuery.data?.items}
                />
              ) : null}
            </section>

            {showTracking && order ? (
              <section>
                <OrderTrackingTrack
                  order={order}
                  premiumCompact
                  timelineItems={timelineQuery.data?.items}
                  timelineLoading={timelineQuery.isLoading}
                />
              </section>
            ) : null}

            {showBuyerShippingStatus && order ? (
              <section>
                <BuyerShippingStatusCard order={order} />
              </section>
            ) : null}

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

            <section>
              {variant === "buyer" && order ? (
                <BuyerActionsCard order={order} isMock={isMockResponse} stickyPrimary />
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

            {variant === "buyer" && order && !isMockResponse ? (
              <OrderDetailBuyerStickyCta order={order} />
            ) : null}

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
  timelineItems,
}: {
  order: OrderDetail;
  isMock: boolean;
  variant: OrderDetailVariant;
  timelineItems?: OrderTimelineEntry[];
}) {
  const { data: ad } = useGetAd(order.adId, {
    query: {
      enabled: order.adId > 0 && !isMock,
      queryKey: getGetAdQueryKey(order.adId),
      staleTime: 300_000,
      retry: 1,
    },
  });
  const statusTone = resolveOrderStatusTone(order.status);
  const statusLabel = resolveOrderStatusLabel(order, variant, timelineItems);
  const fulfillmentMode = inferListFulfillmentMode(order.status, order.fulfillmentMode);
  const imageUrl = ad?.images?.[0] ?? order.imageUrl ?? null;

  return (
    <div
      className={cn(ORDERS_LIST_CARD_INBOX, ORDERS_LIST_CARD_NEUTRAL)}
      data-testid="p17-order-detail-summary"
      data-layout="detail-row"
    >
      <div className="flex w-full items-start gap-2.5 md:gap-3">
        <OrderProductThumbnail
          imageUrl={imageUrl}
          title={order.title}
          size="detailRow"
          className="border-primary/25"
        />

        <div className="min-w-0 flex-1 space-y-0.5 text-right">
          <h2 className="line-clamp-2 text-[15px] font-bold leading-[1.15rem] text-foreground md:text-base">
            {order.title}
          </h2>

          <p className="text-[16px] font-bold tabular-nums leading-none text-primary md:text-[17px]">
            {formatOrderPrice(order.totalAmount, order.currency)}
          </p>

          <div className="flex flex-wrap items-center justify-end gap-1 pt-0.5">
            <span
              className={cn(
                "inline-flex rounded-full border px-1.5 py-px text-[10px] font-semibold md:text-[11px]",
                ORDER_STATUS_BADGE_CLASS[statusTone],
              )}
              data-testid="p17-order-detail-status"
            >
              {statusLabel}
            </span>
            {fulfillmentMode ? (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-primary/25 bg-primary/8 px-1.5 py-0.5 text-[10px] font-semibold text-primary/90">
                {fulfillmentMode === "shipping" ? (
                  <Truck className="h-2.5 w-2.5" strokeWidth={2.25} aria-hidden />
                ) : (
                  <Package className="h-2.5 w-2.5" strokeWidth={2.25} aria-hidden />
                )}
                {fulfillmentMode === "shipping"
                  ? t("p17.commerce.fulfillment.shipping")
                  : t("p17.commerce.fulfillment.pickup")}
              </span>
            ) : null}
          </div>

          <OrderNumberCopy orderNumber={order.orderNumber} compact testId="p17-order-detail-number-copy" />

          <p className="text-[10px] text-zinc-500 md:text-[11px]">{formatOrderUpdatedAt(order)}</p>

          {isMock ? (
            <p className="text-[10px] text-amber-200/80">{t("p17.commerce.preview.mock_notice")}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function OrderDetailBuyerStickyCta({ order }: { order: OrderDetail }) {
  const orderChat = useOpenOrderChat();

  return (
    <div className={cn(ORDERS_STICKY_CTA_BAR, "md:hidden")} data-testid="p17-order-detail-buyer-sticky-cta">
      <button
        type="button"
        className={cn(P17_BUY_NOW_BTN, "h-11 w-full text-sm")}
        disabled={orderChat.isPending}
        data-testid="p17-order-detail-chat-seller-sticky"
        onClick={() => orderChat.open(order.adId, order.orderNumber)}
      >
        {t("p17.commerce.detail.buyer_action_contact_seller")}
      </button>
    </div>
  );
}

function BuyerActionsCard({
  order,
  isMock,
  stickyPrimary = false,
}: {
  order: OrderDetail;
  isMock: boolean;
  stickyPrimary?: boolean;
}) {
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
    <div
      className={cn(ORDERS_CARD_SUPPORT, "py-2 md:py-2.5")}
      data-testid="p17-order-detail-buyer-actions"
      aria-label={t("p17.commerce.detail.buyer_actions_title")}
    >
      <div className="flex flex-col gap-1.5">
        {!isMock ? (
          <button
            type="button"
            className={cn(P17_BUY_NOW_BTN, "hidden h-11 w-full text-sm md:flex")}
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
    <div className={cn(ORDERS_CARD_SUPPORT, "py-3 text-center")} data-testid="p17-order-detail-seller-phase-deferred">
      <p className={cn(ORDERS_CARD_TITLE, "mb-1.5")}>{t("p17.commerce.detail.seller_phase_deferred_title")}</p>
      <p className="mx-auto max-w-[20rem] text-[11px] leading-relaxed text-zinc-500">
        {t("p17.commerce.detail.seller_phase_deferred_body")}
      </p>
    </div>
  );
}

function OrderDetailNotFoundPanel({ onBack }: { onBack: () => void }) {
  return (
    <>
      <div
        className={cn(ORDERS_CARD_SUPPORT, "py-6 text-center")}
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
    </>
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
        <OrderDetailNotFoundPanel onBack={onBack} />
      </main>
    </div>
  );
}

function OrderDetailSkeleton() {
  return (
    <div className="flex flex-col gap-2 md:gap-2.5" data-testid="p17-order-detail-skeleton" aria-busy="true">
      <Skeleton className="h-24 w-full rounded-2xl bg-primary/10" />
      <Skeleton className="h-20 w-full rounded-2xl bg-primary/10" />
      <Skeleton className="h-28 w-full rounded-2xl bg-primary/10" />
    </div>
  );
}

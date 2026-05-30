import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Check, Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { getOrdersListPath } from "./order-detail-paths";
import { shouldMaskOrderNumber } from "./order-detail-display";
import { OrderDetailTimelineReady } from "./order-detail-timeline-ready";
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

const PAGE_LOAD_MS = 280;

const BUYER_ACTION_KEYS = [
  "p17.commerce.detail.buyer_action_track",
  "p17.commerce.detail.buyer_action_contact_seller",
  "p17.commerce.detail.buyer_action_report_issue",
] as const;

const SELLER_TOOL_KEYS = [
  "p17.commerce.detail.seller_tool_confirm",
  "p17.commerce.detail.seller_tool_prepare",
  "p17.commerce.detail.seller_tool_tracking",
  "p17.commerce.detail.seller_tool_close",
] as const;

type OrderDetailPageProps = {
  variant: OrderDetailVariant;
  orderId?: string;
};

function isValidOrderId(orderId: string | undefined): orderId is string {
  return typeof orderId === "string" && orderId.trim().length > 0;
}

export function OrderDetailPage({ variant, orderId }: OrderDetailPageProps) {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(true);
  const listPath = getOrdersListPath(variant);
  const pageTestId =
    variant === "buyer" ? "p17-order-detail-page-buyer" : "p17-order-detail-page-seller";
  const headerTestId =
    variant === "buyer" ? "p17-order-detail-header-buyer" : "p17-order-detail-header-seller";
  const headerTitleKey =
    variant === "buyer" ? "p17.commerce.detail.buyer_title" : "p17.commerce.detail.seller_title";

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), PAGE_LOAD_MS);
    return () => window.clearTimeout(timer);
  }, [orderId]);

  if (!isValidOrderId(orderId)) {
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
        {loading ? (
          <OrderDetailSkeleton />
        ) : (
          <>
            <section>
              <p className={ORDERS_SECTION_LABEL}>{t("p17.commerce.detail.summary_section")}</p>
              <OrderSummaryReadyCard orderId={orderId} />
            </section>

            <section>
              <OrderDetailTimelineReady hasData={false} />
            </section>

            <section>
              {variant === "buyer" ? (
                <BuyerActionsReadyCard />
              ) : (
                <SellerToolsReadyCard />
              )}
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

function OrderSummaryReadyCard({ orderId }: { orderId: string }) {
  const comingSoon = t("p17.commerce.detail.coming_soon");
  const showOrderNumber = !shouldMaskOrderNumber(orderId);
  const orderNumberDisplay = showOrderNumber ? orderId.trim() : comingSoon;

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
          <SummaryRow label={t("p17.commerce.detail.product_name")} value={comingSoon} />
          <SummaryRow
            label={t("p17.commerce.detail.order_number")}
            value={orderNumberDisplay}
            mono={showOrderNumber}
          />
          <SummaryRow label={t("p17.commerce.detail.price")} value={comingSoon} highlight />
          <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
            <span className="text-[11px] text-zinc-500">{t("p17.commerce.detail.status")}</span>
            <span
              className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary"
              data-testid="p17-order-detail-status"
            >
              {t("p17.commerce.detail.not_available")}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-zinc-500">
            {t("p17.commerce.detail.last_updated")}: {comingSoon}
          </p>
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

function BuyerActionsReadyCard() {
  return (
    <div className={cn(ORDERS_CARD_COMPACT, "py-3")} data-testid="p17-order-detail-buyer-actions">
      <p className={cn(ORDERS_CARD_TITLE, "mb-1.5")}>{t("p17.commerce.detail.buyer_actions_title")}</p>
      <ul className="space-y-1">
        {BUYER_ACTION_KEYS.map((key) => (
          <li key={key} className="flex items-center gap-2 text-[11px] text-zinc-200 md:text-xs">
            <Check className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.5} />
            <span>{t(key)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SellerToolsReadyCard() {
  return (
    <div className={cn(ORDERS_CARD_COMPACT, "py-3")} data-testid="p17-order-detail-seller-tools">
      <p className={cn(ORDERS_CARD_TITLE, "mb-2")}>{t("p17.commerce.detail.seller_tools_title")}</p>
      <div className="flex flex-col gap-2">
        {SELLER_TOOL_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            disabled
            aria-disabled="true"
            className={cn(
              ORDERS_GHOST_BTN,
              "w-full cursor-default px-3 py-2 text-[11px] opacity-70 md:text-xs",
            )}
          >
            {t(key)}
          </button>
        ))}
      </div>
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

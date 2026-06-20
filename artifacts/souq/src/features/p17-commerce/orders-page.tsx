import { useState } from "react";
import { useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { CommerceMockDataBanner } from "./commerce-mock-data-banner";
import { OrdersHubList, sortOrdersForInbox } from "./order-list-card";
import { useOrdersHubData } from "./use-orders-hub-data";
import type { OrderListItem } from "./orders-api.types";
import { countBuyerHubTabs, countSellerHubTabs } from "./order-hub-tab-counts";
import { isP17SellerOrdersEnabled } from "./p17-commerce-flags";
import {
  CREATE_AD_BACK_BTN,
  CREATE_AD_HEADER_BAR,
  CREATE_AD_HEADER_INNER,
  CREATE_AD_MAIN_COLUMN,
  ORDERS_BUYER_PAGE_TITLE_HEADING,
  ORDERS_CARD_COMPACT,
  ORDERS_CARD_TITLE,
  ORDERS_SECTION_LABEL,
  ORDERS_PAGE_SHELL,
  ORDERS_SCROLL_END_SPACER,
  ORDERS_TAB_LIST,
  ORDERS_TAB_LIST_LAYOUT,
  ORDERS_TAB_TRIGGER,
} from "./orders-page-styles";
import {
  SETTINGS_HEADER_ACTION_ICON,
  SETTINGS_HEADER_TRAILING,
  SETTINGS_PAGE_TITLE,
} from "@/components/settings-shell";
import { AppShellContentScroll } from "@/components/app-shell-content-scroll";

function HubTabTriggerLabel({ labelKey, count }: { labelKey: string; count: number }) {
  return (
    <span className="inline-flex items-center justify-center gap-1 tabular-nums leading-tight">
      <span>{t(labelKey)}</span>
      <span className="font-bold text-primary/90">({count})</span>
    </span>
  );
}

export type OrdersPageVariant = "buyer" | "seller";

const TAB_PANEL_MOTION = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.2, ease: "easeOut" as const },
};

const BUYER_TABS = [
  { value: "all", labelKey: "p17.commerce.page.tab_all" },
  { value: "new", labelKey: "p17.commerce.page.tab_new" },
  { value: "active", labelKey: "p17.commerce.page.tab_active" },
  { value: "completed", labelKey: "p17.commerce.page.tab_completed" },
] as const;

type BuyerOrderTab = (typeof BUYER_TABS)[number]["value"];

const IN_PROGRESS_ORDER_STATUSES = [
  "confirmed",
  "preparing",
  "shipped",
  "in_transit",
  "out_for_delivery",
  "delivered",
] as const;

function isInProgressOrderStatus(status: OrderListItem["status"]): boolean {
  return (IN_PROGRESS_ORDER_STATUSES as readonly string[]).includes(status);
}

function filterBuyerOrdersByTab(orders: OrderListItem[], tab: BuyerOrderTab): OrderListItem[] {
  if (tab === "all") return orders;
  if (tab === "new") return orders.filter((o) => o.status === "pending_confirmation");
  if (tab === "active") return orders.filter((o) => isInProgressOrderStatus(o.status));
  return orders.filter((o) => o.status === "cancelled" || o.status === "completed");
}

const SELLER_TABS = [
  { value: "all", labelKey: "p17.commerce.page.tab_all" },
  { value: "new", labelKey: "p17.commerce.page.seller_tab_new" },
  { value: "active", labelKey: "p17.commerce.page.seller_tab_active" },
  { value: "done", labelKey: "p17.commerce.page.seller_tab_done" },
] as const;

type SellerOrderTab = (typeof SELLER_TABS)[number]["value"];

function filterSellerOrdersByTab(orders: OrderListItem[], tab: SellerOrderTab): OrderListItem[] {
  if (tab === "all") return orders;
  if (tab === "new") return orders.filter((o) => o.status === "pending_confirmation");
  if (tab === "active") return orders.filter((o) => isInProgressOrderStatus(o.status));
  return orders.filter((o) => o.status === "cancelled" || o.status === "completed");
}

type OrdersPageProps = {
  variant: OrdersPageVariant;
};

export function OrdersPage({ variant }: OrdersPageProps) {
  if (variant === "buyer") {
    return <BuyerOrdersPage />;
  }
  return <SellerOrdersPage />;
}

function BuyerOrdersPage() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<BuyerOrderTab>("all");
  const { orders, isResolving, isMock } = useOrdersHubData("buyer");
  const tabCounts = countBuyerHubTabs(orders);
  const filteredOrders = sortOrdersForInbox(filterBuyerOrdersByTab(orders, activeTab), activeTab);

  return (
    <div
      className={ORDERS_PAGE_SHELL}
      dir="rtl"
      data-testid="p17-orders-page-buyer"
    >
      <AppShellContentScroll>
      <CreateAdPatternHeader
        title={t("p17.commerce.page.buyer_title")}
        onBack={() => navigate("/profile")}
        testId="p17-orders-page-header"
      />

      <main className={CREATE_AD_MAIN_COLUMN}>
        {isResolving ? (
          <BuyerOrdersSkeleton />
        ) : (
          <>
            <section aria-label={t("p17.commerce.page.tabs_aria")}>
              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as BuyerOrderTab)}
                dir="rtl"
                className="w-full"
              >
                <TabsList
                  className={cn(ORDERS_TAB_LIST, ORDERS_TAB_LIST_LAYOUT)}
                  data-testid="p17-orders-tabs"
                >
                  {BUYER_TABS.map((tab) => (
                    <TabsTrigger key={tab.value} value={tab.value} className={ORDERS_TAB_TRIGGER}>
                      <HubTabTriggerLabel labelKey={tab.labelKey} count={tabCounts[tab.value]} />
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </section>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                data-testid="p17-orders-tab-panel"
                className="flex flex-col gap-2 md:gap-2.5"
                {...TAB_PANEL_MOTION}
              >
                {isMock ? (
                  <section>
                    <CommerceMockDataBanner />
                  </section>
                ) : null}

                <section aria-label={t("p17.commerce.page.buyer_title")}>
                  <OrdersHubList
                    variant="buyer"
                    orders={filteredOrders}
                    interactionDisabled={isMock}
                    empty={<OrdersHubEmptyState testId="p17-orders-empty-recent" />}
                  />
                </section>

              </motion.div>
            </AnimatePresence>

            <div aria-hidden className={ORDERS_SCROLL_END_SPACER} data-testid="p17-orders-scroll-spacer" />
          </>
        )}
      </main>
      </AppShellContentScroll>
    </div>
  );
}

/** Exact header pattern from `create-ad.tsx` — sticky bar, pill title (start), back button (end). */
function CreateAdPatternHeader({
  title,
  onBack,
  testId = "p17-orders-page-header",
}: {
  title: string;
  onBack: () => void;
  testId?: string;
}) {
  return (
    <header className={CREATE_AD_HEADER_BAR} dir="rtl" data-testid={testId}>
      <div className={CREATE_AD_HEADER_INNER}>
        <h1 className={SETTINGS_PAGE_TITLE}>
          <span className={ORDERS_BUYER_PAGE_TITLE_HEADING}>{title}</span>
        </h1>
        <div className={SETTINGS_HEADER_TRAILING}>
          <button type="button" onClick={onBack} className={CREATE_AD_BACK_BTN} aria-label={t("common.back")}>
            <ArrowRight className={SETTINGS_HEADER_ACTION_ICON} strokeWidth={2.25} />
          </button>
        </div>
      </div>
    </header>
  );
}

function BuyerOrdersSkeleton() {
  return (
    <div className="flex flex-col gap-2 md:gap-2.5" data-testid="p17-orders-page-skeleton" aria-busy="true">
      <Skeleton className="h-11 w-full rounded-xl bg-primary/10" />
      <Skeleton className="h-40 w-full rounded-2xl bg-primary/10" />
      <Skeleton className="h-40 w-full rounded-2xl bg-primary/10" />
    </div>
  );
}

function SellerOrdersPage() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<SellerOrderTab>("all");
  const { orders, isResolving, isMock } = useOrdersHubData("seller");
  const sellerFlowEnabled = isP17SellerOrdersEnabled();
  const tabCounts = countSellerHubTabs(orders);
  const filteredOrders = sortOrdersForInbox(filterSellerOrdersByTab(orders, activeTab), activeTab);

  if (!sellerFlowEnabled) {
    return (
      <div
        className={ORDERS_PAGE_SHELL}
        dir="rtl"
        data-testid="p17-orders-page-seller"
      >
        <AppShellContentScroll>
        <CreateAdPatternHeader
          title={t("p17.commerce.page.seller_title")}
          onBack={() => navigate("/profile")}
          testId="p17-seller-orders-page-header"
        />
        <main className={CREATE_AD_MAIN_COLUMN}>
          <SellerOrdersPhaseDeferredCard />
          <div aria-hidden className={ORDERS_SCROLL_END_SPACER} data-testid="p17-seller-orders-scroll-spacer" />
        </main>
        </AppShellContentScroll>
      </div>
    );
  }

  return (
    <div
      className={ORDERS_PAGE_SHELL}
      dir="rtl"
      data-testid="p17-orders-page-seller"
    >
      <AppShellContentScroll>
      <CreateAdPatternHeader
        title={t("p17.commerce.page.seller_title")}
        onBack={() => navigate("/profile")}
        testId="p17-seller-orders-page-header"
      />

      <main className={CREATE_AD_MAIN_COLUMN}>
        {isResolving ? (
          <SellerOrdersSkeleton />
        ) : (
          <>
            <section aria-label={t("p17.commerce.page.tabs_aria")}>
              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as SellerOrderTab)}
                dir="rtl"
                className="w-full"
              >
                <TabsList
                  className={cn(ORDERS_TAB_LIST, ORDERS_TAB_LIST_LAYOUT)}
                  data-testid="p17-seller-orders-tabs"
                >
                  {SELLER_TABS.map((tab) => (
                    <TabsTrigger key={tab.value} value={tab.value} className={ORDERS_TAB_TRIGGER}>
                      <HubTabTriggerLabel labelKey={tab.labelKey} count={tabCounts[tab.value]} />
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </section>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                data-testid="p17-seller-orders-tab-panel"
                className="flex flex-col gap-2 md:gap-2.5"
                {...TAB_PANEL_MOTION}
              >
                {isMock ? (
                  <section>
                    <CommerceMockDataBanner testId="p17-seller-orders-mock-banner" />
                  </section>
                ) : null}

                <section aria-label={t("p17.commerce.page.seller_title")}>
                  <OrdersHubList
                    variant="seller"
                    orders={filteredOrders}
                    interactionDisabled={isMock}
                    empty={<OrdersHubEmptyState testId="p17-seller-orders-empty-recent" />}
                  />
                </section>
              </motion.div>
            </AnimatePresence>

            <div aria-hidden className={ORDERS_SCROLL_END_SPACER} data-testid="p17-seller-orders-scroll-spacer" />
          </>
        )}
      </main>
      </AppShellContentScroll>
    </div>
  );
}

function OrdersHubEmptyState({ testId }: { testId: string }) {
  return (
    <div
      className={cn(
        ORDERS_CARD_COMPACT,
        "border border-primary/22 px-3 py-3.5 text-center",
      )}
      data-testid={testId}
    >
      <p className="text-[12px] font-medium text-zinc-500">{t("p17.commerce.page.empty_unified")}</p>
    </div>
  );
}

function SellerOrdersPhaseDeferredCard() {
  return (
    <div className={cn(ORDERS_CARD_COMPACT, "py-4 text-center")} data-testid="p17-seller-orders-phase-deferred">
      <p className={cn(ORDERS_CARD_TITLE, "mb-1.5")}>{t("p17.commerce.page.seller_phase_deferred_title")}</p>
      <p className="mx-auto max-w-[20rem] text-[11px] leading-relaxed text-zinc-500">
        {t("p17.commerce.page.seller_phase_deferred_body")}
      </p>
    </div>
  );
}

function SellerOrdersSkeleton() {
  return (
    <div className="flex flex-col gap-2 md:gap-2.5" data-testid="p17-seller-orders-page-skeleton" aria-busy="true">
      <Skeleton className="h-11 w-full rounded-xl bg-primary/10" />
      <Skeleton className="h-40 w-full rounded-2xl bg-primary/10" />
      <Skeleton className="h-40 w-full rounded-2xl bg-primary/10" />
    </div>
  );
}

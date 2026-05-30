import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Package,
  Sparkles,
  Truck,
  ClipboardList,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { OrdersHubList } from "./order-list-card";
import { useOrdersHubData } from "./use-orders-hub-data";
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
  ORDERS_STAT_CARD,
  ORDERS_TAB_LIST,
  ORDERS_TAB_TRIGGER,
} from "./orders-page-styles";

export type OrdersPageVariant = "buyer" | "seller";

const PAGE_LOAD_MS = 320;

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
  { value: "issues", labelKey: "p17.commerce.page.tab_issues" },
] as const;

type BuyerOrderTab = (typeof BUYER_TABS)[number]["value"];

const BUYER_TAB_EMPTY_KEYS: Record<Exclude<BuyerOrderTab, "all">, string> = {
  new: "p17.commerce.page.empty_tab_new",
  active: "p17.commerce.page.empty_tab_active",
  completed: "p17.commerce.page.empty_tab_completed",
  issues: "p17.commerce.page.empty_tab_issues",
};

const BUYER_STAT_CARDS = [
  { key: "p17.commerce.page.stat_card_new", count: 0, icon: Sparkles },
  { key: "p17.commerce.page.stat_card_active", count: 0, icon: Activity },
  { key: "p17.commerce.page.stat_card_completed", count: 0, icon: CheckCircle2 },
  { key: "p17.commerce.page.stat_card_issues", count: 0, icon: AlertCircle },
] as const;

const SELLER_TABS = [
  { value: "all", labelKey: "p17.commerce.page.tab_all" },
  { value: "new", labelKey: "p17.commerce.page.seller_tab_new" },
  { value: "preparing", labelKey: "p17.commerce.page.seller_tab_preparing" },
  { value: "shipping", labelKey: "p17.commerce.page.seller_tab_shipping" },
  { value: "completed", labelKey: "p17.commerce.page.seller_tab_completed" },
] as const;

type SellerOrderTab = (typeof SELLER_TABS)[number]["value"];

const SELLER_TAB_EMPTY_KEYS: Record<Exclude<SellerOrderTab, "all">, string> = {
  new: "p17.commerce.page.seller_empty_tab_new",
  preparing: "p17.commerce.page.seller_empty_tab_preparing",
  shipping: "p17.commerce.page.seller_empty_tab_shipping",
  completed: "p17.commerce.page.seller_empty_tab_completed",
};

const BUYER_UPCOMING_FEATURES = [
  "p17.commerce.page.buyer_feature_tracking",
  "p17.commerce.page.buyer_feature_shipping",
  "p17.commerce.page.buyer_feature_chat",
  "p17.commerce.page.buyer_feature_issue",
  "p17.commerce.page.buyer_feature_protection",
] as const;

const SELLER_STAT_CARDS = [
  { key: "p17.commerce.page.stat_card_new", count: 0, icon: Sparkles },
  { key: "p17.commerce.page.stat_card_preparing", count: 0, icon: ClipboardList },
  { key: "p17.commerce.page.stat_card_shipping", count: 0, icon: Truck },
  { key: "p17.commerce.page.stat_card_completed", count: 0, icon: CheckCircle2 },
] as const;

const SELLER_UPCOMING_FEATURES = [
  "p17.commerce.page.seller_tool_confirm_orders",
  "p17.commerce.page.seller_tool_prepare_order",
  "p17.commerce.page.seller_tool_tracking_input",
  "p17.commerce.page.seller_tool_shipping_update",
  "p17.commerce.page.seller_tool_close_after_delivery",
] as const;

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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<BuyerOrderTab>("all");
  const { orders } = useOrdersHubData("buyer");

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), PAGE_LOAD_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      className={cn("flex min-h-0 w-full flex-col bg-[#0A0A0A]", ORDERS_PAGE_LAYOUT_BOTTOM_CANCEL)}
      dir="rtl"
      data-testid="p17-orders-page-buyer"
    >
      <CreateAdPatternHeader
        title={t("p17.commerce.page.buyer_title")}
        onBack={() => navigate("/profile")}
        testId="p17-orders-page-header"
      />

      <main className={CREATE_AD_MAIN_COLUMN}>
        {loading ? (
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
                  className={cn(ORDERS_TAB_LIST, "grid grid-cols-5")}
                  data-testid="p17-orders-tabs"
                >
                  {BUYER_TABS.map((tab) => (
                    <TabsTrigger key={tab.value} value={tab.value} className={ORDERS_TAB_TRIGGER}>
                      {t(tab.labelKey)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </section>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                data-testid="p17-orders-tab-panel"
                className="flex flex-col gap-2.5 md:gap-3"
                {...TAB_PANEL_MOTION}
              >
                <section>
                  <p className={ORDERS_SECTION_LABEL}>{t("p17.commerce.page.buyer_hub_status_section")}</p>
                  <OrdersStatusGridCards cards={BUYER_STAT_CARDS} />
                </section>

                <section>
                  <p className={ORDERS_SECTION_LABEL}>{t("p17.commerce.preview.recent_orders")}</p>
                  <OrdersHubList
                    variant="buyer"
                    orders={orders}
                    empty={<BuyerTabEmptyCard tab={activeTab} onBrowse={() => navigate("/")} />}
                  />
                </section>

                <section>
                  <BuyerUpcomingFeaturesCard />
                </section>
              </motion.div>
            </AnimatePresence>

            <div aria-hidden className={ORDERS_SCROLL_END_SPACER} data-testid="p17-orders-scroll-spacer" />
          </>
        )}
      </main>
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

function OrdersStatusGridCards({
  cards,
}: {
  cards: ReadonlyArray<{ key: string; count: number; icon: LucideIcon }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5" data-testid="p17-orders-status-grid">
      {cards.map(({ key, count, icon: Icon }) => (
        <div key={key} className={cn(ORDERS_STAT_CARD, "select-none")}>
          <div className="flex h-5 w-5 shrink-0 items-center justify-center text-primary [&_svg]:h-5 [&_svg]:w-5">
            <Icon strokeWidth={2.1} />
          </div>
          <p className="text-base font-bold tabular-nums leading-none text-foreground md:text-lg">{count}</p>
          <p className="max-w-[100%] truncate px-0.5 text-[9px] font-medium leading-tight text-muted-foreground md:text-[10px]">
            {t(key)}
          </p>
        </div>
      ))}
    </div>
  );
}

function BuyerTabEmptyCard({ tab, onBrowse }: { tab: BuyerOrderTab; onBrowse: () => void }) {
  const isAllTab = tab === "all";
  const title = isAllTab
    ? t("p17.commerce.page.empty_title")
    : t(BUYER_TAB_EMPTY_KEYS[tab]);
  const body = isAllTab ? t("p17.commerce.page.empty_body_hub") : t("p17.commerce.page.empty_body_short");

  return (
    <div className={cn(ORDERS_CARD_COMPACT, "py-3.5 text-center")} data-testid="p17-orders-empty-recent">
      <Package className="mx-auto mb-1.5 h-6 w-6 text-primary" strokeWidth={2} />
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-[17rem] text-[11px] leading-relaxed text-zinc-500">{body}</p>
      {isAllTab ? (
        <button
          type="button"
          data-testid="p17-orders-empty-cta"
          className={cn(
            ORDERS_GHOST_BTN,
            "mx-auto mt-2.5 min-h-9 w-auto min-w-[8.75rem] px-3 py-1.5 text-[11px]",
          )}
          onClick={onBrowse}
        >
          {t("p17.commerce.page.empty_cta")}
        </button>
      ) : null}
    </div>
  );
}

function BuyerUpcomingFeaturesCard() {
  return (
    <div className={cn(ORDERS_CARD_COMPACT, "py-3")} data-testid="p17-orders-system-preview-buyer">
      <p className={cn(ORDERS_CARD_TITLE, "mb-1.5")}>{t("p17.commerce.page.upcoming_features_title")}</p>
      <ul className="space-y-1">
        {BUYER_UPCOMING_FEATURES.map((key) => (
          <li key={key} className="flex items-center gap-2 text-[11px] text-zinc-200 md:text-xs">
            <Check className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.5} />
            <span>{t(key)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BuyerOrdersSkeleton() {
  return (
    <div className="flex flex-col gap-2.5 md:gap-3" data-testid="p17-orders-page-skeleton" aria-busy="true">
      <Skeleton className="h-12 w-full rounded-xl bg-primary/10" />
      <div className="grid grid-cols-2 gap-2.5">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[5rem] rounded-2xl bg-primary/10 md:h-[5.25rem]" />
        ))}
      </div>
      <Skeleton className="h-28 w-full rounded-2xl bg-primary/10" />
      <Skeleton className="h-24 w-full rounded-2xl bg-primary/10" />
    </div>
  );
}

function SellerOrdersPage() {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SellerOrderTab>("all");
  const { orders } = useOrdersHubData("seller");

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), PAGE_LOAD_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      className={cn("flex min-h-0 w-full flex-col bg-[#0A0A0A]", ORDERS_PAGE_LAYOUT_BOTTOM_CANCEL)}
      dir="rtl"
      data-testid="p17-orders-page-seller"
    >
      <CreateAdPatternHeader
        title={t("p17.commerce.page.seller_title")}
        onBack={() => navigate("/profile")}
        testId="p17-seller-orders-page-header"
      />

      <main className={CREATE_AD_MAIN_COLUMN}>
        {loading ? (
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
                  className={cn(ORDERS_TAB_LIST, "grid grid-cols-5")}
                  data-testid="p17-seller-orders-tabs"
                >
                  {SELLER_TABS.map((tab) => (
                    <TabsTrigger key={tab.value} value={tab.value} className={ORDERS_TAB_TRIGGER}>
                      {t(tab.labelKey)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </section>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                data-testid="p17-seller-orders-tab-panel"
                className="flex flex-col gap-2.5 md:gap-3"
                {...TAB_PANEL_MOTION}
              >
                <section>
                  <p className={ORDERS_SECTION_LABEL}>{t("p17.commerce.page.seller_hub_status_section")}</p>
                  <OrdersStatusGridCards cards={SELLER_STAT_CARDS} />
                </section>

                <section>
                  <p className={ORDERS_SECTION_LABEL}>{t("p17.commerce.page.seller_recent_orders")}</p>
                  <OrdersHubList
                    variant="seller"
                    orders={orders}
                    empty={<SellerTabEmptyCard tab={activeTab} />}
                  />
                </section>

                <section>
                  <SellerUpcomingFeaturesCard />
                </section>
              </motion.div>
            </AnimatePresence>

            <div aria-hidden className={ORDERS_SCROLL_END_SPACER} data-testid="p17-seller-orders-scroll-spacer" />
          </>
        )}
      </main>
    </div>
  );
}

function SellerTabEmptyCard({ tab }: { tab: SellerOrderTab }) {
  const isAllTab = tab === "all";
  const title = isAllTab
    ? t("p17.commerce.page.seller_empty_title")
    : t(SELLER_TAB_EMPTY_KEYS[tab]);
  const body = isAllTab
    ? t("p17.commerce.page.seller_empty_body")
    : t("p17.commerce.page.seller_empty_body_short");

  return (
    <div className={cn(ORDERS_CARD_COMPACT, "py-3.5 text-center")} data-testid="p17-seller-orders-empty-recent">
      <Package className="mx-auto mb-1.5 h-6 w-6 text-primary" strokeWidth={2} />
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-[17rem] text-[11px] leading-relaxed text-zinc-500">{body}</p>
      {isAllTab ? (
        <button
          type="button"
          disabled
          aria-disabled="true"
          data-testid="p17-seller-orders-empty-cta"
          className={cn(
            ORDERS_GHOST_BTN,
            "mx-auto mt-2.5 min-h-9 w-auto min-w-[8.75rem] cursor-default px-3 py-1.5 text-[11px] opacity-70",
          )}
        >
          {t("p17.commerce.page.seller_empty_cta")}
        </button>
      ) : null}
    </div>
  );
}

function SellerUpcomingFeaturesCard() {
  return (
    <div className={cn(ORDERS_CARD_COMPACT, "py-3")} data-testid="p17-orders-system-preview-seller">
      <p className={cn(ORDERS_CARD_TITLE, "mb-1.5")}>{t("p17.commerce.page.seller_upcoming_features_title")}</p>
      <ul className="space-y-1">
        {SELLER_UPCOMING_FEATURES.map((key) => (
          <li key={key} className="flex items-center gap-2 text-[11px] text-zinc-200 md:text-xs">
            <Check className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.5} />
            <span>{t(key)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SellerOrdersSkeleton() {
  return (
    <div className="flex flex-col gap-2.5 md:gap-3" data-testid="p17-seller-orders-page-skeleton" aria-busy="true">
      <Skeleton className="h-12 w-full rounded-xl bg-primary/10" />
      <div className="grid grid-cols-2 gap-2.5">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[5rem] rounded-2xl bg-primary/10 md:h-[5.25rem]" />
        ))}
      </div>
      <Skeleton className="h-28 w-full rounded-2xl bg-primary/10" />
      <Skeleton className="h-24 w-full rounded-2xl bg-primary/10" />
    </div>
  );
}

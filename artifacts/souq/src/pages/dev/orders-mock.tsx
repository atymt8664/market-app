import { useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Package, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { CommerceMockHeader } from "@/features/p17-commerce-mock/components/commerce-mock-header";
import { DevMockBanner } from "@/features/p17-commerce-mock/components/dev-mock-banner";
import { IssueBottomSheet } from "@/features/p17-commerce-mock/components/issue-bottom-sheet";
import { OrderTimeline } from "@/features/p17-commerce-mock/components/order-timeline";
import {
  cancelBuyerOrder,
  getBuyerOrder,
  getBuyerOrders,
} from "@/features/p17-commerce-mock/mock-session";
import { formatEuro, P17_MOCK } from "@/features/p17-commerce-mock/mock-strings";
import {
  P17_CARD,
  P17_CARD_COMPACT,
  P17_DESTRUCTIVE_BTN,
  P17_MAIN,
  P17_PAGE_BG,
  P17_SECONDARY_BTN,
  P17_SECTION_LABEL,
} from "@/features/p17-commerce-mock/styles";

export default function OrdersMockPage() {
  const [, detailParams] = useRoute("/dev/orders-mock/:orderId");
  const orderId = detailParams?.orderId;

  if (orderId) {
    return <OrderDetailMock orderId={orderId} />;
  }
  return <OrdersListMock />;
}

function OrdersListMock() {
  const [, navigate] = useLocation();
  const orders = useMemo(() => getBuyerOrders(), []);

  return (
    <div className={P17_PAGE_BG} dir="rtl">
      <DevMockBanner />
      <CommerceMockHeader title={P17_MOCK.orders.title} onBack={() => navigate("/dev/checkout-mock")} />
      <main className={P17_MAIN}>
        {orders.length === 0 ? (
          <p className="text-center text-sm text-zinc-500">{P17_MOCK.orders.empty}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {orders.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => navigate(`/dev/orders-mock/${order.id}`)}
                className={cn(P17_CARD, "text-right transition-colors hover:border-primary/55")}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-primary/35 bg-[#0A0A0A] text-primary">
                    <Smartphone className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{order.productTitle}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-zinc-500">{order.id}</p>
                    <p className="mt-1 text-sm font-bold text-primary">{formatEuro(order.total)}</p>
                    <p className="mt-2 inline-flex rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      {P17_MOCK.status[order.status]}
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {P17_MOCK.orders.lastUpdate}: {order.lastUpdated}
                    </p>
                  </div>
                </div>
                <span className="mt-3 block w-full text-center text-xs font-semibold text-primary">
                  {P17_MOCK.orders.viewDetails} ←
                </span>
              </button>
            ))}
          </div>
        )}
        <button type="button" className={P17_SECONDARY_BTN} onClick={() => navigate("/dev/checkout-mock")}>
          + معاينة checkout جديد
        </button>
      </main>
    </div>
  );
}

function OrderDetailMock({ orderId }: { orderId: string }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueSelected, setIssueSelected] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const order = useMemo(() => getBuyerOrder(orderId), [orderId, refreshKey]);

  if (!order) {
    return (
      <div className={P17_PAGE_BG} dir="rtl">
        <DevMockBanner />
        <CommerceMockHeader title={P17_MOCK.orders.title} onBack={() => navigate("/dev/orders-mock")} />
        <main className={P17_MAIN}>
          <p className="text-center text-sm text-zinc-500">طلب غير موجود في المعاينة</p>
        </main>
      </div>
    );
  }

  const canCancel = order.timelineActiveIndex < 4 && order.status !== "cancelled";

  return (
    <div className={P17_PAGE_BG} dir="rtl">
      <DevMockBanner />
      <CommerceMockHeader title={order.id} onBack={() => navigate("/dev/orders-mock")} />
      <main className={P17_MAIN}>
        <div className={P17_CARD}>
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-primary/35 bg-[#0A0A0A] text-primary">
              <Package className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">{order.productTitle}</p>
              <p className="text-sm font-bold text-primary">{formatEuro(order.total)}</p>
              <p className="mt-1 inline-flex rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                {P17_MOCK.status[order.status]}
              </p>
            </div>
          </div>
        </div>

        <div className={P17_CARD_COMPACT}>
          <p className={P17_SECTION_LABEL}>{P17_MOCK.orders.whereAmI}</p>
          <p className="text-sm font-medium text-foreground">{P17_MOCK.status[order.status]}</p>
          <p className="mt-2 text-xs text-zinc-500">{P17_MOCK.orders.amISafe}</p>
          <p className="text-xs text-primary/90">{P17_MOCK.orders.safeAnswer}</p>
        </div>

        <OrderTimeline activeIndex={order.timelineActiveIndex} />

        {order.trackingNumber ? (
          <div className={P17_CARD_COMPACT}>
            <p className="text-xs text-zinc-500">رقم التتبع (معاينة)</p>
            <p className="font-mono text-sm text-primary">{order.trackingNumber}</p>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <button type="button" className={P17_SECONDARY_BTN} disabled>
            {P17_MOCK.orders.chatSeller}
          </button>
          <button type="button" className={P17_SECONDARY_BTN} onClick={() => setIssueOpen(true)}>
            {P17_MOCK.orders.hasIssue}
          </button>
          {canCancel ? (
            <button
              type="button"
              className={P17_DESTRUCTIVE_BTN}
              onClick={() => {
                cancelBuyerOrder(order.id);
                setRefreshKey((k) => k + 1);
                toast({ title: "تم إلغاء الطلب (معاينة)" });
              }}
            >
              {P17_MOCK.orders.cancelOrder}
            </button>
          ) : null}
        </div>
      </main>

      <IssueBottomSheet
        open={issueOpen}
        onOpenChange={setIssueOpen}
        selected={issueSelected}
        onSelect={setIssueSelected}
        onContinue={() => {
          setIssueOpen(false);
          toast({ title: "تم تسجيل المعاينة — لا إرسال حقيقي" });
          setIssueSelected(null);
        }}
      />
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Package, Truck, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { CommerceMockHeader } from "@/features/p17-commerce-mock/components/commerce-mock-header";
import { DevMockBanner } from "@/features/p17-commerce-mock/components/dev-mock-banner";
import { MOCK_CARRIERS } from "@/features/p17-commerce-mock/mock-data";
import {
  getSellerOrder,
  getSellerOrders,
  updateSellerOrder,
} from "@/features/p17-commerce-mock/mock-session";
import { formatEuro, P17_MOCK } from "@/features/p17-commerce-mock/mock-strings";
import {
  P17_CARD,
  P17_CARD_COMPACT,
  P17_DESTRUCTIVE_BTN,
  P17_MAIN,
  P17_PAGE_BG,
  P17_PRIMARY_BTN,
  P17_SECONDARY_BTN,
  P17_SECTION_LABEL,
} from "@/features/p17-commerce-mock/styles";

export default function SellerOrdersMockPage() {
  const [, detailParams] = useRoute("/dev/seller-orders-mock/:orderId");
  const orderId = detailParams?.orderId;

  if (orderId) {
    return <SellerOrderDetailMock orderId={orderId} />;
  }
  return <SellerOrdersListMock />;
}

function SellerOrdersListMock() {
  const [, navigate] = useLocation();
  const [refreshKey, setRefreshKey] = useState(0);
  const orders = useMemo(() => getSellerOrders(), [refreshKey]);

  return (
    <div className={P17_PAGE_BG} dir="rtl">
      <DevMockBanner />
      <CommerceMockHeader title={P17_MOCK.seller.title} onBack={() => navigate("/dev/orders-mock")} />
      <main className={P17_MAIN}>
        <p className="text-center text-xs text-zinc-500">{P17_MOCK.seller.threeActionsHint}</p>
        <p className={P17_SECTION_LABEL}>{P17_MOCK.seller.incoming}</p>
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() => navigate(`/dev/seller-orders-mock/${order.id}`)}
              className={cn(P17_CARD, "text-right hover:border-primary/55")}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">{order.productTitle}</p>
                  <p className="font-mono text-[11px] text-zinc-500">{order.id}</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {P17_MOCK.seller.buyer}: {order.buyerName}
                  </p>
                  <p className="mt-1 text-sm font-bold text-primary">{formatEuro(order.total)}</p>
                </div>
                {order.status === "pending_seller" ? (
                  <span className="shrink-0 rounded-full border border-amber-500/40 bg-amber-950/40 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                    {P17_MOCK.seller.needsConfirm}
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    {P17_MOCK.status[order.status === "preparing" ? "preparing" : order.status]}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
        <button
          type="button"
          className={P17_SECONDARY_BTN}
          onClick={() => setRefreshKey((k) => k + 1)}
        >
          تحديث القائمة
        </button>
      </main>
    </div>
  );
}

function SellerOrderDetailMock({ orderId }: { orderId: string }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState(MOCK_CARRIERS[0] ?? "DHL");

  const order = useMemo(() => getSellerOrder(orderId), [orderId, refreshKey]);

  useEffect(() => {
    if (order?.trackingNumber) setTrackingNumber(order.trackingNumber);
    if (order?.carrier) setCarrier(order.carrier);
  }, [order?.trackingNumber, order?.carrier]);

  if (!order) {
    return (
      <div className={P17_PAGE_BG} dir="rtl">
        <DevMockBanner />
        <CommerceMockHeader title={P17_MOCK.seller.title} onBack={() => navigate("/dev/seller-orders-mock")} />
        <main className={P17_MAIN}>
          <p className="text-center text-sm text-zinc-500">طلب غير موجود</p>
        </main>
      </div>
    );
  }

  function bumpRefresh() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className={P17_PAGE_BG} dir="rtl">
      <DevMockBanner />
      <CommerceMockHeader title={order.id} onBack={() => navigate("/dev/seller-orders-mock")} />
      <main className={P17_MAIN}>
        <div className={P17_CARD}>
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-primary/35 bg-[#0A0A0A] text-primary">
              <Package className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">{order.productTitle}</p>
              <p className="text-sm font-bold text-primary">{formatEuro(order.total)}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-zinc-400">
                <User className="h-3.5 w-3.5" />
                {order.buyerName}
              </p>
            </div>
          </div>
          <div className="mt-3 space-y-1 border-t border-primary/15 pt-3 text-xs text-zinc-400">
            <p>{order.shippingMethod}</p>
            <p>{order.addressLabel}</p>
          </div>
        </div>

        <p className="text-center text-[11px] text-zinc-500">{P17_MOCK.seller.mockNote}</p>

        {order.status === "pending_seller" ? (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className={P17_PRIMARY_BTN}
              onClick={() => {
                updateSellerOrder(order.id, { status: "confirmed" });
                bumpRefresh();
                toast({ title: "تم تأكيد الطلب (معاينة)" });
              }}
            >
              {P17_MOCK.seller.confirmOrder}
            </button>
            <button
              type="button"
              className={P17_DESTRUCTIVE_BTN}
              onClick={() => {
                updateSellerOrder(order.id, { status: "cancelled" });
                bumpRefresh();
                toast({ title: "تم رفض الطلب (معاينة)" });
              }}
            >
              {P17_MOCK.seller.rejectOrder}
            </button>
          </div>
        ) : null}

        {order.status === "confirmed" ? (
          <button
            type="button"
            className={P17_PRIMARY_BTN}
            onClick={() => {
              updateSellerOrder(order.id, { status: "preparing" });
              bumpRefresh();
              toast({ title: P17_MOCK.seller.preparing });
            }}
          >
            {P17_MOCK.seller.markPreparing}
          </button>
        ) : null}

        {order.status === "preparing" ? (
          <div className={P17_CARD_COMPACT}>
            <p className={P17_SECTION_LABEL}>{P17_MOCK.seller.trackingNumber}</p>
            <input
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="MOCK-TRK-12345"
              className="mb-3 w-full rounded-xl border border-primary/30 bg-[#0A0A0A]/90 px-3 py-2.5 text-sm text-foreground placeholder:text-zinc-600 focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            />
            <p className={P17_SECTION_LABEL}>{P17_MOCK.seller.carrier}</p>
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="mb-4 w-full rounded-xl border border-primary/30 bg-[#0A0A0A]/90 px-3 py-2.5 text-sm text-foreground focus-visible:border-primary/50 focus-visible:outline-none"
            >
              {MOCK_CARRIERS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {order.status === "preparing" ? (
              <button
                type="button"
                className={cn(P17_PRIMARY_BTN, "gap-2")}
                disabled={!trackingNumber.trim()}
                onClick={() => {
                  updateSellerOrder(order.id, {
                    status: "shipped",
                    trackingNumber: trackingNumber.trim(),
                    carrier,
                  });
                  bumpRefresh();
                  toast({ title: P17_MOCK.seller.shipped });
                }}
              >
                <Truck className="h-4 w-4" />
                {P17_MOCK.seller.markShipped}
              </button>
            ) : null}
          </div>
        ) : null}

        {order.status === "shipped" ? (
          <div className={cn(P17_CARD_COMPACT, "text-center")}>
            <Truck className="mx-auto mb-2 h-8 w-8 text-primary" />
            <p className="font-semibold text-foreground">{P17_MOCK.seller.shipped}</p>
            <p className="mt-1 font-mono text-sm text-primary">{order.trackingNumber}</p>
            <p className="text-xs text-zinc-500">{order.carrier}</p>
          </div>
        ) : null}
      </main>
    </div>
  );
}

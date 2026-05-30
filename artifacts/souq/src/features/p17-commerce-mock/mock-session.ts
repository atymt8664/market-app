import { INITIAL_BUYER_ORDERS, INITIAL_SELLER_ORDERS, MOCK_PRODUCT } from "./mock-data";
import type { MockOrder, SellerMockOrder } from "./types";

/** In-memory SPA session store — no localStorage, no API. */
let buyerOrders: MockOrder[] = [...INITIAL_BUYER_ORDERS];
let sellerOrders: SellerMockOrder[] = [...INITIAL_SELLER_ORDERS];
let nextOrderSeq = 1002;

export function getBuyerOrders(): MockOrder[] {
  return buyerOrders;
}

export function getBuyerOrder(id: string): MockOrder | undefined {
  return buyerOrders.find((o) => o.id === id);
}

export function addBuyerOrderFromCheckout(input: {
  shippingMethod: string;
  shippingCost: number;
  addressLabel: string;
}): MockOrder {
  const id = `SOUQ-2026-${String(nextOrderSeq++).padStart(6, "0")}`;
  const total = MOCK_PRODUCT.price + input.shippingCost;
  const order: MockOrder = {
    id,
    productTitle: MOCK_PRODUCT.title,
    price: MOCK_PRODUCT.price,
    shippingCost: input.shippingCost,
    total,
    status: "pending_seller",
    lastUpdated: "الآن",
    shippingMethod: input.shippingMethod,
    addressLabel: input.addressLabel,
    timelineActiveIndex: 1,
  };
  buyerOrders = [order, ...buyerOrders];
  sellerOrders = [
    {
      id,
      productTitle: MOCK_PRODUCT.title,
      price: MOCK_PRODUCT.price,
      shippingCost: input.shippingCost,
      total,
      buyerName: "أنت (معاينة)",
      status: "pending_seller",
      createdAt: "الآن",
      shippingMethod: input.shippingMethod,
      addressLabel: input.addressLabel,
    },
    ...sellerOrders,
  ];
  return order;
}

export function cancelBuyerOrder(id: string): void {
  buyerOrders = buyerOrders.map((o) =>
    o.id === id && o.timelineActiveIndex < 4
      ? { ...o, status: "cancelled", lastUpdated: "الآن", timelineActiveIndex: o.timelineActiveIndex }
      : o,
  );
}

export function getSellerOrders(): SellerMockOrder[] {
  return sellerOrders;
}

export function getSellerOrder(id: string): SellerMockOrder | undefined {
  return sellerOrders.find((o) => o.id === id);
}

export function updateSellerOrder(id: string, patch: Partial<SellerMockOrder>): SellerMockOrder | undefined {
  let updated: SellerMockOrder | undefined;
  sellerOrders = sellerOrders.map((o) => {
    if (o.id !== id) return o;
    updated = { ...o, ...patch };
    return updated;
  });
  if (updated) {
    buyerOrders = buyerOrders.map((o) => {
      if (o.id !== id) return o;
      const statusMap: Partial<Record<SellerMockOrder["status"], MockOrder["status"]>> = {
        confirmed: "confirmed",
        preparing: "preparing",
        shipped: "shipped",
        completed: "completed",
        cancelled: "cancelled",
      };
      const timelineMap: Partial<Record<SellerMockOrder["status"], number>> = {
        confirmed: 2,
        preparing: 3,
        shipped: 4,
        completed: 8,
        cancelled: o.timelineActiveIndex,
      };
      const nextStatus = patch.status ? statusMap[patch.status] : o.status;
      return {
        ...o,
        status: nextStatus ?? o.status,
        timelineActiveIndex: patch.status ? (timelineMap[patch.status] ?? o.timelineActiveIndex) : o.timelineActiveIndex,
        trackingNumber: patch.trackingNumber ?? o.trackingNumber,
        carrier: patch.carrier ?? o.carrier,
        lastUpdated: "الآن",
      };
    });
  }
  return updated;
}

import {
  getMockBuyerOrders,
  getMockOrderById,
  getMockOrderIssues,
  getMockOrdersStats,
  getMockOrderTimeline,
  getMockSellerOrders,
  isKnownMockOrderId,
} from "./orders-mock-data";
import type { OrderDetail, OrderIssue, OrderListItem, OrdersStats, OrderTimelineEntry } from "./orders-schemas";

/** Static mock provider — default when P17_ORDERS_API_ENABLED is off (PROD-safe). */
export const mockOrdersProvider = {
  listBuyerOrders(): OrderListItem[] {
    return getMockBuyerOrders();
  },

  listSellerOrders(): OrderListItem[] {
    return getMockSellerOrders();
  },

  getStats(): OrdersStats {
    return getMockOrdersStats();
  },

  getOrderDetail(orderRef: string): OrderDetail | null {
    if (!isKnownMockOrderId(orderRef)) return null;
    return getMockOrderById(orderRef) ?? null;
  },

  getTimeline(orderRef: string): OrderTimelineEntry[] | null {
    if (!isKnownMockOrderId(orderRef)) return null;
    return getMockOrderTimeline(orderRef);
  },

  getIssues(orderRef: string): OrderIssue[] | null {
    if (!isKnownMockOrderId(orderRef)) return null;
    return getMockOrderIssues(orderRef);
  },
};

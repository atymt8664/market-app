import type { OrderDetail, OrderTimelineEntry } from "./orders-api.types";

const BUYER_CANCELLED_LABEL = "تم إلغاء الطلب";
const BUYER_REJECTED_LABEL = "تم رفض الطلب من البائع";

/** Refine buyer status label using timeline when order is cancelled (P17-7A §4.1). */
export function resolveBuyerStatusLabel(
  order: Pick<OrderDetail, "status" | "statusLabelAr">,
  timelineItems: OrderTimelineEntry[] | undefined,
): string {
  if (order.status !== "cancelled" || !timelineItems?.length) {
    return order.statusLabelAr;
  }
  const hasSellerReject = timelineItems.some((e) => e.eventCode === "seller_rejected_order");
  if (hasSellerReject) return BUYER_REJECTED_LABEL;
  const hasBuyerCancel = timelineItems.some((e) => e.eventCode === "buyer_cancelled_order");
  if (hasBuyerCancel) return BUYER_CANCELLED_LABEL;
  return order.statusLabelAr;
}

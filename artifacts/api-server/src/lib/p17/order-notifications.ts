import { logger } from "../logger";
import { createNotification } from "../create-notification";
import { resolveOfficialCommunication } from "../communications/resolve";
import { formatSlaWindow } from "../communications/sla-window";
import type { SlaProfile } from "../admin-operations-sla";

/** Seller response window for new orders (in-app copy only — not a workflow SLA job). */
const ORDER_SELLER_RESPONSE_SLA: SlaProfile = {
  key: "inquiry",
  labelKey: "p8i.sla.inquiry",
  minMinutes: 60,
  maxMinutes: 1440,
  approachingRatio: 0.75,
};
export type OrderNotificationRole = "buyer" | "seller";

export type OrderNotificationContext = {
  orderId: number;
  orderNumber: string;
  role: OrderNotificationRole;
};

function orderMetadata(ctx: OrderNotificationContext): Record<string, string> {
  return {
    order_number: ctx.orderNumber,
    role: ctx.role,
    orderRole: ctx.role,
  };
}

async function emitOrderNotification(
  userId: number,
  type: string,
  ctx: OrderNotificationContext,
): Promise<void> {
  if (!Number.isInteger(userId) || userId <= 0) return;

  const slaWindow =
    type === "order.created" || type === "seller.order.created"
      ? formatSlaWindow(ORDER_SELLER_RESPONSE_SLA)
      : undefined;

  const copy = resolveOfficialCommunication({
    type,
    slaWindow,
  });  if (!copy) {
    logger.warn({ type, orderNumber: ctx.orderNumber }, "order notification template missing");
    return;
  }

  try {
    await createNotification({
      userId,
      type,
      title: copy.title,
      body: copy.body,
      entityType: "order",
      entityId: ctx.orderId,
      metadata: orderMetadata(ctx),
    });
  } catch (err) {
    logger.warn({ err, type, userId, orderNumber: ctx.orderNumber }, "order notification failed");
  }
}

export async function notifyBuyerOrderCreated(
  buyerUserId: number,
  ctx: OrderNotificationContext,
): Promise<void> {
  await emitOrderNotification(buyerUserId, "order.created", { ...ctx, role: "buyer" });
}

export async function notifySellerOrderCreated(
  sellerUserId: number,
  ctx: OrderNotificationContext,
): Promise<void> {
  await emitOrderNotification(sellerUserId, "seller.order.created", { ...ctx, role: "seller" });
}

export async function notifyBuyerOrderConfirmed(
  buyerUserId: number,
  ctx: OrderNotificationContext,
): Promise<void> {
  await emitOrderNotification(buyerUserId, "order.confirmed", { ...ctx, role: "buyer" });
}

export async function notifyBuyerOrderPreparing(
  buyerUserId: number,
  ctx: OrderNotificationContext,
): Promise<void> {
  await emitOrderNotification(buyerUserId, "order.preparing", { ...ctx, role: "buyer" });
}

export async function notifyBuyerTrackingAdded(
  buyerUserId: number,
  ctx: OrderNotificationContext,
): Promise<void> {
  await emitOrderNotification(buyerUserId, "shipping.tracking_added", { ...ctx, role: "buyer" });
}

export async function notifyBuyerOrderShipped(
  buyerUserId: number,
  ctx: OrderNotificationContext,
): Promise<void> {
  await emitOrderNotification(buyerUserId, "order.shipped", { ...ctx, role: "buyer" });
}

export async function notifyBuyerOrderCancelled(
  buyerUserId: number,
  ctx: OrderNotificationContext,
): Promise<void> {
  await emitOrderNotification(buyerUserId, "order.cancelled", { ...ctx, role: "buyer" });
}

export async function notifySellerOrderCancelled(
  sellerUserId: number,
  ctx: OrderNotificationContext,
): Promise<void> {
  await emitOrderNotification(sellerUserId, "seller.order.cancelled", { ...ctx, role: "seller" });
}

export function orderNotificationContext(
  order: { id: number; orderNumber: string },
  role: OrderNotificationRole,
): OrderNotificationContext {
  return { orderId: order.id, orderNumber: order.orderNumber, role };
}

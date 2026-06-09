import {
  adsTable,
  buyerAddressesTable,
  db,
  orderItemsTable,
  orderIssuesTable,
  orderStatusHistoryTable,
  ordersTable,
  shipmentsTable,
  type OrderRow,
  type OrderStatus,
} from "@workspace/db";
import { and, desc, eq, notInArray } from "drizzle-orm";
import { allocateOrderNumberInTx, isOrderNumber } from "./order-number";
import type { OrderTransitionSpec } from "./order-state-machine";

export type OrderWithItemRow = OrderRow & {
  itemTitle: string | null;
  itemImageUrl: string | null;
};

export function firstAdImage(images: unknown): string | null {
  if (!Array.isArray(images)) return null;
  for (const item of images) {
    if (typeof item === "string" && item.trim().length > 0) return item.trim();
    if (item && typeof item === "object" && "url" in item) {
      const url = (item as { url?: unknown }).url;
      if (typeof url === "string" && url.trim().length > 0) return url.trim();
    }
  }
  return null;
}

export function resolveOrderListImage(itemImageUrl: string | null, adImages: unknown): string | null {
  if (itemImageUrl?.trim()) return itemImageUrl.trim();
  return firstAdImage(adImages);
}

export async function findOrderByReference(
  reference: string,
): Promise<OrderRow | undefined> {
  const trimmed = reference.trim();
  if (!trimmed) return undefined;

  if (isOrderNumber(trimmed)) {
    const [row] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.orderNumber, trimmed))
      .limit(1);
    return row;
  }

  if (/^\d+$/.test(trimmed)) {
    const id = Number.parseInt(trimmed, 10);
    if (Number.isInteger(id) && id > 0) {
      const [row] = await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.id, id))
        .limit(1);
      return row;
    }
  }

  return undefined;
}

export async function listBuyerOrdersWithItems(
  buyerUserId: number,
  limit = 50,
): Promise<OrderWithItemRow[]> {
  const rows = await db
    .select({
      order: ordersTable,
      itemTitle: orderItemsTable.title,
      itemImageUrl: orderItemsTable.imageUrl,
      adImages: adsTable.images,
    })
    .from(ordersTable)
    .leftJoin(orderItemsTable, eq(orderItemsTable.orderId, ordersTable.id))
    .leftJoin(adsTable, eq(orderItemsTable.adId, adsTable.id))
    .where(eq(ordersTable.buyerUserId, buyerUserId))
    .orderBy(desc(ordersTable.createdAt), desc(ordersTable.id))
    .limit(limit);

  return rows.map((r) => ({
    ...r.order,
    itemTitle: r.itemTitle,
    itemImageUrl: resolveOrderListImage(r.itemImageUrl, r.adImages),
  }));
}

export async function listSellerOrdersWithItems(
  sellerUserId: number,
  limit = 50,
): Promise<OrderWithItemRow[]> {
  const rows = await db
    .select({
      order: ordersTable,
      itemTitle: orderItemsTable.title,
      itemImageUrl: orderItemsTable.imageUrl,
      adImages: adsTable.images,
    })
    .from(ordersTable)
    .leftJoin(orderItemsTable, eq(orderItemsTable.orderId, ordersTable.id))
    .leftJoin(adsTable, eq(orderItemsTable.adId, adsTable.id))
    .where(eq(ordersTable.sellerUserId, sellerUserId))
    .orderBy(desc(ordersTable.createdAt), desc(ordersTable.id))
    .limit(limit);

  return rows.map((r) => ({
    ...r.order,
    itemTitle: r.itemTitle,
    itemImageUrl: resolveOrderListImage(r.itemImageUrl, r.adImages),
  }));
}

export async function findActiveOrderForBuyerAd(
  buyerUserId: number,
  adId: number,
): Promise<OrderRow | undefined> {
  const terminal: OrderStatus[] = ["completed", "cancelled"];
  const [row] = await db
    .select()
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.buyerUserId, buyerUserId),
        eq(ordersTable.adId, adId),
        notInArray(ordersTable.status, terminal),
      ),
    )
    .orderBy(desc(ordersTable.createdAt))
    .limit(1);
  return row;
}

export async function findOrderByIdempotencyKey(
  idempotencyKey: string,
): Promise<OrderRow | undefined> {
  const [row] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.idempotencyKey, idempotencyKey))
    .limit(1);
  return row;
}

export async function getPrimaryOrderItem(orderId: number) {
  const [row] = await db
    .select()
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, orderId))
    .limit(1);
  return row;
}

export async function countBuyerOrderStats(buyerUserId: number) {
  const rows = await db
    .select({ status: ordersTable.status, issueFlag: ordersTable.issueFlag })
    .from(ordersTable)
    .where(eq(ordersTable.buyerUserId, buyerUserId));

  return aggregateOrderStats(rows);
}

export async function countSellerOrderStats(sellerUserId: number) {
  const rows = await db
    .select({ status: ordersTable.status, issueFlag: ordersTable.issueFlag })
    .from(ordersTable)
    .where(eq(ordersTable.sellerUserId, sellerUserId));

  return aggregateOrderStats(rows, "seller");
}

function aggregateOrderStats(
  rows: Array<{ status: string; issueFlag: boolean }>,
  role: "buyer" | "seller" = "buyer",
) {
  let confirming = 0;
  let preparing = 0;
  let shipping = 0;
  let completed = 0;
  let issues = 0;
  let newCount = 0;

  for (const row of rows) {
    if (row.issueFlag) issues += 1;
    switch (row.status) {
      case "pending_confirmation":
        confirming += 1;
        if (role === "seller") newCount += 1;
        break;
      case "confirmed":
      case "preparing":
        preparing += 1;
        break;
      case "shipped":
      case "in_transit":
      case "out_for_delivery":
        shipping += 1;
        break;
      case "completed":
        completed += 1;
        break;
      default:
        break;
    }
  }

  return {
    new: role === "seller" ? newCount : confirming,
    confirming,
    preparing,
    shipping,
    completed,
    issues,
  };
}

export async function listOrderTimeline(orderId: number) {
  return db
    .select()
    .from(orderStatusHistoryTable)
    .where(eq(orderStatusHistoryTable.orderId, orderId))
    .orderBy(orderStatusHistoryTable.createdAt, orderStatusHistoryTable.id);
}

export async function listOrderIssues(orderId: number) {
  return db
    .select()
    .from(orderIssuesTable)
    .where(eq(orderIssuesTable.orderId, orderId))
    .orderBy(desc(orderIssuesTable.createdAt));
}

export type CreateOrderDbInput = {
  buyerUserId: number;
  sellerUserId: number;
  adId: number;
  fulfillmentMode: "shipping" | "pickup";
  currency: string;
  subtotalAmount: string;
  shippingAmount: string;
  totalAmount: string;
  idempotencyKey: string | null;
  item: {
    adId: number;
    title: string;
    imageUrl: string | null;
    unitPrice: string;
    conditionLabel: string | null;
  };
  buyerAddress?: {
    label: string | null;
    city: string;
    countryCode: string;
    postalCode: string | null;
    line1: string;
    line2: string | null;
    recipientName: string | null;
    phone: string | null;
  };
  transition: OrderTransitionSpec;
};

export async function insertOrderWithHistory(input: CreateOrderDbInput): Promise<OrderRow> {
  return db.transaction(async (tx) => {
    const orderNumber = await allocateOrderNumberInTx(tx);
    const now = new Date();

    const [order] = await tx
      .insert(ordersTable)
      .values({
        orderNumber,
        status: input.transition.to,
        buyerUserId: input.buyerUserId,
        sellerUserId: input.sellerUserId,
        adId: input.adId,
        fulfillmentMode: input.fulfillmentMode,
        currency: input.currency,
        subtotalAmount: input.subtotalAmount,
        shippingAmount: input.shippingAmount,
        totalAmount: input.totalAmount,
        idempotencyKey: input.idempotencyKey,
        version: 1,
        updatedAt: now,
      })
      .returning();

    if (!order) throw new Error("ORDER_INSERT_FAILED");

    await tx.insert(orderItemsTable).values({
      orderId: order.id,
      adId: input.item.adId,
      title: input.item.title,
      imageUrl: input.item.imageUrl,
      unitPrice: input.item.unitPrice,
      quantity: 1,
      conditionLabel: input.item.conditionLabel,
    });

    if (input.buyerAddress && input.fulfillmentMode === "shipping") {
      await tx.insert(buyerAddressesTable).values({
        orderId: order.id,
        label: input.buyerAddress.label,
        city: input.buyerAddress.city,
        countryCode: input.buyerAddress.countryCode,
        postalCode: input.buyerAddress.postalCode,
        line1: input.buyerAddress.line1,
        line2: input.buyerAddress.line2,
        recipientName: input.buyerAddress.recipientName,
        phone: input.buyerAddress.phone,
      });
    }

    await tx.insert(orderStatusHistoryTable).values({
      orderId: order.id,
      fromStatus: input.transition.from,
      toStatus: input.transition.to,
      actorType: input.transition.actor,
      actorUserId: input.buyerUserId,
      eventCode: input.transition.eventCode,
      publicMessageAr: input.transition.publicMessageAr,
    });

    return order;
  });
}

export async function applyOrderTransition(input: {
  order: OrderRow;
  transition: OrderTransitionSpec;
  actorUserId: number;
  expectedVersion: number;
}): Promise<OrderRow> {
  const { order, transition, actorUserId, expectedVersion } = input;
  const now = new Date();
  const milestone: Partial<typeof ordersTable.$inferInsert> = {
    status: transition.to,
    version: order.version + 1,
    updatedAt: now,
  };

  if (transition.to === "confirmed") {
    milestone.confirmedAt = now;
  }
  if (transition.to === "cancelled") {
    milestone.cancelledAt = now;
  }

  const [updated] = await db
    .update(ordersTable)
    .set(milestone)
    .where(and(eq(ordersTable.id, order.id), eq(ordersTable.version, expectedVersion)))
    .returning();

  if (!updated) {
    throw new Error("ORDER_VERSION_CONFLICT");
  }

  await db.insert(orderStatusHistoryTable).values({
    orderId: order.id,
    fromStatus: transition.from,
    toStatus: transition.to,
    actorType: transition.actor,
    actorUserId,
    eventCode: transition.eventCode,
    publicMessageAr: transition.publicMessageAr,
  });

  return updated;
}

export async function findBuyerAddressByOrderId(orderId: number) {
  const [row] = await db
    .select()
    .from(buyerAddressesTable)
    .where(eq(buyerAddressesTable.orderId, orderId))
    .limit(1);
  return row;
}

export async function findShipmentByOrderId(orderId: number) {
  const [row] = await db
    .select()
    .from(shipmentsTable)
    .where(eq(shipmentsTable.orderId, orderId))
    .limit(1);
  return row;
}

export type ShipmentWriteInput = {
  carrierLabel: string;
  trackingNumber: string;
  shippedAt: Date;
};

export async function applyOrderTransitionWithShipment(input: {
  order: OrderRow;
  transition: OrderTransitionSpec;
  actorUserId: number;
  expectedVersion: number;
  shipment: ShipmentWriteInput;
}): Promise<OrderRow> {
  const { order, transition, actorUserId, expectedVersion, shipment } = input;
  const now = new Date();

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(ordersTable)
      .set({
        status: transition.to,
        version: order.version + 1,
        updatedAt: now,
      })
      .where(and(eq(ordersTable.id, order.id), eq(ordersTable.version, expectedVersion)))
      .returning();

    if (!updated) {
      throw new Error("ORDER_VERSION_CONFLICT");
    }

    await tx.insert(orderStatusHistoryTable).values({
      orderId: order.id,
      fromStatus: transition.from,
      toStatus: transition.to,
      actorType: transition.actor,
      actorUserId,
      eventCode: transition.eventCode,
      publicMessageAr: transition.publicMessageAr,
    });

    const existing = await tx
      .select({ id: shipmentsTable.id })
      .from(shipmentsTable)
      .where(eq(shipmentsTable.orderId, order.id))
      .limit(1);

    const shipmentValues = {
      carrierLabel: shipment.carrierLabel,
      trackingNumber: shipment.trackingNumber,
      shippedAt: shipment.shippedAt,
      updatedAt: now,
    };

    if (existing[0]) {
      await tx
        .update(shipmentsTable)
        .set(shipmentValues)
        .where(eq(shipmentsTable.id, existing[0].id));
    } else {
      await tx.insert(shipmentsTable).values({
        orderId: order.id,
        ...shipmentValues,
      });
    }

    return updated;
  });
}

export async function loadAdForOrder(adId: number) {
  const [ad] = await db.select().from(adsTable).where(eq(adsTable.id, adId)).limit(1);
  return ad;
}

/** Guard against listing orders for ads that are not in an order-eligible state. */
export function isAdEligibleForOrder(ad: {
  userId: number | null;
  status: string;
  price: string | null;
}): boolean {
  if (!ad.userId) return false;
  if (ad.status !== "approved") return false;
  if (ad.price === null || ad.price === undefined) return false;
  const price = Number.parseFloat(String(ad.price));
  return Number.isFinite(price) && price > 0;
}

export function buyerHasAccess(order: OrderRow, userId: number): boolean {
  return order.buyerUserId === userId;
}

export function sellerHasAccess(order: OrderRow, userId: number): boolean {
  return order.sellerUserId === userId;
}

export function partyHasAccess(order: OrderRow, userId: number): boolean {
  return order.buyerUserId === userId || order.sellerUserId === userId;
}

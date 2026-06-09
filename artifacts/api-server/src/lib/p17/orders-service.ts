import type { OrderRow } from "@workspace/db";
import { z } from "zod";
import { OrdersApiError, OrdersErrorCodes } from "./orders-api-errors";
import {
  formatAmount,
  formatRelativeTimeAr,
  orderStatusLabelAr,
  resolveBuyerCancelledStatusLabel,
} from "./order-labels";
import { isOrderNumber } from "./order-number";
import {
  assertTransitionAllowed,
  getTransitionSpec,
  OrderTransitionError,
  type OrderTransitionAction,
} from "./order-state-machine";
import {
  MarkShippedBodySchema,
  ShippingBuyerAddressInputSchema,
  type OrderDetail,
  type OrderIssue,
  type OrderListItem,
  type OrdersStats,
  type OrderTimelineEntry,
} from "./orders-schemas";
import {
  applyOrderTransition,
  applyOrderTransitionWithShipment,
  buyerHasAccess,
  findBuyerAddressByOrderId,
  findShipmentByOrderId,
  countBuyerOrderStats,
  countSellerOrderStats,
  findActiveOrderForBuyerAd,
  findOrderByIdempotencyKey,
  findOrderByReference,
  getPrimaryOrderItem,
  insertOrderWithHistory,
  isAdEligibleForOrder,
  firstAdImage,
  listBuyerOrdersWithItems,
  listOrderIssues,
  listOrderTimeline,
  listSellerOrdersWithItems,
  loadAdForOrder,
  partyHasAccess,
  sellerHasAccess,
  type OrderWithItemRow,
} from "./orders-repository";

export { ShippingBuyerAddressInputSchema } from "./orders-schemas";

export const BuyerAddressInputSchema = z
  .object({
    label: z.string().trim().max(64).optional(),
    city: z.string().trim().min(1).max(120),
    countryCode: z.string().trim().min(2).max(2),
    postalCode: z.string().trim().max(20).optional(),
    line1: z.string().trim().min(1).max(200),
    line2: z.string().trim().max(200).optional(),
    recipientName: z.string().trim().max(120).optional(),
    phone: z.string().trim().max(32).optional(),
  })
  .strict();

export const CreateOrderBodySchema = z
  .object({
    adId: z.number().int().positive(),
    fulfillmentMode: z.enum(["shipping", "pickup"]),
    currency: z.string().trim().length(3).default("EUR"),
    shippingAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
    shippingMethodLabel: z.string().trim().max(120).optional(),
    idempotencyKey: z.string().trim().min(8).max(128).optional(),
    buyerAddress: BuyerAddressInputSchema.optional(),
  })
  .strict();

export type CreateOrderBody = z.infer<typeof CreateOrderBodySchema>;

async function enrichListItemImage(
  row: OrderWithItemRow,
  item: OrderListItem,
): Promise<OrderListItem> {
  if (item.imageUrl?.trim()) return item;
  if (!row.adId) return item;
  const ad = await loadAdForOrder(row.adId);
  const imageUrl = firstAdImage(ad?.images ?? null);
  return imageUrl ? { ...item, imageUrl } : item;
}

function mapListItem(row: OrderWithItemRow, role: "buyer" | "seller"): OrderListItem {
  const updatedAt = row.updatedAt ?? row.createdAt;
  return {
    id: row.orderNumber,
    orderNumber: row.orderNumber,
    status: row.status as OrderListItem["status"],
    statusLabelAr: orderStatusLabelAr(row.status as OrderListItem["status"], role),
    title: row.itemTitle ?? "—",
    totalAmount: formatAmount(row.totalAmount),
    currency: row.currency,
    updatedAt: updatedAt.toISOString(),
    updatedAtRelativeAr: formatRelativeTimeAr(updatedAt),
    imageUrl: row.itemImageUrl ?? null,
    adId: row.adId,
  };
}

function mapShipmentSnapshot(
  shipment: Awaited<ReturnType<typeof findShipmentByOrderId>>,
): OrderDetail["shipment"] {
  if (!shipment?.carrierLabel || !shipment.trackingNumber) return null;
  return {
    carrierLabel: shipment.carrierLabel,
    trackingNumber: shipment.trackingNumber,
    shippedAt: shipment.shippedAt?.toISOString() ?? null,
  };
}

function mapBuyerAddressSnapshot(
  address: Awaited<ReturnType<typeof findBuyerAddressByOrderId>>,
  role: "buyer" | "seller",
): OrderDetail["buyerAddress"] {
  if (!address) return null;
  const snapshot = {
    city: address.city,
    countryCode: address.countryCode,
    postalCode: address.postalCode,
    line1: address.line1,
    line2: address.line2,
    recipientName: address.recipientName,
    phone: address.phone,
  };
  if (role === "seller") {
    return snapshot;
  }
  return snapshot;
}

async function enrichOrderDetail(
  row: OrderRow,
  itemTitle: string | null,
  role: "buyer" | "seller",
): Promise<OrderDetail> {
  const base = mapDetail(row, itemTitle, role);
  let order: OrderDetail = base;

  if (row.fulfillmentMode === "shipping") {
    const [shipment, address] = await Promise.all([
      findShipmentByOrderId(row.id),
      findBuyerAddressByOrderId(row.id),
    ]);
    order = {
      ...base,
      shipment: mapShipmentSnapshot(shipment),
      buyerAddress: mapBuyerAddressSnapshot(address, role),
    };
  }

  if (role === "buyer" && row.status === "cancelled") {
    const events = await listOrderTimeline(row.id);
    order = {
      ...order,
      statusLabelAr: resolveBuyerCancelledStatusLabel(events.map((e) => e.eventCode)),
    };
  }

  return order;
}

function mapDetail(row: OrderRow, itemTitle: string | null, role: "buyer" | "seller"): OrderDetail {
  const updatedAt = row.updatedAt ?? row.createdAt;
  return {
    id: row.orderNumber,
    orderNumber: row.orderNumber,
    status: row.status as OrderDetail["status"],
    statusLabelAr: orderStatusLabelAr(row.status as OrderDetail["status"], role),
    title: itemTitle ?? "—",
    totalAmount: formatAmount(row.totalAmount),
    currency: row.currency,
    updatedAt: updatedAt.toISOString(),
    updatedAtRelativeAr: formatRelativeTimeAr(updatedAt),
    fulfillmentMode: row.fulfillmentMode as OrderDetail["fulfillmentMode"],
    buyerUserId: row.buyerUserId,
    sellerUserId: row.sellerUserId,
    adId: row.adId,
    subtotalAmount: formatAmount(row.subtotalAmount),
    shippingAmount: formatAmount(row.shippingAmount),
    createdAt: row.createdAt.toISOString(),
    issueFlag: row.issueFlag,
    version: row.version,
  };
}

const ISSUE_CATEGORY_LABELS: Record<string, string> = {
  not_received: "لم أستلم الطلب",
  not_as_described: "المنتج مختلف عن الوصف",
  damaged: "المنتج تالف",
  shipping_problem: "مشكلة في الشحن",
  other: "مشكلة أخرى",
};

const ISSUE_STATUS_LABELS: Record<string, string> = {
  open: "مفتوح",
  under_review: "قيد المراجعة",
  resolved: "تم الحل",
  closed: "مغلق",
};

export class OrdersService {
  async listBuyerOrders(userId: number): Promise<{ items: OrderListItem[]; total: number }> {
    const rows = await listBuyerOrdersWithItems(userId);
    const items = await Promise.all(
      rows.map(async (r) => enrichListItemImage(r, mapListItem(r, "buyer"))),
    );
    return { items, total: items.length };
  }

  async listSellerOrders(userId: number): Promise<{ items: OrderListItem[]; total: number }> {
    const rows = await listSellerOrdersWithItems(userId);
    const items = await Promise.all(
      rows.map(async (r) => enrichListItemImage(r, mapListItem(r, "seller"))),
    );
    return { items, total: items.length };
  }

  async getBuyerStats(userId: number): Promise<Omit<OrdersStats, "mock">> {
    return countBuyerOrderStats(userId);
  }

  async getSellerStats(userId: number): Promise<Omit<OrdersStats, "mock">> {
    return countSellerOrderStats(userId);
  }

  async getOrderDetailForUser(
    userId: number,
    reference: string,
  ): Promise<{ order: OrderDetail; role: "buyer" | "seller" } | null> {
    const row = await findOrderByReference(reference);
    if (!row) return null;
    if (!partyHasAccess(row, userId)) {
      throw new OrdersApiError(403, OrdersErrorCodes.FORBIDDEN, "لا يمكنك عرض هذا الطلب");
    }
    const role = buyerHasAccess(row, userId) ? "buyer" : "seller";
    const item = await getPrimaryOrderItem(row.id);
    const order = await enrichOrderDetail(row, item?.title ?? null, role);
    return { order, role };
  }

  async getTimeline(userId: number, reference: string): Promise<OrderTimelineEntry[]> {
    const row = await this.requireOrderAccess(userId, reference);
    const events = await listOrderTimeline(row.id);
    return events.map((e) => ({
      id: String(e.id),
      eventCode: e.eventCode,
      messageAr: e.publicMessageAr ?? e.eventCode,
      occurredAt: e.createdAt.toISOString(),
    }));
  }

  async getIssues(userId: number, reference: string): Promise<OrderIssue[]> {
    const row = await this.requireOrderAccess(userId, reference);
    const issues = await listOrderIssues(row.id);
    return issues.map((issue) => ({
      id: String(issue.id),
      category: issue.category,
      categoryLabelAr: ISSUE_CATEGORY_LABELS[issue.category] ?? issue.category,
      status: issue.status as OrderIssue["status"],
      statusLabelAr: ISSUE_STATUS_LABELS[issue.status] ?? issue.status,
      openedAt: issue.createdAt.toISOString(),
    }));
  }

  async createOrder(userId: number, body: CreateOrderBody, headerIdempotencyKey?: string): Promise<OrderDetail> {
    const parsed = CreateOrderBodySchema.parse(body);
    const idempotencyKey = (headerIdempotencyKey?.trim() || parsed.idempotencyKey?.trim() || null) ?? null;

    if (idempotencyKey) {
      const existing = await findOrderByIdempotencyKey(idempotencyKey);
      if (existing) {
        if (existing.buyerUserId !== userId) {
          throw new OrdersApiError(403, OrdersErrorCodes.FORBIDDEN, "مفتاح idempotency غير صالح لهذا الحساب");
        }
        const item = await getPrimaryOrderItem(existing.id);
        return mapDetail(existing, item?.title ?? null, "buyer");
      }
    }

    const ad = await loadAdForOrder(parsed.adId);
    if (!ad) {
      throw new OrdersApiError(404, OrdersErrorCodes.AD_NOT_AVAILABLE, "الإعلان غير موجود");
    }
    if (!isAdEligibleForOrder(ad)) {
      throw new OrdersApiError(409, OrdersErrorCodes.AD_NOT_AVAILABLE, "لا يمكن إنشاء طلب من هذا الإعلان");
    }
    if (!ad.userId) {
      throw new OrdersApiError(409, OrdersErrorCodes.AD_NOT_AVAILABLE, "لا يمكن إنشاء طلب من هذا الإعلان");
    }
    if (ad.userId === userId) {
      throw new OrdersApiError(403, OrdersErrorCodes.SELF_PURCHASE, "لا يمكنك طلب إعلانك الخاص");
    }

    if (parsed.fulfillmentMode === "shipping" && !parsed.buyerAddress) {
      throw new OrdersApiError(400, OrdersErrorCodes.VALIDATION, "عنوان التسليم مطلوب للشحن");
    }

    let normalizedBuyerAddress: z.infer<typeof ShippingBuyerAddressInputSchema> | undefined;
    if (parsed.fulfillmentMode === "shipping" && parsed.buyerAddress) {
      const result = ShippingBuyerAddressInputSchema.safeParse(parsed.buyerAddress);
      if (!result.success) {
        throw new OrdersApiError(400, OrdersErrorCodes.VALIDATION, "بيانات عنوان التسليم غير مكتملة");
      }
      normalizedBuyerAddress = result.data;
    }

    const active = await findActiveOrderForBuyerAd(userId, parsed.adId);
    if (active) {
      throw new OrdersApiError(
        409,
        OrdersErrorCodes.DUPLICATE_ACTIVE,
        "لديك طلب نشط بالفعل على هذا الإعلان",
      );
    }

    const subtotalAmount = formatAmount(ad.price);
    const shippingAmount =
      parsed.fulfillmentMode === "pickup" ? "0.00" : formatAmount(parsed.shippingAmount ?? "0");
    const totalAmount = formatAmount(
      Number.parseFloat(subtotalAmount) + Number.parseFloat(shippingAmount),
    );

    const images = Array.isArray(ad.images) ? ad.images : [];
    const firstImage = typeof images[0] === "string" ? images[0] : null;

    const transition = getTransitionSpec("create");

    const order = await insertOrderWithHistory({
      buyerUserId: userId,
      sellerUserId: ad.userId,
      adId: ad.id,
      fulfillmentMode: parsed.fulfillmentMode,
      currency: parsed.currency ?? "EUR",
      subtotalAmount,
      shippingAmount,
      totalAmount,
      idempotencyKey,
      item: {
        adId: ad.id,
        title: ad.title,
        imageUrl: firstImage,
        unitPrice: subtotalAmount,
        conditionLabel: null,
      },
      buyerAddress:
        parsed.fulfillmentMode === "shipping" && normalizedBuyerAddress
          ? {
              label: normalizedBuyerAddress.label ?? null,
              city: normalizedBuyerAddress.city,
              countryCode: normalizedBuyerAddress.countryCode.toUpperCase(),
              postalCode: normalizedBuyerAddress.postalCode,
              line1: normalizedBuyerAddress.line1,
              line2: normalizedBuyerAddress.line2,
              recipientName: normalizedBuyerAddress.recipientName,
              phone: normalizedBuyerAddress.phone,
            }
          : undefined,
      transition,
    });

    const item = await getPrimaryOrderItem(order.id);
    return mapDetail(order, item?.title ?? null, "buyer");
  }

  async acceptOrder(userId: number, reference: string): Promise<OrderDetail> {
    return this.transitionOrder(userId, reference, "accept", "seller");
  }

  async rejectOrder(userId: number, reference: string): Promise<OrderDetail> {
    return this.transitionOrder(userId, reference, "reject", "seller");
  }

  async startPreparing(userId: number, reference: string): Promise<OrderDetail> {
    const row = await this.requireOrderReference(reference);
    if (!sellerHasAccess(row, userId)) {
      throw new OrdersApiError(403, OrdersErrorCodes.FORBIDDEN, "لا يمكنك تنفيذ هذا الإجراء");
    }
    if (row.fulfillmentMode !== "shipping") {
      throw new OrdersApiError(409, OrdersErrorCodes.INVALID_STATE, "هذا الإجراء متاح لطلبات الشحن فقط");
    }
    return this.transitionOrder(userId, reference, "start_preparing", "seller");
  }

  async markShipped(
    userId: number,
    reference: string,
    body: unknown,
  ): Promise<OrderDetail> {
    const parsed = MarkShippedBodySchema.parse(body);
    const row = await this.requireOrderReference(reference);
    if (!sellerHasAccess(row, userId)) {
      throw new OrdersApiError(403, OrdersErrorCodes.FORBIDDEN, "لا يمكنك تنفيذ هذا الإجراء");
    }
    if (row.fulfillmentMode !== "shipping") {
      throw new OrdersApiError(409, OrdersErrorCodes.INVALID_STATE, "هذا الإجراء متاح لطلبات الشحن فقط");
    }

    const address = await findBuyerAddressByOrderId(row.id);
    if (!address) {
      throw new OrdersApiError(409, OrdersErrorCodes.INVALID_STATE, "عنوان المشتري غير متوفر لهذا الطلب");
    }

    let transition;
    try {
      transition = assertTransitionAllowed(row.status as OrderDetail["status"], "mark_shipped");
    } catch (e) {
      if (e instanceof OrderTransitionError) {
        throw new OrdersApiError(409, OrdersErrorCodes.INVALID_STATE, e.message);
      }
      throw e;
    }

    const now = new Date();
    try {
      const updated = await applyOrderTransitionWithShipment({
        order: row,
        transition,
        actorUserId: userId,
        expectedVersion: row.version,
        shipment: {
          carrierLabel: parsed.carrierLabel,
          trackingNumber: parsed.trackingNumber,
          shippedAt: now,
        },
      });
      const item = await getPrimaryOrderItem(updated.id);
      return enrichOrderDetail(updated, item?.title ?? null, "seller");
    } catch (e) {
      if (e instanceof Error && e.message === "ORDER_VERSION_CONFLICT") {
        throw new OrdersApiError(409, OrdersErrorCodes.CONFLICT, "تم تحديث الطلب — يرجى المحاولة مجددًا");
      }
      throw e;
    }
  }

  async cancelOrder(userId: number, reference: string): Promise<OrderDetail> {
    const row = await this.requireOrderReference(reference);
    if (buyerHasAccess(row, userId)) {
      return this.transitionOrder(userId, reference, "cancel_buyer", "buyer");
    }
    if (sellerHasAccess(row, userId)) {
      return this.transitionOrder(userId, reference, "cancel_seller", "seller");
    }
    throw new OrdersApiError(403, OrdersErrorCodes.FORBIDDEN, "لا يمكنك إلغاء هذا الطلب");
  }

  private async transitionOrder(
    userId: number,
    reference: string,
    action: OrderTransitionAction,
    requiredRole: "buyer" | "seller",
  ): Promise<OrderDetail> {
    const row = await this.requireOrderReference(reference);
    const hasAccess = requiredRole === "buyer" ? buyerHasAccess(row, userId) : sellerHasAccess(row, userId);
    if (!hasAccess) {
      throw new OrdersApiError(403, OrdersErrorCodes.FORBIDDEN, "لا يمكنك تنفيذ هذا الإجراء");
    }

    let transition;
    try {
      transition = assertTransitionAllowed(row.status as OrderDetail["status"], action);
    } catch (e) {
      if (e instanceof OrderTransitionError) {
        throw new OrdersApiError(409, OrdersErrorCodes.INVALID_STATE, e.message);
      }
      throw e;
    }

    try {
      const updated = await applyOrderTransition({
        order: row,
        transition,
        actorUserId: userId,
        expectedVersion: row.version,
      });
      const item = await getPrimaryOrderItem(updated.id);
      return enrichOrderDetail(updated, item?.title ?? null, requiredRole);
    } catch (e) {
      if (e instanceof Error && e.message === "ORDER_VERSION_CONFLICT") {
        throw new OrdersApiError(409, OrdersErrorCodes.CONFLICT, "تم تحديث الطلب — يرجى المحاولة مجددًا");
      }
      throw e;
    }
  }

  private async requireOrderReference(reference: string): Promise<OrderRow> {
    const row = await findOrderByReference(reference);
    if (!row) {
      throw new OrdersApiError(404, OrdersErrorCodes.NOT_FOUND, "الطلب غير موجود");
    }
    return row;
  }

  private async requireOrderAccess(userId: number, reference: string): Promise<OrderRow> {
    const row = await this.requireOrderReference(reference);
    if (!partyHasAccess(row, userId)) {
      throw new OrdersApiError(403, OrdersErrorCodes.FORBIDDEN, "لا يمكنك عرض هذا الطلب");
    }
    return row;
  }
}

export const ordersService = new OrdersService();

export function parseOrderReferenceParam(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 64) {
    throw new OrdersApiError(400, OrdersErrorCodes.VALIDATION, "معرّف الطلب غير صالح");
  }
  if (isOrderNumber(trimmed) || /^\d+$/.test(trimmed)) {
    return trimmed;
  }
  throw new OrdersApiError(400, OrdersErrorCodes.VALIDATION, "معرّف الطلب غير صالح");
}

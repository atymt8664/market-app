import { z } from "zod";

export const ORDER_STATUSES = [
  "draft",
  "pending_confirmation",
  "confirmed",
  "preparing",
  "shipped",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "buyer_confirmed",
  "completed",
  "cancelled",
] as const;

export const OrderStatusSchema = z.enum(ORDER_STATUSES);

export const OrderListItemSchema = z
  .object({
    id: z.string().min(1),
    orderNumber: z.string().min(1),
    status: OrderStatusSchema,
    statusLabelAr: z.string().min(1),
    title: z.string().min(1),
    totalAmount: z.string(),
    currency: z.string().min(1),
    updatedAt: z.string().datetime(),
    updatedAtRelativeAr: z.string().min(1),
  })
  .strict();

export const OrderDetailSchema = OrderListItemSchema.extend({
  fulfillmentMode: z.enum(["shipping", "pickup"]),
  buyerUserId: z.number().int().positive(),
  sellerUserId: z.number().int().positive(),
  adId: z.number().int().positive(),
  subtotalAmount: z.string(),
  shippingAmount: z.string(),
  createdAt: z.string().datetime(),
  issueFlag: z.boolean(),
}).strict();

export const OrderTimelineEntrySchema = z
  .object({
    id: z.string().min(1),
    eventCode: z.string().min(1),
    messageAr: z.string().min(1),
    occurredAt: z.string().datetime(),
  })
  .strict();

export const OrderIssueSchema = z
  .object({
    id: z.string().min(1),
    category: z.string().min(1),
    categoryLabelAr: z.string().min(1),
    status: z.enum(["open", "under_review", "resolved", "closed"]),
    statusLabelAr: z.string().min(1),
    openedAt: z.string().datetime(),
  })
  .strict();

export const OrdersStatsSchema = z
  .object({
    new: z.number().int().min(0),
    confirming: z.number().int().min(0),
    preparing: z.number().int().min(0),
    shipping: z.number().int().min(0),
    completed: z.number().int().min(0),
    issues: z.number().int().min(0),
    mock: z.literal(true),
  })
  .strict();

export const OrdersListResponseSchema = z
  .object({
    items: z.array(OrderListItemSchema),
    total: z.number().int().min(0),
    mock: z.literal(true),
  })
  .strict();

export const OrderDetailResponseSchema = z
  .object({
    order: OrderDetailSchema,
    mock: z.literal(true),
  })
  .strict();

export const OrderTimelineResponseSchema = z
  .object({
    orderId: z.string().min(1),
    items: z.array(OrderTimelineEntrySchema),
    mock: z.literal(true),
  })
  .strict();

export const OrderIssuesResponseSchema = z
  .object({
    orderId: z.string().min(1),
    items: z.array(OrderIssueSchema),
    mock: z.literal(true),
  })
  .strict();

export const OrderIdParamSchema = z.object({
  id: z.string().trim().min(1).max(64),
});

export type OrderListItem = z.infer<typeof OrderListItemSchema>;
export type OrderDetail = z.infer<typeof OrderDetailSchema>;
export type OrdersStats = z.infer<typeof OrdersStatsSchema>;

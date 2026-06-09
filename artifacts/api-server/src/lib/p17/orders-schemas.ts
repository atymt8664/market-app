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
    /** Public identifier — equals orderNumber per P17-4-NAV. */
    id: z.string().min(1),
    orderNumber: z.string().min(1),
    status: OrderStatusSchema,
    statusLabelAr: z.string().min(1),
    title: z.string().min(1),
    totalAmount: z.string(),
    currency: z.string().min(1),
    updatedAt: z.string().datetime(),
    updatedAtRelativeAr: z.string().min(1),
    /** Snapshot from order_items.image_url — list thumbnails (H1). */
    imageUrl: z.string().nullable().optional(),
  })
  .strict();

export const OrderShipmentSchema = z
  .object({
    carrierLabel: z.string().min(1),
    trackingNumber: z.string().min(1),
    shippedAt: z.string().datetime().nullable(),
  })
  .strict();

export const OrderBuyerAddressSchema = z
  .object({
    city: z.string().min(1),
    countryCode: z.string().min(2),
    postalCode: z.string().nullable(),
    line1: z.string().min(1),
    line2: z.string().nullable(),
    recipientName: z.string().nullable(),
    phone: z.string().nullable(),
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
  version: z.number().int().positive().optional(),
  shipment: OrderShipmentSchema.nullable().optional(),
  buyerAddress: OrderBuyerAddressSchema.nullable().optional(),
}).strict();

export const MarkShippedBodySchema = z
  .object({
    carrierLabel: z.string().trim().min(1).max(120),
    trackingNumber: z.string().trim().min(2).max(64),
  })
  .strict();

export const ShippingBuyerAddressInputSchema = z
  .object({
    label: z.string().trim().max(64).optional(),
    city: z.string().trim().min(1).max(120),
    countryCode: z.string().trim().length(2),
    postalCode: z.string().trim().min(1).max(20),
    line1: z.string().trim().min(1).max(200),
    line2: z.string().trim().min(1).max(200),
    recipientName: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(8).max(32),
  })
  .strict();

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
    mock: z.boolean(),
  })
  .strict();

export const OrdersListResponseSchema = z
  .object({
    items: z.array(OrderListItemSchema),
    total: z.number().int().min(0),
    mock: z.boolean(),
  })
  .strict();

export const OrderDetailResponseSchema = z
  .object({
    order: OrderDetailSchema,
    mock: z.boolean(),
  })
  .strict();

export const OrderTimelineResponseSchema = z
  .object({
    orderId: z.string().min(1),
    items: z.array(OrderTimelineEntrySchema),
    mock: z.boolean(),
  })
  .strict();

export const OrderIssuesResponseSchema = z
  .object({
    orderId: z.string().min(1),
    items: z.array(OrderIssueSchema),
    mock: z.boolean(),
  })
  .strict();

/** Accepts SOUQ-YYYY-NNNNNN (canonical) or legacy numeric id during migration. */
export const OrderReferenceParamSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .refine((v) => /^SOUQ-\d{4}-\d{6}$/.test(v) || /^\d+$/.test(v), {
      message: "invalid order reference",
    }),
});

/** @deprecated Use OrderReferenceParamSchema */
export const OrderIdParamSchema = OrderReferenceParamSchema;

export type OrderListItem = z.infer<typeof OrderListItemSchema>;
export type OrderDetail = z.infer<typeof OrderDetailSchema>;
export type OrdersStats = z.infer<typeof OrdersStatsSchema>;
export type OrderTimelineEntry = z.infer<typeof OrderTimelineEntrySchema>;
export type OrderIssue = z.infer<typeof OrderIssueSchema>;

export const CreateOrderResponseSchema = z
  .object({
    order: OrderDetailSchema,
    mock: z.boolean(),
  })
  .strict();

export const OrderActionResponseSchema = OrderDetailResponseSchema;

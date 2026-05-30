import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { adsTable } from "./ads";
import { usersTable } from "./users";
import {
  FULFILLMENT_MODE_SQL_IN,
  ORDER_ACTOR_TYPE_SQL_IN,
  ORDER_ISSUE_CATEGORY_SQL_IN,
  ORDER_ISSUE_STATUS_SQL_IN,
  ORDER_STATUS_SQL_IN,
  SHIPMENT_EVENT_CODE_SQL_IN,
  SHIPMENT_EVENT_SOURCE_SQL_IN,
} from "../p17/constants";

export const ordersTable = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    orderNumber: text("order_number").notNull(),
    status: text("status").notNull().default("draft"),
    buyerUserId: integer("buyer_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),
    sellerUserId: integer("seller_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),
    adId: integer("ad_id")
      .notNull()
      .references(() => adsTable.id, { onDelete: "restrict" }),
    fulfillmentMode: text("fulfillment_mode").notNull(),
    currency: text("currency").notNull().default("EUR"),
    subtotalAmount: numeric("subtotal_amount", { precision: 12, scale: 2 })
      .notNull(),
    shippingAmount: numeric("shipping_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
    idempotencyKey: text("idempotency_key"),
    issueFlag: boolean("issue_flag").notNull().default(false),
    slaDeadlineAt: timestamp("sla_deadline_at", { withTimezone: true }),
    version: integer("version").notNull().default(1),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    orderNumberUnique: uniqueIndex("orders_order_number_unique").on(
      t.orderNumber,
    ),
    idempotencyKeyUnique: uniqueIndex("orders_idempotency_key_unique")
      .on(t.idempotencyKey)
      .where(sql`${t.idempotencyKey} IS NOT NULL`),
    buyerCreatedIdx: index("orders_buyer_user_id_created_at_idx").on(
      t.buyerUserId,
      t.createdAt,
    ),
    sellerStatusCreatedIdx: index("orders_seller_user_id_status_created_at_idx").on(
      t.sellerUserId,
      t.status,
      t.createdAt,
    ),
    adIdx: index("orders_ad_id_idx").on(t.adId),
    statusCheck: check(
      "orders_status_check",
      sql`${t.status} IN (${sql.raw(ORDER_STATUS_SQL_IN)})`,
    ),
    fulfillmentModeCheck: check(
      "orders_fulfillment_mode_check",
      sql`${t.fulfillmentMode} IN (${sql.raw(FULFILLMENT_MODE_SQL_IN)})`,
    ),
  }),
);

export const orderItemsTable = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => ordersTable.id, { onDelete: "cascade" }),
    adId: integer("ad_id")
      .notNull()
      .references(() => adsTable.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    imageUrl: text("image_url"),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    quantity: integer("quantity").notNull().default(1),
    conditionLabel: text("condition_label"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    orderIdx: index("order_items_order_id_idx").on(t.orderId),
  }),
);

export const orderStatusHistoryTable = pgTable(
  "order_status_history",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => ordersTable.id, { onDelete: "cascade" }),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    actorType: text("actor_type").notNull(),
    actorUserId: integer("actor_user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    eventCode: text("event_code").notNull(),
    publicMessageAr: text("public_message_ar"),
    internalNote: text("internal_note"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    orderCreatedIdx: index("order_status_history_order_id_created_at_idx").on(
      t.orderId,
      t.createdAt,
    ),
    fromStatusCheck: check(
      "order_status_history_from_status_check",
      sql`${t.fromStatus} IS NULL OR ${t.fromStatus} IN (${sql.raw(ORDER_STATUS_SQL_IN)})`,
    ),
    toStatusCheck: check(
      "order_status_history_to_status_check",
      sql`${t.toStatus} IN (${sql.raw(ORDER_STATUS_SQL_IN)})`,
    ),
    actorTypeCheck: check(
      "order_status_history_actor_type_check",
      sql`${t.actorType} IN (${sql.raw(ORDER_ACTOR_TYPE_SQL_IN)})`,
    ),
  }),
);

export const buyerAddressesTable = pgTable(
  "buyer_addresses",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => ordersTable.id, { onDelete: "cascade" }),
    label: text("label"),
    city: text("city").notNull(),
    countryCode: text("country_code").notNull(),
    postalCode: text("postal_code"),
    line1: text("line1").notNull(),
    line2: text("line2"),
    recipientName: text("recipient_name"),
    phone: text("phone"),
    sourceAddressId: integer("source_address_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    orderUnique: uniqueIndex("buyer_addresses_order_id_unique").on(t.orderId),
  }),
);

export const shipmentsTable = pgTable(
  "shipments",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => ordersTable.id, { onDelete: "cascade" }),
    carrierCode: text("carrier_code"),
    carrierLabel: text("carrier_label"),
    trackingNumber: text("tracking_number"),
    shippedAt: timestamp("shipped_at", { withTimezone: true }),
    estimatedDeliveryAt: timestamp("estimated_delivery_at", {
      withTimezone: true,
    }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    orderUnique: uniqueIndex("shipments_order_id_unique").on(t.orderId),
  }),
);

export const shipmentEventsTable = pgTable(
  "shipment_events",
  {
    id: serial("id").primaryKey(),
    shipmentId: integer("shipment_id")
      .notNull()
      .references(() => shipmentsTable.id, { onDelete: "cascade" }),
    eventCode: text("event_code").notNull(),
    descriptionAr: text("description_ar"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    source: text("source").notNull().default("seller_manual"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    shipmentOccurredIdx: index(
      "shipment_events_shipment_id_occurred_at_idx",
    ).on(t.shipmentId, t.occurredAt),
    eventCodeCheck: check(
      "shipment_events_event_code_check",
      sql`${t.eventCode} IN (${sql.raw(SHIPMENT_EVENT_CODE_SQL_IN)})`,
    ),
    sourceCheck: check(
      "shipment_events_source_check",
      sql`${t.source} IN (${sql.raw(SHIPMENT_EVENT_SOURCE_SQL_IN)})`,
    ),
  }),
);

export const orderIssuesTable = pgTable(
  "order_issues",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => ordersTable.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    status: text("status").notNull().default("open"),
    description: text("description"),
    openedByUserId: integer("opened_by_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),
    assignedAdminId: integer("assigned_admin_id").references(
      () => usersTable.id,
      { onDelete: "set null" },
    ),
    resolutionCode: text("resolution_code"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    freezesAutoComplete: boolean("freezes_auto_complete")
      .notNull()
      .default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    orderIdx: index("order_issues_order_id_idx").on(t.orderId),
    statusIdx: index("order_issues_status_idx").on(t.status),
    categoryCheck: check(
      "order_issues_category_check",
      sql`${t.category} IN (${sql.raw(ORDER_ISSUE_CATEGORY_SQL_IN)})`,
    ),
    statusCheck: check(
      "order_issues_status_check",
      sql`${t.status} IN (${sql.raw(ORDER_ISSUE_STATUS_SQL_IN)})`,
    ),
  }),
);

export const ordersRelations = relations(ordersTable, ({ one, many }) => ({
  buyer: one(usersTable, {
    fields: [ordersTable.buyerUserId],
    references: [usersTable.id],
    relationName: "orderBuyer",
  }),
  seller: one(usersTable, {
    fields: [ordersTable.sellerUserId],
    references: [usersTable.id],
    relationName: "orderSeller",
  }),
  ad: one(adsTable, {
    fields: [ordersTable.adId],
    references: [adsTable.id],
  }),
  buyerAddress: one(buyerAddressesTable, {
    fields: [ordersTable.id],
    references: [buyerAddressesTable.orderId],
  }),
  items: many(orderItemsTable),
  statusHistory: many(orderStatusHistoryTable),
  shipment: one(shipmentsTable, {
    fields: [ordersTable.id],
    references: [shipmentsTable.orderId],
  }),
  issues: many(orderIssuesTable),
}));

export const orderItemsRelations = relations(orderItemsTable, ({ one }) => ({
  order: one(ordersTable, {
    fields: [orderItemsTable.orderId],
    references: [ordersTable.id],
  }),
  ad: one(adsTable, {
    fields: [orderItemsTable.adId],
    references: [adsTable.id],
  }),
}));

export const orderStatusHistoryRelations = relations(
  orderStatusHistoryTable,
  ({ one }) => ({
    order: one(ordersTable, {
      fields: [orderStatusHistoryTable.orderId],
      references: [ordersTable.id],
    }),
    actorUser: one(usersTable, {
      fields: [orderStatusHistoryTable.actorUserId],
      references: [usersTable.id],
    }),
  }),
);

export const buyerAddressesRelations = relations(
  buyerAddressesTable,
  ({ one }) => ({
    order: one(ordersTable, {
      fields: [buyerAddressesTable.orderId],
      references: [ordersTable.id],
    }),
  }),
);

export const shipmentsRelations = relations(shipmentsTable, ({ one, many }) => ({
  order: one(ordersTable, {
    fields: [shipmentsTable.orderId],
    references: [ordersTable.id],
  }),
  events: many(shipmentEventsTable),
}));

export const shipmentEventsRelations = relations(
  shipmentEventsTable,
  ({ one }) => ({
    shipment: one(shipmentsTable, {
      fields: [shipmentEventsTable.shipmentId],
      references: [shipmentsTable.id],
    }),
  }),
);

export const orderIssuesRelations = relations(orderIssuesTable, ({ one }) => ({
  order: one(ordersTable, {
    fields: [orderIssuesTable.orderId],
    references: [ordersTable.id],
  }),
  openedByUser: one(usersTable, {
    fields: [orderIssuesTable.openedByUserId],
    references: [usersTable.id],
  }),
  assignedAdmin: one(usersTable, {
    fields: [orderIssuesTable.assignedAdminId],
    references: [usersTable.id],
  }),
}));

export type OrderRow = typeof ordersTable.$inferSelect;
export type InsertOrder = typeof ordersTable.$inferInsert;
export type OrderItemRow = typeof orderItemsTable.$inferSelect;
export type InsertOrderItem = typeof orderItemsTable.$inferInsert;
export type OrderStatusHistoryRow = typeof orderStatusHistoryTable.$inferSelect;
export type InsertOrderStatusHistory =
  typeof orderStatusHistoryTable.$inferInsert;
export type BuyerAddressRow = typeof buyerAddressesTable.$inferSelect;
export type InsertBuyerAddress = typeof buyerAddressesTable.$inferInsert;
export type ShipmentRow = typeof shipmentsTable.$inferSelect;
export type InsertShipment = typeof shipmentsTable.$inferInsert;
export type ShipmentEventRow = typeof shipmentEventsTable.$inferSelect;
export type InsertShipmentEvent = typeof shipmentEventsTable.$inferInsert;
export type OrderIssueRow = typeof orderIssuesTable.$inferSelect;
export type InsertOrderIssue = typeof orderIssuesTable.$inferInsert;

/** V1 canonical order statuses — excludes UI aliases and P10 payment states. */
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

export const FULFILLMENT_MODES = ["shipping", "pickup"] as const;

export const ORDER_ACTOR_TYPES = [
  "buyer",
  "seller",
  "system",
  "admin",
] as const;

export const ORDER_ISSUE_CATEGORIES = [
  "not_received",
  "not_as_described",
  "damaged",
  "shipping_problem",
  "other",
] as const;

export const ORDER_ISSUE_STATUSES = [
  "open",
  "under_review",
  "resolved",
  "closed",
] as const;

export const SHIPMENT_EVENT_CODES = [
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
] as const;

export const SHIPMENT_EVENT_SOURCES = [
  "seller_manual",
  "system",
  "carrier_webhook",
] as const;

export const ORDER_STATUS_SQL_IN = ORDER_STATUSES.map((s) => `'${s}'`).join(
  ", ",
);
export const FULFILLMENT_MODE_SQL_IN = FULFILLMENT_MODES.map(
  (s) => `'${s}'`,
).join(", ");
export const ORDER_ACTOR_TYPE_SQL_IN = ORDER_ACTOR_TYPES.map(
  (s) => `'${s}'`,
).join(", ");
export const ORDER_ISSUE_CATEGORY_SQL_IN = ORDER_ISSUE_CATEGORIES.map(
  (s) => `'${s}'`,
).join(", ");
export const ORDER_ISSUE_STATUS_SQL_IN = ORDER_ISSUE_STATUSES.map(
  (s) => `'${s}'`,
).join(", ");
export const SHIPMENT_EVENT_CODE_SQL_IN = SHIPMENT_EVENT_CODES.map(
  (s) => `'${s}'`,
).join(", ");
export const SHIPMENT_EVENT_SOURCE_SQL_IN = SHIPMENT_EVENT_SOURCES.map(
  (s) => `'${s}'`,
).join(", ");

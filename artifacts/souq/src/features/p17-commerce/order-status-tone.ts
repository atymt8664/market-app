/** Semantic status tones for commerce surfaces — CSS tokens only (no logic changes). */

export type OrderStatusTone = "pending" | "active" | "done" | "cancelled";

const PENDING = new Set(["pending_confirmation"]);
const DONE = new Set(["completed", "buyer_confirmed"]);
const CANCELLED = new Set(["cancelled", "draft"]);

export function resolveOrderStatusTone(status: string): OrderStatusTone {
  if (PENDING.has(status)) return "pending";
  if (CANCELLED.has(status)) return "cancelled";
  if (DONE.has(status)) return "done";
  return "active";
}

export const ORDER_STATUS_BADGE_CLASS: Record<OrderStatusTone, string> = {
  pending: "border-amber-500/50 bg-amber-500/12 text-amber-100",
  active: "border-primary/40 bg-primary/10 text-primary",
  done: "border-emerald-500/45 bg-emerald-500/10 text-emerald-200",
  cancelled: "border-zinc-600/55 bg-zinc-800/50 text-zinc-400",
};

export const ORDER_STATUS_CARD_ACCENT_CLASS: Record<OrderStatusTone, string> = {
  pending: "border-amber-500/40 ring-amber-500/12",
  active: "border-primary/35 ring-primary/10",
  done: "border-emerald-500/35 ring-emerald-500/10",
  cancelled: "border-zinc-600/40 ring-zinc-700/20",
};

/** Default inbox card — neutral chrome (not status-colored ERP rows). */
export const ORDERS_LIST_CARD_NEUTRAL =
  "border-primary/28 bg-[#0A0A0A]/82 ring-primary/8";

/** Seller inbox — pending confirmation accent without loud palette (H2). */
export const SELLER_PENDING_ORDER_CARD_CLASS =
  "border-amber-500/48 bg-amber-500/[0.035] ring-amber-500/20 shadow-[0_0_22px_-14px_rgba(245,158,11,0.28)]";

const SHIPPING_FLOW_STATUSES = new Set([
  "preparing",
  "shipped",
  "in_transit",
  "out_for_delivery",
  "delivered",
]);

/** Infer fulfillment for list cards when API omits fulfillmentMode (display only). */
export function inferListFulfillmentMode(
  status: string,
  explicit?: "shipping" | "pickup" | null,
): "shipping" | "pickup" | null {
  if (explicit === "shipping" || explicit === "pickup") return explicit;
  if (SHIPPING_FLOW_STATUSES.has(status)) return "shipping";
  if (
    status === "pending_confirmation" ||
    status === "confirmed" ||
    status === "completed" ||
    status === "cancelled"
  ) {
    return "pickup";
  }
  return null;
}

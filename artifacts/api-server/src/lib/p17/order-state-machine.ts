import { ORDER_STATUSES } from "./orders-schemas";

export type OrderStatus = (typeof ORDER_STATUSES)[number];

function isTerminalOrderStatus(status: OrderStatus): boolean {
  return status === "completed" || status === "cancelled";
}

export type OrderTransitionAction =
  | "create"
  | "accept"
  | "reject"
  | "cancel_buyer"
  | "cancel_seller"
  | "start_preparing"
  | "mark_shipped";

export type OrderTransitionActor = "buyer" | "seller" | "system" | "admin";

export type OrderTransitionSpec = {
  from: OrderStatus | null;
  to: OrderStatus;
  action: OrderTransitionAction;
  actor: OrderTransitionActor;
  eventCode: string;
  publicMessageAr: string;
};

/** P17-4 scope — lifecycle transitions implemented by the API layer. */
export const P17_4_TRANSITIONS: readonly OrderTransitionSpec[] = [
  {
    from: null,
    to: "pending_confirmation",
    action: "create",
    actor: "buyer",
    eventCode: "order_submitted",
    publicMessageAr: "تم إنشاء طلبك — بانتظار تأكيد البائع",
  },
  {
    from: "pending_confirmation",
    to: "confirmed",
    action: "accept",
    actor: "seller",
    eventCode: "seller_confirmed_order",
    publicMessageAr: "تم تأكيد الطلب من البائع",
  },
  {
    from: "pending_confirmation",
    to: "cancelled",
    action: "reject",
    actor: "seller",
    eventCode: "seller_rejected_order",
    publicMessageAr: "تم رفض الطلب من البائع",
  },
  {
    from: "pending_confirmation",
    to: "cancelled",
    action: "cancel_buyer",
    actor: "buyer",
    eventCode: "buyer_cancelled_order",
    publicMessageAr: "تم إلغاء الطلب",
  },
  {
    from: "pending_confirmation",
    to: "cancelled",
    action: "cancel_seller",
    actor: "seller",
    eventCode: "seller_cancelled_order",
    publicMessageAr: "تم إلغاء الطلب",
  },
] as const;

/** P17-7 — shipping workflow (confirmed → preparing → shipped). */
export const P17_7_TRANSITIONS: readonly OrderTransitionSpec[] = [
  {
    from: "confirmed",
    to: "preparing",
    action: "start_preparing",
    actor: "seller",
    eventCode: "seller_started_preparing",
    publicMessageAr: "البائع يجهّز طلبك",
  },
  {
    from: "preparing",
    to: "shipped",
    action: "mark_shipped",
    actor: "seller",
    eventCode: "seller_marked_shipped",
    publicMessageAr: "تم شحن طلبك",
  },
] as const;

const ALL_TRANSITIONS: readonly OrderTransitionSpec[] = [
  ...P17_4_TRANSITIONS,
  ...P17_7_TRANSITIONS,
];

const TRANSITION_BY_ACTION = new Map<OrderTransitionAction, OrderTransitionSpec>(
  ALL_TRANSITIONS.map((t) => [t.action, t]),
);

export function getTransitionSpec(action: OrderTransitionAction): OrderTransitionSpec {
  const spec = TRANSITION_BY_ACTION.get(action);
  if (!spec) {
    throw new Error(`Unknown order transition action: ${action}`);
  }
  return spec;
}

export function assertTransitionAllowed(
  currentStatus: OrderStatus,
  action: OrderTransitionAction,
): OrderTransitionSpec {
  const spec = getTransitionSpec(action);
  if (spec.from !== null && spec.from !== currentStatus) {
    throw new OrderTransitionError(
      "ORDER_INVALID_STATE",
      `لا يمكن تنفيذ هذا الإجراء على الطلب في حالته الحالية`,
      { currentStatus, action, expectedFrom: spec.from },
    );
  }
  if (isTerminalOrderStatus(currentStatus) && action !== "create") {
    throw new OrderTransitionError(
      "ORDER_TERMINAL",
      "الطلب في حالة نهائية ولا يمكن تعديله",
      { currentStatus, action },
    );
  }
  return spec;
}

export class OrderTransitionError extends Error {
  readonly code: "ORDER_INVALID_STATE" | "ORDER_TERMINAL";

  readonly details: Record<string, unknown>;

  constructor(
    code: "ORDER_INVALID_STATE" | "ORDER_TERMINAL",
    message: string,
    details: Record<string, unknown>,
  ) {
    super(message);
    this.name = "OrderTransitionError";
    this.code = code;
    this.details = details;
  }
}

/**
 * Presentation alias: seller "rejected" maps to canonical `cancelled` + event
 * `seller_rejected_order`. `issue_open` is `issue_flag` overlay — not a status (P17-2).
 */
export const ORDER_LIFECYCLE_CANONICAL_STATUSES = [
  "pending_confirmation",
  "confirmed",
  "preparing",
  "shipped",
  "out_for_delivery",
  "delivered",
  "completed",
  "cancelled",
] as const;

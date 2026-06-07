/** P17-8 Package 1 — map order.status → horizontal track nodes (P17-8-0 §1.6). */
import type { OrderDetail } from "./orders-api.types";

export type TrackingStepId =
  | "placed"
  | "confirmed"
  | "preparing"
  | "shipped"
  | "in_transit"
  | "delivered";

export type TrackingNodeState = "completed" | "current" | "future";

export const SHIPPING_TRACK_STEPS: TrackingStepId[] = [
  "placed",
  "confirmed",
  "preparing",
  "shipped",
  "in_transit",
  "delivered",
];

export const PICKUP_TRACK_STEPS: TrackingStepId[] = ["placed", "confirmed", "preparing", "delivered"];

const SHIPPING_STATUS_INDEX: Record<string, number> = {
  pending_confirmation: 0,
  draft: 0,
  confirmed: 1,
  preparing: 2,
  shipped: 3,
  in_transit: 4,
  out_for_delivery: 4,
  delivered: 5,
  buyer_confirmed: 5,
  completed: 5,
};

const PICKUP_STATUS_INDEX: Record<string, number> = {
  pending_confirmation: 0,
  draft: 0,
  confirmed: 1,
  preparing: 2,
  delivered: 3,
  buyer_confirmed: 3,
  completed: 3,
};

const TERMINAL_STATUSES = new Set(["delivered", "buyer_confirmed", "completed"]);

export type TrackingTrackModel = {
  steps: TrackingStepId[];
  nodeStates: TrackingNodeState[];
  currentIndex: number;
};

export function trackingStepsForOrder(order: Pick<OrderDetail, "fulfillmentMode">): TrackingStepId[] {
  return order.fulfillmentMode === "pickup" ? PICKUP_TRACK_STEPS : SHIPPING_TRACK_STEPS;
}

export function resolveCurrentStepIndex(
  status: string,
  fulfillmentMode: OrderDetail["fulfillmentMode"],
): number {
  const map = fulfillmentMode === "pickup" ? PICKUP_STATUS_INDEX : SHIPPING_STATUS_INDEX;
  return map[status] ?? 0;
}

export function resolveTrackingTrackModel(
  order: Pick<OrderDetail, "status" | "fulfillmentMode">,
): TrackingTrackModel {
  const steps = trackingStepsForOrder(order);
  const status = order.status;

  if (status === "cancelled") {
    return {
      steps,
      currentIndex: -1,
      nodeStates: steps.map((_, i) => (i === 0 ? "completed" : "future")),
    };
  }

  const currentIndex = resolveCurrentStepIndex(status, order.fulfillmentMode);

  if (TERMINAL_STATUSES.has(status)) {
    return {
      steps,
      currentIndex: steps.length - 1,
      nodeStates: steps.map(() => "completed"),
    };
  }

  const nodeStates = steps.map((_, i): TrackingNodeState => {
    if (i < currentIndex) return "completed";
    if (i === currentIndex) return "current";
    return "future";
  });

  return { steps, currentIndex, nodeStates };
}

export const TRACKING_STEP_I18N: Record<TrackingStepId, string> = {
  placed: "p17.commerce.tracking.step_placed",
  confirmed: "p17.commerce.tracking.step_confirmed",
  preparing: "p17.commerce.tracking.step_preparing",
  shipped: "p17.commerce.tracking.step_shipped",
  in_transit: "p17.commerce.tracking.step_in_transit",
  delivered: "p17.commerce.tracking.step_delivered",
};

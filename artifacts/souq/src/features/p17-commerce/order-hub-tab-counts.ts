import type { OrderListItem } from "./orders-api.types";

const IN_PROGRESS = new Set([
  "confirmed",
  "preparing",
  "shipped",
  "in_transit",
  "out_for_delivery",
  "delivered",
]);

function isCompletedStatus(status: string): boolean {
  return status === "cancelled" || status === "completed";
}

export type BuyerHubTab = "all" | "new" | "active" | "completed";
export type SellerHubTab = "all" | "new" | "active" | "done";

export type HubTabCounts<T extends string> = Record<T, number>;

export function countBuyerHubTabs(orders: OrderListItem[]): HubTabCounts<BuyerHubTab> {
  let newCount = 0;
  let activeCount = 0;
  let completedCount = 0;
  for (const o of orders) {
    if (o.status === "pending_confirmation") newCount += 1;
    else if (IN_PROGRESS.has(o.status)) activeCount += 1;
    else if (isCompletedStatus(o.status)) completedCount += 1;
  }
  return {
    all: orders.length,
    new: newCount,
    active: activeCount,
    completed: completedCount,
  };
}

export function countSellerHubTabs(orders: OrderListItem[]): HubTabCounts<SellerHubTab> {
  let newCount = 0;
  let activeCount = 0;
  let doneCount = 0;
  for (const o of orders) {
    if (o.status === "pending_confirmation") newCount += 1;
    else if (IN_PROGRESS.has(o.status)) activeCount += 1;
    else if (isCompletedStatus(o.status)) doneCount += 1;
  }
  return {
    all: orders.length,
    new: newCount,
    active: activeCount,
    done: doneCount,
  };
}

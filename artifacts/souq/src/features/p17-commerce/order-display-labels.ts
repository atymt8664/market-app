import { getLocale, t } from "@/i18n";
import { formatRelativeTime } from "@/lib/format";
import type { OrderDetail, OrderListItem, OrderTimelineEntry } from "./orders-api.types";
import { resolveBuyerStatusLabel } from "./order-status-display";

export type OrderDisplayRole = "buyer" | "seller";

type StatusLabelOrder = Pick<OrderListItem, "status" | "statusLabelAr">;

/** Locale-aware status label — Arabic uses API label; en/de use i18n keys (A8). */
export function resolveOrderStatusLabel(
  order: StatusLabelOrder,
  role: OrderDisplayRole,
  timelineItems?: OrderTimelineEntry[],
): string {
  if (getLocale() === "ar") {
    if (role === "buyer") {
      return resolveBuyerStatusLabel(order as Pick<OrderDetail, "status" | "statusLabelAr">, timelineItems);
    }
    return order.statusLabelAr;
  }
  const key = `p17.commerce.status.${role}.${order.status}`;
  const translated = t(key);
  if (translated !== key) return translated;
  return order.statusLabelAr;
}

/** Marketplace price line — currency before amount (EUR 77.00). */
export function formatOrderPrice(amount: string, currency: string): string {
  return `${currency} ${amount}`;
}

/** Locale-aware relative updated time (A8). */
export function formatOrderUpdatedAt(order: Pick<OrderListItem, "updatedAt" | "updatedAtRelativeAr">): string {
  const relative = formatRelativeTime(order.updatedAt);
  return relative || order.updatedAtRelativeAr;
}

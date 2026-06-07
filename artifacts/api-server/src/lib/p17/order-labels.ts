import type { OrderStatus } from "@workspace/db";

const BUYER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "إتمام الطلب",
  pending_confirmation: "بانتظار تأكيد البائع",
  confirmed: "تم تأكيد الطلب من البائع",
  preparing: "قيد التجهيز",
  shipped: "تم الشحن",
  in_transit: "قيد الشحن",
  out_for_delivery: "خرج للتسليم",
  delivered: "تم التسليم",
  buyer_confirmed: "تم تأكيد الاستلام",
  completed: "اكتمل الطلب",
  cancelled: "ملغى",
};

const SELLER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "—",
  pending_confirmation: "طلب جديد — يحتاج تأكيدك",
  confirmed: "جهّز الشحنة",
  preparing: "قيد التجهيز",
  shipped: "تم الشحن",
  in_transit: "قيد الشحن",
  out_for_delivery: "خرج للتسليم",
  delivered: "بانتظار تأكيد المشتري",
  buyer_confirmed: "اكتمل تقريبًا",
  completed: "اكتمل الطلب",
  cancelled: "ملغى",
};

export function orderStatusLabelAr(
  status: OrderStatus,
  role: "buyer" | "seller",
): string {
  return role === "seller" ? SELLER_STATUS_LABELS[status] : BUYER_STATUS_LABELS[status];
}

/** P17-7A §4.1 — distinguish seller reject vs buyer cancel on `cancelled` status. */
export function resolveBuyerCancelledStatusLabel(eventCodes: readonly string[]): string {
  if (eventCodes.includes("seller_rejected_order")) {
    return "تم رفض الطلب من البائع";
  }
  if (eventCodes.includes("buyer_cancelled_order")) {
    return "تم إلغاء الطلب";
  }
  return BUYER_STATUS_LABELS.cancelled;
}

export function formatRelativeTimeAr(date: Date, now = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return "الآن";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "منذ ساعة" : `منذ ${hours} ساعات`;
  const days = Math.floor(hours / 24);
  if (days < 7) return days === 1 ? "منذ يوم" : `منذ ${days} أيام`;
  return date.toLocaleDateString("ar-EG");
}

export function formatAmount(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "0.00";
  const n = typeof value === "number" ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
}

import type { NotificationDeepLinkInput } from "./types";

function readPositiveInt(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function readOrderNumber(metadata: Record<string, unknown> | null | undefined): string | null {
  const raw = metadata?.order_number ?? metadata?.orderNumber;
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  return s.length > 0 ? s : null;
}

function orderDetailPath(metadata: Record<string, unknown> | null | undefined): string | null {
  const orderNumber = readOrderNumber(metadata);
  if (!orderNumber) return null;
  const role = String(metadata?.role ?? metadata?.orderRole ?? "")
    .trim()
    .toLowerCase();
  if (role === "seller") return `/seller-orders/${encodeURIComponent(orderNumber)}`;
  return `/orders/${encodeURIComponent(orderNumber)}`;
}

/** Unified deep-link resolver — Architecture Lock + P17-4-NAV §6. */
export function notificationDeepLinkPath(input: NotificationDeepLinkInput): string {
  const type = input.type.trim().toLowerCase();
  const entityType = input.entityType?.trim().toLowerCase() ?? "";
  const entityId = input.entityId;
  const metadata = input.metadata ?? null;

  if (type.startsWith("message.") || type.startsWith("chat.")) {
    if (entityType === "conversation" && entityId != null) {
      return `/messages/${entityId}`;
    }
    const convId = readPositiveInt(metadata?.conversationId);
    if (convId) return `/messages/${convId}`;
    return "/messages";
  }

  if (entityType === "order" || type.startsWith("order.")) {
    const orderPath = orderDetailPath(metadata);
    if (orderPath) return orderPath;
    const role = String(metadata?.role ?? "").trim().toLowerCase();
    return role === "seller" ? "/seller-orders" : "/orders";
  }

  if (entityType === "ad" && entityId != null) return `/ad/${entityId}`;

  if (entityType === "support_ticket" && entityId != null) {
    return `/account/help?ticket=${entityId}`;
  }

  if (entityType === "verification_request" && entityId != null) {
    return `/account/verification/status/${entityId}`;
  }

  if (entityType === "enforcement" && entityId != null) {
    return `/account/trust/enforcement/${entityId}`;
  }

  const enforcementId = metadata?.enforcement_id;
  if (typeof enforcementId === "string" && enforcementId.trim()) {
    return `/account/trust/enforcement/${encodeURIComponent(enforcementId.trim())}`;
  }

  if (type.startsWith("verification.")) {
    const reqId =
      (entityType === "verification_request" ? entityId : null) ??
      readPositiveInt(metadata?.requestId);
    if (reqId) return `/account/verification/status/${reqId}`;
    return "/account/verification";
  }

  if (entityType === "report" && entityId != null) return "/notifications";

  if (type.startsWith("support.") || entityType === "support") {
    const ticketId = readPositiveInt(metadata?.ticketId) ?? (entityType === "support_ticket" ? entityId : null);
    if (ticketId) return `/account/help?ticket=${ticketId}`;
    return "/account/help";
  }

  if (type.startsWith("security.") || type.startsWith("trust.")) {
    return "/account/security";
  }

  if (type.startsWith("announcement.")) return "/notifications";

  return "/notifications";
}

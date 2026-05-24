export type NotificationDeepLinkInput = {
  type: string;
  entityType?: string | null;
  entityId?: number | null;
  metadata?: Record<string, unknown> | null;
};

/** Relative app path for push click / in-app navigation. */
export function notificationDeepLinkPath(input: NotificationDeepLinkInput): string {
  const type = input.type.trim().toLowerCase();
  const entityType = input.entityType?.trim().toLowerCase() ?? "";
  const entityId = input.entityId;

  if (type.startsWith("message.") || type.startsWith("chat.")) {
    if (entityType === "conversation" && entityId != null) {
      return `/messages/${entityId}`;
    }
    const convId = input.metadata?.conversationId;
    if (typeof convId === "number" && convId > 0) return `/messages/${convId}`;
    return "/messages";
  }

  if (entityType === "ad" && entityId != null) return `/ad/${entityId}`;
  if (entityType === "report" && entityId != null) return "/notifications";
  if (entityType === "support" || type.startsWith("support.")) return "/account/help";
  if (type.startsWith("announcement.")) return "/notifications";

  return "/notifications";
}

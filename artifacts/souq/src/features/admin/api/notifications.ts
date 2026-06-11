import { apiUrl } from "@/lib/api-url";
import { apiGet, getAdminMutationHeaders, throwAdminMutationError } from "./client";

export type AdminNotificationCategory =
  | "moderation"
  | "reports"
  | "support"
  | "verification"
  | "operations"
  | "security"
  | "system";

export type AdminNotificationPriorityLabel = "critical" | "high" | "medium" | "low";

export type AdminNotificationRow = {
  id: number;
  type: string;
  category: AdminNotificationCategory;
  priority: 0 | 1 | 2 | 3;
  priorityLabel: AdminNotificationPriorityLabel;
  title: string;
  body: string;
  entityType: string | null;
  entityId: number | null;
  metadata: Record<string, unknown> | null;
  deepLinkPath: string;
  readAt: string | null;
  createdAt: string;
};

export type AdminNotificationUnreadCount = {
  unread: number;
  critical: number;
};

export function getAdminNotifications(signal?: AbortSignal) {
  return apiGet<AdminNotificationRow[]>("/api/admin/notifications", signal);
}

export function getAdminNotificationUnreadCount(signal?: AbortSignal) {
  return apiGet<AdminNotificationUnreadCount>("/api/admin/notifications/unread-count", signal);
}

export async function markAdminNotificationRead(id: number): Promise<void> {
  const res = await fetch(apiUrl(`/api/admin/notifications/${id}/read`), {
    method: "PATCH",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
  });
  if (!res.ok) {
    await throwAdminMutationError(res, "p8.admin.notifications.error.mark_read");
  }
}

export async function markAllAdminNotificationsRead(): Promise<{ cleared: number }> {
  const res = await fetch(apiUrl("/api/admin/notifications/read-all"), {
    method: "PATCH",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
  });
  const text = await res.text();
  let parsed: { cleared?: number } = {};
  try {
    parsed = text ? (JSON.parse(text) as { cleared?: number }) : {};
  } catch {
    parsed = {};
  }
  if (!res.ok) {
    await throwAdminMutationError(res, "p8.admin.notifications.error.mark_all", text);
  }
  return { cleared: typeof parsed.cleared === "number" ? parsed.cleared : 0 };
}

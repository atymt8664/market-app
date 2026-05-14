import { apiUrl } from "@/lib/api-url";
import { getAuthProfileCsrfTokenForRequest } from "@workspace/api-client-react";

export type AppNotification = {
  id: number;
  type: string;
  title: string;
  body: string;
  entityType: string | null;
  entityId: number | null;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationsApiErrorKind =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "server"
  | "network"
  | "schema" /** e.g. notifications table missing */
  | "unknown";

export class NotificationsApiError extends Error {
  readonly kind: NotificationsApiErrorKind;
  readonly status: number;

  constructor(message: string, kind: NotificationsApiErrorKind, status: number) {
    super(message);
    this.name = "NotificationsApiError";
    this.kind = kind;
    this.status = status;
  }
}

function classifyError(status: number, bodyText: string): NotificationsApiErrorKind {
  const lower = bodyText.toLowerCase();
  if (
    status === 500 &&
    ((lower.includes("notifications") && lower.includes("does not exist")) ||
      lower.includes("undefined_table") ||
      (lower.includes("relation") && lower.includes("notifications")))
  ) {
    return "schema";
  }
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status >= 500) return "server";
  return "unknown";
}

async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      credentials: "include",
      cache: "no-store",
      signal,
    });
  } catch {
    throw new NotificationsApiError("Failed to fetch", "network", 0);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const kind = classifyError(res.status, text);
    throw new NotificationsApiError(
      text.slice(0, 300) || `HTTP ${res.status}`,
      kind,
      res.status,
    );
  }
  return res.json() as Promise<T>;
}

async function apiPatchJson<T>(path: string): Promise<T> {
  const csrf = getAuthProfileCsrfTokenForRequest();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (typeof csrf === "string" && csrf.length >= 32) {
    headers["X-CSRF-Token"] = csrf;
  }
  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      method: "PATCH",
      credentials: "include",
      cache: "no-store",
      headers,
      body: "{}",
    });
  } catch {
    throw new NotificationsApiError("network", "network", 0);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const kind = classifyError(res.status, text);
    throw new NotificationsApiError(text.slice(0, 300) || `HTTP ${res.status}`, kind, res.status);
  }
  return res.json() as Promise<T>;
}

export function getNotifications(signal?: AbortSignal) {
  return apiGet<AppNotification[]>("/api/notifications", signal);
}

export function getUnreadNotificationsCount(signal?: AbortSignal) {
  return apiGet<{ count: number }>("/api/notifications/unread-count", signal);
}

export function markNotificationRead(id: number) {
  return apiPatchJson<{ ok: boolean; id: number }>(`/api/notifications/${id}/read`);
}

export function markAllNotificationsRead() {
  return apiPatchJson<{ ok: boolean }>("/api/notifications/read-all");
}

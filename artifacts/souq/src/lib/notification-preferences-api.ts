import { ensureAuthProfileCsrfReady } from "@/lib/auth-csrf";
import { apiUrl } from "@/lib/api-url";

export type NotificationPrefsDto = {
  notifyMessages: boolean;
  notifyAdModeration: boolean;
  notifySupport: boolean;
  notifyReports: boolean;
  notifyAnnouncements: boolean;
  notifyFavorites: boolean;
  pushEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  quietHoursTimezone: string;
};

export class NotificationPrefsApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "NotificationPrefsApiError";
    this.status = status;
    this.code = code;
  }
}

async function buildAuthHeaders(): Promise<Record<string, string>> {
  const csrf = await ensureAuthProfileCsrfReady();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (typeof csrf === "string" && csrf.length >= 32) {
    headers["X-CSRF-Token"] = csrf;
  }
  return headers;
}

async function parseError(res: Response): Promise<NotificationPrefsApiError> {
  let message = String(res.status);
  let code: string | undefined;
  try {
    const data = (await res.json()) as { error?: string; code?: string };
    if (typeof data.error === "string" && data.error.trim()) message = data.error.trim();
    if (typeof data.code === "string") code = data.code;
  } catch {
  }
  return new NotificationPrefsApiError(res.status, message, code);
}

export async function fetchNotificationPrefs(): Promise<NotificationPrefsDto> {
  const res = await fetch(apiUrl("/api/account/notification-preferences"), {
    credentials: "include",
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<NotificationPrefsDto>;
}

export async function patchNotificationPrefs(
  patch: Partial<NotificationPrefsDto>,
): Promise<NotificationPrefsDto> {
  const headers = await buildAuthHeaders();
  if (!headers["X-CSRF-Token"]) {
    throw new NotificationPrefsApiError(
      403,
      "انتهت الجلسة — أعد تسجيل الدخول ثم حاول مجدداً",
      "CSRF_MISSING",
    );
  }

  const res = await fetch(apiUrl("/api/account/notification-preferences"), {
    method: "PATCH",
    credentials: "include",
    headers,
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<NotificationPrefsDto>;
}

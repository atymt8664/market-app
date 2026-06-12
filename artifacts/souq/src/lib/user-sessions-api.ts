import { ensureAuthProfileCsrfReady } from "@/lib/auth-csrf";
import { apiUrl } from "@/lib/api-url";

export type UserSessionDto = {
  sessionId: string;
  expiresAt: string;
  isCurrent: boolean;
};

export class UserSessionsApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "UserSessionsApiError";
    this.status = status;
    this.code = code;
  }
}

async function buildAuthHeaders(): Promise<Record<string, string>> {
  const csrf = await ensureAuthProfileCsrfReady();
  const headers: Record<string, string> = {};
  if (typeof csrf === "string" && csrf.length >= 32) {
    headers["X-CSRF-Token"] = csrf;
  }
  return headers;
}

async function parseError(res: Response): Promise<UserSessionsApiError> {
  let message = String(res.status);
  let code: string | undefined;
  try {
    const data = (await res.json()) as { error?: string; code?: string };
    if (typeof data.error === "string" && data.error.trim()) message = data.error.trim();
    if (typeof data.code === "string") code = data.code;
  } catch {
    /* ignore */
  }
  return new UserSessionsApiError(res.status, message, code);
}

export async function fetchUserSessions(): Promise<UserSessionDto[]> {
  const res = await fetch(apiUrl("/api/account/sessions"), {
    credentials: "include",
  });
  if (!res.ok) throw await parseError(res);
  const data = (await res.json()) as { sessions?: UserSessionDto[] };
  return Array.isArray(data.sessions) ? data.sessions : [];
}

export async function revokeUserSession(sessionId: string): Promise<void> {
  const headers = await buildAuthHeaders();
  if (!headers["X-CSRF-Token"]) {
    throw new UserSessionsApiError(
      403,
      "انتهت الجلسة — أعد تسجيل الدخول ثم حاول مجدداً",
      "CSRF_MISSING",
    );
  }
  const res = await fetch(apiUrl(`/api/account/sessions/${encodeURIComponent(sessionId)}`), {
    method: "DELETE",
    credentials: "include",
    headers,
  });
  if (!res.ok) throw await parseError(res);
}

export async function revokeOtherUserSessions(): Promise<number> {
  const headers = await buildAuthHeaders();
  if (!headers["X-CSRF-Token"]) {
    throw new UserSessionsApiError(
      403,
      "انتهت الجلسة — أعد تسجيل الدخول ثم حاول مجدداً",
      "CSRF_MISSING",
    );
  }
  const res = await fetch(apiUrl("/api/account/sessions/others"), {
    method: "DELETE",
    credentials: "include",
    headers,
  });
  if (!res.ok) throw await parseError(res);
  const data = (await res.json()) as { revoked?: number };
  return typeof data.revoked === "number" ? data.revoked : 0;
}

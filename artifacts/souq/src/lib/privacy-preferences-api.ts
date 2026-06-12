import { ensureAuthProfileCsrfReady } from "@/lib/auth-csrf";
import { apiUrl } from "@/lib/api-url";

export type PrivacyPrefsDto = {
  showActivityStatus: boolean;
  showLastSeen: boolean;
};

export class PrivacyPrefsApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "PrivacyPrefsApiError";
    this.status = status;
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

async function parseError(res: Response): Promise<PrivacyPrefsApiError> {
  let message = String(res.status);
  try {
    const data = (await res.json()) as { error?: string };
    if (typeof data.error === "string" && data.error.trim()) message = data.error.trim();
  } catch {
    /* ignore */
  }
  return new PrivacyPrefsApiError(res.status, message);
}

export async function fetchPrivacyPrefs(): Promise<PrivacyPrefsDto> {
  const res = await fetch(apiUrl("/api/account/privacy-preferences"), { credentials: "include" });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<PrivacyPrefsDto>;
}

export async function patchPrivacyPrefs(patch: Partial<PrivacyPrefsDto>): Promise<PrivacyPrefsDto> {
  const headers = await buildAuthHeaders();
  if (!headers["X-CSRF-Token"]) {
    throw new PrivacyPrefsApiError(403, "انتهت الجلسة — أعد تسجيل الدخول ثم حاول مجدداً");
  }
  const res = await fetch(apiUrl("/api/account/privacy-preferences"), {
    method: "PATCH",
    credentials: "include",
    headers,
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<PrivacyPrefsDto>;
}

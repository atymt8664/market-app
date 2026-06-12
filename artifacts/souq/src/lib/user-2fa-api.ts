import { ensureAuthProfileCsrfReady } from "@/lib/auth-csrf";
import { apiUrl } from "@/lib/api-url";

export type User2faStatusDto = {
  enabled: boolean;
  enabledAt: string | null;
  backupCodesRemaining: number;
};

export class User2faApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "User2faApiError";
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

async function parseError(res: Response): Promise<User2faApiError> {
  let message = String(res.status);
  try {
    const data = (await res.json()) as { error?: string };
    if (typeof data.error === "string" && data.error.trim()) message = data.error.trim();
  } catch {
    /* ignore */
  }
  return new User2faApiError(res.status, message);
}

export async function fetchUser2faStatus(): Promise<User2faStatusDto> {
  const res = await fetch(apiUrl("/api/account/2fa/status"), { credentials: "include" });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as User2faStatusDto;
}

export async function user2faSetupStart(currentPassword: string): Promise<void> {
  const headers = await buildAuthHeaders();
  const res = await fetch(apiUrl("/api/account/2fa/setup/start"), {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({ currentPassword }),
  });
  if (!res.ok) throw await parseError(res);
}

export async function user2faSetupQr(): Promise<{ qrDataUrl: string }> {
  const res = await fetch(apiUrl("/api/account/2fa/setup/qr"), { credentials: "include" });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as { qrDataUrl: string };
}

export async function user2faSetupConfirm(
  currentPassword: string,
  code: string,
): Promise<{ backupCodes: string[] }> {
  const headers = await buildAuthHeaders();
  const res = await fetch(apiUrl("/api/account/2fa/setup/confirm"), {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({ currentPassword, code }),
  });
  if (!res.ok) throw await parseError(res);
  const data = (await res.json()) as { backupCodes?: string[] };
  return { backupCodes: Array.isArray(data.backupCodes) ? data.backupCodes : [] };
}

export async function user2faDisable(currentPassword: string, code: string): Promise<void> {
  const headers = await buildAuthHeaders();
  const res = await fetch(apiUrl("/api/account/2fa/disable"), {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({ currentPassword, code }),
  });
  if (!res.ok) throw await parseError(res);
}

export async function user2faRegenerateBackupCodes(
  currentPassword: string,
  code: string,
): Promise<{ backupCodes: string[] }> {
  const headers = await buildAuthHeaders();
  const res = await fetch(apiUrl("/api/account/2fa/backup/regenerate"), {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({ currentPassword, code }),
  });
  if (!res.ok) throw await parseError(res);
  const data = (await res.json()) as { backupCodes?: string[] };
  return { backupCodes: Array.isArray(data.backupCodes) ? data.backupCodes : [] };
}

export async function submitUserLoginTotp(code: string): Promise<Record<string, unknown>> {
  const res = await fetch(apiUrl("/api/auth/login/totp"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ code }),
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    json = {};
  }
  if (!res.ok) {
    const err = typeof json.error === "string" ? json.error : "رمز التحقق غير صحيح";
    throw new User2faApiError(res.status, err);
  }
  return json;
}

import { ensureAuthProfileCsrfReady } from "@/lib/auth-csrf";
import { apiUrl } from "@/lib/api-url";

export type UserDeviceDto = {
  deviceId: number;
  deviceLabel: string | null;
  createdAt: string;
  isCurrent: boolean;
};

export class UserDevicesApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "UserDevicesApiError";
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

async function parseError(res: Response): Promise<UserDevicesApiError> {
  let message = String(res.status);
  let code: string | undefined;
  try {
    const data = (await res.json()) as { error?: string; code?: string };
    if (typeof data.error === "string" && data.error.trim()) message = data.error.trim();
    if (typeof data.code === "string") code = data.code;
  } catch {
    /* ignore */
  }
  return new UserDevicesApiError(res.status, message, code);
}

export async function fetchUserDevices(): Promise<UserDeviceDto[]> {
  const res = await fetch(apiUrl("/api/account/devices"), {
    credentials: "include",
  });
  if (!res.ok) throw await parseError(res);
  const data = (await res.json()) as { devices?: UserDeviceDto[] };
  return Array.isArray(data.devices) ? data.devices : [];
}

export async function revokeUserDevice(deviceId: number): Promise<void> {
  const headers = await buildAuthHeaders();
  if (!headers["X-CSRF-Token"]) {
    throw new UserDevicesApiError(
      403,
      "انتهت الجلسة — أعد تسجيل الدخول ثم حاول مجدداً",
      "CSRF_MISSING",
    );
  }
  const res = await fetch(apiUrl(`/api/account/devices/${encodeURIComponent(String(deviceId))}`), {
    method: "DELETE",
    credentials: "include",
    headers,
  });
  if (!res.ok) throw await parseError(res);
}

import { apiUrl } from "@/lib/api-url";
import { t } from "@/i18n";
import { apiGet, clearAdminCsrfToken, getAdminMutationHeaders, rememberAdminCsrfToken, throwAdminMutationError } from "./client";

export function getAdminMe(signal?: AbortSignal) {
  return apiGet<import("../rbac").AdminMeResponse>("/api/admin/me", signal);
}

export type AdminAppSettings = {
  appName: string;
  appVersion: string;
  supportEmail: string;
  requireAdApproval: boolean;
  reportsEnabled: boolean;
  supportEnabled: boolean;
  termsPath: string;
  privacyPath: string;
  updatedAt: string | null;
  updatedByAdminId: number | null;
  admin2faEnabled?: boolean;
};

export function getAdminSettings(signal?: AbortSignal) {
  return apiGet<AdminAppSettings>("/api/admin/settings", signal);
}

type ChangeAdminPasswordResponseBody = {
  ok?: boolean;
  reauthRequired?: boolean;
  error?: string;
};

export async function changeAdminPassword(payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ ok: boolean; reauthRequired?: boolean }> {
  const res = await fetch(apiUrl("/api/admin/change-password"), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let parsed: ChangeAdminPasswordResponseBody | null = null;
  try {
    parsed = text ? (JSON.parse(text) as ChangeAdminPasswordResponseBody) : null;
  } catch {
    parsed = null;
  }
  if (!res.ok) {
    const msg =
      typeof parsed?.error === "string" && parsed.error.trim()
        ? parsed.error
        : text?.slice(0, 500)?.trim() || t("p8.admin.api_errors.auth_password");
    throw new Error(msg);
  }
  return {
    ok: parsed?.ok ?? true,
    reauthRequired: parsed?.reauthRequired ?? true,
  };
}

export async function adminLogout() {
  const res = await fetch(apiUrl("/api/admin-logout"), {
    method: "POST",
    credentials: "include",
    headers: getAdminMutationHeaders(),
  });
  if (!res.ok) throw new Error(t("p8.admin.api_errors.auth_logout"));
  clearAdminCsrfToken();
}

/** After successful admin-login responses that include csrfToken. */
export function absorbAdminLoginCsrf(body: { csrfToken?: unknown } | null | undefined) {
  rememberAdminCsrfToken(body?.csrfToken);
}

export async function submitAdminLoginTotp(accessKey: string, code: string): Promise<void> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const trimmedKey = accessKey.trim();
  if (trimmedKey) {
    headers["X-Admin-Access-Key"] = trimmedKey;
  }
  const res = await fetch(apiUrl("/api/admin-login/totp"), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers,
    body: JSON.stringify({ code: code.trim() }),
  });
  const text = await res.text();
  let parsed: { csrfToken?: unknown; success?: boolean; error?: string } | null = null;
  try {
    parsed = text ? (JSON.parse(text) as typeof parsed) : null;
  } catch {
    parsed = null;
  }
  if (!res.ok) {
    if (res.status === 403) {
      throw new Error(t("p8.admin.login.error_access_denied"));
    }
    if (res.status === 429) {
      throw new Error(t("p8.admin.login.error_rate_limit"));
    }
    throw new Error(t("p8.admin.api_errors.auth_totp"));
  }
  absorbAdminLoginCsrf(parsed);
}

export async function admin2faSetupStart(currentPassword: string): Promise<void> {
  const res = await fetch(apiUrl("/api/admin/2fa/setup/start"), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
    body: JSON.stringify({ currentPassword: currentPassword.trim() }),
  });
  const text = await res.text();
  if (!res.ok) {
    let err = t("p8.admin.api_errors.auth_2fa_setup");
    try {
      const j = text ? (JSON.parse(text) as { error?: string }) : null;
      if (j?.error) err = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(err);
  }
}

export async function admin2faSetupQr(): Promise<{ qrDataUrl: string }> {
  const res = await fetch(apiUrl("/api/admin/2fa/setup/qr"), {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    await throwAdminMutationError(res, "p8.admin.api_errors.auth_2fa_qr");
  }
  return res.json() as Promise<{ qrDataUrl: string }>;
}

export async function admin2faSetupConfirm(
  currentPassword: string,
  code: string,
): Promise<{ backupCodes: string[] }> {
  const res = await fetch(apiUrl("/api/admin/2fa/setup/confirm"), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
    body: JSON.stringify({
      currentPassword: currentPassword.trim(),
      code: code.trim(),
    }),
  });
  const text = await res.text();
  type Admin2faSetupConfirmJson = { ok?: boolean; backupCodes?: string[]; error?: string };
  let parsed: Admin2faSetupConfirmJson | null = null;
  try {
    parsed = text ? (JSON.parse(text) as Admin2faSetupConfirmJson) : null;
  } catch {
    parsed = null;
  }
  if (!res.ok) {
    const msg =
      typeof parsed?.error === "string" && parsed.error.trim()
        ? parsed.error
        : t("p8.admin.api_errors.auth_2fa_confirm");
    throw new Error(msg);
  }
  const codes = Array.isArray(parsed?.backupCodes) ? parsed.backupCodes : [];
  return { backupCodes: codes.filter((c: unknown) => typeof c === "string") };
}

export async function admin2faDisable(currentPassword: string, code: string): Promise<void> {
  const res = await fetch(apiUrl("/api/admin/2fa/disable"), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
    body: JSON.stringify({
      currentPassword: currentPassword.trim(),
      code: code.trim(),
    }),
  });
  const text = await res.text();
  type Admin2faDisableJson = { error?: string };
  let parsed: Admin2faDisableJson | null = null;
  try {
    parsed = text ? (JSON.parse(text) as Admin2faDisableJson) : null;
  } catch {
    parsed = null;
  }
  if (!res.ok) {
    const msg =
      typeof parsed?.error === "string" && parsed.error.trim()
        ? parsed.error
        : t("p8.admin.api_errors.auth_2fa_disable");
    throw new Error(msg);
  }
}

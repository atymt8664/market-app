import type {
  AdminAd,
  AdminActivityLog,
  AdminCategory,
  AdminCitiesResponse,
  AdminDashboardResponse,
  AdminReport,
  AdminStatsPeriod,
  AdminStatsResponse,
  AdminSupportMessage,
  AdminSupportTicket,
  AdminUser,
  AdminUserDetails,
} from "./types";
import { apiUrl } from "@/lib/api-url";

let adminCsrfToken: string | null = null;

function rememberAdminCsrfToken(token: unknown) {
  if (typeof token === "string" && token.trim().length >= 32) {
    adminCsrfToken = token.trim();
  }
}

function getAdminMutationHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra ?? {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (adminCsrfToken) {
    headers.set("X-CSRF-Token", adminCsrfToken);
  }
  return headers;
}

async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(apiUrl(path), {
    credentials: "include",
    cache: "no-store",
    signal,
  });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
  const data = (await res.json()) as T;
  if (path === "/api/admin/me") {
    const payload = data as { csrfToken?: unknown };
    rememberAdminCsrfToken(payload?.csrfToken);
  }
  return data;
}

export function getAdminMe(signal?: AbortSignal) {
  return apiGet<{ isAdmin: boolean }>("/api/admin/me", signal);
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
        : text?.slice(0, 500)?.trim() || "فشل تغيير كلمة المرور";
    throw new Error(msg);
  }
  return {
    ok: parsed?.ok ?? true,
    reauthRequired: parsed?.reauthRequired ?? true,
  };
}

export function getAdminDashboard(signal?: AbortSignal) {
  return apiGet<AdminDashboardResponse>("/api/admin/dashboard", signal);
}

export async function adminLogout() {
  const res = await fetch(apiUrl("/api/admin-logout"), {
    method: "POST",
    credentials: "include",
    headers: getAdminMutationHeaders(),
  });
  if (!res.ok) throw new Error("Logout failed");
  adminCsrfToken = null;
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
      throw new Error("تم رفض الوصول.");
    }
    if (res.status === 429) {
      throw new Error("محاولات كثيرة، انتظر قليلاً وحاول مجدداً");
    }
    throw new Error("تعذر إكمال الدخول. تحقق من الرمز أو رمز الاسترداد.");
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
    let err = "تعذر بدء الإعداد";
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
    throw new Error(`Request failed (${res.status})`);
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
  let parsed: { ok?: boolean; backupCodes?: string[]; error?: string } | null = null;
  try {
    parsed = text ? (JSON.parse(text) as typeof parsed) : null;
  } catch {
    parsed = null;
  }
  if (!res.ok) {
    const msg =
      typeof parsed?.error === "string" && parsed.error.trim()
        ? parsed.error
        : "فشل تأكيد المصادقة الثنائية";
    throw new Error(msg);
  }
  const codes = Array.isArray(parsed?.backupCodes) ? parsed!.backupCodes! : [];
  return { backupCodes: codes.filter((c) => typeof c === "string") };
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
  let parsed: { error?: string } | null = null;
  try {
    parsed = text ? (JSON.parse(text) as typeof parsed) : null;
  } catch {
    parsed = null;
  }
  if (!res.ok) {
    const msg =
      typeof parsed?.error === "string" && parsed.error.trim()
        ? parsed.error
        : "تعذر تعطيل المصادقة الثنائية";
    throw new Error(msg);
  }
}

export async function getAdminAds(params: {
  status?: string;
  q?: string;
  /** فلتر featured من الخادم: all | true | false */
  featured?: "all" | "true" | "false";
}) {
  const search = new URLSearchParams();
  if (params.status && params.status !== "all") search.set("status", params.status);
  if (params.q?.trim()) search.set("q", params.q.trim());
  if (params.featured === "true") search.set("featured", "true");
  if (params.featured === "false") search.set("featured", "false");
  const qs = search.toString();
  return apiGet<AdminAd[]>(`/api/admin/ads${qs ? `?${qs}` : ""}`);
}

export async function patchAdminAdFeatured(id: number, featured: boolean) {
  const res = await fetch(apiUrl(`/api/admin/ads/${id}/featured`), {
    method: "PATCH",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
    body: JSON.stringify({ featured }),
  });
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  if (!res.ok) {
    const errBody = parsed as { error?: string } | null;
    const msg =
      typeof errBody?.error === "string" && errBody.error.trim()
        ? errBody.error
        : text?.trim() || "فشل تحديث التمييز";
    throw new Error(msg);
  }
  return (parsed ?? {}) as {
    ok: boolean;
    id: number;
    featured: boolean;
    status: string;
  };
}

export async function updateAdminAdStatus(
  id: number,
  status: "approved" | "rejected" | "hidden",
) {
  const res = await fetch(apiUrl(`/api/admin/ads/${id}/status`), {
    method: "PATCH",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || "Status update failed");
  }
}

export async function deleteAdminAd(id: number) {
  const res = await fetch(apiUrl(`/api/admin/ads/${id}`), {
    method: "DELETE",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || "Delete failed");
  }
}

export function getAdminReports() {
  return apiGet<AdminReport[]>("/api/admin/reports");
}

export async function updateAdminReportStatus(
  id: number,
  status: "pending" | "in_review" | "resolved" | "rejected",
) {
  const res = await fetch(apiUrl(`/api/admin/reports/${id}/status`), {
    method: "PATCH",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || "Report status update failed");
  }
}

export async function moderateReportedAd(id: number, action: "hide" | "delete") {
  const res = await fetch(apiUrl(`/api/reports/admin/${id}/ad-action`), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
    body: JSON.stringify({ action }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || "Ad moderation action failed");
  }
}

export async function createSupportTicket(payload: {
  category: string;
  subject: string;
  message: string;
  relatedAdId?: number | null;
  relatedUserId?: number | null;
}) {
  const allowedCategories = new Set([
    "general",
    "login",
    "ad",
    "payment",
    "account",
    "other",
  ]);
  const parseOptionalId = (value: unknown): number | null => {
    if (typeof value !== "number") return null;
    return Number.isInteger(value) && value > 0 ? value : null;
  };
  const normalizeCategory = (value: unknown): string => {
    if (typeof value !== "string") return "general";
    const normalized = value.trim().toLowerCase();
    if (!normalized) return "general";
    return allowedCategories.has(normalized) ? normalized : "general";
  };

  const normalizedPayload = {
    category: normalizeCategory(payload.category),
    subject: String(payload.subject ?? "").trim(),
    message: String(payload.message ?? "").trim(),
    related_ad_id: parseOptionalId(payload.relatedAdId),
    related_user_id: parseOptionalId(payload.relatedUserId),
  };

  const res = await fetch(apiUrl("/api/support/tickets"), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(normalizedPayload),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { error?: string; details?: string }
      | null;
    throw new Error(body?.error || body?.details || "Ticket creation failed");
  }
  return res.json();
}

export function getAdminSupportTickets(params: { status?: string; q?: string }) {
  const search = new URLSearchParams();
  if (params.status && params.status !== "all") search.set("status", params.status);
  if (params.q?.trim()) search.set("q", params.q.trim());
  const qs = search.toString();
  return apiGet<AdminSupportTicket[]>(
    `/api/admin/support/tickets${qs ? `?${qs}` : ""}`,
  );
}

export function getAdminSupportMessages(ticketId: number) {
  return apiGet<AdminSupportMessage[]>(`/api/admin/support/tickets/${ticketId}/messages`);
}

export async function updateAdminSupportTicket(
  id: number,
  payload: { status?: "open" | "pending" | "resolved" | "closed"; priority?: "low" | "normal" | "high" | "urgent" },
) {
  const res = await fetch(apiUrl(`/api/admin/support/tickets/${id}`), {
    method: "PATCH",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || "Ticket update failed");
  }
}

export async function replyAdminSupportTicket(id: number, message: string) {
  const res = await fetch(apiUrl(`/api/admin/support/tickets/${id}/reply`), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || "Reply failed");
  }
}

export function getAdminUsers(params: { status?: string; q?: string }) {
  const search = new URLSearchParams();
  if (params.status && params.status !== "all") search.set("status", params.status);
  if (params.q?.trim()) search.set("q", params.q.trim());
  const qs = search.toString();
  return apiGet<AdminUser[]>(`/api/admin/users${qs ? `?${qs}` : ""}`);
}

export function getAdminUserDetails(id: number) {
  return apiGet<AdminUserDetails>(`/api/admin/users/${id}`);
}

export async function updateAdminUserStatus(
  id: number,
  status: "active" | "banned",
) {
  const res = await fetch(apiUrl(`/api/admin/users/${id}`), {
    method: "PATCH",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || "User status update failed");
  }
}

export function getAdminStats(period: AdminStatsPeriod, signal?: AbortSignal) {
  const search = new URLSearchParams();
  if (period !== "all") search.set("period", period);
  const qs = search.toString();
  return apiGet<AdminStatsResponse>(`/api/admin/stats${qs ? `?${qs}` : ""}`, signal);
}

export async function getAdminLogs(params: {
  actionType?: string;
  targetType?: string;
  q?: string;
  from?: string;
  to?: string;
}) {
  const search = new URLSearchParams();
  if (params.actionType && params.actionType !== "all") {
    search.set("actionType", params.actionType);
  }
  if (params.targetType && params.targetType !== "all") {
    search.set("targetType", params.targetType);
  }
  if (params.q?.trim()) search.set("q", params.q.trim());
  if (params.from?.trim()) search.set("from", params.from.trim());
  if (params.to?.trim()) search.set("to", params.to.trim());
  const qs = search.toString();
  return apiGet<AdminActivityLog[]>(`/api/admin/logs${qs ? `?${qs}` : ""}`);
}

export async function getAdminCategories(params: { q?: string; status?: string }) {
  const search = new URLSearchParams();
  if (params.q?.trim()) search.set("q", params.q.trim());
  if (params.status && params.status !== "all") search.set("status", params.status);
  const qs = search.toString();
  return apiGet<AdminCategory[]>(`/api/admin/categories${qs ? `?${qs}` : ""}`);
}

export async function createAdminCategory(payload: {
  type: "category" | "subcategory";
  name: string;
  slug?: string;
  icon?: string;
  subtitle?: string;
  sortOrder?: number;
  categoryId?: number;
}) {
  const res = await fetch(apiUrl("/api/admin/categories"), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.text()) || "Create category failed");
  return res.json();
}

export async function updateAdminCategory(
  id: number,
  payload: {
    type: "category" | "subcategory";
    name?: string;
    slug?: string;
    icon?: string;
    subtitle?: string;
    sortOrder?: number;
    isHidden?: boolean;
    categoryId?: number;
  },
) {
  const res = await fetch(apiUrl(`/api/admin/categories/${id}`), {
    method: "PATCH",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.text()) || "Update category failed");
  return res.json();
}

export async function deleteAdminCategory(id: number, type: "category" | "subcategory") {
  const res = await fetch(apiUrl(`/api/admin/categories/${id}?type=${type}`), {
    method: "DELETE",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
  });
  if (!res.ok) throw new Error((await res.text()) || "Delete category failed");
}

export async function getAdminCities(params: {
  q?: string;
  status?: string;
  countryCode?: string;
}) {
  const search = new URLSearchParams();
  if (params.q?.trim()) search.set("q", params.q.trim());
  if (params.status && params.status !== "all") search.set("status", params.status);
  if (params.countryCode && params.countryCode !== "all") {
    search.set("countryCode", params.countryCode.toUpperCase());
  }
  const qs = search.toString();
  return apiGet<AdminCitiesResponse>(`/api/admin/cities${qs ? `?${qs}` : ""}`);
}

export async function createAdminCity(payload: {
  name: string;
  countryCode: string;
  countryName: string;
}) {
  const res = await fetch(apiUrl("/api/admin/cities"), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.text()) || "Create city failed");
  return res.json();
}

export async function updateAdminCity(
  id: number,
  payload: {
    name?: string;
    countryCode?: string;
    countryName?: string;
    isHidden?: boolean;
  },
) {
  const res = await fetch(apiUrl(`/api/admin/cities/${id}`), {
    method: "PATCH",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.text()) || "Update city failed");
  return res.json();
}

export type UserSupportTicket = {
  id: number;
  userId: number;
  category: string;
  subject: string;
  status: string;
  priority: string;
  relatedAdId: number | null;
  relatedUserId: number | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type UserSupportMessage = {
  id: number;
  ticketId: number;
  userId: number | null;
  adminId: number | null;
  message: string;
  createdAt: string | null;
};

export function getMySupportTickets() {
  return apiGet<UserSupportTicket[]>("/api/support/tickets/mine");
}

export function getMySupportTicketMessages(ticketId: number) {
  return apiGet<UserSupportMessage[]>(`/api/support/tickets/${ticketId}/messages`);
}

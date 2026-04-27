import type {
  AdminAd,
  AdminDashboardResponse,
  AdminReport,
  AdminSupportMessage,
  AdminSupportTicket,
  AdminUser,
  AdminUserDetails,
} from "./types";

async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    cache: "no-store",
    signal,
  });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function getAdminMe(signal?: AbortSignal) {
  return apiGet<{ isAdmin: boolean }>("/api/admin/me", signal);
}

export function getAdminDashboard(signal?: AbortSignal) {
  return apiGet<AdminDashboardResponse>("/api/admin/dashboard", signal);
}

export async function adminLogout() {
  const res = await fetch("/api/admin-logout", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Logout failed");
}

export async function getAdminAds(params: { status?: string; q?: string }) {
  const search = new URLSearchParams();
  if (params.status && params.status !== "all") search.set("status", params.status);
  if (params.q?.trim()) search.set("q", params.q.trim());
  const qs = search.toString();
  return apiGet<AdminAd[]>(`/api/admin/ads${qs ? `?${qs}` : ""}`);
}

export async function updateAdminAdStatus(
  id: number,
  status: "approved" | "rejected" | "hidden",
) {
  const res = await fetch(`/api/admin/ads/${id}/status`, {
    method: "PATCH",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || "Status update failed");
  }
}

export async function deleteAdminAd(id: number) {
  const res = await fetch(`/api/admin/ads/${id}`, {
    method: "DELETE",
    credentials: "include",
    cache: "no-store",
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
  const res = await fetch(`/api/admin/reports/${id}/status`, {
    method: "PATCH",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || "Report status update failed");
  }
}

export async function moderateReportedAd(id: number, action: "hide" | "delete") {
  const res = await fetch(`/api/reports/admin/${id}/ad-action`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
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

  const res = await fetch("/api/support/tickets", {
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
  const res = await fetch(`/api/admin/support/tickets/${id}`, {
    method: "PATCH",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || "Ticket update failed");
  }
}

export async function replyAdminSupportTicket(id: number, message: string) {
  const res = await fetch(`/api/admin/support/tickets/${id}/reply`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
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
  const res = await fetch(`/api/admin/users/${id}`, {
    method: "PATCH",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || "User status update failed");
  }
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

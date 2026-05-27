import type { AdminSupportMessage, AdminSupportTicket } from "../types";
import { apiUrl } from "@/lib/api-url";
import { t } from "@/i18n";
import { getAuthProfileCsrfTokenForRequest } from "@workspace/api-client-react";
import { appendPageParams, apiGet, apiGetAdminPage, getAdminMutationHeaders, postAdminWorkflow, throwAdminMutationError } from "./client";

export async function updateAdminSupportTicket(
  id: number,
  payload: {
    status?: "open" | "pending" | "resolved" | "closed";
    priority?: "low" | "normal" | "high" | "urgent";
    reason?: string;
  },
) {
  const res = await fetch(apiUrl(`/api/admin/support/tickets/${id}`), {
    method: "PATCH",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    await throwAdminMutationError(res, "p8.admin.api_errors.support_update");
  }
  return res.json();
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
    headers: (() => {
      const h = new Headers({ "Content-Type": "application/json" });
      const userCsrf = getAuthProfileCsrfTokenForRequest();
      if (typeof userCsrf === "string" && userCsrf.length >= 32) {
        h.set("X-CSRF-Token", userCsrf);
      }
      return h;
    })(),
    body: JSON.stringify(normalizedPayload),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { error?: string; details?: string }
      | null;
    throw new Error(body?.error || body?.details || t("p8.admin.api_errors.support_create"));
  }
  return res.json();
}

export function getAdminSupportTickets(params: {
  status?: string;
  q?: string;
  queue?: string;
  page?: number;
  pageSize?: number;
}) {
  const search = new URLSearchParams();
  if (params.status && params.status !== "all") search.set("status", params.status);
  if (params.q?.trim()) search.set("q", params.q.trim());
  if (params.queue && params.queue !== "all") search.set("queue", params.queue);
  appendPageParams(search, params.page, params.pageSize);
  const qs = search.toString();
  return apiGetAdminPage<AdminSupportTicket>(`/api/admin/support/tickets${qs ? `?${qs}` : ""}`);
}

export function getAdminSupportMessages(ticketId: number) {
  return apiGet<AdminSupportMessage[]>(`/api/admin/support/tickets/${ticketId}/messages`);
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
    await throwAdminMutationError(res, "p8.admin.api_errors.support_reply");
  }
}

export function assignAdminSupportTicket(id: number, staffId: number) {
  return postAdminWorkflow(`/api/admin/support/tickets/${id}/assign`, { staffId });
}

export function claimAdminSupportTicket(id: number) {
  return postAdminWorkflow(`/api/admin/support/tickets/${id}/claim`);
}

export function releaseAdminSupportTicket(id: number) {
  return postAdminWorkflow(`/api/admin/support/tickets/${id}/release`);
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

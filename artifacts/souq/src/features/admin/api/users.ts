import type { AdminUser, AdminUserDetails } from "../types";
import { apiUrl } from "@/lib/api-url";
import { appendPageParams, apiGet, apiGetAdminPage, getAdminMutationHeaders, throwAdminMutationError } from "./client";

export function getAdminUsers(params: {
  status?: string;
  q?: string;
  avatarReview?: string;
  page?: number;
  pageSize?: number;
}) {
  const search = new URLSearchParams();
  if (params.status && params.status !== "all") search.set("status", params.status);
  if (params.q?.trim()) search.set("q", params.q.trim());
  if (params.avatarReview?.trim()) search.set("avatarReview", params.avatarReview.trim());
  appendPageParams(search, params.page, params.pageSize);
  const qs = search.toString();
  return apiGetAdminPage<AdminUser>(`/api/admin/users${qs ? `?${qs}` : ""}`);
}

export async function reviewAdminUserAvatar(
  id: number,
  decision: "approve" | "reject",
  reason?: string,
) {
  const res = await fetch(apiUrl(`/api/admin/users/${id}/avatar-review`), {
    method: "PATCH",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
    body: JSON.stringify({ decision, ...(reason ? { reason } : {}) }),
  });
  if (!res.ok) {
    await throwAdminMutationError(res, "p8.admin.api_errors.user_avatar_review");
  }
  return res.json();
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
    await throwAdminMutationError(res, "p8.admin.api_errors.user_status");
  }
}

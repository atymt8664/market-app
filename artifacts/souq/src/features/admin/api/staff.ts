import { apiUrl } from "@/lib/api-url";
import { t } from "@/i18n";
import { appendPageParams, apiGet, apiGetAdminPage, getAdminMutationHeaders } from "./client";

export function getAdminStaffList(params?: { page?: number; pageSize?: number }, signal?: AbortSignal) {
  const search = new URLSearchParams();
  appendPageParams(search, params?.page, params?.pageSize);
  const qs = search.toString();
  return apiGetAdminPage<import("../types").AdminStaffListItem>(
    `/api/admin/staff${qs ? `?${qs}` : ""}`,
    signal,
  );
}

export function getAdminStaffMeta(signal?: AbortSignal) {
  return apiGet<import("../types").AdminStaffMetaResponse>("/api/admin/staff/meta", signal);
}

export function getAdminStaffDetail(id: number, signal?: AbortSignal) {
  return apiGet<import("../types").AdminStaffDetailResponse>(`/api/admin/staff/${id}`, signal);
}

export async function createAdminStaffMember(payload: {
  displayName: string;
  roleKey: import("../rbac").AdminRoleKey;
  departmentKey: import("../rbac").AdminDepartmentKey;
  loginEmail?: string;
}) {
  const body: Record<string, string> = {
    displayName: payload.displayName,
    roleKey: payload.roleKey,
    departmentKey: payload.departmentKey,
  };
  if (payload.loginEmail?.trim()) {
    body.loginEmail = payload.loginEmail.trim();
  }
  const res = await fetch(apiUrl("/api/admin/staff"), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(typeof body?.error === "string" ? body.error : t("p8.admin.api_errors.staff_create"));
  }
  return res.json() as Promise<import("../types").AdminStaffCreateResponse>;
}

export async function updateAdminStaffMember(
  id: number,
  payload: {
    displayName?: string;
    roleKey?: import("../rbac").AdminRoleKey;
    departmentKey?: import("../rbac").AdminDepartmentKey;
    status?: import("../types").AdminStaffStatus;
  },
) {
  const res = await fetch(apiUrl(`/api/admin/staff/${id}`), {
    method: "PATCH",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(typeof body?.error === "string" ? body.error : t("p8.admin.api_errors.staff_update"));
  }
  return res.json() as Promise<import("../types").AdminStaffListItem>;
}

export async function revokeAdminStaffMemberSessions(id: number) {
  const res = await fetch(apiUrl(`/api/admin/staff/${id}/revoke-sessions`), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(typeof body?.error === "string" ? body.error : t("p8.admin.api_errors.staff_revoke_sessions"));
  }
  return res.json() as Promise<{ ok: boolean; revoked: number }>;
}

export async function changeAdminStaffInitialPassword(payload: {
  newPassword: string;
  confirmPassword: string;
}) {
  const res = await fetch(apiUrl("/api/admin/staff/change-initial-password"), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(typeof body?.error === "string" ? body.error : t("p8.admin.api_errors.staff_password"));
  }
  return res.json() as Promise<{ ok: boolean }>;
}

import { mapAdminApiError } from "../admin-error-messages";
import { apiUrl } from "@/lib/api-url";
import { appendPageParams, apiGet, apiGetAdminPage, getAdminMutationHeaders, postAdminWorkflow, throwAdminMutationError } from "./client";

export function getAdminVerificationStats(signal?: AbortSignal) {
  return apiGet<import("../types").VerificationStats>("/api/admin/verification/stats", signal);
}

export function getAdminVerificationRequests(
  params?: { queue?: string; status?: string; page?: number; pageSize?: number },
  signal?: AbortSignal,
) {
  const search = new URLSearchParams();
  if (params?.queue && params.queue !== "all") search.set("queue", params.queue);
  if (params?.status && params.status !== "all") search.set("status", params.status);
  appendPageParams(search, params?.page, params?.pageSize);
  const qs = search.toString();
  return apiGetAdminPage<import("../types").VerificationRequest>(
    `/api/admin/verification/requests${qs ? `?${qs}` : ""}`,
    signal,
  );
}

export function getAdminVerificationRequestDetail(id: number, signal?: AbortSignal) {
  return apiGet<import("../types").VerificationRequestDetail>(`/api/admin/verification/requests/${id}`, signal);
}

async function postAdminVerificationWorkflow(path: string, body?: Record<string, unknown>) {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    parsed = {};
  }
  if (!res.ok) {
    throw new Error(
      mapAdminApiError(res.status, {
        error: typeof parsed.error === "string" ? parsed.error : undefined,
        code: typeof parsed.code === "string" ? parsed.code : undefined,
        title: typeof parsed.title === "string" ? parsed.title : undefined,
        description: typeof parsed.description === "string" ? parsed.description : undefined,
      }),
    );
  }
  return parsed;
}

export function assignAdminVerificationRequest(id: number, staffId: number) {
  return postAdminWorkflow(`/api/admin/verification/requests/${id}/assign`, { staffId });
}

export function claimAdminVerificationRequest(id: number) {
  return postAdminVerificationWorkflow(`/api/admin/verification/requests/${id}/claim`);
}

export function releaseAdminVerificationRequest(id: number) {
  return postAdminVerificationWorkflow(`/api/admin/verification/requests/${id}/release`);
}

export function escalateAdminVerificationRequest(id: number, note?: string) {
  return postAdminVerificationWorkflow(`/api/admin/verification/requests/${id}/escalate`, { note });
}

export async function updateAdminVerificationStatus(
  id: number,
  status: import("../types").VerificationRequestStatus,
  payload?: { reason?: string; notes?: string },
) {
  const res = await fetch(apiUrl(`/api/admin/verification/requests/${id}/status`), {
    method: "PATCH",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
    body: JSON.stringify({ status, ...payload }),
  });
  if (!res.ok) {
    await throwAdminMutationError(res, "p8.admin.api_errors.verification_update");
  }
  return res.json() as Promise<import("../types").VerificationRequestDetail>;
}

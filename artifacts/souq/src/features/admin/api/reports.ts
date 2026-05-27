import type { AdminReport } from "../types";
import { apiUrl } from "@/lib/api-url";
import { appendPageParams, apiGetAdminPage, getAdminMutationHeaders, postAdminWorkflow, throwAdminMutationError } from "./client";

export function getAdminReports(
  params?: { queue?: string; page?: number; pageSize?: number },
  signal?: AbortSignal,
) {
  const search = new URLSearchParams();
  if (params?.queue) search.set("queue", params.queue);
  appendPageParams(search, params?.page, params?.pageSize);
  const qs = search.toString();
  return apiGetAdminPage<AdminReport>(`/api/admin/reports${qs ? `?${qs}` : ""}`, signal);
}

export async function updateAdminReportStatus(
  id: number,
  status: "open" | "under_review" | "resolved" | "rejected",
  reason?: string,
) {
  const res = await fetch(apiUrl(`/api/admin/reports/${id}/status`), {
    method: "PATCH",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
    body: JSON.stringify({ status, ...(reason ? { reason } : {}) }),
  });
  if (!res.ok) {
    await throwAdminMutationError(res, "p8.admin.api_errors.report_status");
  }
}

export async function moderateReportedAd(id: number, action: "hide" | "delete", reason: string) {
  const res = await fetch(apiUrl(`/api/admin/reports/${id}/ad-action`), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
    body: JSON.stringify({ action, reason }),
  });
  if (!res.ok) {
    await throwAdminMutationError(res, "p8.admin.api_errors.report_ad_action");
  }
}

export function assignAdminReport(id: number, staffId: number) {
  return postAdminWorkflow(`/api/admin/reports/${id}/assign`, { staffId });
}

export function claimAdminReport(id: number) {
  return postAdminWorkflow(`/api/admin/reports/${id}/claim`);
}

export function releaseAdminReport(id: number) {
  return postAdminWorkflow(`/api/admin/reports/${id}/release`);
}

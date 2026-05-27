import type { AdminAd } from "../types";
import { apiUrl } from "@/lib/api-url";
import { t } from "@/i18n";
import { appendPageParams, apiGetAdminPage, getAdminMutationHeaders, postAdminWorkflow, throwAdminMutationError } from "./client";

export async function getAdminAds(params: {
  status?: string;
  q?: string;
  queue?: string;
  featured?: "all" | "true" | "false";
  page?: number;
  pageSize?: number;
}) {
  const search = new URLSearchParams();
  if (params.status && params.status !== "all") search.set("status", params.status);
  if (params.q?.trim()) search.set("q", params.q.trim());
  if (params.queue && params.queue !== "all") search.set("queue", params.queue);
  if (params.featured === "true") search.set("featured", "true");
  if (params.featured === "false") search.set("featured", "false");
  appendPageParams(search, params.page, params.pageSize);
  const qs = search.toString();
  return apiGetAdminPage<AdminAd>(`/api/admin/ads${qs ? `?${qs}` : ""}`);
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
        : text?.trim() || t("p8.admin.api_errors.ad_featured");
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
  reason?: string,
) {
  const res = await fetch(apiUrl(`/api/admin/ads/${id}/status`), {
    method: "PATCH",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
    body: JSON.stringify({ status, ...(reason ? { reason } : {}) }),
  });
  const text = await res.text();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    parsed = {};
  }
  if (!res.ok) {
    const msg =
      typeof parsed.error === "string" && parsed.error.trim()
        ? parsed.error
        : text?.trim() || t("p8.admin.api_errors.ad_status");
    throw new Error(msg);
  }
  return parsed;
}

export async function deleteAdminAd(id: number) {
  const res = await fetch(apiUrl(`/api/admin/ads/${id}`), {
    method: "DELETE",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
  });
  if (!res.ok) {
    await throwAdminMutationError(res, "p8.admin.api_errors.ad_delete");
  }
}

export function assignAdminAd(id: number, staffId: number) {
  return postAdminWorkflow(`/api/admin/ads/${id}/assign`, { staffId });
}

export function claimAdminAd(id: number) {
  return postAdminWorkflow(`/api/admin/ads/${id}/claim`);
}

export function releaseAdminAd(id: number) {
  return postAdminWorkflow(`/api/admin/ads/${id}/release`);
}

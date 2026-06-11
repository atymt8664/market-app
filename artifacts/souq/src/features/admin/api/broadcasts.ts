import { apiUrl } from "@/lib/api-url";
import { apiGet, getAdminMutationHeaders, throwAdminMutationError } from "./client";

export type BroadcastCategory =
  | "platform_update"
  | "new_feature"
  | "scheduled_maintenance"
  | "security_alert"
  | "official_announcement";

export type BroadcastAudience = "all_users" | "test_audience";

export type BroadcastStatus =
  | "draft"
  | "sending"
  | "completed"
  | "failed"
  | "cancelled";

export type BroadcastPreview = {
  category: BroadcastCategory;
  notificationType: string;
  title: string;
  body: string;
  audience: BroadcastAudience;
  estimatedRecipients: number;
};

export type BroadcastRow = {
  id: number;
  category: BroadcastCategory;
  notificationType: string;
  title: string;
  body: string;
  audience: BroadcastAudience;
  status: BroadcastStatus;
  createdByAdminActorId: number;
  sentAt: string | null;
  completedAt: string | null;
  recipientCount: number;
  deliveredCount: number;
  failedCount: number;
  createdAt: string;
  confirmToken?: string;
};

export function getAdminBroadcasts(signal?: AbortSignal) {
  return apiGet<BroadcastRow[]>("/api/admin/broadcasts", signal);
}

export function getAdminBroadcastCategories(signal?: AbortSignal) {
  return apiGet<{ categories: BroadcastCategory[] }>(
    "/api/admin/broadcasts/categories",
    signal,
  );
}

export async function previewAdminBroadcast(body: {
  category: BroadcastCategory;
  title: string;
  body: string;
  audience: BroadcastAudience;
}): Promise<BroadcastPreview> {
  const res = await fetch(apiUrl("/api/admin/broadcasts/preview"), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    await throwAdminMutationError(res, "p8.admin.broadcasts.error.preview");
  }
  return res.json() as Promise<BroadcastPreview>;
}

export async function createAdminBroadcastDraft(body: {
  category: BroadcastCategory;
  title: string;
  body: string;
  audience: BroadcastAudience;
}): Promise<BroadcastRow> {
  const res = await fetch(apiUrl("/api/admin/broadcasts"), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    await throwAdminMutationError(res, "p8.admin.broadcasts.error.create");
  }
  return res.json() as Promise<BroadcastRow>;
}

export async function sendAdminBroadcast(
  id: number,
  confirmToken: string,
): Promise<BroadcastRow> {
  const res = await fetch(apiUrl(`/api/admin/broadcasts/${id}/send`), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
    body: JSON.stringify({ confirmToken }),
  });
  if (!res.ok) {
    await throwAdminMutationError(res, "p8.admin.broadcasts.error.send");
  }
  return res.json() as Promise<BroadcastRow>;
}

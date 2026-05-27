import type { AdminActivityLog } from "../types";
import { appendPageParams, apiGetAdminPage } from "./client";

export async function getAdminLogs(params: {
  actionType?: string;
  targetType?: string;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
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
  appendPageParams(search, params.page, params.pageSize);
  const qs = search.toString();
  return apiGetAdminPage<AdminActivityLog>(`/api/admin/logs${qs ? `?${qs}` : ""}`);
}

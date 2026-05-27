import type { AdminDashboardResponse, AdminStatsPeriod, AdminStatsResponse } from "../types";
import { apiGet } from "./client";
import { getAdminVerificationStats } from "./verification";

export function getAdminActiveAppUsersCount(signal?: AbortSignal) {
  return apiGet<{ count: number }>("/api/admin/active-app-users-count", signal);
}

export function getAdminDashboard(signal?: AbortSignal) {
  return apiGet<AdminDashboardResponse>("/api/admin/dashboard", signal);
}

export type AdminNavBadges = {
  adsPendingReview: number;
  reportsOpen: number;
  supportOpen: number;
  usersNewToday: number;
  verificationOpen: number;
};

/** Lightweight badge snapshot — one fetch per shell mount, no polling (P8M-1). */
export async function getAdminNavBadges(signal?: AbortSignal): Promise<AdminNavBadges> {
  const [dash, verificationStats] = await Promise.all([
    getAdminDashboard(signal),
    getAdminVerificationStats(signal).catch(() => null),
  ]);
  return {
    adsPendingReview: Number(dash.badges?.adsPendingReview ?? dash.highlights?.adsPendingReview ?? 0),
    reportsOpen: Number(dash.badges?.reportsOpen ?? dash.highlights?.reportsNew ?? 0),
    supportOpen: Number(dash.badges?.supportOpen ?? dash.highlights?.supportOpen ?? 0),
    usersNewToday: Number(dash.badges?.usersNewToday ?? 0),
    verificationOpen: Number(verificationStats?.unassigned ?? dash.badges?.verificationOpen ?? 0),
  };
}

export function getAdminOpsSummary(signal?: AbortSignal) {
  return apiGet<import("../operations-queue-types").OpsQueueSummaryView>("/api/admin/operations/summary", signal);
}

export function getAdminOpsDomainCounts(domain: import("../operations-queue-types").OpsDomain, signal?: AbortSignal) {
  return apiGet<import("../operations-queue-types").DomainQueueCountsView>(
    `/api/admin/operations/queues/${domain}`,
    signal,
  );
}

export function getAdminReportsStats(signal?: AbortSignal) {
  return apiGet<import("../operations-queue-types").DomainQueueCountsView>("/api/admin/reports/stats", signal);
}

export function getAdminSupportStats(signal?: AbortSignal) {
  return apiGet<import("../operations-queue-types").DomainQueueCountsView>("/api/admin/support/stats", signal);
}

export function getAdminAdsStats(signal?: AbortSignal) {
  return apiGet<import("../operations-queue-types").DomainQueueCountsView>("/api/admin/ads/stats", signal);
}

export function getAdminFounderOperations(signal?: AbortSignal) {
  return apiGet<import("../operations-queue-types").FounderOperationsView>("/api/admin/operations/founder", signal);
}

export function getAdminMonitoring(signal?: AbortSignal) {
  return apiGet<import("../monitoring-types").AdminMonitoringResponse>("/api/admin/monitoring", signal);
}

export function getAdminStats(period: AdminStatsPeriod, signal?: AbortSignal) {
  const search = new URLSearchParams();
  if (period !== "all") search.set("period", period);
  const qs = search.toString();
  return apiGet<AdminStatsResponse>(`/api/admin/analytics${qs ? `?${qs}` : ""}`, signal);
}

import { officialNotificationContent } from "../communications";

export const REPORT_STATUSES = [
  "open",
  "under_review",
  "resolved",
  "rejected",
] as const;

export type ReportStatus = (typeof REPORT_STATUSES)[number];

const LEGACY_STATUS_MAP: Record<string, ReportStatus> = {
  pending: "open",
  in_review: "under_review",
  reviewing: "under_review",
  ignored: "rejected",
  dismissed: "rejected",
};

export function normalizeReportStatus(raw: string | null | undefined): ReportStatus | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  if ((REPORT_STATUSES as readonly string[]).includes(value)) {
    return value as ReportStatus;
  }
  return LEGACY_STATUS_MAP[value] ?? null;
}

export function isAllowedReportStatus(status: string): status is ReportStatus {
  return normalizeReportStatus(status) !== null;
}

function officialReportPayload(
  type: "report.reviewing" | "report.resolved" | "report.rejected",
): { type: string; title: string; body: string } | null {
  const copy = officialNotificationContent({ type });
  if (!copy) return null;
  return { type, ...copy };
}

export function reportStatusNotificationPayload(
  status: string,
): { type: string; title: string; body: string } | null {
  const normalized = normalizeReportStatus(status);
  if (normalized === "under_review") {
    return officialReportPayload("report.reviewing");
  }
  if (normalized === "resolved") {
    return officialReportPayload("report.resolved");
  }
  if (normalized === "rejected") {
    return officialReportPayload("report.rejected");
  }
  return null;
}

export function reportAdminActivityAction(status: ReportStatus): string {
  if (status === "resolved") return "report.resolve";
  if (status === "under_review") return "report.review";
  if (status === "rejected") return "report.reject";
  return "report.update_status";
}

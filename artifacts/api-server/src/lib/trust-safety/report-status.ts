import { officialNotificationContent } from "../communications";
import { ADMIN_RESPONSE_PRESETS } from "../communications/admin-presets";

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

/** Maps canonical admin preset text → reason-specific template suffix. */
const REPORT_PRESET_TEMPLATE_SUFFIX: Record<string, string> = {
  [ADMIN_RESPONSE_PRESETS.reports[0]]: "action_taken",
  [ADMIN_RESPONSE_PRESETS.reports[1]]: "content_removed",
  [ADMIN_RESPONSE_PRESETS.reports[2]]: "user_warned",
  [ADMIN_RESPONSE_PRESETS.reports[3]]: "account_suspended",
  [ADMIN_RESPONSE_PRESETS.reports[4]]: "no_violation",
  [ADMIN_RESPONSE_PRESETS.reports[5]]: "report_closed",
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

function resolveReportClosureTemplateType(
  status: "resolved" | "rejected",
  reason: string,
): string {
  const trimmed = reason.trim();
  const suffix = REPORT_PRESET_TEMPLATE_SUFFIX[trimmed] ?? "custom";
  return `report.${status}.${suffix}`;
}

export function reportStatusNotificationPayload(
  status: string,
  reason?: string | null,
): { type: string; title: string; body: string } | null {
  const normalized = normalizeReportStatus(status);
  if (normalized === "under_review") {
    return officialReportPayload("report.reviewing");
  }
  if (normalized === "resolved" || normalized === "rejected") {
    const trimmedReason = reason?.trim();
    if (trimmedReason) {
      const templateType = resolveReportClosureTemplateType(normalized, trimmedReason);
      const copy = officialNotificationContent({
        type: templateType,
        reason: trimmedReason,
      });
      if (copy) {
        return { type: `report.${normalized}`, ...copy };
      }
    }
    return officialReportPayload(`report.${normalized}`);
  }
  return null;
}

export function reportAdminActivityAction(status: ReportStatus): string {
  if (status === "resolved") return "report.resolve";
  if (status === "under_review") return "report.review";
  if (status === "rejected") return "report.reject";
  return "report.update_status";
}

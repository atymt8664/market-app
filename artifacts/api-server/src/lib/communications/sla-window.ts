import type { SlaProfile } from "../admin-operations-sla";
import {
  resolveAdSlaProfile,
  resolveReportSlaProfile,
  resolveSupportSlaProfile,
  resolveVerificationSlaProfile,
} from "../admin-operations-sla";

function formatMinutesLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (rem === 0) return hours === 1 ? "ساعة واحدة" : `${hours} ساعات`;
  return `${hours} ساعة و${rem} دقيقة`;
}

/** Renders SLA window from profile — no hardcoded SLA numbers in templates. */
export function formatSlaWindow(profile: SlaProfile): string {
  if (profile.minMinutes === profile.maxMinutes) {
    return formatMinutesLabel(profile.maxMinutes);
  }
  return `من ${formatMinutesLabel(profile.minMinutes)} إلى ${formatMinutesLabel(profile.maxMinutes)}`;
}

const SLA_PLACEHOLDER = "{{sla_window}}";

export function applySlaWindow(body: string, slaWindow: string | null | undefined): string {
  if (!body.includes(SLA_PLACEHOLDER)) return body;
  const value = slaWindow?.trim() || SLA_PLACEHOLDER;
  return body.split(SLA_PLACEHOLDER).join(value);
}

export function resolveSlaProfileForNotificationType(
  type: string,
  context?: {
    ad?: { status: string; createdAt: Date; updatedAt: Date | null };
    reportReason?: string | null;
    support?: { category?: string | null; priority?: string | null };
    isUrgent?: boolean;
  },
): SlaProfile | null {
  const n = type.trim().toLowerCase();
  if (n === "ad.pending_review" && context?.ad) {
    return resolveAdSlaProfile(context.ad);
  }
  if (n === "report.received") {
    return resolveReportSlaProfile(context?.reportReason, context?.isUrgent === true);
  }
  if (n === "support.ticket.created" && context?.support) {
    return resolveSupportSlaProfile(context.support.category, context.support.priority);
  }
  if (n === "verification.needs_info") {
    return resolveVerificationSlaProfile(context?.isUrgent === true);
  }
  return null;
}

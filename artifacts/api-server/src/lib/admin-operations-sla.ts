export type OpsDomain = "verification" | "reports" | "support" | "ads";

export type SlaState = "within" | "approaching" | "exceeded";

export type SlaProfileKey =
  | "normal"
  | "urgent"
  | "fraud"
  | "spam"
  | "login"
  | "inquiry"
  | "new"
  | "edit"
  | "default";

export type SlaProfile = {
  key: SlaProfileKey;
  labelKey: string;
  minMinutes: number;
  maxMinutes: number;
  approachingRatio: number;
};

const SLA_PROFILES: Record<SlaProfileKey, SlaProfile> = {
  normal: { key: "normal", labelKey: "p8i.sla.normal", minMinutes: 60, maxMinutes: 360, approachingRatio: 0.75 },
  urgent: { key: "urgent", labelKey: "p8i.sla.urgent", minMinutes: 30, maxMinutes: 60, approachingRatio: 0.75 },
  fraud: { key: "fraud", labelKey: "p8i.sla.fraud", minMinutes: 5, maxMinutes: 30, approachingRatio: 0.75 },
  spam: { key: "spam", labelKey: "p8i.sla.spam", minMinutes: 60, maxMinutes: 360, approachingRatio: 0.75 },
  login: { key: "login", labelKey: "p8i.sla.login", minMinutes: 10, maxMinutes: 60, approachingRatio: 0.75 },
  inquiry: { key: "inquiry", labelKey: "p8i.sla.inquiry", minMinutes: 60, maxMinutes: 1440, approachingRatio: 0.75 },
  new: { key: "new", labelKey: "p8i.sla.ad_new", minMinutes: 5, maxMinutes: 30, approachingRatio: 0.75 },
  edit: { key: "edit", labelKey: "p8i.sla.ad_edit", minMinutes: 5, maxMinutes: 15, approachingRatio: 0.75 },
  default: { key: "default", labelKey: "p8i.sla.default", minMinutes: 60, maxMinutes: 360, approachingRatio: 0.75 },
};

export const OPS_QUEUE_KEYS = [
  "all",
  "unassigned",
  "mine",
  "urgent",
  "escalation",
  "sla_exceeded",
  "sla_within",
  "sla_approaching",
] as const;

export type OpsQueueKey = (typeof OPS_QUEUE_KEYS)[number];

export function isOpsQueueKey(value: string): value is OpsQueueKey {
  return (OPS_QUEUE_KEYS as readonly string[]).includes(value);
}

export function resolveVerificationSlaProfile(isUrgent: boolean): SlaProfile {
  return isUrgent ? SLA_PROFILES.urgent : SLA_PROFILES.normal;
}

export function resolveReportSlaProfile(reason: string | null | undefined, isUrgent: boolean): SlaProfile {
  if (isUrgent) return SLA_PROFILES.urgent;
  const raw = String(reason || "").toLowerCase();
  if (raw.includes("fraud") || raw.includes("scam") || raw.includes("احتيال") || raw.includes("نصب")) {
    return SLA_PROFILES.fraud;
  }
  if (raw.includes("spam") || raw.includes("duplicate") || raw.includes("مكرر")) {
    return SLA_PROFILES.spam;
  }
  return SLA_PROFILES.default;
}

export function resolveSupportSlaProfile(category: string | null | undefined, priority: string | null | undefined): SlaProfile {
  const cat = String(category || "").toLowerCase();
  const pri = String(priority || "").toLowerCase();
  if (pri === "urgent") return SLA_PROFILES.urgent;
  if (cat.includes("login") || cat.includes("auth") || cat.includes("دخول") || cat.includes("password")) {
    return SLA_PROFILES.login;
  }
  if (cat.includes("inquiry") || cat.includes("general") || cat.includes("استفسار")) {
    return SLA_PROFILES.inquiry;
  }
  return SLA_PROFILES.default;
}

export function resolveAdSlaProfile(params: {
  status: string;
  createdAt: Date;
  updatedAt: Date | null;
}): SlaProfile {
  const updated = params.updatedAt ?? params.createdAt;
  const isEdit = updated.getTime() - params.createdAt.getTime() > 2 * 60 * 1000;
  if (params.status === "pending" && isEdit) return SLA_PROFILES.edit;
  return SLA_PROFILES.new;
}

export function computeSlaDueAt(createdAt: Date, profile: SlaProfile): Date {
  return new Date(createdAt.getTime() + profile.maxMinutes * 60 * 1000);
}

export function computeSlaState(params: {
  createdAt: Date;
  slaDueAt: Date | null;
  profile: SlaProfile;
  now?: Date;
  isTerminal?: boolean;
}): SlaState {
  if (params.isTerminal) return "within";
  const now = params.now ?? new Date();
  const dueAt =
    params.slaDueAt ?? computeSlaDueAt(params.createdAt, params.profile);
  if (now.getTime() >= dueAt.getTime()) return "exceeded";
  const windowMs = params.profile.maxMinutes * 60 * 1000;
  const elapsedMs = now.getTime() - params.createdAt.getTime();
  if (elapsedMs >= windowMs * params.profile.approachingRatio) return "approaching";
  return "within";
}

export function slaStateLabelKey(state: SlaState): string {
  if (state === "exceeded") return "p8i.sla.state.exceeded";
  if (state === "approaching") return "p8i.sla.state.approaching";
  return "p8i.sla.state.within";
}

export function slaProfileForDomain(
  domain: OpsDomain,
  row: Record<string, unknown>,
): SlaProfile {
  if (domain === "verification") {
    return resolveVerificationSlaProfile(Boolean(row.isUrgent ?? row.is_urgent));
  }
  if (domain === "reports") {
    return resolveReportSlaProfile(
      String(row.reason ?? ""),
      Boolean(row.isUrgent ?? row.is_urgent),
    );
  }
  if (domain === "support") {
    return resolveSupportSlaProfile(
      String(row.category ?? ""),
      String(row.priority ?? ""),
    );
  }
  return resolveAdSlaProfile({
    status: String(row.status ?? "pending"),
    createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(String(row.createdAt ?? row.created_at)),
    updatedAt:
      row.updatedAt instanceof Date
        ? row.updatedAt
        : row.updated_at
          ? new Date(String(row.updated_at))
          : null,
  });
}

export const STAFF_CLAIM_LIMITS: Record<string, number> = {
  verification: 15,
  moderator: 25,
  support: 20,
  analyst: 10,
  finance_manager: 10,
  admin_manager: 15,
  founder: 999,
};

export function maxOpenClaimsForRole(roleKey: string, isFounder: boolean): number {
  if (isFounder) return STAFF_CLAIM_LIMITS.founder;
  return STAFF_CLAIM_LIMITS[roleKey] ?? 15;
}

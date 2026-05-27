import { db, pool } from "@workspace/db";
import { sql } from "drizzle-orm";
import type { AdminStaffContext } from "./admin-rbac";
import { hasAdminPermission } from "./admin-rbac";
import { FOUNDER_ADMIN_ACTOR_ID } from "./admin-staff";
import { ensureStaffManagementSchema, listAdminStaff } from "./admin-staff-management";
import {
  computeSlaDueAt,
  computeSlaState,
  maxOpenClaimsForRole,
  slaProfileForDomain,
  type OpsDomain,
  type OpsQueueKey,
  type SlaState,
} from "./admin-operations-sla";
import { ensureVerificationSchema } from "./admin-verification-workflow";

let ensureOpsQueueSchemaPromise: Promise<void> | null = null;

const OPS_QUEUE_DDL = `
  ALTER TABLE reports ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN NOT NULL DEFAULT false;
  ALTER TABLE reports ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ NULL;
  ALTER TABLE reports ADD COLUMN IF NOT EXISTS escalated_by_admin_id INTEGER NULL;
  ALTER TABLE reports ADD COLUMN IF NOT EXISTS escalation_note TEXT NULL;
  ALTER TABLE reports ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMPTZ NULL;
  ALTER TABLE reports ADD COLUMN IF NOT EXISTS sla_auto_escalated_at TIMESTAMPTZ NULL;
  ALTER TABLE reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

  ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ NULL;
  ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS escalated_by_admin_id INTEGER NULL;
  ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS escalation_note TEXT NULL;
  ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMPTZ NULL;
  ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS sla_auto_escalated_at TIMESTAMPTZ NULL;

  ALTER TABLE ads ADD COLUMN IF NOT EXISTS assigned_staff_id INTEGER NULL;
  ALTER TABLE ads ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ NULL;
  ALTER TABLE ads ADD COLUMN IF NOT EXISTS assigned_by_admin_id INTEGER NULL;
  ALTER TABLE ads ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN NOT NULL DEFAULT false;
  ALTER TABLE ads ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ NULL;
  ALTER TABLE ads ADD COLUMN IF NOT EXISTS escalated_by_admin_id INTEGER NULL;
  ALTER TABLE ads ADD COLUMN IF NOT EXISTS escalation_note TEXT NULL;
  ALTER TABLE ads ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMPTZ NULL;
  ALTER TABLE ads ADD COLUMN IF NOT EXISTS sla_auto_escalated_at TIMESTAMPTZ NULL;
  ALTER TABLE ads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NULL;

  ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMPTZ NULL;
  ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS sla_auto_escalated_at TIMESTAMPTZ NULL;

  CREATE INDEX IF NOT EXISTS reports_sla_due_idx ON reports (sla_due_at) WHERE sla_due_at IS NOT NULL;
  CREATE INDEX IF NOT EXISTS reports_escalated_idx ON reports (escalated_at) WHERE escalated_at IS NOT NULL;
  CREATE INDEX IF NOT EXISTS support_tickets_sla_due_idx ON support_tickets (sla_due_at) WHERE sla_due_at IS NOT NULL;
  CREATE INDEX IF NOT EXISTS support_tickets_escalated_idx ON support_tickets (escalated_at) WHERE escalated_at IS NOT NULL;
  CREATE INDEX IF NOT EXISTS ads_assigned_staff_idx ON ads (assigned_staff_id);
  CREATE INDEX IF NOT EXISTS ads_sla_due_idx ON ads (sla_due_at) WHERE sla_due_at IS NOT NULL;
  CREATE INDEX IF NOT EXISTS verification_requests_sla_due_idx ON verification_requests (sla_due_at) WHERE sla_due_at IS NOT NULL;
`;

export async function ensureOpsQueueSchema(): Promise<void> {
  if (!ensureOpsQueueSchemaPromise) {
    ensureOpsQueueSchemaPromise = (async () => {
      await ensureStaffManagementSchema();
      await ensureVerificationSchema();
      await pool.query(OPS_QUEUE_DDL);
      await backfillMissingSlaDueDates();
    })().catch((err) => {
      ensureOpsQueueSchemaPromise = null;
      throw err;
    });
  }
  return ensureOpsQueueSchemaPromise;
}

async function backfillMissingSlaDueDates(): Promise<void> {
  await db.execute(sql`
    UPDATE verification_requests vr
    SET sla_due_at = vr.created_at + interval '6 hours'
    WHERE vr.sla_due_at IS NULL AND vr.status NOT IN ('approved', 'rejected')
  `);
  await db.execute(sql`
    UPDATE reports r
    SET sla_due_at = r.created_at + interval '6 hours'
    WHERE r.sla_due_at IS NULL AND r.status IN ('open', 'under_review', 'pending', 'in_review')
  `);
  await db.execute(sql`
    UPDATE support_tickets st
    SET sla_due_at = st.created_at + interval '4 hours'
    WHERE st.sla_due_at IS NULL AND st.status IN ('open', 'pending')
  `);
  await db.execute(sql`
    UPDATE ads a
    SET sla_due_at = a.created_at + interval '30 minutes',
        updated_at = COALESCE(a.updated_at, a.created_at)
    WHERE a.sla_due_at IS NULL AND a.status = 'pending'
  `);
}

const DOMAIN_OPEN_STATUSES: Record<OpsDomain, string[]> = {
  verification: ["pending", "under_review", "needs_info"],
  reports: ["open", "under_review", "pending", "in_review"],
  support: ["open", "pending"],
  ads: ["pending"],
};

const DOMAIN_TERMINAL_STATUSES: Record<OpsDomain, string[]> = {
  verification: ["approved", "rejected"],
  reports: ["resolved", "rejected", "ignored"],
  support: ["resolved", "closed"],
  ads: ["approved", "rejected", "hidden"],
};

export type DomainQueueCounts = {
  domain: OpsDomain;
  total: number;
  unassigned: number;
  mine: number;
  urgent: number;
  escalation: number;
  slaExceeded: number;
  slaWithin: number;
  slaApproaching: number;
};

export type OpsQueueSummary = {
  domains: DomainQueueCounts[];
  totals: Omit<DomainQueueCounts, "domain"> & { domain: "all" };
  generatedAt: string;
};

export type StaffLoadEntry = {
  adminActorId: number;
  displayName: string;
  roleKey: string;
  sessionStatus: string;
  openTotal: number;
  verification: number;
  reports: number;
  support: number;
  ads: number;
  slaExceeded: number;
  claimLimit: number;
  loadPercent: number;
  isOverloaded: boolean;
};

export type StaffLoadSnapshot = {
  staff: StaffLoadEntry[];
  bottlenecks: Array<{ domain: OpsDomain; unassigned: number; slaExceeded: number }>;
  generatedAt: string;
};

export type SuggestAssignResult = {
  staffId: number;
  displayName: string;
  roleKey: string;
  openTotal: number;
  claimLimit: number;
  reason: string;
};

function domainPermission(domain: OpsDomain): import("./admin-rbac").AdminPermissionArea {
  switch (domain) {
    case "verification":
      return "verification";
    case "reports":
      return "reports";
    case "support":
      return "support";
    case "ads":
      return "ads";
  }
}

export function canAccessOpsDomain(ctx: AdminStaffContext, domain: OpsDomain): boolean {
  if (ctx.isFounder) return true;
  return hasAdminPermission(ctx.roleKey, domainPermission(domain));
}

function openStatusSql(domain: OpsDomain, alias: string): ReturnType<typeof sql> {
  const statuses = DOMAIN_OPEN_STATUSES[domain];
  return sql`${sql.raw(alias)}.status IN (${sql.join(statuses.map((s) => sql`${s}`), sql`, `)})`;
}

function slaOpenFilter(alias: string, domain: OpsDomain): ReturnType<typeof sql> {
  return sql`${openStatusSql(domain, alias)} AND ${sql.raw(alias)}.sla_due_at IS NOT NULL`;
}

function buildQueueSql(
  domain: OpsDomain,
  queue: OpsQueueKey,
  actorId: number | null,
  alias: string,
): ReturnType<typeof sql> {
  const a = sql.raw(alias);
  const open = openStatusSql(domain, alias);

  switch (queue) {
    case "all":
      return open;
    case "unassigned":
      return sql`${open} AND ${a}.assigned_staff_id IS NULL`;
    case "mine":
      return actorId != null
        ? sql`${open} AND ${a}.assigned_staff_id = ${actorId}`
        : sql`FALSE`;
    case "urgent":
      if (domain === "support") {
        return sql`${open} AND (${a}.priority = 'urgent' OR ${a}.priority = 'high')`;
      }
      return sql`${open} AND ${a}.is_urgent = true`;
    case "escalation":
      return sql`${open} AND ${a}.escalated_at IS NOT NULL`;
    case "sla_exceeded":
      return sql`${slaOpenFilter(alias, domain)} AND ${a}.sla_due_at < NOW()`;
    case "sla_within":
      return sql`${slaOpenFilter(alias, domain)} AND ${a}.sla_due_at > NOW() AND NOW() < ${a}.created_at + ((${a}.sla_due_at - ${a}.created_at) * 0.75)`;
    case "sla_approaching":
      return sql`${slaOpenFilter(alias, domain)} AND ${a}.sla_due_at > NOW() AND NOW() >= ${a}.created_at + ((${a}.sla_due_at - ${a}.created_at) * 0.75)`;
    default:
      return open;
  }
}

async function countDomainQueue(
  domain: OpsDomain,
  queue: OpsQueueKey,
  actorId: number | null,
): Promise<number> {
  const table =
    domain === "verification"
      ? "verification_requests"
      : domain === "reports"
        ? "reports"
        : domain === "support"
          ? "support_tickets"
          : "ads";
  const alias = "t";
  const filter = buildQueueSql(domain, queue, actorId, alias);
  const rows = await db.execute<{ count: string }>(sql`
    SELECT COUNT(*)::text AS count FROM ${sql.raw(table)} ${sql.raw(alias)} WHERE ${filter}
  `);
  return Number(rows.rows[0]?.count ?? 0);
}

export async function getDomainQueueCounts(
  ctx: AdminStaffContext,
  domain: OpsDomain,
): Promise<DomainQueueCounts> {
  await ensureOpsQueueSchema();
  if (!canAccessOpsDomain(ctx, domain)) {
    return {
      domain,
      total: 0,
      unassigned: 0,
      mine: 0,
      urgent: 0,
      escalation: 0,
      slaExceeded: 0,
      slaWithin: 0,
      slaApproaching: 0,
    };
  }
  const actorId = ctx.actorAdminId;
  const [total, unassigned, mine, urgent, escalation, slaExceeded, slaWithin, slaApproaching] =
    await Promise.all([
      countDomainQueue(domain, "all", actorId),
      countDomainQueue(domain, "unassigned", actorId),
      countDomainQueue(domain, "mine", actorId),
      countDomainQueue(domain, "urgent", actorId),
      countDomainQueue(domain, "escalation", actorId),
      countDomainQueue(domain, "sla_exceeded", actorId),
      countDomainQueue(domain, "sla_within", actorId),
      countDomainQueue(domain, "sla_approaching", actorId),
    ]);
  return {
    domain,
    total,
    unassigned,
    mine,
    urgent,
    escalation,
    slaExceeded,
    slaWithin,
    slaApproaching,
  };
}

export async function getOpsQueueSummary(ctx: AdminStaffContext): Promise<OpsQueueSummary> {
  const domains: OpsDomain[] = ["verification", "reports", "support", "ads"];
  const visible = await Promise.all(
    domains.filter((d) => canAccessOpsDomain(ctx, d)).map((d) => getDomainQueueCounts(ctx, d)),
  );
  const totals = visible.reduce(
    (acc, row) => ({
      domain: "all" as const,
      total: acc.total + row.total,
      unassigned: acc.unassigned + row.unassigned,
      mine: acc.mine + row.mine,
      urgent: acc.urgent + row.urgent,
      escalation: acc.escalation + row.escalation,
      slaExceeded: acc.slaExceeded + row.slaExceeded,
      slaWithin: acc.slaWithin + row.slaWithin,
      slaApproaching: acc.slaApproaching + row.slaApproaching,
    }),
    {
      domain: "all" as const,
      total: 0,
      unassigned: 0,
      mine: 0,
      urgent: 0,
      escalation: 0,
      slaExceeded: 0,
      slaWithin: 0,
      slaApproaching: 0,
    },
  );
  return { domains: visible, totals, generatedAt: new Date().toISOString() };
}

export async function countStaffOpenItems(adminActorId: number): Promise<{
  total: number;
  verification: number;
  reports: number;
  support: number;
  ads: number;
  slaExceeded: number;
}> {
  await ensureOpsQueueSchema();
  const rows = await db.execute<{
    verification: string;
    reports: string;
    support: string;
    ads: string;
    sla_exceeded: string;
  }>(sql`
    SELECT
      (SELECT COUNT(*)::int FROM verification_requests WHERE assigned_staff_id = ${adminActorId} AND status NOT IN ('approved', 'rejected'))::text AS verification,
      (SELECT COUNT(*)::int FROM reports WHERE assigned_staff_id = ${adminActorId} AND status IN ('open', 'under_review', 'pending', 'in_review'))::text AS reports,
      (SELECT COUNT(*)::int FROM support_tickets WHERE assigned_staff_id = ${adminActorId} AND status IN ('open', 'pending'))::text AS support,
      (SELECT COUNT(*)::int FROM ads WHERE assigned_staff_id = ${adminActorId} AND status = 'pending')::text AS ads,
      (
        SELECT COUNT(*)::int FROM (
          SELECT id FROM verification_requests WHERE assigned_staff_id = ${adminActorId} AND status NOT IN ('approved','rejected') AND sla_due_at < NOW()
          UNION ALL
          SELECT id FROM reports WHERE assigned_staff_id = ${adminActorId} AND status IN ('open','under_review','pending','in_review') AND sla_due_at < NOW()
          UNION ALL
          SELECT id FROM support_tickets WHERE assigned_staff_id = ${adminActorId} AND status IN ('open','pending') AND sla_due_at < NOW()
          UNION ALL
          SELECT id FROM ads WHERE assigned_staff_id = ${adminActorId} AND status = 'pending' AND sla_due_at < NOW()
        ) x
      )::text AS sla_exceeded
  `);
  const row = rows.rows[0];
  const verification = Number(row?.verification ?? 0);
  const reports = Number(row?.reports ?? 0);
  const support = Number(row?.support ?? 0);
  const ads = Number(row?.ads ?? 0);
  const slaExceeded = Number(row?.sla_exceeded ?? 0);
  return { total: verification + reports + support + ads, verification, reports, support, ads, slaExceeded };
}

export async function assertStaffCanClaim(
  ctx: AdminStaffContext,
  domain: OpsDomain,
): Promise<void> {
  const actorId = ctx.actorAdminId ?? FOUNDER_ADMIN_ACTOR_ID;
  if (ctx.isFounder) return;
  const open = await countStaffOpenItems(actorId);
  const limit = maxOpenClaimsForRole(ctx.roleKey, ctx.isFounder);
  if (open.total >= limit) {
    throw new Error("STAFF_CLAIM_LIMIT_REACHED");
  }
  const domainOpen =
    domain === "verification"
      ? open.verification
      : domain === "reports"
        ? open.reports
        : domain === "support"
          ? open.support
          : open.ads;
  const domainLimit = Math.ceil(limit * 0.7);
  if (domainOpen >= domainLimit) {
    throw new Error("STAFF_DOMAIN_CLAIM_LIMIT_REACHED");
  }
}

export async function getStaffLoadSnapshot(ctx: AdminStaffContext): Promise<StaffLoadSnapshot> {
  await ensureOpsQueueSchema();
  const { items: staffList } = await listAdminStaff();
  const visibleStaff = ctx.isFounder
    ? staffList
    : staffList.filter((s) => s.adminActorId === ctx.actorAdminId);

  const staff: StaffLoadEntry[] = [];
  for (const member of visibleStaff) {
    const open = await countStaffOpenItems(member.adminActorId);
    const claimLimit = maxOpenClaimsForRole(member.roleKey, member.isFounder);
    const loadPercent = claimLimit > 0 ? Math.round((open.total / claimLimit) * 100) : 0;
    staff.push({
      adminActorId: member.adminActorId,
      displayName: member.displayName,
      roleKey: member.roleKey,
      sessionStatus: member.sessionStatus,
      openTotal: open.total,
      verification: open.verification,
      reports: open.reports,
      support: open.support,
      ads: open.ads,
      slaExceeded: open.slaExceeded,
      claimLimit,
      loadPercent,
      isOverloaded: open.total >= claimLimit,
    });
  }

  const domains: OpsDomain[] = ["verification", "reports", "support", "ads"];
  const bottlenecks = await Promise.all(
    domains.map(async (domain) => ({
      domain,
      unassigned: await countDomainQueue(domain, "unassigned", null),
      slaExceeded: await countDomainQueue(domain, "sla_exceeded", null),
    })),
  );

  return {
    staff: staff.sort((a, b) => b.openTotal - a.openTotal),
    bottlenecks: bottlenecks.filter((b) => b.unassigned > 0 || b.slaExceeded > 0),
    generatedAt: new Date().toISOString(),
  };
}

const DOMAIN_ROLE_MAP: Record<OpsDomain, string[]> = {
  verification: ["verification", "founder"],
  reports: ["moderator", "founder"],
  support: ["support", "founder"],
  ads: ["moderator", "founder"],
};

export async function suggestAssignStaff(params: {
  domain: OpsDomain;
  excludeStaffId?: number | null;
}): Promise<SuggestAssignResult | null> {
  await ensureOpsQueueSchema();
  const allowedRoles = DOMAIN_ROLE_MAP[params.domain];
  const { items: staffList } = await listAdminStaff();
  const candidates = staffList.filter(
    (s) =>
      s.isActive &&
      s.status === "active" &&
      (allowedRoles.includes(s.roleKey) || s.isFounder) &&
      s.adminActorId !== params.excludeStaffId,
  );
  if (!candidates.length) return null;

  let best: SuggestAssignResult | null = null;
  for (const candidate of candidates) {
    const open = await countStaffOpenItems(candidate.adminActorId);
    const claimLimit = maxOpenClaimsForRole(candidate.roleKey, candidate.isFounder);
    if (open.total >= claimLimit) continue;
    const entry: SuggestAssignResult = {
      staffId: candidate.adminActorId,
      displayName: candidate.displayName,
      roleKey: candidate.roleKey,
      openTotal: open.total,
      claimLimit,
      reason: candidate.sessionStatus === "online" ? "least_load_online" : "least_load",
    };
    if (!best || entry.openTotal < best.openTotal) best = entry;
  }
  return best;
}

export async function runAutoEscalationForDomain(domain: OpsDomain): Promise<number> {
  await ensureOpsQueueSchema();
  if (domain === "verification") {
    const result = await db.execute(sql`
      UPDATE verification_requests
      SET escalated_at = NOW(),
          escalated_by_admin_id = NULL,
          escalation_note = COALESCE(escalation_note, 'تصعيد تلقائي — تجاوز SLA'),
          sla_auto_escalated_at = NOW(),
          updated_at = NOW()
      WHERE sla_due_at IS NOT NULL
        AND sla_due_at < NOW()
        AND escalated_at IS NULL
        AND status NOT IN ('approved', 'rejected')
      RETURNING id
    `);
    return result.rows.length;
  }
  if (domain === "reports") {
    const result = await db.execute(sql`
      UPDATE reports
      SET escalated_at = NOW(),
          escalated_by_admin_id = NULL,
          escalation_note = COALESCE(escalation_note, 'تصعيد تلقائي — تجاوز SLA'),
          sla_auto_escalated_at = NOW(),
          updated_at = NOW()
      WHERE sla_due_at IS NOT NULL
        AND sla_due_at < NOW()
        AND escalated_at IS NULL
        AND status IN ('open', 'under_review', 'pending', 'in_review')
      RETURNING id
    `);
    return result.rows.length;
  }
  if (domain === "support") {
    const result = await db.execute(sql`
      UPDATE support_tickets
      SET escalated_at = NOW(),
          escalated_by_admin_id = NULL,
          escalation_note = COALESCE(escalation_note, 'تصعيد تلقائي — تجاوز SLA'),
          sla_auto_escalated_at = NOW(),
          updated_at = NOW()
      WHERE sla_due_at IS NOT NULL
        AND sla_due_at < NOW()
        AND escalated_at IS NULL
        AND status IN ('open', 'pending')
      RETURNING id
    `);
    return result.rows.length;
  }
  const result = await db.execute(sql`
    UPDATE ads
    SET escalated_at = NOW(),
        escalated_by_admin_id = NULL,
        escalation_note = COALESCE(escalation_note, 'تصعيد تلقائي — تجاوز SLA'),
        sla_auto_escalated_at = NOW(),
        updated_at = NOW()
    WHERE sla_due_at IS NOT NULL
      AND sla_due_at < NOW()
      AND escalated_at IS NULL
      AND status = 'pending'
    RETURNING id
  `);
  return result.rows.length;
}

export async function runAutoEscalationAll(): Promise<Record<OpsDomain, number>> {
  const domains: OpsDomain[] = ["verification", "reports", "support", "ads"];
  const out: Record<OpsDomain, number> = {
    verification: 0,
    reports: 0,
    support: 0,
    ads: 0,
  };
  for (const domain of domains) {
    out[domain] = await runAutoEscalationForDomain(domain);
  }
  return out;
}

export function mapSlaFields(params: {
  domain: OpsDomain;
  createdAt: Date | string;
  slaDueAt: Date | string | null;
  status: string;
  row: Record<string, unknown>;
}): { slaDueAt: string | null; slaState: SlaState; slaMinutesRemaining: number | null } {
  const createdAt =
    params.createdAt instanceof Date ? params.createdAt : new Date(params.createdAt);
  const slaDueRaw =
    params.slaDueAt == null
      ? null
      : params.slaDueAt instanceof Date
        ? params.slaDueAt
        : new Date(params.slaDueAt);
  const profile = slaProfileForDomain(params.domain, {
    ...params.row,
    createdAt,
    status: params.status,
  });
  const dueAt =
    slaDueRaw != null && !Number.isNaN(slaDueRaw.getTime())
      ? slaDueRaw
      : computeSlaDueAt(createdAt, profile);
  const isTerminal = DOMAIN_TERMINAL_STATUSES[params.domain].includes(params.status);
  const slaState = computeSlaState({
    createdAt,
    slaDueAt: dueAt,
    profile,
    isTerminal,
  });
  const remainingMs = isTerminal ? null : dueAt.getTime() - Date.now();
  return {
    slaDueAt: dueAt.toISOString(),
    slaState,
    slaMinutesRemaining:
      remainingMs == null ? null : Math.max(0, Math.round(remainingMs / 60000)),
  };
}

export { buildQueueSql, DOMAIN_OPEN_STATUSES };

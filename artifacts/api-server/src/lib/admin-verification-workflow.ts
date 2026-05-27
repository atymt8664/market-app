import { db, pool } from "@workspace/db";
import { sql } from "drizzle-orm";
import type { AdminStaffContext } from "./admin-rbac";
import { hasAdminPermission } from "./admin-rbac";
import {
  FOUNDER_ADMIN_ACTOR_ID,
  FOUNDER_DISPLAY_NAME,
  staffDisplayName,
} from "./admin-staff";
import {
  buildStaffAssignmentView,
  ensureStaffWorkflowSchema,
  type StaffAssignmentView,
} from "./admin-staff-workflow";
import { assertStaffCanClaim, buildQueueSql, mapSlaFields } from "./admin-operations-queue";
import { computeSlaDueAt, resolveVerificationSlaProfile } from "./admin-operations-sla";

let ensureVerificationSchemaPromise: Promise<void> | null = null;

export const VERIFICATION_TYPES = [
  "identity",
  "seller",
  "business",
  "phone",
  "email",
] as const;

export type VerificationType = (typeof VERIFICATION_TYPES)[number];

export const VERIFICATION_STATUSES = [
  "pending",
  "under_review",
  "approved",
  "rejected",
  "needs_info",
] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const TERMINAL_STATUSES: VerificationStatus[] = ["approved", "rejected"];

const VERIFICATION_DDL = `
  ALTER TABLE users ADD COLUMN IF NOT EXISTS account_verification_status TEXT NOT NULL DEFAULT 'unverified';

  CREATE TABLE IF NOT EXISTS verification_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    is_urgent BOOLEAN NOT NULL DEFAULT false,
    notes TEXT NULL,
    rejection_reason TEXT NULL,
    assigned_staff_id INTEGER NULL,
    assigned_at TIMESTAMPTZ NULL,
    assigned_by_admin_id INTEGER NULL,
    escalated_at TIMESTAMPTZ NULL,
    escalated_by_admin_id INTEGER NULL,
    escalation_note TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS verification_request_documents (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES verification_requests(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    url TEXT NOT NULL,
    label TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS verification_request_activity (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES verification_requests(id) ON DELETE CASCADE,
    actor_admin_id INTEGER NULL,
    action TEXT NOT NULL,
    details TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS verification_requests_user_idx ON verification_requests (user_id);
  CREATE INDEX IF NOT EXISTS verification_requests_status_idx ON verification_requests (status);
  CREATE INDEX IF NOT EXISTS verification_requests_assigned_staff_idx ON verification_requests (assigned_staff_id);
  CREATE INDEX IF NOT EXISTS verification_requests_escalated_idx ON verification_requests (escalated_at) WHERE escalated_at IS NOT NULL;
  CREATE INDEX IF NOT EXISTS verification_request_documents_request_idx ON verification_request_documents (request_id);
  CREATE INDEX IF NOT EXISTS verification_request_activity_request_idx ON verification_request_activity (request_id);
`;

export async function ensureVerificationSchema(): Promise<void> {
  if (!ensureVerificationSchemaPromise) {
    ensureVerificationSchemaPromise = (async () => {
      await ensureStaffWorkflowSchema();
      await pool.query(VERIFICATION_DDL);
    })().catch((error) => {
      ensureVerificationSchemaPromise = null;
      throw error;
    });
  }
  return ensureVerificationSchemaPromise;
}

export type VerificationRequestRow = {
  id: number;
  userId: number;
  userName: string | null;
  userEmail: string | null;
  userAvatarUrl: string | null;
  type: string;
  status: string;
  isUrgent: boolean;
  notes: string | null;
  rejectionReason: string | null;
  assignedStaffId: number | null;
  assignedAt: Date | null;
  assignedByAdminId: number | null;
  escalatedAt: Date | null;
  escalatedByAdminId: number | null;
  escalationNote: string | null;
  slaDueAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type VerificationDocumentRow = {
  id: number;
  kind: string;
  url: string;
  label: string | null;
  createdAt: Date;
};

export type VerificationActivityRow = {
  id: number;
  actorAdminId: number | null;
  actorName: string | null;
  action: string;
  details: string | null;
  createdAt: Date;
};

export type VerificationStats = {
  total: number;
  pendingReview: number;
  underReview: number;
  approved: number;
  rejected: number;
  unassigned: number;
  mine: number;
  urgent: number;
  escalation: number;
  slaExceeded: number;
  slaWithin: number;
  slaApproaching: number;
};

export function isVerificationType(value: string): value is VerificationType {
  return (VERIFICATION_TYPES as readonly string[]).includes(value);
}

export function isVerificationStatus(value: string): value is VerificationStatus {
  return (VERIFICATION_STATUSES as readonly string[]).includes(value);
}

export function isTerminalStatus(status: string): boolean {
  return TERMINAL_STATUSES.includes(status as VerificationStatus);
}

function hasElevatedVerificationAccess(ctx: AdminStaffContext): boolean {
  return ctx.isFounder || ctx.roleKey === "moderator";
}

export function canAccessVerificationArea(ctx: AdminStaffContext): boolean {
  if (ctx.isFounder) return true;
  if (hasAdminPermission(ctx.roleKey, "verification")) return true;
  if (ctx.roleKey === "moderator") return true;
  return false;
}

export function canViewVerificationRequest(
  ctx: AdminStaffContext,
  row: Pick<VerificationRequestRow, "assignedStaffId" | "escalatedAt" | "status">,
): boolean {
  if (!canAccessVerificationArea(ctx)) return false;
  if (ctx.isFounder) return true;
  if (ctx.roleKey === "moderator") {
    return row.escalatedAt != null && !isTerminalStatus(row.status);
  }
  if (ctx.roleKey === "verification") {
    const staffId = ctx.actorAdminId;
    if (row.assignedStaffId == null) return true;
    return staffId != null && row.assignedStaffId === staffId;
  }
  return hasAdminPermission(ctx.roleKey, "verification");
}

export function canActOnVerificationRequest(
  ctx: AdminStaffContext,
  row: Pick<VerificationRequestRow, "assignedStaffId" | "escalatedAt" | "status">,
): boolean {
  if (isTerminalStatus(row.status)) return false;
  if (ctx.isFounder) return true;
  if (ctx.roleKey === "moderator" && row.escalatedAt != null) return true;
  if (ctx.roleKey === "verification") {
    const staffId = ctx.actorAdminId;
    return staffId != null && row.assignedStaffId === staffId;
  }
  return false;
}

export function canClaimVerificationRequest(
  ctx: AdminStaffContext,
  row: Pick<VerificationRequestRow, "assignedStaffId" | "escalatedAt" | "status">,
): boolean {
  if (isTerminalStatus(row.status)) return false;
  if (ctx.isFounder) return true;
  if (ctx.roleKey === "moderator" && row.escalatedAt != null) {
    return row.assignedStaffId == null || hasElevatedVerificationAccess(ctx);
  }
  if (ctx.roleKey === "verification") {
    return row.assignedStaffId == null;
  }
  return false;
}

export function canAssignVerificationRequest(ctx: AdminStaffContext): boolean {
  return ctx.isFounder;
}

export function canEscalateVerificationRequest(
  ctx: AdminStaffContext,
  row: Pick<VerificationRequestRow, "assignedStaffId" | "escalatedAt" | "status">,
): boolean {
  if (isTerminalStatus(row.status) || row.escalatedAt != null) return false;
  if (ctx.isFounder) return true;
  if (ctx.roleKey === "verification") {
    const staffId = ctx.actorAdminId;
    return staffId != null && row.assignedStaffId === staffId;
  }
  return false;
}

async function fetchRequestRow(id: number): Promise<VerificationRequestRow | null> {
  const rows = await db.execute<{
    id: number;
    user_id: number;
    user_name: string | null;
    user_email: string | null;
    user_avatar_url: string | null;
    type: string;
    status: string;
    is_urgent: boolean;
    notes: string | null;
    rejection_reason: string | null;
    assigned_staff_id: number | null;
    assigned_at: Date | null;
    assigned_by_admin_id: number | null;
    escalated_at: Date | null;
    escalated_by_admin_id: number | null;
    escalation_note: string | null;
    sla_due_at: Date | null;
    created_at: Date;
    updated_at: Date;
  }>(sql`
    SELECT
      vr.id,
      vr.user_id,
      u.name AS user_name,
      u.email AS user_email,
      u.avatar_url AS user_avatar_url,
      vr.type,
      vr.status,
      vr.is_urgent,
      vr.notes,
      vr.rejection_reason,
      vr.assigned_staff_id,
      vr.assigned_at,
      vr.assigned_by_admin_id,
      vr.escalated_at,
      vr.escalated_by_admin_id,
      vr.escalation_note,
      vr.sla_due_at,
      vr.created_at,
      vr.updated_at
    FROM verification_requests vr
    JOIN users u ON u.id = vr.user_id
    WHERE vr.id = ${id}
    LIMIT 1
  `);
  const row = rows.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userEmail: row.user_email,
    userAvatarUrl: row.user_avatar_url,
    type: row.type,
    status: row.status,
    isUrgent: row.is_urgent,
    notes: row.notes,
    rejectionReason: row.rejection_reason,
    assignedStaffId: row.assigned_staff_id,
    assignedAt: row.assigned_at,
    assignedByAdminId: row.assigned_by_admin_id,
    escalatedAt: row.escalated_at,
    escalatedByAdminId: row.escalated_by_admin_id,
    escalationNote: row.escalation_note,
    slaDueAt: row.sla_due_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function logVerificationActivity(params: {
  requestId: number;
  actorAdminId: number | null;
  action: string;
  details?: string | null;
}): Promise<void> {
  await db.execute(sql`
    INSERT INTO verification_request_activity (request_id, actor_admin_id, action, details)
    VALUES (${params.requestId}, ${params.actorAdminId}, ${params.action}, ${params.details ?? null})
  `);
}

async function actorName(actorAdminId: number | null): Promise<string | null> {
  if (actorAdminId == null) return null;
  if (actorAdminId === FOUNDER_ADMIN_ACTOR_ID) return FOUNDER_DISPLAY_NAME;
  const rows = await db.execute<{ display_name: string }>(sql`
    SELECT display_name FROM admin_staff WHERE admin_actor_id = ${actorAdminId} LIMIT 1
  `);
  return rows.rows[0]?.display_name ?? staffDisplayName(actorAdminId);
}

function toIsoDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export async function mapVerificationRequest(row: VerificationRequestRow) {
  const assignment = await buildStaffAssignmentView({
    assignedStaffId: row.assignedStaffId,
    assignedAt: row.assignedAt,
    assignedByAdminId: row.assignedByAdminId,
  });
  let escalatedByName: string | null = null;
  if (row.escalatedByAdminId != null) {
    escalatedByName = await actorName(row.escalatedByAdminId);
  }
  return {
    id: row.id,
    userId: row.userId,
    userName: row.userName,
    userEmail: row.userEmail,
    userAvatarUrl: row.userAvatarUrl,
    type: row.type,
    status: row.status,
    isUrgent: row.isUrgent,
    notes: row.notes,
    rejectionReason: row.rejectionReason,
    assignment,
    escalatedAt: row.escalatedAt ? toIsoDate(row.escalatedAt) : null,
    escalatedByAdminId: row.escalatedByAdminId,
    escalatedByName,
    escalationNote: row.escalationNote,
    createdAt: toIsoDate(row.createdAt),
    updatedAt: toIsoDate(row.updatedAt),
    ...mapSlaFields({
      domain: "verification",
      createdAt: row.createdAt,
      slaDueAt: row.slaDueAt,
      status: row.status,
      row: { isUrgent: row.isUrgent },
    }),
  };
}

function buildVisibilityFilter(ctx: AdminStaffContext, actorId: number | null) {
  if (ctx.isFounder) return sql`TRUE`;
  if (ctx.roleKey === "moderator") {
    return sql`vr.escalated_at IS NOT NULL AND vr.status NOT IN ('approved', 'rejected')`;
  }
  if (ctx.roleKey === "verification" && actorId != null) {
    return sql`(vr.assigned_staff_id IS NULL OR vr.assigned_staff_id = ${actorId})`;
  }
  return sql`TRUE`;
}

function buildQueueFilter(queue: string | null, actorId: number | null) {
  if (!queue || queue === "all") return sql`TRUE`;
  const key = queue as import("./admin-operations-sla").OpsQueueKey;
  if (
    [
      "unassigned",
      "mine",
      "urgent",
      "escalation",
      "sla_exceeded",
      "sla_within",
      "sla_approaching",
    ].includes(key)
  ) {
    return buildQueueSql("verification", key, actorId, "vr");
  }
  return sql`TRUE`;
}

export async function getVerificationStats(ctx: AdminStaffContext): Promise<VerificationStats> {
  await ensureVerificationSchema();
  const actorId = ctx.actorAdminId;
  const visibility = buildVisibilityFilter(ctx, actorId);

  const rows = await db.execute<{
    total: string;
    pending_review: string;
    under_review: string;
    approved: string;
    rejected: string;
    unassigned: string;
    mine: string;
    urgent: string;
    escalation: string;
    sla_exceeded: string;
    sla_within: string;
    sla_approaching: string;
  }>(sql`
    SELECT
      COUNT(*)::text AS total,
      COUNT(*) FILTER (WHERE vr.status IN ('pending', 'needs_info'))::text AS pending_review,
      COUNT(*) FILTER (WHERE vr.status = 'under_review')::text AS under_review,
      COUNT(*) FILTER (WHERE vr.status = 'approved')::text AS approved,
      COUNT(*) FILTER (WHERE vr.status = 'rejected')::text AS rejected,
      COUNT(*) FILTER (
        WHERE vr.assigned_staff_id IS NULL AND vr.status IN ('pending', 'needs_info')
      )::text AS unassigned,
      COUNT(*) FILTER (
        WHERE vr.assigned_staff_id = ${actorId ?? -1} AND vr.status NOT IN ('approved', 'rejected')
      )::text AS mine,
      COUNT(*) FILTER (
        WHERE vr.is_urgent = true AND vr.status NOT IN ('approved', 'rejected')
      )::text AS urgent,
      COUNT(*) FILTER (
        WHERE vr.escalated_at IS NOT NULL AND vr.status NOT IN ('approved', 'rejected')
      )::text AS escalation,
      COUNT(*) FILTER (
        WHERE vr.status NOT IN ('approved', 'rejected') AND vr.sla_due_at IS NOT NULL AND vr.sla_due_at < NOW()
      )::text AS sla_exceeded,
      COUNT(*) FILTER (
        WHERE vr.status NOT IN ('approved', 'rejected') AND vr.sla_due_at IS NOT NULL
          AND vr.sla_due_at > NOW()
          AND NOW() < vr.created_at + ((vr.sla_due_at - vr.created_at) * 0.75)
      )::text AS sla_within,
      COUNT(*) FILTER (
        WHERE vr.status NOT IN ('approved', 'rejected') AND vr.sla_due_at IS NOT NULL
          AND vr.sla_due_at > NOW()
          AND NOW() >= vr.created_at + ((vr.sla_due_at - vr.created_at) * 0.75)
      )::text AS sla_approaching
    FROM verification_requests vr
    WHERE ${visibility}
  `);

  const row = rows.rows[0];
  return {
    total: Number(row?.total ?? 0),
    pendingReview: Number(row?.pending_review ?? 0),
    underReview: Number(row?.under_review ?? 0),
    approved: Number(row?.approved ?? 0),
    rejected: Number(row?.rejected ?? 0),
    unassigned: Number(row?.unassigned ?? 0),
    mine: Number(row?.mine ?? 0),
    urgent: Number(row?.urgent ?? 0),
    escalation: Number(row?.escalation ?? 0),
    slaExceeded: Number(row?.sla_exceeded ?? 0),
    slaWithin: Number(row?.sla_within ?? 0),
    slaApproaching: Number(row?.sla_approaching ?? 0),
  };
}

export async function listVerificationRequests(params: {
  ctx: AdminStaffContext;
  queue?: string | null;
  status?: string | null;
  limit?: number;
  offset?: number;
}): Promise<{
  items: Awaited<ReturnType<typeof mapVerificationRequest>>[];
  totalItems: number;
}> {
  await ensureVerificationSchema();
  const actorId = params.ctx.actorAdminId;
  const visibility = buildVisibilityFilter(params.ctx, actorId);
  const queueFilter = buildQueueFilter(params.queue ?? null, actorId);
  const statusFilter =
    params.status && isVerificationStatus(params.status)
      ? sql`vr.status = ${params.status}`
      : sql`TRUE`;
  const limit = Math.min(Math.max(params.limit ?? 200, 1), 500);
  const offset = Math.max(params.offset ?? 0, 0);

  const countRows = await db.execute<{ count: string }>(sql`
    SELECT COUNT(*)::text AS count
    FROM verification_requests vr
    JOIN users u ON u.id = vr.user_id
    WHERE ${visibility}
      AND ${queueFilter}
      AND ${statusFilter}
  `);
  const totalItems = Number(countRows.rows[0]?.count ?? 0);

  const rows = await db.execute<{
    id: number;
    user_id: number;
    user_name: string | null;
    user_email: string | null;
    user_avatar_url: string | null;
    type: string;
    status: string;
    is_urgent: boolean;
    notes: string | null;
    rejection_reason: string | null;
    assigned_staff_id: number | null;
    assigned_at: Date | null;
    assigned_by_admin_id: number | null;
    escalated_at: Date | null;
    escalated_by_admin_id: number | null;
    escalation_note: string | null;
    sla_due_at: Date | null;
    created_at: Date;
    updated_at: Date;
  }>(sql`
    SELECT
      vr.id,
      vr.user_id,
      u.name AS user_name,
      u.email AS user_email,
      u.avatar_url AS user_avatar_url,
      vr.type,
      vr.status,
      vr.is_urgent,
      vr.notes,
      vr.rejection_reason,
      vr.assigned_staff_id,
      vr.assigned_at,
      vr.assigned_by_admin_id,
      vr.escalated_at,
      vr.escalated_by_admin_id,
      vr.escalation_note,
      vr.sla_due_at,
      vr.created_at,
      vr.updated_at
    FROM verification_requests vr
    JOIN users u ON u.id = vr.user_id
    WHERE ${visibility}
      AND ${queueFilter}
      AND ${statusFilter}
    ORDER BY vr.is_urgent DESC, vr.created_at ASC, vr.id ASC
    LIMIT ${limit}
    OFFSET ${offset}
  `);

  const mapped: VerificationRequestRow[] = rows.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userEmail: row.user_email,
    userAvatarUrl: row.user_avatar_url,
    type: row.type,
    status: row.status,
    isUrgent: row.is_urgent,
    notes: row.notes,
    rejectionReason: row.rejection_reason,
    assignedStaffId: row.assigned_staff_id,
    assignedAt: row.assigned_at,
    assignedByAdminId: row.assigned_by_admin_id,
    escalatedAt: row.escalated_at,
    escalatedByAdminId: row.escalated_by_admin_id,
    escalationNote: row.escalation_note,
    slaDueAt: row.sla_due_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const items = await Promise.all(mapped.map((row) => mapVerificationRequest(row)));
  return { items, totalItems };
}

export async function getVerificationRequestDetail(params: {
  ctx: AdminStaffContext;
  id: number;
}) {
  await ensureVerificationSchema();
  const row = await fetchRequestRow(params.id);
  if (!row) return null;
  if (!canViewVerificationRequest(params.ctx, row)) return null;

  const docs = await db.execute<{
    id: number;
    kind: string;
    url: string;
    label: string | null;
    created_at: Date;
  }>(sql`
    SELECT id, kind, url, label, created_at
    FROM verification_request_documents
    WHERE request_id = ${params.id}
    ORDER BY id ASC
  `);

  const activityRows = await db.execute<{
    id: number;
    actor_admin_id: number | null;
    action: string;
    details: string | null;
    created_at: Date;
  }>(sql`
    SELECT id, actor_admin_id, action, details, created_at
    FROM verification_request_activity
    WHERE request_id = ${params.id}
    ORDER BY created_at DESC, id DESC
    LIMIT 100
  `);

  const activity: VerificationActivityRow[] = [];
  for (const item of activityRows.rows) {
    activity.push({
      id: item.id,
      actorAdminId: item.actor_admin_id,
      actorName: await actorName(item.actor_admin_id),
      action: item.action,
      details: item.details,
      createdAt: item.created_at,
    });
  }

  const request = await mapVerificationRequest(row);
  return {
    ...request,
    documents: docs.rows.map((doc) => ({
      id: doc.id,
      kind: doc.kind,
      url: doc.url,
      label: doc.label,
      createdAt: doc.created_at.toISOString(),
    })),
    activity: activity.map((item) => ({
      id: item.id,
      actorAdminId: item.actorAdminId,
      actorName: item.actorName,
      action: item.action,
      details: item.details,
      createdAt: item.createdAt.toISOString(),
    })),
  };
}

export async function claimVerificationRequest(params: {
  ctx: AdminStaffContext;
  id: number;
}): Promise<StaffAssignmentView | null> {
  await ensureVerificationSchema();
  const row = await fetchRequestRow(params.id);
  if (!row) return null;
  if (!canClaimVerificationRequest(params.ctx, row)) {
    throw new Error("RBAC_DENIED");
  }
  await assertStaffCanClaim(params.ctx, "verification");

  const staffId = params.ctx.actorAdminId ?? FOUNDER_ADMIN_ACTOR_ID;
  const now = new Date();
  const nextStatus = row.status === "pending" || row.status === "needs_info" ? "under_review" : row.status;

  await db.execute(sql`
    UPDATE verification_requests
    SET assigned_staff_id = ${staffId},
        assigned_at = ${now},
        assigned_by_admin_id = ${staffId},
        status = ${nextStatus},
        updated_at = ${now}
    WHERE id = ${params.id}
  `);

  await logVerificationActivity({
    requestId: params.id,
    actorAdminId: params.ctx.actorAdminId,
    action: "claim",
    details: `status=${nextStatus}`,
  });

  return buildStaffAssignmentView({
    assignedStaffId: staffId,
    assignedAt: now,
    assignedByAdminId: staffId,
  });
}

export async function assignVerificationRequest(params: {
  ctx: AdminStaffContext;
  id: number;
  staffId: number;
}): Promise<StaffAssignmentView | null> {
  await ensureVerificationSchema();
  if (!canAssignVerificationRequest(params.ctx)) {
    throw new Error("RBAC_DENIED");
  }

  const row = await fetchRequestRow(params.id);
  if (!row || isTerminalStatus(row.status)) return null;

  const now = new Date();
  const assignedBy = params.ctx.actorAdminId ?? FOUNDER_ADMIN_ACTOR_ID;
  const nextStatus = row.status === "pending" || row.status === "needs_info" ? "under_review" : row.status;

  await db.execute(sql`
    UPDATE verification_requests
    SET assigned_staff_id = ${params.staffId},
        assigned_at = ${now},
        assigned_by_admin_id = ${assignedBy},
        status = ${nextStatus},
        updated_at = ${now}
    WHERE id = ${params.id}
  `);

  await logVerificationActivity({
    requestId: params.id,
    actorAdminId: params.ctx.actorAdminId,
    action: "assign",
    details: `staffId=${params.staffId};status=${nextStatus}`,
  });

  return buildStaffAssignmentView({
    assignedStaffId: params.staffId,
    assignedAt: now,
    assignedByAdminId: assignedBy,
  });
}

export async function releaseVerificationRequest(params: {
  ctx: AdminStaffContext;
  id: number;
}): Promise<StaffAssignmentView | null> {
  await ensureVerificationSchema();
  const row = await fetchRequestRow(params.id);
  if (!row || isTerminalStatus(row.status)) return null;

  const actorId = params.ctx.actorAdminId;
  const canRelease =
    params.ctx.isFounder ||
    (params.ctx.roleKey === "verification" && actorId != null && row.assignedStaffId === actorId) ||
    (params.ctx.roleKey === "moderator" && row.escalatedAt != null);

  if (!canRelease) throw new Error("RBAC_DENIED");

  const now = new Date();
  const nextStatus = row.status === "under_review" ? "pending" : row.status;

  await db.execute(sql`
    UPDATE verification_requests
    SET assigned_staff_id = NULL,
        assigned_at = NULL,
        assigned_by_admin_id = NULL,
        status = ${nextStatus},
        updated_at = ${now}
    WHERE id = ${params.id}
  `);

  await logVerificationActivity({
    requestId: params.id,
    actorAdminId: params.ctx.actorAdminId,
    action: "release",
    details: `status=${nextStatus}`,
  });

  return buildStaffAssignmentView({
    assignedStaffId: null,
    assignedAt: null,
    assignedByAdminId: null,
  });
}

export async function escalateVerificationRequest(params: {
  ctx: AdminStaffContext;
  id: number;
  note?: string | null;
}): Promise<boolean> {
  await ensureVerificationSchema();
  const row = await fetchRequestRow(params.id);
  if (!row) return false;
  if (!canEscalateVerificationRequest(params.ctx, row)) {
    throw new Error("RBAC_DENIED");
  }

  const now = new Date();
  const actorId = params.ctx.actorAdminId ?? FOUNDER_ADMIN_ACTOR_ID;

  await db.execute(sql`
    UPDATE verification_requests
    SET escalated_at = ${now},
        escalated_by_admin_id = ${actorId},
        escalation_note = ${params.note?.trim() || null},
        updated_at = ${now}
    WHERE id = ${params.id}
  `);

  await logVerificationActivity({
    requestId: params.id,
    actorAdminId: params.ctx.actorAdminId,
    action: "escalate",
    details: params.note?.trim() || null,
  });

  return true;
}

export async function updateVerificationRequestStatus(params: {
  ctx: AdminStaffContext;
  id: number;
  status: VerificationStatus;
  reason?: string | null;
  notes?: string | null;
}): Promise<VerificationRequestRow | null> {
  await ensureVerificationSchema();
  const row = await fetchRequestRow(params.id);
  if (!row) return null;
  if (!canActOnVerificationRequest(params.ctx, row)) {
    throw new Error("RBAC_DENIED");
  }

  const now = new Date();
  const rejectionReason =
    params.status === "rejected" ? params.reason?.trim() || null : row.rejectionReason;
  const notes = params.notes !== undefined ? params.notes?.trim() || null : row.notes;

  await db.execute(sql`
    UPDATE verification_requests
    SET status = ${params.status},
        rejection_reason = ${rejectionReason},
        notes = ${notes},
        updated_at = ${now}
    WHERE id = ${params.id}
  `);

  if (params.status === "approved") {
    await db.execute(sql`
      UPDATE users SET account_verification_status = 'verified' WHERE id = ${row.userId}
    `);
  } else if (params.status === "rejected") {
    await db.execute(sql`
      UPDATE users SET account_verification_status = 'rejected' WHERE id = ${row.userId}
    `);
  } else if (params.status === "needs_info") {
    await db.execute(sql`
      UPDATE users SET account_verification_status = 'pending' WHERE id = ${row.userId}
    `);
  }

  await logVerificationActivity({
    requestId: params.id,
    actorAdminId: params.ctx.actorAdminId,
    action: params.status,
    details: rejectionReason || notes || null,
  });

  return fetchRequestRow(params.id);
}

export async function countOpenVerificationRequests(): Promise<number> {
  await ensureVerificationSchema();
  const rows = await db.execute<{ count: string }>(sql`
    SELECT COUNT(*)::text AS count
    FROM verification_requests
    WHERE status NOT IN ('approved', 'rejected')
  `);
  return Number(rows.rows[0]?.count ?? 0);
}

export async function countPendingVerificationQueue(): Promise<number> {
  await ensureVerificationSchema();
  const rows = await db.execute<{ count: string }>(sql`
    SELECT COUNT(*)::text AS count
    FROM verification_requests
    WHERE assigned_staff_id IS NULL AND status IN ('pending', 'needs_info')
  `);
  return Number(rows.rows[0]?.count ?? 0);
}

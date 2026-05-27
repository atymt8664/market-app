import { db, pool } from "@workspace/db";
import { sql } from "drizzle-orm";
import {
  assertNotFounderStaffByActorId,
  FOUNDER_ADMIN_ACTOR_ID,
  FOUNDER_DISPLAY_NAME,
  isAssignableStaffRole,
  isAdminDepartmentKey,
  roleAllowedInDepartment,
  ROLE_DEFAULT_DEPARTMENT,
  type AdminDepartmentKey,
  type AdminRoleKey,
  type AdminStaffStatus,
} from "./admin-staff";
import {
  generateTemporaryStaffPassword,
  hashStaffPassword,
} from "./admin-staff-auth";
import { resolveUniqueStaffLoginEmail } from "./admin-staff-email";
import { ensureStaffWorkflowSchema } from "./admin-staff-workflow";

let ensureStaffManagementPromise: Promise<void> | null = null;

export type AdminStaffRow = {
  id: number;
  admin_actor_id: number;
  display_name: string;
  role_key: string;
  department_key: string;
  login_email: string | null;
  is_active: boolean;
  status: string;
  must_change_password: boolean;
  last_seen_at: Date | null;
  suspended_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type AdminStaffListItem = {
  id: number;
  adminActorId: number;
  displayName: string;
  roleKey: AdminRoleKey;
  departmentKey: AdminDepartmentKey;
  loginEmail: string | null;
  hasCredentialAccount: boolean;
  mustChangePassword: boolean;
  status: AdminStaffStatus;
  isActive: boolean;
  isFounder: boolean;
  lastSeenAt: string | null;
  createdAt: string;
  activeSessions: number;
  assignedItemsCount: number;
  operationsToday: number;
  reportsProcessedToday: number;
  ticketsProcessedToday: number;
  lastActivityAt: string | null;
  lastActivityAction: string | null;
  sessionStatus: "online" | "offline" | "suspended" | "disabled";
};

export type AdminStaffCreateResult = {
  staff: AdminStaffListItem;
  temporaryPassword: string;
};

const STAFF_MANAGEMENT_DDL = `
  ALTER TABLE admin_staff ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
  ALTER TABLE admin_staff ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NULL;
  ALTER TABLE admin_staff ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ NULL;
  ALTER TABLE admin_staff ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  ALTER TABLE admin_staff ADD COLUMN IF NOT EXISTS department_key TEXT NOT NULL DEFAULT 'administration';
  ALTER TABLE admin_staff ADD COLUMN IF NOT EXISTS login_email TEXT NULL;
  ALTER TABLE admin_staff ADD COLUMN IF NOT EXISTS password_hash TEXT NULL;
  ALTER TABLE admin_staff ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;
  ALTER TABLE admin_staff ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ NULL;
  ALTER TABLE admin_staff ADD COLUMN IF NOT EXISTS created_by_admin_actor_id INT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS admin_staff_login_email_unique_idx
    ON admin_staff (lower(login_email))
    WHERE login_email IS NOT NULL;
`;

export async function ensureStaffManagementSchema(): Promise<void> {
  await ensureStaffWorkflowSchema();
  if (!ensureStaffManagementPromise) {
    ensureStaffManagementPromise = pool
      .query(STAFF_MANAGEMENT_DDL)
      .then(() => undefined)
      .catch((error) => {
        ensureStaffManagementPromise = null;
        throw error;
      });
  }
  return ensureStaffManagementPromise;
}

export async function touchAdminStaffLastSeen(adminActorId: number | null): Promise<void> {
  if (adminActorId == null || adminActorId <= 0) return;
  await ensureStaffManagementSchema();
  await db.execute(sql`
    UPDATE admin_staff
    SET last_seen_at = NOW(), updated_at = NOW()
    WHERE admin_actor_id = ${adminActorId}
  `);
}

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

async function countActiveAdminSessions(adminActorId: number): Promise<number> {
  const rows = await db.execute<{ value: string }>(sql`
    SELECT COUNT(*)::text AS value
    FROM user_sessions
    WHERE expire > NOW()
      AND (sess::jsonb->>'isAdmin') = 'true'
      AND (sess::jsonb->>'adminActorId')::int = ${adminActorId}
  `);
  return Number(rows.rows[0]?.value ?? 0);
}

async function countAssignedItems(adminActorId: number): Promise<number> {
  const rows = await db.execute<{ value: string }>(sql`
    SELECT (
      (SELECT COUNT(*)::int FROM verification_requests WHERE assigned_staff_id = ${adminActorId} AND status NOT IN ('approved', 'rejected'))
      +
      (SELECT COUNT(*)::int FROM reports WHERE assigned_staff_id = ${adminActorId} AND status IN ('open', 'under_review', 'pending', 'in_review'))
      +
      (SELECT COUNT(*)::int FROM support_tickets WHERE assigned_staff_id = ${adminActorId} AND status IN ('open', 'pending'))
      +
      (SELECT COUNT(*)::int FROM ads WHERE assigned_staff_id = ${adminActorId} AND status = 'pending')
    )::text AS value
  `);
  return Number(rows.rows[0]?.value ?? 0);
}

function toIsoDate(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

async function fetchStaffActivityMetrics(adminActorId: number, startOfToday: Date) {
  const [opsRow, reportsRow, ticketsRow, lastRow] = await Promise.all([
    db.execute<{ value: string }>(sql`
      SELECT COUNT(*)::text AS value
      FROM admin_activity_logs
      WHERE actor_admin_id = ${adminActorId}
        AND created_at >= ${startOfToday}
    `),
    db.execute<{ value: string }>(sql`
      SELECT COUNT(*)::text AS value
      FROM admin_activity_logs
      WHERE actor_admin_id = ${adminActorId}
        AND created_at >= ${startOfToday}
        AND action IN ('report.open', 'report.under_review', 'report.resolve', 'report.reject', 'report.ad_action', 'report.claim', 'report.assign', 'report.release')
    `),
    db.execute<{ value: string }>(sql`
      SELECT COUNT(*)::text AS value
      FROM admin_activity_logs
      WHERE actor_admin_id = ${adminActorId}
        AND created_at >= ${startOfToday}
        AND action IN ('support.update', 'support.reply', 'support.claim', 'support.assign', 'support.release')
    `),
    db.execute<{ action: string; created_at: Date }>(sql`
      SELECT action, created_at
      FROM admin_activity_logs
      WHERE actor_admin_id = ${adminActorId}
      ORDER BY created_at DESC
      LIMIT 1
    `),
  ]);

  const last = lastRow.rows[0];
  return {
    operationsToday: Number(opsRow.rows[0]?.value ?? 0),
    reportsProcessedToday: Number(reportsRow.rows[0]?.value ?? 0),
    ticketsProcessedToday: Number(ticketsRow.rows[0]?.value ?? 0),
    lastActivityAt: last?.created_at ? toIsoDate(last.created_at) : null,
    lastActivityAction: last?.action ?? null,
  };
}

function resolveSessionStatus(
  row: AdminStaffRow,
  activeSessions: number,
): AdminStaffListItem["sessionStatus"] {
  const status = String(row.status || "active") as AdminStaffStatus;
  if (status === "disabled" || !row.is_active) return "disabled";
  if (status === "suspended") return "suspended";
  return activeSessions > 0 ? "online" : "offline";
}

async function mapStaffRow(row: AdminStaffRow): Promise<AdminStaffListItem> {
  const startOfToday = startOfTodayUtc();
  const adminActorId = row.admin_actor_id;
  const [activeSessions, assignedItemsCount, activity] = await Promise.all([
    countActiveAdminSessions(adminActorId),
    countAssignedItems(adminActorId),
    fetchStaffActivityMetrics(adminActorId, startOfToday),
  ]);

  const roleKey = (row.role_key || "moderator") as AdminRoleKey;
  const departmentKey = (row.department_key ||
    ROLE_DEFAULT_DEPARTMENT[roleKey] ||
    "administration") as AdminDepartmentKey;
  const status = (row.status || (row.is_active ? "active" : "disabled")) as AdminStaffStatus;

  return {
    id: row.id,
    adminActorId,
    displayName: row.display_name,
    roleKey,
    departmentKey,
    loginEmail: row.login_email,
    hasCredentialAccount: Boolean(row.login_email),
    mustChangePassword: Boolean(row.must_change_password),
    status,
    isActive: row.is_active,
    isFounder: adminActorId === FOUNDER_ADMIN_ACTOR_ID,
    lastSeenAt: toIsoDate(row.last_seen_at),
    createdAt: toIsoDate(row.created_at) ?? new Date().toISOString(),
    activeSessions,
    assignedItemsCount,
    operationsToday: activity.operationsToday,
    reportsProcessedToday: activity.reportsProcessedToday,
    ticketsProcessedToday: activity.ticketsProcessedToday,
    lastActivityAt: activity.lastActivityAt ?? toIsoDate(row.last_seen_at),
    lastActivityAction: activity.lastActivityAction,
    sessionStatus: resolveSessionStatus(row, activeSessions),
  };
}

export async function listAdminStaff(params?: {
  limit?: number;
  offset?: number;
}): Promise<{ items: AdminStaffListItem[]; totalItems: number }> {
  await ensureStaffManagementSchema();
  const countRows = await db.execute<{ count: string }>(sql`
    SELECT COUNT(*)::text AS count FROM admin_staff
  `);
  const totalItems = Number(countRows.rows[0]?.count ?? 0);
  const limit = params?.limit;
  const offset = Math.max(params?.offset ?? 0, 0);

  const rows = await db.execute<AdminStaffRow>(sql`
    SELECT id, admin_actor_id, display_name, role_key, department_key, login_email,
           is_active, status, must_change_password, last_seen_at, suspended_at, created_at, updated_at
    FROM admin_staff
    ORDER BY department_key ASC, admin_actor_id ASC
    ${limit != null ? sql`LIMIT ${limit} OFFSET ${offset}` : sql``}
  `);
  const items = await Promise.all(rows.rows.map((row) => mapStaffRow(row)));
  return { items, totalItems };
}

export async function getAdminStaffById(staffRowId: number): Promise<AdminStaffListItem | null> {
  await ensureStaffManagementSchema();
  const rows = await db.execute<AdminStaffRow>(sql`
    SELECT id, admin_actor_id, display_name, role_key, department_key, login_email,
           is_active, status, must_change_password, last_seen_at, suspended_at, created_at, updated_at
    FROM admin_staff
    WHERE id = ${staffRowId}
    LIMIT 1
  `);
  const row = rows.rows[0];
  if (!row) return null;
  return mapStaffRow(row);
}

export async function createAdminStaff(params: {
  displayName: string;
  roleKey: AdminRoleKey;
  departmentKey: AdminDepartmentKey;
  loginEmail?: string;
  createdByAdminActorId: number | null;
}): Promise<AdminStaffCreateResult> {
  await ensureStaffManagementSchema();
  const name = params.displayName.trim().slice(0, 120);
  if (!name) throw new Error("Display name is required");
  if (!isAssignableStaffRole(params.roleKey)) {
    throw new Error("Invalid role for new staff member");
  }
  if (!isAdminDepartmentKey(params.departmentKey)) {
    throw new Error("Invalid department");
  }
  if (!roleAllowedInDepartment(params.departmentKey, params.roleKey)) {
    throw new Error("Role does not match selected department");
  }

  const isEmailTaken = async (candidate: string) => {
    const rows = await db.execute<{ value: string }>(sql`
      SELECT COUNT(*)::text AS value FROM admin_staff WHERE lower(login_email) = ${candidate}
    `);
    return Number(rows.rows[0]?.value ?? 0) > 0;
  };

  let email = params.loginEmail?.trim().toLowerCase().slice(0, 190) ?? "";
  if (!email) {
    email = await resolveUniqueStaffLoginEmail({
      displayName: name,
      departmentKey: params.departmentKey,
      roleKey: params.roleKey,
      isEmailTaken,
    });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Valid login email is required");
  }
  if (await isEmailTaken(email)) {
    throw new Error("Login email already in use");
  }

  const nextIdRows = await db.execute<{ next_id: number }>(sql`
    SELECT COALESCE(MAX(admin_actor_id), 1) + 1 AS next_id FROM admin_staff
  `);
  const adminActorId = Number(nextIdRows.rows[0]?.next_id ?? 2);

  const temporaryPassword = generateTemporaryStaffPassword();
  const passwordHash = await hashStaffPassword(temporaryPassword);

  const inserted = await db.execute<AdminStaffRow>(sql`
    INSERT INTO admin_staff (
      admin_actor_id, display_name, role_key, department_key, login_email,
      password_hash, must_change_password, is_active, status, created_by_admin_actor_id
    )
    VALUES (
      ${adminActorId}, ${name}, ${params.roleKey}, ${params.departmentKey}, ${email},
      ${passwordHash}, true, true, 'active', ${params.createdByAdminActorId}
    )
    RETURNING id, admin_actor_id, display_name, role_key, department_key, login_email,
              is_active, status, must_change_password, last_seen_at, suspended_at, created_at, updated_at
  `);
  const row = inserted.rows[0];
  if (!row) throw new Error("Failed to create staff member");
  const staff = await mapStaffRow(row);
  return { staff, temporaryPassword };
}

export async function updateAdminStaff(params: {
  staffRowId: number;
  displayName?: string;
  roleKey?: AdminRoleKey;
  departmentKey?: AdminDepartmentKey;
  status?: AdminStaffStatus;
}): Promise<AdminStaffListItem> {
  await ensureStaffManagementSchema();
  const existing = await getAdminStaffById(params.staffRowId);
  if (!existing) throw new Error("Staff member not found");
  assertNotFounderStaffByActorId(existing.adminActorId);

  const name = params.displayName?.trim().slice(0, 120);
  if (params.roleKey != null) {
    if (!isAssignableStaffRole(params.roleKey)) {
      throw new Error("Invalid role");
    }
  }
  if (params.departmentKey != null && !isAdminDepartmentKey(params.departmentKey)) {
    throw new Error("Invalid department");
  }

  const nextRole = params.roleKey ?? existing.roleKey;
  const nextDepartment = params.departmentKey ?? existing.departmentKey;
  if (!roleAllowedInDepartment(nextDepartment, nextRole)) {
    throw new Error("Role does not match department");
  }
  const nextName = name && name.length > 0 ? name : existing.displayName;
  const nextStatus = params.status ?? existing.status;
  if (params.status != null && !["active", "suspended", "disabled"].includes(params.status)) {
    throw new Error("Invalid status");
  }
  const isActive = nextStatus !== "disabled";
  const suspendedAt = nextStatus === "suspended" ? new Date() : null;

  await db.execute(sql`
    UPDATE admin_staff
    SET display_name = ${nextName},
        role_key = ${nextRole},
        department_key = ${nextDepartment},
        status = ${nextStatus},
        is_active = ${isActive},
        suspended_at = ${suspendedAt},
        updated_at = NOW()
    WHERE id = ${params.staffRowId}
  `);

  const updated = await getAdminStaffById(params.staffRowId);
  if (!updated) throw new Error("Staff member not found after update");
  return updated;
}

export type AdminStaffSessionView = {
  sessionId: string;
  expiresAt: string;
  isCurrent: boolean;
};

export async function listAdminStaffSessions(
  adminActorId: number,
  currentSessionId?: string | null,
): Promise<AdminStaffSessionView[]> {
  await ensureStaffManagementSchema();
  const rows = await db.execute<{ sid: string; expire: Date }>(sql`
    SELECT sid, expire
    FROM user_sessions
    WHERE expire > NOW()
      AND (sess::jsonb->>'isAdmin') = 'true'
      AND (sess::jsonb->>'adminActorId')::int = ${adminActorId}
    ORDER BY expire DESC
    LIMIT 20
  `);
  return rows.rows.map((row) => ({
    sessionId: row.sid,
    expiresAt: toIsoDate(row.expire) ?? new Date().toISOString(),
    isCurrent: currentSessionId != null && row.sid === currentSessionId,
  }));
}

export type AdminStaffActivityEntry = {
  id: number;
  action: string;
  targetType: string;
  targetId: number | null;
  reason: string | null;
  deepLink: string | null;
  createdAt: string;
};

export async function listAdminStaffActivity(
  adminActorId: number,
  limit = 50,
): Promise<AdminStaffActivityEntry[]> {
  await ensureStaffManagementSchema();
  const rows = await db.execute<{
    id: number;
    action: string;
    target_type: string;
    target_id: number | null;
    details: Record<string, unknown> | null;
    created_at: Date;
  }>(sql`
    SELECT id, action, target_type, target_id, details, created_at
    FROM admin_activity_logs
    WHERE actor_admin_id = ${adminActorId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `);

  return rows.rows.map((row) => {
    const details = row.details ?? {};
    const reason =
      typeof details.reason === "string" && details.reason.trim()
        ? details.reason.trim().slice(0, 300)
        : null;
    const deepLink =
      typeof details.deepLink === "string" && details.deepLink.trim()
        ? details.deepLink.trim().slice(0, 300)
        : null;
    return {
      id: row.id,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      reason,
      deepLink,
      createdAt: toIsoDate(row.created_at) ?? new Date().toISOString(),
    };
  });
}

export async function revokeAdminStaffSessions(adminActorId: number): Promise<number> {
  assertNotFounderStaffByActorId(adminActorId);
  const result = await db.execute(sql`
    DELETE FROM user_sessions
    WHERE (sess::jsonb->>'isAdmin') = 'true'
      AND (sess::jsonb->>'adminActorId')::int = ${adminActorId}
  `);
  return Number(result.rowCount ?? 0);
}

export function founderStaffListItem(): AdminStaffListItem {
  return {
    id: 0,
    adminActorId: FOUNDER_ADMIN_ACTOR_ID,
    displayName: FOUNDER_DISPLAY_NAME,
    roleKey: "founder",
    departmentKey: "administration",
    loginEmail: null,
    hasCredentialAccount: false,
    mustChangePassword: false,
    status: "active",
    isActive: true,
    isFounder: true,
    lastSeenAt: null,
    createdAt: new Date(0).toISOString(),
    activeSessions: 0,
    assignedItemsCount: 0,
    operationsToday: 0,
    reportsProcessedToday: 0,
    ticketsProcessedToday: 0,
    lastActivityAt: null,
    lastActivityAction: null,
    sessionStatus: "offline",
  };
}

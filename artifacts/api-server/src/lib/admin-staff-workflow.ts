import { db, pool } from "@workspace/db";
import { sql } from "drizzle-orm";
import {
  assertNotFounderStaff,
  FOUNDER_ADMIN_ACTOR_ID,
  FOUNDER_DISPLAY_NAME,
  resolveAdminRoleKey,
  staffDisplayName,
} from "./admin-staff";

let ensureStaffWorkflowPromise: Promise<void> | null = null;

export type StaffAssignmentRow = {
  assignedStaffId: number | null;
  assignedAt: Date | null;
  assignedByAdminId: number | null;
};

export type StaffAssignmentView = {
  staffId: number | null;
  staffName: string | null;
  roleKey: string | null;
  assignedAt: string | null;
  assignedByAdminId: number | null;
  assignedByName: string | null;
};

const STAFF_WORKFLOW_DDL = `
  CREATE TABLE IF NOT EXISTS admin_staff (
    id SERIAL PRIMARY KEY,
    admin_actor_id INTEGER NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    role_key TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  ALTER TABLE reports ADD COLUMN IF NOT EXISTS assigned_staff_id INTEGER NULL;
  ALTER TABLE reports ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ NULL;
  ALTER TABLE reports ADD COLUMN IF NOT EXISTS assigned_by_admin_id INTEGER NULL;

  ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS assigned_staff_id INTEGER NULL;
  ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ NULL;
  ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS assigned_by_admin_id INTEGER NULL;

  ALTER TABLE ads ADD COLUMN IF NOT EXISTS assigned_staff_id INTEGER NULL;
  ALTER TABLE ads ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ NULL;
  ALTER TABLE ads ADD COLUMN IF NOT EXISTS assigned_by_admin_id INTEGER NULL;

  CREATE INDEX IF NOT EXISTS reports_assigned_staff_idx ON reports (assigned_staff_id);
  CREATE INDEX IF NOT EXISTS support_tickets_assigned_staff_idx ON support_tickets (assigned_staff_id);
  CREATE INDEX IF NOT EXISTS ads_assigned_staff_idx ON ads (assigned_staff_id);
`;

export async function ensureStaffWorkflowSchema(): Promise<void> {
  if (!ensureStaffWorkflowPromise) {
    ensureStaffWorkflowPromise = (async () => {
      await pool.query(STAFF_WORKFLOW_DDL);
      await pool.query(
        `
          INSERT INTO admin_staff (admin_actor_id, display_name, role_key)
          VALUES ($1, $2, 'founder')
          ON CONFLICT (admin_actor_id) DO UPDATE
            SET display_name = EXCLUDED.display_name,
                role_key = EXCLUDED.role_key,
                is_active = true
        `,
        [FOUNDER_ADMIN_ACTOR_ID, FOUNDER_DISPLAY_NAME],
      );
    })().catch((error) => {
      ensureStaffWorkflowPromise = null;
      throw error;
    });
  }
  return ensureStaffWorkflowPromise;
}

async function resolveStaffRecord(staffId: number): Promise<{ displayName: string; roleKey: string } | null> {
  const rows = await db.execute<{ display_name: string; role_key: string }>(sql`
    SELECT display_name, role_key
    FROM admin_staff
    WHERE admin_actor_id = ${staffId} AND is_active = true
    LIMIT 1
  `);
  const row = rows.rows[0];
  if (!row) return null;
  return { displayName: row.display_name, roleKey: row.role_key };
}

export async function buildStaffAssignmentView(
  row: StaffAssignmentRow,
): Promise<StaffAssignmentView> {
  const staffId = row.assignedStaffId;
  let staffName: string | null = null;
  let roleKey: string | null = null;

  if (staffId != null) {
    if (staffId === FOUNDER_ADMIN_ACTOR_ID) {
      staffName = FOUNDER_DISPLAY_NAME;
      roleKey = "founder";
    } else {
      const staff = await resolveStaffRecord(staffId);
      staffName = staff?.displayName ?? staffDisplayName(staffId);
      roleKey = staff?.roleKey ?? resolveAdminRoleKey(staffId);
    }
  }

  let assignedByName: string | null = null;
  if (row.assignedByAdminId != null) {
    assignedByName = staffDisplayName(
      row.assignedByAdminId,
      row.assignedByAdminId === FOUNDER_ADMIN_ACTOR_ID ? FOUNDER_DISPLAY_NAME : null,
    );
  }

  return {
    staffId,
    staffName,
    roleKey,
    assignedAt: row.assignedAt ? row.assignedAt.toISOString() : null,
    assignedByAdminId: row.assignedByAdminId,
    assignedByName,
  };
}

export async function claimReport(params: {
  reportId: number;
  actorAdminId: number | null;
}): Promise<StaffAssignmentView> {
  await ensureStaffWorkflowSchema();
  const staffId = params.actorAdminId ?? FOUNDER_ADMIN_ACTOR_ID;
  const now = new Date();

  await db.execute(sql`
    UPDATE reports
    SET assigned_staff_id = ${staffId},
        assigned_at = ${now},
        assigned_by_admin_id = ${staffId}
    WHERE id = ${params.reportId}
  `);

  return buildStaffAssignmentView({
    assignedStaffId: staffId,
    assignedAt: now,
    assignedByAdminId: staffId,
  });
}

export async function assignReport(params: {
  reportId: number;
  staffId: number;
  actorAdminId: number | null;
}): Promise<StaffAssignmentView> {
  await ensureStaffWorkflowSchema();
  const staff = await resolveStaffRecord(params.staffId);
  if (!staff && params.staffId !== FOUNDER_ADMIN_ACTOR_ID) {
    throw new Error("Staff member not found");
  }
  const now = new Date();
  const assignedBy = params.actorAdminId ?? FOUNDER_ADMIN_ACTOR_ID;

  await db.execute(sql`
    UPDATE reports
    SET assigned_staff_id = ${params.staffId},
        assigned_at = ${now},
        assigned_by_admin_id = ${assignedBy}
    WHERE id = ${params.reportId}
  `);

  return buildStaffAssignmentView({
    assignedStaffId: params.staffId,
    assignedAt: now,
    assignedByAdminId: assignedBy,
  });
}

export async function releaseReport(reportId: number): Promise<StaffAssignmentView> {
  await ensureStaffWorkflowSchema();
  await db.execute(sql`
    UPDATE reports
    SET assigned_staff_id = NULL,
        assigned_at = NULL,
        assigned_by_admin_id = NULL
    WHERE id = ${reportId}
  `);
  return buildStaffAssignmentView({
    assignedStaffId: null,
    assignedAt: null,
    assignedByAdminId: null,
  });
}

export async function claimSupportTicket(params: {
  ticketId: number;
  actorAdminId: number | null;
}): Promise<StaffAssignmentView> {
  await ensureStaffWorkflowSchema();
  const staffId = params.actorAdminId ?? FOUNDER_ADMIN_ACTOR_ID;
  const now = new Date();

  await db.execute(sql`
    UPDATE support_tickets
    SET assigned_staff_id = ${staffId},
        assigned_at = ${now},
        assigned_by_admin_id = ${staffId},
        updated_at = ${now}
    WHERE id = ${params.ticketId}
  `);

  return buildStaffAssignmentView({
    assignedStaffId: staffId,
    assignedAt: now,
    assignedByAdminId: staffId,
  });
}

export async function assignSupportTicket(params: {
  ticketId: number;
  staffId: number;
  actorAdminId: number | null;
}): Promise<StaffAssignmentView> {
  await ensureStaffWorkflowSchema();
  const staff = await resolveStaffRecord(params.staffId);
  if (!staff && params.staffId !== FOUNDER_ADMIN_ACTOR_ID) {
    throw new Error("Staff member not found");
  }
  const now = new Date();
  const assignedBy = params.actorAdminId ?? FOUNDER_ADMIN_ACTOR_ID;

  await db.execute(sql`
    UPDATE support_tickets
    SET assigned_staff_id = ${params.staffId},
        assigned_at = ${now},
        assigned_by_admin_id = ${assignedBy},
        updated_at = ${now}
    WHERE id = ${params.ticketId}
  `);

  return buildStaffAssignmentView({
    assignedStaffId: params.staffId,
    assignedAt: now,
    assignedByAdminId: assignedBy,
  });
}

export async function releaseSupportTicket(ticketId: number): Promise<StaffAssignmentView> {
  await ensureStaffWorkflowSchema();
  const now = new Date();
  await db.execute(sql`
    UPDATE support_tickets
    SET assigned_staff_id = NULL,
        assigned_at = NULL,
        assigned_by_admin_id = NULL,
        updated_at = ${now}
    WHERE id = ${ticketId}
  `);
  return buildStaffAssignmentView({
    assignedStaffId: null,
    assignedAt: null,
    assignedByAdminId: null,
  });
}

export async function claimAd(params: {
  adId: number;
  actorAdminId: number | null;
}): Promise<StaffAssignmentView> {
  await ensureStaffWorkflowSchema();
  const staffId = params.actorAdminId ?? FOUNDER_ADMIN_ACTOR_ID;
  const now = new Date();

  await db.execute(sql`
    UPDATE ads
    SET assigned_staff_id = ${staffId},
        assigned_at = ${now},
        assigned_by_admin_id = ${staffId},
        updated_at = ${now}
    WHERE id = ${params.adId}
  `);

  return buildStaffAssignmentView({
    assignedStaffId: staffId,
    assignedAt: now,
    assignedByAdminId: staffId,
  });
}

export async function assignAd(params: {
  adId: number;
  staffId: number;
  actorAdminId: number | null;
}): Promise<StaffAssignmentView> {
  await ensureStaffWorkflowSchema();
  const staff = await resolveStaffRecord(params.staffId);
  if (!staff && params.staffId !== FOUNDER_ADMIN_ACTOR_ID) {
    throw new Error("Staff member not found");
  }
  const now = new Date();
  const assignedBy = params.actorAdminId ?? FOUNDER_ADMIN_ACTOR_ID;

  await db.execute(sql`
    UPDATE ads
    SET assigned_staff_id = ${params.staffId},
        assigned_at = ${now},
        assigned_by_admin_id = ${assignedBy},
        updated_at = ${now}
    WHERE id = ${params.adId}
  `);

  return buildStaffAssignmentView({
    assignedStaffId: params.staffId,
    assignedAt: now,
    assignedByAdminId: assignedBy,
  });
}

export async function releaseAd(adId: number): Promise<StaffAssignmentView> {
  await ensureStaffWorkflowSchema();
  const now = new Date();
  await db.execute(sql`
    UPDATE ads
    SET assigned_staff_id = NULL,
        assigned_at = NULL,
        assigned_by_admin_id = NULL,
        updated_at = ${now}
    WHERE id = ${adId}
  `);
  return buildStaffAssignmentView({
    assignedStaffId: null,
    assignedAt: null,
    assignedByAdminId: null,
  });
}

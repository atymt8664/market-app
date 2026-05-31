import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import {
  FOUNDER_ADMIN_ACTOR_ID,
  FOUNDER_DISPLAY_NAME,
  type AdminRoleKey,
  isAdminRoleKey,
  staffDisplayName,
} from "./admin-staff";
import { ensureStaffWorkflowSchema } from "./admin-staff-workflow";

export type AdminLogActorInfo = {
  adminActorId: number;
  displayName: string;
  roleKey: AdminRoleKey;
};

export const ADMIN_LOG_ACTION_GROUPS: Record<string, string[]> = {
  ad: [
    "ad.approve",
    "ad.reject",
    "ad.hide",
    "ad.unhide",
    "ad.delete",
    "ad.claim",
    "ad.release",
    "ad.assign",
    "ad.feature_on",
    "ad.feature_off",
  ],
  report: [
    "report.resolve",
    "report.review",
    "report.ignore",
    "report.update_status",
    "report.claim",
    "report.assign",
    "report.release",
    "report.ad_action",
  ],
  support: [
    "support.close",
    "support.resolve",
    "support.update",
    "support.reply",
    "support.reopen",
    "support.claim",
    "support.assign",
    "support.release",
  ],
  user: ["user.block", "user.unblock", "user.avatar_approve", "user.avatar_reject"],
  category: ["category.create", "category.update", "category.hide", "category.unhide", "category.delete"],
  city: ["city.create", "city.update", "city.hide", "city.unhide", "city.delete"],
  settings: ["settings.update", "admin.password.change", "admin.2fa.enable", "admin.2fa.disable"],
  verification: [
    "verification.claim",
    "verification.assign",
    "verification.release",
    "verification.escalate",
    "verification.approve",
    "verification.reject",
    "verification.needs_info",
    "verification.status",
  ],
  staff: ["staff.create", "staff.update", "staff.sessions_revoke", "staff.password_change"],
  monitoring: ["monitoring.alert"],
};

export async function loadAdminLogActorMap(
  actorAdminIds: Array<number | null | undefined>,
): Promise<Map<number, AdminLogActorInfo>> {
  const map = new Map<number, AdminLogActorInfo>();
  const unique = [
    ...new Set(
      actorAdminIds.filter(
        (id): id is number => typeof id === "number" && Number.isInteger(id) && id > 0,
      ),
    ),
  ];
  if (unique.length === 0) return map;

  if (unique.includes(FOUNDER_ADMIN_ACTOR_ID)) {
    map.set(FOUNDER_ADMIN_ACTOR_ID, {
      adminActorId: FOUNDER_ADMIN_ACTOR_ID,
      displayName: FOUNDER_DISPLAY_NAME,
      roleKey: "founder",
    });
  }

  const staffIds = unique.filter((id) => id !== FOUNDER_ADMIN_ACTOR_ID);
  if (staffIds.length === 0) return map;

  try {
    await ensureStaffWorkflowSchema();
    const result = await db.execute<{
      admin_actor_id: number;
      display_name: string;
      role_key: string;
    }>(sql`
      SELECT admin_actor_id, display_name, role_key
      FROM admin_staff
      WHERE admin_actor_id IN (${sql.join(
        staffIds.map((id) => sql`${id}`),
        sql`, `,
      )})
    `);

    for (const row of result.rows) {
      const roleKey = isAdminRoleKey(row.role_key) ? row.role_key : "moderator";
      map.set(row.admin_actor_id, {
        adminActorId: row.admin_actor_id,
        displayName: row.display_name?.trim() || staffDisplayName(row.admin_actor_id),
        roleKey,
      });
    }
  } catch {
    /* staff table may be unavailable on fresh env — fall back per row */
  }

  for (const id of staffIds) {
    if (!map.has(id)) {
      map.set(id, {
        adminActorId: id,
        displayName: staffDisplayName(id),
        roleKey: "moderator",
      });
    }
  }

  return map;
}

export function formatAdminLogActor(
  actorAdminId: number | null,
  actorMap: Map<number, AdminLogActorInfo>,
): {
  actorAdminId: number | null;
  actorDisplayName: string | null;
  actorRoleKey: AdminRoleKey | null;
  actor: string;
} {
  if (actorAdminId === FOUNDER_ADMIN_ACTOR_ID) {
    return {
      actorAdminId,
      actorDisplayName: FOUNDER_DISPLAY_NAME,
      actorRoleKey: "founder",
      actor: `${FOUNDER_DISPLAY_NAME} (Founder)`,
    };
  }

  if (actorAdminId != null && actorAdminId > 0) {
    const info = actorMap.get(actorAdminId);
    const displayName = info?.displayName ?? staffDisplayName(actorAdminId);
    const roleKey = info?.roleKey ?? "moderator";
    return {
      actorAdminId,
      actorDisplayName: displayName,
      actorRoleKey: roleKey,
      actor: displayName,
    };
  }

  return {
    actorAdminId: null,
    actorDisplayName: null,
    actorRoleKey: null,
    actor: "admin#unknown",
  };
}

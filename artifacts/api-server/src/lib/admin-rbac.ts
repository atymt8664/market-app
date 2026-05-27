import type { Request } from "express";
import { getAdminActorId } from "./admin-activity-log";
import {
  FOUNDER_ADMIN_ACTOR_ID,
  FOUNDER_DISPLAY_NAME,
  isAdminRoleKey,
  type AdminRoleKey,
  staffDisplayName,
} from "./admin-staff";
import { ensureStaffManagementSchema, touchAdminStaffLastSeen } from "./admin-staff-management";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export { touchAdminStaffLastSeen };

export type AdminPermissionArea =
  | "dashboard.operations"
  | "dashboard.moderation"
  | "ads"
  | "reports"
  | "support"
  | "users"
  | "verification"
  | "analytics"
  | "settings"
  | "billing"
  | "plans"
  | "cities"
  | "categories"
  | "logs"
  | "system"
  | "staff";

const ALL_PERMISSIONS: AdminPermissionArea[] = [
  "dashboard.operations",
  "dashboard.moderation",
  "ads",
  "reports",
  "support",
  "users",
  "verification",
  "analytics",
  "settings",
  "billing",
  "plans",
  "cities",
  "categories",
  "logs",
  "system",
  "staff",
];

const ROLE_PERMISSIONS: Record<AdminRoleKey, AdminPermissionArea[] | "*"> = {
  founder: "*",
  moderator: ["dashboard.moderation", "ads", "reports", "verification"],
  support: ["support"],
  verification: ["verification"],
  analyst: ["analytics"],
  finance_manager: ["billing", "plans"],
  admin_manager: [
    "dashboard.operations",
    "settings",
    "staff",
    "cities",
    "categories",
    "logs",
    "users",
  ],
};

export type AdminStaffContext = {
  actorAdminId: number | null;
  roleKey: AdminRoleKey;
  displayName: string;
  permissions: AdminPermissionArea[];
  isFounder: boolean;
};

function isAdminRoleKeyLocal(value: string): value is AdminRoleKey {
  return isAdminRoleKey(value);
}

export function permissionsForRole(roleKey: AdminRoleKey): AdminPermissionArea[] {
  const entry = ROLE_PERMISSIONS[roleKey];
  if (entry === "*") return [...ALL_PERMISSIONS];
  return entry;
}

export function hasAdminPermission(
  roleKey: AdminRoleKey,
  area: AdminPermissionArea,
): boolean {
  const entry = ROLE_PERMISSIONS[roleKey];
  if (entry === "*") return true;
  return entry.includes(area);
}

export function hasAnyAdminPermission(
  roleKey: AdminRoleKey,
  areas: AdminPermissionArea[],
): boolean {
  return areas.some((area) => hasAdminPermission(roleKey, area));
}

export function defaultAdminHomePath(roleKey: AdminRoleKey): string {
  switch (roleKey) {
    case "support":
      return "/admin/support";
    case "verification":
      return "/admin/verification";
    case "analyst":
      return "/admin/analytics";
    case "finance_manager":
      return "/admin/billing";
    case "admin_manager":
      return "/admin/staff";
    default:
      return "/admin";
  }
}

export async function loadAdminStaffContext(req: Request): Promise<AdminStaffContext> {
  const actorAdminId = getAdminActorId(req);

  if (actorAdminId === FOUNDER_ADMIN_ACTOR_ID) {
    return {
      actorAdminId,
      roleKey: "founder",
      displayName: FOUNDER_DISPLAY_NAME,
      permissions: permissionsForRole("founder"),
      isFounder: true,
    };
  }

  await ensureStaffManagementSchema();

  if (actorAdminId != null && actorAdminId > 0) {
    const rows = await db.execute<{
      display_name: string;
      role_key: string;
      is_active: boolean;
      status: string;
    }>(sql`
      SELECT display_name, role_key, is_active, status
      FROM admin_staff
      WHERE admin_actor_id = ${actorAdminId}
      LIMIT 1
    `);
    const row = rows.rows[0];
    if (row && isAdminRoleKeyLocal(row.role_key)) {
      const status = String(row.status || "active");
      if (!row.is_active || status === "disabled") {
        return {
          actorAdminId,
          roleKey: row.role_key,
          displayName: row.display_name?.trim() || staffDisplayName(actorAdminId),
          permissions: [],
          isFounder: false,
        };
      }
      if (status === "suspended") {
        return {
          actorAdminId,
          roleKey: row.role_key,
          displayName: row.display_name?.trim() || staffDisplayName(actorAdminId),
          permissions: [],
          isFounder: false,
        };
      }
      return {
        actorAdminId,
        roleKey: row.role_key,
        displayName: row.display_name?.trim() || staffDisplayName(actorAdminId),
        permissions: permissionsForRole(row.role_key),
        isFounder: false,
      };
    }
  }

  const fallbackRole: AdminRoleKey = "moderator";
  return {
    actorAdminId,
    roleKey: fallbackRole,
    displayName: staffDisplayName(actorAdminId),
    permissions: permissionsForRole(fallbackRole),
    isFounder: false,
  };
}

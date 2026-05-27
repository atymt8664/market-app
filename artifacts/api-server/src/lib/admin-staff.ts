/** Founder is always the highest admin actor — no role ranks above this. */
export const FOUNDER_ADMIN_ACTOR_ID = 1;
export const FOUNDER_DISPLAY_NAME = "Mohamed";
export const FOUNDER_ROLE_KEY = "founder" as const;
export const COMPANY_NAME = "Souq Arab EU";

export type AdminStaffStatus = "active" | "suspended" | "disabled";

export type AdminDepartmentKey =
  | "moderation"
  | "support"
  | "verification"
  | "analytics"
  | "finance"
  | "administration";

export type AdminRoleKey =
  | "founder"
  | "moderator"
  | "support"
  | "verification"
  | "analyst"
  | "finance_manager"
  | "admin_manager";

export const ADMIN_DEPARTMENTS: AdminDepartmentKey[] = [
  "moderation",
  "support",
  "verification",
  "analytics",
  "finance",
  "administration",
];

export const DEPARTMENT_ROLE_MAP: Record<AdminDepartmentKey, AdminRoleKey[]> = {
  moderation: ["moderator"],
  support: ["support"],
  verification: ["verification"],
  analytics: ["analyst"],
  finance: ["finance_manager"],
  administration: ["admin_manager"],
};

export const ROLE_DEFAULT_DEPARTMENT: Record<AdminRoleKey, AdminDepartmentKey> = {
  founder: "administration",
  moderator: "moderation",
  support: "support",
  verification: "verification",
  analyst: "analytics",
  finance_manager: "finance",
  admin_manager: "administration",
};

export const STAFF_ASSIGNABLE_ROLES: AdminRoleKey[] = [
  "moderator",
  "support",
  "verification",
  "analyst",
  "finance_manager",
  "admin_manager",
];

export class FounderProtectedError extends Error {
  readonly code = "FOUNDER_PROTECTED" as const;
  constructor(message = "Founder account cannot be modified or demoted") {
    super(message);
    this.name = "FounderProtectedError";
  }
}

export function resolveAdminRoleKey(actorAdminId: number | null): AdminRoleKey {
  if (actorAdminId === FOUNDER_ADMIN_ACTOR_ID) return "founder";
  if (actorAdminId != null && actorAdminId > 0) return "moderator";
  return "moderator";
}

export function assertNotFounderStaff(staffId: number): void {
  if (staffId === FOUNDER_ADMIN_ACTOR_ID) {
    throw new FounderProtectedError();
  }
}

export function assertNotFounderStaffByActorId(adminActorId: number): void {
  assertNotFounderStaff(adminActorId);
}

export function isAssignableStaffRole(roleKey: string): roleKey is Exclude<AdminRoleKey, "founder"> {
  return STAFF_ASSIGNABLE_ROLES.includes(roleKey as AdminRoleKey);
}

export function isAdminDepartmentKey(value: string): value is AdminDepartmentKey {
  return ADMIN_DEPARTMENTS.includes(value as AdminDepartmentKey);
}

export function isAdminRoleKey(value: string): value is AdminRoleKey {
  return (
    value === "founder" ||
    value === "moderator" ||
    value === "support" ||
    value === "verification" ||
    value === "analyst" ||
    value === "finance_manager" ||
    value === "admin_manager"
  );
}

export function roleAllowedInDepartment(
  departmentKey: AdminDepartmentKey,
  roleKey: AdminRoleKey,
): boolean {
  if (roleKey === "founder") return false;
  return DEPARTMENT_ROLE_MAP[departmentKey]?.includes(roleKey) ?? false;
}

export function isFounderUser(userId: number, userName?: string | null): boolean {
  if (userId === FOUNDER_ADMIN_ACTOR_ID) return true;
  const normalized = userName?.trim().toLowerCase();
  return normalized === FOUNDER_DISPLAY_NAME.toLowerCase();
}

export function assertNotFounderUser(userId: number, userName?: string | null): void {
  if (isFounderUser(userId, userName)) {
    throw new FounderProtectedError("Founder account cannot be banned or deleted");
  }
}

export function staffDisplayName(staffId: number | null, fallback?: string | null): string {
  if (staffId === FOUNDER_ADMIN_ACTOR_ID) return FOUNDER_DISPLAY_NAME;
  if (fallback?.trim()) return fallback.trim().slice(0, 120);
  if (staffId != null && staffId > 0) return `Staff #${staffId}`;
  return "—";
}

export function staffDepartmentLabelKey(departmentKey: AdminDepartmentKey): string {
  return `p8.admin.staff.department.${departmentKey}`;
}

export function staffRoleLabelKey(roleKey: AdminRoleKey): string {
  return `p8.admin.roles.${roleKey}.title`;
}

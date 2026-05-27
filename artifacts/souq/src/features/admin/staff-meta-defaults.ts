import type { AdminDepartmentKey, AdminRoleKey } from "./rbac";
import type { AdminStaffMetaResponse } from "./types";

export const STAFF_EMAIL_DOMAIN = "souq-arab.com";

const DEPARTMENT_ROLE_MAP: Record<AdminDepartmentKey, AdminRoleKey[]> = {
  moderation: ["moderator"],
  support: ["support"],
  verification: ["verification"],
  analytics: ["analyst"],
  finance: ["finance_manager"],
  administration: ["admin_manager"],
};

export const DEFAULT_STAFF_META: AdminStaffMetaResponse = {
  founderProtected: true,
  departments: (Object.keys(DEPARTMENT_ROLE_MAP) as AdminDepartmentKey[]).map((departmentKey) => ({
    key: departmentKey,
    labelKey: `p8.admin.staff.department.${departmentKey}`,
    roles: DEPARTMENT_ROLE_MAP[departmentKey].map((roleKey) => ({
      key: roleKey,
      labelKey: `p8.admin.roles.${roleKey}.title`,
    })),
  })),
};

const DEPARTMENT_SLUG: Record<AdminDepartmentKey, string> = {
  moderation: "moderation",
  support: "support",
  verification: "verification",
  analytics: "analytics",
  finance: "finance",
  administration: "admin",
};

function slugifyName(displayName: string): string {
  return displayName
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s.-]/gu, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .join(".");
}

export function suggestStaffLoginEmail(params: {
  displayName: string;
  departmentKey: AdminDepartmentKey;
  roleKey: AdminRoleKey;
  sequence?: number;
}): string {
  const dept = DEPARTMENT_SLUG[params.departmentKey] ?? "staff";
  const seq = params.sequence != null && params.sequence > 1 ? params.sequence : null;
  const nameSlug = slugifyName(params.displayName);
  if (nameSlug) {
    const local = seq != null ? `${nameSlug}.${dept}${seq}` : `${nameSlug}.${dept}`;
    return `${local}@${STAFF_EMAIL_DOMAIN}`;
  }
  const fallbackSeq = seq ?? 1;
  return `${dept}${String(fallbackSeq).padStart(3, "0")}@${STAFF_EMAIL_DOMAIN}`;
}

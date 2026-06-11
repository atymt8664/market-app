export type AdminRoleKey =
  | "founder"
  | "moderator"
  | "support"
  | "verification"
  | "analyst"
  | "finance_manager"
  | "admin_manager";

export type AdminDepartmentKey =
  | "moderation"
  | "support"
  | "verification"
  | "analytics"
  | "finance"
  | "administration";

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

export type AdminMeResponse = {
  isAdmin: boolean;
  csrfToken?: string;
  adminActorLabel?: string;
  roleKey?: AdminRoleKey;
  displayName?: string;
  permissions?: AdminPermissionArea[];
  isFounder?: boolean;
  homePath?: string;
  mustChangePassword?: boolean;
};

export type AdminNavKey =
  | "dashboard"
  | "notifications"
  | "ads"
  | "reports"
  | "support"
  | "users"
  | "verification"
  | "plans"
  | "analytics"
  | "cities"
  | "categories"
  | "logs"
  | "billing"
  | "settings"
  | "staff"
  | "monitoring"
  | "operations";

const NAV_PERMISSIONS: Record<AdminNavKey, AdminPermissionArea[]> = {
  dashboard: ["dashboard.operations", "dashboard.moderation"],
  notifications: [],
  ads: ["ads"],
  reports: ["reports"],
  support: ["support"],
  users: ["users"],
  verification: ["verification"],
  plans: ["plans"],
  analytics: ["analytics"],
  cities: ["cities"],
  categories: ["categories"],
  logs: ["logs"],
  billing: ["billing"],
  settings: ["settings"],
  staff: ["staff"],
  monitoring: ["system"],
  operations: ["dashboard.operations"],
};

const ROUTE_PERMISSIONS: Record<string, AdminPermissionArea[]> = {
  "/admin": ["dashboard.operations", "dashboard.moderation"],
  "/admin/notifications": [],
  "/admin/ads": ["ads"],
  "/admin/reports": ["reports"],
  "/admin/support": ["support"],
  "/admin/users": ["users"],
  "/admin/verification": ["verification"],
  "/admin/plans": ["plans"],
  "/admin/stats": ["analytics"],
  "/admin/analytics": ["analytics"],
  "/admin/cities": ["cities"],
  "/admin/categories": ["categories"],
  "/admin/logs": ["logs"],
  "/admin/billing": ["billing"],
  "/admin/settings": ["settings"],
  "/admin/staff": ["staff"],
  "/admin/monitoring": ["system"],
  "/admin/operations": ["dashboard.operations"],
};

export function canAccessNav(
  permissions: AdminPermissionArea[] | undefined,
  navKey: AdminNavKey,
): boolean {
  if (!permissions?.length) return false;
  if (navKey === "notifications") return true;
  const required = NAV_PERMISSIONS[navKey];
  return required.some((area) => permissions.includes(area));
}

export function canAccessRoute(
  permissions: AdminPermissionArea[] | undefined,
  path: string,
  isFounder = false,
): boolean {
  if (isFounder) return true;
  if (!permissions?.length) return false;
  const base = path.split("?")[0]?.replace(/\/+$/, "") || "/admin";
  if (base === "/admin/notifications") return true;
  if (base === "/admin/operations" || base === "/admin/monitoring") return false;
  if (base.startsWith("/admin/users/")) {
    return permissions.includes("users");
  }
  const required = ROUTE_PERMISSIONS[base];
  if (!required) return permissions.includes("dashboard.operations");
  return required.some((area) => permissions.includes(area));
}

export function defaultHomePath(roleKey?: AdminRoleKey): string {
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

export function hasPermission(
  permissions: AdminPermissionArea[] | undefined,
  area: AdminPermissionArea,
): boolean {
  return Boolean(permissions?.includes(area));
}

import { adminDeepLink } from "../admin-audit";

export function adminNotificationDeepLinkPath(
  entityType: string | null | undefined,
  entityId: number | null | undefined,
  fallback = "/admin",
): string {
  const et = entityType?.trim().toLowerCase() ?? "";
  const id = entityId;
  if (et === "ad" && id) return adminDeepLink(`/admin/ads?highlight=${id}`);
  if (et === "report" && id) return adminDeepLink(`/admin/reports?highlight=${id}`);
  if (et === "support_ticket" && id) return adminDeepLink(`/admin/support?ticket=${id}`);
  if (et === "verification_request" && id) {
    return adminDeepLink(`/admin/verification?requestId=${id}`);
  }
  if (et === "user" && id) return adminDeepLink(`/admin/users/${id}`);
  if (et === "operations") return adminDeepLink("/admin/operations");
  if (et === "monitoring") return adminDeepLink("/admin/monitoring");
  return adminDeepLink(fallback);
}

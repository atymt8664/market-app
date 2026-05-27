import { t } from "@/i18n";

export type AdminApiErrorBody = {
  error?: string;
  code?: string;
  title?: string;
  description?: string;
  nextStep?: string;
};

/** Maps API error payloads to staff-facing messages — never raw HTTP codes. */
export function mapAdminApiError(
  status: number,
  body: AdminApiErrorBody | null | undefined,
  fallback?: string,
): string {
  const code = body?.code?.trim();
  if (code === "RBAC_DENIED") {
    return body?.description?.trim() || t("p8.admin.errors.rbac_denied");
  }
  if (code === "STAFF_CLAIM_LIMIT_REACHED") {
    return body?.error?.trim() || t("p8.admin.errors.staff_claim_limit");
  }
  if (code === "STAFF_DOMAIN_CLAIM_LIMIT_REACHED") {
    return body?.error?.trim() || t("p8.admin.errors.staff_domain_claim_limit");
  }
  if (code === "ADMIN_CSRF_INVALID") {
    return t("p8.admin.errors.csrf_invalid");
  }
  if (code === "ADMIN_PASSWORD_CHANGE_REQUIRED") {
    return t("p8.admin.errors.password_change_required");
  }
  if (body?.title?.trim()) return body.title.trim();
  if (body?.error?.trim()) return body.error.trim();
  if (status === 401) return t("p8.admin.errors.unauthorized");
  if (status === 403) return t("p8.admin.errors.forbidden");
  if (status === 404) return t("p8.admin.errors.not_found");
  if (status === 409) return body?.error?.trim() || t("p8.admin.errors.conflict");
  if (status === 429) return t("p8.admin.errors.rate_limit");
  if (status >= 500) return t("p8.admin.errors.server");
  return fallback?.trim() || t("p8.admin.errors.fallback");
}

export async function parseAdminErrorResponse(res: Response): Promise<AdminApiErrorBody | null> {
  try {
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text) as AdminApiErrorBody;
  } catch {
    return null;
  }
}

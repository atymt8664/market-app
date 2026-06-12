import { apiUrl } from "@/lib/api-url";

export type SecurityAlertSeverity = "info" | "warning" | "critical";

export type UserSecurityAlertDto = {
  id: number;
  eventType: string;
  ip: string | null;
  userAgent: string | null;
  details: Record<string, unknown>;
  createdAt: string;
  severity: SecurityAlertSeverity;
  deviceHint: string | null;
};

export class UserSecurityAlertsApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "UserSecurityAlertsApiError";
    this.status = status;
  }
}

async function parseError(res: Response): Promise<UserSecurityAlertsApiError> {
  let message = String(res.status);
  try {
    const data = (await res.json()) as { error?: string };
    if (typeof data.error === "string" && data.error.trim()) message = data.error.trim();
  } catch {
    /* ignore */
  }
  return new UserSecurityAlertsApiError(res.status, message);
}

export async function fetchUserSecurityAlerts(beforeId?: number): Promise<UserSecurityAlertDto[]> {
  const qs = typeof beforeId === "number" ? `?before=${beforeId}` : "";
  const res = await fetch(apiUrl(`/api/account/security-alerts${qs}`), { credentials: "include" });
  if (!res.ok) throw await parseError(res);
  const data = (await res.json()) as { alerts?: UserSecurityAlertDto[] };
  return Array.isArray(data.alerts) ? data.alerts : [];
}

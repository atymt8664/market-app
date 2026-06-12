import { apiUrl } from "@/lib/api-url";

export type UserSecurityEventDto = {
  id: number;
  eventType: string;
  ip: string | null;
  userAgent: string | null;
  details: Record<string, unknown>;
  createdAt: string;
};

export class UserSecurityLogApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "UserSecurityLogApiError";
    this.status = status;
  }
}

async function parseError(res: Response): Promise<UserSecurityLogApiError> {
  let message = String(res.status);
  try {
    const data = (await res.json()) as { error?: string };
    if (typeof data.error === "string" && data.error.trim()) message = data.error.trim();
  } catch {
    /* ignore */
  }
  return new UserSecurityLogApiError(res.status, message);
}

export async function fetchUserSecurityLog(beforeId?: number): Promise<UserSecurityEventDto[]> {
  const qs = typeof beforeId === "number" ? `?before=${beforeId}` : "";
  const res = await fetch(apiUrl(`/api/account/security-log${qs}`), { credentials: "include" });
  if (!res.ok) throw await parseError(res);
  const data = (await res.json()) as { events?: UserSecurityEventDto[] };
  return Array.isArray(data.events) ? data.events : [];
}

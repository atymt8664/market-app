import { getAdminActorId, logAdminActivity, type AdminActivityInput } from "./admin-activity-log";
import { resolveAdminRoleKey } from "./admin-staff";

type AuditTargetType = AdminActivityInput["targetType"];

export type WriteAdminAuditInput = {
  req: { session?: { adminActorId?: unknown } };
  actionKey: string;
  targetType: AuditTargetType;
  targetId: number | null;
  previousState?: string | null;
  newState?: string | null;
  reason?: string | null;
  deepLink?: string | null;
  extra?: Record<string, string | number | boolean | null>;
};

export function adminDeepLink(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

export async function writeAdminAudit(input: WriteAdminAuditInput): Promise<number | null> {
  const actorAdminId = getAdminActorId(input.req);
  const roleKey = resolveAdminRoleKey(actorAdminId);

  return logAdminActivity({
    action: input.actionKey,
    actorAdminId,
    targetType: input.targetType,
    targetId: input.targetId,
    details: {
      roleKey,
      actionKey: input.actionKey,
      previousState: input.previousState ?? null,
      newState: input.newState ?? null,
      reason: input.reason ?? null,
      deepLink: input.deepLink ?? null,
      ...input.extra,
    },
  });
}

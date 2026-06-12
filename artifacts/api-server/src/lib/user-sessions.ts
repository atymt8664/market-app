import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

export type UserSessionView = {
  sessionId: string;
  expiresAt: string;
  isCurrent: boolean;
};

function toIsoDate(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

/** Active marketplace user sessions (excludes admin sessions). */
export async function listUserSessions(
  userId: number,
  currentSessionId?: string | null,
): Promise<UserSessionView[]> {
  const rows = await db.execute<{ sid: string; expire: Date }>(sql`
    SELECT sid, expire
    FROM user_sessions
    WHERE expire > NOW()
      AND (sess::jsonb->>'userId') = ${String(userId)}
      AND COALESCE((sess::jsonb->>'isAdmin')::boolean, false) = false
    ORDER BY expire DESC
    LIMIT 50
  `);
  return rows.rows.map((row) => ({
    sessionId: row.sid,
    expiresAt: toIsoDate(row.expire) ?? new Date().toISOString(),
    isCurrent: currentSessionId != null && row.sid === currentSessionId,
  }));
}

export type RevokeUserSessionResult = "revoked" | "not_found" | "current_forbidden";

export async function revokeUserSession(
  userId: number,
  sessionId: string,
  currentSessionId?: string | null,
): Promise<RevokeUserSessionResult> {
  if (currentSessionId && sessionId === currentSessionId) {
    return "current_forbidden";
  }
  const result = await db.execute(sql`
    DELETE FROM user_sessions
    WHERE sid = ${sessionId}
      AND expire > NOW()
      AND (sess::jsonb->>'userId') = ${String(userId)}
      AND COALESCE((sess::jsonb->>'isAdmin')::boolean, false) = false
  `);
  return Number(result.rowCount ?? 0) > 0 ? "revoked" : "not_found";
}

export async function revokeOtherUserSessions(
  userId: number,
  currentSessionId: string,
): Promise<number> {
  const result = await db.execute(sql`
    DELETE FROM user_sessions
    WHERE sid <> ${currentSessionId}
      AND (sess::jsonb->>'userId') = ${String(userId)}
      AND COALESCE((sess::jsonb->>'isAdmin')::boolean, false) = false
  `);
  return Number(result.rowCount ?? 0);
}

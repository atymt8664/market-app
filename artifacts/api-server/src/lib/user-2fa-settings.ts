import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { normalizeDbUserSecurityRevision } from "./user-security-revision";

export type User2faSecuritySnapshot = {
  userId: number;
  email: string;
  passwordHash: string;
  totpEnabled: boolean;
  totpSecret: string | null;
  totpEnabledAt: Date | null;
  backupCodesHash: string | null;
  securityRevision: number;
};

export async function getUser2faSecuritySnapshot(
  userId: number,
): Promise<User2faSecuritySnapshot | null> {
  const [row] = await db
    .select({
      userId: usersTable.id,
      email: usersTable.email,
      passwordHash: usersTable.passwordHash,
      totpEnabled: usersTable.totpEnabled,
      totpSecret: usersTable.totpSecret,
      totpEnabledAt: usersTable.totpEnabledAt,
      backupCodesHash: usersTable.backupCodesHash,
      securityRevision: usersTable.securityRevision,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!row) return null;

  return {
    ...row,
    securityRevision: normalizeDbUserSecurityRevision(row.securityRevision),
  };
}

export async function bumpUserSecurityRevision(userId: number): Promise<number> {
  const [updated] = await db
    .update(usersTable)
    .set({
      securityRevision: sql`${usersTable.securityRevision} + 1`,
    })
    .where(eq(usersTable.id, userId))
    .returning({ securityRevision: usersTable.securityRevision });

  return normalizeDbUserSecurityRevision(updated?.securityRevision);
}

export function userHas2faEnabled(snap: { totpSecret: string | null }): boolean {
  return typeof snap.totpSecret === "string" && snap.totpSecret.length > 0;
}

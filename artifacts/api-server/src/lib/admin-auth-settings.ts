import { db, appSettingsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { ensureAppSettingsTable } from "./ensure-app-settings-table";

export type AdminAuthSecuritySnapshot = {
  adminPasswordHash: string;
  admin2faEnabled: boolean;
  admin2faSecret: string | null;
  adminBackupCodesHash: string | null;
  adminSecurityRevision: number;
};

export async function getAdminAuthSecuritySnapshot(): Promise<AdminAuthSecuritySnapshot | null> {
  await ensureAppSettingsTable();
  const rows = await db
    .select({
      adminPasswordHash: appSettingsTable.adminPasswordHash,
      admin2faEnabled: appSettingsTable.admin2faEnabled,
      admin2faSecret: appSettingsTable.admin2faSecret,
      adminBackupCodesHash: appSettingsTable.adminBackupCodesHash,
      adminSecurityRevision: appSettingsTable.adminSecurityRevision,
    })
    .from(appSettingsTable)
    .where(eq(appSettingsTable.id, 1))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const hash =
    row.adminPasswordHash && typeof row.adminPasswordHash === "string"
      ? row.adminPasswordHash
      : "";
  if (!hash) return null;
  return {
    adminPasswordHash: hash,
    admin2faEnabled: Boolean(row.admin2faEnabled),
    admin2faSecret: row.admin2faSecret ?? null,
    adminBackupCodesHash: row.adminBackupCodesHash ?? null,
    adminSecurityRevision: Number(row.adminSecurityRevision ?? 0),
  };
}

export async function bumpAdminSecurityRevision(): Promise<number> {
  await ensureAppSettingsTable();
  await db.execute(
    sql`update app_settings set admin_security_revision = coalesce(admin_security_revision, 0) + 1, updated_at = now() where id = 1`,
  );
  const rows = await db
    .select({ rev: appSettingsTable.adminSecurityRevision })
    .from(appSettingsTable)
    .where(eq(appSettingsTable.id, 1))
    .limit(1);
  return Number(rows[0]?.rev ?? 0);
}

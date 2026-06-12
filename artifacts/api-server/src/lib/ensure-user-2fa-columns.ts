import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

let ensurePromise: Promise<void> | null = null;

/** Boot-time idempotent column ensure for user 2FA (mirrors ensure-app-settings-table pattern). */
export async function ensureUser2faColumns(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret TEXT NULL`);
      await db.execute(
        sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false`,
      );
      await db.execute(
        sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled_at TIMESTAMPTZ NULL`,
      );
      await db.execute(
        sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS backup_codes_hash TEXT NULL`,
      );
      await db.execute(
        sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS security_revision INTEGER NOT NULL DEFAULT 0`,
      );
    })();
  }
  return ensurePromise;
}

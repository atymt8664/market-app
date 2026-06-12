import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

let ensurePromise: Promise<void> | null = null;

export async function ensureUserPrivacyColumns(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await db.execute(
        sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS presence_activity_visible BOOLEAN NOT NULL DEFAULT true`,
      );
      await db.execute(
        sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS presence_last_seen_visible BOOLEAN NOT NULL DEFAULT true`,
      );
    })();
  }
  return ensurePromise;
}

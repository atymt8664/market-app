import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

let ensureCategoryColumnsPromise: Promise<void> | null = null;

export async function ensureCategoryAdminColumns() {
  if (!ensureCategoryColumnsPromise) {
    ensureCategoryColumnsPromise = (async () => {
      await db.execute(
        sql`alter table categories add column if not exists is_hidden boolean not null default false`,
      );
      await db.execute(
        sql`alter table subcategories add column if not exists sort_order integer not null default 0`,
      );
      await db.execute(
        sql`alter table subcategories add column if not exists is_hidden boolean not null default false`,
      );
    })().catch((error) => {
      ensureCategoryColumnsPromise = null;
      throw error;
    });
  }
  await ensureCategoryColumnsPromise;
}

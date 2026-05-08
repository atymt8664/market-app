import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

let ensureAppSettingsPromise: Promise<void> | null = null;

export async function ensureAppSettingsTable() {
  if (!ensureAppSettingsPromise) {
    ensureAppSettingsPromise = (async () => {
      await db.execute(sql`
        create table if not exists app_settings (
          id integer primary key default 1,
          app_name text not null default 'سوق العرب EU',
          app_version text not null default '1.0.0',
          support_email text not null default 'souqarab.market@gmail.com',
          require_ad_approval boolean not null default true,
          reports_enabled boolean not null default true,
          support_enabled boolean not null default true,
          terms_path text not null default '/terms',
          privacy_path text not null default '/privacy',
          updated_at timestamptz not null default now(),
          updated_by_admin_id integer null
        )
      `);
      await db.execute(sql`
        alter table app_settings
        add column if not exists admin_password_hash text
      `);
      await db.execute(sql`
        alter table app_settings
        add column if not exists admin_2fa_enabled boolean not null default false
      `);
      await db.execute(sql`
        alter table app_settings
        add column if not exists admin_2fa_secret text null
      `);
      await db.execute(sql`
        alter table app_settings
        add column if not exists admin_2fa_enabled_at timestamptz null
      `);
      await db.execute(sql`
        alter table app_settings
        add column if not exists admin_backup_codes_hash text null
      `);
      await db.execute(sql`
        alter table app_settings
        add column if not exists admin_security_revision integer not null default 0
      `);
      await db.execute(sql`
        insert into app_settings (
          id,
          app_name,
          app_version,
          support_email,
          require_ad_approval,
          reports_enabled,
          support_enabled,
          terms_path,
          privacy_path
        )
        values (1, 'سوق العرب EU', '1.0.0', 'souqarab.market@gmail.com', true, true, true, '/terms', '/privacy')
        on conflict (id) do nothing
      `);
      await db.execute(sql`
        update app_settings
        set app_name = 'سوق العرب EU'
        where id = 1
          and (
            app_name is null
            or trim(app_name) = ''
            or app_name like '%?%'
            or app_name like '%�%'
          )
      `);
      await db.execute(sql`
        update app_settings
        set app_version = '1.0.0'
        where id = 1
          and (
            app_version is null
            or trim(app_version) = ''
            or app_version like 'admin-%'
            or app_version like '2.%'
          )
      `);
      await db.execute(sql`
        update app_settings
        set support_email = 'souqarab.market@gmail.com'
        where id = 1
          and (
            support_email is null
            or trim(support_email) = ''
            or lower(trim(support_email)) = 'support@souq-arab.eu'
          )
      `);
      await db.execute(sql`
        update app_settings
        set terms_path = '/terms'
        where id = 1
          and (
            terms_path is null
            or trim(terms_path) = ''
            or terms_path not like '/%'
          )
      `);
      await db.execute(sql`
        update app_settings
        set privacy_path = '/privacy'
        where id = 1
          and (
            privacy_path is null
            or trim(privacy_path) = ''
            or privacy_path not like '/%'
          )
      `);

      const adminPasswordHash = String(process.env["ADMIN_PASSWORD_HASH"] || "").trim();
      const looksLikeBcryptHash = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(adminPasswordHash);
      if (looksLikeBcryptHash) {
        const row = await db.execute(
          sql`select admin_password_hash as admin_password_hash from app_settings where id = 1 limit 1`,
        );
        const rows = Array.isArray(row)
          ? (row as Array<{ admin_password_hash?: unknown }>)
          : (row as unknown as { rows?: Array<{ admin_password_hash?: unknown }> }).rows;
        const first = rows?.[0];
        const currentHash =
          first && typeof first.admin_password_hash === "string" ? first.admin_password_hash : "";
        if (!currentHash) {
          await db.execute(
            sql`update app_settings set admin_password_hash = ${adminPasswordHash}, updated_at = now() where id = 1`,
          );
        }
      }
    })().catch((error) => {
      ensureAppSettingsPromise = null;
      throw error;
    });
  }
  await ensureAppSettingsPromise;
}


import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

let ensureCityAdminColumnsPromise: Promise<void> | null = null;

export function ensureCityAdminColumns() {
  if (!ensureCityAdminColumnsPromise) {
    ensureCityAdminColumnsPromise = (async () => {
      await db.execute(sql`
        create table if not exists cities (
          id serial primary key,
          name text not null,
          country_code text not null,
          country_name text not null,
          is_hidden boolean not null default false,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        );
      `);

      await db.execute(
        sql`create unique index if not exists cities_country_code_name_unique on cities (country_code, name);`,
      );
      await db.execute(
        sql`create unique index if not exists cities_country_code_name_lower_unique on cities (lower(country_code), lower(name));`,
      );
      await db.execute(
        sql`create index if not exists cities_country_code_idx on cities (country_code);`,
      );
      await db.execute(
        sql`create index if not exists cities_is_hidden_idx on cities (is_hidden);`,
      );
      await db.execute(
        sql`create index if not exists cities_created_at_idx on cities (created_at);`,
      );
      await db.execute(
        sql`create index if not exists cities_updated_at_idx on cities (updated_at);`,
      );

      await db.execute(sql`
        insert into cities (name, country_code, country_name, is_hidden)
        values
          ('Berlin', 'DE', 'Germany', false),
          ('Hamburg', 'DE', 'Germany', false),
          ('Munich', 'DE', 'Germany', false),
          ('Cologne', 'DE', 'Germany', false),
          ('Frankfurt am Main', 'DE', 'Germany', false)
        on conflict do nothing;
      `);
    })().catch((error) => {
      ensureCityAdminColumnsPromise = null;
      throw error;
    });
  }

  return ensureCityAdminColumnsPromise;
}

import {
  boolean,
  index,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const citiesTable = pgTable(
  "cities",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    countryCode: text("country_code").notNull(),
    countryName: text("country_name").notNull(),
    isHidden: boolean("is_hidden").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uniqueCountryCityName: uniqueIndex("cities_country_code_name_unique").on(
      t.countryCode,
      t.name,
    ),
    countryCodeIdx: index("cities_country_code_idx").on(t.countryCode),
    hiddenIdx: index("cities_is_hidden_idx").on(t.isHidden),
    createdAtIdx: index("cities_created_at_idx").on(t.createdAt),
    updatedAtIdx: index("cities_updated_at_idx").on(t.updatedAt),
  }),
);

export const cityNameCountryUniqueSql = sql`create unique index if not exists cities_country_code_name_lower_unique on cities (lower(country_code), lower(name))`;

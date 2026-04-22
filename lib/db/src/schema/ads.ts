import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { categoriesTable, subcategoriesTable } from "./categories";

export const adsTable = pgTable("ads", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }),
  priceType: text("price_type").notNull().default("fixed"),
  type: text("type").notNull().default("offer"),
  city: text("city").notNull(),
  images: jsonb("images").notNull().default([]),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categoriesTable.id),
  subcategoryId: integer("subcategory_id").references(
    () => subcategoriesTable.id,
  ),
  sellerName: text("seller_name").notNull(),
  sellerPhone: text("seller_phone").notNull(),
  featured: boolean("featured").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AdRow = typeof adsTable.$inferSelect;
export type InsertAd = typeof adsTable.$inferInsert;

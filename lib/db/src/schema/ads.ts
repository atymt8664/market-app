import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { categoriesTable, subcategoriesTable } from "./categories";
import { usersTable } from "./users";

export const adsTable = pgTable("ads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, {
    onDelete: "cascade",
  }),
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
  status: text("status").notNull().default("pending"),
  views: integer("views").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const adViewsTable = pgTable("ad_views", {
  id: serial("id").primaryKey(),
  adId: integer("ad_id")
    .notNull()
    .references(() => adsTable.id, { onDelete: "cascade" }),
  viewerKey: text("viewer_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const adLikesTable = pgTable(
  "ad_likes",
  {
    id: serial("id").primaryKey(),
    adId: integer("ad_id")
      .notNull()
      .references(() => adsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    adUserUnique: uniqueIndex("ad_likes_ad_user_unique").on(t.adId, t.userId),
    adIdx: index("ad_likes_ad_idx").on(t.adId),
  }),
);

export const adFavoritesTable = pgTable(
  "ad_favorites",
  {
    id: serial("id").primaryKey(),
    adId: integer("ad_id")
      .notNull()
      .references(() => adsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    adUserUnique: uniqueIndex("ad_favorites_ad_user_unique").on(
      t.adId,
      t.userId,
    ),
    adIdx: index("ad_favorites_ad_idx").on(t.adId),
  }),
);

export type AdRow = typeof adsTable.$inferSelect;
export type InsertAd = typeof adsTable.$inferInsert;

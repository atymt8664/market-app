import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";

export const categoriesTable = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  icon: text("icon").notNull(),
  subtitle: text("subtitle").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export type Category = typeof categoriesTable.$inferSelect;
export type InsertCategory = typeof categoriesTable.$inferInsert;

export const subcategoriesTable = pgTable("subcategories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categoriesTable.id, { onDelete: "cascade" }),
});

export type Subcategory = typeof subcategoriesTable.$inferSelect;
export type InsertSubcategory = typeof subcategoriesTable.$inferInsert;

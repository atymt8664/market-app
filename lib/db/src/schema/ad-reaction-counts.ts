import { sql } from "drizzle-orm";
import {
  pgTable,
  integer,
  timestamp,
  check,
} from "drizzle-orm/pg-core";
import { adsTable } from "./ads";

/**
 * Denormalized reaction counters (Phase 7A.3c).
 * 1:1 with ads — hot counter row isolated from ads listing/metadata updates.
 */
export const adReactionCountsTable = pgTable(
  "ad_reaction_counts",
  {
    adId: integer("ad_id")
      .primaryKey()
      .references(() => adsTable.id, { onDelete: "cascade" }),
    likeCount: integer("like_count").notNull().default(0),
    favoriteCount: integer("favorite_count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    likeNonNeg: check(
      "ad_reaction_counts_like_nonneg",
      sql`${t.likeCount} >= 0`,
    ),
    favoriteNonNeg: check(
      "ad_reaction_counts_favorite_nonneg",
      sql`${t.favoriteCount} >= 0`,
    ),
  }),
);

export type AdReactionCountRow = typeof adReactionCountsTable.$inferSelect;

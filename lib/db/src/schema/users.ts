import {
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  integer,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  city: text("city").notNull().default(""),
  avatarUrl: text("avatar_url"),
  avatarApprovedUrl: text("avatar_approved_url"),
  avatarPendingReview: boolean("avatar_pending_review").notNull().default(false),
  isBanned: boolean("is_banned").notNull().default(false),
  emailVerified: boolean("email_verified").notNull().default(false),
  accountVerificationStatus: text("account_verification_status").notNull().default("unverified"),
  verificationCode: text("verification_code"),
  verificationExpiresAt: timestamp("verification_expires_at", {
    withTimezone: true,
  }),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpiresAt: timestamp("password_reset_expires_at", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  /** Set when the user's last chat WebSocket disconnects (server-side). */
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  /** TOTP secret (base32); login gate uses secret presence, not totpEnabled alone. */
  totpSecret: text("totp_secret"),
  totpEnabled: boolean("totp_enabled").notNull().default(false),
  totpEnabledAt: timestamp("totp_enabled_at", { withTimezone: true }),
  /** JSON { v: 1, hashes: string[] } of bcrypt-hashed one-time backup codes. */
  backupCodesHash: text("backup_codes_hash"),
  /** Bumped on security-sensitive changes; sessions with stale revision are invalidated. */
  securityRevision: integer("security_revision").notNull().default(0),
  /** When false, online activity is hidden from other users (chat, ads, presence batch). */
  presenceActivityVisible: boolean("presence_activity_visible").notNull().default(true),
  /** When false, last-seen timestamp is hidden from other users. */
  presenceLastSeenVisible: boolean("presence_last_seen_visible").notNull().default(true),
});

export const userFollowsTable = pgTable(
  "user_follows",
  {
    id: serial("id").primaryKey(),
    followerId: integer("follower_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    followingId: integer("following_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pairUnique: uniqueIndex("user_follows_pair_unique").on(
      t.followerId,
      t.followingId,
    ),
    followingIdx: index("user_follows_following_idx").on(t.followingId),
    noSelf: check(
      "user_follows_no_self",
      sql`${t.followerId} <> ${t.followingId}`,
    ),
  }),
);

export const userViewsTable = pgTable(
  "user_views",
  {
    id: serial("id").primaryKey(),
    profileId: integer("profile_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    viewerKey: text("viewer_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pairUnique: uniqueIndex("user_views_pair_unique").on(
      t.profileId,
      t.viewerKey,
    ),
    profileIdx: index("user_views_profile_idx").on(t.profileId),
  }),
);

export type UserRow = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;

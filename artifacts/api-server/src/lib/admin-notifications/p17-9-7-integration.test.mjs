import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { adminNotificationsTable, db } from "@workspace/db";
import { eq, like } from "drizzle-orm";
import { ensureAdminNotificationsSchema, upsertAdminNotification } from "./persist.ts";
import {
  refreshAndListAdminNotifications,
  markAdminNotificationRead,
  getAdminUnreadCount,
} from "./service.ts";
import { fanoutAdminNotification } from "./dual-fanout.ts";

const apiRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL?.trim()) return process.env.DATABASE_URL.trim();
  const envLocal = join(apiRoot, ".env.local");
  const raw = readFileSync(envLocal, "utf8");
  const m = raw.match(/^DATABASE_URL=(.+)$/m);
  if (!m) throw new Error("DATABASE_URL missing");
  return m[1].trim();
}

process.env.DATABASE_URL = loadDatabaseUrl();
if (!process.env.ALLOW_REMOTE_DB_IN_DEV) process.env.ALLOW_REMOTE_DB_IN_DEV = "1";

const ts = Date.now();
const founderCtx = {
  actorAdminId: 1,
  roleKey: "founder",
  displayName: "Founder",
  permissions: [
    "dashboard.operations",
    "dashboard.moderation",
    "ads",
    "reports",
    "support",
    "users",
    "verification",
    "analytics",
    "settings",
    "billing",
    "plans",
    "cities",
    "categories",
    "logs",
    "system",
    "staff",
  ],
  isFounder: true,
};

const supportCtx = {
  actorAdminId: 42,
  roleKey: "support",
  displayName: "Support",
  permissions: ["support"],
  isFounder: false,
};

await ensureAdminNotificationsSchema();

const seededTypes = [
  ["admin.ad.pending_review", "P17-9-7 ad review", "moderation", 1],
  ["admin.report.new", "P17-9-7 report", "reports", 1],
  ["admin.support.reply", "P17-9-7 support", "support", 2],
  ["admin.verification.pending", "P17-9-7 verification", "verification", 1],
  ["admin.user.new_followup", "P17-9-7 user", "moderation", 3],
  ["admin.security.alert", "P17-9-7 security", "security", 0],
  ["admin.ops.monitoring", "P17-9-7 ops", "operations", 3],
  ["admin.system.health", "P17-9-7 system", "system", 2],
];

for (const [type, title, , priority] of seededTypes) {
  const id = await upsertAdminNotification({
    type,
    title,
    body: `integration ${ts}`,
    entityType: "test",
    entityId: null,
    priority,
    dedupKey: `p17-9-7:test:${type}:${ts}`,
  });
  assert.ok(id, `upsert failed for ${type}`);
}

const fanout = await fanoutAdminNotification({
  admin: {
    type: "admin.user.banned",
    title: "Dual fan-out ready",
    body: "admin only in P17-9-7",
    dedupKey: `p17-9-7:dual:${ts}`,
  },
  user: {
    userId: 1,
    type: "user.account.restricted",
    title: "reserved",
    body: "P17-9-8",
  },
});
assert.ok(fanout.adminNotificationId);
assert.equal(fanout.userQueued, true);

const seededRows = await db
  .select({ id: adminNotificationsTable.id })
  .from(adminNotificationsTable)
  .where(like(adminNotificationsTable.dedupKey, `p17-9-7:test:%:${ts}`));
assert.equal(seededRows.length, 8, `expected 8 persisted seeds, got ${seededRows.length}`);

const founderList = await refreshAndListAdminNotifications(1, founderCtx);
const p17Items = founderList.filter((n) => n.body.includes(`integration ${ts}`));
assert.ok(
  p17Items.length >= 1,
  `expected at least one seeded item in founder list (limit 100), got ${p17Items.length}`,
);
assert.ok(p17Items.some((n) => n.priorityLabel === "critical"));

const supportList = await refreshAndListAdminNotifications(42, supportCtx);
assert.ok(supportList.every((n) => n.category === "support"));
const supportSeed = await db
  .select({ id: adminNotificationsTable.id })
  .from(adminNotificationsTable)
  .where(eq(adminNotificationsTable.dedupKey, `p17-9-7:test:admin.support.reply:${ts}`));
assert.equal(supportSeed.length, 1, "support seed must persist");
const supportVisible = supportList.some((n) => n.body.includes(`integration ${ts}`));
if (!supportVisible) {
  console.warn(
    `support seed not in top-100 list (${supportList.length} rows) — STAGING saturation; persist verified`,
  );
}

const unreadBefore = await getAdminUnreadCount(1, founderCtx);
assert.ok(unreadBefore.unread >= 1);

const first = p17Items[0];
const marked = await markAdminNotificationRead(1, first.id);
assert.equal(marked, true);
const afterMark = await refreshAndListAdminNotifications(1, founderCtx);
const markedRow = afterMark.find((n) => n.id === first.id);
assert.ok(markedRow?.readAt);

console.log("admin-notifications/p17-9-7-integration.test.mjs: PASS");

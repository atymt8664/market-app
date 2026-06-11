import assert from "node:assert/strict";
import {
  normalizeAdminNotificationType,
  priorityLabel,
  resolveAdminTypeRule,
  ADMIN_NOTIFICATION_CATEGORY_VALUES,
} from "./catalog.ts";

assert.equal(normalizeAdminNotificationType("  Admin.AD.Pending  "), "admin.ad.pending");
assert.equal(resolveAdminTypeRule("admin.ad.pending").category, "moderation");
assert.equal(resolveAdminTypeRule("admin.report.new").category, "reports");
assert.equal(resolveAdminTypeRule("admin.support.reply").category, "support");
assert.equal(resolveAdminTypeRule("admin.verification.pending").category, "verification");
assert.equal(resolveAdminTypeRule("admin.ops.sla_breach").category, "operations");
assert.equal(resolveAdminTypeRule("admin.ops.sla_breach").priority, 0);
assert.equal(resolveAdminTypeRule("admin.security.breach").category, "security");
assert.equal(resolveAdminTypeRule("admin.security.breach").priority, 0);
assert.equal(resolveAdminTypeRule("admin.system.health").category, "system");
assert.equal(priorityLabel(0), "critical");
assert.equal(priorityLabel(3), "low");
assert.equal(ADMIN_NOTIFICATION_CATEGORY_VALUES.length, 7);

console.log("admin-notifications/catalog.test.mjs: PASS");

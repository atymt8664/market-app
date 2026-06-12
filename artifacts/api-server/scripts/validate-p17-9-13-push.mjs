import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const apiRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const souqRoot = join(apiRoot, "../souq");
const iconsDir = join(souqRoot, "public/icons");

const policy = readFileSync(join(apiRoot, "src/lib/push/delivery-policy.ts"), "utf8");
assert.ok(policy.includes("return false"), "delivery-policy must not skip push on WS");

const delivery = readFileSync(join(apiRoot, "src/lib/push/push-delivery.ts"), "utf8");
assert.ok(delivery.includes("push_skipped_no_subscription"), "push-delivery missing subscription log");

const conversations = readFileSync(join(apiRoot, "src/routes/conversations.ts"), "utf8");
assert.ok(conversations.includes("notifyMessageReceived"), "conversations missing message push producer");

const messageNotif = readFileSync(join(apiRoot, "src/lib/message-notifications.ts"), "utf8");
assert.ok(messageNotif.includes("createNotification"), "message-notifications missing createNotification");

const layout = readFileSync(join(souqRoot, "src/components/layout.tsx"), "utf8");
assert.ok(layout.includes("NotificationPermissionPrompt"), "layout missing permission opt-in flow");
assert.ok(layout.includes("PushForegroundBanner"), "layout missing foreground push banner");

const sw = readFileSync(join(souqRoot, "public/sw.js"), "utf8");
assert.ok(sw.includes("v10-p17-9-13-foreground-banner"), "sw.js missing P17-9-13 v10 cache version");
assert.ok(sw.includes("souq:push-foreground"), "sw.js missing foreground banner message");
assert.ok(sw.includes("notification-badge-96.png"), "sw.js missing monochrome badge");
assert.ok(!sw.includes('badge: "/icons/pwa-icon-192.png"'), "sw.js still uses color icon as badge");

const badgeSvg = readFileSync(join(iconsDir, "notification-badge.svg"), "utf8");
assert.ok(badgeSvg.includes("SA monogram") || badgeSvg.includes('fill="#FFFFFF"'), "badge svg missing monochrome SA");

for (const name of [
  "notification-badge.svg",
  "notification-badge-24.png",
  "notification-badge-48.png",
  "notification-badge-72.png",
  "notification-badge-96.png",
  "notification-large-192.png",
]) {
  assert.ok(existsSync(join(iconsDir, name)), `missing icons/${name}`);
}

const r = spawnSync(process.execPath, ["--import", "tsx/esm", join(apiRoot, "src/lib/push/p17-9-4-push.test.mjs")], {
  stdio: "inherit",
});
assert.equal(r.status, 0, "p17-9-4-push.test.mjs failed");

const r2 = spawnSync(process.execPath, ["--import", "tsx/esm", join(apiRoot, "src/lib/message-notifications.test.mjs")], {
  stdio: "inherit",
});
assert.equal(r2.status, 0, "message-notifications.test.mjs failed");

console.log("p17-9-13:validate PASS");

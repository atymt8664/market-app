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

const sw = readFileSync(join(souqRoot, "public/sw.js"), "utf8");
assert.ok(sw.includes("v7-p17-9-13-branding"), "sw.js missing P17-9-13 cache version");
assert.ok(sw.includes("notification-badge-96.png"), "sw.js missing monochrome badge");
assert.ok(!sw.includes('badge: "/icons/pwa-icon-192.png"'), "sw.js still uses color icon as badge");

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

console.log("p17-9-13:validate PASS");

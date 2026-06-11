import assert from "node:assert/strict";
import {
  hasOfficialTemplate,
  OFFICIAL_TEMPLATE_TYPE_KEYS,
  officialNotificationContent,
  resolveOfficialCommunication,
} from "./index.ts";
import { formatSlaWindow } from "./sla-window.ts";
import { getAdminPresetsForContext } from "./admin-presets.ts";

assert.equal(hasOfficialTemplate("ad.approved"), true);
assert.equal(hasOfficialTemplate("message.received"), false);
assert.ok(OFFICIAL_TEMPLATE_TYPE_KEYS.length >= 37);

const adApproved = officialNotificationContent({ type: "ad.approved" });
assert.ok(adApproved);
assert.equal(adApproved.title, "🎉 تم نشر إعلانك بنجاح");
assert.ok(adApproved.body.includes("أصبح إعلانك متاحًا"));

const pending = resolveOfficialCommunication({
  type: "ad.pending_review",
  slaWindow: "من 5 دقائق إلى 30 دقيقة",
});
assert.ok(pending);
assert.ok(pending.body.includes("من 5 دقائق إلى 30 دقيقة"));
assert.ok(!pending.body.includes("{{sla_window}}"));

const report = officialNotificationContent({
  type: "report.received",
  slaProfile: { key: "default", labelKey: "p8i.sla.default", minMinutes: 60, maxMinutes: 360, approachingRatio: 0.75 },
});
assert.ok(report);
assert.ok(report.body.includes("60 دقيقة") || report.body.includes("ساعة"));

const slaLabel = formatSlaWindow({
  key: "new",
  labelKey: "p8i.sla.ad_new",
  minMinutes: 5,
  maxMinutes: 30,
  approachingRatio: 0.75,
});
assert.equal(slaLabel, "من 5 دقيقة إلى 30 دقيقة");

assert.equal(getAdminPresetsForContext("reports").length, 6);
assert.equal(getAdminPresetsForContext("support").length, 5);
assert.equal(getAdminPresetsForContext("verification").length, 5);

const customReport = resolveOfficialCommunication({
  type: "report.resolved.custom",
  reason: "سبب مخصص من الإدارة.",
});
assert.ok(customReport);
assert.ok(customReport.body.includes("سبب مخصص من الإدارة."));
assert.ok(!customReport.body.includes("{{reason}}"));

console.log("communications.test.mjs: PASS");

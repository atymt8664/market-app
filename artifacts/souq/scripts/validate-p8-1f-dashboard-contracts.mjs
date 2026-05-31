#!/usr/bin/env node
/**
 * P8-1F — Dashboard contracts registry + UI wiring validation.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DASHBOARD_CONTRACTS,
  getDashboardContract,
} from "../src/features/admin/dashboard-contracts.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function assert(cond, msg) {
  if (!cond) errors.push(msg);
}

const REQUIRED_FIELDS = [
  "id",
  "dashboard",
  "name",
  "api",
  "responsePath",
  "source",
  "meaning",
  "calculation",
  "loadingState",
  "errorState",
];

const ids = new Set();
for (const contract of DASHBOARD_CONTRACTS) {
  for (const field of REQUIRED_FIELDS) {
    assert(typeof contract[field] === "string" && contract[field].length > 0, `${contract.id || "?"}: missing ${field}`);
  }
  assert(!ids.has(contract.id), `duplicate contract id: ${contract.id}`);
  ids.add(contract.id);
}

const surfaces = ["main", "analytics", "operations", "monitoring"];
for (const surface of surfaces) {
  const count = DASHBOARD_CONTRACTS.filter((c) => c.dashboard === surface).length;
  assert(count >= 3, `expected >=3 contracts for dashboard=${surface}, got ${count}`);
}

const wiredUiFiles = [
  "src/features/admin/components/dashboard-home.tsx",
  "src/pages/admin-stats.tsx",
  "src/pages/admin-operations.tsx",
  "src/pages/admin-monitoring.tsx",
  "src/features/admin/components/notification-center-foundation.tsx",
  "src/features/admin/components/roles-permissions-foundation.tsx",
];

for (const rel of wiredUiFiles) {
  const content = readFileSync(join(root, rel), "utf8");
  assert(content.includes("dashboardContractAttrs"), `${rel}: missing dashboardContractAttrs import/usage`);
}

const sampleIds = [
  "noc.executive.today.new_users",
  "noc.user.online_now",
  "analytics.totals.users",
  "operations.health.total_open",
  "monitoring.overall_status",
];
for (const id of sampleIds) {
  assert(getDashboardContract(id) != null, `missing contract: ${id}`);
}

const adminRoute = readFileSync(join(root, "../api-server/src/routes/admin.ts"), "utf8");
assert(
  !adminRoute.includes("queueCenter: { ...noc.queueCenter"),
  "admin.ts: queueCenter must remain an array for non-founder roles (P8-1F regression)",
);

const docs = readFileSync(join(root, "../../docs/architecture/P08-dashboard-contracts.md"), "utf8");
assert(docs.includes("P8-1F"), "P08-dashboard-contracts.md must document P8-1F");
assert(docs.includes("GET /api/admin/dashboard"), "docs must reference dashboard API");

if (errors.length) {
  console.error("[P8-1F Dashboard Contracts] FAIL\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}

console.log(
  `[P8-1F Dashboard Contracts] PASS — ${DASHBOARD_CONTRACTS.length} contracts, ${wiredUiFiles.length} UI surfaces wired`,
);

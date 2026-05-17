import assert from "node:assert/strict";
import { LatencyTracker } from "./latency-tracker.ts";

const tracker = new LatencyTracker(10);
for (const v of [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200]) {
  tracker.record(v);
}

const snap = tracker.snapshot();
assert.equal(snap.count, 10);
assert.ok(snap.p50Ms !== null);
assert.ok(snap.p95Ms !== null);
assert.ok(snap.p99Ms !== null);
assert.ok(snap.p95Ms >= snap.p50Ms);

console.log("latency-tracker.test.mjs: ok");

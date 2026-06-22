import assert from "node:assert/strict";
import { computeHomeFeedSnapshot } from "./home-feed-snapshot.ts";

const ad = (id, createdAt) => ({ id, createdAt });

const snap = computeHomeFeedSnapshot(
  [ad(10, "2026-06-20T10:00:00.000Z")],
  [ad(12, "2026-06-21T12:00:00.000Z"), ad(11, "2026-06-21T12:00:00.000Z")],
);
assert.equal(snap.afterId, 12);
assert.equal(snap.since, "2026-06-21T12:00:00.000Z");

const empty = computeHomeFeedSnapshot([], [], "2026-06-22T08:00:00.000Z");
assert.equal(empty.afterId, 0);
assert.equal(empty.since, "2026-06-22T08:00:00.000Z");

console.log("home-feed-snapshot.test.mjs PASS");

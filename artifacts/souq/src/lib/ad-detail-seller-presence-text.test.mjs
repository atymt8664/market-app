import assert from "node:assert/strict";
import test from "node:test";

/** Mirror resolveAdDetailSellerPresenceText — no i18n in node tests. */
function resolvePresenceShape(entry, isLoading) {
  if (isLoading) return null;
  if (!entry || entry.visibility === "hidden") return null;
  if (entry.isOnline) return { kind: "online" };
  if (entry.lastSeenAt) return { kind: "last_seen" };
  return null;
}

test("online → online badge", () => {
  const r = resolvePresenceShape(
    { visibility: "full", isOnline: true, lastSeenAt: null },
    false,
  );
  assert.equal(r?.kind, "online");
});

test("offline + lastSeenAt → last_seen badge", () => {
  const r = resolvePresenceShape(
    { visibility: "full", isOnline: false, lastSeenAt: "2026-06-09T10:00:00.000Z" },
    false,
  );
  assert.equal(r?.kind, "last_seen");
});

test("offline + no lastSeenAt → no badge (not offline text)", () => {
  const r = resolvePresenceShape(
    { visibility: "full", isOnline: false, lastSeenAt: null },
    false,
  );
  assert.equal(r, null);
});

test("hidden visibility → no badge", () => {
  assert.equal(resolvePresenceShape({ visibility: "hidden" }, false), null);
});

test("loading → no badge", () => {
  assert.equal(
    resolvePresenceShape(
      { visibility: "full", isOnline: true, lastSeenAt: null },
      true,
    ),
    null,
  );
});

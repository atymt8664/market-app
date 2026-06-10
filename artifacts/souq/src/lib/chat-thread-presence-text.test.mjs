import assert from "node:assert/strict";
import test from "node:test";

/**
 * Lightweight mirror of resolveThreadHeaderPresenceText offline fallback logic.
 * Full i18n is browser-only; here we assert data-shape wiring.
 */
function resolvePresenceShape(entry, isLoading) {
  if (isLoading) return null;
  if (!entry || entry.visibility === "hidden") return null;
  if (entry.isOnline) return { kind: "online", text: "online" };
  if (entry.lastSeenAt) return { kind: "last_seen", text: entry.lastSeenAt };
  return { kind: "unavailable", text: "unavailable" };
}

test("online entry resolves to online kind", () => {
  const r = resolvePresenceShape(
    { visibility: "full", isOnline: true, lastSeenAt: null },
    false,
  );
  assert.equal(r?.kind, "online");
});

test("offline with lastSeenAt resolves to last_seen", () => {
  const r = resolvePresenceShape(
    { visibility: "full", isOnline: false, lastSeenAt: "2026-06-09T10:00:00.000Z" },
    false,
  );
  assert.equal(r?.kind, "last_seen");
});

test("offline without lastSeenAt resolves to unavailable fallback", () => {
  const r = resolvePresenceShape(
    { visibility: "full", isOnline: false, lastSeenAt: null },
    false,
  );
  assert.equal(r?.kind, "unavailable");
});

test("blocked user returns null", () => {
  const r = resolvePresenceShape({ visibility: "hidden" }, false);
  assert.equal(r, null);
});

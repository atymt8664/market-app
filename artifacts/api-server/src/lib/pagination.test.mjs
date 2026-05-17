import assert from "node:assert/strict";
import { ListAdsQueryParams } from "../../../../lib/api-zod/src/generated/api.ts";
import {
  clampLimit,
  decodeCursor,
  encodeCursor,
  finalizePage,
  parsePaginationQuery,
  PaginationError,
  sanitizeQueryLimit,
} from "./pagination.ts";

const profile = { default: 50, max: 100 };

assert.equal(clampLimit(undefined, profile), 50);
assert.equal(clampLimit(9999, profile), 100);
assert.equal(clampLimit(999999, profile), 100);
assert.equal(clampLimit(0, profile), 50);
assert.equal(clampLimit(-5, profile), 50);
assert.equal(clampLimit("abc", profile), 50);
assert.equal(clampLimit(10, profile), 10);

assert.equal(sanitizeQueryLimit({ limit: "999999" }, profile).limit, 100);
assert.equal(sanitizeQueryLimit({ limit: "-5" }, profile).limit, 50);
assert.equal(sanitizeQueryLimit({ limit: "abc" }, profile).limit, 50);
assert.equal(sanitizeQueryLimit({ limit: "0" }, profile).limit, 50);
assert.equal(sanitizeQueryLimit({ limit: "10" }, profile).limit, 10);

const limitCases = [
  ["999999", 100],
  ["-5", 50],
  ["abc", 50],
  ["0", 50],
  ["10", 10],
];
for (const [raw, expected] of limitCases) {
  const parsed = ListAdsQueryParams.parse({ limit: raw });
  assert.equal(
    parsed.limit,
    expected,
    `ListAdsQueryParams limit=${raw} expected ${expected} got ${parsed.limit}`,
  );
  const pag = parsePaginationQuery({ limit: raw }, profile);
  assert.equal(pag.limit, expected, `parsePaginationQuery limit=${raw}`);
}

const at = new Date("2024-06-01T12:00:00.000Z");
const encoded = encodeCursor(at, 42);
const decoded = decodeCursor(encoded);
assert.ok(decoded);
assert.equal(decoded.id, 42);
assert.equal(decoded.at.toISOString(), at.toISOString());
assert.equal(decodeCursor("not-valid"), null);

assert.throws(
  () => parsePaginationQuery({ cursor: "bad" }, profile),
  PaginationError,
);

const rows = Array.from({ length: 6 }, (_, i) => ({ id: i + 1, createdAt: new Date() }));
const page = finalizePage(rows, 5, (r) => ({ at: r.createdAt, id: r.id }));
assert.equal(page.items.length, 5);
assert.equal(page.meta.hasMore, true);
assert.ok(page.meta.nextCursor);

const lastPage = finalizePage([rows[0]], 5, (r) => ({ at: r.createdAt, id: r.id }));
assert.equal(lastPage.meta.hasMore, false);
assert.equal(lastPage.meta.nextCursor, null);

console.log("pagination.test.mjs: ok");

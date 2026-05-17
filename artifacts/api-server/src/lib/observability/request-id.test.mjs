import assert from "node:assert/strict";
import { createRequestId, resolveRequestId } from "./request-id.ts";

const id = createRequestId();
assert.match(id, /^[0-9a-f-]{36}$/i);

assert.equal(resolveRequestId(id), id);
assert.notEqual(resolveRequestId("bad-id"), "bad-id");
assert.notEqual(resolveRequestId(undefined), "");

console.log("request-id.test.mjs: ok");

import assert from "node:assert/strict";
import {
  isTechnicalUserText,
  isUserSafeMessage,
  parseUserApiErrorBody,
} from "./user-api-errors.ts";

assert.equal(isTechnicalUserText('{"message":"x","code":"DUPLICATE_REPORT"}'), true);
assert.equal(isTechnicalUserText("DUPLICATE_REPORT"), true);
assert.equal(isTechnicalUserText("HTTP 409 Conflict"), true);
assert.equal(isUserSafeMessage("لقد أبلغت عن هذا المحتوى مسبقاً"), true);
assert.equal(isUserSafeMessage("VALIDATION_ERROR"), false);

const duplicateBody = parseUserApiErrorBody(
  JSON.stringify({
    message: "لقد أبلغت عن هذا المحتوى مسبقاً مؤخراً",
    code: "DUPLICATE_REPORT",
  }),
);
assert.ok(duplicateBody);
assert.equal(duplicateBody.code, "DUPLICATE_REPORT");
assert.equal(duplicateBody.message?.includes("مسبقاً"), true);

const generic = parseUserApiErrorBody('{"code":"INTERNAL_ERROR"}');
assert.equal(generic?.code, "INTERNAL_ERROR");

console.log("user-api-errors.test.mjs: PASS");

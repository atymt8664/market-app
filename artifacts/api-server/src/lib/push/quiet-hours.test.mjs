import assert from "node:assert/strict";
import { isWithinQuietHours, localTimeHm } from "./quiet-hours.ts";

const tz = "Europe/Berlin";

assert.equal(localTimeHm(new Date("2026-05-24T20:00:00Z"), tz).length, 5);

assert.equal(
  isWithinQuietHours(new Date("2026-05-24T21:00:00+02:00"), "22:00", "08:00", tz),
  false,
);

assert.equal(
  isWithinQuietHours(new Date("2026-05-24T23:30:00+02:00"), "22:00", "08:00", tz),
  true,
);

assert.equal(
  isWithinQuietHours(new Date("2026-05-25T06:00:00+02:00"), "22:00", "08:00", tz),
  true,
);

assert.equal(
  isWithinQuietHours(new Date("2026-05-25T10:00:00+02:00"), "22:00", "08:00", tz),
  false,
);

console.log("quiet-hours.test.mjs: ok");

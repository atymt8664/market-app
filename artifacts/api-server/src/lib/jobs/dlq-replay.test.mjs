import assert from "node:assert/strict";

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres.test:pass@localhost:5432/test";

const { JOB_ENVELOPE_VERSION } = await import("./constants");
const { REGISTERED_JOB_NAMES } = await import("./registry");
const { listDlqJobsForOps, replayDeadLetterJob } = await import("./dlq-replay");

function mockEnvelope(jobName) {
  return {
    v: JOB_ENVELOPE_VERSION,
    envRef: "test",
    jobName,
    idempotencyKey: "test:key",
    payload: { probe: true },
  };
}

const fakeJobs = [
  {
    id: "dlq-1",
    state: "created",
    retryCount: 5,
    createdOn: new Date("2026-05-31T00:00:00Z"),
    data: mockEnvelope("auth.otp"),
  },
  {
    id: "dlq-2",
    state: "created",
    retryCount: 3,
    createdOn: new Date("2026-05-31T01:00:00Z"),
    data: { v: 1, envRef: "test", payload: {} },
  },
];

const fakeBoss = {
  findJobs: async (_name, opts) => {
    if (opts?.id) return fakeJobs.filter((j) => j.id === opts.id);
    return fakeJobs;
  },
};

const summaries = await listDlqJobsForOps(fakeBoss, 10);
assert.equal(summaries.length, 2);
assert.equal(summaries[0]?.sourceQueue, "auth.otp");
assert.equal(summaries[0]?.hasReplayMetadata, true);
assert.equal(summaries[1]?.hasReplayMetadata, false);

await assert.rejects(
  () => replayDeadLetterJob(fakeBoss, "dlq-2"),
  /missing jobName metadata/,
);

await assert.rejects(
  () => replayDeadLetterJob(fakeBoss, "missing"),
  /not found/,
);

for (const name of REGISTERED_JOB_NAMES) {
  assert.ok(name.length > 0, "registered job name non-empty");
}

console.log("dlq-replay.test.mjs PASS");

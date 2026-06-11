import type { Job } from "pg-boss";
import type { BroadcastFanoutJobPayload } from "../broadcast-types";
import { BROADCAST_JOB_TYPES, registerJobHandler } from "../registry";
import type { JobEnvelope } from "../types";
import { logger } from "../../logger";
import { processBroadcastFanoutBatch } from "../../platform-broadcasts/fanout";
import { markBroadcastFailed } from "../../platform-broadcasts/persist";

function parseEnvelope<T>(data: unknown): JobEnvelope<T> {
  if (!data || typeof data !== "object") {
    throw new Error("invalid job envelope");
  }
  const envelope = data as JobEnvelope<T>;
  if (envelope.v !== 1 || !envelope.payload) {
    throw new Error("unsupported job envelope version");
  }
  return envelope;
}

async function handleBroadcastFanout(jobs: Job[]): Promise<void> {
  for (const job of jobs) {
    const envelope = parseEnvelope<BroadcastFanoutJobPayload>(job.data);
    const payload = envelope.payload;
    if (
      !Number.isInteger(payload.broadcastId) ||
      payload.broadcastId <= 0 ||
      !Number.isInteger(payload.cursorUserId) ||
      payload.cursorUserId < 0
    ) {
      throw new Error("broadcast.fanout payload invalid");
    }

    try {
      await processBroadcastFanoutBatch(payload);
      logger.info(
        {
          jobId: job.id,
          broadcastId: payload.broadcastId,
          cursorUserId: payload.cursorUserId,
        },
        "P17-9-17 broadcast.fanout batch processed",
      );
    } catch (err) {
      logger.error(
        { err, broadcastId: payload.broadcastId, jobId: job.id },
        "P17-9-17 broadcast.fanout batch failed",
      );
      await markBroadcastFailed(payload.broadcastId);
      throw err;
    }
  }
}

export function registerBroadcastJobHandlers(): void {
  registerJobHandler({
    name: BROADCAST_JOB_TYPES.FANOUT,
    handler: handleBroadcastFanout,
  });
}

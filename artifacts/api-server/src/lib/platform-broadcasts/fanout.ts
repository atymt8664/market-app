import { createNotification } from "../create-notification";
import { logger } from "../logger";
import {
  enqueueBroadcastFanout,
  isJobQueueEnabled,
  startQueueModule,
} from "../jobs";
import { broadcastDedupKey } from "./catalog";
import {
  getBroadcastById,
  listBroadcastRecipientIds,
  markBroadcastCompleted,
  markBroadcastFailed,
  updateBroadcastFanoutProgress,
} from "./persist";
import { assertBroadcastSendAllowed } from "./safety";
import type { BroadcastAudience } from "./types";

export type BroadcastFanoutPayload = {
  broadcastId: number;
  cursorUserId: number;
};

async function deliverToUser(
  broadcastId: number,
  userId: number,
  notificationType: string,
  title: string,
  body: string,
  category: string,
): Promise<boolean> {
  try {
    await createNotification({
      userId,
      type: notificationType,
      title,
      body,
      entityType: "platform_broadcast",
      entityId: broadcastId,
      dedupKey: broadcastDedupKey(broadcastId, userId),
      metadata: {
        broadcastId,
        category,
        source: "platform_broadcast",
      },
    });
    return true;
  } catch (err) {
    logger.warn(
      { err, broadcastId, userId, kind: "broadcast_delivery_failed" },
      "P17-9-17 broadcast user delivery failed",
    );
    return false;
  }
}

export async function processBroadcastFanoutBatch(
  payload: BroadcastFanoutPayload,
): Promise<void> {
  const broadcast = await getBroadcastById(payload.broadcastId);
  if (!broadcast) {
    throw new Error(`broadcast ${payload.broadcastId} not found`);
  }
  if (broadcast.status !== "sending") {
    logger.info(
      { broadcastId: broadcast.id, status: broadcast.status },
      "P17-9-17 fanout skipped — broadcast not in sending state",
    );
    return;
  }

  const audience = broadcast.audience as BroadcastAudience;
  const userIds = await listBroadcastRecipientIds(
    audience,
    payload.cursorUserId,
  );

  if (userIds.length === 0) {
    await markBroadcastCompleted(broadcast.id);
    logger.info(
      { broadcastId: broadcast.id, delivered: broadcast.deliveredCount },
      "P17-9-17 broadcast fan-out completed",
    );
    return;
  }

  let delivered = 0;
  let failed = 0;
  let lastCursor = payload.cursorUserId;

  for (const userId of userIds) {
    lastCursor = userId;
    const ok = await deliverToUser(
      broadcast.id,
      userId,
      broadcast.notificationType,
      broadcast.title,
      broadcast.body,
      broadcast.category,
    );
    if (ok) delivered += 1;
    else failed += 1;
  }

  await updateBroadcastFanoutProgress(broadcast.id, {
    lastCursorUserId: lastCursor,
    deliveredDelta: delivered,
    failedDelta: failed,
  });

  const nextBatch = await listBroadcastRecipientIds(audience, lastCursor, 1);
  if (nextBatch.length > 0) {
    await enqueueNextFanoutBatch(broadcast.id, lastCursor);
    return;
  }

  await markBroadcastCompleted(broadcast.id);
  logger.info(
    {
      broadcastId: broadcast.id,
      deliveredDelta: delivered,
      failedDelta: failed,
    },
    "P17-9-17 broadcast fan-out completed",
  );
}

async function enqueueNextFanoutBatch(
  broadcastId: number,
  cursorUserId: number,
): Promise<void> {
  if (!isJobQueueEnabled()) {
    await processBroadcastFanoutBatch({ broadcastId, cursorUserId });
    return;
  }
  const boss = await startQueueModule();
  await enqueueBroadcastFanout(boss, { broadcastId, cursorUserId });
}

export async function startBroadcastFanout(broadcastId: number): Promise<void> {
  const broadcast = await getBroadcastById(broadcastId);
  if (!broadcast) throw new Error("broadcast not found");
  assertBroadcastSendAllowed(broadcast.audience as BroadcastAudience);

  if (isJobQueueEnabled()) {
    const boss = await startQueueModule();
    await enqueueBroadcastFanout(boss, { broadcastId, cursorUserId: 0 });
    return;
  }

  void processBroadcastFanoutBatch({ broadcastId, cursorUserId: 0 }).catch(
    async (err) => {
      logger.error({ err, broadcastId }, "P17-9-17 inline fan-out failed");
      await markBroadcastFailed(broadcastId);
    },
  );
}

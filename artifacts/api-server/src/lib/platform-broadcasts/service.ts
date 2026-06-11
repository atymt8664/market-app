import { createHash } from "node:crypto";
import { isBroadcastCategory, resolveBroadcastNotificationType } from "./catalog";
import { startBroadcastFanout } from "./fanout";
import {
  countBroadcastRecipients,
  createBroadcastDraft,
  getBroadcastById,
  listBroadcasts,
  markBroadcastSending,
} from "./persist";
import {
  assertBroadcastFeatureEnabled,
  assertBroadcastSendAllowed,
  BroadcastSafetyError,
} from "./safety";
import type {
  BroadcastAudience,
  BroadcastListItem,
  BroadcastPreview,
  CreateBroadcastInput,
} from "./types";
import { BROADCAST_AUDIENCES } from "./types";

function isBroadcastAudience(value: string): value is BroadcastAudience {
  return (BROADCAST_AUDIENCES as readonly string[]).includes(value);
}

export function buildBroadcastPreview(input: {
  category: string;
  title: string;
  body: string;
  audience: string;
}): BroadcastPreview {
  if (!isBroadcastCategory(input.category)) {
    throw new Error("invalid broadcast category");
  }
  const audience = isBroadcastAudience(input.audience) ? input.audience : "all_users";
  return {
    category: input.category,
    notificationType: resolveBroadcastNotificationType(input.category),
    title: input.title.trim().slice(0, 300),
    body: input.body.trim().slice(0, 4000),
    audience,
    estimatedRecipients: 0,
  };
}

export async function previewBroadcast(input: {
  category: string;
  title: string;
  body: string;
  audience: string;
}): Promise<BroadcastPreview> {
  assertBroadcastFeatureEnabled();
  const preview = buildBroadcastPreview(input);
  preview.estimatedRecipients = await countBroadcastRecipients(preview.audience);
  return preview;
}

export async function createBroadcast(
  input: CreateBroadcastInput,
): Promise<BroadcastListItem> {
  assertBroadcastFeatureEnabled();
  if (!isBroadcastCategory(input.category)) {
    throw new Error("invalid broadcast category");
  }
  if (!input.title.trim()) throw new Error("title required");
  if (!input.body.trim()) throw new Error("body required");
  const audience = input.audience ?? "all_users";
  assertBroadcastSendAllowed(audience);
  return createBroadcastDraft({ ...input, audience });
}

export async function sendBroadcast(
  broadcastId: number,
  confirmToken: string,
): Promise<BroadcastListItem> {
  assertBroadcastFeatureEnabled();
  const broadcast = await getBroadcastById(broadcastId);
  if (!broadcast) throw new Error("broadcast not found");
  if (broadcast.status !== "draft") {
    throw new BroadcastSafetyError(
      "BROADCAST_ALREADY_SENT",
      "Broadcast already sent or in progress",
    );
  }

  const audience = broadcast.audience as BroadcastAudience;
  assertBroadcastSendAllowed(audience);

  const expectedToken = createHash("sha256")
    .update(`${broadcast.id}:${broadcast.title}:${broadcast.body}`)
    .digest("hex")
    .slice(0, 12);
  if (confirmToken.trim() !== expectedToken) {
    throw new BroadcastSafetyError(
      "BROADCAST_CONFIRM_MISMATCH",
      "Confirmation token mismatch — preview again before send",
    );
  }

  const recipientCount = await countBroadcastRecipients(audience);
  if (recipientCount === 0) {
    throw new BroadcastSafetyError(
      "BROADCAST_NO_RECIPIENTS",
      "No eligible recipients for this audience",
    );
  }

  const sendKey = `send:${broadcast.id}:${expectedToken}`;
  const marked = await markBroadcastSending(broadcastId, recipientCount, sendKey);
  if (!marked) {
    throw new BroadcastSafetyError(
      "BROADCAST_ALREADY_SENT",
      "Broadcast already sent or in progress",
    );
  }

  await startBroadcastFanout(broadcastId);

  const updated = await getBroadcastById(broadcastId);
  if (!updated) throw new Error("broadcast not found after send");
  return {
    id: updated.id,
    category: updated.category as BroadcastListItem["category"],
    notificationType: updated.notificationType,
    title: updated.title,
    body: updated.body,
    audience: updated.audience as BroadcastAudience,
    status: updated.status as BroadcastListItem["status"],
    createdByAdminActorId: updated.createdByAdminActorId,
    sentAt: updated.sentAt?.toISOString() ?? null,
    completedAt: updated.completedAt?.toISOString() ?? null,
    recipientCount: updated.recipientCount,
    deliveredCount: updated.deliveredCount,
    failedCount: updated.failedCount,
    createdAt: updated.createdAt.toISOString(),
  };
}

export async function getBroadcastHistory(): Promise<BroadcastListItem[]> {
  assertBroadcastFeatureEnabled();
  return listBroadcasts(100);
}

export function buildBroadcastConfirmToken(input: {
  id: number;
  title: string;
  body: string;
}): string {
  return createHash("sha256")
    .update(`${input.id}:${input.title}:${input.body}`)
    .digest("hex")
    .slice(0, 12);
}

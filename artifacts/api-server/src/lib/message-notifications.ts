import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { createNotification } from "./create-notification";
import { logger } from "./logger";
import {
  buildMessageReceivedCopy,
  sanitizeSenderNameForLockScreen,
} from "./message-notification-copy";

export { buildMessageReceivedCopy, sanitizeSenderNameForLockScreen } from "./message-notification-copy";

export type MessageReceivedNotifyInput = {
  recipientUserId: number;
  senderUserId: number;
  conversationId: number;
  messageId: number;
};

/**
 * P17-9-13 — OS push for chat messages (producer for message.received).
 * Call only when recipient is not focused on this conversation.
 */
export async function notifyMessageReceived(input: MessageReceivedNotifyInput): Promise<void> {
  const { recipientUserId, senderUserId, conversationId, messageId } = input;
  if (!Number.isInteger(recipientUserId) || recipientUserId <= 0) return;
  if (recipientUserId === senderUserId) return;

  let senderName: string | null = null;
  try {
    const [row] = await db
      .select({ name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, senderUserId))
      .limit(1);
    if (row?.name) senderName = sanitizeSenderNameForLockScreen(row.name);
  } catch (err) {
    logger.warn({ err, senderUserId }, "message notification sender lookup failed");
  }

  const copy = buildMessageReceivedCopy(senderName);

  try {
    await createNotification({
      userId: recipientUserId,
      type: "message.received",
      title: copy.title,
      body: copy.body,
      entityType: "conversation",
      entityId: conversationId,
      metadata: {
        conversationId,
        messageId,
        senderUserId,
      },
      dedupKey: `msg:${recipientUserId}:${conversationId}:${messageId}`,
    });
  } catch (err) {
    logger.warn(
      { err, recipientUserId, conversationId, messageId },
      "message.received notification failed",
    );
  }
}

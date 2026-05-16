import type { QueryClient } from "@tanstack/react-query";
import type { ConversationListItem } from "@workspace/api-client-react";
import { getListConversationsQueryKey } from "@workspace/api-client-react";

/** Fields needed to patch inbox list; matches WS payload where `messageType` may be omitted. */
export type InboxRealtimeMessageFields = {
  senderId: number;
  createdAt: string;
  readAt: string | null;
  body: string;
  messageType?: "text" | "image";
};

/** Mirrors server `lastPreview` in conversations route (image + text). */
export function lastPreviewFromChatMessage(m: InboxRealtimeMessageFields): string {
  const mt = m.messageType ?? "text";
  if (mt === "image") {
    const b = m.body?.trim();
    return b ? b.slice(0, 200) : "صورة";
  }
  return (m.body ?? "").slice(0, 200);
}

/**
 * Updates cached `/api/conversations` list when a realtime message arrives — avoids full refetch.
 * If the conversation is missing from cache (e.g. not in first page), falls back to invalidation.
 */
export function applyIncomingMessageToInboxCache(
  queryClient: QueryClient,
  args: { myUserId: number; conversationId: number; message: InboxRealtimeMessageFields },
): void {
  const { myUserId, conversationId, message } = args;
  const key = getListConversationsQueryKey();
  const preview = lastPreviewFromChatMessage(message);
  const fromOther = message.senderId !== myUserId;

  let needsInvalidate = false;
  queryClient.setQueryData<ConversationListItem[]>(key, (old) => {
    if (!old || !Array.isArray(old)) return old;
    const idx = old.findIndex((c) => c.id === conversationId);
    if (idx < 0) {
      needsInvalidate = true;
      return old;
    }
    const row = old[idx];
    const sameLast =
      row.lastMessageAt === message.createdAt &&
      row.lastMessageSenderId === message.senderId &&
      (row.lastMessagePreview ?? "") === preview;

    let nextUnread = row.unreadCount;
    if (fromOther && !message.readAt && !sameLast) {
      nextUnread = row.unreadCount + 1;
    }

    const patched: ConversationListItem = {
      ...row,
      lastMessageAt: message.createdAt,
      lastMessagePreview: preview,
      lastMessageSenderId: message.senderId,
      unreadCount: nextUnread,
    };
    const rest = old.filter((c) => c.id !== conversationId);
    if (rest.length === 0) return [patched];

    const patchedT = new Date(patched.lastMessageAt).getTime();
    const firstT = new Date(rest[0]!.lastMessageAt).getTime();
    /** غالبًا تكون آخر رسالة = أحدث وقت؛ نتجنب sort كامل على كل حدث realtime. */
    if (patchedT >= firstT) {
      return [patched, ...rest];
    }
    return [...rest, patched].sort(
      (a, b) =>
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
    );
  });

  if (needsInvalidate) {
    void queryClient.invalidateQueries({ queryKey: key });
  }
}

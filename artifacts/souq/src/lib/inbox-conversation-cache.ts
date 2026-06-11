import type { QueryClient } from "@tanstack/react-query";
import type { ConversationListItem } from "@workspace/api-client-react";
import { getListConversationsQueryKey } from "@workspace/api-client-react";
import {
  bumpMessagesUnreadCount,
  invalidateUnreadCounters,
} from "@/lib/unread-counters-cache";

/** Fields needed to patch inbox list; matches WS payload where `messageType` may be omitted. */
export type InboxRealtimeMessageFields = {
  senderId: number;
  createdAt: string;
  readAt: string | null;
  body: string;
  messageType?: "text" | "image" | "location";
};

/** Mirrors server `lastPreview` in conversations route (image + text + location). */
export function lastPreviewFromChatMessage(m: InboxRealtimeMessageFields): string {
  const mt = m.messageType ?? "text";
  if (mt === "image") {
    const b = m.body?.trim();
    return b ? b.slice(0, 200) : "صورة";
  }
  if (mt === "location") {
    return "📍 موقع";
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
    invalidateUnreadCounters(queryClient);
  }
}

/** Zero unread badge after thread messages load (server marks read on GET messages). */
export function clearConversationUnreadInInboxCache(
  queryClient: QueryClient,
  conversationId: number,
): void {
  if (!Number.isInteger(conversationId) || conversationId <= 0) return;

  let cleared = 0;
  queryClient.setQueryData<ConversationListItem[]>(getListConversationsQueryKey(), (old) => {
    if (!old || !Array.isArray(old)) return old;
    const idx = old.findIndex((c) => c.id === conversationId);
    if (idx < 0 || old[idx]!.unreadCount === 0) return old;
    cleared = old[idx]!.unreadCount;
    const next = [...old];
    next[idx] = { ...next[idx]!, unreadCount: 0 };
    return next;
  });
  if (cleared > 0) {
    bumpMessagesUnreadCount(queryClient, -cleared);
  }
}

/** Optimistic removal after hide/delete — keeps user on inbox without full refetch. */
export function removeConversationsFromInboxCache(
  queryClient: QueryClient,
  conversationIds: readonly number[],
): void {
  const remove = new Set(
    conversationIds.filter((id) => Number.isInteger(id) && id > 0),
  );
  if (remove.size === 0) return;

  queryClient.setQueryData<ConversationListItem[]>(getListConversationsQueryKey(), (old) => {
    if (!old || !Array.isArray(old)) return old;
    const next = old.filter((c) => !remove.has(c.id));
    return next.length === old.length ? old : next;
  });
}

import { useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useChatSocket, type ChatSocketEvent } from "@/hooks/use-chat-socket";
import { isNotificationCreatedEvent } from "@/lib/notification-realtime";
import {
  bumpMessagesUnreadCount,
  bumpNotificationsUnreadCount,
} from "@/lib/unread-counters-cache";
import { applyIncomingMessageToInboxCache } from "@/lib/inbox-conversation-cache";
import { prependNotificationToCache } from "@/lib/notification-center-cache";
const SEEN_NOTIFICATION_ID_CAP = 500;

/**
 * P17-9-5 — realtime counter updates (messages + notifications).
 * Idempotent notification bumps via seen notification ids.
 */
export function AppCountersRealtimeSync() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const seenNotificationIdsRef = useRef(new Set<number>());

  const onRealtimeEvent = useCallback(
    (event: ChatSocketEvent) => {
      if (event.type === "message" && user?.id) {
        const fromOther = event.message.senderId !== user.id;
        const isUnread = !event.message.readAt;
        applyIncomingMessageToInboxCache(queryClient, {
          myUserId: user.id,
          conversationId: event.conversationId,
          message: event.message,
        });
        if (fromOther && isUnread) {
          bumpMessagesUnreadCount(queryClient, 1);
        }
        return;
      }

      if (!isNotificationCreatedEvent(event)) return;

      const id = event.notification.id;
      if (seenNotificationIdsRef.current.has(id)) return;
      seenNotificationIdsRef.current.add(id);
      if (seenNotificationIdsRef.current.size > SEEN_NOTIFICATION_ID_CAP) {
        const trimmed = [...seenNotificationIdsRef.current].slice(
          -SEEN_NOTIFICATION_ID_CAP,
        );
        seenNotificationIdsRef.current = new Set(trimmed);
      }

      bumpNotificationsUnreadCount(queryClient, 1);
      prependNotificationToCache(queryClient, event.notification);
    },
    [queryClient, user?.id],
  );

  useChatSocket(onRealtimeEvent);

  return null;
}

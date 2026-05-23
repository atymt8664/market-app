import type { Message } from "@workspace/api-client-react";
import {
  CHAT_LOCATION_MESSAGE_TYPE,
  buildChatLocationMapsUrl,
  parseChatLocationBody,
} from "@/lib/chat-location-message";

/** Returns clipboard-ready text for a message, or null when nothing meaningful to copy. */
export function getChatMessageCopyText(m: Message): string | null {
  if (m.deletedForEveryoneAt) return null;
  const mt = String(m.messageType ?? "text");

  if (mt === "image") {
    const caption = m.body?.trim();
    return caption.length > 0 ? caption : null;
  }

  if (mt === CHAT_LOCATION_MESSAGE_TYPE) {
    const loc = parseChatLocationBody(m.body ?? "", m.messageType);
    if (!loc) return null;
    return buildChatLocationMapsUrl(loc.lat, loc.lng);
  }

  const text = m.body?.trim();
  return text.length > 0 ? text : null;
}

export function selectionHasCopyableMessages(
  messages: readonly Message[] | undefined,
  selectedIds: ReadonlySet<number>,
): boolean {
  if (!messages?.length || selectedIds.size === 0) return false;
  for (const id of selectedIds) {
    const m = messages.find((x) => x.id === id);
    if (m && getChatMessageCopyText(m) != null) return true;
  }
  return false;
}

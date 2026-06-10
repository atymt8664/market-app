import type { Message } from "@workspace/api-client-react";
import {
  CHAT_LOCATION_MESSAGE_TYPE,
  parseChatLocationBody,
} from "@/lib/chat-location-message";
import { getChatMessageCopyText } from "@/lib/chat-message-copy";

export type ForwardSendPayload = {
  body?: string;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
};

export type ForwardCapability =
  | { kind: "send"; payload: ForwardSendPayload }
  | { kind: "unsupported"; reasonKey: string };

/** Resolves whether a message can be forwarded via existing sendMessage API. */
export function resolveForwardCapability(m: Message): ForwardCapability {
  if (m.deletedForEveryoneAt) {
    return { kind: "unsupported", reasonKey: "message_thread.forward_deleted" };
  }

  const mt = String(m.messageType ?? "text");

  if (mt === "image" && m.imageUrl) {
    const caption = m.body?.trim();
    return {
      kind: "send",
      payload: {
        imageUrl: m.imageUrl,
        ...(caption ? { body: caption } : {}),
      },
    };
  }

  if (mt === CHAT_LOCATION_MESSAGE_TYPE) {
    const loc = parseChatLocationBody(m.body ?? "", m.messageType);
    if (loc) {
      return {
        kind: "send",
        payload: { latitude: loc.lat, longitude: loc.lng },
      };
    }
  }

  const text = getChatMessageCopyText(m);
  if (text) {
    return { kind: "send", payload: { body: text } };
  }

  return { kind: "unsupported", reasonKey: "message_thread.forward_empty" };
}

export function filterForwardableMessages(messages: readonly Message[]): Message[] {
  return messages.filter((m) => resolveForwardCapability(m).kind === "send");
}

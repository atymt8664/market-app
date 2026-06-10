import type { UserPresenceEntry } from "@workspace/api-client-react";
import { resolveInboxPresenceText } from "@/lib/chat-inbox-presence-text";
import { t } from "@/i18n";

export type ThreadHeaderPresenceState =
  | { kind: "online" | "last_seen" | "unavailable"; text: string }
  | null;

/** Thread header only — inbox resolver + offline fallback when lastSeenAt is missing. */
export function resolveThreadHeaderPresenceText(
  entry: UserPresenceEntry | undefined,
  isLoading?: boolean,
): ThreadHeaderPresenceState {
  if (isLoading) return null;
  const resolved = resolveInboxPresenceText(entry, false);
  if (resolved) return resolved;
  if (!entry || entry.visibility === "hidden") return null;
  const unavailable = t("message_thread.peer_presence_unavailable");
  if (unavailable !== "message_thread.peer_presence_unavailable") {
    return { kind: "unavailable", text: unavailable };
  }
  return { kind: "unavailable", text: "آخر ظهور غير متاح" };
}

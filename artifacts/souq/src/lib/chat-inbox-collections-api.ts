import type { ConversationListItem } from "@workspace/api-client-react";
import { apiUrl } from "@/lib/api-url";

export type BlockedUserListItem = {
  id: number;
  name: string;
  city: string;
  avatarUrl?: string | null;
  blockedAt: string;
};

async function fetchJsonArray<T>(path: string): Promise<T[]> {
  const res = await fetch(apiUrl(path), { credentials: "include" });
  if (!res.ok) {
    throw new Error(`fetch-${path}-${res.status}`);
  }
  const data: unknown = await res.json();
  if (!Array.isArray(data)) {
    throw new Error(`fetch-${path}-invalid-shape`);
  }
  return data as T[];
}

export async function fetchHiddenConversations(): Promise<ConversationListItem[]> {
  const res = await fetch(apiUrl("/api/conversations/hidden"), { credentials: "include" });
  if (!res.ok) return [];
  const data = (await res.json()) as ConversationListItem[];
  return Array.isArray(data) ? data : [];
}

async function fetchMainConversations(): Promise<ConversationListItem[]> {
  const res = await fetch(apiUrl("/api/conversations"), { credentials: "include" });
  if (!res.ok) return [];
  const data = (await res.json()) as ConversationListItem[];
  return Array.isArray(data) ? data : [];
}

/**
 * Fallback when list endpoints are absent on the deployed API:
 * uses existing GET /users/:id/block-status per known peer from conversations.
 */
async function fetchBlockedUsersViaBlockStatus(): Promise<BlockedUserListItem[]> {
  const [main, hidden] = await Promise.all([fetchMainConversations(), fetchHiddenConversations()]);
  const byPeerId = new Map<number, ConversationListItem>();
  for (const row of [...main, ...hidden]) {
    if (typeof row.otherId === "number" && row.otherId > 0) {
      byPeerId.set(row.otherId, row);
    }
  }
  if (byPeerId.size === 0) return [];

  const blocked: BlockedUserListItem[] = [];
  await Promise.all(
    [...byPeerId.entries()].map(async ([peerId, conv]) => {
      const res = await fetch(apiUrl(`/api/users/${peerId}/block-status`), {
        credentials: "include",
      });
      if (!res.ok) return;
      const status = (await res.json()) as { blockedByMe?: boolean };
      if (!status.blockedByMe) return;
      blocked.push({
        id: peerId,
        name: conv.otherName || "",
        city: "",
        avatarUrl: null,
        blockedAt: conv.lastMessageAt || new Date().toISOString(),
      });
    }),
  );
  blocked.sort(
    (a, b) => new Date(b.blockedAt).getTime() - new Date(a.blockedAt).getTime(),
  );
  return blocked;
}

/** Primary list API with block-status fallback for older API builds. */
export async function fetchBlockedUsers(): Promise<BlockedUserListItem[]> {
  for (const path of ["/api/account/blocked-users", "/api/users/blocked"]) {
    try {
      return await fetchJsonArray<BlockedUserListItem>(path);
    } catch {
      /* try next */
    }
  }
  return fetchBlockedUsersViaBlockStatus();
}

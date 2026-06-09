import type { ConversationListItem } from "@workspace/api-client-react";

const STORAGE_PREFIX = "p5.chat.inbox.prefs";

export type InboxClientPrefs = {
  pinnedIds: number[];
  mutedIds: number[];
};

function storageKey(userId: number): string {
  return `${STORAGE_PREFIX}:${userId}`;
}

function normalizeIds(ids: readonly number[]): number[] {
  const s = new Set<number>();
  for (const id of ids) {
    if (Number.isInteger(id) && id > 0) s.add(id);
  }
  return [...s];
}

export function readInboxClientPrefs(userId: number): InboxClientPrefs {
  if (typeof window === "undefined" || !Number.isInteger(userId) || userId <= 0) {
    return { pinnedIds: [], mutedIds: [] };
  }
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return { pinnedIds: [], mutedIds: [] };
    const parsed = JSON.parse(raw) as Partial<InboxClientPrefs>;
    return {
      pinnedIds: normalizeIds(parsed.pinnedIds ?? []),
      mutedIds: normalizeIds(parsed.mutedIds ?? []),
    };
  } catch {
    return { pinnedIds: [], mutedIds: [] };
  }
}

export function writeInboxClientPrefs(userId: number, prefs: InboxClientPrefs): InboxClientPrefs {
  const next: InboxClientPrefs = {
    pinnedIds: normalizeIds(prefs.pinnedIds),
    mutedIds: normalizeIds(prefs.mutedIds),
  };
  if (typeof window !== "undefined" && Number.isInteger(userId) && userId > 0) {
    localStorage.setItem(storageKey(userId), JSON.stringify(next));
  }
  return next;
}

export function toggleInboxPinned(userId: number, convId: number, prefs: InboxClientPrefs): InboxClientPrefs {
  const pinned = new Set(prefs.pinnedIds);
  if (pinned.has(convId)) pinned.delete(convId);
  else pinned.add(convId);
  return writeInboxClientPrefs(userId, { ...prefs, pinnedIds: [...pinned] });
}

export function toggleInboxMuted(userId: number, convId: number, prefs: InboxClientPrefs): InboxClientPrefs {
  const muted = new Set(prefs.mutedIds);
  if (muted.has(convId)) muted.delete(convId);
  else muted.add(convId);
  return writeInboxClientPrefs(userId, { ...prefs, mutedIds: [...muted] });
}

export function setInboxPinned(
  userId: number,
  convIds: readonly number[],
  pinned: boolean,
  prefs: InboxClientPrefs,
): InboxClientPrefs {
  const set = new Set(prefs.pinnedIds);
  for (const id of convIds) {
    if (!Number.isInteger(id) || id <= 0) continue;
    if (pinned) set.add(id);
    else set.delete(id);
  }
  return writeInboxClientPrefs(userId, { ...prefs, pinnedIds: [...set] });
}

export function setInboxMuted(
  userId: number,
  convIds: readonly number[],
  muted: boolean,
  prefs: InboxClientPrefs,
): InboxClientPrefs {
  const set = new Set(prefs.mutedIds);
  for (const id of convIds) {
    if (!Number.isInteger(id) || id <= 0) continue;
    if (muted) set.add(id);
    else set.delete(id);
  }
  return writeInboxClientPrefs(userId, { ...prefs, mutedIds: [...set] });
}

export function sortInboxRowsWithPrefs(
  rows: ConversationListItem[],
  prefs: InboxClientPrefs,
): ConversationListItem[] {
  const pinnedSet = new Set(prefs.pinnedIds);
  const byDate = (a: ConversationListItem, b: ConversationListItem) =>
    new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();

  const pinned = rows.filter((r) => pinnedSet.has(r.id)).sort(byDate);
  const rest = rows.filter((r) => !pinnedSet.has(r.id)).sort(byDate);
  return [...pinned, ...rest];
}

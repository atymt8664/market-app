export type UserPresencePrivacyMeta = {
  activityVisible: boolean;
  lastSeenVisible: boolean;
  lastSeenAt: Date | null;
  isOnline: boolean;
};

export type ResolvedUserPresence =
  | { visibility: "hidden" }
  | { visibility: "full"; isOnline: boolean; lastSeenAt: string | null };

/** Applies per-user privacy prefs to presence payload (chat, ads, batch API). */
export function resolveUserPresenceForViewer(meta: UserPresencePrivacyMeta): ResolvedUserPresence {
  if (!meta.activityVisible && !meta.lastSeenVisible) {
    return { visibility: "hidden" };
  }
  const isOnline = meta.activityVisible && meta.isOnline;
  const lastSeenAt =
    meta.lastSeenVisible && meta.lastSeenAt ? meta.lastSeenAt.toISOString() : null;
  return { visibility: "full", isOnline, lastSeenAt };
}

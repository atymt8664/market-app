import { useCallback, useEffect, useMemo, useState } from "react";
import {
  readInboxClientPrefs,
  setInboxMuted,
  setInboxPinned,
  toggleInboxMuted,
  toggleInboxPinned,
  type InboxClientPrefs,
} from "@/lib/chat-inbox-client-prefs";

const EMPTY_PREFS: InboxClientPrefs = { pinnedIds: [], mutedIds: [] };

export function useInboxClientPrefs(userId: number | undefined) {
  const [prefs, setPrefs] = useState<InboxClientPrefs>(EMPTY_PREFS);

  /** auth/me يصل بعد أول render — إعادة قراءة localStorage عند توفر userId */
  useEffect(() => {
    if (!userId) {
      setPrefs(EMPTY_PREFS);
      return;
    }
    setPrefs(readInboxClientPrefs(userId));
  }, [userId]);

  const pinnedSet = useMemo(() => new Set(prefs.pinnedIds), [prefs.pinnedIds]);
  const mutedSet = useMemo(() => new Set(prefs.mutedIds), [prefs.mutedIds]);

  const togglePin = useCallback(
    (convId: number) => {
      if (!userId) return;
      setPrefs((current) => toggleInboxPinned(userId, convId, current));
    },
    [userId],
  );

  const toggleMute = useCallback(
    (convId: number) => {
      if (!userId) return;
      setPrefs((current) => toggleInboxMuted(userId, convId, current));
    },
    [userId],
  );

  const applyPin = useCallback(
    (convIds: readonly number[], pinned: boolean) => {
      if (!userId) return;
      setPrefs((current) => setInboxPinned(userId, convIds, pinned, current));
    },
    [userId],
  );

  const applyMute = useCallback(
    (convIds: readonly number[], muted: boolean) => {
      if (!userId) return;
      setPrefs((current) => setInboxMuted(userId, convIds, muted, current));
    },
    [userId],
  );

  return {
    prefs,
    pinnedSet,
    mutedSet,
    togglePin,
    toggleMute,
    applyPin,
    applyMute,
  };
}

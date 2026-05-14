import { useMemo } from "react";
import {
  useQuery,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export type UserPresenceEntry =
  | { visibility: "hidden" }
  | { visibility: "full"; isOnline: boolean; lastSeenAt: string | null };

export type UserPresenceBatchResponse = {
  byUserId: Record<string, UserPresenceEntry>;
};

export function normalizePresenceUserIds(
  ids: readonly (number | null | undefined)[],
): number[] {
  const s = new Set<number>();
  for (const x of ids) {
    if (typeof x === "number" && Number.isInteger(x) && x > 0) s.add(x);
    else if (x != null) {
      const n = Number(x);
      if (Number.isInteger(n) && n > 0) s.add(n);
    }
  }
  return [...s].sort((a, b) => a - b);
}

export function getUserPresenceBatchQueryKey(userIds: readonly number[]): QueryKey {
  const sorted = normalizePresenceUserIds(userIds);
  return ["userPresence", "batch", sorted.join(",")] as const;
}

export async function fetchUserPresenceBatch(
  userIds: number[],
  options?: RequestInit,
): Promise<UserPresenceBatchResponse> {
  const sorted = normalizePresenceUserIds(userIds);
  if (sorted.length === 0) {
    return { byUserId: {} };
  }
  return customFetch<UserPresenceBatchResponse>("/api/users/presence-batch", {
    ...options,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options?.headers as Record<string, string>),
    },
    body: JSON.stringify({ userIds: sorted }),
  });
}

export function invalidateUserPresenceBatchQueries(
  queryClient: QueryClient,
  userIds: readonly (number | null | undefined)[],
): Promise<void> {
  const sorted = normalizePresenceUserIds(userIds);
  if (sorted.length === 0) return Promise.resolve();
  return queryClient.invalidateQueries({
    queryKey: getUserPresenceBatchQueryKey(sorted),
  });
}

export function useUserPresenceBatch(
  userIds: readonly number[],
  options?: { enabled?: boolean },
) {
  const sorted = useMemo(
    () => normalizePresenceUserIds(userIds),
    [JSON.stringify(normalizePresenceUserIds(userIds))],
  );
  const keyStr = sorted.join(",");
  const enabled = (options?.enabled ?? true) && sorted.length > 0;

  return useQuery({
    queryKey: ["userPresence", "batch", keyStr] as const,
    queryFn: ({ signal }) => fetchUserPresenceBatch(sorted, { signal }),
    enabled,
    staleTime: 0,
    refetchInterval: (q) => {
      const d = q.state.data;
      if (!d?.byUserId) return false;
      let anyOnline = false;
      for (const id of sorted) {
        const e = d.byUserId[String(id)];
        if (e?.visibility === "full" && e.isOnline) {
          anyOnline = true;
          break;
        }
      }
      return anyOnline ? 8000 : 20_000;
    },
    refetchOnWindowFocus: true,
  });
}

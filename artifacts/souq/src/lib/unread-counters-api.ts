import { apiUrl } from "@/lib/api-url";
import { normalizeUnreadCounters, type UnreadCounters } from "@/lib/app-badge-counters";

export async function fetchUnreadCounters(signal?: AbortSignal): Promise<UnreadCounters> {
  const res = await fetch(apiUrl("/api/account/unread-counters"), {
    credentials: "include",
    cache: "no-store",
    signal,
  });
  if (!res.ok) {
    throw new Error(`unread-counters HTTP ${res.status}`);
  }
  const data = await res.json();
  const normalized = normalizeUnreadCounters(data);
  if (!normalized) {
    throw new Error("unread-counters invalid payload");
  }
  return normalized;
}

import { getAuthProfileCsrfTokenForRequest } from "@workspace/api-client-react";
import { apiUrl } from "@/lib/api-url";

export type DeleteMessagesForEveryoneResult = {
  ok: boolean;
  deletedCount: number;
  messageIds: number[];
  deletedForEveryoneAt: string | null;
};

export async function deleteMessagesForEveryone(
  convId: number,
  messageIds: number[],
): Promise<DeleteMessagesForEveryoneResult> {
  const csrf = getAuthProfileCsrfTokenForRequest();
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (typeof csrf === "string" && csrf.length >= 32) {
    headers["X-CSRF-Token"] = csrf;
  }
  const res = await fetch(apiUrl(`/api/conversations/${convId}/messages/delete-for-everyone`), {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({ messageIds }),
  });
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  if (!data || typeof data !== "object") {
    throw new Error("Invalid response");
  }
  const o = data as {
    ok?: unknown;
    deletedCount?: unknown;
    messageIds?: unknown;
    deletedForEveryoneAt?: unknown;
  };
  const deletedForEveryoneAt =
    typeof o.deletedForEveryoneAt === "string" && o.deletedForEveryoneAt.length > 0
      ? o.deletedForEveryoneAt
      : null;
  return {
    ok: Boolean(o.ok),
    deletedCount: typeof o.deletedCount === "number" ? o.deletedCount : 0,
    messageIds: Array.isArray(o.messageIds)
      ? o.messageIds.filter((x): x is number => typeof x === "number")
      : [],
    deletedForEveryoneAt,
  };
}

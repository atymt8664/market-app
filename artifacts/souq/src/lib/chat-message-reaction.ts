import { getAuthProfileCsrfTokenForRequest } from "@workspace/api-client-react";
import { apiUrl } from "@/lib/api-url";

export type SetMessageReactionResult = {
  messageId: number;
  myReaction: string | null;
};

export async function setMessageReaction(
  convId: number,
  messageId: number,
  emoji: string,
): Promise<SetMessageReactionResult> {
  const csrf = getAuthProfileCsrfTokenForRequest();
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (typeof csrf === "string" && csrf.length >= 32) {
    headers["X-CSRF-Token"] = csrf;
  }
  const res = await fetch(
    apiUrl(`/api/conversations/${convId}/messages/${messageId}/reaction`),
    {
      method: "PUT",
      credentials: "include",
      headers,
      body: JSON.stringify({ emoji }),
    },
  );
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
  const o = data as { messageId?: unknown; myReaction?: unknown };
  return {
    messageId: typeof o.messageId === "number" ? o.messageId : messageId,
    myReaction:
      typeof o.myReaction === "string" && o.myReaction.length > 0
        ? o.myReaction
        : null,
  };
}

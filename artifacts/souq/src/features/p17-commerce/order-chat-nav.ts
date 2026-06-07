/** P17-7A §5 — pure navigation helpers (unit-testable, no React). */

export function orderChatHref(
  conversationId: number,
  orderNumber: string,
  orderRole?: "buyer" | "seller",
  draft?: string,
): string {
  const params = new URLSearchParams({
    from: "order",
    orderNumber,
  });
  if (orderRole === "seller") {
    params.set("orderRole", "seller");
  }
  if (draft && draft.trim().length > 0) {
    params.set("draft", draft);
  }
  return `/messages/${conversationId}?${params.toString()}`;
}

/** Reuse existing buyer↔seller thread for this ad when present. */
export function findConversationIdForAd(
  conversations: ReadonlyArray<{ adId: number; id: number }>,
  adId: number,
): number | null {
  const match = conversations.find((c) => c.adId === adId);
  return match?.id ?? null;
}

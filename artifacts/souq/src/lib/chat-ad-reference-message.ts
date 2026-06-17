export const CHAT_AD_REFERENCE_MESSAGE_TYPE = "ad_reference" as const;

export type ChatAdReferencePayload = {
  adId: number;
  title: string;
  price: number | null;
  priceType: string | null;
  imageUrl: string | null;
};

export function parseChatAdReferenceBody(
  body: string,
  messageType?: string,
): ChatAdReferencePayload | null {
  if (messageType && messageType !== CHAT_AD_REFERENCE_MESSAGE_TYPE) return null;
  try {
    const o = JSON.parse(body) as {
      adId?: unknown;
      title?: unknown;
      price?: unknown;
      priceType?: unknown;
      imageUrl?: unknown;
    };
    const adId = Number(o.adId);
    const title = typeof o.title === "string" ? o.title.trim() : "";
    if (!Number.isInteger(adId) || adId <= 0 || !title) return null;
    const price =
      o.price === null || o.price === undefined ? null : Number(o.price);
    const priceType =
      typeof o.priceType === "string" && o.priceType.trim()
        ? o.priceType.trim()
        : null;
    const imageUrl =
      typeof o.imageUrl === "string" && o.imageUrl.trim()
        ? o.imageUrl.trim()
        : null;
    return {
      adId,
      title,
      price: price != null && Number.isFinite(price) ? price : null,
      priceType,
      imageUrl,
    };
  } catch {
    return null;
  }
}

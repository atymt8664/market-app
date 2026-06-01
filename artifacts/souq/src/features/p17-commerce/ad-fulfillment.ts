import { parseStoredAdDetails } from "@/lib/ad-stored-details";

export type CheckoutFulfillmentMode = "pickup" | "shipping";

/** Derive checkout fulfillment mode from ad stored details (P17-7A §2.1). */
export function resolveCheckoutFulfillmentMode(adDetailsRaw: unknown): CheckoutFulfillmentMode {
  const parsed = parseStoredAdDetails(adDetailsRaw ?? {});
  const shipMeta = parsed.meta?.shipping;
  if (!shipMeta) return "pickup";
  if (shipMeta.pickupOnly === true) return "pickup";
  if (shipMeta.ids.length > 0) return "shipping";
  return "pickup";
}

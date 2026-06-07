/** P17-7A §2.1 — pure fulfillment derivation (no React / no path aliases). */

export type CheckoutFulfillmentMode = "pickup" | "shipping";

export type AdShippingMeta = {
  ids: string[];
  pickupOnly: boolean;
};

/** Single source of truth for pickup vs shipping from ad shipping metadata. */
export function deriveFulfillmentModeFromShippingMeta(
  shipMeta: AdShippingMeta | undefined | null,
): CheckoutFulfillmentMode {
  if (!shipMeta) return "pickup";
  if (shipMeta.pickupOnly === true) return "pickup";
  if (shipMeta.ids.length > 0) return "shipping";
  return "pickup";
}

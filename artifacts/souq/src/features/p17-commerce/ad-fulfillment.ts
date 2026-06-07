import { parseStoredAdDetails } from "@/lib/ad-stored-details";
import {
  deriveFulfillmentModeFromShippingMeta,
  type CheckoutFulfillmentMode,
} from "./ad-fulfillment-mode";

export type { CheckoutFulfillmentMode };
export { deriveFulfillmentModeFromShippingMeta };

/** Derive checkout fulfillment mode from ad `details` (P17-7A §2.1). */
export function resolveCheckoutFulfillmentMode(adDetailsRaw: unknown): CheckoutFulfillmentMode {
  const parsed = parseStoredAdDetails(adDetailsRaw ?? {});
  return deriveFulfillmentModeFromShippingMeta(parsed.meta?.shipping);
}

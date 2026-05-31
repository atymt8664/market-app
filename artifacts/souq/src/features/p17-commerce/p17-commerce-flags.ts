/** P17-5 — client feature flags (VITE_* only; API uses P17_ORDERS_API_ENABLED on server). */

function envFlag(name: string): boolean {
  const raw = import.meta.env[name];
  return raw === "1" || raw === "true";
}

/** When true: Ad Detail Buy Now navigates to /checkout/:adId (not Coming Soon sheet). */
export function isP17BuyNowEnabled(): boolean {
  return envFlag("VITE_P17_BUY_NOW_ENABLED");
}

/** When true: Profile order tiles without Coming Soon badge; full hub UX. */
export function isP17OrdersHubVisible(): boolean {
  return envFlag("VITE_P17_ORDERS_HUB_VISIBLE");
}

/** P17-5 active — hide preview/coming-soon UX inside buyer order surfaces. */
export function isP17BuyerFlowActive(): boolean {
  return isP17BuyNowEnabled() || isP17OrdersHubVisible();
}

/** P17-6 — seller hub + detail + accept/reject (independent of buyer flags). */
export function isP17SellerOrdersEnabled(): boolean {
  return envFlag("VITE_P17_SELLER_ORDERS_ENABLED");
}

/** P17-7 — seller preparing/shipped + buyer shipping status (requires seller orders). */
export function isP17ShippingEnabled(): boolean {
  return isP17SellerOrdersEnabled() && envFlag("VITE_P17_SHIPPING_ENABLED");
}

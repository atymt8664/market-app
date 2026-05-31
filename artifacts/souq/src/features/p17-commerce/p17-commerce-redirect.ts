/** P17-5 — post-login redirect allowlist (P17-5-ui.md §4.3). */

const CANONICAL_ORDER_NUMBER = /^SOUQ-\d{4}-\d{6}$/;

export function isAllowedCommerceRedirect(path: string): boolean {
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  if (path === "/login" || path.startsWith("/login?")) return false;
  if (path === "/orders" || path === "/profile") return true;
  if (path === "/create-ad") return true;
  if (/^\/checkout\/\d+$/.test(path)) return true;
  if (/^\/ad\/\d+$/.test(path)) return true;
  const orderMatch = path.match(/^\/orders\/([^/?#]+)$/);
  if (orderMatch && CANONICAL_ORDER_NUMBER.test(orderMatch[1] ?? "")) return true;
  return false;
}

export function resolveCommercePostLoginRedirect(search: string): string {
  const params = new URLSearchParams(search);
  const raw = params.get("redirect");
  if (raw == null || raw.trim() === "") return "/";
  let path = raw.trim();
  try {
    path = decodeURIComponent(path);
  } catch {
    return "/";
  }
  if (!isAllowedCommerceRedirect(path)) return "/profile";
  if (path === "/create-ad") return "/new";
  return path;
}

export function checkoutPathForAd(adId: number): string {
  return `/checkout/${adId}`;
}

export function loginRedirectForCheckout(adId: number): string {
  return `/login?redirect=${encodeURIComponent(checkoutPathForAd(adId))}`;
}

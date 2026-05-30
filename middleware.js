/**
 * P11-5 — route social crawlers to /api/og (HTML with OG tags) instead of SPA shell.
 */
import { isSocialCrawler } from "./artifacts/souq/scripts/og-share-meta.mjs";

export const config = {
  matcher: ["/", "/ad/:id", "/users/:id"],
};

export default function middleware(request) {
  const ua = request.headers.get("user-agent") ?? "";
  if (!isSocialCrawler(ua)) {
    return;
  }

  const { pathname } = new URL(request.url);
  const adMatch = pathname.match(/^\/ad\/(\d+)$/);
  if (adMatch) {
    return Response.rewrite(new URL(`/api/og?route=ad&id=${adMatch[1]}`, request.url));
  }

  const userMatch = pathname.match(/^\/users\/(\d+)$/);
  if (userMatch) {
    return Response.rewrite(
      new URL(`/api/og?route=profile&id=${userMatch[1]}`, request.url),
    );
  }

  if (pathname === "/" || pathname === "") {
    return Response.rewrite(new URL("/api/og?route=home", request.url));
  }
}

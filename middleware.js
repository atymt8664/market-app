/**
 * P11-5 — social crawlers receive OG HTML directly (no SPA, no /api proxy).
 */
import {
  buildAdShareMeta,
  buildHomeShareMeta,
  buildProfileShareMeta,
  fetchPublicAd,
  fetchPublicProfile,
  isSocialCrawler,
  renderOgHtml,
} from "./artifacts/souq/scripts/og-share-meta.mjs";

export const config = {
  matcher: ["/", "/ad/:id", "/users/:id"],
};

const OG_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
};

export default async function middleware(request) {
  const ua = request.headers.get("user-agent") ?? "";
  if (!isSocialCrawler(ua)) {
    return;
  }

  const { pathname } = new URL(request.url);

  const adMatch = pathname.match(/^\/ad\/(\d+)$/);
  if (adMatch) {
    const ad = await fetchPublicAd(adMatch[1]);
    const meta = ad ? buildAdShareMeta(ad) : buildHomeShareMeta();
    return new Response(renderOgHtml(meta), { status: ad ? 200 : 404, headers: OG_HEADERS });
  }

  const userMatch = pathname.match(/^\/users\/(\d+)$/);
  if (userMatch) {
    const profile = await fetchPublicProfile(userMatch[1]);
    const meta = profile ? buildProfileShareMeta(profile) : buildHomeShareMeta();
    return new Response(renderOgHtml(meta), {
      status: profile ? 200 : 404,
      headers: OG_HEADERS,
    });
  }

  return new Response(renderOgHtml(buildHomeShareMeta()), { status: 200, headers: OG_HEADERS });
}

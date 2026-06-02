/**
 * P11-5 / P13-4 — Edge: OG for crawlers.
 * P7-PR-12 — Edge HTML shell for human GET / (fresh featured + LCP layer).
 */
import {
  buildAdShareMeta,
  buildHomeShareMeta,
  buildProfileShareMeta,
  buildHomeStructuredDataJsonLd,
  fetchPublicAd,
  fetchPublicProfile,
  isSocialCrawler,
  P3_STRUCTURED_DATA_SCRIPT_ID,
  renderOgHtml,
} from "./scripts/og-share-meta.mjs";
import { buildAdStructuredDataJsonLd } from "./scripts/ad-structured-data.mjs";
import {
  P7_SHELL_SOURCE_HEADER,
  P7_EDGE_SHELL_CACHE,
  acceptsDocumentHtml,
  applyHomeShellToHtml,
  buildHomeShellInjection,
} from "./scripts/home-lcp-shell.mjs";

const OG_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
  "X-P11-Og-Crawler": "1",
};

/** Home edge shell only on exact `/`; OG paths unchanged. */
export const config = {
  matcher: ["/", "/ad/:path*", "/users/:path*"],
};

async function serveEdgeHomeShell(request) {
  const url = new URL(request.url);
  const indexUrl = new URL("/index.html", url);
  const indexRes = await fetch(indexUrl.toString(), {
    headers: { [P7_SHELL_SOURCE_HEADER]: "1" },
  });
  if (!indexRes.ok) return null;

  let html = await indexRes.text();
  const injection = await buildHomeShellInjection();
  if (injection) {
    html = applyHomeShellToHtml(html, injection);
  }

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": P7_EDGE_SHELL_CACHE,
      "X-P7-Edge-Shell": "1",
    },
  });
}

export default async function middleware(request) {
  const ua = request.headers.get("user-agent") ?? "";
  const url = new URL(request.url);

  if (isSocialCrawler(ua)) {
    const adMatch = url.pathname.match(/^\/ad\/(\d+)$/);
    if (adMatch) {
      const ad = await fetchPublicAd(adMatch[1]);
      const meta = ad ? buildAdShareMeta(ad) : buildHomeShareMeta();
      const jsonLd = ad ? buildAdStructuredDataJsonLd(ad) : null;
      return new Response(renderOgHtml(meta, jsonLd), {
        status: ad ? 200 : 404,
        headers: OG_HEADERS,
      });
    }

    const userMatch = url.pathname.match(/^\/users\/(\d+)$/);
    if (userMatch) {
      const profile = await fetchPublicProfile(userMatch[1]);
      const meta = profile ? buildProfileShareMeta(profile) : buildHomeShareMeta();
      return new Response(renderOgHtml(meta), {
        status: profile ? 200 : 404,
        headers: OG_HEADERS,
      });
    }

    return new Response(
      renderOgHtml(buildHomeShareMeta(), buildHomeStructuredDataJsonLd(), P3_STRUCTURED_DATA_SCRIPT_ID),
      { status: 200, headers: OG_HEADERS },
    );
  }

  if (
    request.method === "GET" &&
    url.pathname === "/" &&
    !request.headers.get(P7_SHELL_SOURCE_HEADER) &&
    acceptsDocumentHtml(request)
  ) {
    try {
      const shell = await serveEdgeHomeShell(request);
      if (shell) return shell;
    } catch {
      /* fall through to static index.html */
    }
  }
}

/**
 * P13-1 — dynamic sitemap for approved public ad detail pages.
 */
export const config = { runtime: "edge" };

import { buildAdsSitemapXml } from "../sitemap-ads.mjs";

const CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";

export default async function handler() {
  const headers = {
    "Content-Type": "application/xml; charset=utf-8",
    "Cache-Control": CACHE,
  };
  try {
    const xml = await buildAdsSitemapXml(fetch);
    return new Response(xml, { status: 200, headers });
  } catch {
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
      { status: 503, headers },
    );
  }
}

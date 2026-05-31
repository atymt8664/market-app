/**
 * P11-5 — Edge OG handler (fallback when middleware does not match).
 */
export const config = { runtime: "edge" };

import {
  buildAdShareMeta,
  buildHomeShareMeta,
  buildProfileShareMeta,
  buildHomeStructuredDataJsonLd,
  fetchPublicAd,
  fetchPublicProfile,
  P3_STRUCTURED_DATA_SCRIPT_ID,
  renderOgHtml,
} from "../scripts/og-share-meta.mjs";
import { buildAdStructuredDataJsonLd } from "../scripts/ad-structured-data.mjs";

const CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";

export default async function handler(request) {
  const url = new URL(request.url);
  const route = url.searchParams.get("route") || "home";
  const id = url.searchParams.get("id") || "";

  const headers = {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": CACHE,
    "X-P11-Og-Crawler": "1",
  };

  try {
    if (route === "ad" && /^\d+$/.test(id)) {
      const ad = await fetchPublicAd(id);
      const meta = ad ? buildAdShareMeta(ad) : buildHomeShareMeta();
      const jsonLd = ad ? buildAdStructuredDataJsonLd(ad) : null;
      return new Response(renderOgHtml(meta, jsonLd), { status: ad ? 200 : 404, headers });
    }

    if (route === "profile" && /^\d+$/.test(id)) {
      const profile = await fetchPublicProfile(id);
      const meta = profile ? buildProfileShareMeta(profile) : buildHomeShareMeta();
      return new Response(renderOgHtml(meta), { status: profile ? 200 : 404, headers });
    }

    return new Response(
      renderOgHtml(buildHomeShareMeta(), buildHomeStructuredDataJsonLd(), P3_STRUCTURED_DATA_SCRIPT_ID),
      { status: 200, headers },
    );
  } catch {
    return new Response(
      renderOgHtml(buildHomeShareMeta(), buildHomeStructuredDataJsonLd(), P3_STRUCTURED_DATA_SCRIPT_ID),
      { status: 500, headers },
    );
  }
}

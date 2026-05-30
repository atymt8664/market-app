/**
 * P11-5 — crawler-facing Open Graph HTML (Vercel Serverless).
 * WhatsApp / Facebook / Telegram read this without executing the SPA.
 */
import {
  buildAdShareMeta,
  buildHomeShareMeta,
  buildProfileShareMeta,
  fetchPublicAd,
  fetchPublicProfile,
  renderOgHtml,
} from "../og-share-meta.mjs";

const CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";

function sendHtml(res, html, status = 200) {
  res.statusCode = status;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", CACHE);
  res.end(html);
}

export default async function handler(req, res) {
  const route = String(req.query?.route || "home");
  const id = req.query?.id != null ? String(req.query.id) : "";

  try {
    if (route === "ad" && /^\d+$/.test(id)) {
      const ad = await fetchPublicAd(id);
      const meta = ad ? buildAdShareMeta(ad) : buildHomeShareMeta();
      return sendHtml(res, renderOgHtml(meta), ad ? 200 : 404);
    }

    if (route === "profile" && /^\d+$/.test(id)) {
      const profile = await fetchPublicProfile(id);
      const meta = profile ? buildProfileShareMeta(profile) : buildHomeShareMeta();
      return sendHtml(res, renderOgHtml(meta), profile ? 200 : 404);
    }

    return sendHtml(res, renderOgHtml(buildHomeShareMeta()));
  } catch {
    return sendHtml(res, renderOgHtml(buildHomeShareMeta()), 500);
  }
}

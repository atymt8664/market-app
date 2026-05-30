/**
 * P13-1 — dynamic ads sitemap builder (Edge-safe, public ads only).
 */
export const P13_ORIGIN = "https://www.souq-arab.com";
export const P13_API_ORIGIN = "https://api.souq-arab.com/api";
/** Google sitemap limit per file. */
export const P13_SITEMAP_ADS_MAX_URLS = 50000;
const PAGE_LIMIT = 100;

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatLastmod(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Fetch approved public ads and build urlset XML.
 * @param {typeof fetch} fetchFn
 */
export async function buildAdsSitemapXml(fetchFn = fetch) {
  const urls = [];
  let cursor = null;

  while (urls.length < P13_SITEMAP_ADS_MAX_URLS) {
    const params = new URLSearchParams({ limit: String(PAGE_LIMIT) });
    if (cursor) params.set("cursor", cursor);
    const res = await fetchFn(`${P13_API_ORIGIN}/ads?${params}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`ads API HTTP ${res.status}`);
    }
    const items = await res.json();
    if (!Array.isArray(items) || items.length === 0) break;

    for (const ad of items) {
      if (!ad?.id) continue;
      urls.push({
        loc: `${P13_ORIGIN}/ad/${ad.id}`,
        lastmod: formatLastmod(ad.createdAt),
      });
      if (urls.length >= P13_SITEMAP_ADS_MAX_URLS) break;
    }

    const nextCursor = res.headers.get("x-pagination-next-cursor");
    if (!nextCursor || items.length < PAGE_LIMIT) break;
    cursor = nextCursor;
  }

  const body = urls
    .map((u) => {
      const lastmod = u.lastmod ? `\n    <lastmod>${escapeXml(u.lastmod)}</lastmod>` : "";
      return `  <url>\n    <loc>${escapeXml(u.loc)}</loc>${lastmod}\n    <changefreq>daily</changefreq>\n    <priority>0.7</priority>\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

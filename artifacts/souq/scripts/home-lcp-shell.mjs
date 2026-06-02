/**
 * P7-PR-10 / P7-PR-12 — Home LCP shell: head preload + #p7-lcp-layer (outside #root).
 * Shared: Vite build, Edge middleware, validate scripts.
 */
import { escapeHtml } from "./og-share-meta.mjs";

export const P7_SHELL_SOURCE_HEADER = "x-p7-html-shell-source";
export const P7_EDGE_SHELL_CACHE = "public, s-maxage=120, stale-while-revalidate=600";

export const P7_API_ORIGIN =
  (process.env.HOME_LCP_API_ORIGIN || process.env.VITE_API_BASE_URL || "https://api.souq-arab.com")
    .trim()
    .replace(/\/+$/, "");

function featuredApiUrl() {
  const base = P7_API_ORIGIN.replace(/\/+$/, "");
  if (base.endsWith("/api")) return `${base}/ads/featured`;
  return `${base}/api/ads/featured`;
}

const SUPABASE_OBJECT_PUBLIC =
  /^(https:\/\/[^/]+\.supabase\.co\/storage\/v1)\/object\/public\/(.+)$/;

const HERO_PARAMS = "width=820&height=615&resize=cover&quality=80";

const GATE_FEATURED_HEADING = "إعلانات مميزة";

export const P7_LCP_LAYER_MARKER = "<!-- P7-PR-12:LCP_LAYER -->";
export const P7_HOME_LCP_HEAD_MARKER = "<!-- P7-PR-12:HOME_LCP_HEAD -->";

export function getAdImageHeroUrl(originalUrl) {
  if (!originalUrl || typeof originalUrl !== "string") return "";
  const objectMatch = originalUrl.match(SUPABASE_OBJECT_PUBLIC);
  if (objectMatch) {
    return `${objectMatch[1]}/render/image/public/${objectMatch[2]}?${HERO_PARAMS}`;
  }
  const renderMatch = originalUrl.match(
    /^(https:\/\/[^/]+\.supabase\.co\/storage\/v1)\/render\/image\/public\/(.+?)(?:\?.*)?$/,
  );
  if (renderMatch) {
    return `${renderMatch[1]}/render/image/public/${renderMatch[2]}?${HERO_PARAMS}`;
  }
  return originalUrl;
}

export function storageOriginFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  try {
    const u = new URL(url);
    if (u.hostname.endsWith(".supabase.co")) return u.origin;
  } catch {
    /* ignore */
  }
  return null;
}

export async function fetchFeaturedLeadAd() {
  if (process.env.HOME_LCP_SHELL_SKIP === "1") return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(featuredApiUrl(), {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const lead = data[0];
    const raw = lead?.images?.[0];
    if (!raw || typeof raw !== "string") return null;
    const heroUrl = getAdImageHeroUrl(raw);
    if (!heroUrl.startsWith("https://")) return null;
    return {
      id: lead.id,
      title: typeof lead.title === "string" ? lead.title : "",
      heroUrl,
      href: lead.id != null ? `/ad/${lead.id}` : "/",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function buildHomeLcpHeadTags(lead) {
  if (!lead?.heroUrl) return "";
  const hero = escapeHtml(lead.heroUrl);
  const storageOrigin = storageOriginFromUrl(lead.heroUrl);
  const lines = [
    "<!-- P7-PR-12: Home LCP — discoverable from first HTML (preload + layer). -->",
    '<link rel="preconnect" href="https://api.souq-arab.com" crossorigin />',
  ];
  if (storageOrigin) {
    lines.push(`<link rel="preconnect" href="${escapeHtml(storageOrigin)}" crossorigin />`);
  }
  lines.push(
    `<link rel="preload" as="image" href="${hero}" fetchpriority="high" id="p7-lcp-hero-preload" />`,
  );
  return lines.join("\n    ");
}

/** Progressive LCP layer — sibling of #root; not replaced by createRoot. */
export function buildHomeLcpLayerHtml(lead) {
  if (!lead?.heroUrl) return "";
  const title = escapeHtml(lead.title || "");
  const hero = escapeHtml(lead.heroUrl);
  const href = escapeHtml(lead.href || "/");
  const heading = escapeHtml(GATE_FEATURED_HEADING);

  return `<header
      style="position:fixed;inset:0 0 auto 0;z-index:1;background:#0A0A0A;padding:max(12px,env(safe-area-inset-top,0px)) 16px 8px"
      dir="rtl"
    >
      <div
        style="display:flex;align-items:center;gap:8px;max-width:1280px;margin:0 auto;height:36px;border-radius:16px;border:1px solid rgba(194,235,108,.28);background:#0A0A0A"
        aria-hidden="true"
      ></div>
    </header>
    <section
      style="position:absolute;inset:0;padding-top:106px;max-width:1280px;margin:0 auto;padding-left:16px;padding-right:16px;box-sizing:border-box"
      dir="rtl"
    >
      <h2
        style="display:inline-flex;margin:0 0 6px;padding:2px 8px;border-radius:16px;border:1px solid rgba(194,235,108,.28);background:#0A0A0A;font-size:15px;font-weight:600;line-height:1.25;color:#fafafa;font-family:system-ui,-apple-system,sans-serif"
      >${heading}</h2>
      <div style="display:flex;gap:8px;overflow:hidden;padding-bottom:4px">
        <a
          href="${href}"
          style="display:block;flex:0 0 168px;width:168px;text-decoration:none;color:inherit;pointer-events:auto"
          tabindex="-1"
        >
          <article
            style="overflow:hidden;border-radius:12px;border:1px solid rgba(194,235,108,.3);background:#0A0A0A"
          >
            <div style="position:relative;width:100%;aspect-ratio:4/3;background:#0A0A0A;overflow:hidden">
              <img
                id="p7-lcp-candidate"
                data-testid="home-lcp-prerender"
                src="${hero}"
                alt="${title}"
                width="168"
                height="126"
                loading="eager"
                fetchpriority="high"
                decoding="async"
                style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"
              />
            </div>
          </article>
        </a>
      </div>
    </section>`;
}

/**
 * @returns {{ headTags: string, lcpLayer: string, lead: object } | null}
 */
export async function buildHomeShellInjection() {
  const lead = await fetchFeaturedLeadAd();
  if (!lead) return null;
  return {
    lead,
    headTags: buildHomeLcpHeadTags(lead),
    lcpLayer: buildHomeLcpLayerHtml(lead),
  };
}

export function acceptsDocumentHtml(request) {
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("text/html") || accept.includes("*/*");
}

/**
 * @param {string} html
 * @param {{ headTags?: string, lcpLayer?: string }} injection
 */
export function applyHomeShellToHtml(html, injection) {
  let out = html;
  if (injection.headTags) {
    if (out.includes(P7_HOME_LCP_HEAD_MARKER)) {
      out = out.replace(P7_HOME_LCP_HEAD_MARKER, injection.headTags);
    } else {
      out = out.replace("</head>", `    ${injection.headTags}\n  </head>`);
    }
  }
  if (injection.lcpLayer) {
    if (out.includes(P7_LCP_LAYER_MARKER)) {
      out = out.replace(P7_LCP_LAYER_MARKER, injection.lcpLayer);
    } else {
      out = out.replace(
        /<div id="p7-lcp-layer"[^>]*>\s*<\/div>/,
        `<div id="p7-lcp-layer" data-p7-pr="12">${injection.lcpLayer}</div>`,
      );
    }
  }
  return out;
}

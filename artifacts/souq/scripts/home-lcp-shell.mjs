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

/** SSOT mirror: ad-image-url.ts featuredLead variant (P9-D LCP sizing). */
const FEATURED_LEAD_PARAMS = "width=350&height=262&resize=cover&quality=80";

const GATE_FEATURED_HEADING = "إعلانات مميزة";
const GATE_RECOMMENDED_HEADING = "موصى لك";

/** Gate locale mirror — gate/ar.json home.search_placeholder (P9-E-FIX-A). */
const GATE_SEARCH_PLACEHOLDER = "ابحث عن منتج، خدمة، أو قسم...";

/** Feed-only shell starts below static header shell (fallback before runtime measure). */
export const HOME_SHELL_HEADER_OFFSET_PX = 138;

/** P9-E-FIX-A: static header shell marker (build + Edge). */
export const P9_E_HEADER_SHELL_MARKER = "<!-- P9-E-FIX-A:HEADER_SHELL -->";

/** P9-3C: static bottom nav shell marker (build + Edge). */
export const P9_3C_BOTTOM_NAV_SHELL_MARKER = "<!-- P9-3C:BOTTOM_NAV_SHELL -->";

const HEADER_SHELL_CATEGORY_SLOTS = 5;

/** Inline SVG — lucide Search 14px (shell only). */
const SHELL_SEARCH_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(250,250,250,0.55)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`;

/** Inline SVG — lucide MapPin 16px (shell only). */
const SHELL_MAP_PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C2EB6C" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>`;

/** Inline SVG — lucide Bell 16px (shell only). */
const SHELL_BELL_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C2EB6C" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/></svg>`;

function buildHeaderCategoryPlaceholderHtml() {
  return Array.from({ length: HEADER_SHELL_CATEGORY_SLOTS }, () => {
    return `<div style="flex:0 0 64px;width:64px;shrink:0" aria-hidden="true">
      <div style="display:flex;width:100%;flex-direction:column;align-items:center;gap:4px">
        <div style="display:flex;align-items:center;justify-content:center;height:40px;width:40px;shrink:0;border-radius:12px;border:1px solid rgba(194,235,108,0.28);background:rgba(194,235,108,0.05);box-shadow:0 0 0 1px rgba(194,235,108,0.1)"></div>
        <div style="display:flex;height:28px;width:100%;flex-direction:column;align-items:center;justify-content:center;gap:1px;text-align:center">
          <div style="height:8px;width:70%;border-radius:4px;background:rgba(255,255,255,0.04)"></div>
        </div>
      </div>
    </div>`;
  }).join("\n          ");
}

/**
 * P9-E-FIX-A: static Home header — search, location, bell, categories placeholders.
 * Matches React HomeFeedHeader dimensions (RTL Arabic default).
 */
export function buildHomeHeaderShellHtml() {
  const placeholder = escapeHtml(GATE_SEARCH_PLACEHOLDER);
  const categories = buildHeaderCategoryPlaceholderHtml();

  return `<header
      data-p7-header-shell="1"
      data-testid="home-header-shell"
      dir="rtl"
      aria-hidden="true"
      style="position:relative;box-sizing:border-box;max-width:1280px;margin:0 auto;padding:env(safe-area-inset-top,0px) 16px 0;font-family:system-ui,-apple-system,sans-serif"
    >
      <div style="display:flex;align-items:center;gap:8px;padding:12px 0 0;margin:0 -8px">
        <div
          role="search"
          data-testid="home-header-shell-search"
          dir="rtl"
          style="display:flex;min-height:36px;min-width:0;flex:1;align-items:center;gap:4px;border-radius:16px;border:1px solid rgba(194,235,108,0.28);background:rgba(10,10,10,0.75);padding:2px 4px 2px 6px;box-shadow:0 0 0 1px rgba(194,235,108,0.08)"
        >
          <div style="position:relative;min-height:36px;min-width:0;flex:1;display:flex;align-items:center">
            <span style="position:absolute;inset-inline-start:10px;top:50%;transform:translateY(-50%);display:flex;opacity:0.9;pointer-events:none">${SHELL_SEARCH_ICON_SVG}</span>
            <span style="display:block;width:100%;padding-inline:36px 6px;font-size:13px;line-height:1.25;color:rgba(250,250,250,0.45);text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${placeholder}</span>
          </div>
          <span
            data-testid="home-header-shell-location"
            style="display:inline-flex;height:32px;width:32px;shrink:0;align-items:center;justify-content:center;border-radius:16px;border:1px solid rgba(194,235,108,0.35);background:rgba(10,10,10,0.8);box-shadow:0 0 16px -12px rgba(194,235,108,0.32),0 0 0 1px rgba(194,235,108,0.15)"
          >${SHELL_MAP_PIN_SVG}</span>
        </div>
        <span
          data-testid="home-bell-slot"
          style="position:relative;display:inline-flex;height:36px;width:36px;shrink:0;align-items:center;justify-content:center;border-radius:16px;border:1px solid rgba(194,235,108,0.35);background:rgba(10,10,10,0.8);box-shadow:0 0 16px -12px rgba(194,235,108,0.32),0 0 0 1px rgba(194,235,108,0.15)"
        >${SHELL_BELL_ICON_SVG}</span>
      </div>
      <div
        data-testid="home-header-shell-categories"
        dir="rtl"
        style="min-width:0;padding-top:10px;margin:0 -16px;overflow:hidden"
      >
        <div style="display:flex;width:max-content;max-width:none;align-items:flex-start;gap:4px;padding:0 16px 2px 40px">
          ${categories}
        </div>
      </div>
      <div aria-hidden="true" style="position:relative;padding:4px 0 6px">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="height:1px;min-width:0;flex:1;background:linear-gradient(to left,transparent,rgba(194,235,108,0.16),rgba(194,235,108,0.08))"></div>
          <div style="height:4px;width:4px;shrink:0;border-radius:9999px;background:rgba(194,235,108,0.4);box-shadow:0 0 0 1px rgba(194,235,108,0.15)"></div>
          <div style="height:1px;min-width:0;flex:1;background:linear-gradient(to right,transparent,rgba(194,235,108,0.16),rgba(194,235,108,0.08))"></div>
        </div>
      </div>
    </header>`;
}

/** Gate locale mirror — gate/ar.json bottom_nav.* (P9-3C). */
const GATE_BOTTOM_NAV_HOME = "بحث";
const GATE_BOTTOM_NAV_FAVORITES = "المفضلة";
const GATE_BOTTOM_NAV_POST = "إعلان";
const GATE_BOTTOM_NAV_MESSAGES = "الرسائل";
const GATE_BOTTOM_NAV_ACCOUNT = "حسابي";

const SHELL_HOME_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C2EB6C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`;
const SHELL_HEART_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(194,235,108,0.58)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;
const SHELL_MESSAGE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(194,235,108,0.58)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>`;
const SHELL_USER_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(194,235,108,0.58)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
const SHELL_PLUS_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C2EB6C" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`;

function buildBottomNavSlotHtml({ label, icon, active, promote }) {
  const border = active ? "rgba(194,235,108,0.55)" : "rgba(194,235,108,0.3)";
  const bg = active ? "rgba(10,10,10,0.95)" : "rgba(10,10,10,0.82)";
  const ring = active ? "0 0 0 1px rgba(194,235,108,0.32)" : "0 0 0 1px rgba(194,235,108,0.14)";
  const labelColor = active ? "#C2EB6C" : "rgba(194,235,108,0.52)";
  const labelWeight = active ? "600" : "500";
  const iconBlock = promote
    ? `<div style="display:flex;height:28px;width:28px;align-items:center;justify-content:center;border-radius:9999px;border:1px solid rgba(194,235,108,0.5);background:rgba(10,10,10,0.9);box-shadow:0 0 12px -10px rgba(194,235,108,0.26)">${icon}</div>`
    : icon;
  return `<div style="display:flex;min-height:44px;flex:1;flex-direction:column;align-items:center;justify-content:center;gap:2px;border-radius:12px;border:1px solid ${border};background:${bg};box-shadow:${ring};padding:2px 2px">
        ${iconBlock}
        <span style="font-size:10px;font-weight:${labelWeight};line-height:1.2;color:${labelColor};font-family:system-ui,-apple-system,sans-serif">${escapeHtml(label)}</span>
      </div>`;
}

/**
 * P9-3C: static BottomNav shell — Arabic default, Home active, matches layout.tsx chrome.
 */
export function buildBottomNavShellHtml() {
  const home = buildBottomNavSlotHtml({ label: GATE_BOTTOM_NAV_HOME, icon: SHELL_HOME_ICON_SVG, active: true });
  const favorites = buildBottomNavSlotHtml({ label: GATE_BOTTOM_NAV_FAVORITES, icon: SHELL_HEART_ICON_SVG, active: false });
  const post = buildBottomNavSlotHtml({
    label: GATE_BOTTOM_NAV_POST,
    icon: SHELL_PLUS_ICON_SVG,
    active: false,
    promote: true,
  });
  const messages = buildBottomNavSlotHtml({ label: GATE_BOTTOM_NAV_MESSAGES, icon: SHELL_MESSAGE_ICON_SVG, active: false });
  const account = buildBottomNavSlotHtml({ label: GATE_BOTTOM_NAV_ACCOUNT, icon: SHELL_USER_ICON_SVG, active: false });

  return `<nav
      id="p7-bottom-nav-shell"
      data-p7-bottom-nav-shell="1"
      data-bottom-nav-shell
      dir="rtl"
      aria-hidden="true"
      style="position:fixed;inset-inline:0;bottom:0;z-index:40;display:flex;flex-direction:column;background:#0A0A0A;font-family:system-ui,-apple-system,sans-serif"
    >
      <div style="width:100%;border-top:1px solid rgba(163,230,53,0.25);background:#0A0A0A;box-shadow:0 -1px 0 rgba(163,230,53,0.06),0 -6px 20px -14px rgba(0,0,0,0.42)">
        <div
          data-bottom-nav-buttons
          style="display:flex;max-width:1536px;margin:0 auto;align-items:stretch;gap:2px;padding:2px 4px calc(2px + env(safe-area-inset-bottom,0px))"
        >
          ${home}
          ${favorites}
          ${post}
          ${messages}
          ${account}
        </div>
      </div>
    </nav>`;
}

/** P9-E-PROD-SHELL: neutral featured skeleton slots — never a lone real ad card. */
const FEATURED_SHELL_SLOT_COUNT = 4;
const FEATURED_SHELL_CARD_W = 168;

export const P7_LCP_LAYER_MARKER = "<!-- P7-PR-12:LCP_LAYER -->";
export const P7_HOME_LCP_HEAD_MARKER = "<!-- P7-PR-12:HOME_LCP_HEAD -->";

export function getAdImageFeaturedLeadUrl(originalUrl) {
  if (!originalUrl || typeof originalUrl !== "string") return "";
  const objectMatch = originalUrl.match(SUPABASE_OBJECT_PUBLIC);
  if (objectMatch) {
    return `${objectMatch[1]}/render/image/public/${objectMatch[2]}?${FEATURED_LEAD_PARAMS}`;
  }
  const renderMatch = originalUrl.match(
    /^(https:\/\/[^/]+\.supabase\.co\/storage\/v1)\/render\/image\/public\/(.+?)(?:\?.*)?$/,
  );
  if (renderMatch) {
    return `${renderMatch[1]}/render/image/public/${renderMatch[2]}?${FEATURED_LEAD_PARAMS}`;
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
    const heroUrl = getAdImageFeaturedLeadUrl(raw);
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

/** Neutral skeleton tile — no <article>, no product link, no visible product img (P9-E-FIX-B / RC-4). */
function buildFeaturedShellSlotHtml() {
  const w = FEATURED_SHELL_CARD_W;

  return `<div
          style="flex:0 0 ${w}px;width:${w}px;overflow:hidden;border-radius:12px;border:1px solid rgba(194,235,108,.22);background:#0A0A0A"
          aria-hidden="true"
        >
          <div style="position:relative;width:100%;aspect-ratio:4/3;background:rgba(255,255,255,0.04);overflow:hidden">
            <div style="position:absolute;inset:0;background:rgba(10,10,10,0.88)"></div>
          </div>
          <div style="height:10px;margin:6px 6px 4px;border-radius:4px;background:rgba(255,255,255,0.05)"></div>
          <div style="height:8px;margin:0 6px 8px;width:60%;border-radius:4px;background:rgba(255,255,255,0.04)"></div>
        </div>`;
}

/** LCP candidate — discoverable for preload/LCP, not visible in feed shell (P9-E-FIX-B). */
function buildHiddenLcpCandidateHtml(lead) {
  if (!lead?.heroUrl) return "";
  return `<img
        id="p7-lcp-candidate"
        data-testid="home-lcp-prerender"
        src="${escapeHtml(lead.heroUrl)}"
        alt=""
        width="350"
        height="262"
        loading="eager"
        fetchpriority="high"
        decoding="async"
        aria-hidden="true"
        style="position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden"
      />`;
}

function buildRecommendedShellGridHtml() {
  const cell = `<div aria-hidden="true" style="border-radius:12px;border:1px solid rgba(194,235,108,.22);background:#0A0A0A;overflow:hidden">
        <div style="width:100%;aspect-ratio:4/3;background:rgba(255,255,255,0.04)"></div>
        <div style="height:10px;margin:6px 6px 4px;border-radius:4px;background:rgba(255,255,255,0.05)"></div>
        <div style="height:8px;margin:0 6px 8px;width:55%;border-radius:4px;background:rgba(255,255,255,0.04)"></div>
      </div>`;
  return Array.from({ length: 4 }, () => cell).join("\n        ");
}

/**
 * Feed-area shell — neutral featured + recommended placeholders; hidden LCP img (P9-E-FIX-B).
 */
export function buildHomeLcpLayerHtml(lead) {
  if (!lead?.heroUrl) return "";
  const heading = escapeHtml(GATE_FEATURED_HEADING);
  const recHeading = escapeHtml(GATE_RECOMMENDED_HEADING);
  const slots = Array.from({ length: FEATURED_SHELL_SLOT_COUNT }, () => buildFeaturedShellSlotHtml()).join(
    "\n        ",
  );
  const hiddenLcp = buildHiddenLcpCandidateHtml(lead);
  const recGrid = buildRecommendedShellGridHtml();

  return `${hiddenLcp}<section
      style="position:absolute;inset:0;max-width:1280px;margin:0 auto;padding:2px 16px 0;box-sizing:border-box"
      dir="rtl"
      aria-busy="true"
      aria-hidden="true"
      data-p7-feed-shell="1"
    >
      <h2
        style="display:inline-flex;margin:0 0 8px;padding:2px 8px;border-radius:16px;border:1px solid rgba(194,235,108,.28);background:#0A0A0A;font-size:15px;font-weight:600;line-height:1.25;color:#fafafa;font-family:system-ui,-apple-system,sans-serif"
      >${heading}</h2>
      <div style="display:flex;gap:8px;overflow:hidden;padding-bottom:4px">
        ${slots}
      </div>
      <h2
        data-testid="home-shell-recommended-heading"
        style="display:inline-flex;margin:16px 0 8px;padding:2px 8px;border-radius:16px;border:1px solid rgba(194,235,108,.28);background:#0A0A0A;font-size:15px;font-weight:600;line-height:1.25;color:#fafafa;font-family:system-ui,-apple-system,sans-serif"
      >${recHeading}</h2>
      <div
        data-testid="home-shell-recommended-grid"
        style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding-bottom:8px"
      >
        ${recGrid}
      </div>
    </section>`;
}

/**
 * @returns {{ headerShell: string, bottomNavShell: string, headTags: string, lcpLayer: string, lead: object | null }}
 */
export async function buildHomeShellInjection() {
  const headerShell = buildHomeHeaderShellHtml();
  const bottomNavShell = buildBottomNavShellHtml();
  const lead = await fetchFeaturedLeadAd();
  if (!lead) {
    return { headerShell, bottomNavShell, headTags: "", lcpLayer: "", lead: null };
  }
  return {
    lead,
    headerShell,
    bottomNavShell,
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
 * @param {{ headerShell?: string, bottomNavShell?: string, headTags?: string, lcpLayer?: string }} injection
 */
export function applyHomeShellToHtml(html, injection) {
  let out = html;
  if (injection.headerShell) {
    if (out.includes(P9_E_HEADER_SHELL_MARKER)) {
      out = out.replace(P9_E_HEADER_SHELL_MARKER, injection.headerShell);
    } else {
      out = out.replace(
        /<div id="p7-header-shell"[^>]*>\s*<\/div>/,
        `<div id="p7-header-shell" data-p7-pr="12">${injection.headerShell}</div>`,
      );
    }
  }
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
  if (injection.bottomNavShell) {
    if (out.includes(P9_3C_BOTTOM_NAV_SHELL_MARKER)) {
      out = out.replace(P9_3C_BOTTOM_NAV_SHELL_MARKER, injection.bottomNavShell);
    } else {
      out = out.replace(
        /<div id="p7-bottom-nav-shell-mount"[^>]*>\s*<\/div>/,
        `<div id="p7-bottom-nav-shell-mount" data-p7-pr="12">${injection.bottomNavShell}</div>`,
      );
    }
  }
  return out;
}

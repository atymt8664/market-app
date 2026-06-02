/** P9-D: SSOT for Home LCP / featured-lead Supabase render params (mirrors ad-image-url.ts). */
export const FEATURED_LEAD_RENDER_PARAMS = "width=350&height=262&resize=cover&quality=80";

export const FEATURED_LEAD_RENDER_RE =
  /\/storage\/v1\/render\/image\/public\/.*width=350(?:&|&amp;)height=262(?:&|&amp;)resize=cover(?:&|&amp;)quality=80/;

export function htmlHasFeaturedLeadRenderUrl(html) {
  return (
    html.includes("/render/image/public/") &&
    (html.includes("width=350&height=262") || html.includes("width=350&amp;height=262"))
  );
}

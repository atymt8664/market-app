/**
 * P11-5 — Edge middleware (self-contained for Vercel bundle). Vercel root: artifacts/souq.
 */
const P11_ORIGIN = "https://www.souq-arab.com";
const P11_API_ORIGIN = "https://api.souq-arab.com/api";
const P11_BRAND = "Souq Arab EU";
const P11_LOGO_URL = `${P11_ORIGIN}/brand/logo-master.png`;
const P11_OFFICIAL_DESCRIPTION_AR =
  "منصة عربية متكاملة للبيع والشراء والخدمات والتواصل بين الأفراد، تجمع بين سهولة الاستخدام والأمان والسرعة، وتوفر بيئة حديثة لنشر الإعلانات واكتشاف الفرص وبناء الثقة والتفاعل داخل مجتمع عربي متنامٍ.";

const SUPABASE_OBJECT_PUBLIC =
  /^(https:\/\/[^/]+\.supabase\.co\/storage\/v1)\/object\/public\/(.+)$/;

const SOCIAL_BOT_UA =
  /facebookexternalhit|Facebot|Twitterbot|WhatsApp|TelegramBot|LinkedInBot|Slackbot|Discordbot|vkShare|PinterestBot|Google-Structured-Data-Testing-Tool/i;

const OG_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
  "X-P11-Og-Crawler": "1",
};

export const config = {
  matcher: ["/", "/ad/:path*", "/users/:path*"],
};

function isSocialCrawler(userAgent) {
  return SOCIAL_BOT_UA.test(userAgent || "");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncateText(text, max = 200) {
  const clean = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return "";
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

function toOgImageUrl(originalUrl) {
  if (!originalUrl || typeof originalUrl !== "string") return P11_LOGO_URL;
  const trimmed = originalUrl.trim();
  if (!/^https:\/\//i.test(trimmed)) return P11_LOGO_URL;
  const match = trimmed.match(SUPABASE_OBJECT_PUBLIC);
  if (match) {
    const params = "width=1200&height=630&resize=cover&quality=82";
    return `${match[1]}/render/image/public/${match[2]}?${params}`;
  }
  return trimmed;
}

function isPublicShareImageUrl(url) {
  if (!url || typeof url !== "string") return false;
  const t = url.trim();
  return /^https:\/\//i.test(t) && !/^data:/i.test(t);
}

function buildHomeShareMeta() {
  return {
    title: `${P11_BRAND} | سوق العرب EU`,
    description: P11_OFFICIAL_DESCRIPTION_AR,
    url: `${P11_ORIGIN}/`,
    type: "website",
    imageUrl: P11_LOGO_URL,
    imageAlt: `${P11_BRAND} logo`,
    locale: "ar_AR",
  };
}

function buildAdShareMeta(ad) {
  const id = ad?.id;
  const title = ad?.title
    ? `${truncateText(ad.title, 80)} | ${P11_BRAND}`
    : `إعلان | ${P11_BRAND}`;
  const parts = [];
  const desc = truncateText(ad?.description, 160);
  if (desc) parts.push(desc);
  if (ad?.price != null && ad?.priceType !== "free") {
    const priceNum = Number(ad.price);
    if (Number.isFinite(priceNum)) parts.push(`${priceNum} EUR`);
  } else if (ad?.priceType === "free") {
    parts.push("مجاني");
  }
  if (ad?.city) parts.push(String(ad.city).trim());
  const description =
    parts.length > 0 ? truncateText(parts.join(" · "), 200) : P11_OFFICIAL_DESCRIPTION_AR;
  const firstImage = Array.isArray(ad?.images) ? ad.images[0] : null;
  const imageUrl = isPublicShareImageUrl(firstImage) ? toOgImageUrl(firstImage) : P11_LOGO_URL;
  return {
    title,
    description,
    url: `${P11_ORIGIN}/ad/${id}`,
    type: "article",
    imageUrl,
    imageAlt: ad?.title ? truncateText(ad.title, 120) : P11_BRAND,
    locale: "ar_AR",
  };
}

function buildProfileShareMeta(profile) {
  const id = profile?.id;
  const displayName = truncateText(profile?.name, 80) || "مستخدم";
  const title = `${displayName} | ${P11_BRAND}`;
  const description = `ملف شخصي على ${P11_BRAND}`;
  const avatar = profile?.avatarUrl;
  const imageUrl = isPublicShareImageUrl(avatar) ? toOgImageUrl(avatar) : P11_LOGO_URL;
  return {
    title,
    description,
    url: `${P11_ORIGIN}/users/${id}`,
    type: "website",
    imageUrl,
    imageAlt: displayName,
    locale: "ar_AR",
  };
}

function renderOgHtml(meta) {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const url = escapeHtml(meta.url);
  const image = escapeHtml(meta.imageUrl || P11_LOGO_URL);
  const imageAlt = escapeHtml(meta.imageAlt || P11_BRAND);
  const type = escapeHtml(meta.type || "website");
  const locale = escapeHtml(meta.locale || "ar_AR");
  const siteName = escapeHtml(P11_BRAND);

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<title>${title}</title>
<meta name="description" content="${description}" />
<link rel="canonical" href="${url}" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:url" content="${url}" />
<meta property="og:type" content="${type}" />
<meta property="og:site_name" content="${siteName}" />
<meta property="og:locale" content="${locale}" />
<meta property="og:image" content="${image}" />
<meta property="og:image:secure_url" content="${image}" />
<meta property="og:image:alt" content="${imageAlt}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${image}" />
<meta name="twitter:image:alt" content="${imageAlt}" />
</head>
<body><p>${title}</p></body>
</html>`;
}

async function fetchPublicAd(adId) {
  const res = await fetch(`${P11_API_ORIGIN}/ads/${adId}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchPublicProfile(userId) {
  const res = await fetch(`${P11_API_ORIGIN}/users/${userId}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function middleware(request) {
  const ua = request.headers.get("user-agent") ?? "";
  if (!isSocialCrawler(ua)) return;

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

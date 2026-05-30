/**
 * P11-5 — shared Open Graph HTML builders (Vercel serverless + local tests).
 * No private fields (phone, email). Logo Master fallback when image missing.
 */

export const P11_ORIGIN = "https://www.souq-arab.com";
export const P11_API_ORIGIN = "https://api.souq-arab.com/api";
export const P11_BRAND = "Souq Arab EU";
export const P11_LOGO_URL = `${P11_ORIGIN}/brand/logo-master.png`;
export const P11_OG_HOME_IMAGE_URL = `${P11_ORIGIN}/brand/og-share-home.jpg`;
export const P11_OG_IMAGE_WIDTH = 1200;
export const P11_OG_IMAGE_HEIGHT = 630;
export const P11_OFFICIAL_DESCRIPTION_AR =
  "منصة عربية متكاملة للبيع والشراء والخدمات والتواصل بين الأفراد، تجمع بين سهولة الاستخدام والأمان والسرعة، وتوفر بيئة حديثة لنشر الإعلانات واكتشاف الفرص وبناء الثقة والتفاعل داخل مجتمع عربي متنامٍ.";

const SUPABASE_OBJECT_PUBLIC =
  /^(https:\/\/[^/]+\.supabase\.co\/storage\/v1)\/object\/public\/(.+)$/;

const SOCIAL_BOT_UA =
  /facebookexternalhit|Facebot|Twitterbot|WhatsApp|TelegramBot|LinkedInBot|Slackbot|Discordbot|vkShare|PinterestBot|Google-Structured-Data-Testing-Tool/i;

export function isSocialCrawler(userAgent) {
  return SOCIAL_BOT_UA.test(userAgent || "");
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function truncateText(text, max = 200) {
  const clean = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return "";
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

/** OG-friendly hero image (1200×630 cover) for ad/listing photos. */
export function toOgImageUrl(originalUrl) {
  if (!originalUrl || typeof originalUrl !== "string") return P11_OG_HOME_IMAGE_URL;
  const trimmed = originalUrl.trim();
  if (!/^https:\/\//i.test(trimmed)) return P11_OG_HOME_IMAGE_URL;
  const match = trimmed.match(SUPABASE_OBJECT_PUBLIC);
  if (match) {
    const params = "width=1200&height=630&resize=cover&quality=82";
    return `${match[1]}/render/image/public/${match[2]}?${params}`;
  }
  return trimmed;
}

/** OG-friendly avatar (1200×630 contain — full face visible, no harsh crop). */
export function toOgAvatarUrl(originalUrl) {
  if (!originalUrl || typeof originalUrl !== "string") return P11_OG_HOME_IMAGE_URL;
  const trimmed = originalUrl.trim();
  if (!/^https:\/\//i.test(trimmed)) return P11_OG_HOME_IMAGE_URL;
  const match = trimmed.match(SUPABASE_OBJECT_PUBLIC);
  if (match) {
    const params = "width=1200&height=630&resize=contain&quality=82";
    return `${match[1]}/render/image/public/${match[2]}?${params}`;
  }
  return trimmed;
}

export function isPublicShareImageUrl(url) {
  if (!url || typeof url !== "string") return false;
  const t = url.trim();
  return /^https:\/\//i.test(t) && !/^data:/i.test(t);
}

export function buildHomeShareMeta() {
  return {
    title: `${P11_BRAND} | سوق العرب EU`,
    description: P11_OFFICIAL_DESCRIPTION_AR,
    url: `${P11_ORIGIN}/`,
    type: "website",
    imageUrl: P11_OG_HOME_IMAGE_URL,
    imageAlt: `${P11_BRAND} — سوق العرب EU`,
    imageWidth: P11_OG_IMAGE_WIDTH,
    imageHeight: P11_OG_IMAGE_HEIGHT,
    imageType: "image/jpeg",
    locale: "ar_AR",
  };
}

export function buildAdShareMeta(ad) {
  const id = ad?.id;
  const title = ad?.title
    ? `${truncateText(ad.title, 80)} | ${P11_BRAND}`
    : `إعلان | ${P11_BRAND}`;
  const parts = [];
  const desc = truncateText(ad?.description, 140);
  if (desc) parts.push(desc);
  if (ad?.price != null && ad?.priceType !== "free") {
    const priceNum = Number(ad.price);
    if (Number.isFinite(priceNum)) {
      parts.push(`${priceNum} EUR`);
    }
  } else if (ad?.priceType === "free") {
    parts.push("مجاني");
  }
  if (ad?.city) parts.push(String(ad.city).trim());
  parts.push(`إعلان على ${P11_BRAND}`);
  const description =
    parts.length > 0 ? truncateText(parts.join(" · "), 200) : P11_OFFICIAL_DESCRIPTION_AR;
  const firstImage = Array.isArray(ad?.images) ? ad.images[0] : null;
  const imageUrl = isPublicShareImageUrl(firstImage)
    ? toOgImageUrl(firstImage)
    : P11_OG_HOME_IMAGE_URL;
  return {
    title,
    description,
    url: `${P11_ORIGIN}/ad/${id}`,
    type: "article",
    imageUrl,
    imageAlt: ad?.title ? truncateText(ad.title, 120) : P11_BRAND,
    imageWidth: P11_OG_IMAGE_WIDTH,
    imageHeight: P11_OG_IMAGE_HEIGHT,
    imageType: "image/jpeg",
    locale: "ar_AR",
  };
}

export function buildProfileShareMeta(profile) {
  const id = profile?.id;
  const displayName = truncateText(profile?.name, 80) || "مستخدم";
  const title = `${displayName} | ${P11_BRAND}`;
  const parts = [];
  const city = profile?.city ? String(profile.city).trim() : "";
  if (city) parts.push(city);
  parts.push(`شاهد ملف المستخدم على ${P11_BRAND}`);
  const description = truncateText(parts.join(" · "), 200);
  const avatar = profile?.avatarUrl;
  const imageUrl = isPublicShareImageUrl(avatar) ? toOgAvatarUrl(avatar) : P11_OG_HOME_IMAGE_URL;
  return {
    title,
    description,
    url: `${P11_ORIGIN}/users/${id}`,
    type: "profile",
    imageUrl,
    imageAlt: displayName,
    imageWidth: P11_OG_IMAGE_WIDTH,
    imageHeight: P11_OG_IMAGE_HEIGHT,
    imageType: "image/jpeg",
    locale: "ar_AR",
  };
}

export function renderOgHtml(meta) {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const url = escapeHtml(meta.url);
  const image = escapeHtml(meta.imageUrl || P11_OG_HOME_IMAGE_URL);
  const imageAlt = escapeHtml(meta.imageAlt || P11_BRAND);
  const type = escapeHtml(meta.type || "website");
  const locale = escapeHtml(meta.locale || "ar_AR");
  const siteName = escapeHtml(P11_BRAND);
  const imageWidth = meta.imageWidth ?? P11_OG_IMAGE_WIDTH;
  const imageHeight = meta.imageHeight ?? P11_OG_IMAGE_HEIGHT;
  const imageType = escapeHtml(meta.imageType || "image/jpeg");

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
<meta property="og:image:width" content="${imageWidth}" />
<meta property="og:image:height" content="${imageHeight}" />
<meta property="og:image:type" content="${imageType}" />
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

export async function fetchPublicAd(adId) {
  const res = await fetch(`${P11_API_ORIGIN}/ads/${adId}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchPublicProfile(userId) {
  const res = await fetch(`${P11_API_ORIGIN}/users/${userId}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  return res.json();
}

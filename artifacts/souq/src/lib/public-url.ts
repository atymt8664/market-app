/**
 * جذر الموقع العام للروابط المشتركة (إعلان، ملف شخصي).
 * - `VITE_PUBLIC_APP_URL` إن وُجد (مثل https://souq-arab.com أو مع مسار فرعي).
 * - في التطوير: نفس الأصل الحالي + `BASE_URL`.
 * - في إنتاج بدون متغير: النطاق الافتراضي souq-arab.com (حتى تكون الروابط قابلة للمشاركة).
 */
const DEFAULT_PRODUCTION_PUBLIC_ORIGIN = "https://souq-arab.com";

export function getPublicAppRootUrl(): string {
  const fromEnv =
    typeof import.meta.env.VITE_PUBLIC_APP_URL === "string"
      ? import.meta.env.VITE_PUBLIC_APP_URL.trim()
      : "";
  if (fromEnv && /^https?:\/\//i.test(fromEnv)) {
    return fromEnv.replace(/\/+$/, "");
  }
  if (import.meta.env.DEV) {
    if (typeof window === "undefined") return "";
    const base = new URL(import.meta.env.BASE_URL ?? "/", window.location.origin);
    const path = base.pathname.replace(/\/+$/, "");
    return `${base.origin}${path}` || base.origin;
  }
  return DEFAULT_PRODUCTION_PUBLIC_ORIGIN.replace(/\/+$/, "");
}

function joinRoot(pathSegment: string): string {
  const root = getPublicAppRootUrl();
  if (!root) return "";
  return new URL(pathSegment, `${root}/`).href;
}

/** رابط مطلق لصفحة إعلان عامة (مشاركة، رسائل). */
export function getPublicAdUrl(adId: number): string {
  return joinRoot(`ad/${adId}`);
}

/** رابط مطلق لصفحة ملف مستخدم عام (`/users/:id`). */
export function getPublicUserProfileUrl(userId: number): string {
  return joinRoot(`users/${userId}`);
}

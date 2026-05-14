export type PromoteAdPreview = {
  title: string;
  imageUrl: string | null;
};

function storageKey(adId: number): string {
  return `souq:promote-preview:v1:${adId}`;
}

/** يخزّن معاينة الإعلان قبل الانتقال إلى `/promote/:id` (بدون طلب شبكة). */
export function stashPromoteAdPreview(adId: number, preview: PromoteAdPreview): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(storageKey(adId), JSON.stringify(preview));
  } catch {
    // تجاهل الحصة / الوضع الخاص
  }
}

export function readPromoteAdPreview(adId: number): PromoteAdPreview | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey(adId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Record<string, unknown>;
    const title = typeof o.title === "string" ? o.title.trim() : "";
    const imageUrl =
      typeof o.imageUrl === "string" ? o.imageUrl : o.imageUrl === null ? null : null;
    return { title, imageUrl };
  } catch {
    return null;
  }
}

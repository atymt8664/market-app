function isAbortError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    (e as { name?: string }).name === "AbortError"
  );
}

function resolveAbsoluteUrlForFetch(raw: string): string {
  const u = raw.trim();
  if (/^https?:\/\//i.test(u)) return u;
  if (typeof window !== "undefined" && u.startsWith("/")) {
    return `${window.location.origin}${u}`;
  }
  return u;
}

/** يُحمّل أول صورة إعلان كملف للمشاركة عند دعم المتصفح (قد يفشل بسبب CORS). */
export async function tryAdImageAsShareFile(
  imageUrl: string | undefined,
): Promise<File | undefined> {
  if (!imageUrl?.trim() || typeof fetch === "undefined") return undefined;
  const abs = resolveAbsoluteUrlForFetch(imageUrl);
  try {
    const res = await fetch(abs, { mode: "cors" });
    if (!res.ok) return undefined;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return undefined;
    const ext = blob.type.includes("png")
      ? "png"
      : blob.type.includes("webp")
        ? "webp"
        : "jpg";
    return new File([blob], `ad.${ext}`, { type: blob.type });
  } catch {
    return undefined;
  }
}

export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

/**
 * Web Share عند التوفر؛ إن فشلت مشاركة ملفات تُعاد المحاولة بالنص فقط؛
 * ثم نسخ الرابط إلى الحافظة.
 */
export async function shareOrCopyLink(options: {
  title: string;
  text: string;
  url: string;
  /** صورة واحدة اختيارية (إن دعمها المكان / المتصفح) */
  imageFile?: File;
}): Promise<ShareOutcome> {
  const { title, text, url, imageFile } = options;

  const tryShare = async (files?: File[]) => {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
      return false;
    }
    const payload: ShareData = { title, text, url };
    if (files?.length) {
      const withFiles = { ...payload, files } as ShareData & { files: File[] };
      if (typeof navigator.canShare === "function") {
        try {
          if (!navigator.canShare(withFiles)) {
            return false;
          }
        } catch {
          return false;
        }
      }
      try {
        await navigator.share(withFiles);
        return true;
      } catch (e) {
        if (isAbortError(e)) throw e;
        return false;
      }
    }
    try {
      await navigator.share(payload);
      return true;
    } catch (e) {
      if (isAbortError(e)) throw e;
      return false;
    }
  };

  try {
    if (imageFile) {
      const ok = await tryShare([imageFile]);
      if (ok) return "shared";
      const textOnly = await tryShare();
      if (textOnly) return "shared";
    } else {
      const ok = await tryShare();
      if (ok) return "shared";
    }
  } catch (e) {
    if (isAbortError(e)) return "cancelled";
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      return "copied";
    } catch {
      return "failed";
    }
  }
  return "failed";
}

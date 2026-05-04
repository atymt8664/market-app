/** مسار الصفحة التي يجب العودة إليها (مع استعادة التمرير) عند الرجوع من صفحة فرعية */
const RETURN_KEY = "souq.returnTargetPath";

/** يُضبط قبل فتح privacy/terms/help من الإعدادات أو التسجيل — يُفضّل على URL إذا كان الاستعلام لم يُحدَّث بعد */
export const LEGAL_EXPLICIT_RETURN_KEY = "souq.legalExplicitReturn";

/**
 * يضبطه فقط مسارات ثقة (الإعدادات/التسجيل/حسابي) قبل التنقل — يتفوق على returnTo الظاهر في الرابط
 * (مثال: ?returnTo=/signup قديم في شريط العنوان لا يلغي عودة المستخدم من الإعدادات).
 */
export const LEGAL_NAV_RETURN_KEY = "souq.legalNavigationReturn";

/** يُضاف للروابط القانونية/المساعدة */
export const RETURN_TO_QUERY = "returnTo";

/** يضبطه التنقل قبل navigate(replace) حتى RouteScrollRestoration يستعيد التمرير — يجب أن يطابق browserRouteKey() (يشمل BASE_URL) */
export const FORCE_RESTORE_PATH_KEY = "souq.forceRestorePath";

export function stashReturnTarget(path: string): void {
  try {
    if (path.startsWith("/")) sessionStorage.setItem(RETURN_KEY, path);
  } catch {
    /* ignore */
  }
}

/** يطابق window.location.pathname بعد الانتقال إلى مسار داخلي مثل /settings (بدون استعلام) */
export function browserPathKeyForInternalRoute(internalPath: string): string {
  const pathOnly = internalPath.split("?")[0] ?? internalPath;
  if (!pathOnly.startsWith("/")) return pathOnly;
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  return `${base}${pathOnly}`;
}

/** قراءة الاستعلام من شريط العنوان عند النقر */
export function getBrowserSearchRaw(): string {
  if (typeof window === "undefined") return "";
  const s = window.location.search;
  return s.startsWith("?") ? s.slice(1) : s;
}

export function appendReturnToQuery(path: string, returnTo: string): string {
  if (!returnTo.startsWith("/")) return path;
  const q = path.indexOf("?");
  const base = q === -1 ? path : path.slice(0, q);
  const existing = q === -1 ? "" : path.slice(q + 1);
  const params = new URLSearchParams(existing);
  params.set(RETURN_TO_QUERY, returnTo);
  const serialized = params.toString();
  return serialized ? `${base}?${serialized}` : base;
}

export function parseReturnToFromSearch(search: string): string | null {
  const rawSearch = search.startsWith("?") ? search.slice(1) : search;
  if (!rawSearch.trim()) return null;
  try {
    const params = new URLSearchParams(rawSearch);
    const raw = params.get(RETURN_TO_QUERY) ?? params.get("return");
    if (!raw) return null;
    const decoded = decodeURIComponent(raw.trim());
    if (!decoded.startsWith("/") || decoded.startsWith("//")) return null;
    if (decoded.includes("://")) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function stashLegalExplicitReturn(path: string): void {
  try {
    if (path.startsWith("/")) sessionStorage.setItem(LEGAL_EXPLICIT_RETURN_KEY, path);
  } catch {
    /* ignore */
  }
}

export function stashLegalNavigationReturn(path: string): void {
  try {
    if (path.startsWith("/")) sessionStorage.setItem(LEGAL_NAV_RETURN_KEY, path);
  } catch {
    /* ignore */
  }
}

/** يُستدعى من صفحات الخصوصية/الشروط/المساعدة عند توفر returnTo في الرابط */
export function syncLegalExplicitFromCurrentUrl(): void {
  const q = parseReturnToFromSearch(getBrowserSearchRaw());
  if (q) stashLegalExplicitReturn(q);
}

export type LegalBackResolution = {
  dest: string;
  fromUrl: string | null;
  explicit: string | null;
  usedTrustedStack: boolean;
  /** قيمة souq.legalNavigationReturn عند الحل (للتشخيص) */
  trustedRead: string | null;
};

/**
 * حل وجهة الرجوع بدون تنفيذ navigate — للواجهة التشخيصية واختبارات الوحدة.
 * الأولوية: souq.legalNavigationReturn (مسار ثقة) ثم returnTo من الرابط ثم souq.legalExplicitReturn ثم fallback.
 */
export function resolveLegalBackDestination(
  searchFromLocation: string,
  fallback: string = "/settings",
): LegalBackResolution {
  let trustedRead: string | null = null;
  try {
    const t = sessionStorage.getItem(LEGAL_NAV_RETURN_KEY);
    if (t && t.startsWith("/")) trustedRead = t;
  } catch {
    /* ignore */
  }

  if (trustedRead) {
    let explicit: string | null = null;
    try {
      const e = sessionStorage.getItem(LEGAL_EXPLICIT_RETURN_KEY);
      if (e && e.startsWith("/")) explicit = e;
    } catch {
      /* ignore */
    }
    return {
      dest: trustedRead,
      fromUrl: parseReturnToFromSearch(searchFromLocation),
      explicit,
      usedTrustedStack: true,
      trustedRead,
    };
  }

  const fromUrl = parseReturnToFromSearch(searchFromLocation);
  let explicit: string | null = null;
  try {
    const e = sessionStorage.getItem(LEGAL_EXPLICIT_RETURN_KEY);
    if (e && e.startsWith("/")) explicit = e;
  } catch {
    /* ignore */
  }

  let dest: string;
  if (fromUrl) {
    dest = fromUrl;
  } else if (explicit) {
    dest = explicit;
  } else {
    dest = fallback;
  }

  return {
    dest,
    fromUrl,
    explicit,
    usedTrustedStack: false,
    trustedRead: null,
  };
}

/**
 * رجوع صفحات الخصوصية/الشروط/المساعدة:
 * - إن وُجد souq.legalNavigationReturn يُستخدم أولاً (فوق returnTo في الرابط).
 * - ثم returnTo من الرابط، ثم souq.legalExplicitReturn، ثم fallback.
 * - يمسح مفاتيح الرجوع من الجلسة.
 * - لا يستخدم history.back().
 */
export function navigateBackFromLegalPage(
  navigate: (to: string, opts?: { replace?: boolean }) => void,
  searchFromLocation: string,
  fallback: string = "/settings",
): void {
  const { dest } = resolveLegalBackDestination(searchFromLocation, fallback);

  try {
    sessionStorage.removeItem(LEGAL_EXPLICIT_RETURN_KEY);
    sessionStorage.removeItem(RETURN_KEY);
    sessionStorage.removeItem(LEGAL_NAV_RETURN_KEY);
  } catch {
    /* ignore */
  }

  if (!dest.startsWith("/") || dest.startsWith("//") || dest.includes("://")) {
    const fb = fallback.startsWith("/") ? fallback : "/settings";
    sessionStorage.setItem(FORCE_RESTORE_PATH_KEY, browserPathKeyForInternalRoute(fb));
    navigate(fb, { replace: true });
    return;
  }

  sessionStorage.setItem(FORCE_RESTORE_PATH_KEY, browserPathKeyForInternalRoute(dest));
  navigate(dest, { replace: true });
}

function setForceRestoreForInternalPath(internalPath: string): void {
  sessionStorage.setItem(FORCE_RESTORE_PATH_KEY, browserPathKeyForInternalRoute(internalPath));
}

/** يُستدعى من زر الرجوع في الصفحات الفرعية */
export function navigateBackFromChild(
  navigate: (to: string, opts?: { replace?: boolean }) => void,
  options?: { search?: string; fallback?: string },
): void {
  const fromQuery = parseReturnToFromSearch(options?.search ?? "");
  if (fromQuery) {
    try {
      sessionStorage.removeItem(RETURN_KEY);
    } catch {
      /* ignore */
    }
    try {
      setForceRestoreForInternalPath(fromQuery);
      navigate(fromQuery, { replace: true });
      return;
    } catch {
      /* ignore */
    }
    const fb = options?.fallback;
    if (fb && fb.startsWith("/")) {
      try {
        setForceRestoreForInternalPath(fb);
        navigate(fb, { replace: true });
      } catch {
        window.history.back();
      }
      return;
    }
    window.history.back();
    return;
  }

  try {
    const rt = sessionStorage.getItem(RETURN_KEY);
    sessionStorage.removeItem(RETURN_KEY);
    if (rt && rt.startsWith("/")) {
      setForceRestoreForInternalPath(rt);
      navigate(rt, { replace: true });
      return;
    }
  } catch {
    /* ignore */
  }

  const fb = options?.fallback;
  if (fb && fb.startsWith("/")) {
    try {
      setForceRestoreForInternalPath(fb);
      navigate(fb, { replace: true });
    } catch {
      window.history.back();
    }
    return;
  }

  window.history.back();
}

export function clearReturnTargetIfLandingHere(routeKey: string): void {
  try {
    const rt = sessionStorage.getItem(RETURN_KEY);
    if (rt && (routeKey === rt || routeKey.startsWith(`${rt}?`))) {
      sessionStorage.removeItem(RETURN_KEY);
    }
  } catch {
    /* ignore */
  }
}

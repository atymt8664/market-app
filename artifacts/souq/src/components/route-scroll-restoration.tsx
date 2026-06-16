import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { scrollPopstateGuard } from "@/components/scroll-restoration-guard";
import { getAppShellScrollElement } from "@/lib/app-shell-scroll";
import {
  FORCE_RESTORE_PATH_KEY,
  clearReturnTargetIfLandingHere,
} from "@/lib/return-navigation";

const STORAGE_PREFIX = "souq:scroll:";

/** يُزامن مع pathname من wouter (بدون بادئة BASE_URL) — وإلا مفتاح التخزين لا يطابق و`isAdDetail` يفشل بعد النشر تحت مسار فرعي. */
function normalizeScrollRoutePathname(fullPathname: string): string {
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  let path =
    base && fullPathname.startsWith(base)
      ? fullPathname.slice(base.length)
      : fullPathname;
  if (!path || path === "") path = "/";
  if (!path.startsWith("/")) path = `/${path}`;
  return path;
}

function storageKey(routeKey: string): string {
  return STORAGE_PREFIX + routeKey;
}

/** تفاصيل إعلان — أي مقطع واحد بعد /ad/ (رقم أو معرف آخر من الخادم) */
function isAdDetailPathname(pathname: string): boolean {
  return /^\/ad\/[^/]+$/.test(pathname);
}

function readScroll(routeKey: string): number | null {
  if (isAdDetailPathname(routeKey)) return null;
  try {
    const raw = sessionStorage.getItem(storageKey(routeKey));
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : null;
  } catch {
    return null;
  }
}

function writeScroll(routeKey: string, y: number): void {
  if (isAdDetailPathname(routeKey)) return;
  try {
    sessionStorage.setItem(storageKey(routeKey), String(Math.max(0, Math.round(y))));
  } catch {
    // quota / private mode
  }
}

function resolveScrollElement(): HTMLElement | null {
  return getAppShellScrollElement() ?? document.scrollingElement ?? document.documentElement;
}

function getViewportScrollY(): number {
  if (typeof window === "undefined") return 0;
  const shell = getAppShellScrollElement();
  if (shell) return shell.scrollTop;
  const se = document.scrollingElement;
  if (se && typeof se.scrollTop === "number") return se.scrollTop;
  return (
    window.scrollY ??
    window.pageYOffset ??
    document.documentElement.scrollTop ??
    document.body.scrollTop ??
    0
  );
}

function setViewportScrollY(y: number): void {
  const top = Math.max(0, Math.round(y));
  const shell = getAppShellScrollElement();
  if (shell) {
    shell.scrollTop = top;
    return;
  }
  const se = document.scrollingElement;
  if (se) se.scrollTop = top;
  window.scrollTo({ top, left: 0, behavior: "auto" });
}

function scrollRouteKey(): string {
  return normalizeScrollRoutePathname(window.location.pathname);
}

function flushScrollPosition(): void {
  const k = scrollRouteKey();
  if (isAdDetailPathname(k)) return;
  writeScroll(k, getViewportScrollY());
}

/** كل تنقل جديد يلغي requestAnimationFrame/setTimeout السابقة لـ scheduleRestore حتى لا يُعاد سكرول قديم بعد setViewportScrollY(0). */
let scrollRestoreGeneration = 0;

/** rAF + one delayed pass — enough for lazy routes without triple scroll jank (7B). */
function scheduleRestore(y: number, generation: number): void {
  const apply = () => {
    if (generation !== scrollRestoreGeneration) return;
    setViewportScrollY(y);
  };
  apply();
  requestAnimationFrame(() => {
    if (generation !== scrollRestoreGeneration) return;
    apply();
    requestAnimationFrame(() => {
      if (generation !== scrollRestoreGeneration) return;
      apply();
      window.setTimeout(apply, 50);
    });
  });
}

/** دخول صفحة إعلان (أمامي أو popstate): دائمًا أعلى النافذة — لا استعادة من sessionStorage. */
function forceAdDetailTop(generation: number): void {
  scheduleRestore(0, generation);
  requestAnimationFrame(() => {
    if (generation !== scrollRestoreGeneration) return;
    setViewportScrollY(0);
    window.setTimeout(() => {
      if (generation !== scrollRestoreGeneration) return;
      setViewportScrollY(0);
    }, 32);
  });
}

function forceRestoreMatchesRoute(storedRaw: string, currentKey: string): boolean {
  const storedPath = normalizeScrollRoutePathname(
    (storedRaw.split("?")[0] ?? storedRaw).split("#")[0],
  );
  const currentPath = normalizeScrollRoutePathname(
    (currentKey.split("?")[0] ?? currentKey).split("#")[0],
  );
  if (currentPath === storedPath) return true;
  if (currentKey.startsWith(`${storedPath}?`)) return true;
  if (currentKey.startsWith(`${storedPath}#`)) return true;
  return false;
}

export function RouteScrollRestoration() {
  const [pathname] = useLocation();
  const search = useSearch();
  const routeSignature = `${pathname}${search ? `?${search}` : ""}`;
  const popRef = useRef(false);
  const prevBrowserRouteKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const onPop = () => {
      if (scrollPopstateGuard.skipNext) {
        scrollPopstateGuard.skipNext = false;
        return;
      }
      popRef.current = true;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    const prev = history.scrollRestoration;
    history.scrollRestoration = "manual";
    return () => {
      history.scrollRestoration = prev;
    };
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushScrollPosition();
    };
    const onPointerDown = (e: PointerEvent) => {
      const el = e.target;
      if (
        el instanceof Element &&
        el.closest("[data-chat-scroll]")
      ) {
        return;
      }
      flushScrollPosition();
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const k = scrollRouteKey();
      if (isAdDetailPathname(k)) return;
      writeScroll(k, getViewportScrollY());
    };
    const shell = getAppShellScrollElement();
    const target = shell ?? window;
    target.addEventListener("scroll", onScroll, { passive: true });
    return () => target.removeEventListener("scroll", onScroll);
  }, [routeSignature]);

  useLayoutEffect(() => {
    scrollRestoreGeneration += 1;
    const restoreGen = scrollRestoreGeneration;

    const key = scrollRouteKey();
    const isPop = popRef.current;

    /**
     * صفحة إعلان: دائمًا من الأعلى (تنقل أمامي أو popstate).
     * لا قراءة/استعادة ولا حفظ لسكرول الإعلان في sessionStorage.
     */
    if (isAdDetailPathname(key)) {
      if (isPop) {
        popRef.current = false;
        clearReturnTargetIfLandingHere(key);
      }
      try {
        sessionStorage.removeItem(storageKey(key));
      } catch {
        /* ignore */
      }
      forceAdDetailTop(restoreGen);
      prevBrowserRouteKeyRef.current = key;
      return;
    }

    if (isPop) {
      popRef.current = false;
      clearReturnTargetIfLandingHere(key);
      const y = readScroll(key);
      if (y !== null) {
        scheduleRestore(y, restoreGen);
      }
      prevBrowserRouteKeyRef.current = key;
      return;
    }

    const forced = sessionStorage.getItem(FORCE_RESTORE_PATH_KEY);
    if (forced) {
      if (forceRestoreMatchesRoute(forced, key)) {
        try {
          sessionStorage.removeItem(FORCE_RESTORE_PATH_KEY);
        } catch {
          /* ignore */
        }
        const y = readScroll(key);
        if (y !== null) {
          scheduleRestore(y, restoreGen);
        }
        prevBrowserRouteKeyRef.current = key;
        return;
      }
      try {
        sessionStorage.removeItem(FORCE_RESTORE_PATH_KEY);
      } catch {
        /* ignore */
      }
    }

    const prevKey = prevBrowserRouteKeyRef.current;
    if (prevKey !== null && prevKey !== key) {
      const y = readScroll(key);
      if (y !== null) {
        scheduleRestore(y, restoreGen);
      } else {
        setViewportScrollY(0);
      }
    }
    prevBrowserRouteKeyRef.current = key;
  }, [routeSignature]);

  return null;
}

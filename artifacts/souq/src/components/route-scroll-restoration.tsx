import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { scrollPopstateGuard } from "@/components/scroll-restoration-guard";
import {
  FORCE_RESTORE_PATH_KEY,
  clearReturnTargetIfLandingHere,
} from "@/lib/return-navigation";

const STORAGE_PREFIX = "souq:scroll:";

function storageKey(routeKey: string): string {
  return STORAGE_PREFIX + routeKey;
}

function readScroll(routeKey: string): number | null {
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
  try {
    sessionStorage.setItem(storageKey(routeKey), String(Math.max(0, Math.round(y))));
  } catch {
    // quota / private mode
  }
}

function getViewportScrollY(): number {
  if (typeof window === "undefined") return 0;
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
  const se = document.scrollingElement;
  if (se) se.scrollTop = top;
  window.scrollTo({ top, left: 0, behavior: "auto" });
}

/** تخزين التمرير حسب pathname فقط حتى الرجوع من صفحة فرعية لا يحسب استعلامًا مختلفًا كصفحة أخرى */
function scrollRouteKey(): string {
  return window.location.pathname;
}

function flushScrollPosition(): void {
  writeScroll(scrollRouteKey(), getViewportScrollY());
}

function scheduleRestore(y: number): void {
  const apply = () => setViewportScrollY(y);
  apply();
  requestAnimationFrame(() => {
    apply();
    requestAnimationFrame(() => {
      apply();
      window.setTimeout(apply, 0);
      window.setTimeout(apply, 50);
      window.setTimeout(apply, 150);
    });
  });
}

function forceRestoreMatchesRoute(stored: string, currentKey: string): boolean {
  if (currentKey === stored) return true;
  if (currentKey.startsWith(`${stored}?`)) return true;
  if (currentKey.startsWith(`${stored}#`)) return true;
  return false;
}

export function RouteScrollRestoration() {
  const [pathname] = useLocation();
  const search = useSearch();
  const routeSignature = `${pathname}${search ? `?${search}` : ""}`;
  const popRef = useRef(false);
  /** نفس مفتاح التخزين المستخدم في readScroll/writeScroll (pathname فقط) */
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
    window.addEventListener("pointerdown", flushScrollPosition, true);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pointerdown", flushScrollPosition, true);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      writeScroll(scrollRouteKey(), getViewportScrollY());
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useLayoutEffect(() => {
    const key = scrollRouteKey();
    const isPop = popRef.current;

    if (isPop) {
      popRef.current = false;
      clearReturnTargetIfLandingHere(key);
      const y = readScroll(key);
      if (y !== null) {
        scheduleRestore(y);
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
          scheduleRestore(y);
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
        scheduleRestore(y);
      } else {
        setViewportScrollY(0);
      }
    }
    prevBrowserRouteKeyRef.current = key;
  }, [routeSignature]);

  return null;
}

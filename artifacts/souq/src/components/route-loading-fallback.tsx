import { getLocale } from "@/i18n";
import { cn } from "@/lib/utils";
import { isWebSplashOverlayActive } from "@/lib/web-splash-overlay";

/**
 * Minimal full-viewport placeholder while lazy route chunks load.
 * Keeps app shell colors; respects saved locale for dir (no provider needed).
 */
export function RouteLoadingFallback() {
  const locale = typeof window !== "undefined" ? getLocale() : "ar";
  const dir = locale === "ar" ? "rtl" : "ltr";
  const splashActive = isWebSplashOverlayActive();

  if (splashActive) {
    return (
      <div
        className="min-h-[100svh] w-full bg-transparent"
        dir={dir}
        aria-busy="true"
        aria-hidden
      />
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-[100svh] w-full items-center justify-center bg-[#0A0A0A]",
      )}
      dir={dir}
      aria-busy="true"
      aria-live="polite"
    >
      <span
        className="h-9 w-9 rounded-full border-2 border-primary/25 border-t-primary animate-spin"
        aria-hidden
      />
    </div>
  );
}

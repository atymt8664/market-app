import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

const BANNER_TTL_MS = 4500;

export type ForegroundPushPayload = {
  title: string;
  body: string;
  url: string;
};

type BannerState = ForegroundPushPayload & { id: number };

function resolvePushUrl(data: Record<string, unknown> | null | undefined): string {
  if (data && typeof data.url === "string" && data.url.startsWith("/")) {
    return data.url;
  }
  return "/notifications";
}

/**
 * P17-9-13 — WhatsApp/Telegram-style transient banner when a push arrives while the app is open.
 */
export function PushForegroundBanner() {
  const [, navigate] = useLocation();
  const [banner, setBanner] = useState<BannerState | null>(null);
  const timerRef = useRef<number | null>(null);
  const seqRef = useRef(0);

  const dismiss = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setBanner(null);
  }, []);

  const showBanner = useCallback((payload: ForegroundPushPayload) => {
    const id = ++seqRef.current;
    setBanner({ ...payload, id });
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setBanner((current) => (current?.id === id ? null : current));
      timerRef.current = null;
    }, BANNER_TTL_MS);
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handler = (event: MessageEvent) => {
      const data = event.data as {
        type?: string;
        title?: string;
        body?: string;
        data?: Record<string, unknown>;
      } | null;
      if (data?.type !== "souq:push-foreground") return;

      const title = String(data.title ?? "Souq Arab EU").slice(0, 120);
      const body = String(data.body ?? "").slice(0, 240);
      const url = resolvePushUrl(data.data);
      showBanner({ title, body, url });
    };

    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [showBanner]);

  useEffect(() => () => {
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
  }, []);

  if (!banner) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] flex justify-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
      role="status"
      aria-live="polite"
      data-testid="push-foreground-banner"
    >
      <button
        type="button"
        className={cn(
          "pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-primary/35",
          "bg-[#0A0A0A]/95 p-3 text-right shadow-[0_8px_32px_-8px_rgba(0,0,0,0.85)] ring-1 ring-primary/25",
          "animate-in slide-in-from-top-4 fade-in duration-300",
        )}
        onClick={() => {
          dismiss();
          navigate(banner.url);
        }}
      >
        <img
          src="/icons/notification-large-192.png"
          alt=""
          className="h-10 w-10 shrink-0 rounded-xl object-contain"
          width={40}
          height={40}
        />
        <span className="min-w-0 flex-1 text-right">
          <span className="block truncate text-sm font-semibold text-foreground">{banner.title}</span>
          {banner.body ? (
            <span className="mt-0.5 block line-clamp-2 text-xs leading-relaxed text-zinc-400">
              {banner.body}
            </span>
          ) : null}
        </span>
      </button>
    </div>
  );
}

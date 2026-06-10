import { useEffect, useRef } from "react";

const VIEWPORT_META_SELECTOR = 'meta[name="viewport"]';

/**
 * Android Chrome / TWA: `interactive-widget=overlays-content` (site default) keeps the layout
 * viewport full-height while the keyboard floats on top — fixed bottom composers stay hidden.
 * Chat thread temporarily switches to `resizes-content` so 100dvh shrinks and the in-flow
 * composer rides above the keyboard like WhatsApp.
 */
export function useChatThreadViewportResize(enabled = true): void {
  const restoredRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const meta = document.querySelector<HTMLMetaElement>(VIEWPORT_META_SELECTOR);
    if (!meta) return;

    restoredRef.current = meta.getAttribute("content");

    const prev = restoredRef.current ?? "";
    let next = prev;
    if (!prev.includes("interactive-widget=resizes-content")) {
      next = prev.includes("interactive-widget=")
        ? prev.replace(/interactive-widget=[^,]+/, "interactive-widget=resizes-content")
        : `${prev}, interactive-widget=resizes-content`;
    }

    meta.setAttribute("content", next);

    return () => {
      if (restoredRef.current != null) {
        meta.setAttribute("content", restoredRef.current);
      }
    };
  }, [enabled]);
}

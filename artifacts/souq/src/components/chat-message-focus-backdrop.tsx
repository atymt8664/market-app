import { createPortal } from "react-dom";

/**
 * Visual dim layer only — pointer-events-none so other message taps reach bubbles
 * (second-message multi-select). Dismiss via backdrop scroll tap, Escape, or actions X.
 */
export function ChatMessageFocusBackdrop() {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0 z-[55] bg-black/25"
      aria-hidden
    />,
    document.body,
  );
}

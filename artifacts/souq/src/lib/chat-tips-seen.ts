/** Per-device first-run chat hints (not server-side preferences). */
export const CHAT_MENU_TIP_SEEN_KEY = "souq.chatMenuTipSeen";
export const QUICK_REPLIES_TIP_SEEN_KEY = "souq.quickRepliesTipSeen";
export const MESSAGE_SELECTION_TIP_SEEN_KEY = "souq.messageSelectionTipSeen";

export function readSeenFlag(key: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function setSeenFlag(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // Ignore private mode/quota issues.
  }
}

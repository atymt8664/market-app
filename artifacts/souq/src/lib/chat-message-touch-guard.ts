import type { SyntheticEvent } from "react";

/** Blocks native long-press callout, text selection handles, and image drag on chat bubbles. */
export const CHAT_MESSAGE_TOUCH_GUARD =
  "select-none [-webkit-touch-callout:none] [touch-action:manipulation] [-webkit-user-drag:none]";

/**
 * Bubble surface: pan-y lets vertical scroll start on the bubble; horizontal swipe-reply
 * is handled in pointer handlers after axis lock (no pointer capture until then).
 */
export const CHAT_MESSAGE_BUBBLE_TOUCH =
  "select-none [-webkit-touch-callout:none] [touch-action:pan-y] [-webkit-user-drag:none]";

export function blockChatNativeMenu(e: SyntheticEvent) {
  e.preventDefault();
  e.stopPropagation();
}

/** Non-standard DOM handler; satisfies TS on bubble shells without widening every div. */
export const chatBlockNativeMenuDivProps = {
  onSelectStart: blockChatNativeMenu,
  onContextMenu: blockChatNativeMenu,
} as const;

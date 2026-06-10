import { useEffect, useRef, useState } from "react";

/** Real on-screen keyboards lift the visual viewport more than browser chrome alone. */
const KEYBOARD_OPEN_PX = 48;
/** Hysteresis — avoids flicker while the keyboard is animating closed. */
const KEYBOARD_CLOSE_PX = 20;

export type ChatComposerKeyboardState = {
  /** Bottom inset for fixed composer — sits flush above the keyboard. */
  offset: number;
  /** Visible viewport height while keyboard is open; null when closed. */
  viewportHeight: number | null;
  /** visualViewport.offsetTop while keyboard is open (Android pan). */
  viewportOffsetTop: number;
  keyboardOpen: boolean;
};

/**
 * Positions the fixed composer above the on-screen keyboard via visualViewport.
 * Baseline is captured when the composer textarea focuses so browser chrome is ignored.
 * Offset stays latched while the keyboard is visually open (survives brief blur on send).
 */
export function useChatComposerKeyboardOffset(
  enabled = true,
  composerFocused = false,
): ChatComposerKeyboardState {
  const [state, setState] = useState<ChatComposerKeyboardState>({
    offset: 0,
    viewportHeight: null,
    viewportOffsetTop: 0,
    keyboardOpen: false,
  });

  const baselineGapRef = useRef(0);
  const latchedOpenRef = useRef(false);
  const hadFocusRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      latchedOpenRef.current = false;
      hadFocusRef.current = false;
      setState({
        offset: 0,
        viewportHeight: null,
        viewportOffsetTop: 0,
        keyboardOpen: false,
      });
      return;
    }
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;

    const measureGap = () =>
      Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));

    const sync = () => {
      const gap = measureGap();

      if (composerFocused && !hadFocusRef.current) {
        baselineGapRef.current = gap;
        hadFocusRef.current = true;
      }
      if (!composerFocused) {
        hadFocusRef.current = false;
      }

      const lift = Math.max(0, gap - baselineGapRef.current);

      if (!latchedOpenRef.current && lift >= KEYBOARD_OPEN_PX) {
        latchedOpenRef.current = true;
      }
      if (latchedOpenRef.current && lift <= KEYBOARD_CLOSE_PX) {
        latchedOpenRef.current = false;
        baselineGapRef.current = gap;
      }

      const open = latchedOpenRef.current;
      const offset = open ? gap : 0;

      setState({
        offset,
        viewportHeight: open ? Math.round(vv.height) : null,
        viewportOffsetTop: open ? Math.round(vv.offsetTop) : 0,
        keyboardOpen: open,
      });
    };

    baselineGapRef.current = measureGap();
    sync();

    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    const onOrientation = () => {
      latchedOpenRef.current = false;
      baselineGapRef.current = measureGap();
      sync();
    };
    window.addEventListener("orientationchange", onOrientation);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
      window.removeEventListener("orientationchange", onOrientation);
    };
  }, [enabled, composerFocused]);

  return state;
}

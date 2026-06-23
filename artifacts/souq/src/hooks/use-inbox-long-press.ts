import { useCallback, useRef } from "react";
import { shouldSuppressInboxLongPress } from "@/lib/messages-inbox-ptr-gesture";

const INBOX_LONG_PRESS_MS = 480;
/** Cancel long-press when finger moves — scroll / PTR must not open the action sheet. */
const INBOX_LONG_PRESS_MOVE_CANCEL_PX = 10;

export function useInboxLongPress({
  selectMode,
  onLongPress,
}: {
  selectMode: boolean;
  onLongPress: (conversationId: number) => void;
}) {
  const timerRef = useRef<number | null>(null);
  const consumedRef = useRef(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startRef.current = null;
  }, []);

  const onRowPointerDown = useCallback(
    (conversationId: number, clientX: number, clientY: number) => {
      if (selectMode || shouldSuppressInboxLongPress()) return;
      clearTimer();
      startRef.current = { x: clientX, y: clientY };
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        startRef.current = null;
        if (shouldSuppressInboxLongPress()) return;
        consumedRef.current = true;
        onLongPress(conversationId);
      }, INBOX_LONG_PRESS_MS);
    },
    [clearTimer, onLongPress, selectMode],
  );

  const onRowPointerMove = useCallback((clientX: number, clientY: number) => {
    const start = startRef.current;
    if (!start || timerRef.current == null) return;
    const dx = clientX - start.x;
    const dy = clientY - start.y;
    if (Math.hypot(dx, dy) >= INBOX_LONG_PRESS_MOVE_CANCEL_PX) {
      clearTimer();
    }
  }, [clearTimer]);

  const onRowPointerEnd = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  const consumeLongPress = useCallback(() => {
    if (consumedRef.current) {
      consumedRef.current = false;
      return true;
    }
    return false;
  }, []);

  return {
    onRowPointerDown,
    onRowPointerMove,
    onRowPointerEnd,
    consumeLongPress,
    clearTimer,
  };
}

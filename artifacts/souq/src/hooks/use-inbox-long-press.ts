import { useCallback, useRef } from "react";

const INBOX_LONG_PRESS_MS = 480;

export function useInboxLongPress({
  selectMode,
  onLongPress,
}: {
  selectMode: boolean;
  onLongPress: (conversationId: number) => void;
}) {
  const timerRef = useRef<number | null>(null);
  const consumedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onRowPointerDown = useCallback(
    (conversationId: number) => {
      if (selectMode) return;
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        consumedRef.current = true;
        onLongPress(conversationId);
      }, INBOX_LONG_PRESS_MS);
    },
    [clearTimer, onLongPress, selectMode],
  );

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
    onRowPointerEnd,
    consumeLongPress,
    clearTimer,
  };
}

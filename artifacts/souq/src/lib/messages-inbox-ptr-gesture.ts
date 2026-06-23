/** Messages-only — PTR must not open inbox long-press / row tap side effects. */

type CancelLongPressFn = () => void;

let cancelLongPress: CancelLongPressFn | null = null;
let ptrActive = false;
let suppressTapUntil = 0;

export function registerInboxLongPressCancel(fn: CancelLongPressFn): void {
  cancelLongPress = fn;
}

export function unregisterInboxLongPressCancel(): void {
  cancelLongPress = null;
}

export function setMessagesPtrActive(active: boolean): void {
  ptrActive = active;
  if (active) cancelLongPress?.();
}

export function markMessagesPtrGestureRelease(): void {
  suppressTapUntil = Date.now() + 360;
}

export function shouldSuppressInboxTap(): boolean {
  return ptrActive || Date.now() < suppressTapUntil;
}

export function shouldSuppressInboxLongPress(): boolean {
  return ptrActive || Date.now() < suppressTapUntil;
}

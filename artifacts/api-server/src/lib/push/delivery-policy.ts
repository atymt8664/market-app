/**
 * P17-9-13: never skip push at the server — Android keeps WS open in background/lock,
 * which blocked all OS notifications. SW shows notification only when no visible client.
 */
export function shouldSkipPushForConnectedUser(_isSocketConnected: boolean): boolean {
  return false;
}

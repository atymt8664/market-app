/** P17-9-4: realtime-connected users get WS — skip duplicate push. */
export function shouldSkipPushForConnectedUser(isSocketConnected: boolean): boolean {
  return isSocketConnected;
}

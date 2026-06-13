/** P9-E-4a: tab-scoped visual hint — reserve Home bell column during auth/me on refresh (no auth logic). */
const HOME_BELL_SLOT_HINT_KEY = "souq_home_bell_slot_v1";

export function readHomeBellSlotHint(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    return sessionStorage.getItem(HOME_BELL_SLOT_HINT_KEY) === "1";
  } catch {
    return false;
  }
}

/** `true` = logged-in home visit · `false` = settled guest · `undefined` = still resolving auth. */
export function syncHomeBellSlotHint(state: boolean | undefined): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    if (state === true) {
      sessionStorage.setItem(HOME_BELL_SLOT_HINT_KEY, "1");
    } else if (state === false) {
      sessionStorage.removeItem(HOME_BELL_SLOT_HINT_KEY);
    }
  } catch {
    /* ignore quota / private mode */
  }
}

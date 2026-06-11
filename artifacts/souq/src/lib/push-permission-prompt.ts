/** P17-9-13 — when to show the in-app notification permission primer (before OS prompt). */

const KEY_PREFIX = "souq:push-permission-prompt:v1";

export type NotificationPromptState = "pending" | "dismissed" | "granted" | "denied";

/** "Not now" — re-ask after 7 days. */
export const PUSH_PROMPT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

function storageKey(userId: number): string {
  return `${KEY_PREFIX}:${userId}`;
}

export function readNotificationPromptState(userId: number): NotificationPromptState {
  if (typeof window === "undefined") return "pending";
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (raw === "dismissed" || raw === "granted" || raw === "denied") return raw;
    const legacyUntil = Number(window.localStorage.getItem(`${KEY_PREFIX}:cooldown:${userId}`));
    if (Number.isFinite(legacyUntil) && legacyUntil > Date.now()) return "dismissed";
  } catch {
    /* ignore */
  }
  return "pending";
}

export function writeNotificationPromptState(
  userId: number,
  state: Exclude<NotificationPromptState, "pending">,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(userId), state);
  } catch {
    /* ignore */
  }
}

export function dismissPushPromptForCooldown(userId: number): void {
  writeNotificationPromptState(userId, "dismissed");
  try {
    window.localStorage.setItem(
      `${KEY_PREFIX}:cooldown:${userId}`,
      String(Date.now() + PUSH_PROMPT_COOLDOWN_MS),
    );
  } catch {
    /* ignore */
  }
}

export function shouldOfferPushPermissionPrompt(
  userId: number,
  support: "default" | "granted" | "denied" | "unsupported" | "insecure",
  subscribed: boolean | undefined,
): boolean {
  if (support !== "default") return false;
  if (subscribed) return false;
  const state = readNotificationPromptState(userId);
  if (state === "granted" || state === "denied") return false;
  if (state === "dismissed") {
    try {
      const until = Number(window.localStorage.getItem(`${KEY_PREFIX}:cooldown:${userId}`));
      if (Number.isFinite(until) && until > Date.now()) return false;
    } catch {
      return false;
    }
  }
  return true;
}

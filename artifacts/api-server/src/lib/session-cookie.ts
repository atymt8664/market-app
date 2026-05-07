/**
 * Single source of truth for session cookie flags (express-session + clearCookie).
 * Keep in sync: mis-matched clearCookie options leave the old cookie in the browser.
 */
const isProduction = process.env.NODE_ENV === "production";

export const SESSION_COOKIE_NAME = "souq.sid";

export function getSessionCookieSecure(): boolean {
  return isProduction
    ? process.env["SESSION_COOKIE_SECURE"] !== "0"
    : process.env["SESSION_COOKIE_SECURE"] === "1" &&
        process.env["DEV_HTTPS_TUNNEL"] === "1";
}

export function getSessionSameSite(): "lax" | "none" {
  return getSessionCookieSecure() ? "none" : "lax";
}

/** Use with res.clearCookie(SESSION_COOKIE_NAME, …) so the browser actually removes the cookie. */
export function getSessionClearCookieOptions() {
  return {
    path: "/",
    httpOnly: true,
    secure: getSessionCookieSecure(),
    sameSite: getSessionSameSite(),
  } as const;
}

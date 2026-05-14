/** In-memory CSRF for protected user mutations; populated from `GET /api/auth/me` or login JSON `csrfToken`. */
let authProfileCsrfToken: string | null = null;

export function absorbAuthProfileCsrfFromResponse(body: unknown): void {
  if (!body || typeof body !== "object") return;
  const raw = (body as Record<string, unknown>)["csrfToken"];
  if (typeof raw !== "string") return;
  const trimmed = raw.trim();
  if (trimmed.length >= 32) authProfileCsrfToken = trimmed;
}

export function getAuthProfileCsrfTokenForRequest(): string | null {
  return authProfileCsrfToken;
}

export function clearAuthProfileCsrfToken(): void {
  authProfileCsrfToken = null;
}

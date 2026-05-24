import {
  absorbAuthProfileCsrfFromResponse,
  getAuthProfileCsrfTokenForRequest,
} from "@workspace/api-client-react";
import { apiUrl } from "@/lib/api-url";

let inflight: Promise<string | null> | null = null;

/** Ensures in-memory CSRF is populated (e.g. after refresh before auth/me completes). */
export async function ensureAuthProfileCsrfReady(): Promise<string | null> {
  const existing = getAuthProfileCsrfTokenForRequest();
  if (typeof existing === "string" && existing.length >= 32) return existing;

  inflight ??= (async () => {
    try {
      const res = await fetch(apiUrl("/api/auth/me"), { credentials: "include" });
      if (!res.ok) return null;
      const body = (await res.json()) as unknown;
      absorbAuthProfileCsrfFromResponse(body);
      return getAuthProfileCsrfTokenForRequest();
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

import type { QueryClient } from "@tanstack/react-query";

/**
 * Any `/api/*` response with 403 + ACCOUNT_DISABLED means the user was banned while logged in.
 * Clear React Query cache and force navigation to login so account UI cannot stay from stale cache.
 */
export function installAccountDisabledFetchInterceptor(queryClient: QueryClient): void {
  if (typeof window === "undefined") return;

  const w = window as Window & { __souqFetchInterceptor?: boolean };
  if (w.__souqFetchInterceptor) return;
  w.__souqFetchInterceptor = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await originalFetch(input, init);

    if (response.status !== 403) return response;

    let urlStr = "";
    try {
      if (typeof input === "string") urlStr = input;
      else if (input instanceof Request) urlStr = input.url;
      else urlStr = input.toString();
    } catch {
      return response;
    }

    const resolved = new URL(urlStr, window.location.href);
    if (!resolved.pathname.includes("/api/")) return response;

    try {
      const ct = response.headers.get("content-type");
      if (!ct?.includes("application/json")) return response;
      const body = await response.clone().json();
      if (body?.code !== "ACCOUNT_DISABLED") return response;

      queryClient.clear();

      try {
        sessionStorage.setItem("souq_account_disabled", "1");
      } catch {
        /* ignore */
      }

      const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
      const path = window.location.pathname;
      if (path.startsWith(`${base}/login`) || path.includes("/admin-login")) {
        return response;
      }

      const loginHref = `${base}/login?accountDisabled=1`;
      window.location.assign(loginHref.startsWith("/") ? loginHref : `/${loginHref}`);
    } catch {
      /* ignore parse errors */
    }

    return response;
  };
}

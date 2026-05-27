import { apiUrl } from "@/lib/api-url";
import { t } from "@/i18n";
import {
  mapAdminApiError,
  parseAdminErrorResponse,
  type AdminApiErrorBody,
} from "../admin-error-messages";
import {
  parseAdminPaginatedJson,
  type AdminPaginatedResult,
  type AdminPaginationMeta,
} from "../admin-pagination";
import { parseAdminActionResponse } from "../admin-action-toast";
import type { AdminReport } from "../types";

let adminCsrfToken: string | null = null;

export function rememberAdminCsrfToken(token: unknown) {
  if (typeof token === "string" && token.trim().length >= 32) {
    adminCsrfToken = token.trim();
  }
}

export function clearAdminCsrfToken() {
  adminCsrfToken = null;
}

export function getAdminMutationHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra ?? {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (adminCsrfToken) {
    headers.set("X-CSRF-Token", adminCsrfToken);
  }
  return headers;
}

export async function throwAdminMutationError(res: Response, fallbackOrKey: string, rawText?: string): Promise<never> {
  const text = rawText ?? (await res.text());
  let parsed: AdminApiErrorBody | null = null;
  try {
    parsed = text ? (JSON.parse(text) as AdminApiErrorBody) : null;
  } catch {
    parsed = null;
  }
  const fallback = fallbackOrKey.startsWith("p8.") ? t(fallbackOrKey) : fallbackOrKey;
  throw new Error(mapAdminApiError(res.status, parsed, fallback));
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(apiUrl(path), {
    credentials: "include",
    cache: "no-store",
    signal,
  });
  if (!res.ok) {
    const errBody = await parseAdminErrorResponse(res);
    throw new Error(mapAdminApiError(res.status, errBody));
  }
  const data = (await res.json()) as T;
  if (path === "/api/admin/me") {
    const payload = data as { csrfToken?: unknown };
    rememberAdminCsrfToken(payload?.csrfToken);
  }
  return data;
}

export async function apiGetAdminPage<T>(
  path: string,
  signal?: AbortSignal,
): Promise<AdminPaginatedResult<T>> {
  const res = await fetch(apiUrl(path), {
    credentials: "include",
    cache: "no-store",
    signal,
  });
  if (!res.ok) {
    const errBody = await parseAdminErrorResponse(res);
    throw new Error(mapAdminApiError(res.status, errBody));
  }
  return parseAdminPaginatedJson<T>(res);
}

export function appendPageParams(
  search: URLSearchParams,
  page?: number,
  pageSize?: number,
): void {
  if (page != null && page > 0) search.set("page", String(page));
  if (pageSize != null && pageSize > 0) search.set("pageSize", String(pageSize));
}

export type { AdminPaginatedResult, AdminPaginationMeta };

export async function postAdminWorkflow(path: string, body?: Record<string, unknown>) {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    parsed = {};
  }
  if (!res.ok) {
    throw new Error(
      mapAdminApiError(res.status, {
        error: typeof parsed.error === "string" ? parsed.error : undefined,
        code: typeof parsed.code === "string" ? parsed.code : undefined,
        title: typeof parsed.title === "string" ? parsed.title : undefined,
        description: typeof parsed.description === "string" ? parsed.description : undefined,
      }),
    );
  }
  return {
    assignment: parsed.assignment as AdminReport["assignment"],
    ...parseAdminActionResponse(parsed),
  };
}

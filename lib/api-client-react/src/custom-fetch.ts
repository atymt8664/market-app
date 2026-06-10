import {
  absorbAuthProfileCsrfFromResponse,
  clearAuthProfileCsrfToken,
  getAuthProfileCsrfTokenForRequest,
} from "./auth-profile-csrf";

export type CustomFetchOptions = RequestInit & {
  responseType?: "json" | "text" | "blob" | "auto";
};

export type ErrorType<T = unknown> = ApiError<T>;

export type BodyType<T> = T;

export type AuthTokenGetter = () => Promise<string | null> | string | null;

const NO_BODY_STATUS = new Set([204, 205, 304]);
const DEFAULT_JSON_ACCEPT = "application/json, application/problem+json";

// ---------------------------------------------------------------------------
// Module-level configuration
// ---------------------------------------------------------------------------

let _baseUrl: string | null = null;
let _authTokenGetter: AuthTokenGetter | null = null;

/**
 * Set a base URL that is prepended to every relative request URL
 * (i.e. paths that start with `/`).
 *
 * Useful for Expo bundles that need to call a remote API server.
 * Pass `null` to clear the base URL.
 */
export function setBaseUrl(url: string | null): void {
  _baseUrl = url ? url.replace(/\/+$/, "") : null;
}

/**
 * Register a getter that supplies a bearer auth token.  Before every fetch
 * the getter is invoked; when it returns a non-null string, an
 * `Authorization: Bearer <token>` header is attached to the request.
 *
 * Useful for Expo bundles making token-gated API calls.
 * Pass `null` to clear the getter.
 *
 * NOTE: This function should never be used in web applications where session
 * token cookies are automatically associated with API calls by the browser.
 */
export function setAuthTokenGetter(getter: AuthTokenGetter | null): void {
  _authTokenGetter = getter;
}

function isRequest(input: RequestInfo | URL): input is Request {
  return typeof Request !== "undefined" && input instanceof Request;
}

function resolveMethod(input: RequestInfo | URL, explicitMethod?: string): string {
  if (explicitMethod) return explicitMethod.toUpperCase();
  if (isRequest(input)) return input.method.toUpperCase();
  return "GET";
}

// Use loose check for URL — some runtimes (e.g. React Native) polyfill URL
// differently, so `instanceof URL` can fail.
function isUrl(input: RequestInfo | URL): input is URL {
  return typeof URL !== "undefined" && input instanceof URL;
}

function applyBaseUrl(input: RequestInfo | URL): RequestInfo | URL {
  if (!_baseUrl) return input;
  const url = resolveUrl(input);
  // Only prepend to relative paths (starting with /)
  if (!url.startsWith("/")) return input;

  const absolute = `${_baseUrl}${url}`;
  if (typeof input === "string") return absolute;
  if (isUrl(input)) return new URL(absolute);
  return new Request(absolute, input as Request);
}

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (isUrl(input)) return input.toString();
  return input.url;
}

function mergeHeaders(...sources: Array<HeadersInit | undefined>): Headers {
  const headers = new Headers();

  for (const source of sources) {
    if (!source) continue;
    new Headers(source).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  return headers;
}

function getMediaType(headers: Headers): string | null {
  const value = headers.get("content-type");
  return value ? value.split(";", 1)[0].trim().toLowerCase() : null;
}

function isJsonMediaType(mediaType: string | null): boolean {
  return mediaType === "application/json" || Boolean(mediaType?.endsWith("+json"));
}

function isTextMediaType(mediaType: string | null): boolean {
  return Boolean(
    mediaType &&
      (mediaType.startsWith("text/") ||
        mediaType === "application/xml" ||
        mediaType === "text/xml" ||
        mediaType.endsWith("+xml") ||
        mediaType === "application/x-www-form-urlencoded"),
  );
}

// Use strict equality: in browsers, `response.body` is `null` when the
// response genuinely has no content.  In React Native, `response.body` is
// always `undefined` because the ReadableStream API is not implemented —
// even when the response carries a full payload readable via `.text()` or
// `.json()`.  Loose equality (`== null`) matches both `null` and `undefined`,
// which causes every React Native response to be treated as empty.
function hasNoBody(response: Response, method: string): boolean {
  if (method === "HEAD") return true;
  if (NO_BODY_STATUS.has(response.status)) return true;
  if (response.headers.get("content-length") === "0") return true;
  if (response.body === null) return true;
  return false;
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function looksLikeJson(text: string): boolean {
  const trimmed = text.trimStart();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function getStringField(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== "object") return undefined;

  const candidate = (value as Record<string, unknown>)[key];
  if (typeof candidate !== "string") return undefined;

  const trimmed = candidate.trim();
  return trimmed === "" ? undefined : trimmed;
}

function truncate(text: string, maxLength = 300): string {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function pathnameOfRequestUrl(url: string): string {
  try {
    return new URL(url, "http://local.invalid").pathname;
  } catch {
    return "";
  }
}

function isGetAuthMe(method: string, url: string): boolean {
  return method === "GET" && pathnameOfRequestUrl(url) === "/api/auth/me";
}

function isPatchAuthMe(method: string, url: string): boolean {
  return method === "PATCH" && pathnameOfRequestUrl(url) === "/api/auth/me";
}

function isPostAuthLogout(method: string, url: string): boolean {
  return method === "POST" && pathnameOfRequestUrl(url) === "/api/auth/logout";
}

function isPostAuthChangePassword(method: string, url: string): boolean {
  return method === "POST" && pathnameOfRequestUrl(url) === "/api/auth/change-password";
}

function isPostAccountDelete(method: string, url: string): boolean {
  return method === "POST" && pathnameOfRequestUrl(url) === "/api/account/delete";
}

function isPostApiAdsCreate(method: string, url: string): boolean {
  return method === "POST" && pathnameOfRequestUrl(url) === "/api/ads";
}

function isPatchApiAdsById(method: string, url: string): boolean {
  if (method !== "PATCH") return false;
  return /^\/api\/ads\/\d+$/.test(pathnameOfRequestUrl(url));
}

function isDeleteApiAdsById(method: string, url: string): boolean {
  if (method !== "DELETE") return false;
  return /^\/api\/ads\/\d+$/.test(pathnameOfRequestUrl(url));
}

function isPostStorageAdImages(method: string, url: string): boolean {
  return method === "POST" && pathnameOfRequestUrl(url) === "/api/storage/uploads/ad-images";
}

const AD_SOCIAL_PATH = /^\/api\/ads\/\d+\/(like|favorite)$/;
const USER_FOLLOW_PATH = /^\/api\/users\/\d+\/follow$/;

/** Like/favorite/follow state changes (same `userCsrfToken`). */
function isUserSocialMutation(method: string, url: string): boolean {
  const p = pathnameOfRequestUrl(url);
  const m = method.toUpperCase();
  if ((m === "POST" || m === "DELETE") && AD_SOCIAL_PATH.test(p)) return true;
  if ((m === "POST" || m === "DELETE") && USER_FOLLOW_PATH.test(p)) return true;
  return false;
}

function isPostSupportTickets(method: string, url: string): boolean {
  return method === "POST" && pathnameOfRequestUrl(url) === "/api/support/tickets";
}

function isPostReports(method: string, url: string): boolean {
  return method === "POST" && pathnameOfRequestUrl(url) === "/api/reports";
}

function isPatchNotificationsReadAll(method: string, url: string): boolean {
  return method === "PATCH" && pathnameOfRequestUrl(url) === "/api/notifications/read-all";
}

function isPatchNotificationReadById(method: string, url: string): boolean {
  return method === "PATCH" && /^\/api\/notifications\/\d+\/read$/.test(pathnameOfRequestUrl(url));
}

function isUserSupportReportsNotificationsCsrf(method: string, url: string): boolean {
  return (
    isPostSupportTickets(method, url) ||
    isPostReports(method, url) ||
    isPatchNotificationsReadAll(method, url) ||
    isPatchNotificationReadById(method, url)
  );
}

function isPatchAccountNotificationPreferences(method: string, url: string): boolean {
  return method === "PATCH" && pathnameOfRequestUrl(url) === "/api/account/notification-preferences";
}

function isPostPushSubscriptions(method: string, url: string): boolean {
  return method === "POST" && pathnameOfRequestUrl(url) === "/api/push/subscriptions";
}

function isDeletePushSubscriptions(method: string, url: string): boolean {
  return method === "DELETE" && pathnameOfRequestUrl(url) === "/api/push/subscriptions";
}

function isPostAiImproveDescription(method: string, url: string): boolean {
  return method === "POST" && pathnameOfRequestUrl(url) === "/api/ai/improve-description";
}

function isPostAiSuggestPrice(method: string, url: string): boolean {
  return method === "POST" && pathnameOfRequestUrl(url) === "/api/ai/suggest-price";
}

const CONV_POST_MESSAGES_ONLY = /^\/api\/conversations\/\d+\/messages$/;
const CONV_POST_MESSAGES_UPLOAD_IMAGE = /^\/api\/conversations\/\d+\/messages\/upload-image$/;
const CONV_POST_READ = /^\/api\/conversations\/\d+\/read$/;
const CONV_POST_MESSAGES_HIDE_FOR_ME = /^\/api\/conversations\/\d+\/messages\/hide-for-me$/;
const CONV_POST_MESSAGES_DELETE_FOR_EVERYONE =
  /^\/api\/conversations\/\d+\/messages\/delete-for-everyone$/;
const CONV_PUT_MESSAGE_REACTION =
  /^\/api\/conversations\/\d+\/messages\/\d+\/reaction$/;
const CONV_POST_HIDE_OR_HIDE_FOR_ME = /^\/api\/conversations\/\d+\/(hide|hide-for-me)$/;
const CONV_POST_UNHIDE_FOR_ME = /^\/api\/conversations\/\d+\/unhide-for-me$/;
const CONV_DELETE_HIDE = /^\/api\/conversations\/\d+\/hide$/;

/** Start conversation, send message, chat image upload, hide/unhide thread (same `userCsrfToken`). */
function isUserConversationsMutation(method: string, url: string): boolean {
  const p = pathnameOfRequestUrl(url);
  const m = method.toUpperCase();
  if (m === "POST" && p === "/api/conversations") return true;
  if (m === "POST" && CONV_POST_MESSAGES_ONLY.test(p)) return true;
  if (m === "POST" && CONV_POST_MESSAGES_UPLOAD_IMAGE.test(p)) return true;
  if (m === "POST" && CONV_POST_READ.test(p)) return true;
  if (m === "POST" && CONV_POST_MESSAGES_HIDE_FOR_ME.test(p)) return true;
  if (m === "POST" && CONV_POST_MESSAGES_DELETE_FOR_EVERYONE.test(p)) return true;
  if (m === "PUT" && CONV_PUT_MESSAGE_REACTION.test(p)) return true;
  if (m === "POST" && CONV_POST_HIDE_OR_HIDE_FOR_ME.test(p)) return true;
  if (m === "POST" && CONV_POST_UNHIDE_FOR_ME.test(p)) return true;
  if (m === "DELETE" && CONV_DELETE_HIDE.test(p)) return true;
  return false;
}

/** User session CSRF: profile + mutators + social + support/reports/notifications + conversations (same `userCsrfToken`). */
function shouldAttachUserProfileCsrf(method: string, url: string): boolean {
  return (
    isPatchAuthMe(method, url) ||
    isPostAuthChangePassword(method, url) ||
    isPostAuthLogout(method, url) ||
    isPostAccountDelete(method, url) ||
    isPostApiAdsCreate(method, url) ||
    isPatchApiAdsById(method, url) ||
    isDeleteApiAdsById(method, url) ||
    isPostStorageAdImages(method, url) ||
    isUserSocialMutation(method, url) ||
    isUserSupportReportsNotificationsCsrf(method, url) ||
    isPatchAccountNotificationPreferences(method, url) ||
    isPostPushSubscriptions(method, url) ||
    isDeletePushSubscriptions(method, url) ||
    isPostAiImproveDescription(method, url) ||
    isPostAiSuggestPrice(method, url) ||
    isUserConversationsMutation(method, url)
  );
}

function buildErrorMessage(response: Response, data: unknown): string {
  const prefix = `HTTP ${response.status} ${response.statusText}`;

  if (typeof data === "string") {
    const text = data.trim();
    return text ? `${prefix}: ${truncate(text)}` : prefix;
  }

  const title = getStringField(data, "title");
  const detail = getStringField(data, "detail");
  const message =
    getStringField(data, "message") ??
    getStringField(data, "error_description") ??
    getStringField(data, "error");

  if (title && detail) return `${prefix}: ${title} — ${detail}`;
  if (detail) return `${prefix}: ${detail}`;
  if (message) return `${prefix}: ${message}`;
  if (title) return `${prefix}: ${title}`;

  return prefix;
}

export class ApiError<T = unknown> extends Error {
  readonly name = "ApiError";
  readonly status: number;
  readonly statusText: string;
  readonly data: T | null;
  readonly headers: Headers;
  readonly response: Response;
  readonly method: string;
  readonly url: string;

  constructor(
    response: Response,
    data: T | null,
    requestInfo: { method: string; url: string },
  ) {
    super(buildErrorMessage(response, data));
    Object.setPrototypeOf(this, new.target.prototype);

    this.status = response.status;
    this.statusText = response.statusText;
    this.data = data;
    this.headers = response.headers;
    this.response = response;
    this.method = requestInfo.method;
    this.url = response.url || requestInfo.url;
  }
}

export class ResponseParseError extends Error {
  readonly name = "ResponseParseError";
  readonly status: number;
  readonly statusText: string;
  readonly headers: Headers;
  readonly response: Response;
  readonly method: string;
  readonly url: string;
  readonly rawBody: string;
  readonly cause: unknown;

  constructor(
    response: Response,
    rawBody: string,
    cause: unknown,
    requestInfo: { method: string; url: string },
  ) {
    super(
      `Failed to parse response from ${requestInfo.method} ${response.url || requestInfo.url} ` +
        `(${response.status} ${response.statusText}) as JSON`,
    );
    Object.setPrototypeOf(this, new.target.prototype);

    this.status = response.status;
    this.statusText = response.statusText;
    this.headers = response.headers;
    this.response = response;
    this.method = requestInfo.method;
    this.url = response.url || requestInfo.url;
    this.rawBody = rawBody;
    this.cause = cause;
  }
}

async function parseJsonBody(
  response: Response,
  requestInfo: { method: string; url: string },
): Promise<unknown> {
  const raw = await response.text();
  const normalized = stripBom(raw);

  if (normalized.trim() === "") {
    return null;
  }

  try {
    return JSON.parse(normalized);
  } catch (cause) {
    throw new ResponseParseError(response, raw, cause, requestInfo);
  }
}

async function parseErrorBody(response: Response, method: string): Promise<unknown> {
  if (hasNoBody(response, method)) {
    return null;
  }

  const mediaType = getMediaType(response.headers);

  // Fall back to text when blob() is unavailable (e.g. some React Native builds).
  if (mediaType && !isJsonMediaType(mediaType) && !isTextMediaType(mediaType)) {
    return typeof response.blob === "function" ? response.blob() : response.text();
  }

  const raw = await response.text();
  const normalized = stripBom(raw);
  const trimmed = normalized.trim();

  if (trimmed === "") {
    return null;
  }

  if (isJsonMediaType(mediaType) || looksLikeJson(normalized)) {
    try {
      return JSON.parse(normalized);
    } catch {
      return raw;
    }
  }

  return raw;
}

function inferResponseType(response: Response): "json" | "text" | "blob" {
  const mediaType = getMediaType(response.headers);

  if (isJsonMediaType(mediaType)) return "json";
  if (isTextMediaType(mediaType) || mediaType == null) return "text";
  return "blob";
}

async function parseSuccessBody(
  response: Response,
  responseType: "json" | "text" | "blob" | "auto",
  requestInfo: { method: string; url: string },
): Promise<unknown> {
  if (hasNoBody(response, requestInfo.method)) {
    return null;
  }

  const effectiveType =
    responseType === "auto" ? inferResponseType(response) : responseType;

  switch (effectiveType) {
    case "json":
      return parseJsonBody(response, requestInfo);

    case "text": {
      const text = await response.text();
      return text === "" ? null : text;
    }

    case "blob":
      if (typeof response.blob !== "function") {
        throw new TypeError(
          "Blob responses are not supported in this runtime. " +
            "Use responseType \"json\" or \"text\" instead.",
        );
      }
      return response.blob();
  }
}

export async function customFetch<T = unknown>(
  input: RequestInfo | URL,
  options: CustomFetchOptions = {},
): Promise<T> {
  input = applyBaseUrl(input);
  const { responseType = "auto", headers: headersInit, ...init } = options;

  const method = resolveMethod(input, init.method);
  const resolvedFetchUrl = resolveUrl(input);

  if (init.body != null && (method === "GET" || method === "HEAD")) {
    throw new TypeError(`customFetch: ${method} requests cannot have a body.`);
  }

  const headers = mergeHeaders(isRequest(input) ? input.headers : undefined, headersInit);

  if (
    typeof init.body === "string" &&
    !headers.has("content-type") &&
    looksLikeJson(init.body)
  ) {
    headers.set("content-type", "application/json");
  }

  if (responseType === "json" && !headers.has("accept")) {
    headers.set("accept", DEFAULT_JSON_ACCEPT);
  }

  // Attach bearer token when an auth getter is configured and no
  // Authorization header has been explicitly provided.
  if (_authTokenGetter && !headers.has("authorization")) {
    const token = await _authTokenGetter();
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
  }

  if (shouldAttachUserProfileCsrf(method, resolvedFetchUrl) && !headers.has("x-csrf-token")) {
    const csrf = getAuthProfileCsrfTokenForRequest();
    if (csrf) {
      headers.set("X-CSRF-Token", csrf);
    }
  }

  const requestInfo = { method, url: resolvedFetchUrl };

  const isBrowser =
    typeof globalThis !== "undefined" &&
    typeof (globalThis as { window?: unknown }).window !== "undefined";

  let needsCrossOriginCookies = false;
  if (isBrowser && typeof window !== "undefined" && window.location?.origin) {
    try {
      const targetOrigin = new URL(resolvedFetchUrl, window.location.href).origin;
      needsCrossOriginCookies = targetOrigin !== window.location.origin;
    } catch {
      needsCrossOriginCookies = Boolean(_baseUrl);
    }
  }

  /** Session endpoints live under `/api`; always attach cookies in the browser when unset. */
  let isApiPath = false;
  if (isBrowser && typeof window !== "undefined") {
    try {
      const pathname = new URL(resolvedFetchUrl, window.location.href).pathname;
      isApiPath = pathname.startsWith("/api");
    } catch {
      isApiPath = false;
    }
  }

  const includeCredentialsByDefault =
    isBrowser &&
    init.credentials === undefined &&
    (Boolean(_baseUrl) || needsCrossOriginCookies || isApiPath);

  const response = await fetch(input, {
    ...init,
    method,
    headers,
    ...(includeCredentialsByDefault ? { credentials: "include" } : {}),
  });

  if (!response.ok) {
    const errorData = await parseErrorBody(response, method);
    if (response.status === 401 && isGetAuthMe(method, resolvedFetchUrl)) {
      clearAuthProfileCsrfToken();
    }
    throw new ApiError(response, errorData, requestInfo);
  }

  const parsed = (await parseSuccessBody(response, responseType, requestInfo)) as T;
  if (responseType === "auto" || responseType === "json") {
    if (isGetAuthMe(method, resolvedFetchUrl)) {
      absorbAuthProfileCsrfFromResponse(parsed);
    } else if (isPostAuthLogout(method, resolvedFetchUrl)) {
      clearAuthProfileCsrfToken();
    }
  }
  return parsed;
}

import { ApiError } from "@workspace/api-client-react";
import { t } from "@/i18n";

export type UserApiErrorBody = {
  message?: string;
  error?: string;
  code?: string;
  title?: string;
  description?: string;
  details?: string;
};

export type UserToastVariant = "default" | "destructive";

export type UserApiToastPayload = {
  variant: UserToastVariant;
  title: string;
  description?: string;
};

/** Known API codes that are expected user states — info notice, not fatal error. */
const INFO_NOTICE_CODES = new Set([
  "DUPLICATE_REPORT",
  "DUPLICATE_AD",
  "ORDER_DUPLICATE_ACTIVE",
  "ALREADY_FAVORITED",
  "ALREADY_LIKED",
]);

const NOTICE_I18N: Record<string, { title: string; body: string }> = {
  DUPLICATE_REPORT: {
    title: "user_api.notice.duplicate_report.title",
    body: "user_api.notice.duplicate_report.body",
  },
  DUPLICATE_AD: {
    title: "user_api.notice.duplicate_ad.title",
    body: "user_api.notice.duplicate_ad.body",
  },
  ORDER_DUPLICATE_ACTIVE: {
    title: "user_api.notice.order_duplicate_active.title",
    body: "user_api.notice.order_duplicate_active.body",
  },
  ALREADY_FAVORITED: {
    title: "user_api.notice.already_favorited.title",
    body: "user_api.notice.already_favorited.body",
  },
  ALREADY_LIKED: {
    title: "user_api.notice.already_done.title",
    body: "user_api.notice.already_done.body",
  },
};

const TECHNICAL_CODE_RE =
  /^(DUPLICATE_[A-Z0-9_]+|INTERNAL_ERROR|VALIDATION_ERROR|[A-Z][A-Z0-9_]{2,})$/;

/** Returns true when text must never appear in user-facing UI. */
export function isTechnicalUserText(text: string): boolean {
  const s = text.trim();
  if (!s) return true;
  if (s.startsWith("{") || s.startsWith("[")) return true;
  if (/^HTTP\s+\d{3}/i.test(s)) return true;
  if (TECHNICAL_CODE_RE.test(s)) return true;
  if (/"(code|error|message|stack)"\s*:/.test(s)) return true;
  if (/undefined_table|ECONNREFUSED|ZodError|SyntaxError/i.test(s)) return true;
  if (/\bat\s+\S+\.(tsx?|jsx?|mjs):\d+/i.test(s)) return true;
  return false;
}

export function isUserSafeMessage(text: string): boolean {
  const s = text.trim();
  if (!s || s.length > 500) return false;
  return !isTechnicalUserText(s);
}

export function parseUserApiErrorBody(raw: string): UserApiErrorBody | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    if (isTechnicalUserText(trimmed)) return { code: trimmed };
    return { message: trimmed };
  }
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const body: UserApiErrorBody = {};
    for (const key of ["message", "error", "code", "title", "description", "details"] as const) {
      const v = parsed[key];
      if (typeof v === "string" && v.trim()) body[key] = v.trim();
    }
    return Object.keys(body).length > 0 ? body : null;
  } catch {
    return null;
  }
}

export async function parseUserApiErrorResponse(res: Response): Promise<{
  status: number;
  body: UserApiErrorBody | null;
  raw: string;
}> {
  const raw = await res.text().catch(() => "");
  return { status: res.status, body: parseUserApiErrorBody(raw), raw };
}

function pickUserSafeField(body: UserApiErrorBody | null): string | null {
  if (!body) return null;
  for (const field of [body.message, body.error, body.description, body.title, body.details]) {
    if (field && isUserSafeMessage(field)) return field;
  }
  return null;
}

export function resolveUserApiToast(
  status: number,
  body: UserApiErrorBody | null,
): UserApiToastPayload {
  const code = body?.code?.trim();

  if (code && INFO_NOTICE_CODES.has(code)) {
    const keys = NOTICE_I18N[code];
    if (keys) {
      return {
        variant: "default",
        title: t(keys.title),
        description: t(keys.body),
      };
    }
  }

  const safe = pickUserSafeField(body);
  if (safe) {
    return {
      variant: "destructive",
      title: t("user_api.error.generic.title"),
      description: safe,
    };
  }

  if (status === 401) {
    return {
      variant: "destructive",
      title: t("user_api.error.unauthorized.title"),
      description: t("user_api.error.generic.body"),
    };
  }
  if (status === 403) {
    return {
      variant: "destructive",
      title: t("user_api.error.forbidden.title"),
      description: t("user_api.error.generic.body"),
    };
  }
  if (status === 404) {
    return {
      variant: "destructive",
      title: t("user_api.error.not_found.title"),
      description: t("user_api.error.generic.body"),
    };
  }
  if (status === 429) {
    return {
      variant: "destructive",
      title: t("user_api.error.rate_limit.title"),
      description: t("user_api.error.rate_limit.body"),
    };
  }
  if (status >= 500) {
    return {
      variant: "destructive",
      title: t("user_api.error.generic.title"),
      description: t("user_api.error.generic.body"),
    };
  }

  return {
    variant: "destructive",
    title: t("user_api.error.generic.title"),
    description: t("user_api.error.generic.body"),
  };
}

export function resolveUserApiToastFromError(err: unknown): UserApiToastPayload {
  if (err instanceof ApiError) {
    const data =
      err.data && typeof err.data === "object" && !Array.isArray(err.data)
        ? (err.data as UserApiErrorBody)
        : parseUserApiErrorBody(err.message);
    return resolveUserApiToast(err.status, data);
  }

  if (err instanceof Error) {
    const parsed = parseUserApiErrorBody(err.message);
    if (parsed?.code || parsed?.message || parsed?.error) {
      return resolveUserApiToast(0, parsed);
    }
    if (isUserSafeMessage(err.message)) {
      return {
        variant: "destructive",
        title: t("user_api.error.generic.title"),
        description: err.message.trim(),
      };
    }
  }

  return {
    variant: "destructive",
    title: t("user_api.error.generic.title"),
    description: t("user_api.error.generic.body"),
  };
}

/** Safe description for toast — undefined when only technical text is available. */
export function userSafeToastDescription(err: unknown): string | undefined {
  const payload = resolveUserApiToastFromError(err);
  if (payload.description && !isTechnicalUserText(payload.description)) {
    return payload.description;
  }
  return payload.variant === "default" ? payload.description : t("user_api.error.generic.body");
}

type ToastFn = (props: {
  title?: string;
  description?: string;
  variant?: UserToastVariant;
}) => void;

export function showUserApiErrorToast(
  toast: ToastFn,
  input: {
    status: number;
    body?: UserApiErrorBody | null;
    rawText?: string;
    error?: unknown;
  },
): void {
  if (input.error) {
    const payload = resolveUserApiToastFromError(input.error);
    toast({
      title: payload.title,
      description: payload.description,
      variant: payload.variant,
    });
    return;
  }

  const body = input.body ?? (input.rawText ? parseUserApiErrorBody(input.rawText) : null);
  const payload = resolveUserApiToast(input.status, body);
  toast({
    title: payload.title,
    description: payload.description,
    variant: payload.variant,
  });
}

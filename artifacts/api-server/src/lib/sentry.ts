import * as Sentry from "@sentry/node";
import type { Express, NextFunction, Request, Response } from "express";
import { logger } from "./logger";
import {
  getSentryDsn,
  resolveSentryEnvironment,
  resolveSentryRelease,
} from "./sentry-env";

let enabled = false;

const SENSITIVE_HEADER_KEYS = new Set([
  "authorization",
  "cookie",
  "x-admin-access-key",
  "x-csrf-token",
  "set-cookie",
]);

/** Safe log fields only — never includes DSN value. */
export function getSentryStatus(): {
  enabled: boolean;
  configured: boolean;
  environment: string;
  release: string | null;
} {
  return {
    enabled,
    configured: Boolean(getSentryDsn()),
    environment: resolveSentryEnvironment(),
    release: resolveSentryRelease() ?? null,
  };
}

function scrubEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent | null {
  if (event.request?.headers) {
    const headers = { ...event.request.headers };
    for (const key of Object.keys(headers)) {
      if (SENSITIVE_HEADER_KEYS.has(key.toLowerCase())) {
        headers[key] = "[Filtered]";
      }
    }
    event.request.headers = headers;
  }
  if (event.request?.cookies) {
    delete event.request.cookies;
  }
  return event;
}

/**
 * Initialize Sentry error monitoring (no performance tracing).
 * No-op when SENTRY_DSN is unset — production stays healthy without Sentry.
 */
export function initSentry(_app?: Express): void {
  const dsn = getSentryDsn();
  if (!dsn) {
    logger.info("Sentry disabled (SENTRY_DSN not set)");
    return;
  }

  const integrations = [
    Sentry.inboundFiltersIntegration(),
    Sentry.linkedErrorsIntegration(),
    Sentry.requestDataIntegration(),
    Sentry.onUncaughtExceptionIntegration(),
    Sentry.onUnhandledRejectionIntegration(),
    Sentry.expressIntegration(),
  ];

  Sentry.init({
    dsn,
    environment: resolveSentryEnvironment(),
    release: resolveSentryRelease(),
    tracesSampleRate: 0,
    profilesSampleRate: 0,
    sendDefaultPii: false,
    defaultIntegrations: false,
    integrations,
    beforeSend: scrubEvent,
  });

  enabled = true;
  logger.info(
    {
      sentry: {
        enabled: true,
        environment: resolveSentryEnvironment(),
        release: resolveSentryRelease() ?? null,
      },
    },
    "Sentry error monitoring initialized",
  );
}

export function isSentryEnabled(): boolean {
  return enabled;
}

function applyRequestScope(req: Request, scope: Sentry.Scope): void {
  const requestId = typeof req.id === "string" && req.id.length > 0 ? req.id : undefined;
  if (requestId) {
    scope.setTag("requestId", requestId);
    scope.setTag("request_id", requestId);
  }
  const path = (req.originalUrl || req.url || "").split("?")[0] || "/";
  scope.setContext("request", {
    method: req.method,
    path,
    requestId: requestId ?? null,
  });
}

/**
 * Per-request isolation scope — run after observability middleware sets req.id.
 */
export function sentryRequestMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!enabled) {
    next();
    return;
  }

  applyRequestScope(req, Sentry.getCurrentScope());
  next();
}

export function captureApiError(err: unknown, req: Request): void {
  if (!enabled) return;

  Sentry.withScope((scope) => {
    applyRequestScope(req, scope);
    if (err instanceof Error) {
      Sentry.captureException(err);
    } else {
      Sentry.captureException(new Error(String(err)));
    }
  });
}

export function captureUnhandledError(err: unknown): void {
  if (!enabled) return;
  if (err instanceof Error) {
    Sentry.captureException(err);
  } else {
    Sentry.captureException(new Error(String(err)));
  }
}

/** Local verification only — never call from production routes. */
export async function captureSentryTestError(requestId?: string): Promise<string | null> {
  if (!enabled) return null;

  return await Sentry.withScope(async (scope) => {
    if (requestId) {
      scope.setTag("requestId", requestId);
      scope.setTag("request_id", requestId);
    }
    scope.setTag("sentry_test", "7A.5b");
    scope.setContext("sentry_test", {
      purpose: "local verification",
      phase: "7A.5b",
    });
    const err = new Error("Souq Arab EU Sentry test error (7A.5b — safe to ignore)");
    return Sentry.captureException(err);
  });
}

export async function flushSentry(timeoutMs = 2000): Promise<boolean> {
  if (!enabled) return true;
  return Sentry.flush(timeoutMs);
}

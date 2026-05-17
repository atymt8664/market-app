import type { NextFunction, Request, Response } from "express";
import { logger } from "./logger";
import {
  getSentryDsn,
  resolveSentryEnvironment,
  resolveSentryRelease,
} from "./sentry-env";

type SentryModule = typeof import("@sentry/node");

let enabled = false;
let sentryMod: SentryModule | null = null;
let initPromise: Promise<void> | null = null;

const SENSITIVE_HEADER_KEYS = new Set([
  "authorization",
  "cookie",
  "x-admin-access-key",
  "x-csrf-token",
  "set-cookie",
]);

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

function scrubEvent(event: import("@sentry/node").ErrorEvent): import("@sentry/node").ErrorEvent | null {
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

async function loadAndInitSentry(): Promise<void> {
  const dsn = getSentryDsn();
  if (!dsn) return;

  try {
    sentryMod = await import("@sentry/node");
    sentryMod.init({
      dsn,
      environment: resolveSentryEnvironment(),
      release: resolveSentryRelease(),
      tracesSampleRate: 0,
      profilesSampleRate: 0,
      sendDefaultPii: false,
      defaultIntegrations: false,
      integrations: [
        sentryMod.inboundFiltersIntegration(),
        sentryMod.linkedErrorsIntegration(),
        sentryMod.onUncaughtExceptionIntegration(),
        sentryMod.onUnhandledRejectionIntegration(),
      ],
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
  } catch (err) {
    logger.error({ err }, "Sentry init failed — continuing without error monitoring");
    sentryMod = null;
    enabled = false;
  }
}

/**
 * Lazy-loads @sentry/node only when SENTRY_DSN is set (keeps bundle off hot path when disabled).
 */
export function initSentry(): void {
  if (!getSentryDsn()) {
    logger.info("Sentry disabled (SENTRY_DSN not set)");
    return;
  }
  if (!initPromise) {
    initPromise = loadAndInitSentry();
  }
}

export function isSentryEnabled(): boolean {
  return enabled;
}

function applyRequestScope(req: Request, scope: import("@sentry/node").Scope): void {
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

export function sentryRequestMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!enabled || !sentryMod) {
    next();
    return;
  }
  applyRequestScope(req, sentryMod.getCurrentScope());
  next();
}

export function captureApiError(err: unknown, req: Request): void {
  if (!enabled || !sentryMod) return;
  sentryMod.withScope((scope) => {
    applyRequestScope(req, scope);
    if (err instanceof Error) {
      sentryMod!.captureException(err);
    } else {
      sentryMod!.captureException(new Error(String(err)));
    }
  });
}

export function captureUnhandledError(err: unknown): void {
  if (!enabled || !sentryMod) return;
  if (err instanceof Error) {
    sentryMod.captureException(err);
  } else {
    sentryMod.captureException(new Error(String(err)));
  }
}

export async function captureSentryTestError(requestId?: string): Promise<string | null> {
  if (!enabled || !sentryMod) return null;
  return sentryMod.withScope(() => {
    const scope = sentryMod!.getCurrentScope();
    if (requestId) {
      scope.setTag("requestId", requestId);
      scope.setTag("request_id", requestId);
    }
    scope.setTag("sentry_test", "7A.5b");
    return sentryMod!.captureException(
      new Error("Souq Arab EU Sentry test error (7A.5b — safe to ignore)"),
    );
  });
}

export async function flushSentry(timeoutMs = 2000): Promise<boolean> {
  if (!enabled || !sentryMod) return true;
  return sentryMod.flush(timeoutMs);
}

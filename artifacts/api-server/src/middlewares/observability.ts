import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger";
import { OBSERVABILITY } from "../lib/observability/config";
import { recordHttpRequest } from "../lib/observability/metrics";
import { resolveRequestId } from "../lib/observability/request-id";

const SKIP_METRICS_PREFIXES = ["/api/healthz", "/api/livez", "/api/readyz"];

function normalizePath(url: string | undefined): string {
  if (!url) return "/";
  const path = url.split("?")[0] || "/";
  return path
    .replace(/\/\d+/g, "/:id")
    .replace(/\/[0-9a-f-]{36}/gi, "/:uuid");
}

function shouldSkipMetrics(path: string): boolean {
  return SKIP_METRICS_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

export function observabilityMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const requestId = resolveRequestId(req.headers["x-request-id"]);
  req.id = requestId;
  res.setHeader("X-Request-Id", requestId);

  const path = normalizePath(req.originalUrl || req.url);
  const started = performance.now();

  res.on("finish", () => {
    const durationMs = performance.now() - started;
    if (!shouldSkipMetrics(path)) {
      recordHttpRequest({
        method: req.method,
        path,
        statusCode: res.statusCode,
        durationMs,
      });
    }

    if (durationMs >= OBSERVABILITY.slowHttpMs && !shouldSkipMetrics(path)) {
      logger.warn(
        {
          requestId,
          method: req.method,
          path,
          statusCode: res.statusCode,
          durationMs: Math.round(durationMs),
        },
        "slow HTTP request",
      );
    }
  });

  next();
}

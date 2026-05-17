import { pool } from "@workspace/db";
import { logger } from "../logger";
import { OBSERVABILITY } from "./config";
import { recordDbQuery } from "./metrics";

type QueryablePool = {
  query: (...args: unknown[]) => unknown;
};

function queryLabel(config: unknown): string {
  if (typeof config === "string") {
    const head = config.trim().split(/\s+/).slice(0, 2).join(" ").toLowerCase();
    return head.slice(0, 40);
  }
  if (config && typeof config === "object" && "name" in config) {
    const name = (config as { name?: unknown }).name;
    if (typeof name === "string" && name.length > 0) return name.slice(0, 40);
  }
  return "query";
}

export function instrumentPgPool(): void {
  const target = pool as QueryablePool;
  const originalQuery = target.query.bind(pool);

  target.query = (...args: unknown[]) => {
    const started = performance.now();
    const label = queryLabel(args[0]);
    const callback = args[2];

    const logSlow = (err: unknown) => {
      const durationMs = performance.now() - started;
      recordDbQuery(durationMs, label);
      if (durationMs >= OBSERVABILITY.slowDbMs) {
        logger.warn(
          { durationMs: Math.round(durationMs), dbOp: label, err: err ? true : undefined },
          "slow database query",
        );
      }
    };

    if (typeof callback === "function") {
      return originalQuery(
        args[0],
        args[1],
        (err: unknown, result: unknown) => {
          logSlow(err);
          callback(err, result);
        },
      );
    }

    const result = originalQuery(...args);
    if (result && typeof (result as Promise<unknown>).then === "function") {
      return (result as Promise<unknown>).then(
        (value) => {
          logSlow(null);
          return value;
        },
        (err: unknown) => {
          logSlow(err);
          throw err;
        },
      );
    }

    logSlow(null);
    return result;
  };
}

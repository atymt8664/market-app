import { pool } from "@workspace/db";
import { OBSERVABILITY } from "./config";
import { recordDbQuery } from "./metrics";

export type ReadinessCheck = {
  status: "ok" | "degraded" | "fail";
  checks: {
    database: "ok" | "fail" | "timeout";
  };
  latencyMs?: number;
};

export async function checkDatabaseReadiness(): Promise<ReadinessCheck> {
  const started = performance.now();
  try {
    const timeoutMs = OBSERVABILITY.readyzDbTimeoutMs;
    await Promise.race([
      pool.query("SELECT 1 AS ok"),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("readyz_db_timeout")), timeoutMs);
      }),
    ]);
    const latencyMs = performance.now() - started;
    recordDbQuery(latencyMs, "readyz");
    return {
      status: "ok",
      checks: { database: "ok" },
      latencyMs: Math.round(latencyMs),
    };
  } catch (err) {
    const latencyMs = performance.now() - started;
    recordDbQuery(latencyMs, "readyz");
    const isTimeout = err instanceof Error && err.message === "readyz_db_timeout";
    return {
      status: "fail",
      checks: { database: isTimeout ? "timeout" : "fail" },
      latencyMs: Math.round(latencyMs),
    };
  }
}

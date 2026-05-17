import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { checkDatabaseReadiness } from "../lib/observability/readiness";

const router: IRouter = Router();

/** Liveness — process is up (Railway / load balancers). */
router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/livez", (_req, res) => {
  res.json({
    status: "ok",
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

/** Readiness — dependencies required to serve traffic. */
router.get("/readyz", async (_req, res) => {
  const result = await checkDatabaseReadiness();
  const httpStatus = result.status === "ok" ? 200 : 503;
  res.status(httpStatus).json({
    status: result.status === "ok" ? "ready" : "not_ready",
    checks: result.checks,
    ...(result.latencyMs !== undefined ? { dbLatencyMs: result.latencyMs } : {}),
  });
});

export default router;

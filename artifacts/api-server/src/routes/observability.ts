import { Router, type IRouter } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import {
  buildObservabilitySnapshot,
  ingestWebVital,
  isWebVitalMetric,
  OBSERVABILITY,
  shouldAcceptVitalsSample,
} from "../lib/observability";
import { requireAdmin, requireAdminAccessGrant } from "../middlewares/require-admin";
import { requireAdminIpAllowlist } from "../middlewares/admin-ip-gate";

const router: IRouter = Router();

const vitalsLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? "unknown"),
  message: { error: "Too many vitals reports" },
});

router.post("/observability/vitals", vitalsLimiter, (req, res) => {
  if (!OBSERVABILITY.vitalsIngestEnabled) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (!shouldAcceptVitalsSample()) {
    res.status(204).end();
    return;
  }

  const body = req.body as Record<string, unknown>;
  const route = typeof body.route === "string" ? body.route : "";
  const metricRaw = typeof body.metric === "string" ? body.metric.toUpperCase() : "";
  const value = typeof body.value === "number" ? body.value : Number(body.value);

  if (!isWebVitalMetric(metricRaw)) {
    res.status(400).json({ error: "Invalid metric" });
    return;
  }

  const result = ingestWebVital({ route, metric: metricRaw, value });
  if (!result.ok) {
    res.status(400).json({ error: "Invalid vitals payload" });
    return;
  }

  res.status(204).end();
});

router.use(requireAdminIpAllowlist);

router.get(
  "/observability/metrics",
  requireAdminAccessGrant,
  requireAdmin,
  (_req, res) => {
    if (!OBSERVABILITY.metricsEndpointEnabled) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(buildObservabilitySnapshot());
  },
);

export default router;

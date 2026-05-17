import { Router, type IRouter } from "express";
import { buildObservabilitySnapshot, OBSERVABILITY } from "../lib/observability";
import { requireAdmin, requireAdminAccessGrant } from "../middlewares/require-admin";
import { requireAdminIpAllowlist } from "../middlewares/admin-ip-gate";

const router: IRouter = Router();

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

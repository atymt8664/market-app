import { Router } from "express";
import { buildAdminMonitoringSnapshot } from "../lib/admin-monitoring-snapshot";
import { requireAdmin, requireAdminAccessGrant } from "../middlewares/require-admin";
import { requireAdminPermission } from "../middlewares/require-admin-permission";
import { requireAdminIpAllowlist } from "../middlewares/admin-ip-gate";

const router = Router();

router.get(
  "/admin/monitoring",
  requireAdminIpAllowlist,
  requireAdminAccessGrant,
  requireAdmin,
  requireAdminPermission("system"),
  async (req, res, next) => {
    try {
      const staff = req.adminStaff;
      if (!staff?.isFounder) {
        return res.status(403).json({
          error: "Forbidden",
          code: "RBAC_DENIED",
          title: "صلاحية غير كافية",
          description: "مركز المراقبة متاح للـ Founder فقط.",
          nextStep: "تواصل مع Mohamed للوصول.",
        });
      }

      const snapshot = await buildAdminMonitoringSnapshot(staff);
      return res.json({
        status: "ok",
        title: "Monitoring snapshot",
        description: "لقطة مراقبة النظام الحالية.",
        nextStep: "راجع التنبيهات والمقاييس أدناه.",
        activityId: snapshot.snapshotId,
        snapshot,
      });
    } catch (err) {
      return next(err);
    }
  },
);

export default router;

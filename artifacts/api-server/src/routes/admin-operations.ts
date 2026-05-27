import { Router } from "express";
import { loadAdminStaffContext } from "../lib/admin-rbac";
import {
  canAccessOpsDomain,
  getDomainQueueCounts,
  getOpsQueueSummary,
  getStaffLoadSnapshot,
  runAutoEscalationAll,
  suggestAssignStaff,
} from "../lib/admin-operations-queue";
import { isOpsQueueKey, type OpsDomain } from "../lib/admin-operations-sla";
import { requireAdmin, requireAdminAccessGrant } from "../middlewares/require-admin";
import { requireAdminPermission } from "../middlewares/require-admin-permission";
import { requireAdminIpAllowlist } from "../middlewares/admin-ip-gate";

const router = Router();

router.use("/admin", requireAdminIpAllowlist, requireAdminAccessGrant, requireAdmin);

async function loadOpsContext(req: import("express").Request, res: import("express").Response) {
  const staff = await loadAdminStaffContext(req);
  req.adminStaff = staff;
  if (!staff.isFounder && staff.permissions.length === 0) {
    res.status(403).json({ error: "Forbidden", code: "RBAC_DENIED" });
    return null;
  }
  return staff;
}

function parseDomain(raw: string): OpsDomain | null {
  if (raw === "verification" || raw === "reports" || raw === "support" || raw === "ads") {
    return raw;
  }
  return null;
}

router.get("/admin/operations/summary", requireAdminPermission("dashboard.operations", "ads", "reports", "support", "verification"), async (req, res, next) => {
  try {
    const staff = await loadOpsContext(req, res);
    if (!staff) return;
    await runAutoEscalationAll();
    const summary = await getOpsQueueSummary(staff);
    return res.json(summary);
  } catch (err) {
    return next(err);
  }
});

router.get("/admin/operations/staff-load", async (req, res, next) => {
  try {
    const staff = await loadOpsContext(req, res);
    if (!staff) return;
    if (!staff.isFounder && staff.roleKey !== "admin_manager") {
      return res.status(403).json({ error: "Forbidden", code: "RBAC_DENIED" });
    }
    const snapshot = await getStaffLoadSnapshot(staff);
    return res.json(snapshot);
  } catch (err) {
    return next(err);
  }
});

router.get("/admin/operations/suggest-assign", async (req, res, next) => {
  try {
    const staff = await loadOpsContext(req, res);
    if (!staff) return;
    if (!staff.isFounder) {
      return res.status(403).json({ error: "Forbidden", code: "RBAC_DENIED" });
    }
    const domain = parseDomain(String(req.query.domain || ""));
    if (!domain) return res.status(400).json({ error: "Invalid domain" });
    const excludeStaffId = Number(req.query.excludeStaffId);
    const suggestion = await suggestAssignStaff({
      domain,
      excludeStaffId: Number.isInteger(excludeStaffId) ? excludeStaffId : null,
    });
    return res.json({ suggestion });
  } catch (err) {
    return next(err);
  }
});

router.get("/admin/operations/queues/:domain", async (req, res, next) => {
  try {
    const staff = await loadOpsContext(req, res);
    if (!staff) return;
    const domain = parseDomain(req.params.domain);
    if (!domain) return res.status(400).json({ error: "Invalid domain" });
    if (!canAccessOpsDomain(staff, domain)) {
      return res.status(403).json({ error: "Forbidden", code: "RBAC_DENIED" });
    }
    const queueRaw = String(req.query.queue || "all");
    const queue = isOpsQueueKey(queueRaw) ? queueRaw : "all";
    await runAutoEscalationAll();
    const counts = await getDomainQueueCounts(staff, domain);
    return res.json({ domain, queue, counts });
  } catch (err) {
    return next(err);
  }
});

router.get("/admin/operations/founder", requireAdminPermission("system"), async (req, res, next) => {
  try {
    const staff = await loadOpsContext(req, res);
    if (!staff) return;
    if (!staff.isFounder) {
      return res.status(403).json({ error: "Forbidden", code: "RBAC_DENIED" });
    }
    await runAutoEscalationAll();
    const [summary, staffLoad] = await Promise.all([
      getOpsQueueSummary(staff),
      getStaffLoadSnapshot(staff),
    ]);
    const lateStaff = staffLoad.staff.filter((s) => s.slaExceeded > 0 || s.isOverloaded);
    return res.json({
      summary,
      staffLoad,
      lateStaff,
      health: {
        totalOpen: summary.totals.total,
        totalSlaExceeded: summary.totals.slaExceeded,
        totalEscalation: summary.totals.escalation,
        totalUnassigned: summary.totals.unassigned,
        overloadedStaff: staffLoad.staff.filter((s) => s.isOverloaded).length,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return next(err);
  }
});

export default router;

import { Router } from "express";
import { assertJobQueueStagingOnly, isJobQueueEnabled } from "../lib/jobs/env-guard";
import { listDlqJobsForOps, replayDeadLetterJob } from "../lib/jobs/dlq-replay";
import { probePgBossJobQueue } from "../lib/jobs/job-queue-probe";
import { startQueueModule } from "../lib/jobs/queue-module";
import { requireAdmin, requireAdminAccessGrant, requireAdminCsrf } from "../middlewares/require-admin";
import { requireAdminPermission } from "../middlewares/require-admin-permission";
import { requireAdminIpAllowlist } from "../middlewares/admin-ip-gate";
import { logger } from "../lib/logger";

const router = Router();

function assertStagingJobOps(): void {
  if (!isJobQueueEnabled()) {
    throw new Error("JOB_QUEUE_ENABLED is required for job operations");
  }
  assertJobQueueStagingOnly();
}

router.get(
  "/admin/jobs/health",
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
          description: "عمليات الطوابير متاحة للـ Founder فقط.",
        });
      }

      const probe = await probePgBossJobQueue();
      return res.json({
        status: "ok",
        pgBoss: probe,
      });
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  "/admin/jobs/dlq",
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
        });
      }

      assertStagingJobOps();
      const boss = await startQueueModule();
      const limit = Math.min(Number(req.query.limit) || 25, 100);
      const jobs = await listDlqJobsForOps(boss, limit);
      return res.json({ status: "ok", jobs, count: jobs.length });
    } catch (err) {
      if (err instanceof Error && err.message.includes("REFUSE")) {
        return res.status(403).json({ error: err.message });
      }
      return next(err);
    }
  },
);

router.post(
  "/admin/jobs/dlq/:jobId/replay",
  requireAdminIpAllowlist,
  requireAdminAccessGrant,
  requireAdmin,
  requireAdminPermission("system"),
  requireAdminCsrf,
  async (req, res, next) => {
    try {
      const staff = req.adminStaff;
      if (!staff?.isFounder) {
        return res.status(403).json({
          error: "Forbidden",
          code: "RBAC_DENIED",
        });
      }

      assertStagingJobOps();
      const jobId = String(req.params.jobId ?? "").trim();
      if (!jobId) {
        return res.status(400).json({ error: "jobId required" });
      }

      const boss = await startQueueModule();
      const result = await replayDeadLetterJob(boss, jobId);
      logger.info(
        {
          kind: "dlq_replay",
          adminId: staff.actorAdminId,
          ...result,
        },
        "P15 DLQ job replayed",
      );
      return res.json({ status: "ok", result });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes("REFUSE")) {
          return res.status(403).json({ error: err.message });
        }
        if (
          err.message.includes("not found") ||
          err.message.includes("missing jobName") ||
          err.message.includes("invalid envelope")
        ) {
          return res.status(400).json({ error: err.message });
        }
      }
      return next(err);
    }
  },
);

export default router;

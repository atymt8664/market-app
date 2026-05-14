import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, appSettingsTable } from "@workspace/db";
import { requireAdminIpAllowlist } from "../middlewares/admin-ip-gate";
import { isAdminSecurityRevisionStale } from "../lib/admin-security-revision";
import { countUsersWithOpenChatSockets } from "../lib/realtime";
import {
  clearAdminIdentityOnSession,
  hasValidAdminAccessGrant,
  hasValidAdminSession,
} from "../middlewares/require-admin";

/**
 * Live count for admin dashboard — mounted on the main API router **after** `auth` and **before** `admin`.
 * If this lived only on `auth.ts`, some Express stacks never dispatched `GET /admin/active-app-users-count`
 * to that router; the request then hit `admin.ts`’s `router.use("/admin", … requireAdminAccessGrant …)`
 * and returned **403** for guests (same body as a real grant failure), while `/api/admin/me` still returned **401**.
 */
const router: IRouter = Router();

router.get("/admin/active-app-users-count", requireAdminIpAllowlist, async (req, res, next) => {
  try {
    if (hasValidAdminSession(req)) {
      if (!hasValidAdminAccessGrant(req)) {
        clearAdminIdentityOnSession(req);
        return res.status(403).json({ error: "Forbidden" });
      }
      const revRows = await db
        .select({ rev: appSettingsTable.adminSecurityRevision })
        .from(appSettingsTable)
        .where(eq(appSettingsTable.id, 1))
        .limit(1);
      const dbRev = Number(revRows[0]?.rev ?? 0);
      if (isAdminSecurityRevisionStale(req.session.adminSecurityRevision, dbRev)) {
        clearAdminIdentityOnSession(req);
        return res.status(401).json({ isAdmin: false });
      }
      const count = countUsersWithOpenChatSockets();
      return res.json({ count: Number.isFinite(count) && count >= 0 ? count : 0 });
    }

    return res.status(401).json({ isAdmin: false });
  } catch (e) {
    return next(e);
  }
});

export default router;

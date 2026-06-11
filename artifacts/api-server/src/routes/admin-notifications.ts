import { Router, type IRouter } from "express";
import { getAdminActorId } from "../lib/admin-activity-log";
import { loadAdminStaffContext } from "../lib/admin-rbac";
import {
  getAdminUnreadCount,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  refreshAndListAdminNotifications,
} from "../lib/admin-notifications";
import { requireAdmin, requireAdminCsrf } from "../middlewares/require-admin";
import { requireAdminIpAllowlist } from "../middlewares/admin-ip-gate";
import { requireAdminAccessGrant } from "../middlewares/require-admin";

const router: IRouter = Router();

router.use("/admin", requireAdminIpAllowlist, requireAdminAccessGrant, requireAdmin);

router.get("/admin/notifications/unread-count", async (req, res, next) => {
  try {
    const actorId = getAdminActorId(req);
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });
    const ctx = await loadAdminStaffContext(req);
    const counts = await getAdminUnreadCount(actorId, ctx);
    res.json(counts);
  } catch (err) {
    next(err);
  }
});

router.get("/admin/notifications", async (req, res, next) => {
  try {
    const actorId = getAdminActorId(req);
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });
    const ctx = await loadAdminStaffContext(req);
    const items = await refreshAndListAdminNotifications(actorId, ctx);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.patch("/admin/notifications/read-all", requireAdminCsrf, async (req, res, next) => {
  try {
    const actorId = getAdminActorId(req);
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });
    const ctx = await loadAdminStaffContext(req);
    const cleared = await markAllAdminNotificationsRead(actorId, ctx);
    res.json({ ok: true, cleared });
  } catch (err) {
    next(err);
  }
});

router.patch("/admin/notifications/:id/read", requireAdminCsrf, async (req, res, next) => {
  try {
    const actorId = getAdminActorId(req);
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const ok = await markAdminNotificationRead(actorId, id);
    if (!ok) return res.status(404).json({ error: "Not found" });
    return res.json({ ok: true, id });
  } catch (err) {
    next(err);
  }
});

export default router;

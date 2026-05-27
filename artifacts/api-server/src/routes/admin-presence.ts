import { Router, type IRouter } from "express";
import { requireAdminIpAllowlist } from "../middlewares/admin-ip-gate";
import {
  requireAdmin,
  requireAdminAccessGrant,
} from "../middlewares/require-admin";
import { requireAdminPermission } from "../middlewares/require-admin-permission";
import { countUsersWithOpenChatSockets } from "../lib/realtime";

/**
 * Live count for admin dashboard — mounted on the main API router **after** `auth` and **before** `admin`.
 * If this lived only on `auth.ts`, some Express stacks never dispatched `GET /admin/active-app-users-count`
 * to that router; the request then hit `admin.ts`’s `router.use("/admin", … requireAdminAccessGrant …)`
 * and returned **403** for guests (same body as a real grant failure), while `/api/admin/me` still returned **401**.
 */
const router: IRouter = Router();

router.get(
  "/admin/active-app-users-count",
  requireAdminIpAllowlist,
  requireAdminAccessGrant,
  requireAdmin,
  requireAdminPermission("system"),
  async (_req, res) => {
    const count = countUsersWithOpenChatSockets();
    return res.json({ count: Number.isFinite(count) && count >= 0 ? count : 0 });
  },
);

export default router;

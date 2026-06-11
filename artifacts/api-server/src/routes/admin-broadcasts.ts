import { Router, type IRouter } from "express";
import { getAdminActorId } from "../lib/admin-activity-log";
import { okAdminActionFeedback } from "../lib/admin-action-feedback";
import { writeAdminAudit } from "../lib/admin-audit";
import {
  buildBroadcastConfirmToken,
  createBroadcast,
  getBroadcastHistory,
  previewBroadcast,
  sendBroadcast,
} from "../lib/platform-broadcasts";
import { BroadcastSafetyError } from "../lib/platform-broadcasts/safety";
import { BROADCAST_CATEGORIES } from "../lib/platform-broadcasts/types";
import { requireAdmin, requireAdminCsrf } from "../middlewares/require-admin";
import { requireAdminIpAllowlist } from "../middlewares/admin-ip-gate";
import { requireAdminAccessGrant } from "../middlewares/require-admin";
import { requireAdminFounder } from "../middlewares/require-admin-founder";

const router: IRouter = Router();

router.use(
  "/admin",
  requireAdminIpAllowlist,
  requireAdminAccessGrant,
  requireAdmin,
  requireAdminFounder(),
);

router.get("/admin/broadcasts/categories", (_req, res) => {
  res.json({ categories: BROADCAST_CATEGORIES });
});

router.get("/admin/broadcasts", async (_req, res, next) => {
  try {
    const items = await getBroadcastHistory();
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.post("/admin/broadcasts/preview", requireAdminCsrf, async (req, res, next) => {
  try {
    const { category, title, body, audience } = req.body ?? {};
    const preview = await previewBroadcast({
      category: String(category ?? ""),
      title: String(title ?? ""),
      body: String(body ?? ""),
      audience: String(audience ?? "all_users"),
    });
    res.json(preview);
  } catch (err) {
    if (err instanceof BroadcastSafetyError) {
      return res.status(403).json({ error: err.message, code: err.code });
    }
    next(err);
  }
});

router.post("/admin/broadcasts", requireAdminCsrf, async (req, res, next) => {
  try {
    const actorId = getAdminActorId(req);
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });
    const { category, title, body, audience } = req.body ?? {};
    const draft = await createBroadcast({
      category: String(category ?? "") as never,
      title: String(title ?? ""),
      body: String(body ?? ""),
      audience: audience ? (String(audience) as never) : undefined,
      createdByAdminActorId: actorId,
    });
    const confirmToken = buildBroadcastConfirmToken(draft);
    await writeAdminAudit({
      req,
      actionKey: "broadcast.draft_created",
      targetType: "system",
      targetId: draft.id,
      extra: { category: draft.category, audience: draft.audience },
    });
    res.status(201).json({ ...draft, confirmToken });
  } catch (err) {
    if (err instanceof BroadcastSafetyError) {
      return res.status(403).json({ error: err.message, code: err.code });
    }
    next(err);
  }
});

router.post("/admin/broadcasts/:id/send", requireAdminCsrf, async (req, res, next) => {
  try {
    const actorId = getAdminActorId(req);
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const confirmToken = String(req.body?.confirmToken ?? "");
    const result = await sendBroadcast(id, confirmToken);
    await writeAdminAudit({
      req,
      actionKey: "broadcast.sent",
      targetType: "system",
      targetId: result.id,
      extra: {
        category: result.category,
        audience: result.audience,
        recipientCount: result.recipientCount,
      },
    });
    res.json({
      ...result,
      ...okAdminActionFeedback({
        title: "تم إرسال البث",
        description: `جاري توصيل الإشعار إلى ${result.recipientCount} مستخدم.`,
        nextStep: "يمكنك متابعة التقدم من سجل البث.",
      }),
    });
  } catch (err) {
    if (err instanceof BroadcastSafetyError) {
      return res.status(403).json({ error: err.message, code: err.code });
    }
    next(err);
  }
});

export default router;

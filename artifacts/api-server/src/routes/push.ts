import { Router, type IRouter } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/require-auth";
import { requireUserCsrf } from "../middlewares/require-user-csrf";
import { countActivePushSubscriptions, revokePushSubscription, upsertPushSubscription } from "../lib/push/push-subscriptions";
import { getVapidPublicKey, isPushConfigured } from "../lib/push/vapid-config";

const router: IRouter = Router();

const SubscribeBody = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().min(16).max(512),
    auth: z.string().min(8).max(512),
  }),
});

router.get("/push/vapid-public-key", (_req, res) => {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return res.status(503).json({ error: "Push not configured", code: "PUSH_NOT_CONFIGURED" });
  }
  return res.json({ publicKey });
});

router.get("/push/status", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const subscriptionCount = await countActivePushSubscriptions(userId);
  return res.json({
    configured: isPushConfigured(),
    subscribed: subscriptionCount > 0,
    subscriptionCount,
  });
});

router.post("/push/subscriptions", requireAuth, requireUserCsrf, async (req, res) => {
  if (!isPushConfigured()) {
    return res.status(503).json({ error: "Push not configured", code: "PUSH_NOT_CONFIGURED" });
  }
  const parsed = SubscribeBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid subscription payload" });
  }
  const userId = req.session.userId!;
  await upsertPushSubscription({
    userId,
    subscription: {
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
    },
    userAgent: req.headers["user-agent"]?.slice(0, 512) ?? null,
  });
  return res.status(201).json({ ok: true });
});

router.delete("/push/subscriptions", requireAuth, requireUserCsrf, async (req, res) => {
  const endpoint = typeof req.body?.endpoint === "string" ? req.body.endpoint : "";
  if (!endpoint.trim()) {
    return res.status(400).json({ error: "endpoint required" });
  }
  const userId = req.session.userId!;
  await revokePushSubscription(userId, endpoint);
  return res.json({ ok: true });
});

export default router;

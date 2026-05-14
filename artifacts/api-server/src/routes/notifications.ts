import { Router, type IRouter } from "express";
import { db, notificationsTable } from "@workspace/db";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/require-auth";
import { requireUserCsrf } from "../middlewares/require-user-csrf";

const router: IRouter = Router();

router.get("/notifications/unread-count", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const [row] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(notificationsTable)
    .where(
      and(
        eq(notificationsTable.userId, userId),
        isNull(notificationsTable.readAt),
      ),
    );
  res.json({ count: Number(row?.c ?? 0) });
});

router.patch("/notifications/read-all", requireAuth, requireUserCsrf, async (req, res) => {
  const userId = req.session.userId!;
  await db
    .update(notificationsTable)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notificationsTable.userId, userId),
        isNull(notificationsTable.readAt),
      ),
    );
  res.json({ ok: true });
});

router.patch("/notifications/:id/read", requireAuth, requireUserCsrf, async (req, res) => {
  const userId = req.session.userId!;
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid id" });
  }
  const updated = await db
    .update(notificationsTable)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notificationsTable.id, id),
        eq(notificationsTable.userId, userId),
      ),
    )
    .returning({ id: notificationsTable.id });
  if (!updated[0]) {
    return res.status(404).json({ error: "Not found" });
  }
  return res.json({ ok: true, id: updated[0].id });
});

router.get("/notifications", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(100);
  res.json(
    rows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      entityType: n.entityType ?? null,
      entityId: n.entityId ?? null,
      metadata: n.metadata ?? null,
      readAt: n.readAt ? n.readAt.toISOString() : null,
      createdAt: n.createdAt.toISOString(),
    })),
  );
});

export default router;

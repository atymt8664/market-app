import { Router, type IRouter } from "express";
import { db, notificationsTable } from "@workspace/db";
import { and, desc, eq, isNull } from "drizzle-orm";
import { requireAuth } from "../middlewares/require-auth";
import { requireUserCsrf } from "../middlewares/require-user-csrf";
import {
  finalizePage,
  handlePaginationError,
  keysetWhereDesc,
  PAGINATION,
  parsePaginationQuery,
  sendJsonArrayPage,
} from "../lib/pagination";
import { toNotificationApiRow } from "../lib/notifications/contract";
import { filterNotificationCenterRows } from "../lib/notifications/notification-center-filter";
import { getUnreadNotificationsCount } from "../lib/notifications/counters";

const router: IRouter = Router();

router.get("/notifications/unread-count", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const count = await getUnreadNotificationsCount(userId);
  res.json({ count });
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
  try {
    const userId = req.session.userId!;
    const pagination = parsePaginationQuery(
      req.query as Record<string, unknown>,
      PAGINATION.NOTIFICATIONS,
    );
    const conds = [eq(notificationsTable.userId, userId)];
    if (pagination.cursor) {
      conds.push(
        keysetWhereDesc(
          notificationsTable.createdAt,
          notificationsTable.id,
          pagination.cursor,
        ),
      );
    }
    const rows = await db
      .select()
      .from(notificationsTable)
      .where(and(...conds))
      .orderBy(desc(notificationsTable.createdAt), desc(notificationsTable.id))
      .limit(pagination.fetchLimit);
    const { items, meta } = finalizePage(rows, pagination.limit, (n) => ({
      at: n.createdAt,
      id: n.id,
    }));
    sendJsonArrayPage(
      res,
      filterNotificationCenterRows(items).map(toNotificationApiRow),
      meta,
    );
  } catch (err) {
    if (handlePaginationError(err, res)) return;
    throw err;
  }
});

export default router;

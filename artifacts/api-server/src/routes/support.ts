import { Router } from "express";
import {
  adsTable,
  db,
  supportTicketsTable,
  supportTicketMessagesTable,
  usersTable,
} from "@workspace/db";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { requireAuth } from "../middlewares/require-auth";
import { requireUserCsrf } from "../middlewares/require-user-csrf";
import { requireAdmin, requireAdminAccessGrant, requireAdminCsrf } from "../middlewares/require-admin";
import { requireAdminIpAllowlist } from "../middlewares/admin-ip-gate";
import { getAdminActorId, logAdminActivity } from "../lib/admin-activity-log";
import { createNotification } from "../lib/create-notification";
import { logger } from "../lib/logger";
import {
  finalizePage,
  handlePaginationError,
  keysetWhereDesc,
  PAGINATION,
  parsePaginationQuery,
  sendJsonArrayPage,
} from "../lib/pagination";

const router = Router();
const ALLOWED_SUPPORT_CATEGORIES = new Set([
  "general",
  "login",
  "ad",
  "payment",
  "account",
  "other",
]);

router.use("/admin", requireAdminIpAllowlist);

function parseOptionalId(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (!/^\d+$/.test(trimmed)) return null;
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isInteger(parsed) && parsed > 0 && parsed <= 2147483647
      ? parsed
      : null;
  }
  return null;
}

function pickRelatedId(body: Record<string, unknown>, camel: string, snake: string) {
  return body[camel] ?? body[snake] ?? null;
}

function normalizeSupportCategory(value: unknown): string {
  if (typeof value !== "string") return "general";
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "general";
  return ALLOWED_SUPPORT_CATEGORIES.has(normalized) ? normalized : "general";
}

router.post("/support/tickets", requireAuth, requireUserCsrf, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const rawBody =
      req.body && typeof req.body === "object"
        ? (req.body as Record<string, unknown>)
        : {};

    const rawCategory = rawBody["category"];
    const rawSubject = rawBody["subject"];
    const rawMessage = rawBody["message"];
    const rawRelatedAdId = pickRelatedId(rawBody, "relatedAdId", "related_ad_id");
    const rawRelatedUserId = pickRelatedId(rawBody, "relatedUserId", "related_user_id");

    if (typeof rawSubject !== "string") {
      return res.status(400).json({
        error: "Validation failed",
        field: "subject",
        details: "subject must be a string",
      });
    }
    if (typeof rawMessage !== "string") {
      return res.status(400).json({
        error: "Validation failed",
        field: "message",
        details: "message must be a string",
      });
    }

    const categoryText = normalizeSupportCategory(rawCategory);
    const subjectText = rawSubject.trim();
    const messageText = rawMessage.trim();

    if (!subjectText) {
      return res.status(400).json({
        error: "Validation failed",
        field: "subject",
        details: "subject is required",
      });
    }
    if (!messageText) {
      return res.status(400).json({
        error: "Validation failed",
        field: "message",
        details: "message is required",
      });
    }

    const parsedRelatedAdId = parseOptionalId(rawRelatedAdId);
    const parsedRelatedUserId = parseOptionalId(rawRelatedUserId);

    let safeRelatedAdId: number | null = parsedRelatedAdId;
    if (safeRelatedAdId !== null) {
      const adRow = await db
        .select({ id: adsTable.id })
        .from(adsTable)
        .where(eq(adsTable.id, safeRelatedAdId))
        .limit(1);
      if (!adRow[0]) safeRelatedAdId = null;
    }

    let safeRelatedUserId: number | null = parsedRelatedUserId;
    let relatedUserExists = false;
    if (safeRelatedUserId !== null) {
      try {
        const userRow = await db
          .select({ id: usersTable.id })
          .from(usersTable)
          .where(eq(usersTable.id, safeRelatedUserId))
          .limit(1);
        relatedUserExists = !!userRow[0];
        if (!relatedUserExists) safeRelatedUserId = null;
      } catch {
        // related_user_id must never block ticket creation
        safeRelatedUserId = null;
        relatedUserExists = false;
      }
    }
    const insertPayload = {
      // Exact schema order: user_id, category, subject, message, status, priority, related_ad_id, related_user_id
      userId,
      category: categoryText,
      subject: subjectText,
      message: messageText,
      status: "open" as const,
      priority: "normal" as const,
      relatedAdId: safeRelatedAdId,
      relatedUserId: safeRelatedUserId,
    };
    const [ticket] = await db
      .insert(supportTicketsTable)
      .values(insertPayload)
      .returning({
        id: supportTicketsTable.id,
        category: supportTicketsTable.category,
        subject: supportTicketsTable.subject,
        message: supportTicketsTable.message,
        status: supportTicketsTable.status,
        priority: supportTicketsTable.priority,
        createdAt: supportTicketsTable.createdAt,
      });

    await db.insert(supportTicketMessagesTable).values({
      ticketId: ticket.id,
      userId,
      message: messageText,
    });

    return res.status(201).json({
      ...ticket,
      createdAt: ticket.createdAt?.toISOString?.() ?? null,
    });
  } catch (_error) {
    return res.status(500).json({
      error: "Failed to create support ticket",
    });
  }
});

router.get("/support/tickets/mine", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const pagination = parsePaginationQuery(
      req.query as Record<string, unknown>,
      PAGINATION.SUPPORT_TICKETS,
    );
    const conds = [eq(supportTicketsTable.userId, userId)];
    if (pagination.cursor) {
      conds.push(
        keysetWhereDesc(
          supportTicketsTable.createdAt,
          supportTicketsTable.id,
          pagination.cursor,
        ),
      );
    }
    const tickets = await db
      .select({
        id: supportTicketsTable.id,
        userId: supportTicketsTable.userId,
        category: supportTicketsTable.category,
        subject: supportTicketsTable.subject,
        status: supportTicketsTable.status,
        priority: supportTicketsTable.priority,
        relatedAdId: supportTicketsTable.relatedAdId,
        relatedUserId: supportTicketsTable.relatedUserId,
        createdAt: supportTicketsTable.createdAt,
        updatedAt: supportTicketsTable.updatedAt,
      })
      .from(supportTicketsTable)
      .where(and(...conds))
      .orderBy(desc(supportTicketsTable.createdAt), desc(supportTicketsTable.id))
      .limit(pagination.fetchLimit);

    const { items, meta } = finalizePage(tickets, pagination.limit, (ticket) => ({
      at: ticket.createdAt,
      id: ticket.id,
    }));
    return sendJsonArrayPage(
      res,
      items.map((ticket) => ({
        ...ticket,
        createdAt: ticket.createdAt ? ticket.createdAt.toISOString() : null,
        updatedAt: ticket.updatedAt ? ticket.updatedAt.toISOString() : null,
      })),
      meta,
    );
  } catch (err) {
    if (handlePaginationError(err, res)) return;
    throw err;
  }
});

router.get("/support/tickets/:id/messages", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid ticket id" });
    }

    const [ticket] = await db
      .select({ id: supportTicketsTable.id, userId: supportTicketsTable.userId })
      .from(supportTicketsTable)
      .where(eq(supportTicketsTable.id, id))
      .limit(1);
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    if (ticket.userId !== userId) return res.status(403).json({ error: "Forbidden" });

    const pagination = parsePaginationQuery(
      req.query as Record<string, unknown>,
      PAGINATION.SUPPORT_MESSAGES,
    );
    const conds = [eq(supportTicketMessagesTable.ticketId, id)];
    if (pagination.cursor) {
      conds.push(
        keysetWhereDesc(
          supportTicketMessagesTable.createdAt,
          supportTicketMessagesTable.id,
          pagination.cursor,
        ),
      );
    }
    const messages = await db
      .select({
        id: supportTicketMessagesTable.id,
        ticketId: supportTicketMessagesTable.ticketId,
        userId: supportTicketMessagesTable.userId,
        adminId: supportTicketMessagesTable.adminId,
        message: supportTicketMessagesTable.message,
        createdAt: supportTicketMessagesTable.createdAt,
      })
      .from(supportTicketMessagesTable)
      .where(and(...conds))
      .orderBy(
        desc(supportTicketMessagesTable.createdAt),
        desc(supportTicketMessagesTable.id),
      )
      .limit(pagination.fetchLimit);

    const { items, meta } = finalizePage(messages, pagination.limit, (item) => ({
      at: item.createdAt,
      id: item.id,
    }));
    return sendJsonArrayPage(
      res,
      items.map((item) => ({
        ...item,
        createdAt: item.createdAt ? item.createdAt.toISOString() : null,
      })),
      meta,
    );
  } catch (err) {
    if (handlePaginationError(err, res)) return;
    throw err;
  }
});

router.get("/admin/support/tickets", requireAdminAccessGrant, requireAdmin, async (req, res) => {
  try {
    const status = String(req.query.status || "").trim();
    const q = String(req.query.q || "").trim();
    const pagination = parsePaginationQuery(
      req.query as Record<string, unknown>,
      PAGINATION.SUPPORT_TICKETS,
    );
    const rows = await db
      .select({
        id: supportTicketsTable.id,
        userId: supportTicketsTable.userId,
        userName: usersTable.name,
        userEmail: usersTable.email,
        userAvatarUrl: usersTable.avatarUrl,
        category: supportTicketsTable.category,
        subject: supportTicketsTable.subject,
        status: supportTicketsTable.status,
        priority: supportTicketsTable.priority,
        relatedAdId: supportTicketsTable.relatedAdId,
        relatedUserId: supportTicketsTable.relatedUserId,
        createdAt: supportTicketsTable.createdAt,
        updatedAt: supportTicketsTable.updatedAt,
      })
      .from(supportTicketsTable)
      .leftJoin(usersTable, eq(usersTable.id, supportTicketsTable.userId))
      .where(
        and(
          status ? eq(supportTicketsTable.status, status) : undefined,
          q
            ? or(
                ilike(supportTicketsTable.subject, `%${q}%`),
                ilike(supportTicketsTable.category, `%${q}%`),
                ilike(usersTable.name, `%${q}%`),
                ilike(usersTable.email, `%${q}%`),
              )
            : undefined,
          pagination.cursor
            ? keysetWhereDesc(
                supportTicketsTable.createdAt,
                supportTicketsTable.id,
                pagination.cursor,
              )
            : undefined,
        ),
      )
      .orderBy(desc(supportTicketsTable.createdAt), desc(supportTicketsTable.id))
      .limit(pagination.fetchLimit);

    const { items, meta } = finalizePage(rows, pagination.limit, (row) => ({
      at: row.createdAt,
      id: row.id,
    }));
    return sendJsonArrayPage(
      res,
      items.map((row) => ({
        ...row,
        createdAt: row.createdAt ? row.createdAt.toISOString() : null,
        updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
      })),
      meta,
    );
  } catch (err) {
    if (handlePaginationError(err, res)) return;
    throw err;
  }
});

router.get("/admin/support/tickets/:id/messages", requireAdminAccessGrant, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid ticket id" });
    }

    const pagination = parsePaginationQuery(
      req.query as Record<string, unknown>,
      PAGINATION.SUPPORT_MESSAGES,
    );
    const conds = [eq(supportTicketMessagesTable.ticketId, id)];
    if (pagination.cursor) {
      conds.push(
        keysetWhereDesc(
          supportTicketMessagesTable.createdAt,
          supportTicketMessagesTable.id,
          pagination.cursor,
        ),
      );
    }

    const messages = await db
      .select({
        id: supportTicketMessagesTable.id,
        ticketId: supportTicketMessagesTable.ticketId,
        userId: supportTicketMessagesTable.userId,
        adminId: supportTicketMessagesTable.adminId,
        message: supportTicketMessagesTable.message,
        createdAt: supportTicketMessagesTable.createdAt,
      })
      .from(supportTicketMessagesTable)
      .where(and(...conds))
      .orderBy(
        desc(supportTicketMessagesTable.createdAt),
        desc(supportTicketMessagesTable.id),
      )
      .limit(pagination.fetchLimit);

    const { items, meta } = finalizePage(messages, pagination.limit, (item) => ({
      at: item.createdAt,
      id: item.id,
    }));
    return sendJsonArrayPage(
      res,
      items.map((item) => ({
        ...item,
        createdAt: item.createdAt ? item.createdAt.toISOString() : null,
      })),
      meta,
    );
  } catch (err) {
    if (handlePaginationError(err, res)) return;
    throw err;
  }
});

router.patch("/admin/support/tickets/:id", requireAdminAccessGrant, requireAdmin, requireAdminCsrf, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid ticket id" });
  }

  const status = req.body?.status ? String(req.body.status).trim() : undefined;
  const priority = req.body?.priority
    ? String(req.body.priority).trim()
    : undefined;

  if (status && !["open", "pending", "resolved", "closed"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  if (priority && !["low", "normal", "high", "urgent"].includes(priority)) {
    return res.status(400).json({ error: "Invalid priority" });
  }

  const [before] = await db
    .select({
      id: supportTicketsTable.id,
      status: supportTicketsTable.status,
      priority: supportTicketsTable.priority,
      userId: supportTicketsTable.userId,
      subject: supportTicketsTable.subject,
    })
    .from(supportTicketsTable)
    .where(eq(supportTicketsTable.id, id))
    .limit(1);

  if (!before) {
    return res.status(404).json({ error: "Ticket not found" });
  }

  const statusChanged = status !== undefined && status !== before.status;
  const priorityChanged = priority !== undefined && priority !== before.priority;

  const [updated] = await db
    .update(supportTicketsTable)
    .set({
      status,
      priority,
      updatedAt: new Date(),
      closedAt: status === "closed" || status === "resolved" ? new Date() : null,
    })
    .where(eq(supportTicketsTable.id, id))
    .returning({
      id: supportTicketsTable.id,
      status: supportTicketsTable.status,
      priority: supportTicketsTable.priority,
    });

  const effectiveStatus = status ?? before.status;
  const action =
    effectiveStatus === "closed"
      ? "support.close"
      : effectiveStatus === "resolved"
        ? "support.resolve"
        : "support.update";
  await logAdminActivity({
    action,
    actorAdminId: getAdminActorId(req),
    targetType: "support_ticket",
    targetId: id,
    details: {
      fromStatus: before.status,
      toStatus: effectiveStatus,
      fromPriority: before.priority,
      toPriority: priority ?? before.priority,
    },
  });

  if (before.userId != null && (statusChanged || priorityChanged)) {
    try {
      const subj = before.subject.trim().slice(0, 100) || "تذكرة الدعم";
      const newStatus = updated?.status ?? before.status;
      const newPriority = updated?.priority ?? before.priority;
      const parts: string[] = [];
      if (statusChanged) parts.push(`الحالة: ${newStatus}`);
      if (priorityChanged) parts.push(`الأولوية: ${newPriority}`);
      await createNotification({
        userId: before.userId,
        type: "support.ticket.updated",
        title: "تحديث على تذكرة الدعم",
        body: `«${subj}» — ${parts.join(" • ")}`,
        entityType: "support_ticket",
        entityId: id,
        metadata: { ticketId: id },
      });
    } catch (err) {
      logger.warn({ err, ticketId: id }, "createNotification failed (support ticket update)");
    }
  }

  return res.json(updated);
});

router.post("/admin/support/tickets/:id/reply", requireAdminAccessGrant, requireAdmin, requireAdminCsrf, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid ticket id" });
  }

  const message = String(req.body?.message || "").trim();
  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  const [ticket] = await db
    .select({
      id: supportTicketsTable.id,
      userId: supportTicketsTable.userId,
      subject: supportTicketsTable.subject,
    })
    .from(supportTicketsTable)
    .where(eq(supportTicketsTable.id, id))
    .limit(1);
  if (!ticket) {
    return res.status(404).json({ error: "Ticket not found" });
  }

  const [inserted] = await db
    .insert(supportTicketMessagesTable)
    .values({
      ticketId: id,
      adminId: req.session.userId ?? null,
      message,
    })
    .returning({
      id: supportTicketMessagesTable.id,
      ticketId: supportTicketMessagesTable.ticketId,
      userId: supportTicketMessagesTable.userId,
      adminId: supportTicketMessagesTable.adminId,
      message: supportTicketMessagesTable.message,
      createdAt: supportTicketMessagesTable.createdAt,
    });

  await db
    .update(supportTicketsTable)
    .set({ status: "pending", updatedAt: new Date() })
    .where(eq(supportTicketsTable.id, id));

  if (ticket.userId != null) {
    try {
      const subj = ticket.subject.trim().slice(0, 100) || "تذكرة الدعم";
      const preview = message.slice(0, 200);
      await createNotification({
        userId: ticket.userId,
        type: "support.reply",
        title: "رد من فريق الدعم",
        body: `«${subj}» — ${preview}`,
        entityType: "support_ticket",
        entityId: id,
        metadata: { previewSlice: preview },
      });
    } catch (err) {
      logger.warn({ err, ticketId: id }, "createNotification failed (support reply)");
    }
  }

  return res.status(201).json({
    ...inserted,
    createdAt: inserted.createdAt ? inserted.createdAt.toISOString() : null,
  });
});

export default router;

import { Router } from "express";
import {
  adsTable,
  db,
  supportTicketsTable,
  supportTicketMessagesTable,
  usersTable,
} from "@workspace/db";
import { and, desc, eq, ilike, or, sql, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/require-auth";
import { requireUserCsrf } from "../middlewares/require-user-csrf";
import { requireAdmin, requireAdminAccessGrant, requireAdminCsrf } from "../middlewares/require-admin";
import { requireAdminIpAllowlist } from "../middlewares/admin-ip-gate";
import { requireAdminPermission } from "../middlewares/require-admin-permission";
import { requireAdminFounder } from "../middlewares/require-admin-founder";
import { getAdminActorId, logAdminActivity } from "../lib/admin-activity-log";
import { adminDeepLink, writeAdminAudit } from "../lib/admin-audit";
import { okAdminActionFeedback } from "../lib/admin-action-feedback";
import { parseModerationReason } from "../lib/admin-moderation-reason";
import {
  assignSupportTicket,
  buildStaffAssignmentView,
  claimSupportTicket,
  ensureStaffWorkflowSchema,
  releaseSupportTicket,
} from "../lib/admin-staff-workflow";
import { buildQueueSql, getDomainQueueCounts, mapSlaFields, assertStaffCanClaim } from "../lib/admin-operations-queue";
import { ensureSlaEscalationBeforeAdminRead } from "../lib/ops-cron";
import { isOpsQueueKey } from "../lib/admin-operations-sla";
import { loadAdminStaffContext } from "../lib/admin-rbac";
import { officialNotificationContent } from "../lib/communications";
import { createNotification } from "../lib/create-notification";
import { logger } from "../lib/logger";
import {
  buildAdminPageMeta,
  finalizePage,
  handlePaginationError,
  keysetWhereDesc,
  PAGINATION,
  parseAdminPageQuery,
  parsePaginationQuery,
  sendJsonAdminPage,
  sendJsonArrayPage,
} from "../lib/pagination";
import { createSupportTicketLimiter } from "../lib/trust-safety/trust-limits";

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

router.post("/support/tickets", requireAuth, requireUserCsrf, createSupportTicketLimiter, async (req, res) => {
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

    try {
      const subj = subjectText.slice(0, 80);
      const copy = officialNotificationContent({
        type: "support.ticket.created",
        slaContext: { support: { category: categoryText, priority: "normal" } },
      });
      if (copy) {
        await createNotification({
          userId,
          type: "support.ticket.created",
          title: copy.title,
          body: copy.body,
          entityType: "support_ticket",
          entityId: ticket.id,
          metadata: { ticketId: ticket.id, subject: subj },
        });
      }
    } catch (err) {
      logger.warn({ err, ticketId: ticket.id }, "createNotification failed (support.ticket.created)");
    }

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

router.get("/admin/support/stats", requireAdminAccessGrant, requireAdmin, requireAdminPermission("support"), async (req, res) => {
  const staff = req.adminStaff ?? (await loadAdminStaffContext(req));
  await ensureSlaEscalationBeforeAdminRead();
  const counts = await getDomainQueueCounts(staff, "support");
  return res.json(counts);
});

router.get("/admin/support/tickets", requireAdminAccessGrant, requireAdmin, requireAdminPermission("support"), async (req, res) => {
  try {
    await ensureStaffWorkflowSchema();
    const staff = req.adminStaff ?? (await loadAdminStaffContext(req));
    await ensureSlaEscalationBeforeAdminRead();

    const queueRaw = String(req.query.queue || "").trim();
    const queue = isOpsQueueKey(queueRaw) ? queueRaw : null;
    const actorId = staff.actorAdminId;

    const status = String(req.query.status || "").trim();
    const q = String(req.query.q || "").trim();
    const { page, pageSize, offset } = parseAdminPageQuery(
      req.query as Record<string, unknown>,
      PAGINATION.SUPPORT_TICKETS,
    );

    const queueFilter =
      queue && queue !== "all"
        ? sql`${supportTicketsTable.id} IN (SELECT st.id FROM support_tickets st WHERE ${buildQueueSql("support", queue, actorId, "st")})`
        : sql`TRUE`;

    const listWhere = and(
      queueFilter,
      status ? eq(supportTicketsTable.status, status) : undefined,
      q
        ? or(
            ilike(supportTicketsTable.subject, `%${q}%`),
            ilike(supportTicketsTable.category, `%${q}%`),
            ilike(usersTable.name, `%${q}%`),
            ilike(usersTable.email, `%${q}%`),
          )
        : undefined,
    );

    const [countRow] = await db
      .select({ value: count(supportTicketsTable.id) })
      .from(supportTicketsTable)
      .leftJoin(usersTable, eq(usersTable.id, supportTicketsTable.userId))
      .where(listWhere);
    const totalItems = Number(countRow?.value ?? 0);

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
        slaDueAt: sql<Date | null>`support_tickets.sla_due_at`,
        assignedStaffId: supportTicketsTable.assignedStaffId,
        assignedAt: supportTicketsTable.assignedAt,
        assignedByAdminId: supportTicketsTable.assignedByAdminId,
      })
      .from(supportTicketsTable)
      .leftJoin(usersTable, eq(usersTable.id, supportTicketsTable.userId))
      .where(listWhere)
      .orderBy(desc(supportTicketsTable.createdAt), desc(supportTicketsTable.id))
      .limit(pageSize)
      .offset(offset);

    const meta = buildAdminPageMeta(page, pageSize, totalItems);
    return sendJsonAdminPage(
      res,
      await Promise.all(
        rows.map(async (row) => ({
          ...row,
          assignment: await buildStaffAssignmentView({
            assignedStaffId: row.assignedStaffId,
            assignedAt: row.assignedAt,
            assignedByAdminId: row.assignedByAdminId,
          }),
          createdAt: row.createdAt ? row.createdAt.toISOString() : null,
          updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
          ...mapSlaFields({
            domain: "support",
            createdAt: row.createdAt,
            slaDueAt: row.slaDueAt,
            status: row.status,
            row: { category: row.category, priority: row.priority },
          }),
        })),
      ),
      meta,
    );
  } catch (err) {
    if (handlePaginationError(err, res)) return;
    throw err;
  }
});

router.get("/admin/support/tickets/:id/messages", requireAdminAccessGrant, requireAdmin, requireAdminPermission("support"), async (req, res) => {
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

router.patch("/admin/support/tickets/:id", requireAdminAccessGrant, requireAdmin, requireAdminPermission("support"), requireAdminCsrf, async (req, res) => {
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

  let moderationReason = "";
  if (status === "closed") {
    const parsed = parseModerationReason(req.body?.reason, "support_close");
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });
    moderationReason = parsed.reason;
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
  const actionKey =
    effectiveStatus === "closed"
      ? "support.close"
      : effectiveStatus === "resolved"
        ? "support.resolve"
        : effectiveStatus === "open" && (before.status === "closed" || before.status === "resolved")
          ? "support.reopen"
          : "support.update";

  const auditActivityId = await writeAdminAudit({
    req,
    actionKey,
    targetType: "support_ticket",
    targetId: id,
    previousState: before.status,
    newState: effectiveStatus,
    reason: moderationReason || null,
    deepLink: adminDeepLink(`/admin/support?ticketId=${id}`),
    extra: {
      fromPriority: before.priority,
      toPriority: priority ?? before.priority,
    },
  });

  if (before.userId != null && (statusChanged || priorityChanged)) {
    try {
      const subj = before.subject.trim().slice(0, 100) || "تذكرة الدعم";
      const copy = officialNotificationContent({ type: "support.ticket.updated" });
      if (copy) {
        await createNotification({
          userId: before.userId,
          type: "support.ticket.updated",
          title: copy.title,
          body: copy.body,
          entityType: "support_ticket",
          entityId: id,
          metadata: { ticketId: id, subject: subj, reason: moderationReason || null },
        });
      }
    } catch (err) {
      logger.warn({ err, ticketId: id }, "createNotification failed (support ticket update)");
    }
  }

  return res.json({
    ...okAdminActionFeedback({
      title: "تم تحديث التذكرة",
      description: `تذكرة الدعم #${id} — ${effectiveStatus}`,
      nextStep: "تم إشعار المستخدم إن وُجدت تغييرات.",
      auditActivityId,
    }),
    ...updated,
  });
});

router.post("/admin/support/tickets/:id/reply", requireAdminAccessGrant, requireAdmin, requireAdminPermission("support"), requireAdminCsrf, async (req, res) => {
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
      adminId: getAdminActorId(req),
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

  const auditActivityId = await writeAdminAudit({
    req,
    actionKey: "support.reply",
    targetType: "support_ticket",
    targetId: id,
    deepLink: adminDeepLink(`/admin/support?ticketId=${id}`),
    extra: { messageId: inserted.id },
  });

  if (ticket.userId != null) {
    try {
      const subj = ticket.subject.trim().slice(0, 100) || "تذكرة الدعم";
      const preview = message.slice(0, 200);
      const copy = officialNotificationContent({ type: "support.reply" });
      if (copy) {
        await createNotification({
          userId: ticket.userId,
          type: "support.reply",
          title: copy.title,
          body: copy.body,
          entityType: "support_ticket",
          entityId: id,
          metadata: { previewSlice: preview, subject: subj },
        });
      }
    } catch (err) {
      logger.warn({ err, ticketId: id }, "createNotification failed (support reply)");
    }
  }

  return res.status(201).json({
    ...inserted,
    createdAt: inserted.createdAt ? inserted.createdAt.toISOString() : null,
    ...okAdminActionFeedback({
      title: "تم إرسال الرد",
      description: `رد على تذكرة الدعم #${id}`,
      nextStep: "سيصل إشعار للمستخدم.",
      auditActivityId,
    }),
  });
});

router.post("/admin/support/tickets/:id/claim", requireAdminAccessGrant, requireAdmin, requireAdminPermission("support"), requireAdminCsrf, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid ticket id" });

  try {
    const staff = req.adminStaff ?? (await loadAdminStaffContext(req));
    await assertStaffCanClaim(staff, "support");
    const assignment = await claimSupportTicket({ ticketId: id, actorAdminId: getAdminActorId(req) });
    const auditActivityId = await writeAdminAudit({
      req,
      actionKey: "support.claim",
      targetType: "support_ticket",
      targetId: id,
      newState: assignment.staffName,
      deepLink: adminDeepLink(`/admin/support?ticketId=${id}`),
    });
    return res.json({
      assignment,
      ...okAdminActionFeedback({
        title: "تم استلام التذكرة",
        description: `أصبحت مسؤولاً عن تذكرة الدعم #${id}`,
        nextStep: "راجع الرسائل وأرسل رداً للمستخدم.",
        auditActivityId,
      }),
    });
  } catch (err) {
    if (err instanceof Error && (err.message === "STAFF_CLAIM_LIMIT_REACHED" || err.message === "STAFF_DOMAIN_CLAIM_LIMIT_REACHED")) {
      return res.status(409).json({
        error: "لا يمكن استلام المزيد من الطلبات حاليًا — تم بلوغ حد الحمل",
        code: err.message,
      });
    }
    throw err;
  }
});

router.post("/admin/support/tickets/:id/assign", requireAdminAccessGrant, requireAdmin, requireAdminPermission("support"), requireAdminFounder(), requireAdminCsrf, async (req, res) => {
  const id = Number(req.params.id);
  const staffId = Number(req.body?.staffId);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid ticket id" });
  if (!Number.isInteger(staffId) || staffId <= 0) return res.status(400).json({ error: "Invalid staffId" });

  const assignment = await assignSupportTicket({
    ticketId: id,
    staffId,
    actorAdminId: getAdminActorId(req),
  });
  const auditActivityId = await writeAdminAudit({
    req,
    actionKey: "support.assign",
    targetType: "support_ticket",
    targetId: id,
    newState: assignment.staffName,
    deepLink: adminDeepLink(`/admin/support?ticketId=${id}`),
    extra: { staffId },
  });
  return res.json({
    assignment,
    ...okAdminActionFeedback({
      title: "تم إسناد التذكرة",
      description: `أُسندت تذكرة الدعم #${id} إلى ${assignment.staffName ?? "الموظف"}.`,
      nextStep: "سيظهر في طابور الموظف المُسند.",
      auditActivityId,
    }),
  });
});

router.post("/admin/support/tickets/:id/release", requireAdminAccessGrant, requireAdmin, requireAdminPermission("support"), requireAdminCsrf, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid ticket id" });

  const assignment = await releaseSupportTicket(id);
  const auditActivityId = await writeAdminAudit({
    req,
    actionKey: "support.release",
    targetType: "support_ticket",
    targetId: id,
    deepLink: adminDeepLink(`/admin/support?ticketId=${id}`),
  });
  return res.json({
    assignment,
    ...okAdminActionFeedback({
      title: "تم إلغاء الإسناد",
      description: `تذكرة الدعم #${id} أصبحت غير مُسندة`,
      nextStep: "يمكن لموظف آخر استلامها من الطابور.",
      auditActivityId,
    }),
  });
});

export default router;

import {
  adsTable,
  db,
  reportsTable,
  supportTicketsTable,
  usersTable,
  verificationRequestsTable,
} from "@workspace/db";
import { desc, eq, gte, inArray, sql } from "drizzle-orm";
import { officialAdminNotificationContent } from "../communications";
import { ensureOpsQueueSchema } from "../admin-operations-queue";
import { upsertAdminNotification } from "./persist";

const OPEN_REPORT_STATUSES = ["open", "under_review", "pending", "in_review"];
const OPEN_SUPPORT_STATUSES = ["open", "pending"];
const OPEN_VERIFICATION_STATUSES = ["pending", "under_review", "needs_info"];

export async function syncAdminNotificationsFromOps(): Promise<number> {
  await ensureOpsQueueSchema();
  let upserted = 0;

  const pendingAds = await db
    .select({
      id: adsTable.id,
      title: adsTable.title,
      isUrgent: adsTable.isUrgent,
      createdAt: adsTable.createdAt,
    })
    .from(adsTable)
    .where(eq(adsTable.status, "pending"))
    .orderBy(desc(adsTable.createdAt))
    .limit(30);

  for (const ad of pendingAds) {
    const id = await upsertAdminNotification({
      type: "admin.ad.pending_review",
      title: "إعلان بانتظار المراجعة",
      body: ad.title?.slice(0, 200) ?? "",
      entityType: "ad",
      entityId: ad.id,
      priority: ad.isUrgent ? 0 : 1,
      dedupKey: `admin:ad:pending:${ad.id}`,
      metadata: { adTitle: ad.title },
    });
    if (id) upserted += 1;
  }

  const openReports = await db
    .select({
      id: reportsTable.id,
      reason: reportsTable.reason,
    })
    .from(reportsTable)
    .where(inArray(reportsTable.status, OPEN_REPORT_STATUSES))
    .orderBy(desc(reportsTable.createdAt))
    .limit(30);

  for (const report of openReports) {
    const priority = 1 as const;
    const id = await upsertAdminNotification({
      type: "admin.report.new",
      title: "بلاغ جديد يحتاج متابعة",
      body: (report.reason ?? "").slice(0, 200),
      entityType: "report",
      entityId: report.id,
      priority,
      dedupKey: `admin:report:open:${report.id}`,
    });
    if (id) upserted += 1;
  }

  const openSupport = await db
    .select({
      id: supportTicketsTable.id,
      subject: supportTicketsTable.subject,
    })
    .from(supportTicketsTable)
    .where(inArray(supportTicketsTable.status, OPEN_SUPPORT_STATUSES))
    .orderBy(desc(supportTicketsTable.updatedAt))
    .limit(30);

  for (const ticket of openSupport) {
    const id = await upsertAdminNotification({
      type: "admin.support.reply",
      title: "تذكرة دعم تحتاج متابعة",
      body: (ticket.subject ?? "").slice(0, 200),
      entityType: "support_ticket",
      entityId: ticket.id,
      priority: 2,
      dedupKey: `admin:support:open:${ticket.id}`,
    });
    if (id) upserted += 1;
  }

  const openVerification = await db
    .select({
      id: verificationRequestsTable.id,
      status: verificationRequestsTable.status,
    })
    .from(verificationRequestsTable)
    .where(inArray(verificationRequestsTable.status, OPEN_VERIFICATION_STATUSES))
    .orderBy(desc(verificationRequestsTable.createdAt))
    .limit(30);

  const verificationPendingCopy = officialAdminNotificationContent("admin.verification.pending");

  for (const req of openVerification) {
    const id = await upsertAdminNotification({
      type: "admin.verification.pending",
      title: verificationPendingCopy?.title ?? "طلب توثيق بانتظار المراجعة",
      body: verificationPendingCopy?.body ?? "يوجد طلب توثيق جديد بانتظار المراجعة.",
      entityType: "verification_request",
      entityId: req.id,
      priority: 1,
      dedupKey: `admin:verification:open:${req.id}`,
    });
    if (id) upserted += 1;
  }

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const newUsers = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
    .from(usersTable)
    .where(gte(usersTable.createdAt, dayStart))
    .orderBy(desc(usersTable.createdAt))
    .limit(15);

  for (const user of newUsers) {
    const id = await upsertAdminNotification({
      type: "admin.user.new_followup",
      title: "مستخدم جديد يحتاج متابعة",
      body: `${user.name} · ${user.email}`.slice(0, 200),
      entityType: "user",
      entityId: user.id,
      priority: 3,
      dedupKey: `admin:user:new:${user.id}:${dayStart.toISOString().slice(0, 10)}`,
    });
    if (id) upserted += 1;
  }

  let breachCount = 0;
  try {
    const slaBreaches = await db.execute<{ c: number }>(sql`
      SELECT COUNT(*)::int AS c FROM (
        (SELECT 1 AS hit FROM ads WHERE status = 'pending' AND sla_due_at IS NOT NULL AND sla_due_at < now() LIMIT 1)
        UNION ALL
        (SELECT 1 AS hit FROM reports WHERE status IN ('open','under_review','pending','in_review') AND sla_due_at IS NOT NULL AND sla_due_at < now() LIMIT 1)
        UNION ALL
        (SELECT 1 AS hit FROM support_tickets WHERE status IN ('open','pending') AND sla_due_at IS NOT NULL AND sla_due_at < now() LIMIT 1)
      ) t
    `);
    breachCount = Number(slaBreaches.rows[0]?.c ?? 0);
  } catch {
    breachCount = 0;
  }
  if (breachCount > 0) {
    await upsertAdminNotification({
      type: "admin.ops.sla_breach",
      title: "تجاوز SLA — يحتاج تدخل",
      body: "عناصر في طوابير العمليات تجاوزت وقت الاستجابة",
      entityType: "operations",
      entityId: null,
      priority: 0,
      dedupKey: `admin:ops:sla-breach:${new Date().toISOString().slice(0, 13)}`,
      deepLinkPath: "/admin/operations",
    });
    upserted += 1;
  }

  await upsertAdminNotification({
    type: "admin.ops.monitoring",
    title: "مراقبة المنصة نشطة",
    body: "راجع لوحة المراقبة للأحداث التشغيلية",
    entityType: "monitoring",
    entityId: null,
    priority: 3,
    dedupKey: `admin:ops:monitoring:${new Date().toISOString().slice(0, 10)}`,
    deepLinkPath: "/admin/monitoring",
    requiredPermission: "system",
  });
  upserted += 1;

  return upserted;
}

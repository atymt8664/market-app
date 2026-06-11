import {
  adminNotificationReadsTable,
  adminNotificationsTable,
  db,
} from "@workspace/db";
import { and, asc, desc, eq } from "drizzle-orm";
import type { AdminPermissionArea, AdminStaffContext } from "../admin-rbac";
import { priorityLabel } from "./catalog";
import type { AdminNotificationApiRow, AdminNotificationCategory } from "./types";
import { ensureAdminNotificationsSchema } from "./persist";
import { syncAdminNotificationsFromOps } from "./sync-ops";

function actorCanSee(
  ctx: AdminStaffContext,
  requiredPermission: string | null,
  category: AdminNotificationCategory,
): boolean {
  if (ctx.isFounder) return true;
  const perms = ctx.permissions;
  if (requiredPermission && perms.includes(requiredPermission as AdminPermissionArea)) {
    return true;
  }
  const map: Record<AdminNotificationCategory, AdminPermissionArea | null> = {
    moderation: "ads",
    reports: "reports",
    support: "support",
    verification: "verification",
    operations: "dashboard.operations",
    security: "system",
    system: null,
  };
  const perm = map[category];
  if (!perm) {
    if (category === "system") {
      return perms.includes("dashboard.operations") || perms.includes("system");
    }
    return true;
  }
  return perms.includes(perm);
}

export async function refreshAndListAdminNotifications(
  actorId: number,
  ctx: AdminStaffContext,
): Promise<AdminNotificationApiRow[]> {
  await ensureAdminNotificationsSchema();
  await syncAdminNotificationsFromOps();

  const rows = await db
    .select({
      n: adminNotificationsTable,
      readAt: adminNotificationReadsTable.readAt,
    })
    .from(adminNotificationsTable)
    .leftJoin(
      adminNotificationReadsTable,
      and(
        eq(adminNotificationReadsTable.notificationId, adminNotificationsTable.id),
        eq(adminNotificationReadsTable.adminActorId, actorId),
      ),
    )
    .orderBy(asc(adminNotificationsTable.priority), desc(adminNotificationsTable.createdAt))
    .limit(100);

  return rows
    .filter(({ n }) => actorCanSee(ctx, n.requiredPermission, n.category as AdminNotificationCategory))
    .map(({ n, readAt }) => ({
      id: n.id,
      type: n.type,
      category: n.category as AdminNotificationCategory,
      priority: n.priority as AdminNotificationApiRow["priority"],
      priorityLabel: priorityLabel(n.priority as AdminNotificationApiRow["priority"]),
      title: n.title,
      body: n.body,
      entityType: n.entityType ?? null,
      entityId: n.entityId ?? null,
      metadata: (n.metadata as Record<string, unknown> | null) ?? null,
      deepLinkPath: n.deepLinkPath,
      readAt: readAt ? readAt.toISOString() : null,
      createdAt: n.createdAt.toISOString(),
    }));
}

export async function getAdminUnreadCount(
  actorId: number,
  ctx: AdminStaffContext,
): Promise<{ unread: number; critical: number }> {
  const items = await refreshAndListAdminNotifications(actorId, ctx);
  const unread = items.filter((n) => !n.readAt);
  return {
    unread: unread.length,
    critical: unread.filter((n) => n.priority === 0).length,
  };
}

export async function markAdminNotificationRead(
  actorId: number,
  notificationId: number,
): Promise<boolean> {
  await ensureAdminNotificationsSchema();
  const [row] = await db
    .select({ id: adminNotificationsTable.id })
    .from(adminNotificationsTable)
    .where(eq(adminNotificationsTable.id, notificationId))
    .limit(1);
  if (!row) return false;

  await db
    .insert(adminNotificationReadsTable)
    .values({ notificationId, adminActorId: actorId })
    .onConflictDoNothing();
  return true;
}

export async function markAllAdminNotificationsRead(
  actorId: number,
  ctx: AdminStaffContext,
): Promise<number> {
  const items = await refreshAndListAdminNotifications(actorId, ctx);
  const unreadIds = items.filter((n) => !n.readAt).map((n) => n.id);
  if (unreadIds.length === 0) return 0;

  for (const id of unreadIds) {
    await db
      .insert(adminNotificationReadsTable)
      .values({ notificationId: id, adminActorId: actorId })
      .onConflictDoNothing();
  }
  return unreadIds.length;
}

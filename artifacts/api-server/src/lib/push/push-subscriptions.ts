import { and, eq, isNull } from "drizzle-orm";
import { db, pushSubscriptionsTable } from "@workspace/db";

export type PushSubscriptionKeys = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function upsertPushSubscription(params: {
  userId: number;
  subscription: PushSubscriptionKeys;
  userAgent?: string | null;
}): Promise<void> {
  const { userId, subscription, userAgent } = params;
  const endpoint = subscription.endpoint.trim().slice(0, 2048);
  const p256dh = subscription.p256dh.trim().slice(0, 512);
  const auth = subscription.auth.trim().slice(0, 512);
  if (!endpoint || !p256dh || !auth) return;

  const existing = await db
    .select({ id: pushSubscriptionsTable.id, userId: pushSubscriptionsTable.userId })
    .from(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.endpoint, endpoint))
    .limit(1);

  if (existing[0]) {
    await db
      .update(pushSubscriptionsTable)
      .set({
        userId,
        p256dh,
        auth,
        userAgent: userAgent?.slice(0, 512) ?? null,
        revokedAt: null,
      })
      .where(eq(pushSubscriptionsTable.id, existing[0].id));
    return;
  }

  await db.insert(pushSubscriptionsTable).values({
    userId,
    endpoint,
    p256dh,
    auth,
    userAgent: userAgent?.slice(0, 512) ?? null,
  });
}

export async function revokePushSubscription(userId: number, endpoint: string): Promise<void> {
  const ep = endpoint.trim().slice(0, 2048);
  if (!ep) return;
  await db
    .update(pushSubscriptionsTable)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(pushSubscriptionsTable.userId, userId),
        eq(pushSubscriptionsTable.endpoint, ep),
        isNull(pushSubscriptionsTable.revokedAt),
      ),
    );
}

export async function revokePushSubscriptionByEndpoint(endpoint: string): Promise<void> {
  const ep = endpoint.trim().slice(0, 2048);
  if (!ep) return;
  await db
    .update(pushSubscriptionsTable)
    .set({ revokedAt: new Date() })
    .where(and(eq(pushSubscriptionsTable.endpoint, ep), isNull(pushSubscriptionsTable.revokedAt)));
}

export async function listActivePushSubscriptions(userId: number): Promise<
  Array<{ id: number; endpoint: string; p256dh: string; auth: string }>
> {
  if (!Number.isInteger(userId) || userId <= 0) return [];
  return db
    .select({
      id: pushSubscriptionsTable.id,
      endpoint: pushSubscriptionsTable.endpoint,
      p256dh: pushSubscriptionsTable.p256dh,
      auth: pushSubscriptionsTable.auth,
    })
    .from(pushSubscriptionsTable)
    .where(
      and(eq(pushSubscriptionsTable.userId, userId), isNull(pushSubscriptionsTable.revokedAt)),
    );
}

export async function countActivePushSubscriptions(userId: number): Promise<number> {
  const rows = await listActivePushSubscriptions(userId);
  return rows.length;
}

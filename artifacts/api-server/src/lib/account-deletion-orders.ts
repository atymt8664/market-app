import {
  adsTable,
  buyerAddressesTable,
  db,
  orderIssuesTable,
  ordersTable,
  usersTable,
} from "@workspace/db";
import type { OrderStatus } from "@workspace/db";
import bcrypt from "bcryptjs";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@workspace/db/schema";

/** System tombstone — not a login account. */
export const DELETED_ACCOUNT_TOMBSTONE_EMAIL =
  "deleted-account-tombstone@internal.souq-arab.invalid";

export const ACCOUNT_DELETE_ACTIVE_ORDERS_CODE = "ACCOUNT_DELETE_ACTIVE_ORDERS";

export class AccountDeletionActiveOrdersError extends Error {
  readonly code = ACCOUNT_DELETE_ACTIVE_ORDERS_CODE;

  constructor(readonly activeOrderCount: number) {
    super("Account deletion blocked: active orders exist");
    this.name = "AccountDeletionActiveOrdersError";
  }
}

type DbTx = Pick<
  NodePgDatabase<typeof schema>,
  "select" | "insert" | "update" | "delete" | "execute"
>;

const TERMINAL_STATUSES: OrderStatus[] = ["completed", "cancelled"];

function isTerminalOrderStatus(status: string): status is OrderStatus {
  return status === "completed" || status === "cancelled";
}

function isDraftOrderStatus(status: string): boolean {
  return status === "draft";
}

/** Active = not terminal and not draft (per P6-LEGAL Option A+). */
export function isActiveOrderStatusForDeletion(status: string): boolean {
  return !isTerminalOrderStatus(status as OrderStatus) && !isDraftOrderStatus(status);
}

export async function countActiveOrdersForUser(userId: number): Promise<number> {
  const [row] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(ordersTable)
    .where(
      and(
        or(eq(ordersTable.buyerUserId, userId), eq(ordersTable.sellerUserId, userId)),
        sql`${ordersTable.status} NOT IN ('completed', 'cancelled', 'draft')`,
      ),
    );
  return Number(row?.c ?? 0);
}

async function countActiveOrdersForUserTx(tx: DbTx, userId: number): Promise<number> {
  const [row] = await tx
    .select({ c: sql<number>`count(*)::int` })
    .from(ordersTable)
    .where(
      and(
        or(eq(ordersTable.buyerUserId, userId), eq(ordersTable.sellerUserId, userId)),
        sql`${ordersTable.status} NOT IN ('completed', 'cancelled', 'draft')`,
      ),
    );
  return Number(row?.c ?? 0);
}

export async function ensureDeletedAccountTombstoneUserId(tx: DbTx): Promise<number> {
  const [existing] = await tx
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, DELETED_ACCOUNT_TOMBSTONE_EMAIL))
    .limit(1);

  if (existing) return existing.id;

  const passwordHash = await bcrypt.hash(
    `tombstone:${crypto.randomUUID()}:${Date.now()}`,
    10,
  );

  const [created] = await tx
    .insert(usersTable)
    .values({
      email: DELETED_ACCOUNT_TOMBSTONE_EMAIL,
      passwordHash,
      name: "حساب محذوف",
      phone: "",
      city: "",
      isBanned: true,
      emailVerified: true,
    })
    .returning({ id: usersTable.id });

  if (!created) {
    throw new Error("Failed to create deleted-account tombstone user");
  }

  return created.id;
}

const SCRUBBED = "[removed]";

async function scrubBuyerAddressesForUserOrders(tx: DbTx, userId: number): Promise<void> {
  const terminalBuyerOrders = await tx
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(
      and(eq(ordersTable.buyerUserId, userId), inArray(ordersTable.status, TERMINAL_STATUSES)),
    );

  const orderIds = terminalBuyerOrders.map((r) => r.id);
  if (orderIds.length === 0) return;

  await tx
    .update(buyerAddressesTable)
    .set({
      label: null,
      recipientName: SCRUBBED,
      phone: null,
      line1: SCRUBBED,
      line2: null,
      postalCode: null,
      city: SCRUBBED,
    })
    .where(inArray(buyerAddressesTable.orderId, orderIds));
}

/** P6-ORDERS-DELETE-1 — Option A+ order prep inside account deletion transaction. */
export async function prepareOrdersForAccountDeletionTx(
  tx: DbTx,
  userId: number,
  tombstoneUserId: number,
): Promise<void> {
  if (userId === tombstoneUserId) return;

  const activeCount = await countActiveOrdersForUserTx(tx, userId);
  if (activeCount > 0) {
    throw new AccountDeletionActiveOrdersError(activeCount);
  }

  const linkedAds = await tx
    .select({ adId: ordersTable.adId })
    .from(ordersTable)
    .where(or(eq(ordersTable.buyerUserId, userId), eq(ordersTable.sellerUserId, userId)));

  const linkedAdIds = [...new Set(linkedAds.map((r) => r.adId))];

  await tx
    .delete(ordersTable)
    .where(
      and(
        eq(ordersTable.status, "draft"),
        or(eq(ordersTable.buyerUserId, userId), eq(ordersTable.sellerUserId, userId)),
      ),
    );

  await scrubBuyerAddressesForUserOrders(tx, userId);

  await tx
    .update(ordersTable)
    .set({ buyerUserId: tombstoneUserId })
    .where(
      and(eq(ordersTable.buyerUserId, userId), inArray(ordersTable.status, TERMINAL_STATUSES)),
    );

  await tx
    .update(ordersTable)
    .set({ sellerUserId: tombstoneUserId })
    .where(
      and(eq(ordersTable.sellerUserId, userId), inArray(ordersTable.status, TERMINAL_STATUSES)),
    );

  await tx
    .update(orderIssuesTable)
    .set({ openedByUserId: tombstoneUserId })
    .where(eq(orderIssuesTable.openedByUserId, userId));

  if (linkedAdIds.length > 0) {
    await tx
      .update(adsTable)
      .set({ userId: tombstoneUserId })
      .where(and(eq(adsTable.userId, userId), inArray(adsTable.id, linkedAdIds)));
  }
}
